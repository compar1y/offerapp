import { useEffect } from 'react'
import type { Eu } from '../api'
import { useApp, type Tela } from '../ctx'
import { TELAS_ONBOARDING } from '../onboarding'
import { ID_SELECAO, ofertasSelecao } from './Painel'

// Barra fixa no rodapé (Levi, 10/11): um jeito claro de voltar ao Início de qualquer tela interna,
// mais 2 atalhos para telas que já existem e a Coleção especial com a bolinha das ofertas que ela ainda não comprou.

export type AbaId = 'inicio' | 'receitas' | 'sos' | 'selecao'

/** telas do onboarding (src/onboarding.ts) e o player de aula em tela cheia (tem o próprio botão de fechar): sem barra */
const SEM_BARRA = new Set<Tela['t']>([...TELAS_ONBOARDING, 'aula'])

/** a barra aparece? Nunca no onboarding, no player de aula nem com um popup de oferta aberto (o login nem chega a montar a barra) */
export const mostrarNavbar = (tela: Tela, popupAberto: boolean) => !popupAberto && !SEM_BARRA.has(tela.t)

/** qual item fica aceso nesta tela (null = nenhum: ferramentas, materiais, aulas…) */
export function abaAtiva(tela: Tela): AbaId | null {
  switch (tela.t) {
    case 'painel': return 'inicio'
    case 'receitas': return 'receitas'
    case 'sos': return 'sos'
    case 'ler': return tela.m === 'ebook' ? 'receitas' : tela.m === 'fichas-socorro' ? 'sos' : null
    case 'oferta':
    case 'videoaulas': return 'selecao'
    default: return null
  }
}

/** Coleção com ofertas (n > 0): classe 'brilha' = estrela e bolinha pulsando com halo dourado (estilo.css; para em 0 e com reduced-motion) */
/** número da bolinha: ofertas da Coleção especial que ela ainda não comprou (0 = sem bolinha) */
export const contagemSelecao = (eu: Eu) => ofertasSelecao(eu).length

/** rola até a Coleção especial do Início, esperando a tela montar (vindo de uma tela interna) */
export function rolarAteSelecao(tentativas = 40) {
  const el = document.getElementById(ID_SELECAO)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // as capas acima carregam e empurram a seção: confere de novo depois
    setTimeout(() => document.getElementById(ID_SELECAO)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450)
  } else if (tentativas > 0) setTimeout(() => rolarAteSelecao(tentativas - 1), 25)
}

const ITENS: { id: AbaId; nome: string; ico: string }[] = [
  { id: 'inicio', nome: 'Início', ico: '🏠' },
  { id: 'receitas', nome: 'Receitas', ico: '📖' },
  { id: 'sos', nome: 'Socorro', ico: '🆘' },
  { id: 'selecao', nome: 'Coleção', ico: '★' },
]

export function Navbar({ tela, popupAberto }: { tela: Tela; popupAberto: boolean }) {
  const { eu, ir, evento } = useApp()
  const mostra = mostrarNavbar(tela, popupAberto)
  // espaço embaixo das telas para a barra não cobrir botões nem conteúdo (estilo.css: .com-navbar)
  useEffect(() => {
    document.body.classList.toggle('com-navbar', mostra)
    return () => document.body.classList.remove('com-navbar')
  }, [mostra])
  if (!mostra) return null
  const ativa = abaAtiva(tela)
  const n = contagemSelecao(eu)
  const tocar = (id: AbaId) => {
    evento('navbar.clique', { item: id, tela: tela.t })
    if (id === 'selecao') {
      if (n === 0 && tela.t !== 'painel') return ir({ t: 'painel' })
      if (tela.t !== 'painel') ir({ t: 'painel' })
      return rolarAteSelecao()
    }
    if (id === ativa) return window.scrollTo({ top: 0, behavior: 'smooth' })
    ir(id === 'inicio' ? { t: 'painel' } : id === 'receitas' ? { t: 'receitas' } : { t: 'sos' })
  }
  return (
    <nav className="navbar" aria-label="Navegação">
      {ITENS.map((i) => {
        const on = i.id === ativa
        const rotulo = i.id === 'selecao' && n > 0 ? `Coleção especial, ${n} ${n === 1 ? 'disponível' : 'disponíveis'}` : i.id === 'selecao' ? 'Coleção especial' : i.nome
        return (
          <button key={i.id} className={`nb-item${on ? ' on' : ''}${i.id === 'selecao' ? ` nb-selecao${n > 0 ? ' brilha' : ''}` : ''}`} aria-current={on ? 'page' : undefined} aria-label={rotulo} onClick={() => tocar(i.id)}>
            <span className="nb-ico" aria-hidden="true">
              {i.id === 'selecao' ? <span className="nb-estrela">{i.ico}</span> : i.ico}
              {i.id === 'selecao' && n > 0 && <b className="nb-bolinha"><span>{n}</span></b>}
            </span>
            <span className="nb-nome" aria-hidden="true">{i.nome}</span>
          </button>
        )
      })}
    </nav>
  )
}
