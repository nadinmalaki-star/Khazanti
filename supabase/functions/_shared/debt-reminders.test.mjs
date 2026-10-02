// Unit tests for debt-reminders.js (Phase 1 Web Push, Stage 1).
// Run: node --test supabase/functions/_shared/
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE, STAGE_GROUP, TEXTS, NOTIFICATION_TITLE, NOTIFICATION_TAG, CLAIM_LEASE_MS,
  isValidIanaTimeZone, localClock, isWithinSendWindow, daysUntilDue, isEligibleDebt,
  nextStageForDebt, cycleKey, buildMessage, userTimeZone, planUserReminder,
  classifyPushResult, decideOutcome, runUserReminder,
} from "./debt-reminders.js";

const TZ = "Asia/Hebron";
// Winter time (UTC+2) after 2026-10-24 01:00 local; summer (UTC+3) before.
const winter = (localDate, hhmm) => new Date(`${localDate}T${hhmm}:00+02:00`);
const summer = (localDate, hhmm) => new Date(`${localDate}T${hhmm}:00+03:00`);
const SUB = (endpoint = "https://fcm.googleapis.com/fcm/send/a", tz = TZ, seen = "2026-11-01T00:00:00Z") => ({ endpoint, timezone: tz, last_seen_at: seen });
const debt = (o = {}) => ({ id: 1, user_id: "u1", name: "عميل سري", amount: 400, paid_amount: 0, paid: null, due_date: "2026-11-13", account_type: "فرد", ...o });

// In-memory store with the same semantics planned for the database:
// unique daily slot per (user, local_date), unique (debt_id, due_date, group),
// claims carry a token + time and become stale after the lease.
function makeStore({ lease = CLAIM_LEASE_MS } = {}) {
  const daily = new Map();
  const deliveries = new Map();
  const removed = [];
  const live = (r, now) => r.status === "sent" || +now - r.at < lease;
  return {
    daily, deliveries, removed,
    async takenGroups(userId, now) {
      const m = new Map();
      for (const r of deliveries.values()) {
        if (r.userId !== userId || !live(r, now)) continue;
        const k = cycleKey(r.debt_id, r.due_date);
        if (!m.has(k)) m.set(k, new Set());
        m.get(k).add(r.group);
      }
      return m;
    },
    async claimDaily(userId, localDate, token, now) {
      const k = `${userId}|${localDate}`;
      const r = daily.get(k);
      if (r && r.status === "sent") return "already_sent";
      if (r && +now - r.at < lease) return "in_progress";
      daily.set(k, { status: "claimed", token, at: +now });
      return "claimed";
    },
    async claimStages(userId, localDate, items, token, now) {
      const out = [];
      for (const it of items) {
        const k = `${it.debt_id}|${it.due_date}|${it.group}`;
        const r = deliveries.get(k);
        if (r && live(r, now)) continue;
        deliveries.set(k, { ...it, userId, localDate, status: "claimed", token, at: +now });
        out.push(it);
      }
      return out;
    },
    async markSent(token, now) {
      for (const r of deliveries.values()) if (r.token === token) { r.status = "sent"; r.sentAt = +now; }
      for (const r of daily.values()) if (r.token === token) r.status = "sent";
    },
    async release(token) {
      for (const [k, r] of deliveries) if (r.token === token && r.status === "claimed") deliveries.delete(k);
      for (const [k, r] of daily) if (r.token === token && r.status === "claimed") daily.delete(k);
    },
    async removeSubscription(endpoint) { removed.push(endpoint); },
    sentStages(debtId, dueDate) {
      return [...deliveries.values()].filter((r) => r.debt_id === debtId && r.due_date === dueDate && r.status === "sent").map((r) => r.stage);
    },
  };
}

let tokenSeq = 0;
const accepted = async () => ({ status: 201 });
async function run(store, { now, debts, subscriptions = [SUB()], sendPush = accepted, userId = "u1" }) {
  return runUserReminder({ userId, subscriptions, debts, now, store, sendPush, token: `t${++tokenSeq}` });
}

// ------------------------------------------------------------------ stages

