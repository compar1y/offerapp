import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dois builds:
//   `vite build`                  -> PRODUÇÃO: modo servidor (/api/*), sem nenhum controle ou aviso de demonstração, sem o PDF de exemplo.
//   `vite build --mode preview`   -> PRÉVIA: modo demonstração (código de teste, barra "opções de teste"). Só para apresentar o layout.
// `__PREVIEW__` é uma constante de build: no build de produção os trechos de demonstração são eliminados do código.
const dropDemoAssets = (preview: boolean): Plugin => {
  let outDir = 'dist'
  return {
    name: 'drop-demo-assets',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      if (!preview) rmSync(resolve(outDir, 'demo'), { recursive: true, force: true })
    },
  }
}

// base relativa: o mesmo build roda na Vercel e numa prévia estática
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview'
  return {
    base: './',
    plugins: [react(), dropDemoAssets(preview)],
    define: { __PREVIEW__: JSON.stringify(preview) },
    // `npm run dev:api` serve as funções de api/ localmente
    server: { proxy: { '/api': 'http://localhost:8787' } },
    preview: { proxy: { '/api': 'http://localhost:8787' } },
  }
})
