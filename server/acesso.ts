// O que cada e-mail comprou e o que isso libera (regras em shared/acesso.ts, as mesmas do middleware.ts).
import { materiaisLiberados, type MaterialId, type ProdutoId } from '../shared/catalogo.js'
import { produtosDe } from '../shared/acesso.js'
import { descontoDe, presentePendente, type Desconto } from '../shared/desconto.js'
import { db } from './db.js'

export interface Acesso { produtos: ProdutoId[]; pendentes: ProdutoId[]; materiais: MaterialId[]; desconto: Desconto | null; ganhaPresente: boolean }

export async function acessoDe(email: string): Promise<Acesso> {
  const { data, error } = await db().from('compras').select('produto,status,criado_em,atualizado_em,metodo,pagamento_id').eq('email', email)
  if (error) throw error
  const { produtos, pendentes } = produtosDe(data ?? [])
  return { produtos, pendentes, materiais: materiaisLiberados(produtos), desconto: descontoDe(data ?? []), ganhaPresente: presentePendente(data ?? []) }
}
