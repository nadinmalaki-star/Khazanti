// Smart Start (V1, الخطة المجانية) — حالة الجولة القصيرة لأول حركة حقيقية.
//
// مصدر الحقيقة: user_metadata.smart_start بحساب Supabase Auth (بيمشي مع
// المستخدم على كل الأجهزة، بدون أي جدول أو تغيير على قاعدة البيانات)،
// مع نسخة محلية بالـlocalStorage عشان الواجهة تتصرف فورًا وتضل صحيحة لو
// الكتابة على الحساب فشلت (بتنعاد مزامنتها بأول تحميل جاي).
//
// الشكل: { v: 1, status: "active"|"done"|"skipped"|"ended", exposures: 0..3, firstTxSaved: bool }
// - done: خلّص الجولة بأول حركة حقيقية من نموذج تسجيل العملية.
// - skipped: ضغط "تخطي الجولة".
// - ended: صار عنده حركات بطريق تاني قبل ما يكمّل — ما بتنعرض الجولة بعدها.
// - exposures: عدد الجلسات يلي انعرضت فيها الجولة (مرة وحدة بالجلسة، ٣ بالحد الأقصى).
import { supabase } from "./supabase.js";

// لحظة إطلاق Smart Start على الإنتاج (UTC، نص ISO) — بتنحدد بـvite.config.js
// قبل النشر مباشرة. null = الميزة مطفية بالكامل (ولا حدث تحليلات منها).
// eslint-disable-next-line no-undef
export const SMART_START_LAUNCH_AT = __KHZNTI_SMART_START_LAUNCH_AT__;
export const SMART_START_MAX_EXPOSURES = 3;

const META_KEY = "smart_start";
const LOCAL_PREFIX = "khznti_smart_start:";
const SESSION_PREFIX = "khznti_smart_start_seen:";
const STATUSES = ["active", "done", "skipped", "ended"];
// لو المصدرين مختلفين: الحالة النهائية بتغلب "active"، وبين النهائيات هاد الترتيب.
const FINAL_PRIORITY = ["done", "skipped", "ended"];

// الحساب انخلق بلحظة الإطلاق أو بعدها؟ المستخدمين الأقدم ما بتنعرضلهم الجولة أبدًا.
export function isSmartStartUser(createdAt) {
  if (!SMART_START_LAUNCH_AT || !createdAt) return false;
  const launch = Date.parse(SMART_START_LAUNCH_AT);
  const created = Date.parse(createdAt);
  return Number.isFinite(launch) && Number.isFinite(created) && created >= launch;
}

export function normalizeSmartStart(raw) {
  const state = raw && typeof raw === "object" ? raw : {};
  const exposures = Math.min(SMART_START_MAX_EXPOSURES, Math.max(0, Math.floor(Number(state.exposures) || 0)));
  return {
    status: STATUSES.includes(state.status) ? state.status : "active",
    exposures,
    firstTxSaved: state.firstTxSaved === true,
  };
}

export function mergeSmartStart(a, b) {
  const finals = FINAL_PRIORITY.filter((s) => s === a.status || s === b.status);
  return {
    status: finals[0] || "active",
    exposures: Math.max(a.exposures, b.exposures),
    firstTxSaved: a.firstTxSaved || b.firstTxSaved,
  };
}

export function sameSmartStart(a, b) {
  return a.status === b.status && a.exposures === b.exposures && a.firstTxSaved === b.firstTxSaved;
}

export function readMetadataSmartStart(user) {
  return normalizeSmartStart(user?.user_metadata?.[META_KEY]);
}

export function readLocalSmartStart(userId) {
  try {
    return normalizeSmartStart(JSON.parse(localStorage.getItem(LOCAL_PREFIX + userId) || "null"));
  } catch {
    return normalizeSmartStart(null);
  }
}

export function writeLocalSmartStart(userId, state) {
  try {
    localStorage.setItem(LOCAL_PREFIX + userId, JSON.stringify({ v: 1, ...state }));
  } catch {
    // التخزين مش متاح — بيضل user_metadata هو المرجع
  }
}

// "أرسل وانسى": فشل الكتابة ما بيوقف شي، والنسخة المحلية بترجع تتزامن بأول تحميل.
export function pushSmartStartToMetadata(state) {
  try {
    supabase.auth.updateUser({ data: { [META_KEY]: { v: 1, ...state } } }).then(() => {}, () => {});
  } catch {
    // ما منرمي أي خطأ لجوا التطبيق
  }
}

// حالة الجلسة الحالية بالمتصفح: null (لسا ما انعرضت)، "seen" (انحسبت عرض)،
// "started" (اختار إجراء سريع — ما بترجع تنعرض بهاي الجلسة).
export function readSessionPhase(userId) {
  try {
    return sessionStorage.getItem(SESSION_PREFIX + userId);
  } catch {
    return null;
  }
}

export function writeSessionPhase(userId, phase) {
  try {
    sessionStorage.setItem(SESSION_PREFIX + userId, phase);
  } catch {
    // بدون sessionStorage: الحالة بتضل بالذاكرة لحد ما تنسكّر الصفحة
  }
}

export function analyticsAccountType(accountType) {
  return accountType === "مشروع" ? "business" : accountType === "فرد" ? "individual" : null;
}
