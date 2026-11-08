// O que cada e-mail comprou e o que isso libera.
import { materiaisLiberados, type MaterialId, type ProdutoId } from '../shared/catalogo.js'
import { db } from './db.js'

export interface Acesso { produtos: ProdutoId[]; pendentes: ProdutoId[]; materiais: MaterialId[] }

export async function acessoDe(email: string): Promise<Acesso> {
  const { data, error } = await db().from('compras').select('produto,status').eq('email', email)
  if (error) throw error
  const pagos = new Set<ProdutoId>()
  const pend = new Set<ProdutoId>()
  for (const c of data ?? []) {
    if (c.status === 'pago') pagos.add(c.produto as ProdutoId)
    else if (c.status === 'pendente') pend.add(c.produto as ProdutoId)
  }
  const produtos = [...pagos]
  return { produtos, pendentes: [...pend].filter((p) => !pagos.has(p)), materiais: materiaisLiberados(produtos) }
}
