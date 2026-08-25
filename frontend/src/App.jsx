import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // حالات لوحة التحكم المالية
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('راتب');
  const [account, setAccount] = useState('الصندوق (كاش)');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
    } else {
      setShowLoginModal(false); // إغلاق نافذة الدخول المنبثقة والانتقال للوحة التحكم
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('id', { ascending: false })
      .limit(10);
    if (!error && data) {
      setTransactions(data);
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount) return;
    const { error } = await supabase.from('transactions').insert([
      {
        amount: parseFloat(amount),
        category,
        account,
        date: new Date().toISOString().split('T')[0]
      }
    ]);
    if (!error) {
      setAmount('');
      fetchTransactions();
    }
  };

  // 1. إذا لم يتم تسجيل الدخول: عرض الواجهة الترحيبية الفخمة مع زر تسجيل الدخول في الأعلى
  if (!session) {
    return (
      <div className="landing-page">
        {/* الشريط العلوي */}
        <header className="landing-header">
          <div className="landing-logo">خزنتي <span>• KHZNTI</span></div>
          <button className="login-trigger-btn" onClick={() => setShowLoginModal(true)}>
            تسجيل الدخول
          </button>
        </header>

        {/* القسم الرئيسي */}
        <main className="landing-hero">
          <span className="badge-tag">بوابة مالية سحابية</span>
          <h1>خزنتي</h1>
          <h2>KHZNTI</h2>
          <p className="hero-desc">
            بوابتك الذكية للتحكم المالي والأمان السحابي. فخامة العمل المصرفي، بسهولة التقنية الحديثة.
          </p>

          {/* الهوية البصرية */}
          <section className="section-box">
            <h3>الهوية البصرية: فخامة المستثمر وأمان المصارف</h3>
            <p>تجمع لوحة ألوان خزنتي بين عراقة الزمرد الداكن وبريق الذهب الخالص، لتعكس شعوراً بالثقة المطلقة والخصوصية التامة.</p>
            <div className="features-grid">
              <div className="feature-card">
                <h4>الزمرد المصرفي العميق</h4>
                <p>يمثل الاستقرار، والأمان المؤسسي، والهدوء والثقة المالي.</p>
              </div>
              <div className="feature-card">
                <h4>الذهب السيادي</h4>
                <p>يرمز إلى القيمة الرفيعة، والتدقيق المالي العالي، والموثوقية المطلقة.</p>
              </div>
            </div>
          </section>

          {/* القدرات الأساسية */}
          <section className="section-box">
            <h3>القدرات الأساسية: إدارة مالية مصممة لأصحاب القرار</h3>
            <div className="features-grid">
              <div className="feature-card">
                <h4>تتبع السيولة والتدفقات</h4>
                <p>رؤية فورية وشاملة للحركات النقدية والأرصدة لضمان اتخاذ قرارات مالية دقيقة.</p>
              </div>
              <div className="feature-card">
                <h4>تقارير بصرية ذكية</h4>
                <p>تحليلات مترابطة ومبسطة تسهل قراءة المؤشرات المالية دون تعقيد.</p>
              </div>
            </div>
          </section>

          {/* المسار المستقبلي */}
          <section className="section-box">
            <h3>المسار المستقبلي: خارطة طريق التطور</h3>
            <div className="roadmap-grid">
              <div className="roadmap-step">
                <span>المرحلة الأولى</span>
                <p><strong>التأسيس والإطلاق الأولي:</strong> بناء الأساسات البرمجية وتفعيل واجهات الإدارة المالية الأساسية بأعلى معايير الأمان السحابي.</p>
              </div>
              <div className="roadmap-step">
                <span>المرحلة الثانية</span>
                <p><strong>الذكاء المالي المتقدم:</strong> إدمج أدوات تحليل التنبؤ بالسيولة وربط المؤشرات الذكية لتوفير استشارات تلقائية دقيقة.</p>
              </div>
            </div>
          </section>

          <p className="quote-bottom">اجعل مالك يتحرك بذكاء، وثقة، وأمان تام.</p>
        </main>

        {/* التذييل */}
        <footer className="landing-footer">
          <p>KHZNTI • خزنتي</p>
          <p>خزنتي - بوابتك الذكية للتحكم المالي والأمان السحابي</p>
          <p>تصميم وتطوير أثر لاستوديو رقمي | © 2026 أثر. جميع الحقوق محفوظة.</p>
        </footer>

        {/* نافذة تسجيل الدخول المنبثقة (Modal) */}
        {showLoginModal && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <button className="close-modal" onClick={() => setShowLoginModal(false)}>✕</button>
              <h2>تسجيل الدخول إلى خزنتي</h2>
              {errorMsg && <p className="error-text">{errorMsg}</p>}
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'جاري الدخول...' : 'دخول آمن'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. إذا تم تسجيل الدخول بنجاح: الانتقال إلى لوحة التحكم المالية الحالية
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>لوحة التحكم - خزنتي</h2>
        <button className="logout-btn" onClick={handleLogout}>تسجيل الخروج</button>
      </header>

      <section className="transaction-form-section">
        <h3>تسجيل حركة مالية جديدة</h3>
        <form onSubmit={addTransaction}>
          <div className="form-group">
            <label>الحساب:</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="الصندوق (كاش)">الصندوق (كاش)</option>
              <option value="حساب البنك">حساب البنك</option>
            </select>
          </div>

          <div className="form-group">
            <label>المبلغ بـ شيكل:</label>
            <input
              type="number"
              placeholder="المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ color: '#d4af37' }}>اختر التصنيف:</label>
            <div className="category-selection-grid">
              {['راتب', 'أرباح/عائدات', 'تحويل وارد', 'مأكل ومشرب', 'فواتير ومرافق', 'نقل ومواصلات', 'تسوق ومشتريات', 'صحة وتأمين', 'أخرى'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`category-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-btn">حفظ الحركة في السحابة</button>
        </form>
      </section>
    </div>
  );
}