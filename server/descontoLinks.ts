// Links de desconto da Wiapy (30%): SÓ NO SERVIDOR. Não entram no HTML nem no bundle do app.
// A Wiapy não faz o link expirar, então quem controla o prazo é o app: o servidor só devolve o link
// (em /api/eu, acesso.ofertasDesconto) enquanto a compra que deu o presente tem menos de 3 horas.
// "Ofertas especiais" criadas DENTRO dos checkouts normais (Levi, 10/11): o checkoutId e o conteúdo são os mesmos do preço cheio,
// só o link muda. O código do link fica em checkoutIds por segurança, caso a Wiapy mande ele no lugar do id do checkout.
import { PRODUTOS, vendaLigada, type ProdutoId } from '../shared/catalogo.js'
import { DESCONTO, descontoDe, popupDe, type Linha } from '../shared/desconto.js'
import { PRECO_DESCONTO_POPUP, UPSELLS_POPUP, proximoUpsell, type UpsellPopup } from '../shared/popupDesconto.js'

export interface LinkDesconto { checkoutUrl: string; checkoutIds: string[]; produtoIds: string[] }
export const LINKS_DESCONTO: Record<UpsellPopup, LinkDesconto> = {
  videoaulas: { checkoutUrl: 'https://pay.wiapy.com/lQ_YTlxm58Y', checkoutIds: ['lQ_YTlxm58Y'], produtoIds: [] },
  etiquetas: { checkoutUrl: 'https://pay.wiapy.com/jeJTPWSMvEk', checkoutIds: ['jeJTPWSMvEk'], produtoIds: [] },
  contafeita: { checkoutUrl: 'https://pay.wiapy.com/1ZIbLmZpsgq', checkoutIds: ['1ZIbLmZpsgq'], produtoIds: [] },
}

/** id do produto pelo checkout ou conteúdo com desconto (para o webhook) */
export function produtoDoCheckoutDesconto(id: string): UpsellPopup | null {
  if (!id) return null
  return UPSELLS_POPUP.find((p) => LINKS_DESCONTO[p].checkoutIds.includes(id)) ?? null
}
export function produtoDoConteudoDesconto(id: string): UpsellPopup | null {
  if (!id) return null
  return UPSELLS_POPUP.find((p) => LINKS_DESCONTO[p].produtoIds.includes(id)) ?? null
}

export interface OfertaDesconto { checkoutUrl: string; precoCentavos: number; pct: number; ate: string }
export interface PopupServidor { comprado: UpsellPopup; oferta: UpsellPopup; ate: string }

const aVenda = (p: ProdutoId) => !!PRODUTOS[p].checkoutUrl && vendaLigada(p)

/**
 * O que o app pode mostrar com desconto AGORA (relógio do servidor), a partir das compras gravadas pelo webhook:
 * - presente da primeira compra: 3 h a partir da primeira compra de extra, em qualquer um dos 3 que ela ainda não tem;
 * - popup pós-compra: 3 h a partir da compra do upsell, no próximo upsell da ordem.
 * Compra sem hora registrada não abre prazo nenhum (não dá para provar o prazo): nada de desconto.
 */
export function descontosAgora(compras: Linha[], produtos: ProdutoId[], agora: number) {
  const presente = descontoDe(compras, agora)
  const pop = popupDe(compras, agora)
  const oferta = pop ? proximoUpsell(pop.comprado, produtos, aVenda) : null
  const popup: PopupServidor | null = pop && oferta ? { comprado: pop.comprado, oferta, ate: pop.ate } : null
  const ofertasDesconto: Partial<Record<UpsellPopup, OfertaDesconto>> = {}
  for (const p of UPSELLS_POPUP) {
    if (produtos.includes(p) || !aVenda(p)) continue
    const prazos = [presente?.ate, popup?.oferta === p ? popup.ate : undefined].filter((x): x is string => !!x)
    if (!prazos.length) continue
    const ate = prazos.sort().at(-1)!
    ofertasDesconto[p] = { checkoutUrl: LINKS_DESCONTO[p].checkoutUrl, precoCentavos: PRECO_DESCONTO_POPUP[p], pct: DESCONTO.pct, ate }
  }
  return { desconto: presente, popup, ofertasDesconto }
}
