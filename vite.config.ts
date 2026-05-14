import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stockDataPlugin } from './dev/stockPlugin'
import { geminiPlugin } from './dev/geminiPlugin'

export default defineConfig({
  plugins: [react(), stockDataPlugin(), geminiPlugin()],
  optimizeDeps: {
    include: ['technicalindicators', 'lightweight-charts']
  }
})
