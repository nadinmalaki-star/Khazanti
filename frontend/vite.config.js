import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // التحليلات بتشتغل بس على دومين الإنتاج. هاد الثابت null بكل بناء عادي
    // (dev/preview/production)؛ بس بناء اختبار محلي منفصل بيحدد مضيف غيره.
    __KHZNTI_ANALYTICS_TEST_HOST__: 'null',
    // لحظة إطلاق Smart Start على الإنتاج (UTC). null = الميزة مطفية. بتنحدد
    // مباشرة قبل نشر الإنتاج بلحظة الإطلاق الفعلية، مثلًا:
    // JSON.stringify("YYYY-MM-DDTHH:MM:SSZ") — الحسابات المنخلقة بعدها بس بتشوف الجولة.
    __KHZNTI_SMART_START_LAUNCH_AT__: JSON.stringify("2026-10-15T06:23:36Z"),
  },
})
