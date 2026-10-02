// send-debt-reminders handler tests (Deno), against a real Postgres with the
// real Migration 1 SQL (see _pg_env.ts). Push delivery is mocked; no network.
// Run: deno test --allow-read --allow-env supabase/functions/tests/
import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleRequest, runReminders } from "../send-debt-reminders/handler.js";
import { createDb } from "../send-debt-reminders/db.js";
import { TEXTS, STAGE } from "../_shared/debt-reminders.js";
import { admin, createTestDatabase, fakeServiceClient, USER_A, USER_B } from "./_pg_env.ts";

const SECRET = "test-cron-secret-0123456789abcdef-XYZ"; // disposable, >= 32 chars
const ENV = { CRON_SECRET: SECRET, PUSH_ENABLED: "true", VAPID_PUBLIC_KEY: "test-pub", VAPID_PRIVATE_KEY: "test-priv", VAPID_SUBJECT: "mailto:test@example.invalid" };
const NOW_0930 = new Date("2026-11-13T07:30:00Z"); // 09:30 in Asia/Hebron (UTC+2, winter)
const P256 = "B" + "x".repeat(86);
const AUTH = "y".repeat(22);
const EP = (s: string) => `https://fcm.googleapis.com/fcm/send/${s}`;
const APPLE = (s: string) => `https://web.push.apple.com/${s}`;

type Push = { endpoint: string; payload: string };

async function setup() {
  const pg = await createTestDatabase();
  // A: due today (remaining 300), overdue (project), settled; B: due tomorrow.
  await admin(pg, `insert into public.debts (user_id, name, amount, paid, paid_amount, due_date, account_type) values
    ($1, 'عميل سري جدا', 400, null, 100, '2026-11-13', 'فرد'),
    ($1, 'مورد سري', 777.25, null, 0, '2026-11-10', 'مشروع'),
    ($1, 'مسدد', 50, 1, 50, '2026-11-13', 'فرد'),
    ($2, 'دين المستخدم ب', 999, null, 0, '2026-11-14', 'فرد')`, [USER_A, USER_B]);
  return pg;
}

