import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'

// VITE_DEMO=1 gera a prévia: um arquivo só, sem servidor (src/demo.ts)
const previa = process.env.VITE_DEMO === '1'

export default defineConfig({
  plugins: [
    react(),
    // a prévia é publicada aberta: os vídeos e os arquivos comprados (public/aulas, public/downloads) nunca vão junto
    previa && { name: 'previa-sem-arquivos', closeBundle: () => ['aulas', 'downloads'].forEach((d) => rmSync(`dist-previa/${d}`, { recursive: true, force: true })) },
  ],
  base: previa ? './' : '/',
  build: {
    outDir: previa ? 'dist-previa' : 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: previa ? { output: { inlineDynamicImports: true } } : {},
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never)
