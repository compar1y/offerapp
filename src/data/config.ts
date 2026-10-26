// Tudo que muda de um ambiente para outro fica aqui.
// O kit, os bônus e o que ele libera ficam em shared/catalog.ts (compartilhado com o servidor).

import { OFFERS } from '../../shared/catalog'

export { OFFERS }

export type AccessMode = 'demo' | 'server'

const mode: AccessMode = import.meta.env.VITE_ACCESS_MODE === 'server' ? 'server' : 'demo'

export const CONFIG = {
  brand: 'Fábrica de Panetones',
  // TODO: trocar pelo WhatsApp de suporte real (DDI + DDD + número, só dígitos). 5500000000000 é um placeholder.
  whatsapp: '5500000000000',
  supportMessage: 'Oi! Comprei a Fábrica de Panetones Caseiros e preciso de ajuda com o acesso.',
  // 'demo': qualquer e-mail entra com o código 123456, tudo no navegador. 'server': usa /api/* (VITE_ACCESS_MODE=server).
  mode,
  demo: mode === 'demo',
  demoCode: '123456',
}

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