test("debt first encountered 3 days before -> due_in_3 text", () => {
  const p = planUserReminder({ now: winter("2026-11-10", "09:00"), subscriptions: [SUB()], debts: [debt({ due_date: "2026-11-13" })] });
  assert.equal(p.action, "send");
  assert.equal(p.items[0].stage, STAGE.DUE_IN_3);
  assert.equal(p.message.body, TEXTS[STAGE.DUE_IN_3]);
});

test("debt first encountered 2 days before -> due_in_2 text", () => {
  const p = planUserReminder({ now: winter("2026-11-11", "09:00"), subscriptions: [SUB()], debts: [debt({ due_date: "2026-11-13" })] });
  assert.equal(p.items[0].stage, STAGE.DUE_IN_2);
  assert.equal(p.message.body, "لديك دين مستحق بعد يومين. افتح خزنتي للتفاصيل.");
});

test("debt first encountered 1 day before -> due_in_1 (tomorrow) text", () => {
  const p = planUserReminder({ now: winter("2026-11-12", "09:00"), subscriptions: [SUB()], debts: [debt({ due_date: "2026-11-13" })] });
  assert.equal(p.items[0].stage, STAGE.DUE_IN_1);
  assert.equal(p.message.body, "لديك دين مستحق غدًا. افتح خزنتي للتفاصيل.");
});

test("more than 3 days away -> nothing", () => {
  const p = planUserReminder({ now: winter("2026-11-09", "09:00"), subscriptions: [SUB()], debts: [debt({ due_date: "2026-11-13" })] });
  assert.deepEqual([p.action, p.reason], ["skip", "nothing_new"]);
});

test("full cycle day by day: one pre-due, due today, overdue once -> exactly 3 notifications", async () => {
  const store = makeStore();
  const d = debt({ due_date: "2026-11-13" });
  const sentBodies = [];
  for (let day = 8; day <= 20; day++) {
    const r = await run(store, { now: winter(`2026-11-${String(day).padStart(2, "0")}`, "09:00"), debts: [d] });
    if (r.outcome === "sent") sentBodies.push(r.message.body);
  }
  assert.deepEqual(sentBodies, [TEXTS[STAGE.DUE_IN_3], TEXTS[STAGE.DUE_TODAY], TEXTS[STAGE.OVERDUE]]);
  assert.deepEqual(store.sentStages(1, "2026-11-13").sort(), [STAGE.DUE_IN_3, STAGE.DUE_TODAY, STAGE.OVERDUE].sort());
});

test("only one pre-due reminder per cycle even if 2-day/1-day stages are reached later", () => {
  const taken = new Map([[cycleKey(1, "2026-11-13"), new Set(["pre_due"])]]);
  assert.equal(nextStageForDebt(debt(), "2026-11-11", taken.get(cycleKey(1, "2026-11-13"))), null);
  assert.equal(nextStageForDebt(debt(), "2026-11-12", taken.get(cycleKey(1, "2026-11-13"))), null);
});

test("due today", async () => {
  const store = makeStore();
  const r = await run(store, { now: winter("2026-11-13", "10:00"), debts: [debt()] });
  assert.equal(r.outcome, "sent");
  assert.equal(r.message.body, TEXTS[STAGE.DUE_TODAY]);
});

test("overdue is sent exactly once, never daily", async () => {
  const store = makeStore();
  const d = debt({ due_date: "2026-11-01" });
  const outcomes = [];
  for (let day = 2; day <= 12; day++) outcomes.push((await run(store, { now: winter(`2026-11-${String(day).padStart(2, "0")}`, "09:30"), debts: [d] })).outcome);
  assert.equal(outcomes.filter((o) => o === "sent").length, 1);
  assert.deepEqual(store.sentStages(1, "2026-11-01"), [STAGE.OVERDUE]);
});

test("maximum 3 per debt/due date even if the cycle groups were somehow all taken", () => {
  const full = new Set(["pre_due", "due_today", "overdue"]);
  for (const day of ["2026-11-10", "2026-11-13", "2026-11-20"]) assert.equal(nextStageForDebt(debt(), day, full), null);
  assert.equal(new Set(Object.values(STAGE_GROUP)).size, 3);
});

// ------------------------------------------------------------------ eligibility

