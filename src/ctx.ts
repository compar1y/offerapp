import { createContext, useContext } from 'react'
import { PRODUTOS, vendaLigada, type MaterialId, type ProdutoId } from '../shared/catalogo'
import { PRECO_PRESENTE } from '../shared/desconto'
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

/** aviso antes da compra: comprando este extra agora, ela ganha o presente da primeira compra */
export const ganhaPresente = (eu: Eu, p: ProdutoId) => !!eu.acesso.ganhaPresente && !!PRECO_PRESENTE[p] && algumCheckoutDesconto()

/** o presente só é anunciado se existir pelo menos um checkout com desconto para ela usar depois */
export const algumCheckoutDesconto = (): boolean => Object.values(PRECO_PRESENTE).some((x) => !!x?.checkoutUrl)