async function addSub(pg: Awaited<ReturnType<typeof setup>>, user: string, endpoint: string, tz = "Asia/Hebron", seen = "2026-11-12T10:00:00Z") {
  await admin(pg, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key, timezone, last_seen_at) values ($1,$2,$3,$4,$5,$6)`, [user, endpoint, P256, AUTH, tz, seen]);
}

function harness(pg: Awaited<ReturnType<typeof setup>>, statusFor: (endpoint: string) => { status?: number; error?: string } = () => ({ status: 201 }), env = ENV) {
  const pushes: Push[] = [];
  const logs: Record<string, unknown>[] = [];
  let dbMade = 0, senderMade = 0, runSeq = 0;
  const deps = {
    env,
    makeDb: () => { dbMade++; return createDb(fakeServiceClient(pg)); },
    makeSender: () => { senderMade++; return async (s: { endpoint: string }, payload: string) => { pushes.push({ endpoint: s.endpoint, payload }); return statusFor(s.endpoint); }; },
    now: () => NOW_0930,
    newRunId: () => `00000000-0000-4000-8000-${String(++runSeq).padStart(12, "0")}`,
    log: (e: Record<string, unknown>) => logs.push(e),
  };
  const call = (body?: unknown, headers: Record<string, string> = { "x-cron-secret": SECRET }, method = "POST") =>
    handleRequest(new Request("http://localhost/send-debt-reminders", { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), deps);
  return { deps, call, pushes, logs, made: () => ({ dbMade, senderMade }) };
}

const deliveries = (pg: Awaited<ReturnType<typeof setup>>) => admin(pg, `select debt_id, stage, status from public.debt_reminder_deliveries order by debt_id, stage`);
const daily = (pg: Awaited<ReturnType<typeof setup>>) => admin(pg, `select user_id, local_date, status from public.push_daily_sends order by user_id`);
const subCount = async (pg: Awaited<ReturnType<typeof setup>>) => Number((await admin(pg, `select count(*) c from public.push_subscriptions`))[0].c);

// ------------------------------------------------------------------ authentication & switches

Deno.test("missing / wrong cron secret -> 401; no secret configured -> 500; GET -> 405; nothing touched", async () => {
  const pg = await setup();
  const h = harness(pg);
  assertEquals((await h.call(undefined, {})).status, 401);
  assertEquals((await h.call(undefined, { "x-cron-secret": "wrong" })).status, 401);
  assertEquals((await h.call(undefined, { "x-cron-secret": SECRET + "x" })).status, 401);
  assertEquals((await h.call(undefined, { authorization: `Bearer ${SECRET}` })).status, 401);
  assertEquals((await h.call(undefined, { "x-cron-secret": SECRET }, "GET")).status, 405);
  const weak = harness(pg, undefined, { ...ENV, CRON_SECRET: "short" });
  assertEquals((await weak.call(undefined, { "x-cron-secret": "short" })).status, 500);
  const none = harness(pg, undefined, { ...ENV, CRON_SECRET: undefined as unknown as string });
  assertEquals((await none.call(undefined, { "x-cron-secret": "" })).status, 500);
  assertEquals(h.made(), { dbMade: 0, senderMade: 0 });
  assertEquals(h.pushes.length, 0);
});

Deno.test("PUSH_ENABLED not 'true' -> disabled, no database or push work at all", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("a1"));
  for (const v of ["false", "", "TRUE", "1", undefined]) {
    const h = harness(pg, undefined, { ...ENV, PUSH_ENABLED: v as string });
    const r = await h.call();
    assertEquals(r.status, 200);
    assertEquals(await r.json(), { status: "disabled" });
    assertEquals(h.made(), { dbMade: 0, senderMade: 0 });
  }
  assertEquals((await deliveries(pg)).length, 0);
});

Deno.test("invalid only_user_id -> 400 before any database work", async () => {
  const pg = await setup();
  const h = harness(pg);
  for (const bad of ["not-a-uuid", "' or 1=1 --", 123, "", "00000000-0000-0000-0000-00000000000a"]) {
    assertEquals((await h.call({ only_user_id: bad })).status, 400, String(bad));
  }
  assertEquals((await h.call([1, 2])).status, 400);
  assertEquals(h.made(), { dbMade: 0, senderMade: 0 });
});

Deno.test("missing VAPID configuration -> 500 before any database work", async () => {
  const pg = await setup();
  const h = harness(pg, undefined, { ...ENV, VAPID_PRIVATE_KEY: "" });
  assertEquals((await h.call()).status, 500);
  assertEquals(h.made(), { dbMade: 0, senderMade: 0 });
});

// ------------------------------------------------------------------ sending

Deno.test("no subscriptions -> nothing sent", async () => {
  const pg = await setup();
  const h = harness(pg);
  const r = await (await h.call()).json();
  assertEquals([r.status, r.users, r.sent], ["ok", 0, 0]);
  assertEquals(h.pushes.length, 0);
});

Deno.test("one eligible debt -> single-debt text + deep link with debt id and mode", async () => {
  const pg = await setup();
  await addSub(pg, USER_B, EP("b1"));
  const h = harness(pg);
  const r = await (await h.call()).json();
  assertEquals([r.users, r.sent], [1, 1]);
  assertEquals(h.pushes.length, 1);
  const p = JSON.parse(h.pushes[0].payload);
  assertEquals(p, { v: 1, title: "خزنتي", body: TEXTS[STAGE.DUE_IN_1], tag: "khznti-debt-reminder", url: "/?open=debts&debt=4&mode=individual" });
  assertEquals(await deliveries(pg), [{ debt_id: 4, stage: "due_in_1", status: "sent" }]);
});

Deno.test("multiple eligible debts -> one summary push; multiple devices -> one push each", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("a-phone"));
  await addSub(pg, USER_A, APPLE("a-iphone"));
  const h = harness(pg);
  const r = await (await h.call()).json();
  assertEquals([r.users, r.sent, r.devices_accepted], [1, 1, 2]);
  assertEquals(h.pushes.length, 2);
  for (const push of h.pushes) {
    const p = JSON.parse(push.payload);
    assertEquals(p.body, TEXTS.SUMMARY);
    assertEquals(p.url, "/?open=debts&mode=project"); // most urgent = the overdue project debt
  }
  assertEquals(await deliveries(pg), [{ debt_id: 1, stage: "due_today", status: "sent" }, { debt_id: 2, stage: "overdue", status: "sent" }]);
  assertEquals(await daily(pg), [{ user_id: USER_A, local_date: "2026-11-13", status: "sent" }]);
});

Deno.test("two users are isolated; only_user_id restricts the whole run to one user", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("a1"));
  await addSub(pg, USER_B, EP("b1"));
  const h = harness(pg);
  const r = await (await h.call({ only_user_id: USER_B })).json();
  assertEquals([r.users, r.sent], [1, 1]);
  assertEquals(h.pushes.map((p) => p.endpoint), [EP("b1")]);
  assertEquals(JSON.parse(h.pushes[0].payload).url, "/?open=debts&debt=4&mode=individual");
  assertEquals((await deliveries(pg)).map((d) => d.debt_id), [4]);
  // full run afterwards: A gets only A's reminders
  const h2 = harness(pg);
  await h2.call();
  assertEquals(h2.pushes.map((p) => p.endpoint), [EP("a1")]);
  assertEquals(JSON.parse(h2.pushes[0].payload).body, TEXTS.SUMMARY);
});

Deno.test("outside 09:00-21:00 local -> no send, no claims", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("a1"));
  for (const t of ["2026-11-13T06:59:00Z", "2026-11-13T19:00:00Z"]) { // 08:59 and 21:00 local
    const h = harness(pg);
    h.deps.now = () => new Date(t);
    const r = await (await h.call()).json();
    assertEquals(r.skipped, { outside_send_window: 1 });
    assertEquals(h.pushes.length, 0);
  }
  assertEquals((await deliveries(pg)).length + (await daily(pg)).length, 0);
});

Deno.test("no valid timezone on any device -> skipped (no fallback zone)", async () => {
  const pg = await setup();
  await admin(pg, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key, timezone) values ($1,$2,$3,$4,'Not/AZone')`, [USER_A, EP("bad-tz"), P256, AUTH]);
  const h = harness(pg);
  assertEquals((await (await h.call()).json()).skipped, { no_valid_timezone: 1 });
  assertEquals(h.pushes.length, 0);
});

