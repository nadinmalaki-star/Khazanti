// analytics.js — تتبّع خفيف لقمع التسجيل (زيارة الصفحة الترحيبية ← بداية
// التسجيل ← حساب جديد) بجدول public.analytics_events.
//
// قواعد ثابتة:
// - بس الأحداث التلاتة المسموحة، وبس على دومين الإنتاج (localhost والـpreview
//   ما بيكتبوا أي شي بجدول الإنتاج).
// - "أرسل وانسى": ما في await، وأي فشل بينبلع — التتبّع عمره ما بيوقف أو
//   بيغيّر التسجيل أو التنقل.
// - ما في أي بيانات حساسة: لا إيميل ولا اسم ولا مبالغ ولا تفاصيل مالية، ولا
//   query string ولا hash من الرابط (روابط الاستعادة فيها توكنات).
// - user_id ما بنبعته: قاعدة البيانات بتعبّيه لحالها من auth.uid().
import { supabase } from "./supabase.js";

const ALLOWED_EVENTS = new Set(["site_page_view", "signup_start", "signup_complete"]);
const ONCE_PER_SESSION = new Set(["site_page_view", "signup_start"]);
const PRODUCTION_HOSTS = new Set(["www.khznti.app", "khznti.app"]);
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
const MAX_VALUE_LENGTH = 200;

const VISITOR_KEY = "khznti_visitor_id";
const SESSION_KEY = "khznti_session_id";
const ATTRIBUTION_KEY = "khznti_attribution";
const SENT_PREFIX = "khznti_analytics_sent_";

// بديل بالذاكرة لو التخزين مش متاح (تصفح خاص أو تخزين محظور).
const memoryStore = {};

function readStore(storeName, key) {
  try {
    const value = window[storeName].getItem(key);
    if (value !== null) return value;
  } catch {
    // التخزين مش متاح — منكمّل بالذاكرة
  }
  return memoryStore[storeName + ":" + key] ?? null;
}

function writeStore(storeName, key, value) {
  memoryStore[storeName + ":" + key] = value;
  try {
    window[storeName].setItem(key, value);
  } catch {
    // التخزين مش متاح — القيمة محفوظة بالذاكرة لهاي الجلسة
  }
}

function isTrackingEnabled() {
  try {
    const host = window.location.hostname;
    // ثابت وقت البناء (vite.config.js): null بكل بناء عادي، فما في طريقة
    // تشغّله وقت التشغيل. بس بناء اختبار محلي منفصل بيحدد مضيف إضافي.
    // eslint-disable-next-line no-undef
    const testHost = __KHZNTI_ANALYTICS_TEST_HOST__;
    return PRODUCTION_HOSTS.has(host) || (testHost !== null && host === testHost);
  } catch {
    return false;
  }
}

function randomId() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function getOrCreateId(storeName, key) {
  let id = readStore(storeName, key);
  if (!id) {
    id = randomId();
    writeStore(storeName, key, id);
  }
  return id;
}

function clip(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_VALUE_LENGTH) : null;
}

// مصدر الزيارة (UTM + أصل الـreferrer) بيتسجّل مرة وحدة بأول تحميل بالجلسة،
// ومنضيفه لكل الأحداث التلاتة — هيك بيضل محفوظ لحد ما يخلص التسجيل.
function getAttribution() {
  const stored = readStore("sessionStorage", ATTRIBUTION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // تخزين تالف — منعيد الحساب تحت
    }
  }
  const attribution = { referrer: null };
  try {
    const params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((key) => {
      attribution[key] = clip(params.get(key));
    });
    if (document.referrer) {
      const origin = new URL(document.referrer).origin;
      if (origin !== window.location.origin) attribution.referrer = clip(origin);
    }
  } catch {
    // رابط أو referrer غير صالح — منسجّل بدون مصدر
  }
  writeStore("sessionStorage", ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

if (isTrackingEnabled()) getAttribution();

export function track(eventName) {
  try {
    if (!ALLOWED_EVENTS.has(eventName) || !isTrackingEnabled()) return;
    if (ONCE_PER_SESSION.has(eventName)) {
      const sentKey = SENT_PREFIX + eventName;
      if (readStore("sessionStorage", sentKey)) return;
      writeStore("sessionStorage", sentKey, "1");
    }

    const attribution = getAttribution();
    const row = {
      event_name: eventName,
      visitor_id: getOrCreateId("localStorage", VISITOR_KEY),
      session_id: getOrCreateId("sessionStorage", SESSION_KEY),
      page_path: clip(window.location.pathname) || "/",
      referrer: attribution.referrer || null,
      utm_source: attribution.utm_source || null,
      utm_medium: attribution.utm_medium || null,
      utm_campaign: attribution.utm_campaign || null,
      utm_content: attribution.utm_content || null,
    };

    supabase
      .from("analytics_events")
      .insert(row)
      .then(
        () => {},
        () => {}
      );
  } catch {
    // التتبّع عمره ما بيرمي خطأ لجوا التطبيق
  }
}
