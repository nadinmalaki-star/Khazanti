// push.js — Web Push on this device (Phase 1, debt due-date reminders).
// - Explicit opt-in only: enablePush() must be called from the user's tap on
//   "تفعيل التنبيهات". Nothing subscribes just because permission was granted.
// - The subscription comes only from PushManager.subscribe() with the
//   production VAPID public key, and is registered through the reviewed
//   register_push_subscription RPC (user_id always comes from auth.uid()).
// - A device flag remembers that THIS user opted in on THIS device; Phase 0
//   local notifications are suppressed only while it is set.

// Public by design (it is the applicationServerKey every browser receives).
export const VAPID_PUBLIC_KEY = "BKihb4lJ5o2b878V2_Bp3hgTIj7yK4RCOSCjnE4aeZk-ODZUJ4_-qD9sDfBmY5IYRMMnObpFNydz_CV2Bfl4K5I";

const DEVICE_FLAG_KEY = "khznti_push_device"; // { userId, endpoint }
const PROMPT_DISMISSED_KEY = "khznti_push_prompt_dismissed";
const IANA_RE = /^(UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/;
const LOGOUT_CLEANUP_TIMEOUT_MS = 4000;

// ---------------------------------------------------------------- support

export function isIosDevice() {
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// "supported" | "ios_needs_install" | "unsupported"
export function getPushSupport() {
  try {
    const capable = window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (isIosDevice() && !isStandaloneApp()) return "ios_needs_install";
    return capable ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}

// The device's own IANA timezone, or null (no fallback zone by design).
export function getDeviceTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz !== "string" || tz.length > 64 || !IANA_RE.test(tz)) return null;
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(0);
    return tz;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- device flag

function readFlag() {
  try {
    const v = JSON.parse(localStorage.getItem(DEVICE_FLAG_KEY) || "null");
    return v && typeof v.userId === "string" && typeof v.endpoint === "string" ? v : null;
  } catch {
    return null;
  }
}
function writeFlag(userId, endpoint) {
  try { localStorage.setItem(DEVICE_FLAG_KEY, JSON.stringify({ userId, endpoint })); } catch { /* storage blocked */ }
}
function clearFlag() {
  try { localStorage.removeItem(DEVICE_FLAG_KEY); } catch { /* storage blocked */ }
}

export function isPushActiveForUser(userId) {
  const flag = readFlag();
  return !!userId && !!flag && flag.userId === userId;
}

export function isPushPromptDismissed() {
  try { return localStorage.getItem(PROMPT_DISMISSED_KEY) === "1"; } catch { return false; }
}
export function dismissPushPrompt() {
  try { localStorage.setItem(PROMPT_DISMISSED_KEY, "1"); } catch { /* storage blocked */ }
}

// ---------------------------------------------------------------- subscription

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const SUBSCRIBE_OPTIONS = () => ({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) });

function usesOurKey(subscription) {
  try {
    const key = subscription.options && subscription.options.applicationServerKey;
    if (!key) return false;
    const a = new Uint8Array(key), b = base64UrlToBytes(VAPID_PUBLIC_KEY);
    return a.length === b.length && a.every((x, i) => x === b[i]);
  } catch {
    return false;
  }
}

async function currentSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager ? reg.pushManager.getSubscription() : null;
}

// Reuse this device's subscription only if it was made with our key.
async function ensureSubscription(reg) {
  const existing = await reg.pushManager.getSubscription();
  if (existing && usesOurKey(existing)) return existing;
  if (existing) { try { await existing.unsubscribe(); } catch { /* ignore */ } }
  return reg.pushManager.subscribe(SUBSCRIBE_OPTIONS());
}

async function registerOnServer(client, subscription, timeZone) {
  const json = subscription.toJSON();
  const { data, error } = await client.rpc("register_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys && json.keys.p256dh,
    p_auth_key: json.keys && json.keys.auth,
    p_timezone: timeZone,
    p_user_agent: (navigator.userAgent || "").slice(0, 300),
  });
  if (error) throw new Error("register_failed");
  return data; // "registered" | "not_registered"
}

// Register; if this endpoint belongs to another account ("not_registered"),
// get a brand-new endpoint (unsubscribe -> subscribe) and register that one.
async function registerWithFreshFallback(client, reg, subscription, timeZone) {
  let sub = subscription;
  let result = await registerOnServer(client, sub, timeZone);
  if (result === "not_registered") {
    try { await sub.unsubscribe(); } catch { /* ignore */ }
    sub = await reg.pushManager.subscribe(SUBSCRIBE_OPTIONS());
    result = await registerOnServer(client, sub, timeZone);
  }
  return { result, subscription: sub };
}

