// Presente de 30% com prazo REAL de 3 horas (Levi, 10/11). A Wiapy não faz o link expirar, então quem controla é o app:
// o prazo começa na hora da compra gravada pelo webhook (compras.criado_em, relógio do banco) e o servidor só devolve
// os links de desconto enquanto ele vale (server/descontoLinks.ts). No aparelho, o relógio só conta o que o servidor mandou.
// - Presente da primeira compra: a primeira compra de um extra dá 30% em mais um (Aulas, Etiquetas ou Conta Feita) por 3 h.
// - Popup pós-compra: a compra de um upsell dá 30% no próximo upsell por 3 h, a partir dessa compra.
// Compra sem hora registrada: nada de desconto (não dá para provar o prazo).
import type { ProdutoId } from './catalogo.js'
import { UPSELLS_POPUP, type UpsellPopup } from './popupDesconto.js'

export const DESCONTO = { pct: 30, horas: 3 }
const PRAZO_MS = DESCONTO.horas * 3600e3

/** onde o desconto pode ser usado: só nos que têm link com desconto na Wiapy (os mesmos do popup) */
export const PRODUTOS_COM_DESCONTO: ProdutoId[] = UPSELLS_POPUP

/** compras que dão o presente (vale a primeira delas): todo material extra vendido no app */
export const EXTRAS_DESCONTO: ProdutoId[] = ['recheios', 'encomenda', 'primeira', 'videoaulas', 'etiquetas', 'contafeita']

export interface Desconto { pct: number; ate: string }

export interface Linha { produto: string; status: string; criado_em?: string | null; atualizado_em?: string | null; metodo?: string | null; pagamento_id?: string | null }

/** hora da compra gravada pelo webhook (criado_em; o atualizado_em muda a cada reenvio e reabriria o prazo). NaN se não houver */
const horaDa = (c: Linha) => (c.criado_em ? Date.parse(c.criado_em) : NaN)

/** compras pagas que contam (fora do pedido do kit e sem ser presente de moedas), da mais antiga para a mais nova */
function comprasQueContam(compras: Linha[], quais: ProdutoId[]) {
  const pagos = compras.filter((c) => c.status === 'pago')
  const pagamentosDoKit = new Set(pagos.filter((c) => c.produto === 'kit').map((c) => c.pagamento_id).filter(Boolean))
  return pagos
    .filter((c) => quais.includes(c.produto as ProdutoId) && c.metodo !== 'presente' && !(c.pagamento_id && pagamentosDoKit.has(c.pagamento_id)))
    .map((c) => ({ ...c, pagoEm: horaDa(c) }))
    .sort((a, b) => (Number.isNaN(a.pagoEm) ? -Infinity : a.pagoEm) - (Number.isNaN(b.pagoEm) ? -Infinity : b.pagoEm))
}

/** ela ainda não fez a primeira compra de extra: a próxima compra dá o presente */
export const presentePendente = (compras: Linha[]) => comprasQueContam(compras, EXTRAS_DESCONTO).length === 0

/**
 * Presente da primeira compra: vale por 3 h a partir da PRIMEIRA compra paga de um extra. Acaba antes se ela usar
 * (comprar, em outro pagamento, um material com desconto). Sem hora registrada: null.
 */
export function descontoDe(compras: Linha[], agora = Date.now()): Desconto | null {
  const extras = comprasQueContam(compras, EXTRAS_DESCONTO)
  const primeira = extras[0]
  if (!primeira || Number.isNaN(primeira.pagoEm)) return null
  const pag = primeira.pagamento_id ?? primeira.pagoEm
  if (extras.some((c) => (c.pagamento_id ?? c.pagoEm) !== pag && PRODUTOS_COM_DESCONTO.includes(c.produto as ProdutoId))) return null
  const ate = primeira.pagoEm + PRAZO_MS
  if (!(agora < ate)) return null
  return { pct: DESCONTO.pct, ate: new Date(ate).toISOString() }
}

/** popup pós-compra: a compra de upsell mais recente, se tiver menos de 3 h. Sem hora registrada: null */
export function popupDe(compras: Linha[], agora = Date.now()): { comprado: UpsellPopup; ate: string } | null {
  const ups = comprasQueContam(compras, UPSELLS_POPUP)
  const ultima = ups.at(-1)
  if (!ultima || Number.isNaN(ultima.pagoEm)) return null
  const ate = ultima.pagoEm + PRAZO_MS
  if (!(agora < ate)) return null
  return { comprado: ultima.produto as UpsellPopup, ate: new Date(ate).toISOString() }
}