Deno.test("already-sent daily slot -> later run same day sends nothing; stage already sent -> nothing next day", async () => {
  const pg = await setup();
  await addSub(pg, USER_B, EP("b1"));
  await harness(pg).call();
  // Same day, nothing new for the sent debt -> stops before even claiming.
  const same = harness(pg);
  same.deps.now = () => new Date("2026-11-13T11:00:00Z");
  assertEquals((await (await same.call()).json()).skipped, { nothing_new: 1 });
  // Same day, a NEW debt becomes eligible -> the daily slot is already used.
  await admin(pg, `insert into public.debts (user_id, name, amount, paid_amount, due_date) values ($1, 'دين جديد', 10, 0, '2026-11-13')`, [USER_B]);
  const again = harness(pg);
  again.deps.now = () => new Date("2026-11-13T12:00:00Z");
  assertEquals((await (await again.call()).json()).skipped, { already_sent: 1 });
  assertEquals(again.pushes.length, 0);
  await admin(pg, `delete from public.debts where name = 'دين جديد'`);
  // next day the debt is due today -> new stage group allowed
  const nextDay = harness(pg);
  nextDay.deps.now = () => new Date("2026-11-14T07:30:00Z");
  await nextDay.call();
  assertEquals(JSON.parse(nextDay.pushes[0].payload).body, TEXTS[STAGE.DUE_TODAY]);
  // and the day after: overdue once; then nothing new
  const d3 = harness(pg); d3.deps.now = () => new Date("2026-11-15T07:30:00Z"); await d3.call();
  assertEquals(JSON.parse(d3.pushes[0].payload).body, TEXTS[STAGE.OVERDUE]);
  const d4 = harness(pg); d4.deps.now = () => new Date("2026-11-16T07:30:00Z");
  assertEquals((await (await d4.call()).json()).skipped, { nothing_new: 1 });
  assertEquals((await deliveries(pg)).map((d) => d.stage), ["due_in_1", "due_today", "overdue"]);
});

Deno.test("full settlement / due date change between candidates and claim -> not claimed, not sent", async () => {
  for (const change of [`update public.debts set paid = 1, paid_amount = amount where id = 4`, `update public.debts set due_date = '2026-11-20' where id = 4`]) {
    const pg = await setup();
    await addSub(pg, USER_B, EP("b1"));
    const db = createDb(fakeServiceClient(pg));
    const racing = { ...db, async candidates(...a: Parameters<typeof db.candidates>) { const c = await db.candidates(...a); await admin(pg, change); return c; } };
    const pushes: Push[] = [];
    const s = await runReminders({ db: racing, sendPush: async (sub: { endpoint: string }, payload: string) => { pushes.push({ endpoint: sub.endpoint, payload }); return { status: 201 }; }, now: NOW_0930, newRunId: () => crypto.randomUUID() });
    assertEquals(s.skipped, { no_stage_claimed: 1 }, change);
    assertEquals(pushes.length, 0);
    assertEquals((await deliveries(pg)).length + (await daily(pg)).length, 0); // daily claim released too
  }
});

// ------------------------------------------------------------------ push results

Deno.test("404/410 -> only that subscription removed; mixed 410 + 201 -> delivered", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("gone"));
  await addSub(pg, USER_A, APPLE("ok"));
  const h = harness(pg, (e) => (e.endsWith("gone") ? { status: 410 } : { status: 201 }));
  const r = await (await h.call()).json();
  assertEquals([r.sent, r.subscriptions_removed], [1, 1]);
  assertEquals((await admin(pg, `select endpoint from public.push_subscriptions`)).map((x) => x.endpoint), [APPLE("ok")]);
  assertEquals((await deliveries(pg)).every((d) => d.status === "sent"), true);
});

