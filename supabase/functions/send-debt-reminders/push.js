// push.js — Web Push sender.
// web-push (RFC 8291 aes128gcm encryption + RFC 8292 VAPID) only BUILDS the
// request (generateRequestDetails: no network). We send it with fetch so we
// control the timeout and the response classification. Returns { status } or
// { error } and never throws. Never logs endpoints or payloads.
import { NOTIFICATION_TAG } from "../_shared/debt-reminders.js";

// Same allowlist as register_push_subscription() (defense in depth).
const ALLOWED_ENDPOINT_RE = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)\/[^\s]+$/;

export const PUSH_TTL_SECONDS = 6 * 60 * 60; // a reminder older than 6h is not worth delivering
export const PUSH_TIMEOUT_MS = 10_000;
export const PUSH_TOPIC = NOTIFICATION_TAG; // a newer pending reminder replaces an undelivered older one

export function isAllowedEndpoint(endpoint) {
  return typeof endpoint === "string" && endpoint.length <= 1024 && ALLOWED_ENDPOINT_RE.test(endpoint);
}

export function createPushSender({ webpush, publicKey, privateKey, subject, fetchImpl = fetch, timeoutMs = PUSH_TIMEOUT_MS }) {
  return async function sendPush(subscription, payload) {
    if (!isAllowedEndpoint(subscription.endpoint)) return { error: "endpoint_not_allowed" };

    let details;
    try {
      details = webpush.generateRequestDetails(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
        payload,
        {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: PUSH_TTL_SECONDS,
          urgency: "normal",
          topic: PUSH_TOPIC,
          contentEncoding: "aes128gcm",
        },
      );
    } catch {
      return { error: "request_build_failed" };
    }

    const headers = { ...details.headers };
    delete headers["Content-Length"]; // fetch sets it from the body

    try {
      const response = await fetchImpl(details.endpoint, {
        method: "POST",
        headers,
        body: details.body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      try { await response.body?.cancel(); } catch { /* ignore */ }
      return { status: response.status };
    } catch (e) {
      return { error: e && e.name === "TimeoutError" ? "timeout" : "network" };
    }
  };
}
