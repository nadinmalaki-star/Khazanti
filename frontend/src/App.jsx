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

const CURRENCIES = {
  ILS: { symbol: "₪", name: "شيكل", rate: 1 },
  USD: { symbol: "$", name: "دولار", rate: 0.27 },
  JOD: { symbol: "د.أ", name: "دينار", rate: 0.19 },
};

const THEMES = {
  emerald: {
    name: "أخضر مصرفي",
    bg: "radial-gradient(1000px 600px at 50% -10%, #163430 0%, #0e1a1a 55%)",
    cardBg: "linear-gradient(135deg, #1b3936, #16302d)",
    boxBg: "#16302d",
    border: "#274442",
    accent: "#c9a961",
    text: "#f2ede2",
  },
  navy: {
    name: "أزرق كلاسيكي",
    bg: "radial-gradient(1000px 600px at 50% -10%, #1a2536 0%, #0e141a 55%)",
    cardBg: "linear-gradient(135deg, #1e2d42, #162030)",
    boxBg: "#162030",
    border: "#2a3b52",
    accent: "#60a5fa",
    text: "#f0f4f8",
  },
  gold: {
    name: "ذهبي ملكي",
    bg: "radial-gradient(1000px 600px at 50% -10%, #302616 0%, #1a150e 55%)",
    cardBg: "linear-gradient(135deg, #392f1b, #302616)",
    boxBg: "#302616",
    border: "#4d4027",
    accent: "#fbbf24",
    text: "#fef3c7",
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
  "Email not confirmed": "يجب تأكيد بريدك الإلكتروني أولاً، تحققي من صندوق الوارد.",
  "Unable to validate email address: invalid format": "صيغة البريد الإلكتروني غير صحيحة.",
};
function translateAuthError(message) {
  return AUTH_ERROR_TRANSLATIONS[message] || message;
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
    default:
      return null;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState(null); // { type: "success" | "error", text }

  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("طعام ومشروبات");
  const [selectedAccount, setSelectedAccount] = useState("الصندوق (كاش)");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [themeKey, setThemeKey] = useState("emerald");
  const [activeTab, setActiveTab] = useState("transactions");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const [deletedItem, setDeletedItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtType, setDebtType] = useState("دين له");
  const [debtDueDate, setDebtDueDate] = useState("");

  const [settlingDebt, setSettlingDebt] = useState(null);
  const [settleModalMode, setSettleModalMode] = useState("choose"); // "choose" | "settle" | "postpone"
  const [settleAccount, setSettleAccount] = useState("الصندوق (كاش)");
  const [postponeDate, setPostponeDate] = useState("");
  const [showPaidDebts, setShowPaidDebts] = useState(false);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user?.email || "");
        fetchData();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setUserEmail(session.user?.email || "");
        fetchData();
      } else {
        setIsLoggedIn(false);
        setUserEmail("");
        setTransactions([]);
        setDebts([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const exchangeRate = CURRENCIES[currency].rate;
  const currencySymbol = CURRENCIES[currency].symbol;

  const cashBalance = useMemo(
    () =>
      transactions
        .filter((t) => !t.account || t.account === "الصندوق (كاش)")
        .reduce((sum, t) => {
          if (t.type === "دخل" || t.type === "مبيعات") return sum + Number(t.amount);
          if (t.type === "مصروف" || t.type === "شراء") return sum - Number(t.amount);
          return sum;
        }, 0) * exchangeRate,
    [transactions, exchangeRate]
  );

  const bankBalance = useMemo(
    () =>
      transactions
        .filter((t) => t.account === "حساب البنك")
        .reduce((sum, t) => {
          if (t.type === "دخل" || t.type === "مبيعات") return sum + Number(t.amount);
          if (t.type === "مصروف" || t.type === "شراء") return sum - Number(t.amount);
          return sum;
        }, 0) * exchangeRate,
    [transactions, exchangeRate]
  );

  const totalBalance = cashBalance + bankBalance;

  // اتجاه الرصيد آخر أيام (Sparkline) — بيظهر بس لو في بيانات كافية
  const trendPoints = useMemo(() => {
    if (transactions.length < 2) return null;
    const byDate = {};
    transactions.forEach((t) => {
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
  }, [transactions]);

  const trendUp = trendPoints && trendPoints.length > 1
    ? trendPoints[trendPoints.length - 1].raw >= trendPoints[0].raw
    : null;

  // الديون القريبة أو المتأخرة (لعرض شارة التذكير)
  const upcomingDebts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return debts
      .filter((d) => d.due_date && !d.paid)
      .map((d) => {
        const due = new Date(d.due_date);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
        return { ...d, diffDays };
      })
      .filter((d) => d.diffDays <= 3)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [debts]);

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
          body: `دين "${d.name}" (${Number(d.amount).toFixed(2)}) ${d.diffDays < 0 ? "متأخر" : "مستحق اليوم"}. اضغطي لتحصيله/تسديده أو لتأجيله.`,
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

  // مخطط المصاريف حسب الفئة — مرتب تنازليًا، بيستبعد الفئات الصفرية
  const categoryBreakdown = useMemo(() => {
    const allExpensesTotal = transactions
      .filter((t) => t.type === "مصروف" || t.type === "شراء")
      .reduce((sum, t) => sum + Number(t.amount), 0) * exchangeRate;

    return CATEGORIES.filter((c) => c.type === "مصروف")
      .map((cat) => {
        const catTotal = transactions
          .filter((t) => t.category === cat.key)
          .reduce((sum, t) => sum + Number(t.amount), 0) * exchangeRate;
        const percentage = allExpensesTotal > 0 ? (catTotal / allExpensesTotal) * 100 : 0;
        return { ...cat, catTotal, percentage };
      })
      .filter((c) => c.catTotal > 0)
      .sort((a, b) => b.catTotal - a.catTotal);
  }, [transactions, exchangeRate]);

  const visibleCategories = showAllCategories ? categoryBreakdown : categoryBreakdown.slice(0, 5);

  function exportToCSV() {
    if (transactions.length === 0) {
      alert("لا توجد حركات للتصدير");
      return;
    }
    const headers = "ID,Type,Category,Account,Amount,Date\n";
    const rows = transactions.map(t => `${t.id},${t.type},${t.category},${t.account || "الصندوق (كاش)"},${t.amount},${t.date}`).join("\n");
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

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: debtData } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    setTransactions(txData || []);
    setDebts(debtData || []);
    setLoading(false);
  }

  async function addTransaction() {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("أدخلي مبلغ صحيح");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("يجب تسجيل الدخول أولاً");
      return;
    }

    const baseAmount = num / exchangeRate;
    const catObj = CATEGORIES.find(c => c.key === category);
    const finalType = catObj ? catObj.type : "مصروف";

    const newRecord = {
      type: finalType,
      amount: baseAmount,
      category,
      account: selectedAccount,
      date: transactionDate || new Date().toISOString().split("T")[0],
      user_id: user.id
    };

    const { data, error: dbError } = await supabase
      .from("transactions")
      .insert([newRecord])
      .select();

    if (dbError) {
      setError("فشل الحفظ: " + dbError.message);
    } else if (data) {
      setTransactions(prev => [data[0], ...prev]);
      setAmount("");
      setError("");
    }
  }

  async function handleSaveDebt() {
    const num = parseFloat(debtAmount);
    if (!debtName.trim() || !num || num <= 0) {
      alert("الرجاء إدخال اسم الشخص والمبلغ بشكل صحيح");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("يجب تسجيل الدخول أولاً");
      return;
    }

    const baseAmount = num / exchangeRate;
    const newDebt = {
      name: debtName,
      amount: baseAmount,
      type: debtType,
      due_date: debtDueDate || null,
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
    }
  }

  async function removeTransaction(id) {
    const itemToDelete = transactions.find(t => t.id === id);
    if (!itemToDelete) return;

    setTransactions(transactions.filter((t) => t.id !== id));
    setDeletedItem(itemToDelete);

    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(async () => {
      await supabase.from("transactions").delete().eq("id", id);
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
    const previousDebts = debts;
    setDebts(debts.filter((d) => d.id !== id));

    const { error: dbError } = await supabase.from("debts").delete().eq("id", id);

    if (dbError) {
      alert("فشل حذف الدين: " + dbError.message);
      setDebts(previousDebts);
    }
  }

  // تسوية دين: بتسجل حركة مالية فعلية (دخل لو "دين له"، مصروف لو "دين
  // عليه") وبتعلّم الدين كمسدد. مقصود إنها خطوة يدوية بتأكيد المستخدمة
  // (مش تلقائية بمجرد وصول تاريخ الاستحقاق)، لأنو وصول التاريخ ما يعني
  // بالضرورة إنو الدين انسدد فعليًا.
  async function settleDebt() {
    if (!settlingDebt) return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("يجب تسجيل الدخول أولاً");
      return;
    }

    const finalType = settlingDebt.type === "دين له" ? "دخل" : "مصروف";
    const newRecord = {
      type: finalType,
      amount: settlingDebt.amount,
      category: settlingDebt.type === "دين له" ? "دخل إضافي" : "أخرى",
      account: settleAccount,
      date: new Date().toISOString().split("T")[0],
      user_id: user.id,
    };

    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .insert([newRecord])
      .select();

    if (txError) {
      alert("فشل تسجيل الحركة: " + txError.message);
      return;
    }

    const { data: debtData, error: debtError } = await supabase
      .from("debts")
      .update({ paid: 1 }) // عمود paid رقمي (numeric) مش boolean بقاعدة البيانات
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
          " — تراجعنا عن الحركة المالية عشان الرصيد يضل صحيح. بلّغي فريق التطوير."
      );
      return;
    }

    if (txData) setTransactions((prev) => [txData[0], ...prev]);
    setDebts((prev) => prev.map((d) => (d.id === settlingDebt.id ? { ...d, paid: 1 } : d)));
    setSettlingDebt(null);
  }

  function openSettleModal(debt) {
    setSettlingDebt(debt);
    setSettleModalMode("choose");
    setSettleAccount("الصندوق (كاش)");
    setPostponeDate(debt.due_date || "");
  }

  async function postponeDebtDate() {
    if (!settlingDebt || !postponeDate) return;

    const { data: updatedRows, error: dbError } = await supabase
      .from("debts")
      .update({ due_date: postponeDate })
      .eq("id", settlingDebt.id)
      .select();

    if (dbError || !updatedRows || updatedRows.length === 0) {
      alert(
        "ما قدرنا نأجّل الدين بقاعدة البيانات" +
          (dbError ? ": " + dbError.message : " (صلاحيات RLS ناقصة)") +
          ". بلّغي فريق التطوير."
      );
      return;
    }

    setDebts((prev) => prev.map((d) => (d.id === settlingDebt.id ? { ...d, due_date: postponeDate } : d)));
    setSettlingDebt(null);
  }

  function requestDebtNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => setNotifyPermission(perm));
  }

  // تفتح المودال بوضع نظيف (تمسح أي رسالة خطأ/نجاح قديمة من فتحة سابقة)
  function openAuthModal(mode) {
    setAuthMode(mode);
    setLoginError("");
    setLoginSuccess("");
    setForgotMode(false);
    setForgotStatus(null);
    setAgreedToTerms(false);
    setShowLoginModal(true);
  }

  // تبديل بين تسجيل الدخول/حساب جديد جوا المودال المفتوح أصلاً
  function switchAuthMode(mode) {
    setAuthMode(mode);
    setLoginError("");
    setLoginSuccess("");
    setForgotMode(false);
    setForgotStatus(null);
    setAgreedToTerms(false);
  }

  function closeAuthModal() {
    setShowLoginModal(false);
    setLoginError("");
    setLoginSuccess("");
    setForgotMode(false);
    setForgotStatus(null);
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");

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

        if (data.user) {
          setLoginSuccess("تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.");
          setAuthMode("login");
          setAgreedToTerms(false);
        }
      }
    } catch (err) {
      setLoginError("حدث خطأ: " + translateAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  async function handleForgotPassword(e) {
    e.preventDefault();
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

  // الشاشة الترحيبية — بدون أي تغيير على المحتوى الأصلي، فقط إضافة "تواصل معنا"
  if (!isLoggedIn) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0e1a1a", color: "#f2ede2", fontFamily: "'Tajawal', sans-serif", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
          * { box-sizing: border-box; }
        `}</style>

        <div style={{ width: "100%", maxWidth: "900px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div style={{ background: "#16302d", border: "1px solid #274442", color: "#c9a961", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
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

        {installPrompt && (
          <div style={{ width: "100%", maxWidth: "900px", background: "#16302d", border: "1px solid #D4AF37", borderRadius: "14px", padding: "14px 20px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "#f2ede2" }}>ثبّتي خزنتي على جهازك بضغطة وحدة، واستخدميها متل أي تطبيق عادي 📲</span>
            <button
              onClick={handleInstallClick}
              style={{ background: "#D4AF37", border: "none", color: "#0e1a1a", padding: "8px 18px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
            >
              تثبيت التطبيق
            </button>
          </div>
        )}

        {showIosInstallHint && !installPrompt && (
          <div style={{ width: "100%", maxWidth: "900px", background: "#16302d", border: "1px solid #274442", borderRadius: "14px", padding: "14px 20px", marginBottom: "30px", position: "relative" }}>
            <button
              onClick={() => setShowIosInstallHint(false)}
              style={{ position: "absolute", top: "8px", left: "10px", background: "none", border: "none", color: "#f2ede2", opacity: 0.6, cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
              aria-label="إغلاق"
            >
              ×
            </button>
            <span style={{ fontSize: "13px", color: "#f2ede2" }}>
              على آيفون: اضغطي زر المشاركة <strong style={{ color: "#D4AF37" }}>⬆️</strong> بالمتصفح، وبعدين اختاري{" "}
              <strong style={{ color: "#D4AF37" }}>"إضافة إلى الشاشة الرئيسية"</strong> عشان تصير خزنتي متل تطبيق عادي عندك.
            </span>
          </div>
        )}

        <div style={{ textAlign: "center", maxWidth: "800px", marginBottom: "50px" }}>
          <div style={{ width: "110px", height: "110px", margin: "0 auto 20px", background: "linear-gradient(135deg, #1b3936, #16302d)", border: "2px solid #D4AF37", borderRadius: "28px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.6)", overflow: "hidden" }}>
            <img
              src="/logo.png"
              alt="شعار خزنتي"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h1 style={{ fontSize: "50px", fontWeight: 900, color: "#f2ede2", margin: "0 0 10px", letterSpacing: "1px" }}>خِزنتي</h1>
          <p style={{ fontSize: "18px", color: "#c9a961", fontWeight: 500, margin: 0 }}>بوابتك الذكية للتحكم المالي والأمان السحابي</p>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", background: "#16302d", border: "1px solid #274442", borderRadius: "20px", padding: "35px", marginBottom: "40px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: "12px", color: "#D4AF37", marginBottom: "8px", fontWeight: 700 }}>من نحن</div>
          <h2 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 15px" }}>أكثر من مجرد سجل مصروفات</h2>
          <p style={{ fontSize: "15px", opacity: 0.9, lineHeight: "1.8", maxWidth: "700px", margin: "0 auto", color: "#f2ede2" }}>
            "خزنتي" منصة مالية ذكية، مصممة خصيصاً لتمنح الأفراد وأصحاب الأعمال سيطرة كاملة ودقيقة على تدفقاتهم النقدية. بفضل هويته البصرية الراقية وبنيته التقنية المتقدمة، نجمع بين فخامة العمل المصرفي وسهولة التقنية الحديثة.
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", marginBottom: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#D4AF37", marginBottom: "5px", fontWeight: 700 }}>الهوية البصرية</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px" }}>لغة الألوان والرمز</h2>
            <p style={{ fontSize: "14px", color: "#c9a961", opacity: 0.9, margin: 0 }}>هوية بصرية بطابع فاخر ومصرفي — كل لون ورمز اختير ليعكس الموثوقية والأمان.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px", marginBottom: "25px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ fontSize: "17px", margin: "6px 0", color: "#f2ede2" }}>الأخضر الداكن</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>يرمز إلى المال والثروة والاستقرار المالي، ويوثّق بيئة عمل مصرفية آمنة وهادئة.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ fontSize: "17px", margin: "6px 0", color: "#f2ede2" }}>الذهبي الدافئ المصقول</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>يرمز إلى الفخامة والقيمة العالية والاحترافية، ويُستخدم لإبراز العناصر الأساسية.</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#D4AF37" }}>قرص الخزنة الدائري</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>يرمز إلى التحكم المطلق والأمان التام، خزنة حقيقية تحفظ أسرارك بعيداً عن المتطفلين.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#D4AF37" }}>سهم النمو الصاعد</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>يرمز إلى الاستثمار وتزايد الأرباح والتقدم المالي المستمر نحو الأفضل.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#D4AF37" }}>الأيقونات الداخلية</h3>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>رمز خطية نقية بلون ذهبي هادئ، تعكس الدقة والوضوح دون أي إزعاج بصري.</p>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", background: "#16302d", border: "1px solid #274442", borderRadius: "20px", padding: "35px", marginBottom: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#D4AF37", marginBottom: "5px", fontWeight: 700 }}>المرحلة الحالية</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>التأسيس الذكي والآمن</h2>
            <p style={{ fontSize: "14px", color: "#c9a961", opacity: 0.9, marginTop: "5px" }}>حجر الأساس لمنتج حقيقي يلبي الاحتياجات الأساسية بأعلى معايير الجودة والأمان.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "15px" }}>
            <div style={{ background: "#0e1a1a", border: "1px solid #274442", padding: "18px", borderRadius: "12px" }}>
              <h4 style={{ color: "#D4AF37", margin: "0 0 8px", fontSize: "15px" }}>عزل تام للبيانات</h4>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>بيئة سحابية محمية ومستقلة لكل مستخدم، تضمن سرية معلوماته المالية.</p>
            </div>
            <div style={{ background: "#0e1a1a", border: "1px solid #274442", padding: "18px", borderRadius: "12px" }}>
              <h4 style={{ color: "#D4AF37", margin: "0 0 8px", fontSize: "15px" }}>إدارة مرنة للحركات</h4>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>تسجيل المصروفات والإيرادات بسلاسة فائقة ودون تعقيد.</p>
            </div>
            <div style={{ background: "#0e1a1a", border: "1px solid #274442", padding: "18px", borderRadius: "12px" }}>
              <h4 style={{ color: "#D4AF37", margin: "0 0 8px", fontSize: "15px" }}>تصنيفات شاملة</h4>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>١١ فئة مصروف و٤ فئات دخل، تغطي كل احتياجاتك الواقعية.</p>
            </div>
            <div style={{ background: "#0e1a1a", border: "1px solid #274442", padding: "18px", borderRadius: "12px" }}>
              <h4 style={{ color: "#D4AF37", margin: "0 0 8px", fontSize: "15px" }}>تجربة ويب تقدمية (PWA)</h4>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, margin: 0, lineHeight: "1.5" }}>تطبيق سريع وخفيف يعمل من المتصفح، مع إمكانية تثبيته على شاشة الهاتف الرئيسية.</p>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: "850px", marginBottom: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#D4AF37", marginBottom: "5px", fontWeight: 700 }}>طموحات المستقبل</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>نحو آفاق مالية متقدمة</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "25px" }}>
              <div style={{ background: "#D4AF37", color: "#0e1a1a", display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 900, marginBottom: "10px" }}>المرحلة التوسعية Pro</div>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>شاشة أسعار العملات والمؤشرات المالية المباشرة، مع تقارير ورسوم بيانية تحليلية دقيقة.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "25px" }}>
              <div style={{ background: "#D4AF37", color: "#0e1a1a", display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 900, marginBottom: "10px" }}>المرحلة الاحترافية Business</div>
              <p style={{ fontSize: "13px", color: "#f2ede2", opacity: 0.9, lineHeight: "1.6", margin: 0 }}>أدوات متقدمة لإدارة السيولة والتدفقات النقدية، تلبي احتياجات التجار والمستقلين.</p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "15px" }}>تحكم بأموالك اليوم.. وابنِ مستقبلك المالي بثقة.</h2>

          <div>
            <button
              onClick={() => setShowPrivacyModal(true)}
              style={{ background: "none", border: "none", color: "#D4AF37", fontSize: "13px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
            >
              سياسة الخصوصية وشروط الاستخدام
            </button>
            <span style={{ color: "#274442", margin: "0 10px" }}>|</span>
            <button
              onClick={() => setShowContactModal(true)}
              style={{ background: "none", border: "none", color: "#D4AF37", fontSize: "13px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
            >
              تواصل-ي معنا
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", opacity: 0.6, fontSize: "12px", borderTop: "1px solid #274442", width: "100%", maxWidth: "850px", paddingTop: "20px" }}>
          KHZNTI — بوابتك الذكية للتحكم المالي والأمان السحابي<br />
          تصميم وتطوير أثر — استوديو رقمي &nbsp;|&nbsp; © 2026 أثر. جميع الحقوق محفوظة.
        </div>

        {showLoginModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#16302d", border: "1px solid #D4AF37", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "400px", color: "#f2ede2" }}>

              {!forgotMode && (
                <div style={{ display: "flex", background: "#0e1a1a", borderRadius: "10px", padding: "4px", marginBottom: "20px", border: "1px solid #274442" }}>
                  <button type="button" onClick={() => switchAuthMode("login")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: authMode === "login" ? "#D4AF37" : "transparent", color: authMode === "login" ? "#0e1a1a" : "#f2ede2", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                    تسجيل الدخول
                  </button>
                  <button type="button" onClick={() => switchAuthMode("signup")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: authMode === "signup" ? "#D4AF37" : "transparent", color: authMode === "signup" ? "#0e1a1a" : "#f2ede2", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                    حساب جديد
                  </button>
                </div>
              )}

              {forgotMode ? (
                <>
                  <h3 style={{ margin: "0 0 15px", color: "#D4AF37", fontSize: "18px" }}>استعادة كلمة المرور</h3>

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
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => { setForgotMode(false); setForgotStatus(null); }} style={{ background: "transparent", border: "1px solid #274442", color: "#f2ede2", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>رجوع لتسجيل الدخول</button>
                      <button type="submit" style={{ background: "#D4AF37", border: "none", color: "#16302d", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                        إرسال الرابط
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h3 style={{ margin: "0 0 15px", color: "#D4AF37", fontSize: "18px" }}>
                    {authMode === "login" ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
                  </h3>

                  {loginError && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "10px", background: "rgba(255,107,107,0.1)", padding: "8px", borderRadius: "6px" }}>{loginError}</div>}
                  {loginSuccess && <div style={{ color: "#48bb78", fontSize: "12px", marginBottom: "10px", background: "rgba(72,187,120,0.1)", padding: "8px", borderRadius: "6px" }}>{loginSuccess}</div>}

                  <form onSubmit={handleAuthSubmit}>
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        placeholder="name@example.com"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
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
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
                      />
                    </div>

                    {authMode === "login" && (
                      <div style={{ textAlign: "left", marginBottom: "14px" }}>
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); setLoginError(""); setLoginSuccess(""); }}
                          style={{ background: "none", border: "none", color: "#D4AF37", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 }}
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
                          style={{ width: "14px", height: "14px", accentColor: "#D4AF37" }}
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
                          style={{ width: "14px", height: "14px", accentColor: "#D4AF37", marginTop: "2px" }}
                        />
                        <span>
                          أوافق على{" "}
                          <button
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            style={{ background: "none", border: "none", color: "#D4AF37", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: "12px", padding: 0 }}
                          >
                            سياسة الخصوصية وشروط الاستخدام
                          </button>
                        </span>
                      </label>
                    )}

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={closeAuthModal} style={{ background: "transparent", border: "1px solid #274442", color: "#f2ede2", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>إلغاء</button>
                      <button type="submit" style={{ background: "#D4AF37", border: "none", color: "#16302d", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                        {authMode === "login" ? "دخول" : "إنشاء الحساب"}
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
            <div style={{ background: "#16302d", border: "1px solid #D4AF37", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "500px", color: "#f2ede2", maxHeight: "80vh", overflowY: "auto" }}>
              <h3 style={{ margin: "0 0 15px", color: "#D4AF37" }}>سياسة الخصوصية وشروط الاستخدام</h3>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9 }}>
                نحن في منصة "خزنتي" نلتزم بحماية خصوصية بياناتك المالية والشخصية بأعلى معايير الأمان والسحابة المشفرة. جميع بياناتك مفصولة تماماً ومحمية ولا يتم مشاركتها مطلقاً.
              </p>
              <div style={{ textAlign: "left", marginTop: "20px" }}>
                <button onClick={() => setShowPrivacyModal(false)} style={{ background: "#D4AF37", border: "none", color: "#16302d", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
              </div>
            </div>
          </div>
        )}

        {showContactModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#16302d", border: "1px solid #D4AF37", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "380px", color: "#f2ede2" }}>
              <h3 style={{ margin: "0 0 6px", color: "#D4AF37" }}>تواصل معنا</h3>
              <p style={{ fontSize: "12.5px", opacity: 0.75, margin: "0 0 20px" }}>نسعد بتواصلك معنا لأي استفسار أو اقتراح</p>

              <div style={{ background: "#0e1a1a", border: "1px solid #274442", borderRadius: "12px", padding: "14px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", opacity: 0.6 }}>البريد الإلكتروني</span>
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f2ede2", fontWeight: 700, fontSize: "14px", marginRight: "auto", textDecoration: "none" }}>{CONTACT_EMAIL}</a>
              </div>

              <div style={{ textAlign: "left" }}>
                <button onClick={() => setShowContactModal(false)} style={{ background: "transparent", border: "1px solid #274442", color: "#f2ede2", padding: "8px 20px", borderRadius: "8px", cursor: "pointer" }}>إغلاق</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const TABS = [
    { id: "transactions", label: "العمليات", icon: "chart" },
    { id: "debts", label: "الديون", icon: "scale" },
    { id: "wallets", label: "الخزائن", icon: "vault" },
    { id: "contact", label: "تواصل", icon: "mail" },
  ];

  const avatarInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "؟؟";

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Tajawal', sans-serif", color: currentTheme.text, padding: "24px 16px 60px", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        select option { background-color: #16302d !important; color: #f2ede2 !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* الشريط العلوي — محفوظ بالضبط زي ما كان */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => supabase.auth.signOut()}
              title="تسجيل الخروج"
              style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "6px 12px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" }}
            >
              تسجيل الخروج
            </button>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {Object.keys(THEMES).map((th) => (
                <div
                  key={th}
                  onClick={() => setThemeKey(th)}
                  title={`تغيير الألوان: ${THEMES[th].name}`}
                  style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${themeKey === th ? "#fff" : currentTheme.border}`, background: th === "emerald" ? "#163430" : th === "navy" ? "#1a2536" : "#302616", cursor: "pointer" }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {Object.keys(CURRENCIES).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                title={`عرض الأرصدة بال${CURRENCIES[curr].name}`}
                style={{ background: currency === curr ? currentTheme.accent : currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currency === curr ? "#0e1a1a" : currentTheme.text, padding: "6px 12px", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
              >
                {CURRENCIES[curr].symbol}
              </button>
            ))}
          </div>
        </div>

        {/* شعار خزنتي + الاسم + أفاتار قابل للضغط (يعرض إيميل الحساب) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${currentTheme.accent}`, flexShrink: 0 }}>
              <img src="/logo.png" alt="خزنتي" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>خِزنتي</h1>
          </div>

          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowAvatarMenu(v => !v)}
              style={{ width: 34, height: 34, borderRadius: "50%", background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: currentTheme.accent, cursor: "pointer" }}
            >
              {avatarInitials}
            </div>
            {showAvatarMenu && (
              <div style={{ position: "absolute", top: 42, left: 0, minWidth: 190, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 12, zIndex: 50, boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>مسجّلة الدخول بحساب</div>
                <div style={{ fontSize: 12, fontWeight: 700, wordBreak: "break-all" }}>{userEmail}</div>
              </div>
            )}
          </div>
        </div>

        {installPrompt && (
          <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.accent}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span>ثبّتي خزنتي على جهازك واستخدميها متل أي تطبيق عادي 📲</span>
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
            على آيفون: اضغطي زر المشاركة ⬆️ واختاري <strong style={{ color: currentTheme.accent }}>"إضافة إلى الشاشة الرئيسية"</strong> عشان تصير خزنتي متل تطبيق عادي عندك.
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

        <div style={{ display: "flex", background: currentTheme.boxBg, borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${currentTheme.border}` }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: activeTab === tab.id ? currentTheme.accent : "transparent", color: activeTab === tab.id ? "#0e1a1a" : currentTheme.text, fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <Icon name={tab.icon} size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============ تبويب العمليات ============ */}
        {activeTab === "transactions" && (
          <>
            <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي السيولة النقدية الكلية</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
                {currencySymbol} {totalBalance.toFixed(2)}
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

              <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12, fontSize: 11, opacity: 0.8 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="wallet" size={12} /> الكاش:{" "}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currencySymbol}{cashBalance.toFixed(2)}</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="bank" size={12} /> البنك:{" "}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currencySymbol}{bankBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>تسجيل عملية جديدة</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12 }}>سجّلي أي مصروف أو دخل، بيتحسب فورًا برصيد الخزنة المختارة.</div>
              {error && <div style={{ color: "#ff6b6b", fontSize: "11px", marginBottom: 8 }}>{error}</div>}

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="المبلغ..."
                style={{ width: "100%", padding: "10px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 10, boxSizing: "border-box" }}
              />

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.key}</option>)}
                </select>
                <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text }}>
                  <option value="الصندوق (كاش)">الصندوق (كاش)</option>
                  <option value="حساب البنك">حساب البنك</option>
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <DatePickerSelects
                  value={transactionDate}
                  onChange={setTransactionDate}
                  theme={currentTheme}
                />
              </div>

              <button onClick={addTransaction} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: "10px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>حفظ العملية</button>
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="chart" size={14} /> المصاريف حسب الفئة — هذا الشهر
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
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{cat.catTotal.toFixed(2)} ({cat.percentage.toFixed(0)}%)</span>
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

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {transactions.length === 0 ? (
                  <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: 10 }}>لا توجد حركات مسجلة.</div>
                ) : (
                  transactions.filter(t => t.category.includes(searchQuery) || (t.account && t.account.includes(searchQuery))).map(t => (
                    <div key={t.id} style={{ background: currentTheme.cardBg, padding: 10, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <div>
                        <span style={{ fontWeight: 700 }}>{t.category}</span>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>{t.account} · {t.date}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: t.type === "دخل" || t.type === "مبيعات" ? "#38a169" : "#e53e3e", fontWeight: "bold" }}>
                          {t.type === "دخل" || t.type === "مبيعات" ? "+" : "-"} {currencySymbol} {(Number(t.amount) * exchangeRate).toFixed(2)}
                        </span>
                        <button onClick={() => removeTransaction(t.id)} style={{ background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer", display: "flex", alignItems: "center" }} title="حذف الحركة">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ============ تبويب الديون ============ */}
        {activeTab === "debts" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>إدارة الديون والذمم</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>لما يستحق دين، اضغطي ⚙ إجراء بجنبه لتحصيله/تسديده أو تأجيله لتاريخ تاني.</div>
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
                <span>فعّلي التنبيهات عشان نذكّرك لما يستحق دين.</span>
                <button
                  onClick={requestDebtNotifications}
                  style={{ background: "#D4AF37", border: "none", color: "#16302d", padding: "6px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}
                >
                  تفعيل
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {debts.filter((d) => !d.paid).length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center", padding: "20px 0" }}>لا توجد ديون مسجلة حالياً.</div>
              ) : (
                debts.filter((d) => !d.paid).map((d) => {
                  let dueBadge = null;
                  if (d.due_date) {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const due = new Date(d.due_date); due.setHours(0,0,0,0);
                    const diffDays = Math.round((due - today) / (1000*60*60*24));
                    if (diffDays < 0) dueBadge = { text: `متأخر ${Math.abs(diffDays)} يوم`, color: "#e05a5a", bg: "rgba(224,90,90,0.15)" };
                    else if (diffDays === 0) dueBadge = { text: "مستحق اليوم", color: "#e05a5a", bg: "rgba(224,90,90,0.15)" };
                    else if (diffDays <= 3) dueBadge = { text: `مستحق بعد ${diffDays} يوم`, color: "#D4AF37", bg: "rgba(212,175,55,0.15)" };
                  }
                  return (
                    <div key={d.id} style={{ background: currentTheme.cardBg, padding: 12, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: currentTheme.text }}>
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
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: d.type === "دين له" ? "#38a169" : "#e53e3e" }}>
                          {currencySymbol} {Number(d.amount).toFixed(2)}
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
                  );
                })
              )}
            </div>

            {debts.some((d) => d.paid) && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => setShowPaidDebts((v) => !v)}
                  style={{ background: "none", border: "none", color: currentTheme.accent, fontSize: 11.5, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 }}
                >
                  {showPaidDebts ? "إخفاء الديون المسددة" : `عرض الديون المسددة (${debts.filter((d) => d.paid).length})`}
                </button>

                {showPaidDebts && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {debts.filter((d) => d.paid).map((d) => (
                      <div key={d.id} style={{ background: currentTheme.cardBg, padding: 10, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.55 }}>
                        <div style={{ fontSize: 12 }}>{d.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{currencySymbol} {Number(d.amount).toFixed(2)}</span>
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
                    بمبلغ <strong style={{ color: currentTheme.accent }}>{currencySymbol} {Number(settlingDebt.amount).toFixed(2)}</strong> — شو بدك تعملي؟
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
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
                    هيك رح تنسجل {settlingDebt.type === "دين له" ? "كحركة دخل" : "كحركة مصروف"} بمبلغ{" "}
                    <strong style={{ color: currentTheme.accent }}>{currencySymbol} {Number(settlingDebt.amount).toFixed(2)}</strong>{" "}
                    باسم "{settlingDebt.name}"، والدين رح يتعلّم مسدد.
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
                    <button onClick={settleDebt} style={{ background: "#38a169", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>تأكيد</button>
                  </div>
                </>
              )}

              {settleModalMode === "postpone" && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>تأجيل موعد الاستحقاق</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
                    اختاري تاريخ استحقاق جديد لدين "{settlingDebt.name}" — بدون ما تنسجل أي حركة مالية.
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <DatePickerSelects value={postponeDate} onChange={setPostponeDate} theme={currentTheme} />
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setSettleModalMode("choose")} style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>رجوع</button>
                    <button onClick={postponeDebtDate} style={{ background: currentTheme.accent, border: "none", color: "#0e1a1a", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>تأجيل</button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* ============ تبويب الخزائن ============ */}
        {activeTab === "wallets" && (
          <div>
            <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي كل الخزائن</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
                {currencySymbol} {totalBalance.toFixed(2)}
              </div>
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>إدارة الخزائن والحسابات</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 16 }}>كل خزنة (كاش/بنك) رصيدها منفصل — اختاريها لما تسجّلي عملية عشان الحساب يضل مضبوط.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: currentTheme.cardBg, padding: 14, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="wallet" size={15} color="#D4AF37" /> الكاش (النقد اليدوي)
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.7 }}>المحفظة النقدية اليومية</div>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#D4AF37", fontSize: "15px" }}>
                    {currencySymbol} {((cashBalance || 0)).toFixed(2)}
                  </span>
                </div>

                <div style={{ background: currentTheme.cardBg, padding: 14, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="bank" size={15} color="#D4AF37" /> الحساب البنكي
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.7 }}>الرصيد المحول في البنك</div>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#D4AF37", fontSize: "15px" }}>
                    {currencySymbol} {((bankBalance || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ تبويب تواصل ============ */}
        {activeTab === "contact" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}
              
              >تواصل-ي معنا</div>
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
                  placeholder="أدخلي الاسم..."
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
                  style={{ background: "#D4AF37", color: "#16302d", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
                >
                  حفظ الدين
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}