Deno.test("all devices gone (404/410) -> not delivered, subscriptions removed, claims released", async () => {
  for (const status of [404, 410]) {
    const pg = await setup();
    await addSub(pg, USER_A, EP("x1"));
    await addSub(pg, USER_A, EP("x2"));
    const r = await (await harness(pg, () => ({ status })).call()).json();
    assertEquals([r.sent, r.released, r.subscriptions_removed], [0, 1, 2]);
    assertEquals(await subCount(pg), 0);
    assertEquals((await deliveries(pg)).length + (await daily(pg)).length, 0);
  }
});

Deno.test("429 / 5xx / network / timeout -> released and retryable later the same day", async () => {
  for (const fail of [{ status: 429 }, { status: 500 }, { status: 503 }, { error: "network" }, { error: "timeout" }]) {
    const pg = await setup();
    await addSub(pg, USER_B, EP("b1"));
    const r = await (await harness(pg, () => fail).call()).json();
    assertEquals([r.sent, r.released], [0, 1], JSON.stringify(fail));
    assertEquals((await deliveries(pg)).length + (await daily(pg)).length, 0);
    assertEquals(await subCount(pg), 1); // temporary failure never removes a device
    const later = harness(pg);
    later.deps.now = () => new Date("2026-11-13T09:30:00Z");
    assertEquals((await (await later.call()).json()).sent, 1);
  }
});

Deno.test("sender throwing -> treated as temporary failure", async () => {
  const pg = await setup();
  await addSub(pg, USER_B, EP("b1"));
  const h = harness(pg);
  h.deps.makeSender = () => async () => { throw new Error("boom"); };
  assertEquals((await (await h.call()).json()).released, 1);
  assertEquals((await deliveries(pg)).length, 0);
});

Deno.test("finalize failing once after acceptance -> retried as sent (no release, no duplicate)", async () => {
  const pg = await setup();
  await addSub(pg, USER_B, EP("b1"));
  const db = createDb(fakeServiceClient(pg));
  let fails = 1;
  const flaky = { ...db, async finalize(...a: Parameters<typeof db.finalize>) { if (fails-- > 0) throw Object.assign(new Error("x"), { code: "08006" }); return db.finalize(...a); } };
  const s = await runReminders({ db: flaky, sendPush: async () => ({ status: 201 }), now: NOW_0930, newRunId: () => crypto.randomUUID() });
  assertEquals(s.errors, 1); // reported, but...
  assertEquals(await deliveries(pg), [{ debt_id: 4, stage: "due_in_1", status: "sent" }]); // ...recorded as sent
});

// ------------------------------------------------------------------ concurrency & privacy

Deno.test("concurrent invocations -> exactly one push per device", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("a1"));
  await addSub(pg, USER_B, EP("b1"));
  const h1 = harness(pg), h2 = harness(pg);
  h2.deps.newRunId = () => crypto.randomUUID();
  const [r1, r2] = await Promise.all([h1.call(), h2.call()]);
  const [s1, s2] = [await r1.json(), await r2.json()];
  const all = [...h1.pushes, ...h2.pushes].map((p) => p.endpoint).sort();
  assertEquals(all, [EP("a1"), EP("b1")]);
  assertEquals(s1.sent + s2.sent, 2);
  assertEquals((await daily(pg)).every((d) => d.status === "sent"), true);
});

Deno.test("no sensitive data in payloads, logs or the HTTP response", async () => {
  const pg = await setup();
  await addSub(pg, USER_A, EP("secret-endpoint-token-AAA"));
  await addSub(pg, USER_B, APPLE("secret-endpoint-token-BBB"));
  const h = harness(pg, (e) => (e.includes("AAA") ? { status: 410 } : { status: 201 }));
  const response = await (await h.call()).text();
  const everything = JSON.stringify(h.pushes.map((p) => p.payload)) + JSON.stringify(h.logs) + response;
  for (const s of ["عميل سري", "مورد سري", "دين المستخدم ب", "400", "777", "999", "300", "secret-endpoint-token", "fcm.googleapis.com", "apple.com", "@", USER_A, USER_B, P256, AUTH, SECRET]) {
    assert(!everything.includes(s), "leaked: " + s);
  }
  for (const p of h.pushes) assertEquals(Object.keys(JSON.parse(p.payload)).sort(), ["body", "tag", "title", "url", "v"]);
  assert(h.logs.some((l) => l.event === "run_summary"));
});
