import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // التحليلات بتشتغل بس على دومين الإنتاج. هاد الثابت null بكل بناء عادي
    // (dev/preview/production)؛ بس بناء اختبار محلي منفصل بيحدد مضيف غيره.
    __KHZNTI_ANALYTICS_TEST_HOST__: 'null',
  },
})
