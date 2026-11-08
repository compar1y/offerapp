import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_DEMO=1 gera a prévia: um arquivo só, sem servidor (src/demo.ts)
const previa = process.env.VITE_DEMO === '1'

export default defineConfig({
  plugins: [react()],
  base: previa ? './' : '/',
  build: {
    outDir: previa ? 'dist-previa' : 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: previa ? { output: { inlineDynamicImports: true } } : {},
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never)
