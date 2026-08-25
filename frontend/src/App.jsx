import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";
import './App.css';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("طعام");
  const [selectedAccount, setSelectedAccount] = useState("الصندوق (كاش)");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [themeKey, setThemeKey] = useState("emerald");
  const [activeTab, setActiveTab] = useState("transactions");

  const [deletedItem, setDeletedItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtType, setDebtType] = useState("دين له");

  const currentTheme = THEMES[themeKey];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        fetchData();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        fetchData();
      } else {
        setIsLoggedIn(false);
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
      user_id: user.id
    };

    const { data, error: dbError } = await supabase
      .from("debts")
      .insert([newDebt])
      .select();

    if (dbError) {
      alert("فشل حفظ الدين: " + dbError.message);
    } else {
      if (data) setDebts(prev => [data[0], ...prev]);
      setShowAddDebtModal(false);
      setDebtName("");
      setDebtAmount("");
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.session) {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginEmail("");
        setLoginPassword("");
      }
    } catch (err) {
      setLoginError("خطأ في البريد الإلكتروني أو كلمة المرور: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // الشاشة الترحيبية الكاملة (Landing Page)
  if (!isLoggedIn) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0e1a1a", color: "#f2ede2", fontFamily: "'Tajawal', sans-serif", padding: "30px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
          * { box-sizing: border-box; }
        `}</style>

        {/* الشريط العلوي */}
        <div style={{ width: "100%", maxWidth: "1000px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "50px" }}>
          <div style={{ background: "#c9a961", color: "#0e1a1a", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
            ✦ بوابة مالية 
          </div>
          <button 
            onClick={() => setShowLoginModal(true)}
            style={{ background: "transparent", border: "1px solid #c9a961", color: "#c9a961", padding: "8px 20px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
          >
            تسجيل الدخول
          </button>
        </div>

        {/* ترويسة الواجهة واللوجو */}
        <div style={{ textAlign: "center", maxWidth: "800px", marginBottom: "50px" }}>
          <div style={{ width: "100px", height: "100px", margin: "0 auto 20px", background: "linear-gradient(135deg, #1b3936, #16302d)", border: "2px solid #c9a961", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", overflow: "hidden" }}>
            <img 
              src="/logo.png.png" 
              alt="شعار خزنتي" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
          <h1 style={{ fontSize: "52px", fontWeight: 900, color: "#f2ede2", margin: "0 0 10px", letterSpacing: "1px" }}>خِزنتي</h1>
        </div>

        {/* قسم الهوية البصرية: لغة الألوان والرمز */}
        <div style={{ width: "100%", maxWidth: "1000px", marginBottom: "60px" }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={{ fontSize: "12px", color: "#c9a961", marginBottom: "5px" }}>الهوية البصرية</div>
            <h2 style={{ fontSize: "26px", fontWeight: 900 }}>لغة الألوان والرمز</h2>
            <p style={{ fontSize: "13px", opacity: 0.7 }}>هوية بصرية بنظام فاخر ومصرفي - كل لون ورمز اختر ليعكس الموثوقية والأمان.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "24px" }}>
              <h3 style={{ fontSize: "18px", margin: "8px 0" }}>الأخضر الداكن</h3>
              <p style={{ fontSize: "13px", opacity: 0.8, lineHeight: "1.6" }}>يرمز إلى المال والثروة والاستقرار المالي، ويؤحي بيئة عمل مصرفية آمنة وهادئة.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "24px" }}>
              <h3 style={{ fontSize: "18px", margin: "8px 0" }}>الذهبي الدافي المصرفي</h3>
              <p style={{ fontSize: "13px", opacity: 0.8, lineHeight: "1.6" }}>يرمز إلى الفخامة والقيمة المالية والاحترافية وتستخدم لإبراز العناصر الأساسية.</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h4 style={{ fontSize: "15px", color: "#c9a961", margin: "0 0 6px" }}>قرص الخزنة الدائري</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>يرمز إلى التحكم المطلق والأمان التام، كخزنة حقيقية تحفظ أسرارك بعيداً عن المتطفلين.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h4 style={{ fontSize: "15px", color: "#c9a961", margin: "0 0 6px" }}>سهم النمو الصاعد</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>يرمز إلى الاستثمار وتزايد الأرباح والتقدم المالي المستمر نحو الأفضل.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <h4 style={{ fontSize: "15px", color: "#c9a961", margin: "0 0 6px" }}>الأيقونات الداخلية</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>رموز خطية نقية بلون ذهبي هادئ، تعكس الدقة والوضوح دون أي إزعاج بصري.</p>
            </div>
          </div>
        </div>

        {/* قسم من نحن */}
        <div style={{ width: "100%", maxWidth: "800px", textAlign: "center", marginBottom: "60px", background: "#16302d", border: "1px solid #274442", borderRadius: "20px", padding: "30px" }}>
          <div style={{ fontSize: "12px", color: "#c9a961", marginBottom: "5px" }}>من نحن</div>
          <h2 style={{ fontSize: "24px", fontWeight: 900, marginBottom: "15px" }}>أكثر من مجرد سجل مصروفات</h2>
          <p style={{ fontSize: "14px", opacity: 0.85, lineHeight: "1.8", margin: 0 }}>
            "خزنتي" منصة مالية ذكية، مصممة خصيصاً لتمنح الأفراد وأصحاب الأعمال سيطرة كاملة ودقيقة على تدفقاتهم النقدية. بفضل هويته البصرية الراقية وبنيته التقنية المتقدمة، نجمع بين فخامة العمل المصرفي وسهولة التقنية الحديثة.
          </p>
        </div>

        {/* قسم التأسيس الذكي والأمان */}
        <div style={{ width: "100%", maxWidth: "1000px", marginBottom: "60px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#c9a961", marginBottom: "5px" }}>المرحلة الحالية</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900 }}>التأسيس الذكي والأمان</h2>
            <p style={{ fontSize: "13px", opacity: 0.7 }}>حجر الأساس لمنتج حقيقي يلبي الاحتياجات الأساسية بأعلى معايير الجودة والأمان.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "14px", padding: "18px" }}>
              <h4 style={{ fontSize: "14px", color: "#c9a961", margin: "0 0 6px" }}>عزل تام للبيانات</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>بيئة سحابية محمية ومستقلة لكل مستخدم، تضمن سرية معلوماته المالية.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "14px", padding: "18px" }}>
              <h4 style={{ fontSize: "14px", color: "#c9a961", margin: "0 0 6px" }}>إدارة مرنة للحركات</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>تسجيل المصروفات والإيرادات بسلاسة فائقة ودون تعقيد.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "14px", padding: "18px" }}>
              <h4 style={{ fontSize: "14px", color: "#c9a961", margin: "0 0 6px" }}>تصنيفات عملية</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>مصممة لتناسب الاحتياجات الواقعية لأجور تجار مصارف، تشغيلية واحتياجات يومية.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "14px", padding: "18px" }}>
              <h4 style={{ fontSize: "14px", color: "#c9a961", margin: "0 0 6px" }}>تجربة ويب تقدمية (PWA)</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>تطبيق سريع وخفيف يعمل مع المتصفح، مع إمكانية تثبيته على شاشة الهاتف الرئيسية.</p>
            </div>
          </div>
        </div>

        {/* قسم طموحات المستقبل */}
        <div style={{ width: "100%", maxWidth: "800px", marginBottom: "60px" }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{ fontSize: "12px", color: "#c9a961", marginBottom: "5px" }}>طموحات المستقبل</div>
            <h2 style={{ fontSize: "24px", fontWeight: 900 }}>نحو آفاق مالية متقدمة</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <div style={{ fontSize: "11px", color: "#c9a961", fontFamily: "'IBM Plex Mono', monospace" }}>Business</div>
              <h4 style={{ fontSize: "16px", margin: "6px 0" }}>المرحلة الاحترافية</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>أدوات متقدمة لإدارة السيولة والتدفقات النقدية تلبي احتياجات التجار والمستقلين.</p>
            </div>
            <div style={{ background: "#16302d", border: "1px solid #274442", borderRadius: "16px", padding: "20px" }}>
              <div style={{ fontSize: "11px", color: "#c9a961", fontFamily: "'IBM Plex Mono', monospace" }}>Pro</div>
              <h4 style={{ fontSize: "16px", margin: "6px 0" }}>المرحلة التوسعية</h4>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>شاشة أسعار العملات والمؤشرات المالية المباشرة، مع تقارير ورسوم بيانية تحليلية دقيقة.</p>
            </div>
          </div>
        </div>

        {/* الشعار الختامي والزر */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "20px" }}>تحكم بأموالك اليوم.. وابن مستقبلك المالي بثقة.</h2>
          
          <button 
            onClick={() => setShowLoginModal(true)}
            style={{
              background: "linear-gradient(135deg, #c9a961, #b8974f)",
              color: "#16302d",
              border: "none",
              padding: "14px 36px",
              fontSize: "18px",
              fontWeight: "bold",
              borderRadius: "14px",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(201, 169, 97, 0.3)",
              transition: "all 0.3s ease",
              marginBottom: "15px"
            }}
          >
            تسجيل الدخول / دخول النظام
          </button>

          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={() => setShowPrivacyModal(true)}
              style={{
                background: "none",
                border: "none",
                color: "#c9a961",
                fontSize: "14px",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "inherit",
                opacity: 0.9
              }}
            >
              سياسة الخصوصية وشروط الاستخدام
            </button>
          </div>
        </div>

        {/* الـ Footer */}
        <footer style={{ fontSize: "11px", opacity: 0.6, textAlign: "center", color: "#f2ede2", marginTop: "20px", lineHeight: "1.6" }}>
          KHZNTI - بوابتك الذكية للتحكم المالي والأمان السحابي<br />
          تصميم وتطوير - أثر - استوديو رقمي<br />
          © أثر 2026 جميع الحقوق محفوظة.
        </footer>

        {/* نافذة تسجيل الدخول */}
        {showLoginModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#16302d", border: "1px solid #c9a961", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "400px", color: "#f2ede2" }}>
              <h3 style={{ margin: "0 0 20px", color: "#c9a961" }}>تسجيل الدخول</h3>
              {loginError && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "10px" }}>{loginError}</div>}
              <form onSubmit={handleLoginSubmit}>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    required 
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>كلمة المرور</label>
                  <input 
                    type="password" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    required 
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #274442", background: "#0e1a1a", color: "#f2ede2" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowLoginModal(false)} style={{ background: "transparent", border: "1px solid #274442", color: "#f2ede2", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>إلغاء</button>
                  <button type="submit" style={{ background: "#c9a961", border: "none", color: "#16302d", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>دخول</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* نافذة سياسة الخصوصية */}
        {showPrivacyModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#16302d", border: "1px solid #c9a961", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "500px", color: "#f2ede2", maxHeight: "80vh", overflowY: "auto" }}>
              <h3 style={{ margin: "0 0 15px", color: "#c9a961" }}>سياسة الخصوصية وشروط الاستخدام</h3>
              <p style={{ fontSize: "13px", lineHeight: "1.7", opacity: 0.9 }}>
                نحن في منصة "خزنتي" نلتزم بحماية خصوصية بياناتك المالية والشخصية بأعلى معايير الأمان والسحابة المشفرة. جميع بياناتك مفصولة تماماً ومحمية ولا يتم مشاركتها مطلقاً.
              </p>
              <div style={{ textAlign: "left", marginTop: "20px" }}>
                <button onClick={() => setShowPrivacyModal(false)} style={{ background: "#c9a961", border: "none", color: "#16302d", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // لوحة التحكم الرئيسية (بعد تسجيل الدخول)
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Tajawal', sans-serif", color: currentTheme.text, padding: "24px 16px 60px", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
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
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Object.keys(THEMES).map((th) => (
                <button key={th} onClick={() => setThemeKey(th)} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${themeKey === th ? "#fff" : currentTheme.border}`, background: th === "emerald" ? "#163430" : th === "navy" ? "#1a2536" : "#302616", cursor: "pointer" }} />
              ))}
            </div>
            <button onClick={() => setIsLoggedIn(false)} title="تسجيل الخروج" style={{ background: "transparent", border: `1px solid ${currentTheme.border}`, borderRadius: 8, padding: "2px 6px", fontSize: "10px", color: currentTheme.text, cursor: "pointer" }}>خروج</button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, marginBottom: 2 }}>☁️ متصل بسحابة Supabase</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>خِزنتي</h1>
        </div>

        {deletedItem && (
          <div style={{ background: "#c9a961", color: "#0e1a1a", padding: "10px 14px", borderRadius: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700 }}>
            <span>تم حذف الحركة. هل تريد التراجع؟</span>
            <button onClick={undoDelete} style={{ background: "#0e1a1a", color: "#c9a961", border: "none", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>تراجع</button>
          </div>
        )}

        <div style={{ display: "flex", background: currentTheme.boxBg, borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${currentTheme.border}` }}>
          {[
            { id: "transactions", label: "📊 العمليات" },
            { id: "debts", label: "🤝 الديون" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: activeTab === tab.id ? currentTheme.accent : "transparent", color: activeTab === tab.id ? "#0e1a1a" : currentTheme.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 18, textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>إجمالي السيولة النقدية الكلية</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: currentTheme.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
            {currencySymbol} {totalBalance.toFixed(2)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12, fontSize: 11, opacity: 0.8 }}>
            <div>💵 الكاش: <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currencySymbol}{cashBalance.toFixed(2)}</span></div>
            <div>🏦 البنك: <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currencySymbol}{bankBalance.toFixed(2)}</span></div>
          </div>
        </div>

        {activeTab === "transactions" && (
          <>
            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>تسجيل عملية جديدة</div>
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

              <button onClick={addTransaction} style={{ width: "100%", background: currentTheme.accent, color: "#0e1a1a", border: "none", padding: "10px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>حفظ العملية</button>
            </div>

            <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>سجل الحركات</div>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="بحث في الحركات..." 
                style={{ width: "100%", padding: "8px", borderRadius: 8, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, color: currentTheme.text, marginBottom: 10, boxSizing: "border-box", fontSize: "12px" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                {transactions.length === 0 ? (
                  <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: 10 }}>لا توجد حركات مسجلة.</div>
                ) : (
                  transactions.map(t => (
                    <div key={t.id} style={{ background: currentTheme.cardBg, padding: 10, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <div>
                        <span style={{ fontWeight: 700 }}>{t.category}</span>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>{t.account} - {t.date}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: t.type === "دخل" || t.type === "مبيعات" ? "#38a169" : "#e53e3e", fontWeight: "bold" }}>
                          {t.type === "دخل" || t.type === "مبيعات" ? "+" : "-"} {currencySymbol} {(Number(t.amount) * exchangeRate).toFixed(2)}
                        </span>
                        <button onClick={() => removeTransaction(t.id)} style={{ background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "14px" }}>×</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "debts" && (
          <div style={{ background: currentTheme.boxBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>إدارة الديون والذمم</div>
              <button
                onClick={() => setShowAddDebtModal(true)}
                style={{ background: "#c9a961", color: "#16302d", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "12px" }}
              >
                + إضافة دين جديد
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {debts.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center", padding: "20px 0" }}>لا توجد ديون مسجلة حالياً.</div>
              ) : (
                debts.map((d) => (
                  <div key={d.id} style={{ background: currentTheme.cardBg, padding: 12, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", color: currentTheme.text }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>{d.name}</div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>{d.type}</div>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#c9a961" }}>
                      {currencySymbol} {(Number(d.amount) * exchangeRate).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
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
                  style={{ background: "#c9a961", color: "#16302d", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
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