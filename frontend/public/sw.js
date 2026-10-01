// رفع رقم النسخة بيمسح كل كاش قديم (khznti-shell-v1..v3) عند التفعيل —
// النسخ القديمة كانت ممكن تخزّن صفحة خطأ مكان ملف التطبيق.
const CACHE_NAME = "khznti-shell-v4";
const SHELL_KEY = "/";
// أقصى وقت منستنّى فيه الشبكة لصفحة التطبيق قبل ما نفتح النسخة المحفوظة.
const NAV_TIMEOUT_MS = 3500;

// ملفات /assets/ يلي بتطلبها صفحة HTML معيّنة (أسماؤها فيها hash من Vite،
// يعني كل اسم = محتوى ثابت ما بيتغيّر أبدًا).
function assetPathsIn(html) {
  return [...new Set(html.match(/\/assets\/[^"'\s>)]+/g) || [])];
}

function isCacheable(response) {
  return response && response.ok && response.type === "basic" && !response.redirected;
}

// بتجيب صفحة التطبيق من الشبكة، وبتخزّنها بس بعد ما تتأكد إنو كل ملفات
// /assets/ يلي بتطلبها صارت محفوظة. هيك الصفحة المحفوظة عمرها ما بتشاور
// على ملف مش موجود، ونسخة جديدة من خزنتي يا بتتخزّن كاملة يا ما بتتخزّن.
// fresh = true يعني الصفحة الجديدة وملفاتها كلها جاهزة بالكاش.
async function loadFreshShell(request, cache) {
  const response = await fetch(request);
  const type = response.headers.get("content-type") || "";
  if (!isCacheable(response) || !type.includes("text/html")) {
    return { response, fresh: false };
  }

  const html = await response.clone().text();
  const assets = assetPathsIn(html);
  try {
    await Promise.all(
      assets.map(async (path) => {
        if (await cache.match(path)) return;
        const assetResponse = await fetch(path);
        if (!isCacheable(assetResponse)) throw new Error("asset failed: " + path);
        await cache.put(path, assetResponse);
      })
    );
  } catch {
    return { response, fresh: false };
  }

  await cache.put(SHELL_KEY, response.clone());

  // تنظيف ملفات JS/CSS من النسخ السابقة يلي ما عادت الصفحة الحالية بتطلبها.
  const keep = new Set(assets);
  for (const key of await cache.keys()) {
    const path = new URL(key.url).pathname;
    if (path.startsWith("/assets/") && /\.(js|css)$/.test(path) && !keep.has(path)) {
      await cache.delete(key);
    }
  }

  return { response, fresh: true };
}

// الصفحة المحفوظة — بس إذا كل ملفاتها موجودة بالكاش (نسخة متكاملة).
async function completeCachedShell(cache) {
  const cached = await cache.match(SHELL_KEY);
  if (!cached) return null;
  const html = await cached.clone().text();
  for (const path of assetPathsIn(html)) {
    if (!(await cache.match(path))) return null;
  }
  return cached;
}

// التثبيت بيحفظ نسخة متكاملة من التطبيق قبل ما ياخد مكان النسخة القديمة.
// إذا فشل (شبكة ضعيفة)، المتصفح بيضل على الـservice worker القديم وبيعيد
// المحاولة لاحقًا — ما منفعّل نسخة بكاش فاضي أو ناقص.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const { fresh } = await loadFreshShell(new Request(SHELL_KEY, { cache: "no-cache" }), cache);
      if (!fresh) throw new Error("app shell precache failed");
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("khznti-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// الضغط على إشعار تذكير الديون يلي انعرض عبر الـservice worker (هيك
// بيصير على أندرويد): منرجّع التركيز لنافذة خزنتي المفتوحة إذا في وحدة،
// وإلا منفتح التطبيق من جديد.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/");
    })
  );
});

// فتح التطبيق: الشبكة أولًا عشان أي نسخة جديدة توصل فورًا، بس بمهلة
// قصيرة — إذا الشبكة بطيئة أو رجّعت خطأ، منفتح آخر نسخة متكاملة محفوظة،
// والنسخة الجديدة بتكمل تتخزّن بالخلفية للفتحة الجاية. إذا ما في نسخة
// محفوظة أصلًا (أول زيارة)، منستنّى الشبكة متل أي موقع عادي.
async function handleNavigation(event) {
  const cache = await caches.open(CACHE_NAME);
  const freshShell = loadFreshShell(event.request, cache);
  event.waitUntil(freshShell.catch(() => {}));

  const timedOut = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  const result = await Promise.race([freshShell, timedOut]).catch(() => null);
  if (result && result.fresh) return result.response;

  const cached = await completeCachedShell(cache);
  if (cached) return cached;

  if (result) return result.response;
  const late = await freshShell.catch(() => null);
  return late ? late.response : Response.error();
}

// ملفات /assets/ اسمها فيه hash — من الكاش أولًا (ما في داعي للشبكة أبدًا
// إذا الملف موجود)، وإلا من الشبكة ومنخزّنه بس إذا وصل سليم.
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

// باقي ملفات التطبيق (أيقونات، manifest، صور): الشبكة أولًا، والكاش بس
// إذا فشلت. منخزّن الرد بس إذا كان سليم — عمرنا ما منخزّن صفحة خطأ.
async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

// بنخزّن بس شكل التطبيق نفسه (HTML/JS/CSS/صور) عشان يفتح حتى بدون نت.
// طلبات Supabase (بيانات مالية حقيقية) وأي موقع خارجي ما بتمر من هون
// إطلاقًا — لازم تجي من الشبكة الحية دايمًا أو تفشل بوضوح، مش تورّي رقم
// قديم من الكاش وكأنه حالي. وكمان إحصائيات Vercel (/_vercel/) ما بتنخزّن.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_vercel/")) return;

  if (request.mode === "navigate") {
    if (url.pathname !== "/" && url.pathname !== "/index.html") return;
    event.respondWith(handleNavigation(event));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(handleAsset(request));
    return;
  }

  event.respondWith(handleStatic(request));
});
