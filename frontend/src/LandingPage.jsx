import React, { useState } from 'react';

export default function Landing({ onLoginSuccess }) {
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
    <div dir="rtl" style={{ backgroundColor: '#06281E', color: '#F9F6F0', minHeight: '100vh', fontFamily: "'Tajawal', Arial, sans-serif", position: 'relative' }}>
      
      {/* رأس الصفحة والهيدر */}
      <header style={{ padding: '24px 48px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* الشعار الأنيق */}
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'radial-gradient(circle, #0F5132 0%, #03140F 100%)', border: '1px solid #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
            <span style={{ color: '#D4AF37', fontSize: '22px', fontWeight: 'bold' }}>⚜️</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#D4AF37', letterSpacing: '1px', fontWeight: '900' }}>خِزنتي</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#A3B899', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: "'IBM Plex Mono', monospace" }}>K H Z N T I</p>
          </div>
        </div>

        {/* زر تسجيل الدخول العلوي */}
        <button
          onClick={() => setShowLoginModal(true)}
          style={{
            backgroundColor: '#D4AF37',
            color: '#06281E',
            border: 'none',
            borderRadius: '30px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '900',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.25)',
            transition: 'all 0.3s ease'
          }}
        >
          <span>تسجيل الدخول</span>
          <span style={{ fontSize: '16px' }}>←</span>
        </button>
      </header>

      {/* القسم الرئيسي الترحيبي */}
      <section style={{ padding: '64px 24px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '38px', color: '#FFFFFF', marginBottom: '16px', fontWeight: '900', lineHeight: '1.3' }}>
          بوابتك الذكية للتحكم المالي والأمان السحابي.
        </h2>
        <p style={{ fontSize: '18px', color: '#D4AF37', lineHeight: '1.6', marginBottom: '32px', fontWeight: '500' }}>
          فخامة العمل المصرفي، بسهولة التقنية الحديثة.
        </p>
      </section>

      {/* الهوية البصرية */}
      <section style={{ padding: '48px 24px', backgroundColor: 'rgba(3, 20, 15, 0.5)', margin: '24px auto', maxWidth: '1000px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
        <h3 style={{ fontSize: '24px', color: '#D4AF37', marginBottom: '8px', fontWeight: 'bold' }}>الهوية البصرية</h3>
        <p style={{ fontSize: '18px', color: '#FFFFFF', marginBottom: '20px', fontStyle: 'italic' }}>فخامة المستثمر وأمان المصارف</p>
        <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#D1D5DB', marginBottom: '32px' }}>
          تجمع لوحة ألوان خزنتي بين عراقة الزمرد الداكن وبريق الذهب الخالص، لتعكس شعوراً بالثقة المطلقة والخصوصية التامة.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '24px', backgroundColor: '#041E15', borderRadius: '12px', borderLeft: '4px solid #0F5132' }}>
            <h4 style={{ color: '#A3B899', margin: '0 0 8px 0', fontSize: '18px' }}>الزمرد المصرفي العميق</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.6' }}>يمثل الاستقرار، والأمان المؤسسي، والهدوء الثقة المالي.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: '#041E15', borderRadius: '12px', borderLeft: '4px solid #D4AF37' }}>
            <h4 style={{ color: '#D4AF37', margin: '0 0 8px 0', fontSize: '18px' }}>الذهب السيادي</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.6' }}>يرمز إلى القيمة الرفيعة، والتدقيق المالي العالي، والموثوقية المطلقة.</p>
          </div>
        </div>
      </section>

      {/* القدرات الأساسية */}
      <section style={{ padding: '48px 24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '24px', color: '#D4AF37', textAlign: 'center', marginBottom: '8px', fontWeight: 'bold' }}>أكثر من مجرد سجل مصروفات</h3>
        <p style={{ fontSize: '16px', color: '#A3B899', textAlign: 'center', marginBottom: '36px' }}>إدارة مالية مصممة لأصحاب القرار</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ color: '#D4AF37', fontSize: '18px', marginBottom: '12px' }}>تتبع السيولة والتدفقات</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#D1D5DB', margin: 0 }}>رؤية فورية وشاملة للحركات النقدية والأرصدة لضمان اتخاذ قرارات مالية دقيقة.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ color: '#D4AF37', fontSize: '18px', marginBottom: '12px' }}>تقارير بصرية ذكية</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#D1D5DB', margin: 0 }}>تحليلات مترابطة ومبسطة تسهل قراءة المؤشرات المالية دون تعقيد.</p>
          </div>
        </div>
      </section>

      {/* المسار المستقبلي وخارطة الطريق */}
      <section style={{ padding: '48px 24px', backgroundColor: 'rgba(3, 20, 15, 0.5)', margin: '24px auto', maxWidth: '1000px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
        <h3 style={{ fontSize: '24px', color: '#D4AF37', textAlign: 'center', marginBottom: '8px', fontWeight: 'bold' }}>المسار المستقبلي</h3>
        <p style={{ fontSize: '16px', color: '#A3B899', textAlign: 'center', marginBottom: '36px' }}>خارطة طريق التطور</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '24px', backgroundColor: '#041E15', borderRadius: '12px' }}>
            <span style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>المرحلة الأولى</span>
            <h4 style={{ color: '#FFFFFF', fontSize: '18px', margin: '8px 0 12px 0' }}>التأسيس والإطلاق الأولي</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#9CA3AF', margin: 0 }}>بناء الأساسات البرمجية وتفعيل واجهات الإدارة المالية الأساسية بأعلى معايير الأمان السحابي.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: '#041E15', borderRadius: '12px' }}>
            <span style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>المرحلة الثانية</span>
            <h4 style={{ color: '#FFFFFF', fontSize: '18px', margin: '8px 0 12px 0' }}>الذكاء المالي المتقدم</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#9CA3AF', margin: 0 }}>إدمج أدوات تحليل التنبؤ بالسيولة وربط المؤشرات الذكية لتوفير استشارات تلقائية دقيقة.</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', borderTop: '1px dashed rgba(212, 175, 55, 0.2)' }}>
          <p style={{ fontSize: '16px', color: '#D4AF37', fontStyle: 'italic', margin: 0, fontWeight: 'bold' }}>تحكم بأموالك اليوم.. وابن مستقبلك المالي بثقة.</p>
        </div>
      </section>

      {/* التذييل / Footer مع رابط سياسة الخصوصية */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>
        <p style={{ margin: '0 0 6px 0', color: '#D4AF37', fontWeight: 'bold', fontSize: '15px' }}>KHZNTI • خزنتي</p>
        <p style={{ margin: '0 0 14px 0' }}>خزنتي - بوابتك الذكية للتحكم المالي والأمان السحابي</p>
        
        {/* رابط سياسة الخصوصية */}
        <div style={{ margin: '16px 0' }}>
          <button
            onClick={() => setShowPrivacyModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#D4AF37',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: '500'
            }}
          >
            سياسة الخصوصية وأمان البيانات
          </button>
        </div>

        <p style={{ margin: 0 }}>تصميم وتطوير أثر <span style={{ color: '#A3B899' }}>استوديو رقمي</span></p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.8 }}>© 2026 أثر. جميع الحقوق محفوظة.</p>
      </footer>

      {/* نافذة تسجيل الدخول المنبثقة (Modal) */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: '#041E15', borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            width: '90%', maxWidth: '440px', padding: '36px',
            position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}>
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute', top: '16px', left: '16px',
                background: 'none', border: 'none', color: '#D4AF37',
                fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '26px', color: '#D4AF37', margin: '0 0 8px 0', fontWeight: '900' }}>تسجيل الدخول</h3>
              <p style={{ fontSize: '13px', color: '#A3B899', margin: 0 }}>مرحباً بك مجدداً في بوابة خزنتي المالية</p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#D4AF37', marginBottom: '8px', fontWeight: 'bold' }}>
                  البريد الإلكتروني
                </label>
                <input
                  type="email" required placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', backgroundColor: '#03140F',
                    border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px',
                    color: '#FFFFFF', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '28px', textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#D4AF37', marginBottom: '8px', fontWeight: 'bold' }}>
                  كلمة المرور
                </label>
                <input
                  type="password" required placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', backgroundColor: '#03140F',
                    border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px',
                    color: '#FFFFFF', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '14px', backgroundColor: '#D4AF37',
                  color: '#06281E', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: '900', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
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
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: '#041E15', borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            width: '90%', maxWidth: '600px', maxHeight: '80vh',
            overflowY: 'auto', padding: '36px',
            position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            textAlign: 'right'
          }}>
            <button
              onClick={() => setShowPrivacyModal(false)}
              style={{
                position: 'absolute', top: '16px', left: '16px',
                background: 'none', border: 'none', color: '#D4AF37',
                fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '24px', color: '#D4AF37', margin: '0 0 16px 0', fontWeight: '900', textAlign: 'center' }}>
              سياسة الخصوصية وأمان البيانات
            </h3>
            
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#D1D5DB' }}>
              <p style={{ marginBottom: '12px' }}>
                في <strong style={{ color: '#D4AF37' }}>خِزنتي (KHZNTI)</strong>، نلتزم بحماية سرية وأمان بياناتك المالية بأعلى معايير التشفير والتقنية السحابية الحديثة.
              </p>
              <h4 style={{ color: '#A3B899', fontSize: '16px', margin: '16px 0 8px 0' }}>1. سرية البيانات المالية</h4>
              <p style={{ marginBottom: '12px' }}>
                جميع الحركات النقدية، سجلات المصروفات، والتقارير الخاصة بك مشفرة بالكامل ومحمية بنظام أمان سحابي متطور، ولا يتم مشاركة أي معلومات مع أي طرف ثالث.
              </p>
              <h4 style={{ color: '#A3B899', fontSize: '16px', margin: '16px 0 8px 0' }}>2. استخدام المعلومات</h4>
              <p style={{ marginBottom: '12px' }}>
                نستخدم بياناتك فقط لتوفير رؤى فورية، تقارير بصرية دقيقة، وتحسين تجربتك المالية داخل المنصة بناءً على هويتنا المصرفية الفخمة.
              </p>
              <h4 style={{ color: '#A3B899', fontSize: '16px', margin: '16px 0 8px 0' }}>3. حقوق الملكية والفكرية</h4>
              <p style={{ marginBottom: '0' }}>
                جميع الحقوق محفوظة © 2026 لأثر (استوديو رقمي). التصميم، الهوية البصرية، والمحتوى خاضعون لحماية حقوق الملكية الفكرية.
              </p>
            </div>

            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{
                  padding: '10px 28px', backgroundColor: '#D4AF37',
                  color: '#06281E', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
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