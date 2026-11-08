// Conta os dias em que ela entrou (tabela eventos, tipo 'dia.aberto') e acha o presente já escolhido (tabela compras, metodo 'presente').
// Sem tabela nova: nada para rodar no Supabase.
import type { ProdutoId } from '../shared/catalogo.js'
import { hojeBR } from '../shared/jogo.js'
import { presenteDe, type Presente } from '../shared/presente.js'
import { db } from './db.js'

/** registra o dia de hoje (uma vez) e devolve o saldo do presente */
export async function marcarDiaEContar(email: string): Promise<Presente> {
  const hoje = hojeBR()
  const dias = await diasDe(email)
  if (!dias.has(hoje)) {
    const { error } = await db().from('eventos').insert({ email, tipo: 'dia.aberto', dados: { dia: hoje } })
    if (error) throw error
    dias.add(hoje)
  }
  return presenteDe(dias.size, await escolhidoDe(email))
}

export async function presenteAtual(email: string): Promise<Presente> {
  const [dias, escolhido] = await Promise.all([diasDe(email), escolhidoDe(email)])
  return presenteDe(dias.size, escolhido)
}

async function diasDe(email: string): Promise<Set<string>> {
  const { data, error } = await db().from('eventos').select('dados').eq('email', email).eq('tipo', 'dia.aberto').limit(1000)
  if (error) throw error
  return new Set((data ?? []).map((r) => String((r.dados as { dia?: unknown })?.dia ?? '')).filter(Boolean))
}

async function escolhidoDe(email: string): Promise<ProdutoId | null> {
  const { data, error } = await db().from('compras').select('produto').eq('email', email).eq('metodo', 'presente').limit(1)
  if (error) throw error
  return (data?.[0]?.produto as ProdutoId | undefined) ?? null
}
