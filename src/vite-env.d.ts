/// <reference types="vite/client" />

// constante de build (vite.config.ts): true só no build de prévia (`--mode preview`)
declare const __PREVIEW__: boolean

interface ImportMetaEnv {
  readonly VITE_CATALOG_ENABLED?: 'true' | 'false'
  readonly VITE_COMBO_MIN_AVAILABLE?: string
  readonly VITE_CALC_ENABLED?: 'true' | 'false'
}