test("partial payment: still eligible and does NOT restart the cycle", async () => {
  const store = makeStore();
  await run(store, { now: winter("2026-11-10", "09:00"), debts: [debt()] }); // due_in_3 sent
  const partly = debt({ paid_amount: 150 });
  assert.ok(isEligibleDebt(partly));
  const r = await run(store, { now: winter("2026-11-11", "09:00"), debts: [partly] });
  assert.deepEqual([r.outcome, r.reason], ["skipped", "nothing_new"]);
  const today = await run(store, { now: winter("2026-11-13", "09:00"), debts: [partly] });
  assert.equal(today.message.body, TEXTS[STAGE.DUE_TODAY]);
});

test("full settlement: remaining <= 0.005 or paid flag -> never a push", async () => {
  for (const d of [debt({ paid_amount: 400 }), debt({ paid_amount: 399.996 }), debt({ paid_amount: 399.995 }), debt({ paid: 1, paid_amount: 400 }), debt({ paid: 1, paid_amount: 0 })]) {
    assert.equal(isEligibleDebt(d), false, JSON.stringify(d));
    const store = makeStore();
    const r = await run(store, { now: winter("2026-11-13", "09:00"), debts: [d] });
    assert.deepEqual([r.outcome, r.reason], ["skipped", "nothing_new"]);
  }
  assert.equal(isEligibleDebt(debt({ paid_amount: 399.99 })), true); // 0.01 remaining
});

test("missing / invalid due_date -> not eligible", () => {
  for (const due of [null, "", "13/11/2026", "2026-11-13T00:00:00Z"]) assert.equal(isEligibleDebt(debt({ due_date: due })), false);
});

test("postponed due_date starts a new cycle", async () => {
  const store = makeStore();
  await run(store, { now: winter("2026-11-13", "09:00"), debts: [debt({ due_date: "2026-11-13" })] }); // due_today sent
  const postponed = debt({ due_date: "2026-11-20" });
  const r = await run(store, { now: winter("2026-11-17", "09:00"), debts: [postponed] });
  assert.equal(r.outcome, "sent");
  assert.equal(r.message.body, TEXTS[STAGE.DUE_IN_3]);
  assert.deepEqual(store.sentStages(1, "2026-11-20"), [STAGE.DUE_IN_3]);
  assert.deepEqual(store.sentStages(1, "2026-11-13"), [STAGE.DUE_TODAY]);
});

// ------------------------------------------------------------------ daily limit & summary

test("one push per user per local day: a later run the same day sends nothing", async () => {
  const store = makeStore();
  const a = debt({ id: 1, due_date: "2026-11-13" });
  const first = await run(store, { now: winter("2026-11-13", "09:00"), debts: [a] });
  assert.equal(first.outcome, "sent");
  const b = debt({ id: 2, due_date: "2026-11-14" }); // becomes eligible later that day
  const later = await run(store, { now: winter("2026-11-13", "15:00"), debts: [a, b] });
  assert.deepEqual([later.outcome, later.reason], ["skipped", "already_sent"]);
  const tomorrow = await run(store, { now: winter("2026-11-14", "09:00"), debts: [a, b] });
  assert.equal(tomorrow.outcome, "sent");
});

test("several eligible debts -> ONE privacy-safe summary push", async () => {
  const store = makeStore();
  const debts = [
    debt({ id: 1, due_date: "2026-11-11", name: "زبون أحمد", amount: 900, account_type: "مشروع" }), // overdue 2 days
    debt({ id: 2, due_date: "2026-11-13", name: "مورّد", amount: 50 }), // today
    debt({ id: 3, due_date: "2026-11-15", name: "صديق", amount: 77 }), // in 2 days
  ];
  let calls = 0;
  const r = await run(store, { now: winter("2026-11-13", "09:00"), debts, sendPush: async () => { calls++; return { status: 201 }; } });
  assert.equal(r.outcome, "sent");
  assert.equal(calls, 1);
  assert.equal(r.message.body, "تذكير بالديون — لديك ديون متأخرة أو مستحقة قريبًا. افتح خزنتي للتفاصيل.");
  assert.equal(r.message.url, "/?open=debts&mode=project"); // mode of the most urgent (overdue) debt
  const blob = JSON.stringify(r.message);
  for (const s of ["أحمد", "مورّد", "صديق", "900", "50", "77", "₪"]) assert.ok(!blob.includes(s), "leak " + s);
});

