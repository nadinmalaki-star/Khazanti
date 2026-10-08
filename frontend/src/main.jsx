import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)

if ("serviceWorker" in navigator) {
  // ملفات /assets/ يلي انفتحت فيها هالصفحة = نسخة التطبيق الشغّالة حاليًا.
  // (بوضع التطوير ما في /assets/، فما في فحص تحديثات أصلًا.)
  const pageAssets = [...document.querySelectorAll("script[src], link[href]")]
    .map((el) => new URL(el.getAttribute("src") || el.getAttribute("href"), window.location.href))
    .filter((url) => url.origin === window.location.origin && url.pathname.startsWith("/assets/"))
    .map((url) => url.pathname);

  // فحص خفيف: الـservice worker بيقارن نسخته المحفوظة بنسخة هالصفحة،
  // وبيبعت "khznti-update-ready" بس إذا في نسخة أحدث جاهزة كاملة.
  const UPDATE_CHECK_MIN_GAP_MS = 10 * 60 * 1000;
  let lastUpdateCheck = 0;
  const askForUpdate = () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker || pageAssets.length === 0) return;
    lastUpdateCheck = Date.now();
    worker.postMessage({ type: "khznti-check-update", assets: pageAssets, loadedAt: performance.timeOrigin });
  };

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        askForUpdate();
        // service worker جديد استلم التحكم (مثلًا بعد تحديث sw.js) — منعيد الفحص.
        navigator.serviceWorker.addEventListener("controllerchange", askForUpdate);
        // رجوع التطبيق من الخلفية: فحص لـsw.js ولنسخة التطبيق، مرة كل ١٠ دقايق بالأكثر.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState !== "visible") return;
          if (Date.now() - lastUpdateCheck < UPDATE_CHECK_MIN_GAP_MS) return;
          lastUpdateCheck = Date.now();
          registration.update().catch(() => {});
          askForUpdate();
        });
      })
      .catch(() => {});
  });
}
