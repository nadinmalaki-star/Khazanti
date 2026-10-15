// Smart Start V1 — إبراز صف الإجراءات السريعة الموجود + فقاعة قصيرة تحته.
// كل شي بمجرى الصفحة العادي (بدون طبقة فوق الشاشة): ما في حجب للضغط، ولا
// تعارض مع الكيبورد أو السكرول أو النوافذ المنبثقة. لما الجولة مش فعّالة،
// المكوّن بيرجّع الصف نفسه بدون أي عنصر إضافي.
const BUBBLE_TEXT = "خلّينا نسجّل أول حركة حقيقية — اختَر مصروف أو دخل.";
const SKIP_TEXT = "تخطي الجولة";
const SUCCESS_TEXT = "تمام، انحفظت أول حركة وتحدّث رصيدك.";

export function SmartStartSpotlight({ active, success, theme, onStart, onSkip, children }) {
  if (!active && !success) return children;

  if (!active) {
    return (
      <>
        {children}
        <div
          role="status"
          aria-live="polite"
          style={{ background: "rgba(76,175,125,0.14)", border: "1px solid rgba(76,175,125,0.45)", color: theme.text, borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, fontWeight: 700, lineHeight: 1.6 }}
        >
          ✓ {SUCCESS_TEXT}
        </div>
      </>
    );
  }

  return (
    <>
      {/* أي ضغطة على زر من أزرار الصف (تسجيل عملية / مصروف / دخل) = بداية الجولة.
          onClick (مش Capture) عن قصد: onClick تبع الزر بيشتغل أول (بيفتح النموذج)،
          وبعدين هون — التحديثين بينطبقوا مع بعض. بمرحلة الـcapture كان إخفاء
          الإطار بيشيل الزر من الصفحة قبل ما يوصله الضغط فالنموذج ما بيفتح. */}
      <div
        style={{ position: "relative" }}
        onClick={(e) => { if (e.target instanceof Element && e.target.closest("button")) onStart(); }}
      >
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: -5, borderRadius: 16, border: `2px solid ${theme.accent}`, boxShadow: `0 0 0 4px ${theme.accent}26, 0 0 18px ${theme.accent}59`, pointerEvents: "none" }}
        />
        {children}
      </div>
      <div
        role="note"
        aria-live="polite"
        style={{ position: "relative", background: theme.boxBg, border: `1px solid ${theme.accent}`, borderRadius: 12, padding: "12px 14px", marginTop: -4, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}
      >
        <span
          aria-hidden="true"
          style={{ position: "absolute", top: -7, right: "50%", width: 12, height: 12, background: theme.boxBg, borderTop: `1px solid ${theme.accent}`, borderLeft: `1px solid ${theme.accent}`, transform: "translateX(50%) rotate(45deg)" }}
        />
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, lineHeight: 1.6 }}>{BUBBLE_TEXT}</span>
        <button
          type="button"
          onClick={onSkip}
          style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
        >
          {SKIP_TEXT}
        </button>
      </div>
    </>
  );
}
