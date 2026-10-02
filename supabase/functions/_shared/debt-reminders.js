// debt-reminders.js — Phase 1 Web Push: pure reminder logic (no network, no
// database). Shared by the send-debt-reminders Edge Function (Deno) and the
// unit tests (Node). Everything here is deterministic given its inputs.
//
// Approved rules (KHZNTI, Oct 2026):
// - Only the existing debt due-date reminders. Eligible = has due_date,
//   paid flag is 0/null, and remaining (amount - paid_amount) > 0.005 — the
//   same tolerance as debt settlement.
// - Per debt and due date ("cycle"), at most 3 notifications: the FIRST
//   pre-due stage reached (3, 2 or 1 days before), then due today, then
//   overdue once. A changed due_date is a new cycle. Partial payments don't
//   restart anything.
// - At most one push per user per local day, only between 09:00 and 21:00
//   in the timezone reported by the opted-in device (no fallback zone).
// - Several debts with a new stage on the same day → one privacy-safe
//   summary. Notification text never contains names or amounts.
//
// Claim / delivery model (enforced by the database in Stage 2; mirrored by
// the in-memory store used in the tests):
// - A run first CLAIMS the user's daily slot and the cycle stages it wants to
//   send (status "claimed", with a run token and claimed_at). Unique keys make
//   claims exclusive, so two concurrent runs can never both send.
// - Only when at least one push service ACCEPTS the push (HTTP 2xx) are the
//   claims finalized to "sent". Otherwise the claims are RELEASED (deleted),
//   so a temporary failure stays retryable on a later hourly run.
// - A claim left behind by a crashed run becomes stale after CLAIM_LEASE_MS
//   and may then be taken over (longer than any Edge Function run).
// - 404/410 from the push service means that device's subscription is gone:
//   it is removed, and it does not count as an acceptance.

export const REMAINING_TOLERANCE = 0.005;
export const SEND_WINDOW_START_HOUR = 9; // 09:00 inclusive
export const SEND_WINDOW_END_HOUR = 21; // 21:00 exclusive (last send minute 20:59)
export const MAX_NOTIFICATIONS_PER_CYCLE = 3;
export const CLAIM_LEASE_MS = 15 * 60 * 1000;

export const STAGE = Object.freeze({
  DUE_IN_3: "due_in_3",
  DUE_IN_2: "due_in_2",
  DUE_IN_1: "due_in_1",
  DUE_TODAY: "due_today",
  OVERDUE: "overdue",
});

// One slot per group per cycle: pre-due (any of 3/2/1), due today, overdue.
// That is also what limits a cycle to MAX_NOTIFICATIONS_PER_CYCLE.
export const STAGE_GROUP = Object.freeze({
  [STAGE.DUE_IN_3]: "pre_due",
  [STAGE.DUE_IN_2]: "pre_due",
  [STAGE.DUE_IN_1]: "pre_due",
  [STAGE.DUE_TODAY]: "due_today",
  [STAGE.OVERDUE]: "overdue",
});

export const NOTIFICATION_TITLE = "خزنتي";
export const NOTIFICATION_TAG = "khznti-debt-reminder"; // shared with Phase 0 local notifications

export const TEXTS = Object.freeze({
  [STAGE.DUE_IN_1]: "لديك دين مستحق غدًا. افتح خزنتي للتفاصيل.",
  [STAGE.DUE_IN_2]: "لديك دين مستحق بعد يومين. افتح خزنتي للتفاصيل.",
  [STAGE.DUE_IN_3]: "لديك دين مستحق بعد 3 أيام. افتح خزنتي للتفاصيل.",
  [STAGE.DUE_TODAY]: "لديك دين مستحق اليوم. افتح خزنتي للتفاصيل.",
  [STAGE.OVERDUE]: "لديك دين تجاوز موعد استحقاقه. افتح خزنتي للتفاصيل.",
  SUMMARY: "تذكير بالديون — لديك ديون متأخرة أو مستحقة قريبًا. افتح خزنتي للتفاصيل.",
  FALLBACK: "لديك تذكير بخصوص ديونك. افتح خزنتي للتفاصيل.",
});

