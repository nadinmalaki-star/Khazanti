import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";
import './App.css';

// ------------------------------------------------------------------
// فئات موسّعة (١١ مصروف + ٤ دخل) — حسب ما اتفقنا عليه.
// ملاحظة: الحركات القديمة المسجّلة بفئات قديمة (مثلاً "طعام" بدل
// "طعام ومشروبات") رح تضل محفوظة وصحيحة بالرصيد الكلي، بس ممكن
// ما تنحسب صح جوا "الشارت التحليلي للفئات" لأن الاسم تغيّر شوي.
// ------------------------------------------------------------------
const CATEGORIES = [
  { key: "طعام ومشروبات", icon: "◆", type: "مصروف" },
  { key: "مواصلات ووقود", icon: "▲", type: "مصروف" },
  { key: "فواتير", icon: "■", type: "مصروف" },
  { key: "إيجار", icon: "▦", type: "مصروف" },
  { key: "صحة وأدوية", icon: "✚", type: "مصروف" },
  { key: "تعليم", icon: "✎", type: "مصروف" },
  { key: "تسوق وملابس", icon: "●", type: "مصروف" },
  { key: "مشتريات بضاعة", icon: "◈", type: "مصروف" },
  { key: "ترفيه وخروجات", icon: "♪", type: "مصروف" },
  { key: "صيانة وإصلاحات", icon: "⚙", type: "مصروف" },
  { key: "أخرى", icon: "✦", type: "مصروف" },
  { key: "راتب / أرباح", icon: "◇", type: "دخل" },
  { key: "مبيعات", icon: "○", type: "دخل" },
  { key: "عمولات", icon: "◎", type: "دخل" },
  { key: "دخل إضافي", icon: "✧", type: "دخل" },
];

// ألوان مخطط الفئات — متحقق منها بأداة تحقق النخالة اللونية (تباين
// كافٍ حتى لعمى الألوان)، مش مجرد درجات من نفس اللون الذهبي.
const CATEGORY_CHART_COLORS = ["#A8842E", "#1F9C87", "#B85F3F", "#4A6FB8", "#A14F6E"];

const CURRENCIES = {
  ILS: { symbol: "₪", name: "شيكل", rate: 1 },
  USD: { symbol: "$", name: "دولار", rate: 0.27 },
  JOD: { symbol: "د.أ", name: "دينار", rate: 0.19 },
};

// سعر تقريبي لتحويل كل عملة لشيكل — يُستخدم بس لعرض "مجموع تقريبي"
// موحّد بالخزائن متعددة العملات، وليس لتحويل أرصدة العملات الحقيقية
// (كل رصيد بيضل برقمه الحقيقي بعملته). لاحقًا ممكن يتحدث يوميًا من
// مصدر أسعار صرف حقيقي بدل الرقم الثابت هون.
const WALLET_CURRENCY_TO_ILS = { ILS: 1, USD: 3.70, JOD: 5.26 };

// تنسيق موحّد لأي مبلغ مالي معروض — فواصل الآلاف + خانتين عشريتين
// دايمًا (مثال: ٢٠٬٢٠٠٫٠٠)، بدون أي تغيير على الرقم الفعلي المخزّن.
function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const GOLD_RING = "#D4AF37";
const BEIGE_RING = "#f0e6d2";

const THEMES = {
  emerald: {
    name: "أخضر",
    swatchBg: "#0f2624",
    ring: GOLD_RING,
    isDefault: true,
    // بترول غامق فاخر (بدل الأخضر الفاتح) — نفس بنية الثيم بالضبط،
    // بس درجات أغمق وأميل للتركواز، متل ما طلبت بالمرجع.
    bg: "radial-gradient(1000px 600px at 50% -10%, #123230 0%, #081615 55%)",
    cardBg: "linear-gradient(135deg, #0d211f, #081615)",
    boxBg: "#081615",
    border: "#16302d",
    accent: "#c9a961",
    text: "#f2ede2",
  },
  navy: {
    name: "أزرق",
    swatchBg: "#1a2536",
    ring: GOLD_RING,
    bg: "radial-gradient(1000px 600px at 50% -10%, #1a2536 0%, #0e141a 55%)",
    cardBg: "linear-gradient(135deg, #1e2d42, #162030)",
    boxBg: "#162030",
    border: "#2a3b52",
    accent: "#60a5fa",
    text: "#f0f4f8",
  },
  gold: {
    name: "ذهبي",
    swatchBg: "#302616",
    ring: BEIGE_RING,
    bg: "radial-gradient(1000px 600px at 50% -10%, #302616 0%, #1a150e 55%)",
    cardBg: "linear-gradient(135deg, #392f1b, #302616)",
    boxBg: "#302616",
    border: "#4d4027",
    accent: "#fbbf24",
    text: "#fef3c7",
  },
  beige: {
    name: "بيج",
    swatchBg: "#f0e6d2",
    ring: GOLD_RING,
    bg: "radial-gradient(1000px 600px at 50% -10%, #f0e6d2 0%, #e8dcc0 55%)",
    cardBg: "linear-gradient(135deg, #f7f0e0, #f0e6d2)",
    boxBg: "#e8dcc0",
    border: "#d9c48f",
    accent: "#b8860b",
    text: "#241a0d",
  },
  purple: {
    name: "بنفسجي",
    swatchBg: "#241732",
    ring: GOLD_RING,
    bg: "radial-gradient(1000px 600px at 50% -10%, #241732 0%, #170f21 55%)",
    cardBg: "linear-gradient(135deg, #2e1f3d, #241732)",
    boxBg: "#2e1f3d",
    border: "#5a4370",
    accent: "#d4af37",
    text: "#f3e8ff",
  },
};

// معلومات التواصل — بدّلي القيمة هون بإيميلك الحقيقي بضغطة واحدة
const CONTACT_EMAIL = "khzntiapp@gmail.com";

const REMEMBER_EMAIL_KEY = "khznti_remembered_email";

// ترجمة رسائل الأخطاء الشائعة من Supabase للعربي (تضل بالإنجليزي لو
// الرسالة مش موجودة بالقائمة، لأنه ما فينا نترجم كل الحالات الممكنة).
const AUTH_ERROR_TRANSLATIONS = {
  "Password should be at least 6 characters.": "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
  "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "User already registered": "هذا البريد الإلكتروني مسجّل مسبقاً.",
  "Email not confirmed": "يجب تأكيد بريدك الإلكتروني أولاً، تحقق-ي من صندوق الوارد.",
  "Unable to validate email address: invalid format": "صيغة البريد الإلكتروني غير صحيحة.",
  "email rate limit exceeded": "تم إرسال عدد كبير من الرسائل خلال وقت قصير. الرجاء المحاولة لاحقاً بعد شوي.",
};
function translateAuthError(message) {
  if (!message) return "حدث خطأ غير متوقع.";
  if (AUTH_ERROR_TRANSLATIONS[message]) return AUTH_ERROR_TRANSLATIONS[message];
  // Supabase بيرجع رسالة الحد الزمني (rate limit) بصيغ مختلفة فيها رقم
  // ثواني متغيّر، فما فيها تنترجم بمطابقة تامة متل باقي الرسائل بالأعلى.
  if (/security purposes|only request this/i.test(message)) {
    return "الرجاء الانتظار قليلاً قبل إعادة إرسال رسالة التأكيد.";
  }
  return message;
}

// ------------------------------------------------------------------
// قوائم منسدلة مخصصة لليوم/الشهر/السنة، بدل خانة <input type="date">
// الأصلية — لأنه هالخانة بتتصرف بشكل غير متوقع وغير متناسق بصريًا
// على متصفح آيفون تحديدًا، وما فيه CSS بيحل المشكلة من جذورها.
// ------------------------------------------------------------------
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const CURRENT_YEAR_FOR_PICKER = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR_FOR_PICKER - 2 + i);

function parseDateParts(dateStr) {
  if (!dateStr) return { day: "", month: "", year: "" };
  const [y, m, d] = dateStr.split("-");
  return { day: d ? String(Number(d)) : "", month: m ? String(Number(m)) : "", year: y || "" };
}
function buildDateStr(day, month, year) {
  if (!day || !month || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

// حساب مشترك لمجموعة حركات محصورة بفترة معيّنة (شهر أو سنة) — بيرجع
// تغيّر الرصيد وأكتر فئة مصروف. مستخدمة من computeMonthReport
// وcomputeYearReport عشان ما يتكرر نفس المنطق.
function computeReportForTx(periodTx) {
  // كل حركة لازم تتحوّل لشيكل بسعر عملتها هي (t.currency)، مش برقم واحد
  // ثابت لكل الحركات — وإلا مبلغ بعملة تانية (دولار/دينار) بينجمع كأنه
  // نفس رقم الشيكل بدون أي تحويل (مثلًا ₪50 + $25 يظهر ₪75 غلط).
  const toILS = (t) => WALLET_CURRENCY_TO_ILS[t.currency] || 1;

  const balanceChange = periodTx.reduce((sum, t) => {
    const amt = Number(t.amount) * toILS(t);
    if (t.type === "دخل" || t.type === "مبيعات") return sum + amt;
    if (t.type === "مصروف" || t.type === "شراء") return sum - amt;
    return sum;
  }, 0);

  const expensesByCategory = {};
  let totalExpenses = 0;
  periodTx.forEach((t) => {
    if (t.type === "مصروف" || t.type === "شراء") {
      const amt = Number(t.amount) * toILS(t);
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amt;
      totalExpenses += amt;
    }
  });

  let topCategory = null;
  const topKey = Object.keys(expensesByCategory).sort((a, b) => expensesByCategory[b] - expensesByCategory[a])[0];
  if (topKey) {
    const catObj = CATEGORIES.find((c) => c.key === topKey);
    topCategory = {
      key: topKey,
      icon: catObj ? catObj.icon : "✦",
      amount: expensesByCategory[topKey],
      percentage: totalExpenses > 0 ? (expensesByCategory[topKey] / totalExpenses) * 100 : 0,
    };
  }

  return { balanceChange, topCategory };
}

// تقرير مالي لشهر محدد (سنة + رقم شهر صفري-الأساس) — دالة نقية بتاخد
// الحركات وسعر الصرف كوسائط عشان تنعمل تختبر لحالها. بترجع null لو ما
// في ولا حركة بهداك الشهر بالذات.
function computeMonthReport(txList, year, monthIndex) {
  const monthTx = txList.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });
  if (monthTx.length === 0) return null;
  return { monthName: ARABIC_MONTHS[monthIndex], ...computeReportForTx(monthTx) };
}

// تقرير مالي لسنة محددة — نفس فكرة computeMonthReport بس محصور بسنة
// كاملة مش شهر. بترجع null لو ما في ولا حركة بهديك السنة.
function computeYearReport(txList, year) {
  const yearTx = txList.filter((t) => new Date(t.date).getFullYear() === year);
  if (yearTx.length === 0) return null;
  return { year, ...computeReportForTx(yearTx) };
}

// تقرير أرباح وخسائر لحساب "مشروع" — مبني بالكامل على الحركات الفعلية
// (مش أرقام ثابتة)، بيحوّل كل عملية لعملتها الحقيقية لشيكل عشان يجمعهم
// كلهم برقم واحد. مستقل تمامًا عن computeReportForTx (الفرد) — ما بأثر
// عليه ولا بيتأثر فيه.
// إشارة أثر الحركة على كمية المخزون — بيع بينقص (-1)، شراء بضاعة بيزيد
// (+1)، أي شي تاني بلا أثر (0). مستخدمة وقت تعديل حركة عشان نعرف نعكس
// أثرها القديم ونطبّق أثرها الجديد بالاتجاه الصحيح.
function stockSign(t) {
  if (!t) return 0;
  if ((t.type === "دخل" || t.type === "مبيعات") && t.category === "مبيعات") return -1;
  if ((t.type === "مصروف" || t.type === "شراء") && t.category === "مشتريات بضاعة") return 1;
  return 0;
}

function computeBizReport(periodTx, excludedTxIds) {
  let revenue = 0, cogs = 0, fixedExpenses = 0, variableExpenses = 0, otherIncome = 0;
  periodTx.forEach((t) => {
    // حركات تسديد/تحصيل دين إله حركة أصلية معروفة (مش الحركة الأصلية
    // نفسها) — الدخل/المصروف الحقيقي انسجل أصلًا وقت الحركة الأصلية
    // (البيع أو الشراء الآجل)، فتسديدها لاحقًا مجرد تغيّر بمكان الفلوس
    // (مستحق → كاش)، مش دخل أو مصروف جديد. استثناؤها هون بيمنع احتساب
    // نفس المبلغ مرتين.
    if (excludedTxIds && excludedTxIds.has(t.id)) return;
    const toILS = WALLET_CURRENCY_TO_ILS[t.currency] || 1;
    const amt = Number(t.amount) * toILS;
    if (t.type === "دخل" || t.type === "مبيعات") {
      if (t.category === "مبيعات") {
        revenue += amt;
        cogs += (Number(t.cost_price) || 0) * toILS;
      } else {
        otherIncome += amt;
      }
    } else if (t.type === "مصروف" || t.type === "شراء") {
      // "مشتريات بضاعة" (شراء مخزون) لا تُحسب Operating Expense هون —
      // تكلفتها الفعلية بتنحسب فقط عبر COGS وقت البيع (cost_price فوق)،
      // عشان ما تنحسب مرتين (مرة وقت الشراء الكامل، ومرة وقت البيع الجزئي).
      // الحركة نفسها تضل موجودة بسجل العمليات وبرصيد الكاش/البنك، بس
      // مستثناة من حساب المصروف التشغيلي/نقطة التعادل تحديدًا.
      if (t.category === "مشتريات بضاعة") return;
      if (t.expense_type === "ثابت") fixedExpenses += amt;
      else variableExpenses += amt; // غير المصنّف بيتحسب متغيّر افتراضيًا
    }
  });
  const netProfit = revenue - cogs + otherIncome - fixedExpenses - variableExpenses;
  const contributionMargin = revenue > 0 ? (revenue - cogs - variableExpenses) / revenue : 0;
  const breakEven = contributionMargin > 0 ? fixedExpenses / contributionMargin : null;
  return { revenue, cogs, fixedExpenses, variableExpenses, otherIncome, netProfit, breakEven, contributionMargin };
}

// ربح حسب رقم الفاتورة/المرجع — بيجمع كل عمليات الدخل والمصروف يلي
// حاملة نفس invoice_number ويحسب صافي ربح تلك الطلبية تحديدًا.
function computeJobProfits(periodTx) {
  const byInvoice = {};
  periodTx.forEach((t) => {
    if (!t.invoice_number) return;
    const toILS = WALLET_CURRENCY_TO_ILS[t.currency] || 1;
    const amt = Number(t.amount) * toILS;
    if (!byInvoice[t.invoice_number]) byInvoice[t.invoice_number] = { invoice: t.invoice_number, revenue: 0, costs: 0, lines: [] };
    if (t.type === "دخل" || t.type === "مبيعات") byInvoice[t.invoice_number].revenue += amt;
    else if (t.type === "مصروف" || t.type === "شراء") byInvoice[t.invoice_number].costs += amt;
    byInvoice[t.invoice_number].lines.push(t);
  });
  return Object.values(byInvoice).map((j) => ({ ...j, profit: j.revenue - j.costs }));
}

