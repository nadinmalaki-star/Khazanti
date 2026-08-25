import React, { useState } from 'react';

export default function App({ onLoginSuccess }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div dir="rtl" style={{ backgroundColor: '#041E15', color: '#F9F6F0', minHeight: '100vh', fontFamily: "'Tajawal', Arial, sans-serif", position: 'relative' }}>
      
      {/* رأس الصفحة والهيدر */}
      <header style={{ padding: '24px 48px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* زر تسجيل الدخول في اليسار */}
        <button
          onClick={() => setShowLoginModal(true)}
          style={{
            backgroundColor: '#D4AF37',
            color: '#041E15',
            border: 'none',
            borderRadius: '30px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.25)',
            transition: 'all 0.3s ease'
          }}
        >
          تسجيل الدخول
        </button>

        {/* الشعار واسم التطبيق في اليمين */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#D4AF37', fontWeight: '900' }}>خِزنتي</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#A3B899', letterSpacing: '2px', fontFamily: "'IBM Plex Mono', monospace" }}>K H Z N T I</p>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'radial-gradient(circle, #0F5132 0%, #03140F 100%)', border: '1px solid #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#D4AF37', fontSize: '18px' }}>⚜️</span>
          </div>
        </div>
      </header>

      {/* القسم الرئيسي الترحيبي */}
      <section style={{ padding: '64px 24px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37', fontSize: '13px', marginBottom: '24px' }}>
          • بوابة مالية سحابية
        </div>
        <h2 style={{ fontSize: '38px', color: '#FFFFFF', marginBottom: '16px', fontWeight: '900', lineHeight: '1.3' }}>
          خزنتي
        </h2>
        <p style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '16px', fontWeight: 'bold', letterSpacing: '2px' }}>
          KHZNTI
        </p>
        <p style={{ fontSize: '16px', color: '#A3B899', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto' }}>
          بوابتك الذكية للتحكم المالي والأمان السحابي. فخامة العمل المصرفي، بسهولة التقنية الحديثة.
        </p>
      </section>

      {/* الهوية البصرية */}
      <section style={{ padding: '48px 24px', backgroundColor: 'rgba(3, 20, 15, 0.6)', margin: '24px auto', maxWidth: '1000px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
        <h3 style={{ fontSize: '22px', color: '#D4AF37', marginBottom: '8px', fontWeight: 'bold' }}>الهوية البصرية: فخامة المستثمر وأمان المصارف</h3>
        <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#D1D5DB', marginBottom: '28px' }}>
          تجمع لوحة ألوان خزنتي بين عراقة الزمرد الداكن وبريق الذهب الخالص، لتعكس شعوراً بالثقة المطلقة والخصوصية التامة.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '24px', backgroundColor: '#03140F', borderRadius: '12px', border: '1px solid #D4AF37' }}>
            <h4 style={{ color: '#D4AF37', margin: '0 0 8px 0', fontSize: '18px' }}>الذهب السيادي (#D4AF37)</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.6' }}>يرمز إلى القيمة الرفيعة، والتدقيق المالي العالي، والموثوقية المطلقة.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: '#03140F', borderRadius: '12px', border: '1px solid #0F5132' }}>
            <h4 style={{ color: '#FFFFFF', margin: '0 0 8px 0', fontSize: '18px' }}>الزمرد المصرفي العميق</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.6' }}>يمثل الاستقرار، والأمان المؤسسي، والهدوء والثقة المالي.</p>
          </div>
        </div>
      </section>

      {/* التذييل / Footer */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', textAlign: 'center', marginTop: '60px' }}>
        <button
          onClick={() => setShowPrivacyModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#D4AF37',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 'bold',
            marginBottom: '14px'
          }}
        >
          سياسة الخصوصية وأمان البيانات
        </button>
        <p style={{ margin: '0 0 6px 0', color: '#D4AF37', fontWeight: 'bold', fontSize: '15px' }}>KHZNTI • خزنتي</p>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#9CA3AF' }}>بوابتك الذكية للتحكم المالي والأمان السحابي</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6B7280' }}>© 2026 جميع الحقوق محفوظة.</p>
      </footer>

      {/* نافذة تسجيل الدخول المنبثقة (Modal) */}
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: '#041E15',
            borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            width: '90%',
            maxWidth: '420px',
            padding: '36px',
            position: 'relative',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute', top: '16px', left: '16px',
                background: 'none', border: 'none',
                color: '#D4AF37', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', color: '#D4AF37', margin: '0 0 6px 0', fontWeight: '900' }}>تسجيل الدخول</h3>
              <p style={{ fontSize: '13px', color: '#A3B899', margin: 0 }}>مرحباً بك مجدداً في بوابة خزنتي المالية</p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#D4AF37', marginBottom: '6px', fontWeight: 'bold' }}>
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    backgroundColor: '#03140F',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px', textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#D4AF37', marginBottom: '6px', fontWeight: 'bold' }}>
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    backgroundColor: '#03140F',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '14px',
                  backgroundColor: '#D4AF37', color: '#041E15',
                  border: 'none', borderRadius: '10px', fontSize: '15px',
                  fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                }}
              >
                دخول
              </button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة سياسة الخصوصية المنبثقة (Modal) */}
      {showPrivacyModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: '#041E15',
            borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            width: '90%', maxWidth: '550px', maxHeight: '80vh', overflowY: 'auto',
            padding: '36px', position: 'relative', textAlign: 'right',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <button
              onClick={() => setShowPrivacyModal(false)}
              style={{
                position: 'absolute', top: '16px', left: '16px',
                background: 'none', border: 'none',
                color: '#D4AF37', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '22px', color: '#D4AF37', margin: '0 0 16px 0', fontWeight: '900', textAlign: 'center' }}>
              سياسة الخصوصية وأمان البيانات
            </h3>
            
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#D1D5DB' }}>
              <p style={{ marginBottom: '12px' }}>
                في <strong style={{ color: '#D4AF37' }}>خِزنتي (KHZNTI)</strong>، نلتزم بحماية سرية وأمان بياناتك المالية بأعلى معايير التشفير والتقنية السحابية.
              </p>
              <h4 style={{ color: '#A3B899', fontSize: '15px', margin: '14px 0 6px 0' }}>1. سرية البيانات</h4>
              <p style={{ marginBottom: '12px' }}>
                جميع الحركات النقدية وسجلات المصروفات محمية بالكامل بنظام أمان متطور، ولا يتم مشاركة أي معلومات مع طرف ثالث.
              </p>
              <h4 style={{ color: '#A3B899', fontSize: '15px', margin: '14px 0 6px 0' }}>2. حقوق الملكية</h4>
              <p style={{ margin: 0 }}>
                جميع الحقوق محفوظة © 2026. التصميم والهوية البصرية خاضعون لحماية حقوق الملكية الفكرية.
              </p>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{
                  padding: '10px 26px', backgroundColor: '#D4AF37', color: '#041E15',
                  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}