import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { stockDataPlugin } from './dev/stockPlugin'
import { geminiPlugin } from './dev/geminiPlugin'
import { recommendPlugin } from './dev/recommendPlugin'

export default defineConfig(({ mode }) => {
  // Vite는 .env 값을 import.meta.env에만 노출하고 process.env에는 주입하지 않음.
  // dev/*.ts 미들웨어(Gemini 호출)는 process.env.GEMINI_API_KEY를 직접 참조하므로 수동 주입 필요.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), tailwindcss(), stockDataPlugin(), geminiPlugin(), recommendPlugin()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    optimizeDeps: {
      include: ['technicalindicators', 'lightweight-charts'],
    },
  }
})