test("single debt message: approved text, shared tag, deep link with debt id + its mode only", () => {
  const m = buildMessage([{ debt_id: 42, due_date: "2026-11-13", stage: STAGE.DUE_TODAY, account_type: "مشروع", days: 0 }]);
  assert.deepEqual(m, { title: NOTIFICATION_TITLE, body: TEXTS[STAGE.DUE_TODAY], tag: NOTIFICATION_TAG, url: "/?open=debts&debt=42&mode=project" });
  assert.equal(NOTIFICATION_TAG, "khznti-debt-reminder");
  assert.equal(TEXTS.FALLBACK, "لديك تذكير بخصوص ديونك. افتح خزنتي للتفاصيل.");
});

// ------------------------------------------------------------------ time window & timezones

test("send window boundaries 08:59 / 09:00 / 20:59 / 21:00 (local)", () => {
  const plan = (hhmm) => planUserReminder({ now: winter("2026-11-13", hhmm), subscriptions: [SUB()], debts: [debt()] });
  assert.deepEqual([plan("08:59").action, plan("08:59").reason], ["skip", "outside_send_window"]);
  assert.equal(plan("09:00").action, "send");
  assert.equal(plan("20:59").action, "send");
  assert.deepEqual([plan("21:00").action, plan("21:00").reason], ["skip", "outside_send_window"]);
  assert.equal(isWithinSendWindow({ hour: 8, minute: 59 }), false);
  assert.equal(isWithinSendWindow({ hour: 21, minute: 0 }), false);
});

test("valid IANA timezone handling; no fallback zone", () => {
  for (const tz of ["Asia/Hebron", "Asia/Gaza", "Asia/Jerusalem", "Asia/Amman", "Europe/London", "America/Argentina/Buenos_Aires", "UTC", "Etc/GMT-3"]) assert.ok(isValidIanaTimeZone(tz), tz);
  for (const tz of [undefined, null, "", "GMT+3", "+03:00", "Mars/Phobos", "Asia/Hebron ", "asia hebron", "x".repeat(80), 3]) assert.ok(!isValidIanaTimeZone(tz), String(tz));
  const p = planUserReminder({ now: winter("2026-11-13", "09:00"), subscriptions: [SUB(undefined, "GMT+3")], debts: [debt()] });
  assert.deepEqual([p.action, p.reason], ["skip", "no_valid_timezone"]);
  assert.equal(userTimeZone([SUB("a", "Bad/Zone", "2026-11-05T00:00:00Z"), SUB("b", "Asia/Amman", "2026-11-01T00:00:00Z"), SUB("c", "Asia/Hebron", "2026-11-03T00:00:00Z")]), "Asia/Hebron");
});

test("local date uses the user's timezone, not UTC", () => {
  // 22:30 UTC on Nov 12 is already 00:30 on Nov 13 in Hebron (UTC+2)
  assert.deepEqual(localClock(new Date("2026-11-12T22:30:00Z"), TZ), { date: "2026-11-13", hour: 0, minute: 30 });
  assert.equal(daysUntilDue("2026-11-13", "2026-11-13"), 0);
  assert.equal(daysUntilDue("2026-11-14", "2026-11-13"), -1);
  assert.equal(daysUntilDue("2026-12-31", "2027-01-03"), 3); // across year end
});

test("Palestine DST end (2026-10-24 02:00 -> 01:00 local): 09:00 local tracks the offset change", () => {
  // Summer (UTC+3): 06:00Z = 09:00 local
  assert.deepEqual(localClock(new Date("2026-10-23T06:00:00Z"), TZ), { date: "2026-10-23", hour: 9, minute: 0 });
  // Just before / after the switch at 23:00Z
  assert.deepEqual(localClock(new Date("2026-10-23T22:59:00Z"), TZ), { date: "2026-10-24", hour: 1, minute: 59 });
  assert.deepEqual(localClock(new Date("2026-10-23T23:00:00Z"), TZ), { date: "2026-10-24", hour: 1, minute: 0 });
  // Winter (UTC+2): 06:30Z = 08:30 local (too early), 07:00Z = 09:00 local
  const d = [debt({ due_date: "2026-10-24" })];
  assert.equal(planUserReminder({ now: new Date("2026-10-24T06:30:00Z"), subscriptions: [SUB()], debts: d }).reason, "outside_send_window");
  assert.equal(planUserReminder({ now: new Date("2026-10-24T07:00:00Z"), subscriptions: [SUB()], debts: d }).action, "send");
  assert.equal(planUserReminder({ now: summer("2026-10-23", "09:00"), subscriptions: [SUB()], debts: d }).items[0].stage, STAGE.DUE_IN_1);
});

