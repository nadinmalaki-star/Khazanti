const CACHE_NAME = "khznti-shell-v3";

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

// نسخة بسيطة وآمنة من العمل بدون إنترنت: بنخزّن بس شكل التطبيق نفسه
// (HTML/JS/CSS/صور) عشان يفتح حتى بدون نت. طلبات Supabase (بيانات
// مالية حقيقية) ما بتنخزن إطلاقًا هون — لازم تجي من الشبكة الحية
// دايمًا أو تفشل بوضوح، مش تورّي رقم قديم من الكاش وكأنه حالي. هاي
// نسخة "اعرضي الشكل بدون نت" فقط — مش حفظ عمليات أوفلاين وإرسالها
// لاحقًا (هاي ميزة أعقد ومؤجّلة لمرحلة تانية).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
