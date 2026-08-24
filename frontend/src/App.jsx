import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";

const CATEGORIES = [
  { key: "طعام", icon: "🍔", type: "مصروف" },
  { key: "مواصلات", icon: "🚗", type: "مصروف" },
  { key: "فواتير", icon: "📱", type: "مصروف" },
  { key: "تسوق", icon: "🛍️", type: "مصروف" },
  { key: "مشتريات بضاعة", icon: "📦", type: "مصروف" },
  { key: "أخرى", icon: "✨", type: "مصروف" },
  { key: "راتب / أرباح", icon: "💼", type: "دخل" },
  { key: "مبيعات", icon: "🏷️", type: "دخل" },
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

export default function App() {
  // حالات المصادقة والتسجيل
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // حالات التطبيق الأساسية
  const [activeTab, setActiveTab] = useState("transactions"); 
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("مبيعات");
  const [selectedAccount, setSelectedAccount] = useState("الصندوق (كاش)");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [themeKey, setThemeKey] = useState("emerald");

  const [deletedItem, setDeletedItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const [debtType, setDebtType] = useState("لي عند الناس"); 
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  const currentTheme = THEMES[themeKey];

  // مراقبة الجلسة من سحابة Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // جلب البيانات عند تسجيل الدخول بنجاح
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

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
  
  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === "دخل" || t.type === "مبيعات").reduce((s, t) => s + Number(t.amount), 0) * exchangeRate,
    [transactions, exchangeRate]
  );
  
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === "مصروف" || t.type === "شراء").reduce((s, t) => s + Number(t.amount), 0) * exchangeRate,
    [transactions, exchangeRate]
  );

  const totalDebtToMe = useMemo(
    () => debts.filter(d => d.type === "لي عند الناس").reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0) * exchangeRate,
    [debts, exchangeRate]
  );

  const totalDebtOnMe = useMemo(
    () => debts.filter(d => d.type === "عليّ للناس").reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0) * exchangeRate,
    [debts, exchangeRate]
  );

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (searchQuery.trim()) {
      result = transactions.filter(t => 
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.account && t.account.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.amount.toString().includes(searchQuery) ||
        (t.date && t.date.includes(searchQuery))
      );
    } else {
      return transactions.slice(0, 10); 
    }
    return result;
  }, [transactions, searchQuery]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    const expenseTxs = transactions.filter((t) => t.type === "مصروف" || t.type === "شراء");
    const rawExpenseTotal = expenseTxs.reduce((s, t) => s + Number(t.amount), 0);

    expenseTxs.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
    });

    return { totals, rawExpenseTotal };
  }, [transactions]);

  // دوال التعامل مع المصادقة