// ------------------------------------------------------------------ claims, concurrency, failures

test("concurrent runs for the same user: exactly one sends", async () => {
  const store = makeStore();
  let calls = 0;
  let releaseSend;
  const gate = new Promise((r) => (releaseSend = r));
  const slowSend = async () => { calls++; await gate; return { status: 201 }; };
  const now = winter("2026-11-13", "09:05");
  const a = run(store, { now, debts: [debt()], sendPush: slowSend });
  const b = run(store, { now, debts: [debt()], sendPush: slowSend });
  releaseSend();
  const results = await Promise.all([a, b]);
  assert.deepEqual(results.map((r) => r.outcome).sort(), ["sent", "skipped"]);
  assert.equal(results.find((r) => r.outcome === "skipped").reason, "in_progress");
  assert.equal(calls, 1);
  assert.deepEqual(store.sentStages(1, "2026-11-13"), [STAGE.DUE_TODAY]);
});

test("a concurrent run cannot claim the same stage even after the daily slot (unique stage key)", async () => {
  const store = makeStore();
  const now = winter("2026-11-13", "09:05");
  const items = [{ debt_id: 1, due_date: "2026-11-13", stage: STAGE.DUE_TODAY, group: "due_today", account_type: "فرد", days: 0 }];
  assert.equal((await store.claimStages("u1", "2026-11-13", items, "x", now)).length, 1);
  assert.equal((await store.claimStages("u1", "2026-11-13", items, "y", now)).length, 0);
});

test("temporary failure (503 / 429 / network) is NOT recorded as delivered and is retried later the same day", async () => {
  for (const failure of [{ status: 503 }, { status: 429 }, { status: 500 }, { error: "ETIMEDOUT" }]) {
    const store = makeStore();
    const r1 = await run(store, { now: winter("2026-11-13", "09:00"), debts: [debt()], sendPush: async () => failure });
    assert.deepEqual([r1.outcome, r1.reason], ["released", "not_accepted"], JSON.stringify(failure));
    assert.equal(store.deliveries.size, 0);
    assert.equal(store.daily.size, 0);
    const r2 = await run(store, { now: winter("2026-11-13", "10:00"), debts: [debt()] });
    assert.equal(r2.outcome, "sent");
    assert.deepEqual(store.sentStages(1, "2026-11-13"), [STAGE.DUE_TODAY]);
  }
});

test("sendPush throwing is treated as a temporary failure", async () => {
  const store = makeStore();
  const r = await run(store, { now: winter("2026-11-13", "09:00"), debts: [debt()], sendPush: async () => { throw new Error("boom"); } });
  assert.equal(r.outcome, "released");
  assert.equal(store.deliveries.size, 0);
});

test("temporary failures all day -> nothing after 21:00; next day the next stage is used (still max one pre-due)", async () => {
  const store = makeStore();
  const d = debt({ due_date: "2026-11-13" });
  for (const hh of ["09:00", "12:00", "20:00"]) assert.equal((await run(store, { now: winter("2026-11-10", hh), debts: [d], sendPush: async () => ({ status: 503 }) })).outcome, "released");
  assert.equal((await run(store, { now: winter("2026-11-10", "21:00"), debts: [d] })).reason, "outside_send_window");
  const next = await run(store, { now: winter("2026-11-11", "09:00"), debts: [d] });
  assert.equal(next.message.body, TEXTS[STAGE.DUE_IN_2]);
  assert.equal((await run(store, { now: winter("2026-11-12", "09:00"), debts: [d] })).reason, "nothing_new");
});

