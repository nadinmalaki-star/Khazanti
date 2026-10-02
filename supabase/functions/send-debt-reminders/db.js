// db.js — thin adapter over a service-role Supabase client. Every reminder
// rule and every claim is enforced by the Migration 1 database functions;
// this file only calls them.
const PAGE = 1000;

function check(result) {
  if (result.error) {
    const err = new Error("database_error");
    err.code = result.error.code || "db";
    throw err;
  }
  return result.data;
}

export function createDb(client) {
  return {
    // Opted-in devices (optionally one user only, for the controlled test).
    async listSubscriptions(onlyUserId = null) {
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        let q = client
          .from("push_subscriptions")
          .select("id,user_id,endpoint,p256dh,auth_key,timezone,last_seen_at")
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (onlyUserId) q = q.eq("user_id", onlyUserId);
        const page = check(await q) || [];
        rows.push(...page);
        if (page.length < PAGE) return rows;
      }
    },

    async candidates(userId, localDate, now) {
      return check(await client.rpc("debt_reminder_candidates", { p_user_id: userId, p_local_date: localDate, p_now: now.toISOString() })) || [];
    },

    async claimDaily(userId, localDate, runId, now) {
      return check(await client.rpc("claim_daily_push", { p_user_id: userId, p_local_date: localDate, p_run_id: runId, p_now: now.toISOString() }));
    },

    async claimStages(userId, localDate, runId, items, now) {
      return check(await client.rpc("claim_reminder_stages", { p_user_id: userId, p_local_date: localDate, p_run_id: runId, p_items: items, p_now: now.toISOString() })) || [];
    },

    async finalize(runId, delivered, now) {
      return check(await client.rpc("finalize_push_run", { p_run_id: runId, p_delivered: delivered, p_now: now.toISOString() }));
    },

    // 404/410: remove exactly that row, and only if it still has the same
    // endpoint (never a row that was re-registered meanwhile).
    async deleteSubscription(id, endpoint) {
      check(await client.from("push_subscriptions").delete().eq("id", id).eq("endpoint", endpoint));
    },

    async markSuccess(ids, now) {
      check(await client.from("push_subscriptions").update({ last_success_at: now.toISOString(), failure_count: 0 }).in("id", ids));
    },
  };
}