// Called ONLY from the user's tap. Returns { ok: true } or { ok: false, reason }.
// reason: ios_needs_install | unsupported | no_timezone | denied | dismissed | not_registered | error
export async function enablePush(client, userId) {
  const support = getPushSupport();
  if (support !== "supported") return { ok: false, reason: support };
  if (!userId) return { ok: false, reason: "error" };
  const timeZone = getDeviceTimeZone();
  if (!timeZone) return { ok: false, reason: "no_timezone" };

  // The permission prompt is the first awaited step, so it stays inside the
  // user's tap (required by iOS).
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await ensureSubscription(reg);
    const { result, subscription: finalSub } = await registerWithFreshFallback(client, reg, subscription, timeZone);
    if (result !== "registered") return { ok: false, reason: "not_registered" };
    writeFlag(userId, finalSub.endpoint);
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// On app start for a signed-in user. Refreshes this device's registration
// (keys / timezone / last seen) only if THIS user opted in on THIS device.
// Never prompts. Returns true while Web Push is active for this user here.
export async function refreshPushRegistration(client, userId) {
  const flag = readFlag();
  if (!flag) return false;
  if (getPushSupport() !== "supported" || Notification.permission !== "granted") { clearFlag(); return false; }
  if (flag.userId !== userId) {
    // Opted in by another account that never logged out here: stop that
    // account's reminders on this device (the server drops it on 404/410).
    await unsubscribeThisDevice();
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (!existing) { clearFlag(); return false; }
    const timeZone = getDeviceTimeZone();
    if (!timeZone) return true; // keep the existing registration; nothing to refresh
    const { result, subscription } = await registerWithFreshFallback(client, reg, existing, timeZone);
    if (result !== "registered") { clearFlag(); return false; }
    writeFlag(userId, subscription.endpoint);
    return true;
  } catch {
    return isPushActiveForUser(userId); // offline etc.: keep the current state
  }
}

// Turn off on this device: delete this device's row (RLS: own rows only),
// then unsubscribe. Order matters: deleting needs the session. If the delete
// fails, nothing changes (unless force, used on logout) so the user can retry.
export async function disablePush(client, { force = false } = {}) {
  const sub = await currentSubscription().catch(() => null);
  if (sub) {
    let failed;
    try {
      const { error } = await client.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      failed = !!error;
    } catch {
      failed = true;
    }
    if (failed && !force) return { ok: false };
    try { await sub.unsubscribe(); } catch { /* ignore */ }
  }
  clearFlag();
  return { ok: true };
}

// Before signOut. Never blocks logout for long; whatever happens, this device
// stops receiving reminders (a row left on the server is removed on 404/410).
export async function cleanupPushOnLogout(client) {
  if (!readFlag()) return;
  try {
    await Promise.race([disablePush(client, { force: true }), new Promise((r) => setTimeout(r, LOGOUT_CLEANUP_TIMEOUT_MS))]);
  } catch { /* ignore */ }
  await Promise.race([unsubscribeThisDevice(), new Promise((r) => setTimeout(r, 1000))]);
  clearFlag();
}

// "Delete my data": remove ALL of this user's subscriptions (RLS: own rows),
// then stop this device. Returns { error } so the caller can stop on failure.
export async function deleteAllPushForUser(client, userId) {
  let error;
  try {
    ({ error } = await client.from("push_subscriptions").delete().eq("user_id", userId));
  } catch (e) {
    error = e || new Error("delete_failed");
  }
  if (error) return { error };
  await unsubscribeThisDevice();
  return { error: null };
}

// Session ended without a normal logout: no server call is possible, so stop
// this device locally; the server removes the row on the next 404/410.
export async function unsubscribeThisDevice() {
  if (!readFlag()) return;
  try {
    const sub = await currentSubscription();
    if (sub) await sub.unsubscribe();
  } catch { /* ignore */ }
  clearFlag();
}

// ---------------------------------------------------------------- deep link

const MODE_FROM_PARAM = { individual: "فرد", project: "مشروع" };

// "?open=debts[&debt=<id>]&mode=individual|project" -> { debtId, mode } | null
export function parseOpenIntent(search) {
  try {
    const p = new URLSearchParams(search || "");
    if (p.get("open") !== "debts") return null;
    const debtRaw = p.get("debt");
    const debtId = debtRaw && /^\d{1,12}$/.test(debtRaw) ? Number(debtRaw) : null;
    const mode = MODE_FROM_PARAM[p.get("mode")] || null;
    return { debtId, mode };
  } catch {
    return null;
  }
}
