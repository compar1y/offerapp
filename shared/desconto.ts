// Presente da primeira compra: depois da primeira compra de um material extra feita pelo app,
// ela ganha 30% no próximo material por 3 horas, contadas a partir da hora da compra (registrada pelo servidor).
import type { ProdutoId } from './catalogo.js'

export const DESCONTO = { pct: 30, horas: 3 }

/** preço com desconto e o checkout da Wiapy com esse preço (o Levi cria; vazio = desconto não aparece no app de verdade) */
export const PRECO_PRESENTE: Partial<Record<ProdutoId, { precoCentavos: number; checkoutUrl: string; checkoutIds: string[] }>> = {
  recheios: { precoCentavos: 550, checkoutUrl: '', checkoutIds: [] },
  encomenda: { precoCentavos: 3290, checkoutUrl: '', checkoutIds: [] },
  primeira: { precoCentavos: 1890, checkoutUrl: '', checkoutIds: [] },
}

export const EXTRAS_DESCONTO: ProdutoId[] = ['recheios', 'encomenda', 'primeira']

export interface Desconto { pct: number; ate: string }

interface Linha { produto: string; status: string; criado_em: string; atualizado_em?: string | null; metodo?: string | null; pagamento_id?: string | null }

/**
 * Conta a partir da PRIMEIRA compra paga de um extra. Não vale: bump comprado junto com o kit (mesmo pagamento),
 * material ganho de presente (moedas) e compra feita com o próprio desconto (a 2ª compra não renova o prazo).
 */
export function descontoDe(compras: Linha[], agora = Date.now()): Desconto | null {
  const pagos = compras.filter((c) => c.status === 'pago')
  const pagamentosDoKit = new Set(pagos.filter((c) => c.produto === 'kit').map((c) => c.pagamento_id).filter(Boolean))
  const extras = pagos
    .filter((c) => EXTRAS_DESCONTO.includes(c.produto as ProdutoId) && c.metodo !== 'presente' && !(c.pagamento_id && pagamentosDoKit.has(c.pagamento_id)))
    .map((c) => ({ ...c, pagoEm: Date.parse(c.atualizado_em ?? c.criado_em) })) // a linha nasce 'pendente' no PIX; vira 'pago' na atualização
    .sort((a, b) => a.pagoEm - b.pagoEm)
  const primeira = extras[0]
  if (!primeira) return null
  // já usou: comprou outro extra depois da primeira compra
  if (new Set(extras.map((c) => c.pagamento_id ?? c.pagoEm)).size > 1) return null
  const ate = primeira.pagoEm + DESCONTO.horas * 3600e3
  if (!(ate > agora)) return null
  return { pct: DESCONTO.pct, ate: new Date(ate).toISOString() }
}
