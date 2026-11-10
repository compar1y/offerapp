// Presente da primeira compra: depois da primeira compra de um material extra feita pelo app,
// ela ganha 30% em mais um material (Aulas, Etiquetas ou Conta Feita). SEM PRAZO: o link com desconto da Wiapy não expira,
// então o app não promete nem conta tempo (nada de escassez falsa, Levi 10/11). O presente só acaba quando ela usa.
import type { ProdutoId } from './catalogo.js'
import { CHECKOUT_DESCONTO_POPUP, UPSELLS_POPUP } from './popupDesconto.js'

export const DESCONTO = { pct: 30 }

/**
 * Onde o presente pode ser usado: só nos materiais que têm checkout com desconto na Wiapy, os MESMOS do popup pós-compra
 * (shared/popupDesconto.ts): Aulas R$13,90, Etiquetas R$8,90, Conta Feita R$6,90. Mesmo 30%, mesmo link, sem duplicar.
 * Recheios, Encomenda e Primeira não têm checkout com desconto: comprar um deles dá o presente, mas eles não recebem desconto.
 */
export const PRECO_PRESENTE: Partial<Record<ProdutoId, { precoCentavos: number; checkoutUrl: string; checkoutIds: string[] }>> = Object.fromEntries(
  UPSELLS_POPUP.map((p) => [p, { precoCentavos: CHECKOUT_DESCONTO_POPUP[p].precoCentavos, checkoutUrl: CHECKOUT_DESCONTO_POPUP[p].checkoutUrl, checkoutIds: CHECKOUT_DESCONTO_POPUP[p].checkoutIds }]),
)

/** compras que dão o presente (vale a primeira delas): todo material extra vendido no app */
export const EXTRAS_DESCONTO: ProdutoId[] = ['recheios', 'encomenda', 'primeira', 'videoaulas', 'etiquetas', 'contafeita']

export interface Desconto { pct: number }

interface Linha { produto: string; status: string; criado_em: string; atualizado_em?: string | null; metodo?: string | null; pagamento_id?: string | null }

/**
 * Conta a partir da PRIMEIRA compra paga de um extra. Não vale: bump comprado junto com o kit (mesmo pagamento),
 * material ganho de presente (moedas) e compra feita com o próprio desconto (a 2ª compra não renova o prazo).
 */
/** extras que contam para o presente (pagos, fora do pedido do kit e sem ser presente de moedas), da mais antiga para a mais nova */
function extrasQueContam(compras: Linha[]) {
  const pagos = compras.filter((c) => c.status === 'pago')
  const pagamentosDoKit = new Set(pagos.filter((c) => c.produto === 'kit').map((c) => c.pagamento_id).filter(Boolean))
  const extras = pagos
    .filter((c) => EXTRAS_DESCONTO.includes(c.produto as ProdutoId) && c.metodo !== 'presente' && !(c.pagamento_id && pagamentosDoKit.has(c.pagamento_id)))
    .map((c) => ({ ...c, pagoEm: Date.parse(c.criado_em) })) // criado_em: o webhook reescreve atualizado_em a cada reenvio, o que reabriria o prazo
    .sort((a, b) => a.pagoEm - b.pagoEm)
  return extras
}

/** ela ainda não fez a primeira compra de extra: a próxima compra dá o presente */
export const presentePendente = (compras: Linha[]) => extrasQueContam(compras).length === 0

export function descontoDe(compras: Linha[], agora = Date.now()): Desconto | null {
  const extras = extrasQueContam(compras)
  const primeira = extras[0]
  if (!primeira) return null
  // já usou: depois da primeira compra, comprou (em outro pagamento) um material que recebe o desconto
  const pag = primeira.pagamento_id ?? primeira.pagoEm
  if (extras.some((c) => (c.pagamento_id ?? c.pagoEm) !== pag && !!PRECO_PRESENTE[c.produto as ProdutoId])) return null
  if (!(primeira.pagoEm <= agora)) return null
  return { pct: DESCONTO.pct }
}
