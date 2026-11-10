import { createContext, useContext } from 'react'
import { PRODUTOS, vendaLigada, type MaterialId, type ProdutoId } from '../shared/catalogo'
import { DESCONTO, EXTRAS_DESCONTO, PRECO_PRESENTE } from '../shared/desconto'
import { podeVerAulas } from './aulas'
import type { BauId, Estado } from '../shared/jogo'
import type { Eu, Salvavel } from './api'

export type Tela =
  | { t: 'painel' }
  | { t: 'boas' }
  | { t: 'pergunta' }
  | { t: 'resultado' }
  | { t: 'avatar' }
  | { t: 'jornada' }
  | { t: 'licao'; id: string }
  | { t: 'ler'; m: MaterialId; p: number }
  | { t: 'receitas' }
  | { t: 'sos' }
  | { t: 'bau'; b: BauId }
  | { t: 'raspa'; etapa: number }
  | { t: 'oferta'; p: ProdutoId; origem: string }
  | { t: 'videoaulas' }
  | { t: 'loja' }
  | { t: 'lojinha' }
  | { t: 'etiquetas' }
  | { t: 'contafeita' }
  | { t: 'materiais' }
  | { t: 'conquistas' }
  | { t: 'aulas' }
  | { t: 'aula'; a: string }

export interface Ctx {
  eu: Eu
  estado: Estado
  ir(t: Tela): void
  trocar(t: Tela): void
  voltar(): void
  mudar(fn: (e: Estado) => Estado): void
  salvarPerfil(d: Salvavel): void
  toast(m: string): void
  evento(tipo: string, dados?: Record<string, unknown>): void
  recarregar(): Promise<void>
  sair(): void
}

export const CtxReact = createContext<Ctx | null>(null)
export const useApp = (): Ctx => useContext(CtxReact)!

export const tem = (eu: Eu, p: ProdutoId) => eu.acesso.produtos.includes(p)
export const temMaterial = (eu: Eu, m: MaterialId) => eu.acesso.materiais.includes(m)

/** a oferta pode aparecer? tem checkout e ela ainda não tem.
 *  A Primeira Encomenda é só downsell: aparece uma vez, depois de ela recusar a Encomenda Puxa Encomenda,
 *  e nunca no catálogo nem no Início. Some para quem já tem a Encomenda Puxa Encomenda. */
export function ofertaDisponivel(eu: Eu, p: ProdutoId): boolean {
  if (p === 'kit' || !PRODUTOS[p].checkoutUrl || !vendaLigada(p) || tem(eu, p)) return false
  if (p === 'primeira' && tem(eu, 'encomenda')) return false
  return true
}

export const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: centavos % 100 ? 2 : 0, maximumFractionDigits: 2 })

/** o checkout com desconto deste produto já existe na Wiapy? Sem ele, nada de preço riscado nem aviso de 30% OFF */
export const temCheckoutDesconto = (p: ProdutoId): boolean => !!PRECO_PRESENTE[p]?.checkoutUrl

/** presente da primeira compra: preço e checkout com desconto, se ainda estiver valendo para este produto
 *  e se o checkout com desconto existir (sem ele a cobrança sairia com o preço cheio) */
export function precoPresente(eu: Eu, p: ProdutoId, agora = Date.now()) {
  const d = eu.acesso.desconto
  const preco = PRECO_PRESENTE[p]
  if (!d || !preco || !preco.checkoutUrl || !(Date.parse(d.ate) > agora)) return null
  return { ...preco, pct: d.pct, ate: d.ate }
}

/** materiais que ela ainda pode comprar com o presente de 30% (com checkout com desconto, à venda e que ela não tem), fora `menos` */
export function comPresente(eu: Eu, menos?: ProdutoId): ProdutoId[] {
  return (Object.keys(PRECO_PRESENTE) as ProdutoId[]).filter((q) => q !== menos && !!PRECO_PRESENTE[q]?.checkoutUrl && ofertaDisponivel(eu, q) && (q !== 'videoaulas' || !podeVerAulas(eu)))
}

/** aviso antes da compra: comprando `p` agora (a primeira compra de extra), ela ganha 30% em outro material que ainda pode comprar */
export const ganhaPresente = (eu: Eu, p: ProdutoId) => !!eu.acesso.ganhaPresente && EXTRAS_DESCONTO.includes(p) && comPresente(eu, p).length > 0

const NOME_PRESENTE: Partial<Record<ProdutoId, [string, string]>> = {
  videoaulas: ['nas Aulas em vídeo', 'Aulas'],
  etiquetas: ['nas Etiquetas com o seu nome', 'Etiquetas'],
  contafeita: ['no Conta Feita', 'Conta Feita'],
}
const ou = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ou ${xs[xs.length - 1]}` : xs[0] ?? '')

/** texto curto da faixa com relógio: onde o desconto vale (só nos que ela ainda pode comprar) */
export const textoFaixa = (eu: Eu): string => `${DESCONTO.pct}% OFF em ${ou(comPresente(eu).map((q) => NOME_PRESENTE[q]![1]))}`

/** texto do aviso antes da compra. Na oferta: o que ela ganha comprando ESTE material. No Início: comprando qualquer um. */
export function textoPresente(eu: Eu, p?: ProdutoId): string {
  const lista = comPresente(eu, p)
  if (p) return `Comprando este material, você ganha ${DESCONTO.pct}% OFF ${ou(lista.map((q) => NOME_PRESENTE[q]![0]))}, válido por ${DESCONTO.horas} horas depois da compra.`
  return `Comprando qualquer material daqui, você ganha ${DESCONTO.pct}% OFF em mais um (${ou(lista.map((q) => NOME_PRESENTE[q]![1]))}), por ${DESCONTO.horas} horas.`
}
