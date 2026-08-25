import React, { useState } from 'react';
import './App.css'; // <-- استدعاء ملف الـ CSS هنا


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
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.25)'
          }}
        >
          تسجيل الدخول
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#D4AF37', fontWeight: '900' }}>خزنتي</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#A3B899', letterSpacing: '2px', fontFamily: "'IBM Plex Mono', monospace" }}>KHZNTI</p>
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
        <h3 style={{ fontSize: '14px', color: '#D4AF37', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>الهوية البصرية</h3>
        <h2 style={{ fontSize: '26px', color: '#FFFFFF', marginBottom: '12px', fontWeight: 'bold' }}>فخامة المستثمر وأمان المصارف</h2>
        <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#D1D5DB', marginBottom: '28px' }}>
          تجمع لوحة ألوان خزنتي بين عراقة الزمرد الداكن وبريق الذهب الخالص، لتعكس شعوراً بالثقة المطلقة والخصوصية التامة.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '24px', backgroundColor: '#03140F', borderRadius: '12px', border: '1px solid #0F5132' }}>
            <h4 style={{ color: '#FFFFFF', margin: '0 0 8px 0', fontSize: '18px' }}>الزمرد المصرفي العميق</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.6' }}>يمثل الاستقرار، والأمان المؤسسي، والهدوء والثقة المالي.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: '#03140F', borderRadius: '12px', border: '1px solid #D4AF37' }}>
            <h4 style={{ color: '#D4AF37', margin: '0 0 8px 0', fontSize: '18px' }}>الذهب السيادي</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.6' }}>يرمز إلى القيمة الرفيعة، والتدقيق المالي العالي، والموثوقية المطلقة.</p>
          </div>
        </div>
      </section>

      {/* ختامية */}
      <section style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '20px', color: '#FFFFFF', fontWeight: 'bold', margin: 0 }}>
          اجعل مالك يتحرك بذكاء، وثقة، وأمان تام.
        </h3>
      </section>

      {/* التذييل / Footer */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', textAlign: 'center', marginTop: '40px' }}>
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
        <p style={{ margin: '0 0 6px 0', color: '#D4AF37', fontWeight: 'bold', fontSize: '16px' }}>KHZNTI • خزنتي</p>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#9CA3AF' }}>خزنتي - بوابتك الذكية للتحكم المالي والأمان السحابي</p>
        <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#D1D5DB' }}>تصميم وتطوير <strong style={{ color: '#D4AF37' }}>أثر لاستوديو رقمي</strong></p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6B7280' }}>© 2026 أثر. جميع الحقوق محفوظة.</p>
      </footer>

      {/* نافذة تسجيل الدخول */}
      {showLoginModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: '#041E15', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.4)', width: '90%', maxWidth: '420px', padding: '36px', position: 'relative' }}>
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: '#D4AF37', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            <h3 style={{ fontSize: '24px', color: '#D4AF37', margin: '0 0 6px 0', textAlign: 'center', fontWeight: '900' }}>تسجيل الدخول</h3>
            <form onSubmit={handleLoginSubmit}>
              <input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '16px', backgroundColor: '#03140F', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px', color: '#FFF', boxSizing: 'border-box' }} />
              <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '24px', backgroundColor: '#03140F', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px', color: '#FFF', boxSizing: 'border-box' }} />
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#D4AF37', color: '#041E15', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>دخول</button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة سياسة الخصوصية */}
      {showPrivacyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: '#041E15', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.4)', width: '90%', maxWidth: '550px', maxHeight: '80vh', overflowY: 'auto', padding: '36px', position: 'relative', textAlign: 'right' }}>
            <button onClick={() => setShowPrivacyModal(false)} style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: '#D4AF37', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            <h3 style={{ fontSize: '22px', color: '#D4AF37', margin: '0 0 16px 0', textAlign: 'center', fontWeight: '900' }}>سياسة الخصوصية وأمان البيانات</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#D1D5DB' }}>
              <p>جميع الحركات النقدية وسجلات المصروفات محمية بالكامل بنظام أمان متطور.</p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={() => setShowPrivacyModal(false)} style={{ padding: '10px 26px', backgroundColor: '#D4AF37', color: '#041E15', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}