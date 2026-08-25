import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// العملات المتاحة
const CURRENCIES = {
  ILS: { symbol: "₪", name: "شيكل", rate: 1 },
  USD: { symbol: "$", name: "دولار", rate: 0.27 },
  JOD: { symbol: "د.أ", name: "دينار", rate: 0.19 }
};

// الثيمات البصرية لتطبيق خِزنتي
const THEMES = {
  dark: {
    bg: "#08100f",
    boxBg: "#0e1a1a",
    cardBg: "#122222",
    text: "#e0f2f1",
    accent: "#c9a961",
    border: "#1f3836"
  },
  light: {
    bg: "#f4f7f6",
    boxBg: "#ffffff",
    cardBg: "#ffffff",
    text: "#1a2e2b",
    accent: "#9c7c38",
    border: "#d1dedb"
  }
};

// الفئات المتاحة للحركات المالية
const CATEGORIES = [
  { key: "راتب", type: "دخل", icon: "💰" },
  { key: "أرباح/عائدات", type: "دخل", icon: "📈" },
  { key: "تحويل وارد", type: "دخل", icon: "📥" },
  { key: "مأكل ومشرب", type: "مصروف", icon: "🛒" },
  { key: "فواتير ومرافق", type: "مصروف", icon: "💡" },
  { key: "نقل ومواصلات", type: "مصروف", icon: "🚗" },
  { key: "تسوق ومشتريات", type: "مصروف", icon: "🛍️" },
  { key: "صحة وتأمين", type: "مصروف", icon: "🏥" },
  { key: "أخرى", type: "مصروف", icon: "🏷️" }
];

