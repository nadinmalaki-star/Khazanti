// handler.js — send-debt-reminders orchestration (runtime-agnostic).
// All rules come from ../_shared/debt-reminders.js (Stage 1, tested) and from
// the Migration 1 database functions; this file only wires them together.
// Dependencies (database, push sender, clock, run ids, logger) are injected,
// so the same code runs in the Edge Function and in the tests.
import {
  NOTIFICATION_TITLE, NOTIFICATION_TAG, STAGE_GROUP,
  userTimeZone, localClock, isWithinSendWindow, nextStageForEligible,
  buildMessage, decideOutcome,
} from "../_shared/debt-reminders.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_SECRET_LENGTH = 32;
const RUN_BUDGET_MS = 100_000; // stop starting new users after this; the next hourly run continues

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

// Constant-time comparison of two secrets (compares SHA-256 digests, so the
// length of the provided value leaks nothing either).
async function secretsMatch(provided, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(provided)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// Privacy-safe push payload: title/body/tag + a same-origin relative URL
// (debt id + mode only for a single-debt reminder). No names, no amounts.
export function buildPayload(message) {
  return JSON.stringify({ v: 1, title: message.title || NOTIFICATION_TITLE, body: message.body, tag: message.tag || NOTIFICATION_TAG, url: message.url });
}

export async function handleRequest(request, deps) {
  const { env, log = () => {} } = deps;
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });

  // Fail closed if the server secret is missing or weak.
  if (typeof env.CRON_SECRET !== "string" || env.CRON_SECRET.length < MIN_SECRET_LENGTH) {
    log({ event: "rejected", reason: "server_not_configured" });
    return json(500, { error: "server_not_configured" });
  }
  const provided = request.headers.get("x-cron-secret") || "";
  if (!(await secretsMatch(provided, env.CRON_SECRET))) {
    log({ event: "rejected", reason: "unauthorized" });
    return json(401, { error: "unauthorized" });
  }

  // Kill switch: nothing (no database, no push) unless explicitly enabled.
  if (env.PUSH_ENABLED !== "true") {
    log({ event: "disabled" });
    return json(200, { status: "disabled" });
  }

  let body = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(400, { error: "invalid_body" });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) return json(400, { error: "invalid_body" });
  const onlyUserId = body.only_user_id === undefined ? null : body.only_user_id;
  if (onlyUserId !== null && (typeof onlyUserId !== "string" || !UUID_RE.test(onlyUserId))) {
    return json(400, { error: "invalid_only_user_id" });
  }

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    log({ event: "rejected", reason: "push_not_configured" });
    return json(500, { error: "server_not_configured" });
  }

  const summary = await runReminders({
    db: deps.makeDb(),
    sendPush: deps.makeSender(),
    now: deps.now(),
    newRunId: deps.newRunId,
    onlyUserId,
    log,
    clock: deps.clock || (() => Date.now()),
  });
  log({ event: "run_summary", controlled_test: onlyUserId !== null, ...summary });
  return json(200, { status: "ok", ...summary });
}

export async function runReminders({ db, sendPush, now, newRunId, onlyUserId = null, log = () => {}, clock = () => Date.now() }) {
  const started = clock();
  const summary = { users: 0, sent: 0, released: 0, skipped: {}, errors: 0, deferred: 0, devices_accepted: 0, subscriptions_removed: 0 };
  const skip = (reason) => { summary.skipped[reason] = (summary.skipped[reason] || 0) + 1; };

  const subscriptions = await db.listSubscriptions(onlyUserId);
  const byUser = new Map();
  for (const s of subscriptions) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id).push(s);
  }

  for (const [userId, subs] of byUser) {
    if (clock() - started > RUN_BUDGET_MS) { summary.deferred++; continue; }
    summary.users++;
    try {
      const r = await processUser({ db, sendPush, now, newRunId, userId, subs, log });
      if (r.outcome === "sent") { summary.sent++; summary.devices_accepted += r.accepted; }
      else if (r.outcome === "released") summary.released++;
      else skip(r.reason);
      summary.subscriptions_removed += r.removed || 0;
    } catch (e) {
      summary.errors++;
      log({ event: "user_error", code: (e && e.code) || "unknown" }); // no ids, no messages with data
    }
  }
  return summary;
}

async function processUser({ db, sendPush, now, newRunId, userId, subs, log }) {
  const timeZone = userTimeZone(subs);
  if (!timeZone) return { outcome: "skipped", reason: "no_valid_timezone" };
  const clock = localClock(now, timeZone);
  if (!isWithinSendWindow(clock)) return { outcome: "skipped", reason: "outside_send_window" };

  const candidates = await db.candidates(userId, clock.date, now);
  const items = [];
  for (const c of candidates) {
    const stage = nextStageForEligible(c.due_date, clock.date, new Set(c.taken_groups || []));
    if (stage) items.push({ debt_id: c.debt_id, due_date: c.due_date, stage, group: STAGE_GROUP[stage], account_type: c.account_type, days: c.days_until_due });
  }
  if (!items.length) return { outcome: "skipped", reason: "nothing_new" };

  const runId = newRunId();
  const daily = await db.claimDaily(userId, clock.date, runId, now);
  if (daily !== "claimed") return { outcome: "skipped", reason: daily };

  let finalized = false;
  let delivered = false; // set once the push results are known
  try {
    const claimedRows = await db.claimStages(userId, clock.date, runId, items.map(({ debt_id, due_date, stage }) => ({ debt_id, due_date, stage })), now);
    const claimedKeys = new Set(claimedRows.map((r) => `${r.debt_id}|${r.due_date}|${r.stage}`));
    const claimed = items.filter((i) => claimedKeys.has(`${i.debt_id}|${i.due_date}|${i.stage}`));
    if (!claimed.length) {
      await db.finalize(runId, false, now);
      finalized = true;
      return { outcome: "skipped", reason: "no_stage_claimed" };
    }

    const payload = buildPayload(buildMessage(claimed));
    const results = await Promise.all(subs.map(async (s) => {
      try { return await sendPush(s, payload); } catch { return { error: "exception" }; }
    }));
    const outcome = decideOutcome(results);
    delivered = outcome.delivered;
    const { goneIndexes, kinds } = outcome;

    let removed = 0;
    for (const i of goneIndexes) {
      try { await db.deleteSubscription(subs[i].id, subs[i].endpoint); removed++; } catch { log({ event: "cleanup_failed" }); }
    }
    const acceptedIds = subs.filter((_, i) => kinds[i] === "accepted").map((s) => s.id);
    if (acceptedIds.length) {
      try { await db.markSuccess(acceptedIds, now); } catch { log({ event: "mark_success_failed" }); }
    }

    await db.finalize(runId, delivered, now);
    finalized = true;
    return delivered
      ? { outcome: "sent", accepted: acceptedIds.length, removed }
      : { outcome: "released", removed };
  } finally {
    // Not finalized because of an unexpected error: if a push service already
    // accepted, try once more to record it as sent (avoids a duplicate);
    // otherwise release the claims so the reminder stays retryable. If even
    // this fails, the claims expire after the 15-minute lease.
    if (!finalized) {
      try { await db.finalize(runId, delivered, now); } catch { log({ event: delivered ? "finalize_failed" : "release_failed" }); }
    }
  }
}
