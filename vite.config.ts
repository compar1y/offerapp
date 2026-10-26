import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: o mesmo build roda na Vercel e numa prévia estática
export default defineConfig({
  base: './',
  plugins: [react()],
  // `npm run dev:api` serve as funções de api/ localmente
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
})
