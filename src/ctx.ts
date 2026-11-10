import { createContext, useContext } from 'react'
import { PRODUTOS, vendaLigada, type MaterialId, type ProdutoId } from '../shared/catalogo'
import { DESCONTO, EXTRAS_DESCONTO, PRODUTOS_COM_DESCONTO } from '../shared/desconto'
import { agoraServidor } from './relogio'
import { podeVerAulas } from './aulas'
import type { BauId, Estado } from '../shared/jogo'
import type { Eu, Salvavel } from './api'

export type Tela =
  | { t: 'painel' }
  | { t: 'boas' }
  | { t: 'nome' }
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

/** desconto de 30% que vale AGORA para este produto: preço, link (que só o servidor manda) e o fim do prazo.
 *  Some sozinho quando o prazo acaba, mesmo sem recarregar (relógio do servidor). */
export function precoPresente(eu: Eu, p: ProdutoId, agora = agoraServidor()) {
  const o = eu.acesso.ofertasDesconto?.[p as keyof NonNullable<Eu['acesso']['ofertasDesconto']>]
  if (!o || !o.checkoutUrl || !(Date.parse(o.ate) > agora) || tem(eu, p)) return null
  return o
}

/** o presente da primeira compra está valendo agora? (prazo de 3 h do servidor) */
export const presenteValendo = (eu: Eu, agora = agoraServidor()): boolean => !!eu.acesso.desconto && Date.parse(eu.acesso.desconto.ate) > agora

/** materiais em que ela pode ganhar o presente de 30% depois (à venda e que ela não tem), fora `menos` */
export function comPresente(eu: Eu, menos?: ProdutoId): ProdutoId[] {
  return PRODUTOS_COM_DESCONTO.filter((q) => q !== menos && ofertaDisponivel(eu, q) && (q !== 'videoaulas' || !podeVerAulas(eu)))
}

/** materiais com o desconto valendo agora */
export const comDescontoAgora = (eu: Eu, agora = agoraServidor()): ProdutoId[] => PRODUTOS_COM_DESCONTO.filter((q) => !!precoPresente(eu, q, agora) && (q !== 'videoaulas' || !podeVerAulas(eu)))

/** aviso antes da compra: comprando `p` agora (a primeira compra de extra), ela ganha 30% em outro material que ainda pode comprar */
export const ganhaPresente = (eu: Eu, p: ProdutoId) => !!eu.acesso.ganhaPresente && EXTRAS_DESCONTO.includes(p) && comPresente(eu, p).length > 0

const NOME_PRESENTE: Partial<Record<ProdutoId, [string, string]>> = {
  videoaulas: ['nas Aulas em vídeo', 'Aulas'],
  etiquetas: ['nas Etiquetas com o seu nome', 'Etiquetas'],
  contafeita: ['no Conta Feita', 'Conta Feita'],
}
const ou = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ou ${xs[xs.length - 1]}` : xs[0] ?? '')

/** tela Liberado!: onde o que ela comprou aparece no Início. Aulas, Etiquetas e Conta Feita têm cartão próprio no topo;
 *  os outros ficam em "Minhas compras" (COMPRAS_EXTRAS em Painel.tsx) */
export function ondeFica(p: ProdutoId): string {
  if (p === 'videoaulas') return 'As Videoaulas já estão no Início, logo no topo.'
  if (p === 'etiquetas') return 'As Imagens e Etiquetas com o Seu Nome já estão no Início, logo no topo.'
  if (p === 'contafeita') return 'O Respostas com a Conta Feita já está no Início, logo no topo.'
  return `${PRODUTOS[p].nome} já está no Início, em “Minhas compras”.`
}

/** texto curto da faixa: onde o desconto vale (só nos que ela ainda pode comprar) */
export const textoFaixa = (eu: Eu): string => `${DESCONTO.pct}% de presente em ${ou(comDescontoAgora(eu).map((q) => NOME_PRESENTE[q]![1]))}`

/** texto do aviso antes da compra. Na oferta: o que ela ganha comprando ESTE material. No Início: comprando qualquer um. */
export function textoPresente(eu: Eu, p?: ProdutoId): string {
  const lista = comPresente(eu, p)
  if (p) return `Sua primeira compra te deixa com ${DESCONTO.pct}% de presente em mais um: ${ou(lista.map((q) => NOME_PRESENTE[q]![0]))}. Ele fica guardado por ${DESCONTO.horas} horas depois da compra.`
  return `Qualquer material daqui te deixa com ${DESCONTO.pct}% de presente em mais um (${ou(lista.map((q) => NOME_PRESENTE[q]![1]))}), guardado por ${DESCONTO.horas} horas.`
}