// دوال التعامل مع المصادقة (المُحدثة)
  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        console.log("محاولة إنشاء حساب...");
        const { data, error } = await supabase.auth.signUp({ email, password });
        console.log("نتيجة إنشاء الحساب:", { data, error });
        
        if (error) {
          setAuthError(error.message);
        } else {
          if (data.session) {
            setSession(data.session);
          } else {
            alert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.');
            setIsSignUp(false);
          }
        }
      } else {
        console.log("محاولة تسجيل الدخول...");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("نتيجة تسجيل الدخول:", { data, error });
        
        if (error) {
          setAuthError(error.message);
        } else if (data.session) {
          console.log("تم جلب الجلسة بنجاح، جاري التحديث...");
          setSession(data.session);
        } else {
          // حالة نادرة جداً إذا لم تكن الجلسة موجودة في الـ data مباشرة
          const currentSession = await supabase.auth.getSession();
          console.log("الجلسة الحالية من الـ Session:", currentSession);
          if (currentSession.data.session) {
            setSession(currentSession.data.session);
          }
        }
      }
    } catch (err) {
      console.error("خطأ غير متوقع:", err);
      setAuthError('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function fetchData() {
    setLoading(true);
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .order("id", { ascending: false });

    const { data: debtData } = await supabase
      .from("debts")
      .select("*")
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
    const baseAmount = num / exchangeRate;
    const catObj = CATEGORIES.find(c => c.key === category);
    const finalType = catObj ? catObj.type : "مصروف";
  
    // 1. إنشاء عنصر مؤقت وتحديث الواجهة فوراً لتكون الاستجابة سريعة جداً
    const tempId = Date.now();
    const newRecord = { 
      id: tempId,
      type: finalType, 
      amount: baseAmount, 
      category,
      account: selectedAccount,
      date: transactionDate || new Date().toISOString().split("T")[0]
    };
  
    setTransactions([newRecord, ...transactions]);
    setAmount("");
    setError("");
  
    // 2. إرسال البيانات للسحابة في الخلفية
    const { data, error: dbError } = await supabase
      .from("transactions")
      .insert([{ type: finalType, amount: baseAmount, category, account: selectedAccount, date: newRecord.date }])
      .select();
  
    if (dbError) {
      setError("فشل الحفظ في السحابة: " + dbError.message);
    } else if (data && data.length > 0) {
      // 3. استبدال المؤقت بالحقيقي القادم من قاعدة البيانات
      setTransactions(prev => prev.map(t => t.id === tempId ? data[0] : t));
    }
  }

  async function addDebt() {
    const num = parseFloat(debtAmount);
    if (!debtName.trim() || !num || num <= 0) return;

    const newDebt = {
      type: debtType,
      name: debtName,
      amount: num / exchangeRate,
      paid: 0,
      date: new Date().toISOString().split("T")[0],
      user_id: session?.user?.id
    };

    const { data, error } = await supabase.from("debts").insert([newDebt]).select();
    if (data && data.length > 0) {
      setDebts([data[0], ...debts]);
    }
    setDebtName("");
    setDebtAmount("");
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

  function exportCSV() {
    const headers = "التاريخ,النوع,الفئة,الحساب,المبلغ\n";
    const rows = transactions.map(t => `${t.date || ''},${t.type},${t.category},${t.account || 'الصندوق (كاش)'},${Number(t.amount) * exchangeRate}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = "khazanti_report.csv";
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  }

  // شاشة التحميل الأولية
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: currentTheme.bg, color: currentTheme.text, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Tajawal', sans-serif" }}>
        جاري التحميل...
      </div>
    );
  }

  // شاشة تسجيل الدخول
  if (!session) {
    return (
      <div dir="rtl" style={{
        minHeight: '100vh',
        background: currentTheme.bg,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Tajawal', sans-serif",
        padding: '16px',
        color: currentTheme.text
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
          * { box-sizing: border-box; }
        `}</style>
        <div style={{
          background: currentTheme.cardBg,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '20px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', color: currentTheme.accent, fontWeight: 900 }}>خِزنتي ☁️</h2>
          <p style={{ textAlign: 'center', fontSize: '12px', opacity: 0.7, marginBottom: '20px' }}>
            {isSignUp ? 'أنشئ حساباً جديداً للبدء' : 'سجل دخولك لمتابعة أعمالك'}
          </p>

          <form onSubmit={(e) => {
    console.log("تم الضغط على زر إرسال النموذج");
    handleAuth(e);
  }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div>
      <label style={{ fontSize: '11px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>البريد الإلكتروني</label>
      <input
        type="email"
        placeholder="example@domain.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{
          width: '100%',
          background: currentTheme.boxBg,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '10px',
          padding: '10px',
          color: currentTheme.text,
          fontSize: '12px'
        }}
      />
    </div>

    <div>
      <label style={{ fontSize: '11px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>كلمة المرور</label>
      <input
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{
          width: '100%',
          background: currentTheme.boxBg,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '10px',
          padding: '10px',
          color: currentTheme.text,
          fontSize: '12px'
        }}
      />
    </div>

    {authError && <div style={{ color: '#d97f6b', fontSize: '11px', textAlign: 'center' }}>{authError}</div>}

    <button
      type="submit"
      disabled={authLoading}
      style={{
        background: currentTheme.accent,
        color: '#0e1a1a',
        border: 'none',
        borderRadius: '10px',
        padding: '10px',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        marginTop: '6px'
      }}
    >
      {authLoading ? 'جاري التنفيذ...' : (isSignUp ? 'إنشاء الحساب' : 'تسجيل الدخول')}
    </button>
  </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentTheme.accent,
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // الواجهة الرئيسية للتطبيق
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Tajawal', sans-serif", color: currentTheme.text, padding: "24px 16px 60px", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        input:focus, button:focus, select:focus { outline: 2px solid ${currentTheme.accent}; outline-offset: 2px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.keys(CURRENCIES).map((curr) => (
              <button key={curr} onClick={() => setCurrency(curr)} style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${currency === curr ? currentTheme.accent : currentTheme.border}`, background: currency === curr ? currentTheme.accent : currentTheme.boxBg, color: currency === curr ? "#0e1a1a" : currentTheme.text, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                {CURRENCIES[curr].symbol}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.keys(THEMES).map((th) => (
              <button key={th} onClick={() => setThemeKey(th)} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${themeKey === th ? "#fff" : currentTheme.border}`, background: th === "emerald" ? "#163430" : th === "navy" ? "#1a2536" : "#302616", cursor: "pointer" }} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, marginBottom: 2 }}>☁️ متصل بسحابة Supabase</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>خِزنتي</h1>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }} 
            style={{ marginTop: 8, background: "transparent", border: `1px solid ${currentTheme.border}`, color: currentTheme.text, fontSize: 10, padding: "4px 10px", borderRadius: 8, cursor: "pointer" }}
          >
            تسجيل الخروج 🚪
          </button>
        </div>

        {deletedItem && (
          <div style={{ background: "#c9a961", color: "#0e1a1a", padding: "10px 14px", borderRadius: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700 }}>
            <span>تم حذف الحركة. هل تريد التراجع؟</span>
            <button onClick={undoDelete} style={{ background: "#0e1a1a", color: "#c9a961", border: "none", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>تراجع (Undo)</button>
          </div>
        )}

        <div style={{ display: "flex", background: currentTheme.boxBg, borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${currentTheme.border}` }}>
          {[
            { id: "transactions", label: "📊 العمليات" },
            { id: "debts", label: "🤝 الديون" },
            { id: "accounts", label: "🏦 الخزائن" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: activeTab === tab.id ? currentTheme.accent : "transparent", color: activeTab === tab.id ? "#0e1a1a" : currentTheme.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي السيولة النقدية الكلية</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
            {currencySymbol} {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>💵 صندوق الكاش</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ flex: 1, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>🏦 حساب البنك</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{bankBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>📈 إجمالي الوارد</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#6fbf9a", fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ flex: 1, background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>📉 إجمالي الصادر</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#d97f6b", fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {activeTab === "transactions" && (
          <>
            {categoryBreakdown.rawExpenseTotal > 0 && (
              <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 10 }}>📊 نسب المصاريف والمشتريات</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(categoryBreakdown.totals).map(([catKey, rawTotal]) => {
                    const totalInCurr = rawTotal * exchangeRate;
                    const percentage = Math.round((rawTotal / categoryBreakdown.rawExpenseTotal) * 100);
                    const catInfo = CATEGORIES.find((c) => c.key === catKey);
                    return (
                      <div key={catKey} style={{ fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span>{catInfo?.icon} {catKey}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#d97f6b", fontWeight: 600 }}>{currencySymbol}{totalInCurr.toFixed(0)} ({percentage}%)</span>
                        </div>
                        <div style={{ width: "100%", background: "#0c1a18", height: 6, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, background: "#d97f6b", height: "100%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>تسجيل حركة مالية جديدة</div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>الحساب:</div>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: "8px", color: currentTheme.text, fontSize: 12 }}
                  >
                    <option value="الصندوق (كاش)">الصندوق (كاش)</option>
                    <option value="حساب البنك">حساب البنك</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>التاريخ:</div>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: "7px 8px", color: currentTheme.text, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
              </div>

              <input type="number" inputMode="decimal" placeholder={`المبلغ بـ ${CURRENCIES[currency].name}`} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", color: currentTheme.text, fontSize: 15, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }} />

              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>اختر التصنيف:</div>
              
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#6fbf9a", fontWeight: 700, marginBottom: 4 }}>🟢 دخل:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CATEGORIES.filter(c => c.type === "دخل").map((c) => (
                    <button key={c.key} onClick={() => setCategory(c.key)} style={{ padding: "6px 10px", borderRadius: 14, border: `1px solid ${category === c.key ? currentTheme.accent : currentTheme.border}`, background: category === c.key ? currentTheme.accent : currentTheme.cardBg, color: category === c.key ? "#0e1a1a" : currentTheme.text, fontSize: 11, cursor: "pointer" }}>
                      {c.icon} {c.key}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#d97f6b", fontWeight: 700, marginBottom: 4 }}>🔴 مصروف (يشمل المشتريات):</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CATEGORIES.filter(c => c.type === "مصروف").map((c) => (
                    <button key={c.key} onClick={() => setCategory(c.key)} style={{ padding: "6px 10px", borderRadius: 14, border: `1px solid ${category === c.key ? currentTheme.accent : currentTheme.border}`, background: category === c.key ? currentTheme.accent : currentTheme.cardBg, color: category === c.key ? "#0e1a1a" : currentTheme.text, fontSize: 11, cursor: "pointer" }}>
                      {c.icon} {c.key}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: "#d97f6b", fontSize: 12, marginBottom: 8 }}>{error}</div>}

              <button onClick={addTransaction} style={{ width: "100%", background: "#6fbf9a", color: "#0e1a1a", border: "none", borderRadius: 12, padding: "10px 0", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
                ➕ حفظ الحركة في السحابة
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <input 
                type="text" 
                placeholder="🔍 ابحث في الحركات (بالتاريخ، الفئة، الحساب، أو المبلغ)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", color: currentTheme.text, fontSize: 12 }}
              />
              {!searchQuery && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "center" }}>يتم عرض آخر 10 حركات فقط لتجنب الازدحام (استخدم البحث للوصول للباقي)</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {filteredTransactions.map((t) => {
                const cat = CATEGORIES.find((c) => c.key === t.category);
                const converted = Number(t.amount) * exchangeRate;
                const isIncome = t.type === "دخل" || t.type === "مبيعات";
                const accName = t.account || "الصندوق (كاش)";
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{cat ? cat.icon : "✨"}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{t.category}</div>
                        <div style={{ fontSize: 9, opacity: 0.6, color: currentTheme.accent }}>
                          📅 {t.date || "بدون تاريخ"} | 🏦 {accName}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: isIncome ? "#6fbf9a" : "#d97f6b" }}>
                        {isIncome ? "+" : "-"}{currencySymbol}{converted.toFixed(2)}
                      </span>
                      <button onClick={() => removeTransaction(t.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={exportCSV} style={{ width: "100%", background: "transparent", color: currentTheme.accent, border: `1px solid ${currentTheme.accent}`, borderRadius: 12, padding: "8px 0", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              📊 تصدير العمليات (CSV)
            </button>
          </>
        )}

        {activeTab === "debts" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, background: currentTheme.boxBg, padding: 10, borderRadius: 10, border: `1px solid ${currentTheme.border}` }}>
                <div style={{ fontSize: 10, opacity: 0.7 }}>لي عند الناس</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#6fbf9a", fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{totalDebtToMe.toFixed(0)}</div>
              </div>
              <div style={{ flex: 1, background: currentTheme.boxBg, padding: 10, borderRadius: 10, border: `1px solid ${currentTheme.border}` }}>
                <div style={{ fontSize: 10, opacity: 0.7 }}>عليّ للناس</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#d97f6b", fontFamily: "'IBM Plex Mono', monospace" }}>{currencySymbol}{totalDebtOnMe.toFixed(0)}</div>
              </div>
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>إضافة دين جديد</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {["لي عند الناس", "عليّ للناس"].map(dt => (
                  <button key={dt} onClick={() => setDebtType(dt)} style={{ flex: 1, padding: "6px", borderRadius: 8, border: `1px solid ${debtType === dt ? currentTheme.accent : currentTheme.border}`, background: debtType === dt ? currentTheme.accent : currentTheme.cardBg, color: debtType === dt ? "#0e1a1a" : currentTheme.text, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {dt}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="اسم الشخص / الجهة" value={debtName} onChange={(e) => setDebtName(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: "8px", color: currentTheme.text, fontSize: 12, marginBottom: 8 }} />
              <input type="number" inputMode="decimal" placeholder="المبلغ" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: "8px", color: currentTheme.text, fontSize: 12, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }} />
              <button onClick={addDebt} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 10, padding: "8px 0", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>إضافة الدين</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {debts.map(d => {
                const convertedDebt = Number(d.amount) * exchangeRate;
                const isToMe = d.type === "لي عند الناس";
                return (
                  <div key={d.id} style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{d.name}</div>
                      <div style={{ fontSize: 9, color: isToMe ? "#6fbf9a" : "#d97f6b" }}>{d.type}</div>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: currentTheme.accent }}>
                      {currencySymbol}{convertedDebt.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "accounts" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🏦 إدارة الحزائن والخزائن</div>
            <p style={{ fontSize: 12, opacity: 0.7 }}>سيتم إضافة ميزات تفصيلية للحسابات المصرفية والنقدية هنا قريباً.</p>
          </div>
        )}

      </div>
    </div>
  );
}