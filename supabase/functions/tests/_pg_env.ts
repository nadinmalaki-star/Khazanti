// Test-only helper: a real Postgres (PGlite) with a Supabase-like setup
// (roles, default grants, auth.users / auth.uid(), production-shaped
// public.debts + its RLS) and the real Migration 1 SQL applied. Plus a
// minimal fake supabase-js client that turns the calls made by db.js into SQL,
// executed as service_role, like the deployed Edge Function.
import { PGlite } from "npm:@electric-sql/pglite@0.5.8";

const MIGRATION_URL = new URL("../../migrations/20261002120000_web_push_phase1.sql", import.meta.url);

export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";

export async function createTestDatabase() {
  // Keep date/timestamptz as strings, like PostgREST returns them.
  const pg = new PGlite({ parsers: { 1082: (v: string) => v, 1184: (v: string) => v } });
  await pg.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth; grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    create table public.debts (
      id serial primary key, user_id uuid, type text, name text, amount numeric, paid numeric, date text,
      due_date date, currency text default 'ILS', account_type text not null default 'فرد',
      source_transaction_id integer, paid_amount numeric default 0);
    alter table public.debts enable row level security;
    create policy "Enable select for debts" on public.debts for select to public using (auth.uid() = user_id);
    insert into auth.users values ('${USER_A}'), ('${USER_B}');
  `);
  await pg.exec(await Deno.readTextFile(MIGRATION_URL));
  return pg;
}

// Run a statement as the database superuser (test setup / inspection only).
export async function admin(pg: PGlite, sql: string, params: unknown[] = []) {
  await pg.exec("reset role");
  return (await pg.query(sql, params)).rows as Record<string, unknown>[];
}

const RPC_TYPES: Record<string, string> = {
  p_user_id: "uuid", p_local_date: "date", p_now: "timestamptz", p_run_id: "uuid", p_items: "jsonb", p_delivered: "boolean",
};
const SCALAR_RPCS = new Set(["claim_daily_push", "finalize_push_run"]);

class Query {
  #op = "select"; #cols = "*"; #filters: [string, string, unknown][] = []; #order: string | null = null;
  #range: [number, number] | null = null; #values: Record<string, unknown> | null = null;
  constructor(private pg: PGlite, private table: string) {}
  select(cols: string) { this.#op = "select"; this.#cols = cols; return this; }
  delete() { this.#op = "delete"; return this; }
  update(values: Record<string, unknown>) { this.#op = "update"; this.#values = values; return this; }
  eq(col: string, v: unknown) { this.#filters.push([col, "=", v]); return this; }
  in(col: string, vs: unknown[]) { this.#filters.push([col, "in", vs]); return this; }
  order(col: string) { this.#order = col; return this; }
  range(a: number, b: number) { this.#range = [a, b]; return this; }
  async #run() {
    const params: unknown[] = [];
    const where = this.#filters.map(([c, op, v]) => {
      if (op === "in") { params.push(v); return `${c} = any($${params.length})`; }
      params.push(v); return `${c} = $${params.length}`;
    });
    const w = where.length ? ` where ${where.join(" and ")}` : "";
    let sql: string;
    if (this.#op === "select") {
      sql = `select ${this.#cols} from public.${this.table}${w}${this.#order ? ` order by ${this.#order}` : ""}`;
      if (this.#range) sql += ` limit ${this.#range[1] - this.#range[0] + 1} offset ${this.#range[0]}`;
    } else if (this.#op === "delete") {
      sql = `delete from public.${this.table}${w}`;
    } else {
      const sets = Object.entries(this.#values!).map(([k, v]) => { params.push(v); return `${k} = $${params.length}`; });
      sql = `update public.${this.table} set ${sets.join(", ")}${w}`;
    }
    await this.pg.exec("set role service_role");
    try {
      const r = await this.pg.query(sql, params);
      return { data: this.#op === "select" ? r.rows : null, error: null };
    } catch (e) {
      return { data: null, error: { code: (e as { code?: string }).code || "XX000", message: String(e) } };
    } finally {
      await this.pg.exec("reset role");
    }
  }
  then<T>(resolve: (v: { data: unknown; error: unknown }) => T, reject?: (e: unknown) => T) { return this.#run().then(resolve, reject); }
}

export function fakeServiceClient(pg: PGlite) {
  return {
    from: (table: string) => new Query(pg, table),
    async rpc(name: string, args: Record<string, unknown>) {
      const keys = Object.keys(args);
      const list = keys.map((k, i) => `${k} => $${i + 1}::${RPC_TYPES[k]}`).join(", ");
      const values = keys.map((k) => (k === "p_items" ? JSON.stringify(args[k]) : args[k]));
      const sql = SCALAR_RPCS.has(name) ? `select public.${name}(${list}) as v` : `select * from public.${name}(${list})`;
      await pg.exec("set role service_role");
      try {
        const rows = (await pg.query(sql, values)).rows as Record<string, unknown>[];
        return { data: SCALAR_RPCS.has(name) ? rows[0].v : rows, error: null };
      } catch (e) {
        return { data: null, error: { code: (e as { code?: string }).code || "XX000", message: String(e) } };
      } finally {
        await pg.exec("reset role");
      }
    },
  };
}
