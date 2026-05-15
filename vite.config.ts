import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { stockDataPlugin } from './dev/stockPlugin'
import { geminiPlugin } from './dev/geminiPlugin'

export default defineConfig({
  plugins: [react(), tailwindcss(), stockDataPlugin(), geminiPlugin()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  optimizeDeps: {
    include: ['technicalindicators', 'lightweight-charts'],
  },
})
