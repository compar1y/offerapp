// Popup de desconto depois da compra de um upsell do app (pedido do Levi, 10/11):
// quando o app confirma a compra das Videoaulas, das Etiquetas ou do Conta Feita, aparece por cima da tela de acesso
// uma oferta do PRÓXIMO upsell que ela ainda não tem, com 30% de desconto.
import { PRODUTOS, type ProdutoId } from './catalogo.js'

/**
 * CHAVE ÚNICA DO POPUP. true (ligada em 10/11). false: nada aparece e nada é gravado no aparelho.
 * O popup só abre enquanto a compra que o gerou tem menos de 3 horas (relógio do servidor, /api/eu).
 */
export const POPUP_DESCONTO_LIGADO: boolean = true

export type UpsellPopup = 'videoaulas' | 'etiquetas' | 'contafeita'
export const UPSELLS_POPUP: UpsellPopup[] = ['videoaulas', 'etiquetas', 'contafeita']

/** o mesmo 30% do "presente da primeira compra" (shared/desconto.ts, DESCONTO.pct) */
export const PCT_POPUP = 30

/**
 * Ordem do "próximo", pelo caminho dela: fazer o panetone (Videoaulas) → apresentar (Etiquetas) → vender e cobrar (Conta Feita).
 * - Comprou as Videoaulas: vai fazer panetone, o próximo é apresentar com o nome dela (Etiquetas), depois o Conta Feita.
 * - Comprou as Etiquetas: já vai divulgar e receber pedidos, o próximo é responder com a conta feita, depois as Videoaulas.
 * - Comprou o Conta Feita: já está recebendo encomendas, o próximo é entregar com o nome dela (Etiquetas), depois as Videoaulas.
 */
export const PROXIMO: Record<UpsellPopup, UpsellPopup[]> = {
  videoaulas: ['etiquetas', 'contafeita'],
  etiquetas: ['contafeita', 'videoaulas'],
  contafeita: ['etiquetas', 'videoaulas'],
}

/**
 * Preço com desconto: preço × 0,70, arredondado PARA BAIXO até terminar em ,90 (o padrão dos preços do app),
 * para o desconto nunca ficar menor que 30%. Ex.: R$12,90 × 0,7 = R$9,03 → R$8,90.
 */
export function precoComDesconto(centavos: number, pct = PCT_POPUP): number {
  const alvo = Math.floor((centavos * (100 - pct)) / 100)
  return Math.floor((alvo - 90) / 100) * 100 + 90
}

/** preço com desconto de cada upsell (os links ficam SÓ no servidor: server/descontoLinks.ts) */
export const PRECO_DESCONTO_POPUP: Record<UpsellPopup, number> = {
  videoaulas: precoComDesconto(PRODUTOS.videoaulas.precoCentavos),
  etiquetas: precoComDesconto(PRODUTOS.etiquetas.precoCentavos),
  contafeita: precoComDesconto(PRODUTOS.contafeita.precoCentavos),
}

/** o que o popup oferece depois de ela comprar `comprado`: o primeiro da ordem que ela não tem e está à venda */
export function proximoUpsell(comprado: UpsellPopup, produtos: ProdutoId[], aVenda: (p: UpsellPopup) => boolean): UpsellPopup | null {
  return PROXIMO[comprado].find((p) => !produtos.includes(p) && aVenda(p)) ?? null
}

/** memória do aparelho: os upsells que ela já tinha quando o popup passou a valer (base) e as compras que já mostraram o popup */
export interface MemoriaPopup { base: ProdutoId[]; mostrados: ProdutoId[] }

/**
 * Qual compra acabou de ser confirmada e ainda não teve popup? Na primeira vez (sem memória) só guarda a base:
 * quem já tinha comprado antes não recebe popup de compra antiga.
 * Devolve a compra (ou null) e a memória nova para gravar.
 */
export function compraNova(produtos: ProdutoId[], memoria: MemoriaPopup | null): { comprado: UpsellPopup | null; memoria: MemoriaPopup } {
  const tem = UPSELLS_POPUP.filter((p) => produtos.includes(p))
  if (!memoria) return { comprado: null, memoria: { base: tem, mostrados: [] } }
  const comprado = tem.find((p) => !memoria.base.includes(p) && !memoria.mostrados.includes(p)) ?? null
  return { comprado, memoria: comprado ? { ...memoria, mostrados: [...memoria.mostrados, comprado] } : memoria }
}
