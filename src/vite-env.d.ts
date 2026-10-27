/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACCESS_MODE?: 'demo' | 'server'
  readonly VITE_CATALOG_ENABLED?: 'true' | 'false'
}