const MODE_PARAM = { "فرد": "individual", "مشروع": "project" };
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const IANA_RE = /^(UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/;

// ---------------------------------------------------------------- time

export function isValidIanaTimeZone(timeZone) {
  if (typeof timeZone !== "string" || timeZone.length > 64 || !IANA_RE.test(timeZone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

// Local calendar date ("YYYY-MM-DD") and wall-clock hour/minute in timeZone.
export function localClock(now, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

export function isWithinSendWindow(clock) {
  return clock.hour >= SEND_WINDOW_START_HOUR && clock.hour < SEND_WINDOW_END_HOUR;
}

function dateToDayNumber(dateStr) {
  const m = DATE_RE.exec(dateStr || "");
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

// Whole calendar days from localDate to dueDate (negative = overdue).
export function daysUntilDue(localDate, dueDate) {
  const a = dateToDayNumber(localDate);
  const b = dateToDayNumber(dueDate);
  return a === null || b === null ? null : b - a;
}

// ---------------------------------------------------------------- eligibility & stages

export function remainingAmount(debt) {
  return Number(debt.amount || 0) - Number(debt.paid_amount || 0);
}

export function isEligibleDebt(debt) {
  return (
    !!debt &&
    dateToDayNumber(debt.due_date) !== null &&
    Number(debt.paid || 0) === 0 &&
    remainingAmount(debt) > REMAINING_TOLERANCE
  );
}

export function stageForDays(days) {
  if (days === null || days > 3) return null;
  if (days === 3) return STAGE.DUE_IN_3;
  if (days === 2) return STAGE.DUE_IN_2;
  if (days === 1) return STAGE.DUE_IN_1;
  if (days === 0) return STAGE.DUE_TODAY;
  return STAGE.OVERDUE;
}

export function cycleKey(debtId, dueDate) {
  return `${debtId}|${dueDate}`;
}

// The stage to send today for a debt that is ALREADY known to be eligible
// (e.g. returned by the debt_reminder_candidates() database function, which
// applies the eligibility rule itself and returns no amounts), or null.
// takenGroups: Set of STAGE_GROUP values already sent (or actively claimed)
// for this debt's current cycle (debt_id + due_date).
export function nextStageForEligible(dueDate, localDate, takenGroups = new Set()) {
  const stage = stageForDays(daysUntilDue(localDate, dueDate));
  if (!stage) return null;
  if (takenGroups.size >= MAX_NOTIFICATIONS_PER_CYCLE) return null;
  if (takenGroups.has(STAGE_GROUP[stage])) return null;
  return stage;
}

// The stage to send for this debt today, or null.
export function nextStageForDebt(debt, localDate, takenGroups = new Set()) {
  if (!isEligibleDebt(debt)) return null;
  return nextStageForEligible(debt.due_date, localDate, takenGroups);
}

// ---------------------------------------------------------------- message

export function buildMessage(items) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.days - b.days || a.debt_id - b.debt_id); // most urgent first
  const top = sorted[0];
  const mode = MODE_PARAM[top.account_type] || "individual";
  if (sorted.length === 1) {
    return {
      title: NOTIFICATION_TITLE,
      body: TEXTS[top.stage],
      tag: NOTIFICATION_TAG,
      url: `/?open=debts&debt=${encodeURIComponent(top.debt_id)}&mode=${mode}`,
    };
  }
  return { title: NOTIFICATION_TITLE, body: TEXTS.SUMMARY, tag: NOTIFICATION_TAG, url: `/?open=debts&mode=${mode}` };
}

// ---------------------------------------------------------------- planning (pure)

// Which timezone to use for a user: the most recently seen subscription with
// a valid IANA zone. null = do not send (no fallback zone by design).
export function userTimeZone(subscriptions) {
  const valid = (subscriptions || [])
    .filter((s) => isValidIanaTimeZone(s.timezone))
    .sort((a, b) => Date.parse(b.last_seen_at || 0) - Date.parse(a.last_seen_at || 0));
  return valid.length ? valid[0].timezone : null;
}

// takenByCycle: Map cycleKey -> Set of STAGE_GROUP (sent or active claim).
export function planUserReminder({ now, subscriptions, debts, takenByCycle = new Map() }) {
  if (!subscriptions || !subscriptions.length) return { action: "skip", reason: "no_subscription" };
  const timeZone = userTimeZone(subscriptions);
  if (!timeZone) return { action: "skip", reason: "no_valid_timezone" };
  const clock = localClock(now, timeZone);
  if (!isWithinSendWindow(clock)) return { action: "skip", reason: "outside_send_window", localDate: clock.date };

  const items = [];
  for (const debt of debts || []) {
    const taken = takenByCycle.get(cycleKey(debt.id, debt.due_date)) || new Set();
    const stage = nextStageForDebt(debt, clock.date, taken);
    if (stage) {
      items.push({
        debt_id: debt.id, due_date: debt.due_date, stage, group: STAGE_GROUP[stage],
        account_type: debt.account_type, days: daysUntilDue(clock.date, debt.due_date),
      });
    }
  }
  if (!items.length) return { action: "skip", reason: "nothing_new", localDate: clock.date };
  return { action: "send", timeZone, localDate: clock.date, items, message: buildMessage(items) };
}

// ---------------------------------------------------------------- push results

// { status } from the push service, or { error } for network/timeout errors.
export function classifyPushResult(result) {
  if (!result || result.error) return "retry";
  const s = Number(result.status);
  if (s >= 200 && s < 300) return "accepted";
  if (s === 404 || s === 410) return "gone";
  return "retry"; // 429/5xx/other: not accepted; claims are released for a later run
}

export function decideOutcome(results) {
  const kinds = results.map((r) => classifyPushResult(r));
  return {
    delivered: kinds.includes("accepted"),
    goneIndexes: kinds.map((k, i) => (k === "gone" ? i : -1)).filter((i) => i >= 0),
    kinds,
  };
}

// ---------------------------------------------------------------- one user, one run
//
// store contract (Stage 2 implements it in SQL with the same semantics):
//   takenGroups(userId, now)            -> Map cycleKey -> Set(group)  [sent + non-stale claims]
//   claimDaily(userId, localDate, token, now) -> "claimed" | "already_sent" | "in_progress"
//   claimStages(userId, localDate, items, token, now) -> items actually claimed
//   markSent(token, now)                -> finalize claims of this run as sent
//   release(token)                      -> delete claims of this run
//   removeSubscription(endpoint)
// sendPush(subscription, message) -> { status } | { error }   (must not throw; wrapped anyway)

export async function runUserReminder({ userId, subscriptions, debts, now, store, sendPush, token }) {
  const taken = await store.takenGroups(userId, now);
  const plan = planUserReminder({ now, subscriptions, debts, takenByCycle: taken });
  if (plan.action !== "send") return { outcome: "skipped", reason: plan.reason };

  const daily = await store.claimDaily(userId, plan.localDate, token, now);
  if (daily !== "claimed") return { outcome: "skipped", reason: daily };

  const claimed = await store.claimStages(userId, plan.localDate, plan.items, token, now);
  if (!claimed.length) {
    await store.release(token);
    return { outcome: "skipped", reason: "stages_claimed_elsewhere" };
  }

  const message = buildMessage(claimed);
  const results = await Promise.all(
    subscriptions.map(async (s) => {
      try {
        return await sendPush(s, message);
      } catch (e) {
        return { error: String(e && e.message ? e.message : e) };
      }
    })
  );
  const { delivered, goneIndexes } = decideOutcome(results);
  for (const i of goneIndexes) await store.removeSubscription(subscriptions[i].endpoint);

  if (delivered) {
    await store.markSent(token, now);
    return { outcome: "sent", localDate: plan.localDate, items: claimed, message };
  }
  await store.release(token);
  return { outcome: "released", reason: goneIndexes.length === subscriptions.length ? "all_subscriptions_gone" : "not_accepted", localDate: plan.localDate };
}
