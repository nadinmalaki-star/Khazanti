// Web Push sender tests (Deno). Uses the real push.js + npm:web-push with
// DISPOSABLE keys only and a mocked fetch (no network). Every request is
// verified independently: RFC 8291/8188 decryption written from the RFCs,
// and the VAPID JWT (RFC 8292) checked with WebCrypto.
import { assert, assertEquals } from "jsr:@std/assert@1";
import webpush from "npm:web-push@3.6.7";
import { createPushSender, isAllowedEndpoint, PUSH_TTL_SECONDS } from "../send-debt-reminders/push.js";
import { classifyPushResult, decideOutcome } from "../_shared/debt-reminders.js";

const subtle = crypto.subtle;
const te = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const key = await subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource }, key, len * 8));
}

async function decrypt(body: Uint8Array, uaPriv: CryptoKey, uaPubRaw: Uint8Array, authSecret: Uint8Array) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPubRaw = body.slice(21, 21 + idlen);
  const asPub = await subtle.importKey("raw", asPubRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: asPub }, uaPriv, 256));
  const ikm = await hkdf(authSecret, shared, cat(te.encode("WebPush: info\0"), uaPubRaw, asPubRaw), 32);
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, body.slice(21 + idlen)));
  let end = plain.length - 1;
  while (end >= 0 && plain[end] === 0) end--;
  assertEquals(plain[end], 2, "aes128gcm last-record delimiter");
  return { text: new TextDecoder().decode(plain.slice(0, end)), asPubRaw: b64u(asPubRaw) };
}

async function verifyVapid(authorization: string, endpoint: string, subject: string, vapidPublic: string) {
  const m = /^vapid t=([^,]+),\s*k=(.+)$/.exec(authorization);
  assert(m, "Authorization: vapid t=..., k=...");
  const [h, p, s] = m![1].split(".");
  const header = JSON.parse(new TextDecoder().decode(unb64u(h)));
  const claims = JSON.parse(new TextDecoder().decode(unb64u(p)));
  const pub = await subtle.importKey("raw", unb64u(m![2]), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, unb64u(s), te.encode(`${h}.${p}`)), "ES256 signature");
  assertEquals(header.alg, "ES256");
  assertEquals(m![2], vapidPublic);
  assertEquals(claims.aud, new URL(endpoint).origin);
  assertEquals(claims.sub, subject);
  const ttl = claims.exp - Math.floor(Date.now() / 1000);
  assert(ttl > 0 && ttl <= 24 * 3600, "exp within 24h");
}

// Disposable keys (never real ones)
const vapid = webpush.generateVAPIDKeys();
const SUBJECT = "mailto:test@example.invalid";
const ua = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const uaPubRaw = new Uint8Array(await subtle.exportKey("raw", ua.publicKey));
const authSecret = crypto.getRandomValues(new Uint8Array(16));
const PAYLOAD = JSON.stringify({ v: 1, title: "خزنتي", body: "لديك دين مستحق اليوم. افتح خزنتي للتفاصيل.", tag: "khznti-debt-reminder", url: "/?open=debts&debt=42&mode=individual" });
const row = (endpoint: string) => ({ id: 1, user_id: "u", endpoint, p256dh: b64u(uaPubRaw), auth_key: b64u(authSecret), timezone: "Asia/Hebron" });

const ENDPOINTS = {
  fcm: "https://fcm.googleapis.com/fcm/send/disposable-test-token",
  apple: "https://web.push.apple.com/QDisposableTestToken",
  mozilla: "https://updates.push.services.mozilla.com/wpush/v2/disposable",
  microsoft: "https://wns2-db5p.notify.windows.com/w/?token=disposable",
};

function capturingFetch(status = 201) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(null, { status }); }) as unknown as typeof fetch;
  return { f, calls };
}