test("404/410: subscription removed; another device accepting still counts as delivered", async () => {
  const store = makeStore();
  const subs = [SUB("https://fcm.googleapis.com/fcm/send/gone"), SUB("https://web.push.apple.com/ok")];
  const r = await run(store, { now: winter("2026-11-13", "09:00"), debts: [debt()], subscriptions: subs, sendPush: async (s) => (s.endpoint.endsWith("gone") ? { status: 410 } : { status: 201 }) });
  assert.equal(r.outcome, "sent");
  assert.deepEqual(store.removed, ["https://fcm.googleapis.com/fcm/send/gone"]);
});

test("404/410 on every device: all removed, nothing recorded as delivered", async () => {
  for (const status of [404, 410]) {
    const store = makeStore();
    const r = await run(store, { now: winter("2026-11-13", "09:00"), debts: [debt()], sendPush: async () => ({ status }) });
    assert.deepEqual([r.outcome, r.reason], ["released", "all_subscriptions_gone"]);
    assert.equal(store.removed.length, 1);
    assert.equal(store.deliveries.size, 0);
    assert.equal(store.daily.size, 0);
  }
});

test("crashed run: a fresh claim blocks (in_progress), a stale claim (> lease) is taken over", async () => {
  const store = makeStore();
  const crashAt = winter("2026-11-13", "09:00");
  await store.claimDaily("u1", "2026-11-13", "crashed", crashAt);
  await store.claimStages("u1", "2026-11-13", [{ debt_id: 1, due_date: "2026-11-13", stage: STAGE.DUE_TODAY, group: "due_today", account_type: "فرد", days: 0 }], "crashed", crashAt);
  const soon = await run(store, { now: new Date(+crashAt + 5 * 60 * 1000), debts: [debt()] });
  assert.equal(soon.outcome, "skipped");
  const later = await run(store, { now: new Date(+crashAt + CLAIM_LEASE_MS + 60 * 1000), debts: [debt()] });
  assert.equal(later.outcome, "sent");
  assert.deepEqual(store.sentStages(1, "2026-11-13"), [STAGE.DUE_TODAY]);
});

test("push result classification", () => {
  assert.equal(classifyPushResult({ status: 201 }), "accepted");
  assert.equal(classifyPushResult({ status: 202 }), "accepted");
  assert.equal(classifyPushResult({ status: 410 }), "gone");
  assert.equal(classifyPushResult({ status: 404 }), "gone");
  for (const s of [400, 403, 413, 429, 500, 502, 503]) assert.equal(classifyPushResult({ status: s }), "retry", String(s));
  assert.equal(classifyPushResult({ error: "network" }), "retry");
  assert.equal(classifyPushResult(undefined), "retry");
  assert.deepEqual(decideOutcome([{ status: 410 }, { status: 503 }]).delivered, false);
});

test("no subscriptions -> skip", () => {
  assert.equal(planUserReminder({ now: winter("2026-11-13", "09:00"), subscriptions: [], debts: [debt()] }).reason, "no_subscription");
});

test("two users are fully independent (daily slot and stages are per user/debt)", async () => {
  const store = makeStore();
  const now = winter("2026-11-13", "09:00");
  const r1 = await run(store, { userId: "u1", now, debts: [debt({ id: 1, user_id: "u1" })] });
  const r2 = await run(store, { userId: "u2", now, debts: [debt({ id: 2, user_id: "u2" })] });
  assert.deepEqual([r1.outcome, r2.outcome], ["sent", "sent"]);
  assert.equal(r1.message.url, "/?open=debts&debt=1&mode=individual");
  assert.equal(r2.message.url, "/?open=debts&debt=2&mode=individual");
});

test("nextStageForEligible (server path, eligibility already applied by the DB) follows the same stage rules", async () => {
  const { nextStageForEligible } = await import("./debt-reminders.js");
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-10"), STAGE.DUE_IN_3);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-12"), STAGE.DUE_IN_1);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-13"), STAGE.DUE_TODAY);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-20"), STAGE.OVERDUE);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-09"), null);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-11", new Set(["pre_due"])), null);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-13", new Set(["pre_due"])), STAGE.DUE_TODAY);
  assert.equal(nextStageForEligible("2026-11-13", "2026-11-14", new Set(["pre_due", "due_today", "overdue"])), null);
});
