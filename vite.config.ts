import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: o mesmo build roda na Vercel e numa prévia estática
export default defineConfig({
  base: './',
  plugins: [react()],
})