export default function App() {
  // حالات المصادقة والتفضيلات
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [themeName, setThemeName] = useState("dark");
  const [currency, setCurrency] = useState("ILS");

  // التبويبات والبيانات الأساسية
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  
  // حقول إدخال الحركة الجديدة
  const [selectedAccount, setSelectedAccount] = useState("الصندوق (كاش)");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("مأكل ومشرب");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedItem, setDeletedItem] = useState(null);

  // حقول الديون
  const [debtType, setDebtType] = useState("لي عند الناس");
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  // حالة نافذة شروط الخصوصية والأحكام
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const currentTheme = THEMES[themeName];
  const currencySymbol = CURRENCIES[currency].symbol;
  const exchangeRate = CURRENCIES[currency].rate;

  // مراقبة حالة المصادقة عند التحميل
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // جلب البيانات من Supabase عند تسجيل الدخول
  useEffect(() => {
    if (session) {
      fetchTransactions();
      fetchDebts();
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) setTransactions(data);
  };

  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from('debts')
      .select('*');
    if (!error && data) setDebts(data);
  };

  // إضافة حركة جديدة
  const addTransaction = async () => {
    if (!amount || isNaN(amount)) {
      setError("الرجاء إدخال مبلغ صحيح");
      return;
    }
    setError("");
    const catObj = CATEGORIES.find(c => c.key === category);
    const type = catObj ? catObj.type : "مصروف";

    const newTx = {
      amount: parseFloat(amount),
      category,
      type,
      account: selectedAccount,
      date: transactionDate,
      user_id: session.user.id
    };

    const { data, error } = await supabase.from('transactions').insert([newTx]).select();
    if (!error && data) {
      setTransactions([data[0], ...transactions]);
      setAmount("");
    } else {
      setError("حدث خطأ أثناء حفظ الحركة في السحابة");
    }
  };

  // حذف حركة مع إمكانية التراجع
  const removeTransaction = async (id) => {
    const itemToDelete = transactions.find(t => t.id === id);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
      setDeletedItem(itemToDelete);
    }
  };

  const undoDelete = async () => {
    if (!deletedItem) return;
    const { id, ...rest } = deletedItem;
    const { data, error } = await supabase.from('transactions').insert([rest]).select();
    if (!error && data) {
      setTransactions([data[0], ...transactions]);
      setDeletedItem(null);
    }
  };

  // إضافة دين جديد
  const addDebt = async () => {
    if (!debtName || !debtAmount || isNaN(debtAmount)) return;
    const newDebt = {
      name: debtName,
      type: debtType,
      amount: parseFloat(debtAmount),
      user_id: session.user.id
    };
    const { data, error } = await supabase.from('debts').insert([newDebt]).select();
    if (!error && data) {
      setDebts([...debts, data[0]]);
      setDebtName("");
      setDebtAmount("");
    }
  };

  // تصدير الحركات إلى CSV
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + ["المعرف,التاريخ,الحساب,التنوع,النوع,المبلغ"].join(",") + "\n";
    transactions.forEach(t => {
      let row = [t.id, t.date, t.account, t.category, t.type, t.amount];
      csvContent += row.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "khazanti_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // الحسابات والملخصات المالية
  const cashBalance = transactions
    .filter(t => (t.account || "الصندوق (كاش)") === "الصندوق (كاش)")
    .reduce((acc, t) => acc + (t.type === "دخل" || t.type === "مبيعات" ? Number(t.amount) : -Number(t.amount)), 0) * exchangeRate;

  const bankBalance = transactions
    .filter(t => t.account === "حساب البنك")
    .reduce((acc, t) => acc + (t.type === "دخل" || t.type === "مبيعات" ? Number(t.amount) : -Number(t.amount)), 0) * exchangeRate;

  const totalBalance = cashBalance + bankBalance;

  const totalIncome = transactions
    .filter(t => t.type === "دخل" || t.type === "مبيعات")
    .reduce((acc, t) => acc + Number(t.amount), 0) * exchangeRate;

  const totalExpense = transactions
    .filter(t => t.type === "مصروف")
    .reduce((acc, t) => acc + Number(t.amount), 0) * exchangeRate;

  // حساب تفاصيل النسب للمصاريف
  const categoryBreakdown = (() => {
    let totals = {};
    let rawExpenseTotal = 0;
    transactions.filter(t => t.type === "مصروف").forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
      rawExpenseTotal += Number(t.amount);
    });
    return { totals, rawExpenseTotal };
  })();

  // تصفية الحركات بناءً على البحث أو عرض آخر 10 حركات افتراضياً
  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.date && t.date.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.account && t.account.toLowerCase().includes(q)) ||
      String(t.amount).includes(q)
    );
  }).slice(0, searchQuery ? undefined : 10);

  // شاشة تسجيل الدخول مرتبطة بفئات الـ CSS
  if (!session) {
    return (
      <div className="auth-container" style={{ background: currentTheme.bg, color: currentTheme.text, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 16, direction: "rtl" }}>
        <div className="auth-card" style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: currentTheme.accent }}>خِزنتي</h1>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 20 }}>منصة لإدارة السيولة والمصروفات</p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="auth-input-group">
              <input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: 10, color: currentTheme.text, fontSize: 12 }} 
              />
            </div>
            <div className="auth-input-group">
              <input 
                type="password" 
                placeholder="كلمة المرور" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: 10, color: currentTheme.text, fontSize: 12 }} 
              />
            </div>
            {authError && <div style={{ color: "#d97f6b", fontSize: 11 }}>{authError}</div>}
            <button type="submit" className="auth-btn" style={{ background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 10, padding: 10, fontWeight: 900, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
              دخول 
            </button>
          </form>

          {/* زر عرض شروط الخصوصية والأحكام */}
          <button 
            onClick={() => setShowPrivacyModal(true)} 
            style={{ background: "transparent", border: "none", color: currentTheme.accent, fontSize: 11, cursor: "pointer", marginTop: 16, textDecoration: "underline" }}
          >
            شروط الخصوصية والأحكام 
          </button>
        </div>

        {/* نافذة منبثقة لشروط الخصوصية والأحكام */}
        {showPrivacyModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", padding: 16, zIndex: 1000 }}>
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 20, maxWidth: 320, width: "100%", textAlign: "right" }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10, color: currentTheme.accent }}>شروط الخصوصية والأحكام</h3>
              <p style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.6, marginBottom: 16 }}>
                تطبيق <b>خِزنتي</b> يضمن سرية وأمان بياناتك المالية بالكامل. يتم تخزين الحركات والمعلومات الخاصة بك بشكل مشفر وآمن عبر سحابة Supabase، ولا يتم مشاركتها مع أي جهة خارجية.
              </p>
              <button 
                onClick={() => setShowPrivacyModal(false)} 
                style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 10, padding: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // الواجهة الرئيسة للتطبيق بعد تسجيل الدخول
  return (
    <div style={{ minHeight: "100vh", background: currentTheme.bg, color: currentTheme.text, padding: 16, display: "flex", justifyContent: "center", fontFamily: "system-ui, sans-serif", direction: "rtl" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        
        {/* شريط التحكم العلوي بالثيم والعملات */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setThemeName(themeName === "dark" ? "light" : "dark")} style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: "6px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
            {themeName === "dark" ? "☀️ فاتح" : "🌙 داكن"}
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.keys(CURRENCIES).map(curr => (
              <button key={curr} onClick={() => setCurrency(curr)} style={{ background: currency === curr ? currentTheme.accent : currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, color: currency === curr ? "#0e1a1a" : currentTheme.text, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* رأس التطبيق */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, marginBottom: 2 }}>☁️ متصل بسحابة Supabase (آمن ومشفر)</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>خِزنتي</h1>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
            <button onClick={handleLogout} className="auth-btn" style={{ background: 'transparent', border: `1px solid ${currentTheme.border}`, color: currentTheme.text, padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>
              تسجيل الخروج
            </button>
            <button onClick={() => setShowPrivacyModal(true)} style={{ background: 'transparent', border: `1px solid ${currentTheme.border}`, color: currentTheme.accent, padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>
              الخصوصية 
            </button>
          </div>
        </div>

        {/* نافذة منبثقة لشروط الخصوصية داخل التطبيق */}
        {showPrivacyModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", padding: 16, zIndex: 1000 }}>
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 20, maxWidth: 320, width: "100%", textAlign: "right" }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10, color: currentTheme.accent }}>شروط الخصوصية والأحكام</h3>
              <p style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.6, marginBottom: 16 }}>
                تطبيق <b>خِزنتي</b> يضمن سرية وأمان بياناتك المالية بالكامل. يتم تخزين الحركات والمعلومات الخاصة بك بشكل مشفر وآمن عبر سحابة Supabase، ولا يتم مشاركتها مع أي جهة خارجية.
              </p>
              <button 
                onClick={() => setShowPrivacyModal(false)} 
                style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 10, padding: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* إشعار التراجع عن الحذف */}
        {deletedItem && (
          <div style={{ background: "#c9a961", color: "#0e1a1a", padding: "10px 14px", borderRadius: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700 }}>
            <span>تم حذف الحركة. هل تريد التراجع؟</span>
            <button onClick={undoDelete} style={{ background: "#0e1a1a", color: "#c9a961", border: "none", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>تراجع (Undo)</button>
          </div>
        )}

        {/* تبويبات التنقل */}
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

        {/* إجمالي السيولة */}
        <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي السيولة النقدية الكلية</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
            {currencySymbol} {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* تفاصيل الكاش والبنك */}
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

        {/* إجمالي الوارد والصادر */}
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

        {/* محتوى تبويب العمليات */}
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

            {/* نموذج تسجيل حركة جديدة */}
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

              <input 
                type="number" 
                inputMode="decimal" 
                placeholder={`المبلغ بـ ${CURRENCIES[currency].name}`} 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", color: currentTheme.text, fontSize: 15, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }} 
              />

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

            {/* شريط البحث في الحركات */}
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

            {/* قائمة الحركات */}
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

        {/* محتوى تبويب الديون */}
        {activeTab === "debts" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>إدارة الديون والأرصدة المعلقة</div>
            
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <select value={debtType} onChange={(e) => setDebtType(e.target.value)} style={{ flex: 1, background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: 8, color: currentTheme.text, fontSize: 11 }}>
                <option value="لي عند الناس">لي عند الناس (مدينون)</option>
                <option value="عليّ للناس">عليّ للناس (دائنون)</option>
              </select>
            </div>

            <input type="text" placeholder="اسم الشخص أو الجهة" value={debtName} onChange={(e) => setDebtName(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: 8, color: currentTheme.text, fontSize: 11, marginBottom: 8 }} />
            <input type="number" inputMode="decimal" placeholder="مبلغ الدين" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: 8, color: currentTheme.text, fontSize: 11, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }} />

            <button onClick={addDebt} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 10, padding: "8px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>
              ➕ إضافة دين جديد
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {debts.map((d) => (
                <div key={d.id} style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: 10, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{d.type}</div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: currentTheme.accent }}>
                    {currencySymbol}{(Number(d.amount) * exchangeRate).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* محتوى تبويب الخزائن */}
        {activeTab === "accounts" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>إدارة الخزائن والحسابات</div>
            <p style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.6 }}>يتم تحديث أرصدة الخزائن (الكاش والبنك) بشكل تلقائي بناءً على الحركات المالية المسجلة ضمن قسم العمليات.</p>
          </div>
        )}

      </div>
    </div>
  );
}