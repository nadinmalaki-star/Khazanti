import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// إعدادات السحابة الخاصة بك
const SUPABASE_URL = "https://nygfcqlvxogxytwwgbjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z2ZjcWx2eG9neHl0d3dnYmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTEyNTksImV4cCI6MjEwMjgyNzI1OX0.8siHLjdgPREeCDKM2ggHW_JrMmalh2n9Qlz4XuWnGRI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const [activeTab, setActiveTab] = useState("transactions"); 
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("مبيعات");
  const [selectedAccount, setSelectedAccount] = useState("الصندوق (كاش)");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]); // التاريخ الافتراضي اليوم
  const [searchQuery, setSearchQuery] = useState(""); 
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [themeKey, setThemeKey] = useState("emerald");

  const [debtType, setDebtType] = useState("لي عند الناس"); 
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  const currentTheme = THEMES[themeKey];

  useEffect(() => {
    fetchData();
  }, []);

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

  async function addTransaction() {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("أدخلي مبلغ صحيح");
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
      date: transactionDate || new Date().toISOString().split("T")[0]
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert([newRecord])
      .select();

    if (error) {
      setError("فشل الحفظ: " + error.message);
    } else if (data && data.length > 0) {
      setTransactions([data[0], ...transactions]);
      setAmount("");
      setError("");
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
      date: new Date().toISOString().split("T")[0]
    };

    const { data, error } = await supabase.from("debts").insert([newDebt]).select();
    if (data && data.length > 0) {
      setDebts([data[0], ...debts]);
    }

    setDebtName("");
    setDebtAmount("");
  }

  async function removeTransaction(id) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
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

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Tajawal', sans-serif", color: currentTheme.text, padding: "24px 16px 60px", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        input:focus, button:focus, select:focus { outline: 2px solid ${currentTheme.accent}; outline-offset: 2px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Header */}
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
        </div>

        {/* Tabs */}
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

        {/* Total Balance Card */}
        <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي السيولة النقدية الكلية</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
            {currencySymbol} {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Separate Accounts Balances Preview */}
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

        {/* Transactions Tab */}
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

              {/* تصنيف الأيقونات مقسمة بين دخل ومصروف فقط لتبسيط الواجهة */}
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

            {/* صندوق البحث الذكي */}
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

        {/* Debts Tab */}
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
              <input type="text" placeholder="اسم الشخص أو الجهة" value={debtName} onChange={e => setDebtName(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: "8px 12px", color: currentTheme.text, fontSize: 12, marginBottom: 8 }} />
              <input type="number" placeholder="مبلغ الدين" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} style={{ width: "100%", background: "#0c1a18", border: `1px solid ${currentTheme.border}`, borderRadius: 10, padding: "8px 12px", color: currentTheme.text, fontSize: 12, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }} />
              <button onClick={addDebt} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", borderRadius: 10, padding: "8px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>حفظ الدين</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {debts.map(d => (
                <div key={d.id} style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: d.type === "لي عند الناس" ? "#6fbf9a" : "#d97f6b" }}>{d.type}</div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currencySymbol}{(Number(d.amount) * exchangeRate).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === "accounts" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>إدارة الخزائن والحسابات المالية</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>💵 الصندوق (كاش)</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>النقدية اليدوية في الخزنة</div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: currentTheme.accent }}>
                  {currencySymbol} {cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>🏦 حساب البنك</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>الأرصدة البنكية والحوالات</div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: currentTheme.accent }}>
                  {currencySymbol} {bankBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}