const CACHE_NAME = "khznti-shell-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // بتمسح أي كاش قديم من نسخة سابقة (كانت بتخزن الصور وممكن تسبب
  // مشاكل عرض على سفاري/آيفون).
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", () => {
  // ما منتدخل بأي طلب إطلاقًا — كل شي بيروح للشبكة مباشرة بدون أي كاش.
  // وجود هالمستمع بس هو اللي محتاجو المتصفح عشان يعتبر الموقع "قابل
  // للتثبيت" على الشاشة الرئيسية.
});
