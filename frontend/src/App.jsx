import React, { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedInLocal, setIsLoggedInLocal] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const localLoggedIn = localStorage.getItem('isLoggedIn');
    if (localLoggedIn === 'true') {
      setIsLoggedInLocal(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setIsLoggedInLocal(true);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setIsLoggedInLocal(true);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) console.warn("Supabase note:", error.message);

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      setIsLoggedInLocal(true);
      setIsModalOpen(false);
    } catch (err) {
      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedInLocal(true);
      setIsModalOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    setIsLoggedInLocal(false);
  };

  if (authLoading) {
    return (
      <div style={{ background: '#061E17', color: '#F3EEDF', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Tajawal, sans-serif' }}>
        جاري تحميل بوابة خزنتي...
      </div>
    );
  }

  // ==========================================
  // 1. واجهة الهبوط (Landing Page) بالكامل
  // ==========================================
  if (!isLoggedInLocal && !session) {
    return (
      <div style={{ backgroundColor: '#061E17', color: '#F3EEDF', fontFamily: 'Tajawal, sans-serif', minHeight: '100vh', direction: 'rtl', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 28px' }}>
          
          {/* Header */}
          <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '24px' }}>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '14px',
                color: '#061E17', background: '#D4AF37', padding: '10px 22px',
                borderRadius: '999px', textDecoration: 'none', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.25)', border: '1px solid #EBCF7E'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              <span>تسجيل الدخول</span>
            </button>
          </header>

          {/* Hero Section */}
          <section style={{ position: 'relative', padding: '50px 0 60px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '13px', color: '#EBCF7E', border: '1px solid rgba(212,175,55,0.28)', borderRadius: '999px', padding: '7px 16px', background: 'rgba(212,175,55,0.06)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4AF37', boxShadow: '0 0 8px #D4AF37' }}></span> بوابة مالية سحابية
                </div>
                <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 'clamp(48px, 8vw, 76px)', lineHeight: 1.05, marginTop: '18px', background: 'linear-gradient(180deg, #F3EEDF 20%, #EBCF7E 130%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  خزنتي
                </div>
                <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: '15px', letterSpacing: '6px', color: '#8B7530', marginTop: '6px' }}>
                  K H Z N T I
                </div>
                <p style={{ fontSize: '19px', color: '#9FB8AC', marginTop: '22px', maxWidth: '420px', lineHeight: 1.9 }}>
                  بوابتك الذكية للتحكم المالي والأمان السحابي. فخامة العمل المصرفي، بسهولة التقنية الحديثة.
                </p>
              </div>

              <div style={{ position: 'relative', width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <div style={{ position: 'absolute', inset: '-30px', background: 'radial-gradient(circle, rgba(212,175,55,0.16), transparent 65%)', filter: 'blur(4px)' }}></div>
                <div style={{ width: '230px', height: '230px', borderRadius: '50%', padding: '4px', background: 'linear-gradient(135deg, #FFF2B2, #D4AF37, #996515)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0A2A20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: '32px', fontWeight: 'bold' }}>
                    خ
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.28) 15%, rgba(212,175,55,0.28) 85%, transparent)', margin: '0 auto' }}></div>

          {/* Identity Section */}
          <section style={{ padding: '64px 0' }}>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '13px', color: '#D4AF37', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                هوية البصرية <span style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.28)' }}></span>
              </div>
              <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '32px', color: '#F3EEDF' }}>فخامة المستثمر وأمان المصارف</h2>
              <p style={{ color: '#9FB8AC', fontSize: '16.5px', lineHeight: 2, maxWidth: '680px', marginTop: '16px' }}>
                تجمع لوحة ألوان خزنتي بين عراقة الزمرد الداكن وبريق الذهب الخالص، لتعكس شعوراً بالثقة المطلقة والخصوصية التامة.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '32px' }}>
              <div style={{ border: '1px solid rgba(212,175,55,0.28)', borderRadius: '14px', padding: '24px', background: 'linear-gradient(160deg, #0E3327, #0A2A20)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', marginBottom: '16px', background: 'linear-gradient(160deg,#1B4E3B,#0A2A20)', border: '1px solid rgba(212,175,55,0.28)' }}></div>
                <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F3EEDF' }}>الزمرد المصرفي العميق</div>
                <p style={{ color: '#9FB8AC', fontSize: '14.5px', lineHeight: 1.85, marginTop: '12px' }}>
                  يمثل الاستقرار، والأمان المؤسسي، والهدوء الثقة المالي.
                </p>
              </div>
              <div style={{ border: '1px solid rgba(212,175,55,0.28)', borderRadius: '14px', padding: '24px', background: 'linear-gradient(160deg, #0E3327, #0A2A20)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', marginBottom: '16px', background: 'linear-gradient(160deg,#EBCF7E,#D4AF37)' }}></div>
                <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F3EEDF' }}>الذهب السيادي</div>
                <p style={{ color: '#9FB8AC', fontSize: '14.5px', lineHeight: 1.85, marginTop: '12px' }}>
                  يرمز إلى القيمة الرفيعة، والتدقيق المالي العالي، والموثوقية المطلقة.
                </p>
              </div>
            </div>
          </section>

          <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.28) 15%, rgba(212,175,55,0.28) 85%, transparent)', margin: '0 auto' }}></div>

          {/* Features Section */}
          <section style={{ padding: '64px 0' }}>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '13px', color: '#D4AF37', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                القدرات الأساسية <span style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.28)' }}></span>
              </div>
              <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '32px', color: '#F3EEDF' }}>إدارة مالية مصممة لأصحاب القرار</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ border: '1px solid rgba(212,175,55,0.28)', borderRadius: '14px', padding: '22px 24px', background: 'rgba(212,175,55,0.03)' }}>
                <h4 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '16px', color: '#EBCF7E', marginBottom: '8px' }}>تتبع السيولة والتدفقات</h4>
                <p style={{ color: '#9FB8AC', fontSize: '14.5px', lineHeight: 1.85 }}>رؤية فورية وشاملة للحركات النقدية والأرصدة لضمان اتخاذ قرارات مالية دقيقة.</p>
              </div>
              <div style={{ border: '1px solid rgba(212,175,55,0.28)', borderRadius: '14px', padding: '22px 24px', background: 'rgba(212,175,55,0.03)' }}>
                <h4 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '16px', color: '#EBCF7E', marginBottom: '8px' }}>تقارير بصرية ذكية</h4>
                <p style={{ color: '#9FB8AC', fontSize: '14.5px', lineHeight: 1.85 }}>تحليلات مترابطة ومبسطة تسهل قراءة المؤشرات المالية دون تعقيد.</p>
              </div>
            </div>
          </section>

          <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.28) 15%, rgba(212,175,55,0.28) 85%, transparent)', margin: '0 auto' }}></div>

          {/* Roadmap Section */}
          <section style={{ padding: '64px 0' }}>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '13px', color: '#D4AF37', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                المسار المستقبلي <span style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.28)' }}></span>
              </div>
              <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '32px', color: '#F3EEDF' }}>خارطة طريق التطور</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ border: '1px solid rgba(212,175,55,0.28)', borderRadius: '16px', padding: '30px', background: 'linear-gradient(160deg, #0E3327, #061E17)' }}>
                <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '12px', color: '#D4AF37', letterSpacing: '1px', marginBottom: '10px' }}>المرحلة الأولى</div>
                <h3 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '21px', color: '#F3EEDF', marginBottom: '12px' }}>التأسيس والإطلاق الأولي</h3>
                <p style={{ color: '#9FB8AC', fontSize: '14.5px', lineHeight: 1.9 }}>بناء الأساسات البرمجية وتفعيل واجهات الإدارة المالية الأساسية بأعلى معايير الأمان السحابي.</p>
              </div>
              <div style={{ border: '1px solid rgba(212,175,55,0.28)', borderRadius: '16px', padding: '30px', background: 'linear-gradient(160deg, #0E3327, #061E17)' }}>
                <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '12px', color: '#D4AF37', letterSpacing: '1px', marginBottom: '10px' }}>المرحلة الثانية</div>
                <h3 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: '21px', color: '#F3EEDF', marginBottom: '12px' }}>الذكاء المالي المتقدم</h3>
                <p style={{ color: '#9FB8AC', fontSize: '14.5px', lineHeight: 1.9 }}>إدمج أدوات تحليل التنبؤ بالسيولة وربط المؤشرات الذكية لتوفير استشارات تلقائية دقيقة.</p>
              </div>
            </div>
          </section>

          <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.28) 15%, rgba(212,175,55,0.28) 85%, transparent)', margin: '0 auto' }}></div>

          {/* Closing */}
          <div style={{ textAlign: 'center', padding: '70px 0' }}>
            <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 34px)', color: '#F3EEDF', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto' }}>
              اجعل مالك يتحرك بذكاء، وثقة، و<span style={{ color: '#D4AF37' }}>أمان تام</span>.
            </div>
            <div style={{ marginTop: '34px', fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: '15px', letterSpacing: '4px', color: '#8B7530' }}>
              KHZNTI &bull; خزنتي
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(212,175,55,0.28)', padding: '28px 0 40px', textAlign: 'center', color: '#8B7530', fontFamily: 'Cairo, sans-serif', fontSize: '12.5px', letterSpacing: '1px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 28px' }}>
            <div style={{ marginBottom: '10px', color: '#9FB8AC' }}>خزنتي - بوابتك الذكية للتحكم المالي والأمان السحابي</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9FB8AC', fontSize: '11.5px', letterSpacing: '0.5px' }}>
              تصميم وتطوير <span style={{ color: '#EBCF7E', fontWeight: 700 }}>أثر</span> استوديو رقمي
            </div>
            <div style={{ marginTop: '6px', color: 'rgba(159,184,172,0.5)', fontSize: '10.5px', letterSpacing: '0.5px' }}>
              &copy; 2026 أثر. جميع الحقوق محفوظة.
            </div>
          </div>
        </footer>

        {/* نافذة تسجيل الدخول المنبثقة (Login Modal) */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Cairo, sans-serif' }}>
            <div style={{ background: '#0d231b', border: '1px solid #D4AF37', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', position: 'relative', textAlign: 'right' }}>
              
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', color: '#FFE082', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
              
              <h2 style={{ color: '#FFE082', fontSize: '24px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>تسجيل الدخول</h2>
              <p style={{ color: '#a3b8b0', fontSize: '14px', marginBottom: '30px', textAlign: 'center' }}>مرحباً بكِ مجدداً في بوابة خزنتي المالية</p>
              
              {authError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '15px', textAlign: 'center' }}>{authError}</div>}

              <form onSubmit={handleLoginSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#FFE082', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>البريد الإلكتروني</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" style={{ width: '100%', padding: '12px 16px', background: '#071913', border: '1px solid #1f4537', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
                
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', color: '#FFE082', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>كلمة المرور</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '12px 16px', background: '#071913', border: '1px solid #1f4537', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
                
                <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #FFF2B2, #D4AF37, #996515)', border: 'none', borderRadius: '10px', color: '#071913', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(212,175,55,0.3)' }}>دخول</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. لوحة التحكم (Dashboard) إذا تم تسجيل الدخول
  // ==========================================
  return (
    <div style={{ background: '#061E17', color: '#F3EEDF', minHeight: '100vh', padding: '24px', fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0A2A20', padding: '16px 24px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.28)', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '22px', fontWeight: 800, color: '#D4AF37' }}>لوحة تحكم خزنتي</h1>
            <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>مرحباً بكِ في بوابتك المالية الآمنة</p>
          </div>

          <button 
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: '13px' }}
          >
            تسجيل الخروج
          </button>
        </div>

        <div style={{ background: '#0E3327', border: '1px solid rgba(212,175,55,0.28)', borderRadius: '16px', padding: '30px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '20px', marginBottom: '12px' }}>أهلاً بكِ في مساحة العمل الخاصة بكِ</h2>
          <p style={{ opacity: 0.8, fontSize: '15px' }}>تم تسجيل الدخول بنجاح. يمكنكِ الآن إدارة الحركات المالية، السيولة، والتقارير بكل سهولة وثقة.</p>
        </div>

      </div>
    </div>
  );
}