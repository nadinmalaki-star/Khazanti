import React, { useState, useEffect } from 'react';
// تأكدي من استمرار استيراد أي مكتبات أخرى مستخدمة لديكِ (مثل lucide-react أو supabase إلخ)

export default function App() {
  // جميع الحالات البرمجية الخاصة بكِ
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ backgroundColor: '#06281E', color: '#F9F6F0', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* رأس الصفحة والهيدر */}
      <header style={{ padding: '24px 48px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#D4AF37', letterSpacing: '1px' }}>خزنتي</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#A3B899', textTransform: 'uppercase', letterSpacing: '2px' }}>K H Z N T I</p>
        </div>
        <div style={{ fontSize: '14px', color: '#D4AF37', border: '1px solid #D4AF37', padding: '6px 16px', borderRadius: '4px' }}>
          بوابة مالية سحابية
        </div>
      </header>

      {/* القسم الرئيسي / Landing View */}
      <section style={{ padding: '64px 48px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '36px', color: '#FFFFFF', marginBottom: '16px', fontWeight: 'bold' }}>
          بوابتك الذكية للتحكم المالي والأمان السحابي.
        </h2>
        <p style={{ fontSize: '18px', color: '#D4AF37', lineHeight: '1.6', marginBottom: '32px' }}>
          فخامة العمل المصرفي، بسهولة التقنية الحديثة.
        </p>
      </section>

      {/* الهوية البصرية */}
      <section style={{ padding: '48px', backgroundColor: 'rgba(3, 20, 15, 0.5)', margin: '24px 48px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
        <h3 style={{ fontSize: '24px', color: '#D4AF37', marginBottom: '12px' }}>الهوية البصرية</h3>
        <p style={{ fontSize: '18px', color: '#FFFFFF', marginBottom: '24px', fontStyle: 'italic' }}>فخامة المستثمر وأمان المصارف</p>
        <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#D1D5DB', marginBottom: '32px' }}>
          تجمع لوحة ألوان خزنتي بين عراقة الزمرد الداكن وبريق الذهب الخالص، لتعكس شعوراً بالثقة المطلقة والخصوصية التامة.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '20px', backgroundColor: '#041E15', borderRadius: '8px', borderLeft: '4px solid #0F5132' }}>
            <h4 style={{ color: '#A3B899', margin: '0 0 8px 0' }}>الزمرد المصرفي العميق</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.5' }}>يمثل الاستقرار، والأمان المؤسسي، والهدوء الثقة المالي.</p>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#041E15', borderRadius: '8px', borderLeft: '4px solid #D4AF37' }}>
            <h4 style={{ color: '#D4AF37', margin: '0 0 8px 0' }}>الذهب السيادي</h4>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: '1.5' }}>يرمز إلى القيمة الرفيعة، والتدقيق المالي العالي، والموثوقية المطلقة.</p>
          </div>
        </div>
      </section>

      {/* القدرات الأساسية */}
      <section style={{ padding: '48px', maxWidth: '1100px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '24px', color: '#D4AF37', textAlign: 'center', marginBottom: '8px' }}>القدرات الأساسية</h3>
        <p style={{ fontSize: '16px', color: '#A3B899', textAlign: 'center', marginBottom: '40px' }}>إدارة مالية مصممة لأصحاب القرار</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ color: '#D4AF37', fontSize: '18px', marginBottom: '12px' }}>تتبع السيولة والتدفقات</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#D1D5DB', margin: 0 }}>رؤية فورية وشاملة للحركات النقدية والأرصدة لضمان اتخاذ قرارات مالية دقيقة.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ color: '#D4AF37', fontSize: '18px', marginBottom: '12px' }}>تقارير بصرية ذكية</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#D1D5DB', margin: 0 }}>تحليلات مترابطة ومبسطة تسهل قراءة المؤشرات المالية دون تعقيد.</p>
          </div>
        </div>
      </section>

      {/* المسار المستقبلي وخارطة الطريق */}
      <section style={{ padding: '48px', backgroundColor: 'rgba(3, 20, 15, 0.5)', margin: '24px 48px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
        <h3 style={{ fontSize: '24px', color: '#D4AF37', textAlign: 'center', marginBottom: '8px' }}>المسار المستقبلي</h3>
        <p style={{ fontSize: '16px', color: '#A3B899', textAlign: 'center', marginBottom: '40px' }}>خارطة طريق التطور</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '24px', backgroundColor: '#041E15', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase' }}>المرحلة الأولى</span>
            <h4 style={{ color: '#FFFFFF', fontSize: '18px', margin: '8px 0 12px 0' }}>التأسيس والإطلاق الأولي</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#9CA3AF', margin: 0 }}>بناء الأساسات البرمجية وتفعيل واجهات الإدارة المالية الأساسية بأعلى معايير الأمان السحابي.</p>
          </div>
          <div style={{ padding: '24px', backgroundColor: '#041E15', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase' }}>المرحلة الثانية</span>
            <h4 style={{ color: '#FFFFFF', fontSize: '18px', margin: '8px 0 12px 0' }}>الذكاء المالي المتقدم</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#9CA3AF', margin: 0 }}>إدمج أدوات تحليل التنبؤ بالسيولة وربط المؤشرات الذكية لتوفير استشارات تلقائية دقيقة.</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', borderTop: '1px dashed rgba(212, 175, 55, 0.2)' }}>
          <p style={{ fontSize: '16px', color: '#D4AF37', fontStyle: 'italic', margin: 0 }}>اجعل مالك يتحرك بذكاء، وثقة، وأمان تام.</p>
        </div>
      </section>

      {/* التذييل / Footer */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>
        <p style={{ margin: '0 0 8px 0', color: '#D4AF37', fontWeight: 'bold' }}>KHZNTI • خزنتي</p>
        <p style={{ margin: '0 0 16px 0' }}>خزنتي - بوابتك الذكية للتحكم المالي والأمان السحابي</p>
        <p style={{ margin: 0 }}>تصميم وتطوير أثر <span style={{ color: '#A3B899' }}>استوديو رقمي</span></p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>© 2026 أثر. جميع الحقوق محفوظة.</p>
      </footer>

    </div>
  );
}