// مكوّن قابل لإعادة الاستخدام لاختيار تاريخ عبر ٣ قوائم منسدلة
function DatePickerSelects({ value, onChange, theme }) {
  const parts = parseDateParts(value);
  const maxDay = daysInMonth(parts.month, parts.year);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  const selectStyle = {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontSize: 12,
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select
        value={parts.day}
        onChange={(e) => onChange(buildDateStr(e.target.value, parts.month || "1", parts.year || String(CURRENT_YEAR_FOR_PICKER)))}
        style={selectStyle}
      >
        <option value="">يوم</option>
        {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select
        value={parts.month}
        onChange={(e) => onChange(buildDateStr(parts.day || "1", e.target.value, parts.year || String(CURRENT_YEAR_FOR_PICKER)))}
        style={{ ...selectStyle, flex: 1.4 }}
      >
        <option value="">شهر</option>
        {ARABIC_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select
        value={parts.year}
        onChange={(e) => onChange(buildDateStr(parts.day || "1", parts.month || "1", e.target.value))}
        style={selectStyle}
      >
        <option value="">سنة</option>
        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

function Icon({ name, size = 16, color }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color || "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "wallet":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <circle cx="17" cy="14" r="1" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "exchange":
      return (
        <svg {...common}>
          <path d="M4 4v5h5" />
          <path d="M20 20v-5h-5" />
          <path d="M4.5 9a8 8 0 0 1 14-4.7L20 9" />
          <path d="M19.5 15a8 8 0 0 1-14 4.7L4 15" />
        </svg>
      );
    case "bank":
      return (
        <svg {...common}>
          <polyline points="3,10 12,4 21,10" />
          <line x1="4" y1="10" x2="20" y2="10" />
          <line x1="4" y1="20" x2="20" y2="20" />
          <line x1="6" y1="10" x2="6" y2="18" />
          <line x1="10" y1="10" x2="10" y2="18" />
          <line x1="14" y1="10" x2="14" y2="18" />
          <line x1="18" y1="10" x2="18" y2="18" />
        </svg>
      );
    case "vault":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="12" cy="12" r="3.2" />
          <line x1="12" y1="12" x2="12" y2="9.3" />
        </svg>
      );
    case "scale":
      return (
        <svg {...common}>
          <line x1="12" y1="3" x2="12" y2="19" />
          <line x1="5" y1="7" x2="19" y2="7" />
          <polyline points="3,13 5,7 7,13" />
          <polyline points="17,13 19,7 21,13" />
          <line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <line x1="4" y1="20" x2="4" y2="12" />
          <line x1="10" y1="20" x2="10" y2="6" />
          <line x1="16" y1="20" x2="16" y2="15" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <line x1="12" y1="3" x2="12" y2="14" />
          <polyline points="7,10 12,15 17,10" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <line x1="9" y1="4" x2="15" y2="4" />
          <line x1="4" y1="7" x2="20" y2="7" />
          <rect x="6" y="7" width="12" height="13" rx="1" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <polyline points="3,7 12,13 21,7" />
        </svg>
      );
    case "report":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="13" y2="16" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <polygon points="12,3 21,8 21,16 12,21 3,16 3,8" />
          <line x1="12" y1="12" x2="21" y2="8" />
          <line x1="12" y1="12" x2="3" y2="8" />
          <line x1="12" y1="12" x2="12" y2="21" />
        </svg>
      );
    default:
      return null;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  // null = لسا ما تحقّقنا من الجلسة؛ "" = مسجّل دخول بس ما اختار نوع
  // حساب بعد (فرد/مشروع)؛ أي قيمة تانية = النوع المختار فعليًا.
  const [accountType, setAccountType] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState(null); // { type: "success" | "error", text }

  // حساب جديد اتسجّل لكن بريده الإلكتروني لسا مش مؤكَّد (Confirm email مفعّل
  // بمشروع Supabase هاد) — ما فيها تسجّل دخول لحتى تأكّد-ي البريد.
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [resendStatus, setResendStatus] = useState(null); // { type: "success" | "error", text }
  const [resendLoading, setResendLoading] = useState(false);

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [updatePasswordError, setUpdatePasswordError] = useState("");
  const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // حقول المخزون — كلها اختيارية وحصرية لحساب "مشروع".
  const [invOn, setInvOn] = useState(false);
  const [showInvAddForm, setShowInvAddForm] = useState(false);
  const [invName, setInvName] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invCost, setInvCost] = useState("");
  const [invSupplier, setInvSupplier] = useState("");
  const [invPaymentMode, setInvPaymentMode] = useState("cash"); // "cash" | "credit" | "opening"
  const [invAccountType, setInvAccountType] = useState("cash"); // "cash" | "bank"
  const [invCurrency, setInvCurrency] = useState("ILS");
  const [showInvAdjustForm, setShowInvAdjustForm] = useState(false);
  const [invAdjustProduct, setInvAdjustProduct] = useState("");
  const [invAdjustQty, setInvAdjustQty] = useState("");
  const [invAdjustReason, setInvAdjustReason] = useState("");
  const [showInvReturnForm, setShowInvReturnForm] = useState(false);
  const [invReturnTxId, setInvReturnTxId] = useState("");
  const [invReturnQty, setInvReturnQty] = useState("");
  const [invMessage, setInvMessage] = useState("");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("طعام ومشروبات");
  // زرين "دخل/مصروف" اختياريين لفلترة قائمة الفئة — إضافة فوق آلية
  // اختيار الفئة الحالية، ما بتلغيها. النوع الفعلي للعملية بيضل
  // ينحدد من الفئة المختارة نفسها زي ما كان دايمًا (catObj.type).
  const [entryType, setEntryType] = useState("مصروف");
  const [note, setNote] = useState("");
  const [txCurrency, setTxCurrency] = useState("ILS");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferCurrency, setTransferCurrency] = useState("ILS");
  const [transferDirection, setTransferDirection] = useState("toBank"); // "toBank" | "toCash"
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");

  // رصيد افتتاحي (كاش/بنك) — نقطة بداية لمشروع/حساب قائم مسبقًا، مش دخل
  // ومش مصروف، فما بتدخل P&L ولا نقطة التعادل إطلاقًا.
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingAccountType, setOpeningAccountType] = useState("cash"); // "cash" | "bank"
  const [openingCurrency, setOpeningCurrency] = useState("ILS");
  const [openingSaving, setOpeningSaving] = useState(false);
  const [openingMessage, setOpeningMessage] = useState("");

  // حقول خاصة بحساب "مشروع" بس — مبيعات قطعة قطعة وتفاصيل إضافية.
  const [saleQty, setSaleQty] = useState("1");
  const [saleUnitPrice, setSaleUnitPrice] = useState("");
  const [saleUnitCost, setSaleUnitCost] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseUnitCost, setPurchaseUnitCost] = useState("");
  const [expenseType, setExpenseType] = useState("متغير"); // "ثابت" | "متغير"
  const [showBizExtra, setShowBizExtra] = useState(false);
  const [productName, setProductName] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isCreditTx, setIsCreditTx] = useState(false); // بيع/شراء آجل
  const [reportPeriod, setReportPeriod] = useState("month"); // "month" | "year"
  const [selectedAccount, setSelectedAccount] = useState("الصندوق (كاش)");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("الكل"); // "الكل" | "دخل" | "مصروف" | "هالشهر"
  // عرض عملة واحدة ثابتة (شيكل) بعد إزالة مبدّل عملة العرض القديم —
  // الأرصدة الحقيقية المتعددة العملات صارت بتبويب "الخزائن" بدلها.
  const currency = "ILS";
  const [themeKey, setThemeKey] = useState("emerald");
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [seenDebtIds, setSeenDebtIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("khznti_seen_debt_ids") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [deleteDataError, setDeleteDataError] = useState("");
  const [deletingData, setDeletingData] = useState(false);

  const [deletedItem, setDeletedItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtType, setDebtType] = useState("دين له");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtCurrency, setDebtCurrency] = useState("ILS");
  const [savingDebt, setSavingDebt] = useState(false);

  const [settlingDebt, setSettlingDebt] = useState(null);
  const [settleModalMode, setSettleModalMode] = useState("choose"); // "choose" | "settle" | "postpone"
  const [settleAccount, setSettleAccount] = useState("الصندوق (كاش)");
  const [settleAmount, setSettleAmount] = useState("");
  const [postponeDate, setPostponeDate] = useState("");
  const [settlingInProgress, setSettlingInProgress] = useState(false);
  const [postponingInProgress, setPostponingInProgress] = useState(false);
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  const [expandedDebtId, setExpandedDebtId] = useState(null); // كشف حساب — الدين المفتوح حاليًا
  const [notifyPermission, setNotifyPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const currentTheme = THEMES[themeKey];

  // تذكر الإيميل — تعبئة تلقائية من آخر مرة (بدون كلمة المرور إطلاقًا)
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // متابعة حالة الاتصال بالإنترنت — عشان نعرض تنبيه واضح بدل ما تفشل
  // العمليات بصمت أو تظهر رسالة خطأ غلط (متل "سجّلي دخول" لمستخدمة
  // مسجّلة أصلًا بس بدون نت).
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // زر "تثبيت التطبيق" — كروم/أندرويد وسطح المكتب بيدعموا الحدث هاد
  // تلقائيًا. آيفون/سفاري ما فيه هيك حدث إطلاقًا، فبنعرض تلميح يدوي بدالو.
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isIos && !isStandalone) setShowIosInstallHint(true);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  useEffect(() => {
    // نوع الحساب (فرد/مشروع) بيتسأل أول مرة بس — بعدها بيتذكّره من هالجهاز
    // (localStorage) وبيفتح عليه مباشرة بأي تحميل/تسجيل دخول لاحق، بدل ما
    // يعيد يسأل من جديد كل مرة. التبديل يضل متاح أي وقت من الزر فوق —
    // هاد بس بيتحكم بأي نوع يفتح عليه افتراضيًا.
    const rememberedType = localStorage.getItem("khznti_account_type") || "";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user?.email || "");
        setAccountType(rememberedType);
        fetchData();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // رابط "نسيت كلمة المرور" بيسجّل دخول تلقائي (recovery session) —
      // لازم نعترضه ونعرض فورم "كلمة مرور جديدة" بدل ما نودّيها مباشرة
      // للوحة التحكم بدون ما تغيّر شي فعليًا.
      if (_event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setLoading(false);
        return;
      }

      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user?.email || "");
        // بس تسجيل دخول جديد فعلي (SIGNED_IN) بيفتح على آخر نوع محفوظ —
        // تحديث التوكن التلقائي بالخلفية (TOKEN_REFRESHED) ما لازم يقاطع
        // المستخدم بمنتصف جلسة شغالة أصلًا.
        if (_event === "SIGNED_IN") setAccountType(localStorage.getItem("khznti_account_type") || "");
        fetchData();
      } else {
        setIsLoggedIn(false);
        setUserEmail("");
        setAccountType(null);
        setTransactions([]);
        setDebts([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // حفظ آخر نوع حساب مختار محليًا (لهاد الجهاز) — عشان الجلسة الجاية
  // تفتح عليه مباشرة بدل ما تسأل من جديد. ما منحفظ "" (لسا ما اخترتي).
  useEffect(() => {
    if (accountType) localStorage.setItem("khznti_account_type", accountType);
  }, [accountType]);

  const exchangeRate = CURRENCIES[currency].rate;
  const currencySymbol = CURRENCIES[currency].symbol;

  // مبيعات قطعة قطعة (كمية × سعر) بتنطبق بس على حساب "مشروع"، فئة
  // "مبيعات"، وقت تسجيل عملية دخل.
  const isBizSale = accountType === "مشروع" && entryType === "دخل" && category === "مبيعات";
  // شراء بضاعة بكمية × تكلفة (نفس فكرة isBizSale بالضبط، بس بالاتجاه
  // المعاكس) — لازم عشان تعديل حركة شراء يقدر يعكس/يطبّق أثر المخزون
  // الصحيح، تمامًا متل ما بيصير بتعديل حركة بيع.
  const isBizPurchase = accountType === "مشروع" && entryType === "مصروف" && category === "مشتريات بضاعة";

  // فصل حقيقي على مستوى البيانات — كل حساب/تقرير/قائمة عرض لازم يقرأ من
  // هاي النسخ المفلترة (scoped) بدل transactions/debts/products الخام.
  // الخام تضل تُستخدم بس بعمليات fetch/insert/update/delete نفسها.
  // الحركات القديمة (قبل ما عمود account_type يُضاف) قيمتها الافتراضية
  // 'فرد' بقاعدة البيانات، فبتضل تُحسب متل ما كانت دايمًا.
  const scopedTransactions = useMemo(
    () => transactions.filter((t) => (t.account_type || "فرد") === accountType),
    [transactions, accountType]
  );
  const scopedDebts = useMemo(
    () => debts.filter((d) => (d.account_type || "فرد") === accountType),
    [debts, accountType]
  );
  const scopedProducts = useMemo(
    () => products.filter((p) => (p.account_type || "مشروع") === accountType),
    [products, accountType]
  );

  // "تفعيل تتبع المخزون" (invOn) كانت حالة عرض مؤقتة بترجع OFF تلقائيًا
  // بكل إعادة تحميل للصفحة — حتى لو عندك منتجات فعلية مسجّلة أصلًا. هاي
  // كانت السبب الحقيقي وراء "تعديل الشراء ما بيحدّث الكمية/التكلفة":
  // لائحة اختيار المنتج بنموذج الإضافة/التعديل كانت مربوطة بنفس الفلاغ
  // فبتختفي بعد أي reload، فالتعديل ما كان يقدر يوصل للمنتج المرتبط.
  // invActive قيمة محسوبة وقت الرندر (مش effect) بتعتبر التتبع "شغّال"
  // تلقائيًا لو في أي منتج حقيقي مسجّل، بغض النظر عن حالة المفتاح
  // اليدوي — عشان الواجهة تعكس البيانات الفعلية مش حالة عرض عشوائية.
  const invActive = invOn || scopedProducts.length > 0;

  // ملاحظة: cashBalance/bankBalance/totalBalance (رقم واحد يجمع كل
  // العملات مباشرة بدون تحويل) انشالت من هون — كانت بتجمع مبالغ حركات
  // بعملات مختلفة مع بعض بشكل غلط (مثلاً ₪50 + $25 = "₪75"). كل عرض
  // الرصيد صار يعتمد على walletBalances (فصل حقيقي حسب العملة، موجود
  // أصلًا وصحيح) بدل ما نضيف تحويل تقديري جديد.

  // أرصدة حقيقية لكل عملة على حدة (بدون أي تحويل) — إضافة جديدة فوق
  // cashBalance/bankBalance الموجودة، ما بتلغيها ولا بتأثر عليها.
  // العمليات القديمة كلها currency = 'ILS' (القيمة الافتراضية بقاعدة
  // البيانات)، فبتضل تُحسب بالشيكل بالضبط متل ما كانت.
  const walletBalances = useMemo(() => {
    const result = {
      ILS: { cash: 0, bank: 0 },
      USD: { cash: 0, bank: 0 },
      JOD: { cash: 0, bank: 0 },
    };
    scopedTransactions.forEach((t) => {
      // عمليات "مستحق (آجل)" (بيع/شراء آجل) ما بتأثر على أي رصيد كاش أو
      // بنك حقيقي لحد ما تنسدّد فعليًا — نفس منطق cashBalance/bankBalance
      // الموجودة أصلًا يلي بتتجاهل أي قيمة account غير معروفة لها.
      if (t.account !== "الصندوق (كاش)" && t.account !== "حساب البنك" && t.account) return;
      const code = result[t.currency] ? t.currency : "ILS";
      const accountKey = t.account === "حساب البنك" ? "bank" : "cash";
      if (t.type === "دخل" || t.type === "مبيعات") result[code][accountKey] += Number(t.amount);
      else if (t.type === "مصروف" || t.type === "شراء") result[code][accountKey] -= Number(t.amount);
      else if (t.type === "تحويل" || t.type === "رصيد افتتاحي") result[code][accountKey] += Number(t.amount); // موجب أو سالب حسب اتجاه التحويل
    });
    return result;
  }, [scopedTransactions]);

  const walletTotalInILS = useMemo(() =>
    Object.keys(walletBalances).reduce((sum, code) =>
      sum + (walletBalances[code].cash + walletBalances[code].bank) * WALLET_CURRENCY_TO_ILS[code], 0),
    [walletBalances]
  );

  // اتجاه الرصيد آخر أيام (Sparkline) — بيظهر بس لو في بيانات كافية
  const trendPoints = useMemo(() => {
    if (scopedTransactions.length < 2) return null;
    const byDate = {};
    scopedTransactions.forEach((t) => {
      const signedAmt = (t.type === "دخل" || t.type === "مبيعات") ? Number(t.amount) : -Number(t.amount);
      byDate[t.date] = (byDate[t.date] || 0) + signedAmt;
    });
    const dates = Object.keys(byDate).sort();
    if (dates.length < 2) return null;
    let running = 0;
    const cumulative = dates.map((d) => { running += byDate[d]; return running; });
    const last = cumulative.slice(-7);
    const min = Math.min(...last);
    const max = Math.max(...last);
    const range = max - min || 1;
    return last.map((v, i) => ({
      x: (i / ((last.length - 1) || 1)) * 100,
      y: 30 - ((v - min) / range) * 26,
      raw: v,
    }));
  }, [scopedTransactions]);

  const trendUp = trendPoints && trendPoints.length > 1
    ? trendPoints[trendPoints.length - 1].raw >= trendPoints[0].raw
    : null;

  // الديون القريبة أو المتأخرة (لعرض شارة التذكير)
  const upcomingDebts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scopedDebts
      .filter((d) => d.due_date && !d.paid)
      .map((d) => {
        const due = new Date(d.due_date);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
        return { ...d, diffDays };
      })
      .filter((d) => d.diffDays <= 3)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [scopedDebts]);

  // عدد الإشعارات غير المقروءة لجرس الإشعارات — الديون القريبة/المتأخرة
  // يلي لسا ما انفتح جرس الإشعارات من بعد ما ظهرت (معرّفة بـid محفوظ
  // بالـlocalStorage). بمجرد ما تنفتح اللوحة، الكل بيصير مقروء.
  const unreadDebtIds = useMemo(
    () => upcomingDebts.filter((d) => !seenDebtIds.has(d.id)),
    [upcomingDebts, seenDebtIds]
  );

  const openNotifPanel = () => {
    setShowNotifPanel((v) => !v);
    if (upcomingDebts.length > 0) {
      const merged = new Set(seenDebtIds);
      upcomingDebts.forEach((d) => merged.add(d.id));
      setSeenDebtIds(merged);
      localStorage.setItem("khznti_seen_debt_ids", JSON.stringify([...merged]));
    }
  };

  // إشعار متصفح (لما يكون التاب مفتوح أو التطبيق مثبّت) لأول دين مستحق
  // اليوم أو متأخر — مرة وحدة باليوم لكل دين، عشان ما نكرر نفس الإشعار.
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (upcomingDebts.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const notifiedKey = "khznti_notified_debts";
    const alreadyNotified = JSON.parse(localStorage.getItem(notifiedKey) || "{}");

    upcomingDebts
      .filter((d) => d.diffDays <= 0)
      .forEach((d) => {
        const dedupeKey = `${d.id}_${todayStr}`;
        if (alreadyNotified[dedupeKey]) return;
        const notification = new Notification("خزنتي — دين مستحق", {
          body: `دين "${d.name}" (${CURRENCIES[d.currency || "ILS"].symbol} ${((d.currency || "ILS") === "ILS" ? Number(d.amount) * exchangeRate : Number(d.amount)).toFixed(2)}) ${d.diffDays < 0 ? "متأخر" : "مستحق اليوم"}. اضغط-ي لتحصيله/تسديده أو لتأجيله.`,
          icon: "/icon.png",
        });
        notification.onclick = () => {
          window.focus();
          setActiveTab("debts");
          openSettleModal(d);
        };
        alreadyNotified[dedupeKey] = true;
      });

    localStorage.setItem(notifiedKey, JSON.stringify(alreadyNotified));
  }, [upcomingDebts]);

  // مخطط المصاريف حسب الفئة — مرتب تنازليًا، بيستبعد الفئات الصفرية.
  // محصور بحركات الشهر الحالي فقط (كان قبل هيك بيحسب كل الحركات من الأول
  // بالغلط بينما العنوان كان كاتب "هذا الشهر" — تصحيح حقيقي بالسلوك مش
  // بس بالتسمية).
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const thisMonthTx = scopedTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    const allExpensesTotal = thisMonthTx
      .filter((t) => t.type === "مصروف" || t.type === "شراء")
      .reduce((sum, t) => sum + Number(t.amount), 0) * exchangeRate;

    return CATEGORIES.filter((c) => c.type === "مصروف")
      .map((cat) => {
        const catTotal = thisMonthTx
          .filter((t) => t.category === cat.key)
          .reduce((sum, t) => sum + Number(t.amount), 0) * exchangeRate;
        const percentage = allExpensesTotal > 0 ? (catTotal / allExpensesTotal) * 100 : 0;
        return { ...cat, catTotal, percentage };
      })
      .filter((c) => c.catTotal > 0)
      .sort((a, b) => b.catTotal - a.catTotal);
  }, [scopedTransactions, exchangeRate]);

  // شرائح مخطط الفئات الدائري — أعلى ٤ فئات + شريحة "الباقي" لو في أكتر،
  // عشان الألوان تضل متمايزة (مش لون لكل فئة من ١١ فئة ممكنة).
  const categoryDonut = useMemo(() => {
    const top = categoryBreakdown.slice(0, 4);
    const rest = categoryBreakdown.slice(4);
    const slices = [...top];
    if (rest.length > 0) {
      slices.push({
        key: "الباقي",
        icon: "✦",
        catTotal: rest.reduce((sum, c) => sum + c.catTotal, 0),
        percentage: rest.reduce((sum, c) => sum + c.percentage, 0),
      });
    }
    let cumulative = 0;
    return slices.map((s, i) => {
      const start = cumulative;
      cumulative += s.percentage * 3.6;
      return { ...s, color: CATEGORY_CHART_COLORS[i], start, end: cumulative };
    });
  }, [categoryBreakdown]);

  // مخطط الدخل والمصروف — آخر ٤ أشهر (بما فيها الشهر الحالي)، بالشيكل،
  // مع ارتفاع أعمدة نسبي (بيكسل) محسوب من أعلى قيمة بينهم عشان الأعمدة
  // تضل متناسبة مع بعض بصريًا.
  const monthlyBarChart = useMemo(() => {
    const now = new Date();
    const barMaxHeight = 62;
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: ARABIC_MONTHS[d.getMonth()] });
    }
    const totals = months.map(({ year, month, label }) => {
      const monthTx = scopedTransactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const income = monthTx
        .filter((t) => t.type === "دخل" || t.type === "مبيعات")
        .reduce((sum, t) => sum + Number(t.amount), 0) * exchangeRate;
      const expense = monthTx
        .filter((t) => t.type === "مصروف" || t.type === "شراء")
        .reduce((sum, t) => sum + Number(t.amount), 0) * exchangeRate;
      return { label, income, expense };
    });
    const max = Math.max(1, ...totals.map((m) => Math.max(m.income, m.expense)));
    return {
      bars: totals.map((m) => ({
        ...m,
        incomeH: Math.max(m.income > 0 ? 2 : 0, Math.round((m.income / max) * barMaxHeight)),
        expenseH: Math.max(m.expense > 0 ? 2 : 0, Math.round((m.expense / max) * barMaxHeight)),
      })),
      maxLabel: fmt(max),
      midLabel: fmt(max / 2),
    };
  }, [scopedTransactions, exchangeRate]);

  // تقرير الشهر لتبويب "تقارير" — التقرير الرئيسي (main) هو آخر شهر كامل
  // خلص لو في فيه بيانات. جنبه، لو الشهر الحالي كمان فيه حركات، بيظهر
  // تقرير ثانوي مختصر (secondary) "لسا وين واصل هالشهر" بدون ما يلغي
  // تقرير الشهر يلي خلص — الاثنين بيظهروا مع بعض. لو ما في شهر سابق
  // كامل إطلاقًا، الشهر الحالي (لو في فيه بيانات) بيصير هو الـmain
  // لحاله بوسم "لسا ماشي" (inProgress: true)، وما في secondary وقتها.
  // الديون (لسا إلك/عليك) صورة آنية دائمًا، مش محصورة بشهر. بيرجع null
  // بس لو ما في ولا حركة إطلاقًا بالشهرين.
  // مستحقات العملاء (لي) والموردين (عليّ) بالرصيد المتبقي الفعلي (بعد أي
  // تسديد جزئي)، محوّلة لشيكل بس عشان نجمعهم برقم واحد — بدون ما نأثر
  // على قيمة كل دين المخزّنة أو المعروضة لحاله بعملته الأصلية.
  const receivablesPayables = useMemo(() => {
    const toILS = (d) => (d.currency || "ILS") === "ILS" ? exchangeRate : WALLET_CURRENCY_TO_ILS[d.currency];
    const remaining = (d) => Math.max(0, Number(d.amount) - Number(d.paid_amount || 0));
    const owedToMe = scopedDebts
      .filter((d) => !d.paid && d.type === "دين له")
      .reduce((sum, d) => sum + remaining(d) * toILS(d), 0);
    const owedByMe = scopedDebts
      .filter((d) => !d.paid && d.type === "دين عليه")
      .reduce((sum, d) => sum + remaining(d) * toILS(d), 0);
    return { owedToMe, owedByMe };
  }, [scopedDebts, exchangeRate]);

  const monthlyReport = useMemo(() => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const prevReport = computeMonthReport(scopedTransactions, prevMonthDate.getFullYear(), prevMonthDate.getMonth());
    const currentReport = computeMonthReport(scopedTransactions, now.getFullYear(), now.getMonth());

    const main = prevReport
      ? { ...prevReport, inProgress: false }
      : currentReport
      ? { ...currentReport, inProgress: true }
      : null;

    if (!main) return null;

    const secondary = (!main.inProgress && currentReport) ? { ...currentReport, inProgress: true } : null;

    return { main, secondary, ...receivablesPayables };
  }, [scopedTransactions, receivablesPayables]);

  // تقرير السنة لتبويب "تقارير" — نفس فكرة monthlyReport بالضبط بس عالسنة:
  // آخر سنة كاملة خلصت هي الـmain، وإذا السنة الحالية كمان فيها حركات
  // بتظهر جنبها بطاقة ثانوية "لسا السنة ماشية". بما إنه خزنتي تطبيق
  // جديد، الغالب حاليًا إنه ما في سنة سابقة كاملة إطلاقًا، فالـmain غالبًا
  // رح يكون السنة الحالية بوسم "لسا ماشية" لفترة طويلة — هاد متوقع وصحيح.
  const yearlyReport = useMemo(() => {
    const now = new Date();
    const prevYear = now.getFullYear() - 1;

    const prevReport = computeYearReport(scopedTransactions, prevYear);
    const currentReport = computeYearReport(scopedTransactions, now.getFullYear());

    const main = prevReport
      ? { ...prevReport, inProgress: false }
      : currentReport
      ? { ...currentReport, inProgress: true }
      : null;

    if (!main) return null;

    const secondary = (!main.inProgress && currentReport) ? { ...currentReport, inProgress: true } : null;

    return { main, secondary };
  }, [scopedTransactions]);

  // حركات تسديد/تحصيل ديون إلها حركة أصلية معروفة (source_transaction_id) —
  // لازم تُستثنى من تقرير الربح/الخسارة عشان ما ينحسب نفس الدخل/المصروف
  // مرتين (مرة وقت البيع/الشراء الآجل الأصلي، ومرة وقت التسديد).
  const bizSettlementExclusions = useMemo(() => {
    const excluded = new Set();
    scopedDebts.forEach((d) => {
      if (!d.source_transaction_id) return;
      scopedTransactions.forEach((t) => {
        if (t.linked_debt_id === d.id && t.id !== d.source_transaction_id) excluded.add(t.id);
      });
    });
    return excluded;
  }, [scopedDebts, scopedTransactions]);

  // تقارير الربح والخسارة لحساب "مشروع" — الشهر الحالي والسنة الحالية،
  // مبنية على الحركات الفعلية (quantity/cost_price/expense_type).
  const bizMonthlyReport = useMemo(() => {
    const now = new Date();
    const monthTx = scopedTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return computeBizReport(monthTx, bizSettlementExclusions);
  }, [scopedTransactions, bizSettlementExclusions]);
  const bizYearlyReport = useMemo(() => {
    const yearTx = scopedTransactions.filter((t) => new Date(t.date).getFullYear() === new Date().getFullYear());
    return computeBizReport(yearTx, bizSettlementExclusions);
  }, [scopedTransactions, bizSettlementExclusions]);
  const jobProfits = useMemo(() => computeJobProfits(scopedTransactions), [scopedTransactions]);

  // سجل الحركات مفلتر بالبحث الموجود + رقاقات الفلتر الجديدة (دخل/مصروف/هالشهر)
  const filteredTransactions = useMemo(() => {
    return scopedTransactions.filter((t) => {
      const matchesSearch = t.category.includes(searchQuery) || (t.account && t.account.includes(searchQuery));
      if (!matchesSearch) return false;
      if (transactionFilter === "دخل") return t.type === "دخل" || t.type === "مبيعات";
      if (transactionFilter === "مصروف") return t.type === "مصروف" || t.type === "شراء";
      if (transactionFilter === "هالشهر") {
        const now = new Date();
        const d = new Date(t.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      return true;
    });
  }, [scopedTransactions, searchQuery, transactionFilter]);

  const visibleCategories = showAllCategories ? categoryBreakdown : categoryBreakdown.slice(0, 5);

  function exportToCSV() {
    if (scopedTransactions.length === 0) {
      alert("لا توجد حركات للتصدير");
      return;
    }
    const headers = "Type,Category,Account,Amount,Date\n";
    const rows = scopedTransactions.map(t => `${t.type},${t.category},${t.account || "الصندوق (كاش)"},${t.amount},${t.date}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `khezneti_transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function fetchData() {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      return;
    }

    const [{ data: txData }, { data: debtData }, { data: productData }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("id", { ascending: false }),
      supabase.from("debts").select("*").eq("user_id", user.id).order("id", { ascending: false }),
      supabase.from("products").select("*").eq("user_id", user.id).order("id", { ascending: false }),
    ]);

    setTransactions(txData || []);
    setDebts(debtData || []);
    setProducts(productData || []);
    setLoading(false);
  }

  async function addTransaction() {
    if (savingTransaction) return; // منع إرسال مزدوج

    // مبيعات قطعة قطعة: المبلغ الفعلي = الكمية × سعر البيع. شراء بضاعة
    // بالمثل = الكمية × تكلفة القطعة. الاثنين مخفيين أصلًا خانة "المبلغ" العادية.
    const num = isBizSale
      ? Number(saleQty || 0) * Number(saleUnitPrice || 0)
      : isBizPurchase
      ? Number(purchaseQty || 0) * Number(purchaseUnitCost || 0)
      : parseFloat(amount);
    if (!num || num <= 0) {
      setError("أدخل-ي مبلغ صحيح");
      return;
    }
    if (!navigator.onLine) {
      setError("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }

    setSavingTransaction(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("يجب تسجيل الدخول أولاً");
        return;
      }

      // العملات الجديدة (دولار/دينار) بتخزّن المبلغ الحقيقي كما هو، بدون
      // تحويل بسعر صرف العرض القديم — لأنها عملة العملية الفعلية مش مجرد
      // تفضيل عرض. الشيكل (الافتراضي) بيضل يشتغل بنفس المنطق القديم
      // بالضبط، صفر تغيير على أي عملية قديمة أو جديدة بالشيكل.
      const baseAmount = txCurrency === "ILS" ? num / exchangeRate : num;
      const catObj = CATEGORIES.find(c => c.key === category);
      const finalType = catObj ? catObj.type : "مصروف";
      const costPrice = isBizSale && saleUnitCost !== ""
        ? (txCurrency === "ILS" ? (Number(saleQty || 0) * Number(saleUnitCost || 0)) / exchangeRate : Number(saleQty || 0) * Number(saleUnitCost || 0))
        : null;
      const isCreditSale = isBizSale && isCreditTx;
      // بيع آجل: العملية بتنحسب بالتقارير كإيراد عادي، بس ما بتأثر على
      // أي رصيد كاش/بنك — عن طريق حساب وهمي "مستحق (آجل)" غير معروف
      // لحسابات cashBalance/bankBalance/walletBalances الحالية أصلًا.
      const finalAccount = isCreditSale ? "مستحق (آجل)" : selectedAccount;

      const commonFields = {
        type: finalType,
        amount: baseAmount,
        category,
        account: finalAccount,
        date: transactionDate || new Date().toISOString().split("T")[0],
        note: note.trim() || null,
        currency: txCurrency,
        quantity: isBizSale ? Number(saleQty || 0) : isBizPurchase ? Number(purchaseQty || 0) : null,
        cost_price: costPrice,
        expense_type: accountType === "مشروع" && finalType === "مصروف" ? expenseType : null,
        product_name: accountType === "مشروع" ? (productName.trim() || null) : null,
        counterparty_name: accountType === "مشروع" ? (counterpartyName.trim() || null) : null,
        invoice_number: accountType === "مشروع" ? (invoiceNumber.trim() || null) : null,
      };

      if (editingTransactionId) {
        // نمسك نسخة الحركة *قبل* التعديل عشان نعرف شو نعكس بالمخزون لو
        // المنتج أو الكمية تغيّروا، وشو الدين المرتبط (إن وجد) عشان
        // نحدّث مبلغه معها.
        const oldTx = transactions.find(t => t.id === editingTransactionId);

        const { data, error: dbError } = await supabase
          .from("transactions")
          .update(commonFields)
          .eq("id", editingTransactionId)
          .select();

        if (dbError || !data || data.length === 0) {
          setError(dbError ? "فشل التعديل: " + dbError.message : "فشل التعديل (صلاحيات RLS ناقصة).");
          return;
        }

        setTransactions(prev => prev.map(t => (t.id === editingTransactionId ? data[0] : t)));

        // إعادة حساب أثر المخزون: نرجّع أثر المنتج/الكمية/النوع (بيع أو
        // شراء) القديم، وبعدين نطبّق أثر الحركة الجديدة — حتى لو المنتج
        // أو نوع الحركة نفسه تغيّر (stockSign بيحدد الاتجاه لكل واحدة).
        if (oldTx?.product_name || commonFields.product_name) {
          const oldQty = Number(oldTx?.quantity) || 0;
          const newQty = commonFields.quantity || 0;
          const oldSign = stockSign(oldTx);
          const newSign = stockSign(commonFields);
          if (oldTx?.product_name && oldQty > 0 && oldSign !== 0) {
            const oldProduct = scopedProducts.find(p => p.name === oldTx.product_name);
            if (oldProduct) {
              const reverted = Number(oldProduct.quantity) - oldSign * oldQty;
              const { data: pData } = await supabase.from("products").update({ quantity: Math.max(0, reverted) }).eq("id", oldProduct.id).select();
              if (pData) setProducts(prev => prev.map(p => p.id === oldProduct.id ? pData[0] : p));
            }
          }
          if (commonFields.product_name && newQty > 0 && newSign !== 0) {
            const newProduct = scopedProducts.find(p => p.name === commonFields.product_name);
            if (newProduct) {
              // لو نفس المنتج القديم، لازم ناخد بعين الاعتبار إنو رصيده
              // انعكس فوق بالخطوة السابقة قبل ما نطبّق الأثر الجديد.
              const baseQty = (oldTx?.product_name === commonFields.product_name && oldSign !== 0)
                ? Number(newProduct.quantity) - oldSign * oldQty
                : Number(newProduct.quantity);
              const { data: pData } = await supabase.from("products").update({ quantity: Math.max(0, baseQty + newSign * newQty) }).eq("id", newProduct.id).select();
              if (pData) setProducts(prev => prev.map(p => p.id === newProduct.id ? pData[0] : p));

              // شراء بضاعة معدّل: آخر تكلفة وحدة معروفة تصير تكلفة المرجع
              // للمنتج (نفس منطق handleInvAdd — بدون FIFO/متوسط مرجّح).
              if (newSign === 1) {
                const newUnitCost = baseAmount / newQty;
                await supabase.from("products").update({ cost: newUnitCost }).eq("id", newProduct.id);
                setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, cost: newUnitCost } : p));
              }
            }
          }
        }

        // لو الحركة هاي هي أصل دين (بيع/شراء آجل)، نحدّث مبلغ/عملة الدين
        // معها — الدفعات السابقة (paid_amount) تضل زي ما هي، والمتبقي
        // بيتحسب تلقائيًا (amount - paid_amount).
        const linkedDebt = debts.find(d => d.source_transaction_id === editingTransactionId);
        if (linkedDebt && (Number(linkedDebt.amount) !== baseAmount || linkedDebt.currency !== txCurrency)) {
          const { data: dData } = await supabase.from("debts").update({ amount: baseAmount, currency: txCurrency }).eq("id", linkedDebt.id).select();
          if (dData) setDebts(prev => prev.map(d => d.id === linkedDebt.id ? dData[0] : d));
        }

        cancelEditTransaction();
        return;
      }

      const newRecord = { ...commonFields, user_id: user.id, account_type: accountType };

      const { data, error: dbError } = await supabase
        .from("transactions")
        .insert([newRecord])
        .select();

      // بيع آجل: تسجيل دين "له" مرتبط تلقائيًا، مع ربط ثنائي الاتجاه
      // (الحركة ↔ الدين) عبر source_transaction_id / linked_debt_id.
      if (!dbError && isCreditSale && data && data[0]) {
        const { data: debtData } = await supabase.from("debts").insert([{
          name: counterpartyName.trim() || "عميل",
          amount: baseAmount,
          type: "دين له",
          currency: txCurrency,
          account_type: accountType,
          source_transaction_id: data[0].id,
          user_id: user.id,
        }]).select();
        if (debtData && debtData[0]) {
          setDebts(prev => [debtData[0], ...prev]);
          const { data: linkedTxData } = await supabase.from("transactions").update({ linked_debt_id: debtData[0].id }).eq("id", data[0].id).select();
          if (linkedTxData && linkedTxData[0]) data[0] = linkedTxData[0];
        }
      }

      // مبيعات مرتبطة بمنتج مخزون فعلي — بينخصم الكمية المباعة تلقائيًا.
      if (!dbError && isBizSale && productName) {
        const linkedProduct = scopedProducts.find(p => p.name === productName);
        if (linkedProduct) {
          const newQty = Math.max(0, Number(linkedProduct.quantity) - Number(saleQty || 0));
          const { data: prodData } = await supabase.from("products").update({ quantity: newQty }).eq("id", linkedProduct.id).select();
          if (prodData) setProducts(prev => prev.map(p => p.id === linkedProduct.id ? prodData[0] : p));
        }
      }

      // شراء بضاعة مرتبط بمنتج مخزون فعلي — بيزيد الكمية ويحدّث تكلفة
      // المرجع تلقائيًا (نفس أثر handleInvAdd بالضبط).
      if (!dbError && isBizPurchase && productName) {
        const linkedProduct = scopedProducts.find(p => p.name === productName);
        const unitCost = Number(purchaseUnitCost || 0);
        if (linkedProduct) {
          const newQty = Number(linkedProduct.quantity) + Number(purchaseQty || 0);
          const { data: prodData } = await supabase.from("products").update({ quantity: newQty, cost: unitCost || linkedProduct.cost }).eq("id", linkedProduct.id).select();
          if (prodData) setProducts(prev => prev.map(p => p.id === linkedProduct.id ? prodData[0] : p));
        }
      }

      if (dbError) {
        setError("فشل الحفظ: " + dbError.message);
      } else if (data) {
        setTransactions(prev => [data[0], ...prev]);
        setAmount("");
        setNote("");
        setSaleQty("1");
        setSaleUnitPrice("");
        setSaleUnitCost("");
        setPurchaseQty("1");
        setPurchaseUnitCost("");
        setProductName("");
        setCounterpartyName("");
        setInvoiceNumber("");
        setIsCreditTx(false);
        setError("");
      }
    } finally {
      setSavingTransaction(false);
    }
  }

  // تحويل داخلي بين الكاش والبنك بنفس العملة — عمليتين مرتبطتين بنوع
  // "تحويل" جديد (لأنه مش دخل ولا مصروف حقيقي)، فما بيأثر على أي تقرير
  // ربح/خسارة موجود أصلًا (المنطق الحالي بيتجاهل أي نوع غير معروف له).
  async function handleTransfer() {
    if (transferSaving) return;
    const num = parseFloat(transferAmount);
    if (!num || num <= 0) {
      setTransferMessage("أدخل-ي مبلغ صحيح");
      return;
    }
    if (!navigator.onLine) {
      setTransferMessage("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }
    setTransferSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setTransferMessage("يجب تسجيل الدخول أولاً");
        return;
      }
      const fromAccount = transferDirection === "toBank" ? "الصندوق (كاش)" : "حساب البنك";
      const toAccount = transferDirection === "toBank" ? "حساب البنك" : "الصندوق (كاش)";
      const today = new Date().toISOString().split("T")[0];
      const { data, error: dbError } = await supabase
        .from("transactions")
        .insert([
          { type: "تحويل", amount: -num, category: "تحويل داخلي", account: fromAccount, currency: transferCurrency, date: today, user_id: user.id, account_type: accountType },
          { type: "تحويل", amount: num, category: "تحويل داخلي", account: toAccount, currency: transferCurrency, date: today, user_id: user.id, account_type: accountType },
        ])
        .select();

      if (dbError) {
        setTransferMessage("فشل التحويل: " + dbError.message);
      } else if (data) {
        setTransactions(prev => [...data, ...prev]);
        setTransferAmount("");
        setTransferMessage("تم التحويل بنجاح.");
      }
    } finally {
      setTransferSaving(false);
    }
  }

  // رصيد افتتاحي — نوع حركة "رصيد افتتاحي" جديد، نفس فكرة "تحويل" بالضبط:
  // بيدخل برصيد الكاش/البنك الحقيقي، بس مستثنى بالكامل من كل حسابات
  // الدخل/المصروف/التقارير (computeReportForTx وcomputeBizReport بيتجاهلوا
  // أي نوع غير دخل/مبيعات/مصروف/شراء تلقائيًا — نفس آلية "تحويل" الموجودة).
  async function handleOpeningBalance() {
    if (openingSaving) return;
    const num = parseFloat(openingAmount);
    if (!num || num <= 0) {
      setOpeningMessage("أدخل-ي مبلغ صحيح");
      return;
    }
    if (!navigator.onLine) {
      setOpeningMessage("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }
    setOpeningSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setOpeningMessage("يجب تسجيل الدخول أولاً");
        return;
      }
      const account = openingAccountType === "bank" ? "حساب البنك" : "الصندوق (كاش)";
      const baseAmount = openingCurrency === "ILS" ? num / exchangeRate : num;
      const { data, error: dbError } = await supabase
        .from("transactions")
        .insert([{
          type: "رصيد افتتاحي", amount: baseAmount, category: "رصيد افتتاحي", account,
          currency: openingCurrency, date: new Date().toISOString().split("T")[0],
          user_id: user.id, account_type: accountType,
        }])
        .select();

      if (dbError) {
        setOpeningMessage("فشل الحفظ: " + dbError.message);
      } else if (data) {
        setTransactions(prev => [...data, ...prev]);
        setOpeningAmount("");
        setOpeningMessage("تم تسجيل الرصيد الافتتاحي.");
      }
    } finally {
      setOpeningSaving(false);
    }
  }

  // تسجيل شراء بضاعة = إضافة للمخزون بضغطة وحدة. نقدي بينخصم من خزنة
  // حقيقية (عملية "مصروف" عادية)، آجل بيسجّل دين "عليه" للمورّد بدون
  // ما يلمس أي رصيد كاش/بنك — نفس فكرة بيع آجل بالضبط.
  async function handleInvAdd() {
    const qty = parseFloat(invQty);
    const cost = parseFloat(invCost) || 0;
    if (!invName.trim() || !qty || qty <= 0) {
      setInvMessage("أدخل-ي اسم المنتج وكمية صحيحة");
      return;
    }
    if (!navigator.onLine) {
      setInvMessage("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setInvMessage("يجب تسجيل الدخول أولاً");
        return;
      }

      const existing = scopedProducts.find(p => p.name === invName.trim());
      if (existing) {
        const { data, error: dbError } = await supabase
          .from("products")
          .update({ quantity: Number(existing.quantity) + qty, cost: cost || existing.cost })
          .eq("id", existing.id)
          .select();
        if (dbError) { setInvMessage("فشل تحديث المخزون: " + dbError.message); return; }
        if (data) setProducts(prev => prev.map(p => p.id === existing.id ? data[0] : p));
      } else {
        const { data, error: dbError } = await supabase
          .from("products")
          .insert([{ name: invName.trim(), quantity: qty, cost, user_id: user.id, account_type: accountType }])
          .select();
        if (dbError) { setInvMessage("فشل إضافة المنتج: " + dbError.message); return; }
        if (data) setProducts(prev => [data[0], ...prev]);
      }

      const total = qty * cost;
      // رصيد افتتاحي: بس بيضيف للمخزون، صفر حركة مالية (لا مصروف ولا دين) —
      // مش شراء جديد، مجرد إعلان "عندي أصلًا هالكمية" وقت البداية.
      if (invPaymentMode === "opening") {
        setInvMessage(`تم — أُضيف ${qty} لمخزون "${invName.trim()}" كرصيد افتتاحي، بدون أي أثر مالي.`);
      } else if (total > 0) {
        if (invPaymentMode === "credit") {
          // شراء آجل — نفس منطق بيع آجل بالضبط: حركة "مصروف/مشتريات بضاعة"
          // حقيقية تُسجّل فورًا (بحساب وهمي "مستحق (آجل)" بدل كاش حقيقي)،
          // مرتبطة بدين "عليه" ثنائي الاتجاه. هيك التكلفة مستثناة من الـP&L
          // فورًا (نفس استثناء "مشتريات بضاعة" الموجود)، وتسديد الدين لاحقًا
          // ما بيتحسب مصروف تاني — لأنه أصلًا مش مصدر التسجيل الأول.
          const { data: txData } = await supabase.from("transactions").insert([{
            type: "مصروف", amount: total, category: "مشتريات بضاعة", account: "مستحق (آجل)", currency: invCurrency,
            product_name: invName.trim(), counterparty_name: invSupplier.trim() || null, quantity: qty,
            date: new Date().toISOString().split("T")[0], user_id: user.id, account_type: accountType,
          }]).select();
          if (txData && txData[0]) {
            setTransactions(prev => [txData[0], ...prev]);
            const { data: debtData } = await supabase.from("debts").insert([{
              name: invSupplier.trim() || "مورّد", amount: total, type: "دين عليه", currency: invCurrency,
              account_type: accountType, source_transaction_id: txData[0].id, user_id: user.id,
            }]).select();
            if (debtData && debtData[0]) {
              setDebts(prev => [debtData[0], ...prev]);
              await supabase.from("transactions").update({ linked_debt_id: debtData[0].id }).eq("id", txData[0].id);
              setTransactions(prev => prev.map(t => t.id === txData[0].id ? { ...t, linked_debt_id: debtData[0].id } : t));
            }
          }
          setInvMessage(`تم — أُضيف ${qty} لمخزون "${invName.trim()}"، و${total.toFixed(2)} سُجّلت كدين عليك للمورّد.`);
        } else {
          const account = invAccountType === "bank" ? "حساب البنك" : "الصندوق (كاش)";
          const { data: txData } = await supabase.from("transactions").insert([{
            type: "مصروف", amount: total, category: "مشتريات بضاعة", account, currency: invCurrency,
            product_name: invName.trim(), counterparty_name: invSupplier.trim() || null, quantity: qty,
            date: new Date().toISOString().split("T")[0], user_id: user.id, account_type: accountType,
          }]).select();
          if (txData) setTransactions(prev => [txData[0], ...prev]);
          setInvMessage(`تم — أُضيف ${qty} لمخزون "${invName.trim()}"، وانخصم ${total.toFixed(2)} من الخزنة.`);
        }
      } else {
        setInvMessage(`تم — أُضيف ${qty} لمخزون "${invName.trim()}".`);
      }

      setInvName(""); setInvQty(""); setInvCost(""); setInvSupplier(""); setInvPaymentMode("cash");
      setShowInvAddForm(false);
    } catch {
      setInvMessage("صار خطأ غير متوقع.");
    }
  }

  // تعديل كمية / تسجيل هدر — تصحيح مخزون بحت، بدون أي حركة مالية
  // (التكلفة انسجلت أصلًا وقت الشراء).
  async function handleInvAdjust() {
    const delta = parseFloat(invAdjustQty);
    if (!invAdjustProduct || isNaN(delta) || !invAdjustReason.trim()) {
      setInvMessage("اختار-ي المنتج، الكمية، والسبب");
      return;
    }
    const product = scopedProducts.find(p => p.name === invAdjustProduct);
    if (!product) return;
    const newQty = Math.max(0, Number(product.quantity) + delta);
    const { data, error: dbError } = await supabase
      .from("products")
      .update({ quantity: newQty })
      .eq("id", product.id)
      .select();
    if (dbError) { setInvMessage("فشل التعديل: " + dbError.message); return; }
    if (data) setProducts(prev => prev.map(p => p.id === product.id ? data[0] : p));
    setInvMessage(`تم تسجيل التعديل — "${product.name}" صار ${newQty} (${invAdjustReason.trim()}).`);
    setInvAdjustProduct(""); setInvAdjustQty(""); setInvAdjustReason("");
    setShowInvAdjustForm(false);
  }

  // مرتجع من عميل — بيرجع لعملية البيع الأصلية نفسها (مش سعر/تكلفة تُكتب
  // يدويًا من جديد)، عشان الإيراد والـCOGS يرجعوا بالضبط بنفس القيمة يلي
  // كانوا فيها وقت البيع، بغض النظر عن أي تغيير لاحق بسعر تكلفة المنتج.
  // لو العملية الأصلية كانت بيع آجل (حساب "مستحق (آجل)")، المرتجع بينقص
  // من المستحق (الدين) نفسه، مش من كاش حقيقي — نفس حساب/عملة العملية
  // الأصلية بالضبط.
  async function handleInvReturn() {
    const originalTx = scopedTransactions.find(t => t.id === Number(invReturnTxId));
    const qty = parseFloat(invReturnQty);
    // الكمية القابلة للإرجاع = الكمية المباعة أصلًا ناقص أي مرتجعات سابقة
    // لنفس العملية بالضبط (مش بس الكمية الأصلية) — عشان ما يصير إرجاع
    // أكتر من المباع فعليًا لو صار أكتر من مرتجع لنفس عملية البيع.
    const alreadyReturned = originalTx
      ? scopedTransactions.filter(t => t.return_of_transaction_id === originalTx.id).reduce((sum, t) => sum + Math.abs(Number(t.quantity) || 0), 0)
      : 0;
    const remainingReturnable = originalTx ? Number(originalTx.quantity || 0) - alreadyReturned : 0;
    if (!originalTx || !qty || qty <= 0 || qty > remainingReturnable + 0.005) {
      setInvMessage(`اختار-ي عملية بيع صحيحة وكمية لا تتجاوز المتبقي القابل للإرجاع (${remainingReturnable})`);
      return;
    }
    if (!navigator.onLine) {
      setInvMessage("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setInvMessage("يجب تسجيل الدخول أولاً");
        return;
      }

      const unitPrice = Number(originalTx.amount) / Number(originalTx.quantity);
      const unitCost = (Number(originalTx.cost_price) || 0) / Number(originalTx.quantity);
      const revenueReversed = unitPrice * qty;
      const costReversed = unitCost * qty;

      if (originalTx.product_name) {
        const product = scopedProducts.find(p => p.name === originalTx.product_name);
        if (product) {
          const { data } = await supabase.from("products").update({ quantity: Number(product.quantity) + qty }).eq("id", product.id).select();
          if (data) setProducts(prev => prev.map(p => p.id === product.id ? data[0] : p));
        }
      }

      const { data: txData } = await supabase.from("transactions").insert([{
        type: "دخل", amount: -revenueReversed, cost_price: -costReversed, quantity: -qty,
        category: "مبيعات", account: originalTx.account, currency: originalTx.currency,
        product_name: originalTx.product_name, date: new Date().toISOString().split("T")[0],
        user_id: user.id, account_type: accountType, return_of_transaction_id: originalTx.id,
      }]).select();
      if (txData) setTransactions(prev => [txData[0], ...prev]);

      // بيع آجل: ننقص المستحق نفسه بدل ما نرجع كاش حقيقي.
      if (originalTx.linked_debt_id) {
        const linkedDebt = debts.find(d => d.id === originalTx.linked_debt_id);
        if (linkedDebt) {
          const newAmount = Math.max(0, Number(linkedDebt.amount) - revenueReversed);
          const { data: dData } = await supabase.from("debts").update({ amount: newAmount }).eq("id", linkedDebt.id).select();
          if (dData) setDebts(prev => prev.map(d => d.id === linkedDebt.id ? dData[0] : d));
        }
      }

      setInvMessage(`تم تسجيل المرتجع — رجع ${qty} للمخزون، وانخصم ${revenueReversed.toFixed(2)} من الإيراد و${costReversed.toFixed(2)} من تكلفة البضاعة.`);
      setInvReturnTxId(""); setInvReturnQty("");
      setShowInvReturnForm(false);
    } catch {
      setInvMessage("صار خطأ غير متوقع.");
    }
  }

  function startEditTransaction(t) {
    const recordCurrency = t.currency || "ILS";
    setEditingTransactionId(t.id);
    // عمليات بعملة غير الشيكل مخزّنة برقمها الحقيقي مباشرة (بدون تحويل)،
    // فبتنعرض متل ما هي؛ عمليات الشيكل (الافتراضي القديم) بتضل تتحول
    // لعملة العرض الحالية بالضبط متل ما كان يصير قبل هاي الإضافة.
    const displayAmount = recordCurrency === "ILS" ? Number(t.amount) * exchangeRate : Number(t.amount);
    setAmount(String(displayAmount));
    setCategory(t.category);
    const catObj = CATEGORIES.find(c => c.key === t.category);
    setEntryType(catObj ? catObj.type : "مصروف");
    setSelectedAccount(t.account === "مستحق (آجل)" ? "الصندوق (كاش)" : (t.account || "الصندوق (كاش)"));
    setTransactionDate(t.date || new Date().toISOString().split("T")[0]);
    setNote(t.note || "");
    setTxCurrency(recordCurrency);

    // حقول مشروع — لازم تتعبى من الحركة الأصلية وإلا تعديل أي حركة
    // مشروع بيفقد كميتها/تكلفتها/تصنيفها/ربطها بمنتج أو فاتورة صامتًا.
    const qty = Number(t.quantity) || 0;
    const isPurchaseTx = (t.type === "مصروف" || t.type === "شراء") && t.category === "مشتريات بضاعة";
    setSaleQty(qty > 0 && !isPurchaseTx ? String(qty) : "1");
    setSaleUnitPrice(qty > 0 && !isPurchaseTx ? String(displayAmount / qty) : "");
    const displayCost = t.cost_price != null ? (recordCurrency === "ILS" ? Number(t.cost_price) * exchangeRate : Number(t.cost_price)) : null;
    setSaleUnitCost(qty > 0 && !isPurchaseTx && displayCost != null ? String(displayCost / qty) : "");
    setPurchaseQty(qty > 0 && isPurchaseTx ? String(qty) : "1");
    setPurchaseUnitCost(qty > 0 && isPurchaseTx ? String(displayAmount / qty) : "");
    setExpenseType(t.expense_type || "متغير");
    setProductName(t.product_name || "");
    setCounterpartyName(t.counterparty_name || "");
    setInvoiceNumber(t.invoice_number || "");
    setIsCreditTx(t.account === "مستحق (آجل)");
    setShowBizExtra(!!(t.product_name || t.counterparty_name || t.invoice_number));

    setError("");
    setShowAddTransactionForm(true);
  }

  function cancelEditTransaction() {
    setEditingTransactionId(null);
    setAmount("");
    setNote("");
    setTxCurrency("ILS");
    setSaleQty("1");
    setSaleUnitPrice("");
    setSaleUnitCost("");
    setPurchaseQty("1");
    setPurchaseUnitCost("");
    setExpenseType("متغير");
    setProductName("");
    setCounterpartyName("");
    setInvoiceNumber("");
    setIsCreditTx(false);
    setShowBizExtra(false);
    setError("");
  }

  async function handleSaveDebt() {
    const num = parseFloat(debtAmount);
    if (!debtName.trim() || !num || num <= 0) {
      alert("الرجاء إدخال اسم الشخص والمبلغ بشكل صحيح");
      return;
    }
    if (!navigator.onLine) {
      alert("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }

    if (savingDebt) return; // منع إرسال مزدوج
    setSavingDebt(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("يجب تسجيل الدخول أولاً");
        return;
      }

      // نفس منطق العمليات بالضبط: الشيكل (الافتراضي) بيتحول بسعر صرف
      // العرض القديم، والعملات التانية بتخزّن المبلغ الحقيقي كما هو.
      const baseAmount = debtCurrency === "ILS" ? num / exchangeRate : num;
      const newDebt = {
        name: debtName,
        amount: baseAmount,
        type: debtType,
        due_date: debtDueDate || null,
        currency: debtCurrency,
        account_type: accountType,
        user_id: user.id
      };

      const { data, error: dbError } = await supabase
        .from("debts")
        .insert([newDebt])
        .select();

      if (dbError) {
        // لو ظهر خطأ يذكر عمود due_date، لازم تُضاف عمود جديدة بجدول debts
        // بقاعدة البيانات أولًا (راجعي ملاحظة SQL بالأسفل).
        alert("فشل حفظ الدين: " + dbError.message);
      } else {
        if (data) setDebts(prev => [data[0], ...prev]);
        setShowAddDebtModal(false);
        setDebtName("");
        setDebtAmount("");
        setDebtDueDate("");
        setDebtCurrency("ILS");
      }
    } finally {
      setSavingDebt(false);
    }
  }

  async function removeTransaction(id) {
    const itemToDelete = transactions.find(t => t.id === id);
    if (!itemToDelete) return; // الحركة أصلاً مش موجودة (تم حذفها/سحبها قبل هيك) — منع طلب مزدوج

    setTransactions(transactions.filter((t) => t.id !== id));
    setDeletedItem(itemToDelete);
    setDeleteError("");

    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(async () => {
      try {
        const { data, error: dbError } = await supabase
          .from("transactions")
          .delete()
          .eq("id", id)
          .select();

        // لو ما انحذف أي صف فعليًا (صلاحيات RLS ناقصة، أو الحركة مش موجودة
        // أصلاً بقاعدة البيانات) — منرجّع الحركة عالواجهة، ما منفترض إنها
        // انحذفت لمجرد إنو ما ظهر خطأ.
        if (dbError || !data || data.length === 0) {
          setTransactions(prev => [itemToDelete, ...prev]);
          setDeleteError("تعذّر حذف الحركة، حاول-ي مرة تانية.");
          setTimeout(() => setDeleteError(""), 6000);
        } else {
          // الحذف نجح فعليًا — نعكس أي أثر مخزون أو دفعة دين مرتبطة، عشان
          // ما تضل أرقام قديمة معلّقة بعد حذف الحركة يلي أنشأتها. لو
          // الحركة كانت أصل دين (بيع/شراء آجل)، الدين بيضل موجود برصيده
          // الأخير — الربط بيتفك تلقائيًا بقاعدة البيانات (ON DELETE SET NULL).
          const deletedSign = stockSign(itemToDelete);
          if (itemToDelete.product_name && Number(itemToDelete.quantity) > 0 && deletedSign !== 0) {
            const product = scopedProducts.find(p => p.name === itemToDelete.product_name);
            if (product) {
              // نعكس أثر الحركة المحذوفة بعكس إشارتها: بيع محذوف بيرجع
              // للمخزون، شراء محذوف بينخصم منه.
              const restored = Number(product.quantity) - deletedSign * Number(itemToDelete.quantity);
              const { data: pData } = await supabase.from("products").update({ quantity: Math.max(0, restored) }).eq("id", product.id).select();
              if (pData) setProducts(prev => prev.map(p => p.id === product.id ? pData[0] : p));
            }
          }
          if (itemToDelete.linked_debt_id) {
            const linkedDebt = debts.find(d => d.id === itemToDelete.linked_debt_id);
            if (linkedDebt && linkedDebt.source_transaction_id !== id) {
              // الحركة المحذوفة كانت دفعة/تحصيل (مش أصل الدين) — ننقص
              // المبلغ المدفوع ونعيد فتح الدين لو كان معلّم مسدد بالكامل.
              const newPaid = Math.max(0, Number(linkedDebt.paid_amount || 0) - Number(itemToDelete.amount));
              const { data: dData } = await supabase.from("debts").update({ paid_amount: newPaid, paid: newPaid >= Number(linkedDebt.amount) ? 1 : 0 }).eq("id", linkedDebt.id).select();
              if (dData) setDebts(prev => prev.map(d => d.id === linkedDebt.id ? dData[0] : d));
            }
          }
        }
      } catch {
        setTransactions(prev => [itemToDelete, ...prev]);
        setDeleteError("فشل حذف الحركة — تحقق-ي من اتصال الإنترنت.");
        setTimeout(() => setDeleteError(""), 6000);
      }
      setDeletedItem(null);
    }, 5000);
    setUndoTimer(timer);
  }

  async function undoDelete() {
    if (!deletedItem) return;
    if (undoTimer) clearTimeout(undoTimer);
    setTransactions(prev => [deletedItem, ...prev]);
    setDeletedItem(null);
    setUndoTimer(null);
  }

  async function removeDebt(id) {
    if (!navigator.onLine) {
      alert("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }

    const previousDebts = debts;
    setDebts(debts.filter((d) => d.id !== id));

    // نفس نمط removeTransaction — لازم .select() ونتأكد إنو صف فعليًا
    // انحذف، لأنه حذف مرفوض بصلاحيات RLS بيرجع بدون أي خطأ إذا ما
    // تأكدنا من عدد الصفوف يلي رجعت.
    try {
      const { data, error: dbError } = await supabase.from("debts").delete().eq("id", id).select();

      if (dbError || !data || data.length === 0) {
        alert("تعذّر حذف الدين، حاول-ي مرة تانية.");
        setDebts(previousDebts);
      }
    } catch {
      alert("فشل حذف الدين — تحقق-ي من اتصال الإنترنت.");
      setDebts(previousDebts);
    }
  }

  // حذف كل بيانات المستخدمة المالية (حركات وديون) نهائيًا — حق ملكية
  // البيانات، مش حذف حساب الدخول نفسه (هاد يحتاج صلاحية سيرفر أعلى).
  async function handleDeleteAllData() {
    setDeleteDataError("");

    if (!navigator.onLine) {
      setDeleteDataError("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }

    setDeletingData(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setDeleteDataError("يجب تسجيل الدخول أولاً.");
        setDeletingData(false);
        return;
      }

      const { error: txError } = await supabase.from("transactions").delete().eq("user_id", user.id);
      if (txError) {
        setDeleteDataError("فشل حذف الحركات: " + txError.message);
        setDeletingData(false);
        return;
      }

      const { error: debtsError } = await supabase.from("debts").delete().eq("user_id", user.id);
      if (debtsError) {
        setDeleteDataError("فشل حذف الديون: " + debtsError.message);
        setDeletingData(false);
        return;
      }

      setTransactions([]);
      setDebts([]);
      setShowDeleteDataModal(false);
      setDeletingData(false);
      await supabase.auth.signOut();
    } catch {
      setDeleteDataError("فشل الحذف — تحقق-ي من اتصال الإنترنت وحاول-ي مرة تانية.");
      setDeletingData(false);
    }
  }

  // تسوية دين: بتسجل حركة مالية فعلية (دخل لو "دين له"، مصروف لو "دين
  // عليه") وبتعلّم الدين كمسدد. مقصود إنها خطوة يدوية بتأكيد المستخدمة
  // (مش تلقائية بمجرد وصول تاريخ الاستحقاق)، لأنو وصول التاريخ ما يعني
  // بالضرورة إنو الدين انسدد فعليًا.
  // تسديد/تحصيل — بيدعم دفعة جزئية: المبلغ الافتراضي هو كل المتبقي، بس
  // قابل للتعديل. paid_amount بيتراكم، وpaid (0/1) بينحط تلقائيًا لما
  // المتبقي يصير صفر. الحركة المسجّلة مرتبطة بالدين عبر linked_debt_id.
  async function settleDebt() {
    if (!settlingDebt || settlingInProgress) return;
    const remaining = Math.max(0, Number(settlingDebt.amount) - Number(settlingDebt.paid_amount || 0));
    const payNum = parseFloat(settleAmount);
    if (!payNum || payNum <= 0 || payNum > remaining + 0.005) {
      alert(`أدخل-ي مبلغ صحيح لا يتجاوز المتبقي (${remaining.toFixed(2)})`);
      return;
    }
    if (!navigator.onLine) {
      alert("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }
    setSettlingInProgress(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("يجب تسجيل الدخول أولاً");
        return;
      }

      const finalType = settlingDebt.type === "دين له" ? "دخل" : "مصروف";
      const newRecord = {
        type: finalType,
        amount: payNum,
        category: settlingDebt.type === "دين له" ? "دخل إضافي" : "أخرى",
        account: settleAccount,
        currency: settlingDebt.currency || "ILS",
        date: new Date().toISOString().split("T")[0],
        user_id: user.id,
        account_type: accountType,
        linked_debt_id: settlingDebt.id,
      };

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert([newRecord])
        .select();

      if (txError) {
        alert("فشل تسجيل الحركة: " + txError.message);
        return;
      }

      const newPaidAmount = Number(settlingDebt.paid_amount || 0) + payNum;
      const isFullyPaid = newPaidAmount >= Number(settlingDebt.amount) - 0.005;
      const { data: debtData, error: debtError } = await supabase
        .from("debts")
        .update({ paid_amount: newPaidAmount, paid: isFullyPaid ? 1 : 0 }) // عمود paid رقمي (numeric) مش boolean بقاعدة البيانات
        .eq("id", settlingDebt.id)
        .select();

      // لو التحديث ما أثّر على أي صف أو رجّع خطأ، منرجّع الحركة المالية
      // يلي سجلناها لتوّنا عشان ما يضل الرصيد متغيّر بينما الدين لسا
      // شكليًا "غير مسدد" بقاعدة البيانات.
      if (debtError || !debtData || debtData.length === 0) {
        if (txData && txData[0]) {
          await supabase.from("transactions").delete().eq("id", txData[0].id);
        }
        alert(
          "ما قدرنا نحدّث حالة الدين بقاعدة البيانات" +
            (debtError ? ": " + debtError.message : " (صلاحيات RLS ناقصة)") +
            " — تراجعنا عن الحركة المالية عشان الرصيد يضل صحيح. بلّغ-ي فريق التطوير."
        );
        return;
      }

      if (txData) setTransactions((prev) => [txData[0], ...prev]);
      setDebts((prev) => prev.map((d) => (d.id === settlingDebt.id ? debtData[0] : d)));
      setSettlingDebt(null);
    } finally {
      setSettlingInProgress(false);
    }
  }

  function openSettleModal(debt) {
    setSettlingDebt(debt);
    setSettleModalMode("choose");
    setSettleAccount("الصندوق (كاش)");
    setSettleAmount(String(Math.max(0, Number(debt.amount) - Number(debt.paid_amount || 0))));
    setPostponeDate(debt.due_date || "");
  }

  async function postponeDebtDate() {
    if (!settlingDebt || !postponeDate || postponingInProgress) return;
    if (!navigator.onLine) {
      alert("ما في اتصال بالإنترنت. تحقق-ي من الشبكة وحاول-ي مرة تانية.");
      return;
    }
    setPostponingInProgress(true);
    try {
      const { data: updatedRows, error: dbError } = await supabase
        .from("debts")
        .update({ due_date: postponeDate })
        .eq("id", settlingDebt.id)
        .select();

      if (dbError || !updatedRows || updatedRows.length === 0) {
        alert(
          "ما قدرنا نأجّل الدين بقاعدة البيانات" +
            (dbError ? ": " + dbError.message : " (صلاحيات RLS ناقصة)") +
            ". بلّغ-ي فريق التطوير."
        );
        return;
      }

      setDebts((prev) => prev.map((d) => (d.id === settlingDebt.id ? { ...d, due_date: postponeDate } : d)));
      setSettlingDebt(null);
    } finally {
      setPostponingInProgress(false);
    }
  }

  function requestDebtNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => setNotifyPermission(perm));
  }

  // بتسجّل نوع الحساب (فرد/مشروع) بمعلومات المستخدم بـ Supabase Auth
  // مباشرة — صفر تأثير على قاعدة البيانات، بس تفضيل شخصي بحساب المستخدم.
  // اختيار جلسة بس (مش دائم) — بيتحدد من جديد كل مرة تُفتح فيها الجلسة.
  function chooseAccountType(type) {
    setAccountType(type);
  }

  // تفتح المودال بوضع نظيف (تمسح أي رسالة خطأ/نجاح قديمة من فتحة سابقة)
  function openAuthModal(mode) {
    setAuthMode(mode);
    setLoginError("");
    setForgotMode(false);
    setForgotStatus(null);
    setAgreedToTerms(false);
    setAwaitingEmailConfirmation(false);
    setResendStatus(null);
    setShowLoginModal(true);
  }

  // تبديل بين تسجيل الدخول/حساب جديد جوا المودال المفتوح أصلاً
  function switchAuthMode(mode) {
    setAuthMode(mode);
    setLoginError("");
    setForgotMode(false);
    setForgotStatus(null);
    setAgreedToTerms(false);
    setAwaitingEmailConfirmation(false);
    setResendStatus(null);
  }

  function closeAuthModal() {
    setShowLoginModal(false);
    setLoginError("");
    setForgotMode(false);
    setForgotStatus(null);
    setAwaitingEmailConfirmation(false);
    setResendStatus(null);
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // منع إرسال مزدوج لو ضغطت الزر أكتر من مرة
    setLoginError("");

    if (authMode === "signup") {
      if (loginPassword.length < 8) {
        setLoginError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
        return;
      }
      if (!agreedToTerms) {
        setLoginError("يجب الموافقة على سياسة الخصوصية وشروط الاستخدام للمتابعة.");
        return;
      }
    }

    setLoading(true);
    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (error) throw error;

        if (data.session) {
          // تذكر الإيميل بس (مش كلمة المرور إطلاقًا) حسب اختيار المستخدمة
          if (rememberEmail) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, loginEmail);
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
          }
          setIsLoggedIn(true);
          setShowLoginModal(false);
          setLoginPassword("");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
        });

        if (error) throw error;

        if (data.session) {
          // (أ) الحساب اتسجّل وفي جلسة فورية — يعني تأكيد البريد مش مفعّل
          // بهاد الإعداد، أو الحساب كان أصلاً مؤكَّد. onAuthStateChange
          // رح يلتقط الجلسة هاي لحاله ويحوّل للوحة التحكم — ما في داعي
          // نعمل شي إضافي هون.
          setAgreedToTerms(false);
        } else if (data.user) {
          // (ب) الحساب اتسجّل بس ما في جلسة — لازم تأكيد البريد الإلكتروني
          // قبل ما تقدر تسجّل دخول (هاد وضع Supabase الحالي لهاد المشروع).
          setPendingConfirmationEmail(loginEmail);
          setAwaitingEmailConfirmation(true);
          setResendStatus(null);
          setAgreedToTerms(false);
          setLoginPassword("");
        }
        // (ج) فشل التسجيل بيوصل هون عن طريق catch تحت — ما منحتاج نتعامل
        // معه هون لأنه أصلاً بيرمي error ويوقف قبل ما يوصل لهاد السطر.
      }
    } catch (err) {
      setLoginError("حدث خطأ: " + translateAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (loading) return;
    setForgotStatus(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setForgotStatus({ type: "success", text: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني." });
    } catch (err) {
      setForgotStatus({ type: "error", text: translateAuthError(err.message) });
    } finally {
      setLoading(false);
    }
  }

  // إعادة إرسال رسالة تأكيد البريد الإلكتروني لحساب لسا ما تأكّد
  async function resendConfirmationEmail() {
    if (!pendingConfirmationEmail || resendLoading) return; // منع إرسال مزدوج
    setResendLoading(true);
    setResendStatus(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingConfirmationEmail,
      });
      if (error) throw error;
      setResendStatus({ type: "success", text: "تم إرسال رابط التأكيد مجدداً. تحقق-ي من بريدك الإلكتروني." });
    } catch (err) {
      setResendStatus({ type: "error", text: translateAuthError(err.message) });
    } finally {
      setResendLoading(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (loading) return;
    setUpdatePasswordError("");
    setUpdatePasswordSuccess("");

    if (newPassword.length < 8) {
      setUpdatePasswordError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setUpdatePasswordError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setUpdatePasswordSuccess("تم تحديث كلمة المرور بنجاح.");
      setNewPassword("");
      setNewPasswordConfirm("");
      setTimeout(() => {
        setIsPasswordRecovery(false);
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setIsLoggedIn(true);
            setUserEmail(session.user?.email || "");
            fetchData();
          }
        });
      }, 1500);
    } catch (err) {
      setUpdatePasswordError(translateAuthError(err.message));
    } finally {
      setLoading(false);
    }
  }

  // شاشة تعيين كلمة مرور جديدة — بتظهر لما توصل المستخدمة عبر رابط
  // "نسيت كلمة المرور"، وبتاخذ أولوية قبل أي شاشة تانية (حتى لو
  // Supabase عملها تسجيل دخول تلقائي عبر رابط الاستعادة).
  if (isPasswordRecovery) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0e1a1a", color: "#f2ede2", fontFamily: "'Tajawal', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');`}</style>
        <div style={{ width: "100%", maxWidth: "380px", background: "#16302d", border: "1px solid #D4AF37", borderRadius: "16px", padding: "30px" }}>
          <h3 style={{ margin: "0 0 6px", color: "#D4AF37", fontSize: "18px" }}>تعيين كلمة مرور جديدة</h3>
          <p style={{ fontSize: "12.5px", opacity: 0.75, margin: "0 0 18px" }}>هاد رابط استعادة كلمة المرور — اختار-ي كلمة مرور جديدة لحسابك.</p>

          {updatePasswordError && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "10px", background: "rgba(255,107,107,0.1)", padding: "8px", borderRadius: "6px" }}>{updatePasswordError}</div>}
          {updatePasswordSuccess && <div style={{ color: "#48bb78", fontSize: "12px", marginBottom: "10px", background: "rgba(72,187,120,0.1)", padding: "8px", borderRadius: "6px" }}>{updatePasswordSuccess}</div>}

          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>تأكيد كلمة المرور</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", background: "#D4AF37", border: "none", color: "#16302d", padding: "10px", borderRadius: "8px", fontWeight: "bold", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "جارِ التحديث..." : "تحديث كلمة المرور"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // فحص الجلسة الأولي (getSession) لسا شغال — منعرض شاشة بسيطة بدل ما
  // نفلاش الصفحة الترحيبية لحظة وحدة قبل ما نعرف إذا في جلسة مسجّلة أصلاً
  // (خصوصًا لمستخدمة رجعت وهي مسجّلة دخول من قبل).
  if (!isLoggedIn && loading) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0e1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, overflow: "hidden", border: "2px solid #D4AF37", boxShadow: "0 12px 30px rgba(0,0,0,0.6)" }}>
          <img src="/logo.png" alt="خزنتي" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>
    );
  }

  // الشاشة الترحيبية — بدون أي تغيير على المحتوى الأصلي، فقط إضافة "تواصل معنا"
  if (!isLoggedIn) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "radial-gradient(1000px 600px at 50% -10%, #123230 0%, #081615 55%)", color: "#f2ede2", fontFamily: "'Tajawal', sans-serif", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
          * { box-sizing: border-box; }
        `}</style>

        <div style={{ width: "100%", maxWidth: "900px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div style={{ background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #16302d", color: "#c9a961", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
            ✦ بوابة مالية ذكية
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => openAuthModal("login")}
              style={{ background: "transparent", border: "1px solid #c9a961", color: "#c9a961", padding: "8px 20px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => openAuthModal("signup")}
              style={{ background: "#c9a961", border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
            >
              حساب جديد
            </button>
          </div>
        </div>

        {!isOnline && (
          <div style={{ width: "100%", maxWidth: "900px", background: "rgba(201,169,97,0.1)", border: "1px solid rgba(201,169,97,0.35)", borderRadius: "14px", padding: "12px 20px", marginBottom: "20px", textAlign: "center", fontSize: "13px", color: "#f2ede2" }}>
            ⚠️ ما في اتصال بالإنترنت حاليًا — بعض الميزات (تسجيل الدخول، إنشاء حساب) ما رح تشتغل لحد ما يرجع الاتصال.
          </div>
        )}

        {installPrompt && (
          <div style={{ width: "100%", maxWidth: "900px", background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #c9a961", borderRadius: "14px", padding: "14px 20px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "#f2ede2" }}>ثبّت-ي خزنتي على جهازك بضغطة وحدة، واستخدم-يها متل أي تطبيق عادي 📲</span>
            <button
              onClick={handleInstallClick}
              style={{ background: "#c9a961", border: "none", color: "#0e1a1a", padding: "8px 18px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
            >
              تثبيت التطبيق
            </button>
          </div>
        )}

        {showIosInstallHint && !installPrompt && (
          <div style={{ width: "100%", maxWidth: "900px", background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #16302d", borderRadius: "14px", padding: "14px 20px", marginBottom: "30px", position: "relative" }}>
            <button
              onClick={() => setShowIosInstallHint(false)}
              style={{ position: "absolute", top: "8px", left: "10px", background: "none", border: "none", color: "#f2ede2", opacity: 0.6, cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
              aria-label="إغلاق"
            >
              ×
            </button>
            <span style={{ fontSize: "13px", color: "#f2ede2" }}>
              على آيفون: اضغط-ي زر المشاركة <strong style={{ color: "#c9a961" }}>⬆️</strong> بالمتصفح، وبعدين اختار-ي{" "}
              <strong style={{ color: "#c9a961" }}>"إضافة إلى الشاشة الرئيسية"</strong> عشان تصير خزنتي متل تطبيق عادي عندك.
            </span>
          </div>
        )}

        <div style={{ textAlign: "center", maxWidth: "800px", marginBottom: "50px" }}>
          <div style={{ width: "110px", height: "110px", margin: "0 auto 20px", background: "linear-gradient(135deg, #0d211f, #081615)", border: "2px solid #c9a961", borderRadius: "28px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.6)", overflow: "hidden" }}>
            <img
              src="/logo.png"
              alt="شعار خزنتي"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h1 style={{ fontSize: "50px", fontWeight: 900, color: "#f2ede2", margin: "0 0 10px", letterSpacing: "1px" }}>خِزنتي</h1>
          <p style={{ fontSize: "18px", color: "#c9a961", fontWeight: 500, margin: 0 }}>بوابتك الذكية للتحكم المالي الآمن</p>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #16302d", borderRadius: "20px", padding: "35px", marginBottom: "40px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: "14px", color: "#c9a961", marginBottom: "8px", fontWeight: 700 }}>من نحن</div>
          <h2 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 15px" }}>خزنتي — وضوح أكبر لأموالك</h2>
          <p style={{ fontSize: "15px", opacity: 0.9, lineHeight: "1.8", maxWidth: "700px", margin: "0 auto 14px", color: "#f2ede2" }}>
            "خزنتي" منصة مالية ذكية تساعد الأفراد وأصحاب الأعمال على فهم أموالهم وإدارتها بوضوح، من خلال متابعة الكاش، والحسابات البنكية، والديون والمستحقات في مكان واحد.
          </p>
          <p style={{ fontSize: "15px", opacity: 0.9, lineHeight: "1.8", maxWidth: "700px", margin: "0 auto 14px", color: "#f2ede2" }}>
            بدل ما تظل أموالك موزعة بين أكثر من مكان، تساعدك "خزنتي" على معرفة كم معك فعلًا، أين تذهب أموالك، وما الذي عليك أو لك — بطريقة بسيطة وسهلة الاستخدام.
          </p>
          <p style={{ fontSize: "15px", opacity: 0.9, lineHeight: "1.8", maxWidth: "700px", margin: "0 auto", color: "#f2ede2" }}>
            نجمع في "خزنتي" بين دقة الإدارة المالية وبساطة التقنية الحديثة، لنمنحك رؤية أوضح وتحكمًا أفضل في تدفقاتك النقدية.
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #16302d", borderRadius: "20px", padding: "35px", marginBottom: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#c9a961", marginBottom: "5px", fontWeight: 700 }}>المرحلة الحالية</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>التأسيس الذكي والآمن</h2>
            <p style={{ fontSize: "14px", color: "#c9a961", opacity: 0.9, marginTop: "5px" }}>حجر الأساس لمنتج حقيقي يلبي الاحتياجات الأساسية بأعلى معايير الجودة والأمان.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "15px" }}>
            <div style={{ background: "#081615", border: "1px solid #16302d", padding: "18px", borderRadius: "12px" }}>
              <h3 style={{ color: "#c9a961", margin: "0 0 8px", fontSize: "15px" }}>خزنتين، مش خزنة وحدة</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>
                الكاش اللي بإيدك مش هو الرصيد اللي بالبنك.<br />
                "خزنتي" بتفصل بينهم، عشان تعرف-ي بالضبط كم معك، وين موجود، وكيف عم يتحرك.
              </p>
            </div>
            <div style={{ background: "#081615", border: "1px solid #16302d", padding: "18px", borderRadius: "12px" }}>
              <h3 style={{ color: "#c9a961", margin: "0 0 8px", fontSize: "15px" }}>إدارة مرنة للحركات</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>تسجيل المصروفات والإيرادات بسهولة، ومتابعة كل حركة مالية بوضوح.</p>
            </div>
            <div style={{ background: "#081615", border: "1px solid #16302d", padding: "18px", borderRadius: "12px" }}>
              <h3 style={{ color: "#c9a961", margin: "0 0 8px", fontSize: "15px" }}>تصنيفات شاملة</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>١١ فئة للمصروف و٤ فئات للدخل، لتنظيم معاملاتك اليومية بطريقة بسيطة وواضحة.</p>
            </div>
            <div style={{ background: "#081615", border: "1px solid #16302d", padding: "18px", borderRadius: "12px" }}>
              <h3 style={{ color: "#c9a961", margin: "0 0 8px", fontSize: "15px" }}>بياناتك محفوظة، مش بس بجهازك</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>بياناتك بتضل مرتبطة بحسابك، عشان تكون خزنتك معك من أي جهاز، وقت ما تحتاجها.</p>
            </div>
            <div style={{ background: "#081615", border: "1px solid #16302d", padding: "18px", borderRadius: "12px" }}>
              <h3 style={{ color: "#c9a961", margin: "0 0 8px", fontSize: "15px" }}>حساب واحد، وضعين</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>بدّل-ي بين وضع فرد ووضع مشروع بضغطة — مخزون، موردين، وتقرير أرباح وخسائر لمشروعك، بنفس الحساب.</p>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", marginBottom: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#c9a961", marginBottom: "5px", fontWeight: 700 }}>طموحات المستقبل</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>نحو آفاق مالية متقدمة</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div style={{ background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #16302d", borderRadius: "16px", padding: "25px" }}>
              <div style={{ background: "#c9a961", color: "#0e1a1a", display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 900, marginBottom: "10px" }}>المرحلة التوسعية Pro</div>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>شاشة أسعار العملات والمؤشرات المالية المباشرة، مع تقارير ورسوم بيانية تحليلية دقيقة.</p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "15px" }}>تحكم بأموالك اليوم.. وابنِ مستقبلك المالي بثقة.</h2>

          <div>
            <button
              onClick={() => setShowPrivacyModal(true)}
              style={{ background: "none", border: "none", color: "#c9a961", fontSize: "13px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
            >
              سياسة الخصوصية وشروط الاستخدام
            </button>
            <span style={{ color: "#0e1a1a", margin: "0 10px" }}>|</span>
            <button
              onClick={() => setShowContactModal(true)}
              style={{ background: "none", border: "none", color: "#c9a961", fontSize: "13px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
            >
              للتواصل معنا
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", opacity: 0.6, fontSize: "12px", borderTop: "1px solid #16302d", width: "100%", maxWidth: "850px", paddingTop: "20px" }}>
          KHZNTI — بوابتك الذكية للتحكم المالي الآمن<br />
          تصميم وتطوير شركة أثر للحلول الرقمية &nbsp;|&nbsp; © 2026 أثر للحلول الرقمية. جميع الحقوق محفوظة.
        </div>

        {showLoginModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #c9a961", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "400px", color: "#f2ede2" }}>

              {!forgotMode && !awaitingEmailConfirmation && (
                <div style={{ display: "flex", background: "#081615", borderRadius: "10px", padding: "4px", marginBottom: "20px", border: "1px solid #16302d" }}>
                  <button type="button" onClick={() => switchAuthMode("login")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: authMode === "login" ? "#c9a961" : "transparent", color: authMode === "login" ? "#0e1a1a" : "#f2ede2", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                    تسجيل الدخول
                  </button>
                  <button type="button" onClick={() => switchAuthMode("signup")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: authMode === "signup" ? "#c9a961" : "transparent", color: authMode === "signup" ? "#0e1a1a" : "#f2ede2", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                    حساب جديد
                  </button>
                </div>
              )}

              {awaitingEmailConfirmation ? (
                <>
                  <h3 style={{ margin: "0 0 6px", color: "#c9a961", fontSize: "18px" }}>تأكيد بريدك الإلكتروني</h3>
                  <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, margin: "0 0 16px" }}>
                    تم إنشاء حسابك بنجاح. أرسلنا رابط تأكيد إلى بريدك الإلكتروني{" "}
                    <strong style={{ color: "#c9a961" }}>{pendingConfirmationEmail}</strong>. يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.
                  </p>

                  {resendStatus && (
                    <div style={{
                      color: resendStatus.type === "success" ? "#48bb78" : "#ff6b6b",
                      fontSize: "12px", marginBottom: "14px",
                      background: resendStatus.type === "success" ? "rgba(72,187,120,0.1)" : "rgba(255,107,107,0.1)",
                      padding: "8px", borderRadius: "6px"
                    }}>
                      {resendStatus.text}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={resendConfirmationEmail}
                      disabled={resendLoading}
                      style={{ background: "rgba(201,169,97,0.12)", border: "1px solid #c9a961", color: "#c9a961", padding: "10px", borderRadius: "8px", fontWeight: 700, cursor: resendLoading ? "default" : "pointer", fontSize: "13px", opacity: resendLoading ? 0.6 : 1 }}
                    >
                      {resendLoading ? "جارِ الإرسال..." : "إعادة إرسال رسالة التأكيد"}
                    </button>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => { setAwaitingEmailConfirmation(false); switchAuthMode("login"); setLoginEmail(pendingConfirmationEmail); }}
                        style={{ background: "transparent", border: "1px solid #16302d", color: "#f2ede2", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
                      >
                        رجوع لتسجيل الدخول
                      </button>
                      <button type="button" onClick={closeAuthModal} style={{ background: "#c9a961", border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                        إغلاق
                      </button>
                    </div>
                  </div>
                </>
              ) : forgotMode ? (
                <>
                  <h3 style={{ margin: "0 0 15px", color: "#c9a961", fontSize: "18px" }}>استعادة كلمة المرور</h3>

                  {forgotStatus && (
                    <div style={{
                      color: forgotStatus.type === "success" ? "#48bb78" : "#ff6b6b",
                      fontSize: "12px", marginBottom: "10px",
                      background: forgotStatus.type === "success" ? "rgba(72,187,120,0.1)" : "rgba(255,107,107,0.1)",
                      padding: "8px", borderRadius: "6px"
                    }}>
                      {forgotStatus.text}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword}>
                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        placeholder="name@example.com"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #16302d", background: "#081615", color: "#f2ede2" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => { setForgotMode(false); setForgotStatus(null); }} style={{ background: "transparent", border: "1px solid #16302d", color: "#f2ede2", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>رجوع لتسجيل الدخول</button>
                      <button type="submit" disabled={loading} style={{ background: "#c9a961", border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
                        {loading ? "جارِ الإرسال..." : "إرسال الرابط"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h3 style={{ margin: "0 0 15px", color: "#c9a961", fontSize: "18px" }}>
                    {authMode === "login" ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
                  </h3>

                  {loginError && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "10px", background: "rgba(255,107,107,0.1)", padding: "8px", borderRadius: "6px" }}>{loginError}</div>}

                  <form onSubmit={handleAuthSubmit}>
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        placeholder="name@example.com"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #16302d", background: "#081615", color: "#f2ede2" }}
                      />
                    </div>
                    <div style={{ marginBottom: authMode === "login" ? "6px" : "12px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>كلمة المرور</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #16302d", background: "#081615", color: "#f2ede2" }}
                      />
                    </div>

                    {authMode === "login" && (
                      <div style={{ textAlign: "left", marginBottom: "14px" }}>
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); setLoginError(""); }}
                          style={{ background: "none", border: "none", color: "#c9a961", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 }}
                        >
                          نسيت كلمة المرور؟
                        </button>
                      </div>
                    )}

                    {authMode === "login" && (
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", marginBottom: "20px", cursor: "pointer", opacity: 0.85 }}>
                        <input
                          type="checkbox"
                          checked={rememberEmail}
                          onChange={(e) => setRememberEmail(e.target.checked)}
                          style={{ width: "14px", height: "14px", accentColor: "#c9a961" }}
                        />
                        تذكر إيميلي على هذا الجهاز
                      </label>
                    )}

                    {authMode === "signup" && (
                      <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", marginBottom: "20px", cursor: "pointer", opacity: 0.85, lineHeight: 1.5 }}>
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          style={{ width: "14px", height: "14px", accentColor: "#c9a961", marginTop: "2px" }}
                        />
                        <span>
                          أوافق على{" "}
                          <button
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            style={{ background: "none", border: "none", color: "#c9a961", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: "12px", padding: 0 }}
                          >
                            سياسة الخصوصية وشروط الاستخدام
                          </button>
                        </span>
                      </label>
                    )}

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={closeAuthModal} style={{ background: "transparent", border: "1px solid #16302d", color: "#f2ede2", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>إلغاء</button>
                      <button type="submit" disabled={loading} style={{ background: "#c9a961", border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
                        {loading ? "..." : (authMode === "login" ? "دخول" : "إنشاء الحساب")}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {showPrivacyModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #c9a961", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "500px", color: "#f2ede2", maxHeight: "80vh", overflowY: "auto" }}>
              <h3 style={{ margin: "0 0 15px", color: "#c9a961", fontSize: "20px" }}>سياسة الخصوصية وشروط الاستخدام</h3>

              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                في خزنتي، نؤمن أن بياناتك المالية شخصية، لذلك نحرص على التعامل معها بمسؤولية وحمايتها أثناء استخدامك للمنصة.
              </p>

              <h4 style={{ margin: "0 0 8px", color: "#c9a961", fontSize: "15px" }}>الخصوصية وحماية البيانات</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "10px" }}>
                نجمع البيانات التي نحتاجها لتشغيل حسابك وتقديم خدمات خزنتي، مثل بيانات الحساب والحركات المالية التي تختار إضافتها.
              </p>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                نستخدم هذه البيانات لتشغيل المنصة، حفظ معلوماتك، وتحسين تجربة الاستخدام. لا نبيع بياناتك الشخصية أو المالية، ولا نشاركها إلا عند الحاجة لتقديم وتشغيل الخدمة أو عندما يكون ذلك مطلوبًا قانونيًا.
              </p>

              <h4 style={{ margin: "0 0 8px", color: "#c9a961", fontSize: "15px" }}>ملكية بياناتك وحقوقك</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "10px" }}>
                بياناتك المالية تخصك، والقرار فيها إلك وحدك.
              </p>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "10px" }}>
                خزنتي بتخزّن بياناتك وبتعالجها عشان تساعدك تدير أموالك وتتابعها، لكنها ما بتبيع بياناتك المالية أو بتتعامل معها كأنها ملك إلها.
              </p>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "10px" }}>
                من حسابك، ممكن بأي وقت تصدير حركاتك المالية باستخدام خيار «تصدير Excel»، أو حذف بياناتك المالية من إعدادات الحساب، حسب الخيارات المتاحة في المنصة.
              </p>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                بياناتك إلك، وخزنتي بس بتساعدك تديرها.
              </p>

              <h4 style={{ margin: "0 0 8px", color: "#c9a961", fontSize: "15px" }}>أمان البيانات</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                نتخذ إجراءات تقنية وتنظيمية مناسبة للمساعدة في حماية بياناتك من الوصول أو الاستخدام غير المصرح به. ومع ذلك، لا يمكن ضمان أمان أي خدمة إلكترونية بشكل كامل.
              </p>

              <h4 style={{ margin: "0 0 8px", color: "#c9a961", fontSize: "15px" }}>مسؤولية المستخدم</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "10px" }}>
                تقع مسؤولية صحة البيانات المُدخلة والحفاظ على سرية بيانات تسجيل الدخول الخاصة بالحساب على المستخدم.
              </p>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                تعتمد دقة المعلومات والمؤشرات التي تعرضها خزنتي على البيانات التي يتم إدخالها وتحديثها في حسابك.
              </p>

              <h4 style={{ margin: "0 0 8px", color: "#c9a961", fontSize: "15px" }}>استخدام خزنتي</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                خزنتي هي أداة تساعد على تنظيم ومتابعة الأموال والتدفقات النقدية، وليست بنكًا أو مؤسسة مالية، ولا تقدم استشارات مالية أو استثمارية أو قانونية.
              </p>

              <h4 style={{ margin: "0 0 8px", color: "#c9a961", fontSize: "15px" }}>التحديثات</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9, marginBottom: "18px" }}>
                قد يتم تحديث هذه السياسة من وقت لآخر بما يتناسب مع تطور خدمات خزنتي أو المتطلبات القانونية. سيتم نشر النسخة المحدثة على هذه الصفحة.
              </p>

              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9 }}>
                استخدام منصة خزنتي يعني الموافقة على هذه السياسة وعلى استخدام المنصة وفقًا للشروط الموضحة فيها.
              </p>

              <p style={{ fontSize: "11px", opacity: 0.6, marginTop: "14px" }}>
                تاريخ التحديث: ١٩-٩-٢٠٢٦
              </p>

              <div style={{ textAlign: "left", marginTop: "20px" }}>
                <button onClick={() => setShowPrivacyModal(false)} style={{ background: "#c9a961", border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
              </div>
            </div>
          </div>
        )}

        {showContactModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "linear-gradient(135deg, #0d211f, #081615)", border: "1px solid #c9a961", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "380px", color: "#f2ede2" }}>
              <h3 style={{ margin: "0 0 6px", color: "#c9a961" }}>للتواصل معنا</h3>
              <p style={{ fontSize: "12.5px", opacity: 0.75, margin: "0 0 20px" }}>نسعد بتواصلك معنا لأي استفسار أو اقتراح</p>

              <div style={{ background: "#081615", border: "1px solid #16302d", borderRadius: "12px", padding: "14px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", opacity: 0.6 }}>البريد الإلكتروني</span>
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f2ede2", fontWeight: 700, fontSize: "14px", marginRight: "auto", textDecoration: "none" }}>{CONTACT_EMAIL}</a>
              </div>

              <div style={{ textAlign: "left" }}>
                <button onClick={() => setShowContactModal(false)} style={{ background: "transparent", border: "1px solid #16302d", color: "#f2ede2", padding: "8px 20px", borderRadius: "8px", cursor: "pointer" }}>إغلاق</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // شاشة مستقلة كاملة، تظهر مرة وحدة بعد تسجيل الدخول لأي مستخدم لسا
  // ما اختار نوع حسابه — قبل ما يشوف أي شي من لوحة التحكم. بتنطبق على
  // المستخدمين الجدد والحاليين اللي سجّلوا قبل هاي الميزة على حد سواء.
  if (isLoggedIn && !accountType) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: currentTheme.bg, color: currentTheme.text, fontFamily: "'Tajawal', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "380px", background: currentTheme.cardBg, border: `1px solid ${currentTheme.accent}`, borderRadius: "16px", padding: "30px", textAlign: "center" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>أهلًا فيك بخزنتي</h2>
          <p style={{ fontSize: "13px", opacity: 0.75, margin: "0 0 24px", lineHeight: 1.6 }}>
            حدّد-ي نوع حسابك عشان نظبطلك التجربة المناسبة. بتقدر-ي تبدّليه أي وقت من داخل التطبيق.
          </p>
          {error && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "14px" }}>{error}</div>}
          <button
            onClick={() => chooseAccountType("فرد")}
            style={{ display: "block", width: "100%", padding: "14px", marginBottom: "10px", borderRadius: "10px", border: `1px solid ${currentTheme.border}`, background: currentTheme.boxBg, color: currentTheme.text, fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
          >
            فرد
            <div style={{ fontWeight: 400, opacity: 0.65, fontSize: "12px", marginTop: "4px" }}>لإدارة مصاريفك ودخلك الشخصي</div>
          </button>
          <button
            onClick={() => chooseAccountType("مشروع")}
            style={{ display: "block", width: "100%", padding: "14px", borderRadius: "10px", border: `1px solid ${currentTheme.border}`, background: currentTheme.boxBg, color: currentTheme.text, fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
          >
            مشروع
            <div style={{ fontWeight: 400, opacity: 0.65, fontSize: "12px", marginTop: "4px" }}>لمتابعة المبيعات والتكلفة والربح</div>
          </button>
        </div>
      </div>
    );
  }

  const TABS_BASE = [
    { id: "transactions", label: "العمليات", icon: "chart" },
    { id: "debts", label: "الديون", icon: "scale" },
    { id: "wallets", label: "الخزائن", icon: "vault" },
    { id: "reports", label: "تقارير", icon: "report" },
    { id: "contact", label: "تواصل", icon: "mail" },
  ];
  // "المخزون" حصري لحساب "مشروع" — إضافة فوق TABS الموجودة، بدون تعديلها.
  const TABS = accountType === "مشروع"
    ? [...TABS_BASE.slice(0, 3), { id: "inventory", label: "المخزون", icon: "box" }, ...TABS_BASE.slice(3)]
    : TABS_BASE;

  const avatarInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "؟؟";

  // لو تبدّل الحساب لـ"فرد" وإحنا واقفين على تبويب "المخزون" (حصري
  // للمشروع، ما عاد ظاهر بالشريط)، منعرض تبويب "العمليات" بدله بدل ما
  // تضل الشاشة معلّقة على محتوى تبويب ما عاد موجود — بدون useEffect
  // ولا setState إضافية، مجرد قيمة محسوبة وقت الرندر.
  const currentTab = (accountType !== "مشروع" && activeTab === "inventory") ? "transactions" : activeTab;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Tajawal', sans-serif", color: currentTheme.text, padding: "24px 16px 60px", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        select option { background-color: #16302d !important; color: #f2ede2 !important; }
        /* أسهم +/- الأصلية لخانات الأرقام بتطلع خارج حدود الصندوق المدوّر
           باتجاه RTL — بنخفيها، الكتابة المباشرة بالأرقام تبقى شغالة عادي. */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        /* السبب الحقيقي لطلوع الحقول خارج حدود الكرت بعرض ضيق: خانات
           الإدخال جوا صف flex (flex:1) عندها min-width:auto افتراضيًا من
           المتصفح، يعني بترفض تصغر عن عرض محتواها/الـplaceholder — فبتدفع
           الصف كله يطلع خارج الحاوية (وبـRTL بيبين الطلوع من جهة اليسار).
           هاي القاعدة بترجّع min-width للصفر، فالعنصر يقدر يصغر مع أي عرض
           شاشة ويضل داخل حدود الكرت دايمًا. */
        input, select, textarea { min-width: 0; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* الشريط العلوي — صف واحد مرتّب: الشعار والاسم على جهة، وتجمّع
            أيقونات الحساب (فرد/مشروع، الثيم، الإشعارات، الأفاتار) على الجهة
            التانية بدل ما تكون موزّعة بصفين منفصلين. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${currentTheme.accent}`, flexShrink: 0 }}>
              <img src="/logo.png" alt="خزنتي" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>خِزنتي</h1>
          </div>

          <div style={{ display: "flex", background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: "8px", padding: "2px" }} title="تبديل نوع الحساب">
            <button
              onClick={() => setAccountType("فرد")}
              style={{ background: accountType === "فرد" ? currentTheme.accent : "transparent", color: accountType === "فرد" ? "#0e1a1a" : currentTheme.text, border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}
            >
              فرد
            </button>
            <button
              onClick={() => setAccountType("مشروع")}
              style={{ background: accountType === "مشروع" ? currentTheme.accent : "transparent", color: accountType === "مشروع" ? "#0e1a1a" : currentTheme.text, border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}
            >
              مشروع
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowThemePanel(v => !v)}
                title="اختيار لون الثيم"
                aria-label="اختيار لون الثيم"
                aria-expanded={showThemePanel}
                style={{ position: "relative", width: 24, height: 24, padding: 0, borderRadius: "50%", border: `2px solid ${currentTheme.ring}`, background: currentTheme.swatchBg, cursor: "pointer" }}
              >
                <span style={{ position: "absolute", bottom: -3, left: -3, width: 14, height: 14, borderRadius: "50%", background: currentTheme.accent, border: `2px solid ${currentTheme.swatchBg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ti-chevron-${showThemePanel ? "up" : "down"}`} style={{ fontSize: 9, color: "#1a1a1a" }}></i>
                </span>
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={openNotifPanel}
                aria-label="الإشعارات"
                aria-expanded={showNotifPanel}
                style={{ position: "relative", width: 32, height: 32, padding: 0, borderRadius: "50%", background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: currentTheme.text, cursor: "pointer" }}
              >
                <Icon name="bell" size={15} />
                {unreadDebtIds.length > 0 && (
                  <span style={{ position: "absolute", top: -3, left: -3, minWidth: 15, height: 15, borderRadius: 8, background: "#e2726b", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: `2px solid ${currentTheme.boxBg}` }}>
                    {unreadDebtIds.length}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div style={{ position: "absolute", top: 42, left: -40, minWidth: 240, maxWidth: 280, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 12, zIndex: 50, boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>الإشعارات</div>
                  {upcomingDebts.length === 0 ? (
                    <div style={{ fontSize: 11, opacity: 0.6, padding: "6px 0" }}>ما في إشعارات جديدة حاليًا.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                      {upcomingDebts.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => { setShowNotifPanel(false); setActiveTab("debts"); openSettleModal(d); }}
                          style={{ fontSize: 11, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
                        >
                          دين "{d.name}"{" "}
                          {d.diffDays < 0
                            ? `متأخر ${Math.abs(d.diffDays)} يوم`
                            : d.diffDays === 0
                            ? "مستحق اليوم"
                            : `مستحق بعد ${d.diffDays} يوم`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowAvatarMenu(v => !v)}
                aria-label="حساب المستخدم"
                aria-expanded={showAvatarMenu}
                style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: currentTheme.accent, cursor: "pointer" }}
              >
                {avatarInitials}
              </button>
              {showAvatarMenu && (
                <div style={{ position: "absolute", top: 42, left: 0, minWidth: 190, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 12, zIndex: 50, boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>مسجّل الدخول بحساب</div>
                  <div style={{ fontSize: 12, fontWeight: 700, wordBreak: "break-all", marginBottom: 10 }}>{userEmail}</div>
                  <button
                    onClick={() => { setShowAvatarMenu(false); supabase.auth.signOut(); }}
                    style={{ width: "100%", textAlign: "start", background: "none", border: "none", borderTop: `1px solid ${currentTheme.border}`, paddingTop: 10, marginBottom: 6, color: currentTheme.text, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    تسجيل الخروج
                  </button>
                  <button
                    onClick={() => { setShowAvatarMenu(false); setDeleteDataError(""); setShowDeleteDataModal(true); }}
                    style={{ width: "100%", textAlign: "start", background: "none", border: "none", color: "#ff6b6b", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    حذف كل بياناتي
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showThemePanel && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "14px 12px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 12, opacity: 0.85 }}>اختار-ي لون الثيم</div>
            <div style={{ display: "flex", justifyContent: "space-around", gap: 4 }}>
              {Object.keys(THEMES).map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => { setThemeKey(th); setShowThemePanel(false); }}
                  title={THEMES[th].name}
                  aria-label={`تغيير الألوان: ${THEMES[th].name}`}
                  aria-pressed={themeKey === th}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  <span style={{ position: "relative" }}>
                    <span style={{ display: "block", width: 26, height: 26, borderRadius: "50%", background: THEMES[th].swatchBg, border: `2px solid ${themeKey === th ? "#fff" : THEMES[th].ring}` }}></span>
                    {THEMES[th].isDefault && (
                      <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: THEMES[th].accent, color: "#1a1a1a", fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 6, whiteSpace: "nowrap" }}>افتراضي</span>
                    )}
                  </span>
                  <span style={{ fontSize: 10, color: currentTheme.text }}>{THEMES[th].name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isOnline && (
          <div style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, textAlign: "center", fontSize: 12, color: currentTheme.text }}>
            ⚠️ ما في اتصال بالإنترنت حاليًا — أي عملية جديدة (تسجيل، تعديل، حذف) ما رح تنحفظ لحد ما يرجع الاتصال.
          </div>
        )}

        {installPrompt && (
          <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.accent}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span>ثبّت-ي خزنتي على جهازك واستخدم-يها متل أي تطبيق عادي 📲</span>
            <button
              onClick={handleInstallClick}
              style={{ background: currentTheme.accent, border: "none", color: "#0e1a1a", padding: "6px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}
            >
              تثبيت
            </button>
          </div>
        )}

        {showIosInstallHint && !installPrompt && (
          <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 12, position: "relative" }}>
            <button
              onClick={() => setShowIosInstallHint(false)}
              style={{ position: "absolute", top: "6px", left: "8px", background: "none", border: "none", color: currentTheme.text, opacity: 0.6, cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              aria-label="إغلاق"
            >
              ×
            </button>
            على آيفون: اضغط-ي زر المشاركة ⬆️ واختار-ي <strong style={{ color: currentTheme.accent }}>"إضافة إلى الشاشة الرئيسية"</strong> عشان تصير خزنتي متل تطبيق عادي عندك.
          </div>
        )}

        {/* شارة تذكير الديون القريبة/المتأخرة */}
        {upcomingDebts.length > 0 && (
          <div
            onClick={() => openSettleModal(upcomingDebts[0])}
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, cursor: "pointer" }}
          >
            <span>
              دين "{upcomingDebts[0].name}"{" "}
              {upcomingDebts[0].diffDays < 0
                ? `متأخر ${Math.abs(upcomingDebts[0].diffDays)} يوم`
                : upcomingDebts[0].diffDays === 0
                ? "مستحق اليوم"
                : `مستحق بعد ${upcomingDebts[0].diffDays} يوم`}
            </span>
            <span style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37", fontWeight: 700, fontSize: 11, padding: "2px 9px", borderRadius: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
              {upcomingDebts.length}
            </span>
          </div>
        )}

        {deletedItem && (
          <div style={{ background: "#D4AF37", color: "#0e1a1a", padding: "10px 14px", borderRadius: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700 }}>
            <span>تم حذف الحركة. هل تريد التراجع؟</span>
            <button onClick={undoDelete} style={{ background: "#0e1a1a", color: "#D4AF37", border: "none", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>تراجع</button>
          </div>
        )}

        {deleteError && (
          <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid #ff6b6b", color: "#ff6b6b", padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 12, fontWeight: 700 }}>
            {deleteError}
          </div>
        )}

        <div style={{ display: "flex", background: currentTheme.boxBg, borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${currentTheme.border}` }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: currentTab === tab.id ? currentTheme.accent : "transparent", color: currentTab === tab.id ? "#0e1a1a" : currentTheme.text, fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <Icon name={tab.icon} size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* شريط أسعار صرف توضيحي — بطاقتين مدمجتين، للفرد والمشروع مع بعض، فوق كل التبويبات */}
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>دولار $</span>
              <Icon name="exchange" size={12} color={currentTheme.accent} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ opacity: 0.7 }}>بيع</span>
              <b style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>٣.٠٦</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 2 }}>
              <span style={{ opacity: 0.7 }}>شراء</span>
              <b style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>٣.٠٨</b>
            </div>
          </div>
          <div style={{ flex: 1, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>دينار د.أ</span>
              <Icon name="exchange" size={12} color={currentTheme.accent} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ opacity: 0.7 }}>بيع</span>
              <b style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>٤.٣٠</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 2 }}>
              <span style={{ opacity: 0.7 }}>شراء</span>
              <b style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>٤.٣٥</b>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 10, opacity: 0.5, marginBottom: 16 }}>آخر تحديث: اليوم ٦:٠٠ ص</div>

        {/* ============ تبويب العمليات ============ */}
        {currentTab === "transactions" && (
          <>
            <div style={{ position: "relative", background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: "18px 18px 20px", marginBottom: 16, overflow: "hidden" }}>
              <img
                src="/wallet-illustration.webp"
                alt=""
                style={{
                  position: "absolute", left: -14, top: 4, width: 172, height: "auto", opacity: 0.85,
                  filter: "brightness(0.74) saturate(1.15)",
                  maskImage: "radial-gradient(ellipse 58% 58% at 50% 50%, #000 35%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 58% 58% at 50% 50%, #000 35%, transparent 100%)",
                }}
              />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي السيولة النقدية (شيكل)</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                  ₪ {fmt(walletBalances.ILS.cash + walletBalances.ILS.bank)}
                </div>

                {trendPoints && trendPoints.length > 1 && (
                  <>
                    <div style={{ fontSize: 11, marginTop: 6, color: trendUp ? "#38a169" : "#e05a5a" }}>
                      {trendUp ? "↑" : "↓"} اتجاه آخر الحركات
                    </div>
                    <svg viewBox="0 0 100 32" width="100%" height="30" style={{ marginTop: 8 }} preserveAspectRatio="none">
                      <polyline
                        points={trendPoints.map(p => `${p.x},${p.y}`).join(" ")}
                        fill="none"
                        stroke={currentTheme.accent}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </div>

              <div style={{ position: "relative", display: "flex", gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <Icon name="bank" size={16} color={currentTheme.accent} />
                  <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 8, marginBottom: 6 }}>البنك</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>₪ {fmt(walletBalances.ILS.bank)}</div>
                </div>
                <div style={{ flex: 1, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <Icon name="wallet" size={16} color={currentTheme.accent} />
                  <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 8, marginBottom: 6 }}>النقد كاش</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>₪ {fmt(walletBalances.ILS.cash)}</div>
                </div>
              </div>

              {/* عملات تانية (دولار/دينار) — أرقام منفصلة، بدون جمعها مع الشيكل بدون تحويل واضح */}
              {["USD", "JOD"].filter(code => walletBalances[code].cash !== 0 || walletBalances[code].bank !== 0).length > 0 && (
                <div style={{ position: "relative", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${currentTheme.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
                  {["USD", "JOD"].filter(code => walletBalances[code].cash !== 0 || walletBalances[code].bank !== 0).map(code => (
                    <div key={code} style={{ fontSize: 11, opacity: 0.8, display: "flex", justifyContent: "center", gap: 10 }}>
                      <span>{CURRENCIES[code].name}:</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>كاش {CURRENCIES[code].symbol}{fmt(walletBalances[code].cash)} · بنك {CURRENCIES[code].symbol}{fmt(walletBalances[code].bank)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* إجراءات سريعة — تسجيل عملية / مصروف / دخل، بتفتح نفس نموذج
                تسجيل العملية تحت مع تحديد النوع مسبقًا. التحويل مقصود إنه
                مش هون — مكانه بس بتبويب الخزائن عشان ما يصير تكرار. */}
            {!editingTransactionId && (
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowAddTransactionForm(true)}
                  style={{ flex: 1.4, background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 12, padding: "11px 6px", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0e1a1a" strokeWidth="2.4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  تسجيل عملية
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddTransactionForm(true); setEntryType("مصروف"); const first = CATEGORIES.find(c => c.type === "مصروف"); if (first) setCategory(first.key); }}
                  style={{ flex: 1, background: "rgba(226,114,107,0.16)", border: "1px solid rgba(226,114,107,0.4)", color: "#e2726b", borderRadius: 12, padding: "11px 4px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e2726b" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6,11 12,5 18,11" /></svg>
                  مصروف
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddTransactionForm(true); setEntryType("دخل"); const first = CATEGORIES.find(c => c.type === "دخل"); if (first) setCategory(first.key); }}
                  style={{ flex: 1, background: "rgba(76,175,125,0.16)", border: "1px solid rgba(76,175,125,0.4)", color: "#4caf7d", borderRadius: 12, padding: "11px 4px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4caf7d" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="6,13 12,19 18,13" /></svg>
                  دخل
                </button>
              </div>
            )}

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div
                onClick={() => { if (!editingTransactionId) setShowAddTransactionForm(v => !v); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: editingTransactionId ? "default" : "pointer" }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{editingTransactionId ? "تعديل العملية" : "تسجيل عملية جديدة"}</div>
                  {!showAddTransactionForm && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>سجّل-ي أي مصروف أو دخل، بيتحسب فورًا برصيد الخزنة المختارة.</div>}
                </div>
                {!editingTransactionId && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={currentTheme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAddTransactionForm ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                )}
              </div>

              {(showAddTransactionForm || editingTransactionId) && (
                <div style={{ marginTop: 14 }}>
                  {error && <div style={{ color: "#ff6b6b", fontSize: "11px", marginBottom: 8 }}>{error}</div>}

                  {/* اختيار مصروف/دخل هون بيتحدد مسبقًا من أزرار الإجراءات
                      السريعة فوق (تسجيل عملية / مصروف / دخل) — ما منكرره
                      هون كمان عشان ما يصير نفس الاختيار مرتين بنفس الصفحة.
                      بيضل ظاهر وقت التعديل فقط، لو احتجنا نصحح نوع حركة
                      متسجلة غلط. */}
                  {editingTransactionId && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, background: currentTheme.cardBg, borderRadius: 8, padding: 4 }}>
                      <button
                        type="button"
                        onClick={() => { setEntryType("مصروف"); const first = CATEGORIES.find(c => c.type === "مصروف"); if (first) setCategory(first.key); }}
                        style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: entryType === "مصروف" ? "#e53e3e" : "transparent", color: entryType === "مصروف" ? "#fff" : currentTheme.text, opacity: entryType === "مصروف" ? 1 : 0.6 }}
                      >
                        مصروف
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEntryType("دخل"); const first = CATEGORIES.find(c => c.type === "دخل"); if (first) setCategory(first.key); }}
                        style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: entryType === "دخل" ? "#38a169" : "transparent", color: entryType === "دخل" ? "#fff" : currentTheme.text, opacity: entryType === "دخل" ? 1 : 0.6 }}
                      >
                        دخل
                      </button>
                    </div>
                  )}

                  {!isBizSale && !isBizPurchase && (
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="المبلغ..."
                      style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 10, boxSizing: "border-box" }}
                    />
                  )}

                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                      {CATEGORIES.filter(c => c.type === entryType).map(c => <option key={c.key} value={c.key}>{c.icon} {c.key}</option>)}
                    </select>
                    <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                      <option value="الصندوق (كاش)">الصندوق (كاش)</option>
                      <option value="حساب البنك">حساب البنك</option>
                    </select>
                  </div>

                  {isBizSale && (
                    <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                      {invActive && (
                        <select
                          value={productName}
                          onChange={(e) => {
                            setProductName(e.target.value);
                            // تعبئة تلقائية لسعر التكلفة من تكلفة المنتج الحالية —
                            // قابلة للتعديل يدويًا، وبمجرد ما تُحفظ الحركة بتصير
                            // snapshot دائم (cost_price) ما بيتغيّر لو تكلفة
                            // المنتج تغيّرت بعدين.
                            const linked = scopedProducts.find(p => p.name === e.target.value);
                            if (linked && linked.cost != null) setSaleUnitCost(String(linked.cost));
                          }}
                          style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8 }}
                        >
                          <option value="">— منتج غير مسجّل بالمخزون (اكتب-ي اسمه بالتفاصيل الإضافية) —</option>
                          {scopedProducts.map(p => <option key={p.id} value={p.name}>{p.name} (متبقي {p.quantity})</option>)}
                        </select>
                      )}
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>الكمية وسعر القطعة (بيحسبلك المجموع والربح أوتوماتيك)</div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input type="number" min="1" value={saleQty} onChange={(e) => setSaleQty(e.target.value)} placeholder="الكمية..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                        <input type="number" value={saleUnitPrice} onChange={(e) => setSaleUnitPrice(e.target.value)} placeholder="سعر بيع القطعة..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                      </div>
                      <input type="number" value={saleUnitCost} onChange={(e) => setSaleUnitCost(e.target.value)} placeholder="سعر تكلفة القطعة الواحدة (اختياري)..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.8 }}>
                        <span>إجمالي البيع: {(Number(saleQty || 0) * Number(saleUnitPrice || 0)).toFixed(2)}</span>
                        <span style={{ color: "#38a169", fontWeight: 700 }}>الربح: {((Number(saleQty || 0) * Number(saleUnitPrice || 0)) - (Number(saleQty || 0) * Number(saleUnitCost || 0))).toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button type="button" onClick={() => setIsCreditTx(false)} style={{ flex: 1, padding: 7, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", background: !isCreditTx ? currentTheme.accent : currentTheme.boxBg, color: !isCreditTx ? "#0e1a1a" : currentTheme.text }}>نقدي</button>
                        <button type="button" onClick={() => setIsCreditTx(true)} style={{ flex: 1, padding: 7, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", background: isCreditTx ? currentTheme.accent : currentTheme.boxBg, color: isCreditTx ? "#0e1a1a" : currentTheme.text }}>آجل (على الحساب)</button>
                      </div>
                      {isCreditTx && (
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6, lineHeight: 1.5 }}>هاي العملية رح تسجّل كمستحق على العميل (دين له) بدل ما تدخل الكاش فورًا — بتظهر بتبويب "الديون".</div>
                      )}
                    </div>
                  )}

                  {isBizPurchase && (
                    <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                      {invActive && (
                        <select
                          value={productName}
                          onChange={(e) => {
                            setProductName(e.target.value);
                            const linked = scopedProducts.find(p => p.name === e.target.value);
                            if (linked && linked.cost != null) setPurchaseUnitCost(String(linked.cost));
                          }}
                          style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8 }}
                        >
                          <option value="">— منتج جديد (اكتب-ي اسمه بالتفاصيل الإضافية) —</option>
                          {scopedProducts.map(p => <option key={p.id} value={p.name}>{p.name} (حاليًا {p.quantity})</option>)}
                        </select>
                      )}
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>الكمية وتكلفة القطعة (بيحسبلك المجموع أوتوماتيك)</div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input type="number" min="1" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} placeholder="الكمية..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                        <input type="number" value={purchaseUnitCost} onChange={(e) => setPurchaseUnitCost(e.target.value)} placeholder="تكلفة القطعة..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>إجمالي الشراء: {(Number(purchaseQty || 0) * Number(purchaseUnitCost || 0)).toFixed(2)}</div>
                    </div>
                  )}

                  {accountType === "مشروع" && entryType === "مصروف" && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <button type="button" onClick={() => setExpenseType("ثابت")} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: expenseType === "ثابت" ? currentTheme.accent : currentTheme.cardBg, color: expenseType === "ثابت" ? "#0e1a1a" : currentTheme.text }}>مصروف ثابت</button>
                      <button type="button" onClick={() => setExpenseType("متغير")} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: expenseType === "متغير" ? currentTheme.accent : currentTheme.cardBg, color: expenseType === "متغير" ? "#0e1a1a" : currentTheme.text }}>مصروف متغيّر</button>
                    </div>
                  )}

                  <div style={{ marginBottom: 10 }}>
                    <select value={txCurrency} onChange={(e) => setTxCurrency(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                      <option value="ILS">شيكل ₪</option>
                      <option value="USD">دولار $</option>
                      <option value="JOD">دينار د.أ</option>
                    </select>
                  </div>

                  {accountType === "مشروع" && (
                    <div style={{ marginBottom: 10 }}>
                      <button type="button" onClick={() => setShowBizExtra(v => !v)} style={{ width: "100%", background: "transparent", border: "none", color: currentTheme.accent, fontSize: 12, fontWeight: 700, textAlign: "right", padding: "6px 0", cursor: "pointer" }}>
                        {showBizExtra ? "− تفاصيل إضافية للمشروع" : "+ تفاصيل إضافية للمشروع"}
                      </button>
                      {showBizExtra && (
                        <div>
                          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="اسم المنتج / الخدمة (اختياري)..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                          <input type="text" value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} placeholder="اسم العميل أو المورّد (اختياري)..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                          <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="رقم فاتورة أو مرجع (اختياري)..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="بيان (اختياري)..."
                    style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 10, boxSizing: "border-box" }}
                  />

                  <div style={{ marginBottom: 10 }}>
                    <DatePickerSelects
                      value={transactionDate}
                      onChange={setTransactionDate}
                      theme={currentTheme}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {editingTransactionId && (
                      <button onClick={cancelEditTransaction} style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "10px 16px", borderRadius: 8, cursor: "pointer" }}>إلغاء</button>
                    )}
                    <button onClick={addTransaction} disabled={savingTransaction} style={{ flex: 1, background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: "10px", borderRadius: 8, fontWeight: "bold", cursor: savingTransaction ? "default" : "pointer", opacity: savingTransaction ? 0.6 : 1 }}>
                      {savingTransaction ? "جارِ الحفظ..." : (editingTransactionId ? "تحديث العملية" : "حفظ العملية")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "stretch" }}>
              {/* مخطط الدخل والمصروف — آخر ٤ أشهر */}
              <div style={{ flex: 1, minWidth: 0, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: "14px 10px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>الدخل والمصروف</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 72, fontSize: 7, opacity: 0.5, textAlign: "left", fontFamily: "'IBM Plex Mono', monospace" }}>
                    <span>{monthlyBarChart.maxLabel}</span>
                    <span>{monthlyBarChart.midLabel}</span>
                    <span>0</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: 4, height: 90, borderInlineEnd: `1px solid ${currentTheme.border}`, paddingInlineEnd: 6 }}>
                    {monthlyBarChart.bars.map((m) => (
                      <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 72 }}>
                          <div style={{ width: 6, borderRadius: "3px 3px 0 0", background: "#4caf7d", height: m.incomeH }}></div>
                          <div style={{ width: 6, borderRadius: "3px 3px 0 0", background: "#d68a3f", height: m.expenseH }}></div>
                        </div>
                        <span style={{ fontSize: 8, opacity: 0.6 }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10, fontSize: 9 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: "#4caf7d", display: "inline-block" }}></span>دخل</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: "#d68a3f", display: "inline-block" }}></span>مصروف</span>
                </div>
              </div>

              {/* مخطط المصاريف حسب الفئة — دونات مضغوطة مع نسبة بالمنتصف */}
              <div style={{ flex: 1, minWidth: 0, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ alignSelf: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>المصاريف حسب الفئة</div>
                  <div style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>هذا الشهر</div>
                </div>
                {categoryDonut.length === 0 ? (
                  <div style={{ fontSize: 10.5, opacity: 0.6, textAlign: "center", padding: "16px 0" }}>لا توجد مصاريف بعد.</div>
                ) : (
                  <>
                    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0, marginBottom: 10 }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: `conic-gradient(from 0deg, ${categoryDonut.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(", ")})`,
                      }}></div>
                      <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: currentTheme.boxBg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{categoryDonut[0].percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
                      {categoryDonut.slice(0, 3).map((s) => (
                        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }}></span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.key}</span>
                          <span style={{ marginInlineStart: "auto", fontFamily: "'IBM Plex Mono', monospace", opacity: 0.75, flexShrink: 0 }}>{s.percentage.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* تفاصيل الفئات — كل فئة على حدة بشريط تقدّم، تفصيل أدق من الدونات فوق */}
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="chart" size={14} /> تفاصيل المصاريف حسب الفئة
              </div>
              {categoryBreakdown.length === 0 ? (
                <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: 10 }}>لا توجد مصاريف مسجلة بعد.</div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {visibleCategories.map(cat => (
                      <div key={cat.key} style={{ fontSize: "11px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span>{cat.icon} {cat.key}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{fmt(cat.catTotal)} ({cat.percentage.toFixed(0)}%)</span>
                        </div>
                        <div style={{ width: "100%", background: currentTheme.cardBg, height: 6, borderRadius: 3, overflow: "hidden", border: `1px solid ${currentTheme.border}` }}>
                          <div style={{ width: `${cat.percentage}%`, background: currentTheme.accent, height: "100%", transition: "width 0.3s ease" }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {categoryBreakdown.length > 5 && (
                    <button
                      onClick={() => setShowAllCategories(v => !v)}
                      style={{ width: "100%", background: "transparent", border: "none", borderTop: `1px solid ${currentTheme.border}`, color: currentTheme.accent, fontSize: 11, fontWeight: 700, padding: "10px 0 0", marginTop: 10, cursor: "pointer" }}
                    >
                      {showAllCategories ? "إخفاء الفئات الإضافية ↑" : `عرض كل الفئات (${categoryBreakdown.length}) ↓`}
                    </button>
                  )}
                </>
              )}
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>سجل الحركات</div>
                <button
                  onClick={exportToCSV}
                  style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.accent, padding: "4px 10px", borderRadius: 8, fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Icon name="download" size={12} /> تصدير Excel
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الحركات..."
                style={{ width: "100%", padding: "8px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 10, boxSizing: "border-box", fontSize: "12px" }}
              />

              <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
                {["الكل", "دخل", "مصروف", "هالشهر"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTransactionFilter(f)}
                    style={{
                      flexShrink: 0,
                      background: transactionFilter === f ? currentTheme.accent : currentTheme.cardBg,
                      color: transactionFilter === f ? "#0e1a1a" : currentTheme.text,
                      border: `1px solid ${currentTheme.border}`,
                      fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 20, cursor: "pointer",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {scopedTransactions.length === 0 ? (
                  <div style={{ fontSize: 11.5, opacity: 0.7, textAlign: "center", padding: "18px 10px", lineHeight: 1.8 }}>
                    خزنتك لسا فاضية 💼<br />سجّل-ي أول عملية دخل أو مصروف عشان تبلش-ي تشوف-ي رصيدك يتحرك.
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: 10 }}>ما في نتائج مطابقة.</div>
                ) : (
                  filteredTransactions.map(t => {
                    const isReturn = t.return_of_transaction_id != null;
                    const isIncome = !isReturn && (t.type === "دخل" || t.type === "مبيعات");
                    const isExpense = !isReturn && (t.type === "مصروف" || t.type === "شراء");
                    const isTransfer = !isReturn && t.type === "تحويل";
                    const iconColor = isReturn ? "#e2726b" : isIncome ? "#4caf7d" : isExpense ? "#e2726b" : currentTheme.accent;
                    const iconBg = isReturn ? "rgba(226,114,107,0.14)" : isIncome ? "rgba(76,175,125,0.14)" : isExpense ? "rgba(226,114,107,0.14)" : "rgba(201,169,97,0.14)";
                    const amountColor = isReturn ? "#e2726b" : isIncome ? "#4caf7d" : isExpense ? "#e2726b" : currentTheme.accent;
                    // المرتجع مخزّن بمبلغ سالب أصلًا (عكس القيد الأصلي) — هون بس
                    // عرض، ما منلمس القيمة ولا منضيف إشارة "+" فوقها (كانت
                    // طالعة "+ ₪ -80.00" مربكة). بيانه بيبان بعلامة "مرتجع" +
                    // أيقونة رجوع مميزة، والرقم نفسه بإشارته السالبة الطبيعية.
                    const displayAmount = (t.currency || "ILS") === "ILS" ? Number(t.amount) * exchangeRate : Number(t.amount);
                    const sign = isReturn ? "" : isIncome ? "+ " : isExpense ? "- " : "";
                    const dt = new Date(t.date);
                    const dateLabel = isNaN(dt) ? t.date : `${dt.getDate()} ${ARABIC_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
                    return (
                      <div key={t.id} style={{ background: currentTheme.cardBg, padding: "10px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 9, fontSize: "12px" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg }}>
                          {isReturn && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,14 4,9 9,4" /><path d="M4 9h11a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5H9" /></svg>
                          )}
                          {isIncome && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6,11 12,5 18,11" /></svg>
                          )}
                          {isExpense && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="6,13 12,19 18,13" /></svg>
                          )}
                          {isTransfer && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round"><polyline points="17,1 21,5 17,9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7,23 3,19 7,15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                          )}
                          {!isReturn && !isIncome && !isExpense && !isTransfer && <Icon name="wallet" size={15} color={iconColor} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}>
                            {t.category}
                            {isReturn && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#e2726b", background: "rgba(226,114,107,0.14)", padding: "1px 6px", borderRadius: 8, flexShrink: 0 }}>مرتجع</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.account}</div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: currentTheme.accent, opacity: 0.85, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{dateLabel}</div>
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 12.5, color: amountColor, whiteSpace: "nowrap" }}>
                          {sign}{CURRENCIES[t.currency || "ILS"].symbol} {fmt(displayAmount)}
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => startEditTransaction(t)} style={{ background: "transparent", border: "none", color: currentTheme.accent, cursor: "pointer", padding: 4, display: "flex" }} title="تعديل الحركة">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          </button>
                          <button onClick={() => removeTransaction(t.id)} style={{ background: "transparent", border: "none", color: "#e2726b", cursor: "pointer", padding: 4, display: "flex" }} title="حذف الحركة">
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* ============ تبويب الديون ============ */}
        {currentTab === "debts" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>إدارة الديون والذمم</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>لما يستحق دين، اضغط-ي ⚙ إجراء بجنبه لتحصيله/تسديده أو تأجيله لتاريخ تاني.</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button
                onClick={() => setShowAddDebtModal(true)}
                style={{ background: "#D4AF37", color: "#16302d", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "12px" }}
              >
                + إضافة دين جديد
              </button>
            </div>

            {typeof Notification !== "undefined" && notifyPermission === "default" && (
              <div style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 12, padding: "10px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 11.5 }}>
                <span>فعّل-ي التنبيهات عشان نذكّرك لما يستحق دين.</span>
                <button
                  onClick={requestDebtNotifications}
                  style={{ background: "#D4AF37", border: "none", color: "#16302d", padding: "6px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}
                >
                  تفعيل
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {scopedDebts.filter((d) => !d.paid).length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center", padding: "20px 0" }}>لا توجد ديون مسجلة حالياً.</div>
              ) : (
                scopedDebts.filter((d) => !d.paid).map((d) => {
                  let dueBadge = null;
                  if (d.due_date) {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const due = new Date(d.due_date); due.setHours(0,0,0,0);
                    const diffDays = Math.round((due - today) / (1000*60*60*24));
                    if (diffDays < 0) dueBadge = { text: `متأخر ${Math.abs(diffDays)} يوم`, color: "#e05a5a", bg: "rgba(224,90,90,0.15)" };
                    else if (diffDays === 0) dueBadge = { text: "مستحق اليوم", color: "#e05a5a", bg: "rgba(224,90,90,0.15)" };
                    else if (diffDays <= 3) dueBadge = { text: `مستحق بعد ${diffDays} يوم`, color: "#D4AF37", bg: "rgba(212,175,55,0.15)" };
                  }
                  const paidAmt = Number(d.paid_amount || 0);
                  const remaining = Math.max(0, Number(d.amount) - paidAmt);
                  const symbol = CURRENCIES[d.currency || "ILS"].symbol;
                  const toDisplay = (v) => ((d.currency || "ILS") === "ILS" ? v * exchangeRate : v).toFixed(2);
                  // نستثني الحركة الأصلية (أصل الدين) من كشف الحساب — هاي
                  // مش دفعة، هاي العملية يلي أنشأت الدين أصلًا.
                  const payments = scopedTransactions.filter(t => t.linked_debt_id === d.id && t.id !== d.source_transaction_id);
                  return (
                    <div key={d.id} style={{ background: currentTheme.cardBg, padding: 12, borderRadius: 12, color: currentTheme.text }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{d.name}</div>
                        <div style={{ fontSize: "11px", opacity: 0.7 }}>{d.type === "دين له" ? "دين لنا (على الآخرين)" : "دين علينا (للآخرين)"}</div>
                        {d.due_date && (
                          <div style={{ fontSize: "10px", opacity: 0.6, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                            موعد الاستحقاق: {d.due_date}
                          </div>
                        )}
                        {dueBadge && (
                          <div style={{ fontSize: 10, marginTop: 5, padding: "2px 8px", borderRadius: 20, display: "inline-block", color: dueBadge.color, background: dueBadge.bg }}>
                            {dueBadge.text}
                          </div>
                        )}
                        {paidAmt > 0 && (
                          <div style={{ fontSize: 10, marginTop: 5, color: currentTheme.accent }}>
                            مدفوع جزئيًا: {symbol}{toDisplay(paidAmt)} — متبقي {symbol}{toDisplay(remaining)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: d.type === "دين له" ? "#38a169" : "#e53e3e" }}>
                          {symbol} {toDisplay(remaining)}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openSettleModal(d)}
                            title="تحصيل، تسديد، أو تأجيل"
                            style={{ background: "rgba(56,161,105,0.15)", border: "1px solid rgba(56,161,105,0.4)", cursor: "pointer", padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#38a169", fontSize: 10.5, fontWeight: 700 }}
                          >
                            ⚙ إجراء
                          </button>
                          <button
                            onClick={() => removeDebt(d.id)}
                            title="حذف الدين"
                            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff6b6b" }}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </div>
                      </div>
                      {payments.length > 0 && (
                        <div style={{ marginTop: 8, borderTop: `1px solid ${currentTheme.border}`, paddingTop: 6 }}>
                          <button onClick={() => setExpandedDebtId(v => v === d.id ? null : d.id)} style={{ background: "none", border: "none", color: currentTheme.accent, fontSize: 10.5, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                            {expandedDebtId === d.id ? "إخفاء كشف الحساب ↑" : `كشف الحساب (${payments.length} دفعة) ↓`}
                          </button>
                          {expandedDebtId === d.id && (
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                              {payments.map(p => (
                                <div key={p.id} style={{ fontSize: 10.5, display: "flex", justifyContent: "space-between", opacity: 0.8 }}>
                                  <span>{p.date}</span>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{CURRENCIES[p.currency || "ILS"].symbol}{Number(p.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {scopedDebts.some((d) => d.paid) && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => setShowPaidDebts((v) => !v)}
                  style={{ background: "none", border: "none", color: currentTheme.accent, fontSize: 11.5, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 }}
                >
                  {showPaidDebts ? "إخفاء الديون المسددة" : `عرض الديون المسددة (${scopedDebts.filter((d) => d.paid).length})`}
                </button>

                {showPaidDebts && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {scopedDebts.filter((d) => d.paid).map((d) => (
                      <div key={d.id} style={{ background: currentTheme.cardBg, padding: 10, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.55 }}>
                        <div style={{ fontSize: 12 }}>{d.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{CURRENCIES[d.currency || "ILS"].symbol} {((d.currency || "ILS") === "ILS" ? Number(d.amount) * exchangeRate : Number(d.amount)).toFixed(2)}</span>
                          <button
                            onClick={() => removeDebt(d.id)}
                            title="حذف نهائي"
                            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff6b6b" }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {settlingDebt && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, padding: 20, borderRadius: 16, width: "90%", maxWidth: "380px", color: currentTheme.text }}>

              {settleModalMode === "choose" && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>دين "{settlingDebt.name}"</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 18 }}>
                    متبقي <strong style={{ color: currentTheme.accent }}>{CURRENCIES[settlingDebt.currency || "ILS"].symbol} {((settlingDebt.currency || "ILS") === "ILS" ? Math.max(0, Number(settlingDebt.amount) - Number(settlingDebt.paid_amount || 0)) * exchangeRate : Math.max(0, Number(settlingDebt.amount) - Number(settlingDebt.paid_amount || 0))).toFixed(2)}</strong>
                    {Number(settlingDebt.paid_amount || 0) > 0 && <> (من أصل {CURRENCIES[settlingDebt.currency || "ILS"].symbol} {((settlingDebt.currency || "ILS") === "ILS" ? Number(settlingDebt.amount) * exchangeRate : Number(settlingDebt.amount)).toFixed(2)})</>}
                    {" "}— شو بدك تعمل-ي؟
                  </div>

                  <button
                    onClick={() => setSettleModalMode("settle")}
                    style={{ width: "100%", background: "rgba(56,161,105,0.15)", border: "1px solid rgba(56,161,105,0.4)", color: "#38a169", padding: "12px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, marginBottom: 10 }}
                  >
                    {settlingDebt.type === "دين له" ? "✓ تحصيل الدين الآن" : "✓ تسديد الدين الآن"}
                  </button>
                  <button
                    onClick={() => setSettleModalMode("postpone")}
                    style={{ width: "100%", background: "rgba(212,175,55,0.12)", border: `1px solid ${currentTheme.accent}`, color: currentTheme.accent, padding: "12px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, marginBottom: 16 }}
                  >
                    🕒 تأجيل لتاريخ تاني
                  </button>

                  <div style={{ textAlign: "left" }}>
                    <button onClick={() => setSettlingDebt(null)} style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>إلغاء</button>
                  </div>
                </>
              )}

              {settleModalMode === "settle" && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    {settlingDebt.type === "دين له" ? "تأكيد تحصيل الدين" : "تأكيد تسديد الدين"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 12 }}>
                    هيك رح تنسجل {settlingDebt.type === "دين له" ? "كحركة دخل" : "كحركة مصروف"} باسم "{settlingDebt.name}" — تقدر-ي تدفع-ي كامل المتبقي أو دفعة جزئية.
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                      المبلغ (المتبقي: {CURRENCIES[settlingDebt.currency || "ILS"].symbol} {((settlingDebt.currency || "ILS") === "ILS" ? Math.max(0, Number(settlingDebt.amount) - Number(settlingDebt.paid_amount || 0)) * exchangeRate : Math.max(0, Number(settlingDebt.amount) - Number(settlingDebt.paid_amount || 0))).toFixed(2)})
                    </label>
                    <input
                      type="number"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 12, display: "block", marginBottom: 6 }}>من/إلى أي خزنة؟</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setSettleAccount("الصندوق (كاش)")}
                        style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${currentTheme.border}`, background: settleAccount === "الصندوق (كاش)" ? currentTheme.accent : "transparent", color: settleAccount === "الصندوق (كاش)" ? "#0e1a1a" : currentTheme.text, fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        الكاش
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettleAccount("حساب البنك")}
                        style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${currentTheme.border}`, background: settleAccount === "حساب البنك" ? currentTheme.accent : "transparent", color: settleAccount === "حساب البنك" ? "#0e1a1a" : currentTheme.text, fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        البنك
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setSettleModalMode("choose")} style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>رجوع</button>
                    <button onClick={settleDebt} disabled={settlingInProgress} style={{ background: "#38a169", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: settlingInProgress ? "default" : "pointer", opacity: settlingInProgress ? 0.6 : 1 }}>
                      {settlingInProgress ? "جارِ التنفيذ..." : "تأكيد"}
                    </button>
                  </div>
                </>
              )}

              {settleModalMode === "postpone" && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>تأجيل موعد الاستحقاق</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
                    اختار-ي تاريخ استحقاق جديد لدين "{settlingDebt.name}" — بدون ما تنسجل أي حركة مالية.
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <DatePickerSelects value={postponeDate} onChange={setPostponeDate} theme={currentTheme} />
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setSettleModalMode("choose")} style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>رجوع</button>
                    <button onClick={postponeDebtDate} disabled={postponingInProgress} style={{ background: currentTheme.accent, border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: postponingInProgress ? "default" : "pointer", opacity: postponingInProgress ? 0.6 : 1 }}>
                      {postponingInProgress ? "جارِ التأجيل..." : "تأجيل"}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* ============ تبويب الخزائن ============ */}
        {currentTab === "wallets" && (
          <div>
            <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي الخزائن (شيكل)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
                ₪ {(walletBalances.ILS.cash + walletBalances.ILS.bank).toFixed(2)}
              </div>
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>إدارة الخزائن والحسابات</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 16 }}>كل خزنة (كاش/بنك) رصيدها منفصل — اختار-يها لما تسجّل-ي عملية عشان الحساب يضل مضبوط.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: currentTheme.cardBg, padding: 14, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="wallet" size={15} color="#D4AF37" /> الكاش (شيكل)
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.7 }}>المحفظة النقدية اليومية</div>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#D4AF37", fontSize: "15px" }}>
                    ₪ {walletBalances.ILS.cash.toFixed(2)}
                  </span>
                </div>

                <div style={{ background: currentTheme.cardBg, padding: 14, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="bank" size={15} color="#D4AF37" /> الحساب البنكي (شيكل)
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.7 }}>الرصيد المحول في البنك</div>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#D4AF37", fontSize: "15px" }}>
                    ₪ {walletBalances.ILS.bank.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* إضافة جديدة: أرصدة حقيقية منفصلة لكل عملة، فوق ما هو موجود أصلًا أعلاه */}
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>أرصدتك حسب العملة</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 16 }}>لكل عملة رصيد كاش وبنك حقيقي مستقل، بدون أي تحويل بينهم.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.keys(CURRENCIES).map((code) => (
                  <div key={code} style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{CURRENCIES[code].name} {CURRENCIES[code].symbol}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>كاش: <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{CURRENCIES[code].symbol}{walletBalances[code].cash.toFixed(2)}</span></span>
                      <span>بنك: <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{CURRENCIES[code].symbol}{walletBalances[code].bank.toFixed(2)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${currentTheme.border}` }}>
                <span>المجموع التقريبي (محوّل لشيكل)</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: currentTheme.accent }}>₪{walletTotalInILS.toFixed(2)}</span>
              </div>
            </div>

            {/* إضافة جديدة: تحويل داخلي بين الكاش والبنك بنفس العملة */}
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>تحويل بين الكاش والبنك</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 14 }}>تحويل داخلي بنفس العملة — ما بيُحسب دخل ولا مصروف ولا بيأثر على أي تقرير ربح.</div>
              {transferMessage && <div style={{ fontSize: 11, color: transferMessage.includes("نجاح") ? "#48bb78" : "#ff6b6b", marginBottom: 10 }}>{transferMessage}</div>}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setTransferDirection("toBank")}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: transferDirection === "toBank" ? currentTheme.accent : currentTheme.cardBg, color: transferDirection === "toBank" ? "#0e1a1a" : currentTheme.text }}
                >
                  كاش ← بنك
                </button>
                <button
                  onClick={() => setTransferDirection("toCash")}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: transferDirection === "toCash" ? currentTheme.accent : currentTheme.cardBg, color: transferDirection === "toCash" ? "#0e1a1a" : currentTheme.text }}
                >
                  بنك ← كاش
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="المبلغ..."
                  style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}
                />
                <select value={transferCurrency} onChange={(e) => setTransferCurrency(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                  <option value="ILS">شيكل ₪</option>
                  <option value="USD">دولار $</option>
                  <option value="JOD">دينار د.أ</option>
                </select>
              </div>
              <button onClick={handleTransfer} disabled={transferSaving} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: "10px", borderRadius: 8, fontWeight: "bold", cursor: transferSaving ? "default" : "pointer", opacity: transferSaving ? 0.6 : 1 }}>
                {transferSaving ? "جارِ التحويل..." : "تنفيذ التحويل"}
              </button>
            </div>

            {/* رصيد افتتاحي — لمشروع/حساب قائم مسبقًا وعنده أصلًا كاش أو بنك،
                بدون ما يُحسب دخل أو يدخل أي تقرير ربح. */}
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>تسجيل رصيد افتتاحي</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 14 }}>عندك أصلًا كاش أو بنك قبل ما تبلّش-ي تستخدم-ي خزنتي؟ سجّل-يه هون — بيدخل برصيدك الحقيقي بس ما بيُحسب دخل ولا بيدخل أي تقرير ربح أو نقطة تعادل.</div>
              {openingMessage && <div style={{ fontSize: 11, color: openingMessage.includes("فشل") ? "#ff6b6b" : "#48bb78", marginBottom: 10 }}>{openingMessage}</div>}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setOpeningAccountType("cash")}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: openingAccountType === "cash" ? currentTheme.accent : currentTheme.cardBg, color: openingAccountType === "cash" ? "#0e1a1a" : currentTheme.text }}
                >
                  كاش
                </button>
                <button
                  onClick={() => setOpeningAccountType("bank")}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: openingAccountType === "bank" ? currentTheme.accent : currentTheme.cardBg, color: openingAccountType === "bank" ? "#0e1a1a" : currentTheme.text }}
                >
                  بنك
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="المبلغ..."
                  style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}
                />
                <select value={openingCurrency} onChange={(e) => setOpeningCurrency(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                  <option value="ILS">شيكل ₪</option>
                  <option value="USD">دولار $</option>
                  <option value="JOD">دينار د.أ</option>
                </select>
              </div>
              <button onClick={handleOpeningBalance} disabled={openingSaving} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: "10px", borderRadius: 8, fontWeight: "bold", cursor: openingSaving ? "default" : "pointer", opacity: openingSaving ? 0.6 : 1 }}>
                {openingSaving ? "جارِ الحفظ..." : "تسجيل الرصيد الافتتاحي"}
              </button>
            </div>
          </div>
        )}

        {/* ============ تبويب المخزون (حصري لحساب مشروع) ============ */}
        {currentTab === "inventory" && (
          <div>
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>تفعيل تتبع المخزون</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>اختياري — شراء البضاعة نفسه بيصير من هون (إضافة للمخزون)، مش عملية منفصلة.</div>
                </div>
                <button
                  onClick={() => setInvOn(v => !v)}
                  style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: invActive ? currentTheme.accent : currentTheme.cardBg, position: "relative", cursor: "pointer", flexShrink: 0 }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#f2ede2", position: "absolute", top: 3, [invActive ? "left" : "right"]: 3, transition: "left 0.15s, right 0.15s" }}></div>
                </button>
              </div>
            </div>

            {invActive && (
              <>
                {invMessage && (
                  <div style={{ fontSize: 11, color: currentTheme.accent, marginBottom: 10, textAlign: "center" }}>{invMessage}</div>
                )}

                <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>منتجاتك</div>
                  {scopedProducts.length === 0 ? (
                    <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: 10 }}>لا يوجد منتجات مسجّلة بعد.</div>
                  ) : (
                    scopedProducts.map((p) => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${currentTheme.border}`, fontSize: 12 }}>
                        <span>{p.name}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: Number(p.quantity) <= 3 ? "#e53e3e" : currentTheme.text }}>
                          {p.quantity} قطعة {Number(p.quantity) <= 3 && "⚠"}
                        </span>
                      </div>
                    ))
                  )}

                  <button onClick={() => setShowInvAddForm(v => !v)} style={{ width: "100%", background: "transparent", border: "none", color: currentTheme.accent, fontSize: 12, fontWeight: 700, textAlign: "right", padding: "10px 0 6px", cursor: "pointer" }}>
                    {showInvAddForm ? "− تسجيل شراء / إضافة للمخزون" : "+ تسجيل شراء / إضافة للمخزون"}
                  </button>
                  {showInvAddForm && (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="اسم المنتج..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                        <input type="number" value={invQty} onChange={(e) => setInvQty(e.target.value)} placeholder="الكمية المشتراة..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                      </div>
                      <input type="number" value={invCost} onChange={(e) => setInvCost(e.target.value)} placeholder="سعر تكلفة القطعة الواحدة (لحساب الربح وقت البيع)..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                      <input type="text" value={invSupplier} onChange={(e) => setInvSupplier(e.target.value)} placeholder="اسم المورّد (اختياري)..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <button onClick={() => setInvPaymentMode("cash")} style={{ flex: 1, padding: 7, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 10.5, cursor: "pointer", background: invPaymentMode === "cash" ? currentTheme.accent : currentTheme.cardBg, color: invPaymentMode === "cash" ? "#0e1a1a" : currentTheme.text }}>نقدي</button>
                        <button onClick={() => setInvPaymentMode("credit")} style={{ flex: 1, padding: 7, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 10.5, cursor: "pointer", background: invPaymentMode === "credit" ? currentTheme.accent : currentTheme.cardBg, color: invPaymentMode === "credit" ? "#0e1a1a" : currentTheme.text }}>آجل (على الحساب)</button>
                        <button onClick={() => setInvPaymentMode("opening")} style={{ flex: 1, padding: 7, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 10.5, cursor: "pointer", background: invPaymentMode === "opening" ? currentTheme.accent : currentTheme.cardBg, color: invPaymentMode === "opening" ? "#0e1a1a" : currentTheme.text }}>رصيد افتتاحي</button>
                      </div>
                      {invPaymentMode === "opening" && (
                        <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 8, lineHeight: 1.5 }}>مخزون موجود أصلًا عندك قبل ما تبلّش-ي تستخدم-ي خزنتي — بيضاف للكمية بس، بدون أي أثر على الكاش أو التقارير.</div>
                      )}
                      {invPaymentMode === "cash" && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <select value={invAccountType} onChange={(e) => setInvAccountType(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                            <option value="cash">كاش</option>
                            <option value="bank">بنك</option>
                          </select>
                          <select value={invCurrency} onChange={(e) => setInvCurrency(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                            <option value="ILS">شيكل ₪</option>
                            <option value="USD">دولار $</option>
                            <option value="JOD">دينار د.أ</option>
                          </select>
                        </div>
                      )}
                      <button onClick={handleInvAdd} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: 10, borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>تسجيل الشراء وإضافته للمخزون</button>
                    </div>
                  )}

                  <button onClick={() => setShowInvAdjustForm(v => !v)} style={{ width: "100%", background: "transparent", border: "none", color: currentTheme.accent, fontSize: 12, fontWeight: 700, textAlign: "right", padding: "10px 0 6px", cursor: "pointer" }}>
                    {showInvAdjustForm ? "− تعديل كمية / تسجيل هدر" : "+ تعديل كمية / تسجيل هدر"}
                  </button>
                  {showInvAdjustForm && (
                    <div>
                      <select value={invAdjustProduct} onChange={(e) => setInvAdjustProduct(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8 }}>
                        <option value="">— اختار-ي المنتج —</option>
                        {scopedProducts.map(p => <option key={p.id} value={p.name}>{p.name} (حاليًا {p.quantity})</option>)}
                      </select>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input type="number" value={invAdjustQty} onChange={(e) => setInvAdjustQty(e.target.value)} placeholder="الكمية (سالبة للهدر)..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                        <input type="text" value={invAdjustReason} onChange={(e) => setInvAdjustReason(e.target.value)} placeholder="السبب (هدر، تلف، جرد...)..." style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }} />
                      </div>
                      <button onClick={handleInvAdjust} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: 10, borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>تسجيل التعديل</button>
                    </div>
                  )}

                  <button onClick={() => setShowInvReturnForm(v => !v)} style={{ width: "100%", background: "transparent", border: "none", color: currentTheme.accent, fontSize: 12, fontWeight: 700, textAlign: "right", padding: "10px 0 6px", cursor: "pointer" }}>
                    {showInvReturnForm ? "− تسجيل مرتجع من عميل" : "+ تسجيل مرتجع من عميل"}
                  </button>
                  {showInvReturnForm && (
                    <div>
                      <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 8, lineHeight: 1.5 }}>اختار-ي عملية البيع الأصلية. الكمية والمبلغ بيرجعوا تلقائيًا، وما بتقدر-ي ترجع-ي أكثر من الكمية المتبقية.</div>
                      <select value={invReturnTxId} onChange={(e) => {
                        setInvReturnTxId(e.target.value);
                        const tx = scopedTransactions.find(t => t.id === Number(e.target.value));
                        if (tx) {
                          const returned = scopedTransactions.filter(rt => rt.return_of_transaction_id === tx.id).reduce((sum, rt) => sum + Math.abs(Number(rt.quantity) || 0), 0);
                          setInvReturnQty(String(Math.max(0, Number(tx.quantity) - returned)));
                        } else {
                          setInvReturnQty("");
                        }
                      }} style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8 }}>
                        <option value="">— اختار-ي عملية البيع —</option>
                        {scopedTransactions.filter(t => t.category === "مبيعات" && (t.type === "دخل" || t.type === "مبيعات") && Number(t.quantity) > 0).map(t => {
                          const returned = scopedTransactions.filter(rt => rt.return_of_transaction_id === t.id).reduce((sum, rt) => sum + Math.abs(Number(rt.quantity) || 0), 0);
                          const remaining = Number(t.quantity) - returned;
                          if (remaining <= 0) return null;
                          return (
                            <option key={t.id} value={t.id}>{t.product_name || "بدون منتج"} — متبقي {remaining} من أصل {t.quantity} — {t.date}</option>
                          );
                        })}
                      </select>
                      <input type="number" value={invReturnQty} onChange={(e) => setInvReturnQty(e.target.value)} placeholder="الكمية المرتجعة..." style={{ width: "100%", padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 8, boxSizing: "border-box" }} />
                      <button onClick={handleInvReturn} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: 10, borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>تسجيل المرتجع</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ============ تبويب تقارير ============ */}
        {currentTab === "reports" && (
          <div>
            <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: currentTheme.accent, marginBottom: 2 }}>تقارير شهرية وسنوية</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>لمحة سريعة على وضعك المالي عبر الوقت.</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={exportToCSV} style={{ background: "transparent", border: "none", color: currentTheme.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="download" size={12} /> تصدير Excel
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, background: currentTheme.boxBg, borderRadius: 8, padding: 4, border: `1px solid ${currentTheme.border}` }}>
              <button onClick={() => setReportPeriod("month")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: reportPeriod === "month" ? currentTheme.accent : "transparent", color: reportPeriod === "month" ? "#0e1a1a" : currentTheme.text }}>شهري</button>
              <button onClick={() => setReportPeriod("year")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: reportPeriod === "year" ? currentTheme.accent : "transparent", color: reportPeriod === "year" ? "#0e1a1a" : currentTheme.text }}>سنوي</button>
            </div>

            {accountType === "مشروع" && (
              <div>
                <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>لوحة سريعة — {reportPeriod === "month" ? "هذا الشهر" : "هذه السنة"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    {(() => {
                      const r = reportPeriod === "month" ? bizMonthlyReport : bizYearlyReport;
                      return (
                        <>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>المبيعات</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#38a169" }}>₪{r.revenue.toFixed(2)}</div>
                          </div>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>المصاريف</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#e53e3e" }}>₪{(r.cogs + r.fixedExpenses + r.variableExpenses).toFixed(2)}</div>
                          </div>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>صافي الربح</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: r.netProfit >= 0 ? "#38a169" : "#e53e3e" }}>₪{r.netProfit.toFixed(2)}</div>
                          </div>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>الكاش (شيكل)</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>₪{walletBalances.ILS.cash.toFixed(2)}</div>
                          </div>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>البنك (شيكل)</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>₪{walletBalances.ILS.bank.toFixed(2)}</div>
                          </div>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>مستحق لي (عملاء)</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#38a169" }}>₪{receivablesPayables.owedToMe.toFixed(2)}</div>
                          </div>
                          <div style={{ background: currentTheme.cardBg, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>مستحق عليّ (موردين)</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#e53e3e" }}>₪{receivablesPayables.owedByMe.toFixed(2)}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>تقرير الأرباح والخسائر</div>
                  {(() => {
                    const r = reportPeriod === "month" ? bizMonthlyReport : bizYearlyReport;
                    const row = (label, value, color) => (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "7px 0", borderBottom: `1px solid ${currentTheme.border}` }}>
                        <span>{label}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value >= 0 ? "+ " : "− "}₪{Math.abs(value).toFixed(2)}</span>
                      </div>
                    );
                    return (
                      <>
                        {row("إجمالي المبيعات", r.revenue, "#38a169")}
                        {row("تكلفة البضاعة المباعة", -r.cogs, "#e53e3e")}
                        {r.otherIncome > 0 && row("دخل آخر", r.otherIncome, "#38a169")}
                        {row("مصاريف ثابتة", -r.fixedExpenses, "#e53e3e")}
                        {row("مصاريف متغيّرة", -r.variableExpenses, "#e53e3e")}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, paddingTop: 12, marginTop: 4 }}>
                          <span>صافي الربح</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: r.netProfit >= 0 ? "#38a169" : "#e53e3e" }}>₪{r.netProfit.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>نقطة التعادل</div>
                  {(() => {
                    const r = reportPeriod === "month" ? bizMonthlyReport : bizYearlyReport;
                    if (r.breakEven === null) {
                      return <div style={{ fontSize: 11, opacity: 0.6 }}>لسا ما في مبيعات كافية لحساب نقطة التعادل.</div>;
                    }
                    return (
                      <>
                        <div style={{ textAlign: "center", padding: "10px 0" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>₪{r.breakEven.toFixed(2)}</div>
                          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>قيمة مبيعات لازم توصلها {reportPeriod === "month" ? "هالشهر" : "هالسنة"} عشان تغطي مصاريفك الثابتة</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 10, borderTop: `1px solid ${currentTheme.border}` }}>
                          <span>مصاريف ثابتة</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>₪{r.fixedExpenses.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6 }}>
                          <span>هامش المساهمة</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(r.contributionMargin * 100).toFixed(0)}٪</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {jobProfits.length > 0 && (
                  <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>ربح حسب الطلبية / المرجع</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 10 }}>مبني على رقم الفاتورة/المرجع يلي بتحطيه وقت تسجيل العمليات.</div>
                    {jobProfits.map((j) => (
                      <div key={j.invoice} style={{ padding: "8px 0", borderBottom: `1px solid ${currentTheme.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12 }}>
                          <span>{j.invoice}</span>
                          <span style={{ color: j.profit >= 0 ? "#38a169" : "#e53e3e", fontFamily: "'IBM Plex Mono', monospace" }}>{j.profit >= 0 ? "ربح" : "خسارة"} ₪{Math.abs(j.profit).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {accountType !== "مشروع" && reportPeriod === "month" && (
            <>
            <div style={{ fontSize: 12, fontWeight: 900, color: currentTheme.accent, margin: "0 0 10px" }}>التقرير الشهري</div>

            {!monthlyReport ? (
              <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.8 }}>
                  لسا ما في تقرير 📊<br />سجّل-ي أول عملية دخل أو مصروف عشان يبدأ تقريرك الشهري يتكوّن.
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  background: currentTheme.cardBg,
                  border: monthlyReport.main.inProgress ? `1px dashed ${currentTheme.accent}` : `1px solid ${currentTheme.accent}`,
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: monthlyReport.secondary ? 12 : 0,
                }}>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    {monthlyReport.main.inProgress && (
                      <div style={{ display: "inline-block", fontSize: 10, color: currentTheme.accent, background: "rgba(201,169,97,0.12)", padding: "2px 10px", borderRadius: 20, marginBottom: 8 }}>
                        لسا الشهر ماشي
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, opacity: 0.75, marginBottom: 6 }}>
                      {monthlyReport.main.inProgress ? `رصيدك تحرّك هيك لحد هلق بـ${monthlyReport.main.monthName}` : `رصيدك تحرّك هيك بـ${monthlyReport.main.monthName}`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={monthlyReport.main.balanceChange >= 0 ? "#38a169" : "#e53e3e"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        {monthlyReport.main.balanceChange >= 0 ? (
                          <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6,11 12,5 18,11" /></>
                        ) : (
                          <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="6,13 12,19 18,13" /></>
                        )}
                      </svg>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 800, color: monthlyReport.main.balanceChange >= 0 ? "#38a169" : "#e53e3e" }}>
                        {currencySymbol}{Math.abs(monthlyReport.main.balanceChange).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div style={{ height: 1, background: currentTheme.border, marginBottom: 14 }}></div>

                  {monthlyReport.main.topCategory && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, background: currentTheme.boxBg, borderRadius: 14, padding: 12, marginBottom: (monthlyReport.owedToMe > 0 || monthlyReport.owedByMe > 0) ? 10 : 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(212,175,55,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                        {monthlyReport.main.topCategory.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>
                          {monthlyReport.main.inProgress ? "أكتر شي صرفت-يه لحد هلق" : "أكتر شي صرفت-ي عليه"}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>{monthlyReport.main.topCategory.key}</div>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 12.5, color: currentTheme.accent }}>
                          {currencySymbol}{monthlyReport.main.topCategory.amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>{monthlyReport.main.topCategory.percentage.toFixed(0)}٪ من مصاريفك</div>
                      </div>
                    </div>
                  )}

                  {(monthlyReport.owedToMe > 0 || monthlyReport.owedByMe > 0) && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {monthlyReport.owedToMe > 0 && (
                        <div style={{ flex: 1, background: currentTheme.boxBg, borderRadius: 14, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>لسا متبقي إلك</div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 13, color: "#38a169" }}>
                            {currencySymbol}{monthlyReport.owedToMe.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {monthlyReport.owedByMe > 0 && (
                        <div style={{ flex: 1, background: currentTheme.boxBg, borderRadius: 14, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>لسا متبقي عليك</div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 13, color: "#e53e3e" }}>
                            {currencySymbol}{monthlyReport.owedByMe.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {monthlyReport.secondary && (
                  <div style={{ background: currentTheme.boxBg, border: `1px dashed ${currentTheme.border}`, borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: currentTheme.accent, marginBottom: 2 }}>لسا الشهر ماشي</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>وين واصل رصيدك بـ{monthlyReport.secondary.monthName} لحد هلق</div>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 800, color: monthlyReport.secondary.balanceChange >= 0 ? "#38a169" : "#e53e3e" }}>
                      {currencySymbol}{Math.abs(monthlyReport.secondary.balanceChange).toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
            </>
            )}

            {accountType !== "مشروع" && reportPeriod === "year" && (
            <>
            <div style={{ fontSize: 12, fontWeight: 900, color: currentTheme.accent, margin: "20px 0 10px" }}>التقرير السنوي</div>

            {!yearlyReport ? (
              <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.8 }}>
                  لسا ما في تقرير سنوي — رح يبين أول ما تتسجّل حركات هالسنة.
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  background: currentTheme.cardBg,
                  border: yearlyReport.main.inProgress ? `1px dashed ${currentTheme.accent}` : `1px solid ${currentTheme.accent}`,
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: yearlyReport.secondary ? 12 : 0,
                }}>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    {yearlyReport.main.inProgress && (
                      <div style={{ display: "inline-block", fontSize: 10, color: currentTheme.accent, background: "rgba(201,169,97,0.12)", padding: "2px 10px", borderRadius: 20, marginBottom: 8 }}>
                        لسا السنة ماشية
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, opacity: 0.75, marginBottom: 6 }}>
                      {yearlyReport.main.inProgress ? `رصيدك تحرّك هيك لحد هلق بسنة ${yearlyReport.main.year}` : `رصيدك تحرّك هيك بسنة ${yearlyReport.main.year}`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={yearlyReport.main.balanceChange >= 0 ? "#38a169" : "#e53e3e"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        {yearlyReport.main.balanceChange >= 0 ? (
                          <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6,11 12,5 18,11" /></>
                        ) : (
                          <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="6,13 12,19 18,13" /></>
                        )}
                      </svg>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 800, color: yearlyReport.main.balanceChange >= 0 ? "#38a169" : "#e53e3e" }}>
                        {currencySymbol}{Math.abs(yearlyReport.main.balanceChange).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {yearlyReport.main.topCategory && (
                    <>
                      <div style={{ height: 1, background: currentTheme.border, marginBottom: 14 }}></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, background: currentTheme.boxBg, borderRadius: 14, padding: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(212,175,55,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                          {yearlyReport.main.topCategory.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>
                            {yearlyReport.main.inProgress ? "أكتر شي صرفت-يه لحد هلق" : "أكتر شي صرفت-ي عليه"}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 12.5 }}>{yearlyReport.main.topCategory.key}</div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 12.5, color: currentTheme.accent }}>
                            {currencySymbol}{yearlyReport.main.topCategory.amount.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.6 }}>{yearlyReport.main.topCategory.percentage.toFixed(0)}٪ من مصاريفك</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {yearlyReport.secondary && (
                  <div style={{ background: currentTheme.boxBg, border: `1px dashed ${currentTheme.border}`, borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: currentTheme.accent, marginBottom: 2 }}>لسا السنة ماشية</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>وين واصل رصيدك بسنة {yearlyReport.secondary.year} لحد هلق</div>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 800, color: yearlyReport.secondary.balanceChange >= 0 ? "#38a169" : "#e53e3e" }}>
                      {currencySymbol}{Math.abs(yearlyReport.secondary.balanceChange).toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
            </>
            )}
          </div>
        )}

        {/* ============ تبويب تواصل ============ */}
        {currentTab === "contact" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>للتواصل معنا</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>عندك سؤال أو اقتراح؟ تواصل-ي معنا مباشرة من هون.</div>
            </div>

            <a href={`mailto:${CONTACT_EMAIL}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="mail" size={18} color="#D4AF37" />
                <div>
                  <div style={{ fontSize: 10.5, opacity: 0.6 }}>البريد الإلكتروني</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{CONTACT_EMAIL}</div>
                </div>
              </div>
            </a>
          </div>
        )}

        {showDeleteDataModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ background: currentTheme.boxBg, border: "1px solid #ff6b6b", padding: 22, borderRadius: 16, width: "90%", maxWidth: "380px", color: currentTheme.text }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: "#ff6b6b" }}>حذف كل بياناتي نهائيًا</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.8, opacity: 0.9, marginBottom: 16 }}>
                هاد الإجراء بيمسح <strong>كل حركاتك وديونك المسجّلة</strong> نهائيًا من خزنتي، بدون رجعة. حساب الدخول (الإيميل) بيضل موجود، بس فاضي من أي بيانات. بعد الحذف رح تنسجّل-ي خروج تلقائيًا.
              </p>

              {deleteDataError && <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 12, background: "rgba(255,107,107,0.1)", padding: 8, borderRadius: 6 }}>{deleteDataError}</div>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowDeleteDataModal(false)}
                  disabled={deletingData}
                  style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "8px 16px", borderRadius: 8, cursor: deletingData ? "default" : "pointer", opacity: deletingData ? 0.6 : 1 }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteAllData}
                  disabled={deletingData}
                  style={{ background: "#ff6b6b", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: deletingData ? "default" : "pointer", opacity: deletingData ? 0.7 : 1 }}
                >
                  {deletingData ? "جارِ الحذف..." : "تأكيد الحذف نهائيًا"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddDebtModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, padding: 20, borderRadius: 16, width: "90%", maxWidth: "400px", color: currentTheme.text }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 15 }}>إضافة دين جديد</div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, display: "block", marginBottom: 5 }}>اسم الشخص / الجهة</label>
                <input
                  type="text"
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="أدخل-ي الاسم..."
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, display: "block", marginBottom: 5 }}>المبلغ</label>
                <input
                  type="number"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, display: "block", marginBottom: 5 }}>العملة</label>
                <select
                  value={debtCurrency}
                  onChange={(e) => setDebtCurrency(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}
                >
                  <option value="ILS">شيكل ₪</option>
                  <option value="USD">دولار $</option>
                  <option value="JOD">دينار د.أ</option>
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, display: "block", marginBottom: 5 }}>موعد الاستحقاق (اختياري)</label>
                <DatePickerSelects
                  value={debtDueDate}
                  onChange={setDebtDueDate}
                  theme={currentTheme}
                />
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ fontSize: 12, display: "block", marginBottom: 5 }}>نوع الدين</label>
                <select
                  value={debtType}
                  onChange={(e) => setDebtType(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}
                >
                  <option value="دين له">دين له (فلوس لي عند الناس)</option>
                  <option value="دين عليه">دين عليه (فلوس للناس عندي)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowAddDebtModal(false)}
                  style={{ background: "transparent", color: currentTheme.text, border: `1px solid ${currentTheme.border}`, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveDebt}
                  disabled={savingDebt}
                  style={{ background: "#D4AF37", color: "#16302d", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: savingDebt ? "default" : "pointer", opacity: savingDebt ? 0.6 : 1 }}
                >
                  {savingDebt ? "جارِ الحفظ..." : "حفظ الدين"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}