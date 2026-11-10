// Popup de desconto depois da compra de um upsell do app (pedido do Levi, 10/11):
// quando o app confirma a compra das Videoaulas, das Etiquetas ou do Conta Feita, aparece por cima da tela de acesso
// uma oferta do PRÓXIMO upsell que ela ainda não tem, com 30% de desconto.
import { PRODUTOS, type ProdutoId } from './catalogo.js'

/**
 * CHAVE ÚNICA DO POPUP. true (ligada em 10/11). false: nada aparece e nada é gravado no aparelho.
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

export interface CheckoutDesconto { precoCentavos: number; checkoutUrl: string; checkoutIds: string[]; produtoIds: string[] }

/**
 * Checkouts COM DESCONTO na Wiapy (o Caixa ainda vai criar, cada um no precoCentavos abaixo). AINDA VAZIOS.
 * checkoutUrl: o link de pagamento · checkoutIds: o código do link · produtoIds: só se o checkout usar um conteúdo NOVO.
 * O Levi vai criar os checkouts em cima dos MESMOS conteúdos (Aulas 6af1e083…, Etiquetas 6af207d3…, Conta Feita 6af2a8a3…),
 * que o webhook já reconhece pelo catálogo: basta preencher checkoutUrl e checkoutIds.
 * O webhook (server/wiapy.ts) reconhece estes ids como o MESMO produto (ex.: o checkout com desconto das Etiquetas vira 'etiquetas').
 * Produto sem checkoutUrl aqui nunca é oferecido no popup (a cobrança sairia com o preço cheio).
 */
export const CHECKOUT_DESCONTO_POPUP: Record<UpsellPopup, CheckoutDesconto> = {
  // "Ofertas especiais" criadas DENTRO dos checkouts normais (Levi, 10/11): o checkoutId e o conteúdo são os mesmos do preço cheio,
  // só o link muda. O código do link fica em checkoutIds por segurança, caso a Wiapy mande ele no lugar do id do checkout.
  videoaulas: { precoCentavos: precoComDesconto(PRODUTOS.videoaulas.precoCentavos), checkoutUrl: 'https://pay.wiapy.com/lQ_YTlxm58Y', checkoutIds: ['lQ_YTlxm58Y'], produtoIds: [] },
  etiquetas: { precoCentavos: precoComDesconto(PRODUTOS.etiquetas.precoCentavos), checkoutUrl: 'https://pay.wiapy.com/jeJTPWSMvEk', checkoutIds: ['jeJTPWSMvEk'], produtoIds: [] },
  contafeita: { precoCentavos: precoComDesconto(PRODUTOS.contafeita.precoCentavos), checkoutUrl: 'https://pay.wiapy.com/1ZIbLmZpsgq', checkoutIds: ['1ZIbLmZpsgq'], produtoIds: [] },
}

/** o que o popup oferece depois de ela comprar `comprado`: o primeiro da ordem que ela não tem, à venda e com checkout com desconto */
export function proximoUpsell(
  comprado: UpsellPopup,
  produtos: ProdutoId[],
  aVenda: (p: UpsellPopup) => boolean,
  checkouts: Record<UpsellPopup, CheckoutDesconto> = CHECKOUT_DESCONTO_POPUP,
): UpsellPopup | null {
  return PROXIMO[comprado].find((p) => !produtos.includes(p) && aVenda(p) && !!checkouts[p].checkoutUrl) ?? null
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

/** id do produto pelo checkout ou conteúdo com desconto (para o webhook) */
export function produtoDoCheckoutDesconto(id: string): UpsellPopup | null {
  if (!id) return null
  return UPSELLS_POPUP.find((p) => CHECKOUT_DESCONTO_POPUP[p].checkoutIds.includes(id)) ?? null
}
export function produtoDoConteudoDesconto(id: string): UpsellPopup | null {
  if (!id) return null
  return UPSELLS_POPUP.find((p) => CHECKOUT_DESCONTO_POPUP[p].produtoIds.includes(id)) ?? null
}
