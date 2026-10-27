// Tudo que muda de um ambiente para outro fica aqui.
// O kit, os bônus e o que ele libera ficam em shared/catalog.ts (compartilhado com o servidor).

import { OFFERS } from '../../shared/catalog'

export { OFFERS }

export type AccessMode = 'demo' | 'server'

// PRÉVIA = build separado (`npm run build:preview`). No build de produção isto é false e o código de demonstração sai do bundle.
export const PREVIEW: boolean = __PREVIEW__
const mode: AccessMode = PREVIEW ? 'demo' : 'server'

export const CONFIG = {
  brand: 'Fábrica de Panetones',
  // TODO: trocar pelo WhatsApp de suporte real (DDI + DDD + número, só dígitos). 5500000000000 é um placeholder.
  whatsapp: '5500000000000',
  supportMessage: 'Oi! Comprei a Fábrica de Panetones Caseiros e preciso de ajuda com o acesso.',
  // 'server' (produção, padrão): usa /api/*. 'demo' só existe no build de prévia.
  mode,
  demo: PREVIEW,
}
// código de teste da prévia (só é usado dentro de trechos que o build de produção elimina)
export const DEMO_CODE = '123456'

// Catálogo de ofertas (aba /catalogo, bolinha vermelha, banner na home). DESLIGADO em produção até ordem do Levi.
// Ligado na prévia. Para ligar em produção: VITE_CATALOG_ENABLED=true no build e ofertas com enabled: true em shared/catalog.ts.
export const CATALOG_ENABLED: boolean = PREVIEW || import.meta.env.VITE_CATALOG_ENABLED === 'true'

export function supportUrl(message: string = CONFIG.supportMessage): string {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`
}

// Ofertas adicionais (OFFERS): configuradas em shared/catalog.ts, TODAS DESLIGADAS por padrão.
// No modo demonstração, o botão "Ofertas" da barra de teste liga as três só para ver o visual (guardado no navegador, vale após recarregar).
function demoOffersOn(): boolean {
  if (!CONFIG.demo) return false
  try {
    return !!(JSON.parse(localStorage.getItem('panetone-demo:v2') ?? '{}') as { offers?: boolean }).offers
  } catch {
    return false
  }
}
if (demoOffersOn()) for (const o of OFFERS) o.enabled = true

// ---- gate da Biblioteca completa (ver shared/catalog.ts: comboGate)
// Mínimo de itens prontos (available) para mostrar o botão de compra. Vazio/inválido = padrão (10).
const minFromEnv = (v: unknown): number | null => {
  const n = Number(v)
  return v !== undefined && v !== '' && Number.isFinite(n) && n >= 1 ? Math.floor(n) : null
}
export const COMBO_MIN_AVAILABLE: number | null = minFromEnv(import.meta.env.VITE_COMBO_MIN_AVAILABLE)
