// Presente da Fábrica: moedas só por entrar no app (1 vez por dia, contado no servidor) e 1 livro grátis à escolha.
// Regras puras e testáveis; o servidor é quem confere e libera.
import type { ProdutoId } from './catalogo.js'

export const MOEDAS_POR_DIA = 10
export const CUSTO_PRESENTE = 50
/** livros que podem ser escolhidos de presente (aparecem só os que ela ainda não tem) */
export const LIVROS_PRESENTE: ProdutoId[] = ['recheios', 'primeira', 'encomenda']

export interface Presente {
  /** dias diferentes em que ela entrou no app */
  dias: number
  moedas: number
  /** o livro que ela já escolheu de presente (só 1 por pessoa) */
  escolhido: ProdutoId | null
}

/** moedas = 10 por dia de entrada; depois de escolher, as 50 usadas saem do saldo */
export function presenteDe(diasDistintos: number, escolhido: ProdutoId | null): Presente {
  const bruto = diasDistintos * MOEDAS_POR_DIA
  return { dias: diasDistintos, moedas: Math.max(0, bruto - (escolhido ? CUSTO_PRESENTE : 0)), escolhido }
}

/** pode escolher este livro agora? devolve o motivo quando não pode */
export function podeEscolher(p: Presente, produto: ProdutoId, jaTem: ProdutoId[]): true | string {
  if (!LIVROS_PRESENTE.includes(produto)) return 'Este material não está entre os presentes.'
  if (p.escolhido) return 'Você já escolheu o seu presente.'
  if (jaTem.includes(produto)) return 'Você já tem este material.'
  if (produto === 'primeira' && jaTem.includes('encomenda')) return 'Você já tem a Encomenda Puxa Encomenda, que é a versão completa.'
  if (p.moedas < CUSTO_PRESENTE) return `Faltam ${CUSTO_PRESENTE - p.moedas} moedas.`
  return true
}

export const diasQueFaltam = (p: Presente) => Math.max(0, Math.ceil((CUSTO_PRESENTE - p.moedas) / MOEDAS_POR_DIA))