for (const [name, endpoint] of Object.entries(ENDPOINTS)) {
  Deno.test(`${name}: encrypted payload decrypts independently, VAPID valid, headers correct`, async () => {
    const { f, calls } = capturingFetch(201);
    const send = createPushSender({ webpush, publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: SUBJECT, fetchImpl: f });
    assertEquals(await send(row(endpoint), PAYLOAD), { status: 201 });
    assertEquals(await send(row(endpoint), PAYLOAD), { status: 201 });
    assertEquals(calls.length, 2);
    const h = new Headers(calls[0].init.headers);
    assertEquals(calls[0].url, endpoint);
    assertEquals(calls[0].init.method, "POST");
    assertEquals(h.get("content-encoding"), "aes128gcm");
    assertEquals(h.get("ttl"), String(PUSH_TTL_SECONDS));
    assertEquals(h.get("urgency"), "normal");
    assertEquals(h.get("topic"), "khznti-debt-reminder");
    assertEquals(h.get("content-length"), null); // left to fetch
    assert(calls[0].init.signal instanceof AbortSignal, "request has a timeout signal");
    await verifyVapid(h.get("authorization")!, endpoint, SUBJECT, vapid.publicKey);
    const d1 = await decrypt(new Uint8Array(calls[0].init.body as ArrayBuffer), ua.privateKey, uaPubRaw, authSecret);
    const d2 = await decrypt(new Uint8Array(calls[1].init.body as ArrayBuffer), ua.privateKey, uaPubRaw, authSecret);
    assertEquals(d1.text, PAYLOAD);
    assertEquals(d2.text, PAYLOAD);
    assert(d1.asPubRaw !== d2.asPubRaw, "fresh server ECDH key per message (RFC 8291)");
  });
}

Deno.test("status classification: 2xx accepted, 404/410 gone, 429/5xx retry", async () => {
  const expected: Record<number, string> = { 200: "accepted", 201: "accepted", 202: "accepted", 404: "gone", 410: "gone", 429: "retry", 500: "retry", 502: "retry", 503: "retry", 400: "retry", 403: "retry", 413: "retry" };
  for (const [status, kind] of Object.entries(expected)) {
    const { f } = capturingFetch(Number(status));
    const send = createPushSender({ webpush, publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: SUBJECT, fetchImpl: f });
    const r = await send(row(ENDPOINTS.fcm), PAYLOAD);
    assertEquals(r, { status: Number(status) });
    assertEquals(classifyPushResult(r), kind, status);
  }
  assertEquals(decideOutcome([{ status: 410 }, { status: 201 }]).delivered, true);
  assertEquals(decideOutcome([{ status: 410 }, { status: 503 }]).delivered, false);
});

Deno.test("network failure -> {error:'network'}; slow push service -> {error:'timeout'}; both retryable", async () => {
  const failing = (async () => { throw new TypeError("connection refused"); }) as unknown as typeof fetch;
  const send1 = createPushSender({ webpush, publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: SUBJECT, fetchImpl: failing });
  const r1 = await send1(row(ENDPOINTS.apple), PAYLOAD);
  assertEquals(r1, { error: "network" });
  const hanging = ((_u: string, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason)))) as unknown as typeof fetch;
  const send2 = createPushSender({ webpush, publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: SUBJECT, fetchImpl: hanging, timeoutMs: 50 });
  const r2 = await send2(row(ENDPOINTS.fcm), PAYLOAD);
  assertEquals(r2, { error: "timeout" });
  assertEquals([classifyPushResult(r1), classifyPushResult(r2)], ["retry", "retry"]);
});

Deno.test("endpoint not on the allowlist or malformed keys -> no network call at all", async () => {
  const { f, calls } = capturingFetch(201);
  const send = createPushSender({ webpush, publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: SUBJECT, fetchImpl: f });
  for (const bad of ["https://evil.example/push", "http://fcm.googleapis.com/fcm/send/x", "https://fcm.googleapis.com.evil.com/x", "https://fcm.googleapis.com@evil.com/x"]) {
    assertEquals(await send(row(bad), PAYLOAD), { error: "endpoint_not_allowed" });
    assertEquals(isAllowedEndpoint(bad), false);
  }
  assertEquals(await send({ ...row(ENDPOINTS.fcm), p256dh: "not-a-key" }, PAYLOAD), { error: "request_build_failed" });
  assertEquals(calls.length, 0);
  for (const ok of Object.values(ENDPOINTS)) assert(isAllowedEndpoint(ok), ok);
});
