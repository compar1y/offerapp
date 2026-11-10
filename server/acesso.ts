// O que cada e-mail comprou e o que isso libera (regras em shared/acesso.ts, as mesmas do middleware.ts).
import { materiaisLiberados, type MaterialId, type ProdutoId } from '../shared/catalogo.js'
import { produtosDe } from '../shared/acesso.js'
import { presentePendente, type Desconto } from '../shared/desconto.js'
import { descontosAgora, type OfertaDesconto, type PopupServidor } from './descontoLinks.js'
import type { UpsellPopup } from '../shared/popupDesconto.js'
import { db } from './db.js'

export interface Acesso {
  produtos: ProdutoId[]; pendentes: ProdutoId[]; materiais: MaterialId[]; ganhaPresente: boolean
  /** presente da primeira compra, com o fim do prazo (3 h a partir da compra) */
  desconto: Desconto | null
  /** popup pós-compra: a compra de upsell com menos de 3 h e o que oferecer */
  popup: PopupServidor | null
  /** links com desconto que valem AGORA (só aparecem aqui enquanto o prazo vale) */
  ofertasDesconto: Partial<Record<UpsellPopup, OfertaDesconto>>
  /** hora do servidor, para o relógio do aparelho contar certo */
  agora: string
}

export async function acessoDe(email: string): Promise<Acesso> {
  const { data, error } = await db().from('compras').select('produto,status,criado_em,atualizado_em,metodo,pagamento_id').eq('email', email)
  if (error) throw error
  const { produtos, pendentes } = produtosDe(data ?? [])
  const agora = Date.now()
  const { desconto, popup, ofertasDesconto } = descontosAgora(data ?? [], produtos, agora)
  return { produtos, pendentes, materiais: materiaisLiberados(produtos), desconto, popup, ofertasDesconto, ganhaPresente: presentePendente(data ?? []), agora: new Date(agora).toISOString() }
}
