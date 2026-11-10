import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { abrirApp, estadoNovo, hojeBR, type Estado } from '../shared/jogo'
import { api, ErroApi, type Eu, type Salvavel } from './api'
import { CtxReact, type Ctx, type Tela } from './ctx'
import { Entrar } from './telas/Entrar'
import { Avatar, Boas, Pergunta, Resultado } from './telas/Onboarding'
import { Painel } from './telas/Painel'
import { Jornada, LicaoTela } from './telas/Jornada'
import { Leitor } from './telas/Leitor'
import { Receitas } from './telas/Receitas'
import { Sos } from './telas/Sos'
import { BauTela, Loja, Raspa } from './telas/Presentes'
import { PresenteDaFabrica } from './telas/Presente'
import { Oferta } from './telas/Oferta'
import { OfertaVideo } from './telas/OfertaVideo'
import { Conquistas, Materiais } from './telas/Materiais'
import { AulaTela, Aulas } from './telas/Aulas'
import { EtiquetasTela } from './telas/Etiquetas'
import { ContaFeitaTela } from './telas/ContaFeita'
import { PopupDesconto, TELA_ACESSO, conferirPopup } from './telas/PopupDesconto'
import type { UpsellPopup } from '../shared/popupDesconto'

type Fase = { f: 'carregando' } | { f: 'entrar'; aviso?: string } | { f: 'bloqueada'; msg: string } | { f: 'dentro' }

/** quantas telas do app existem antes desta no histórico da aba (0 = chegou agora, de fora ou recarregando) */
const profundidade = (): number => {
  const n = (history.state as { n?: unknown } | null)?.n
  return typeof n === 'number' && n > 0 ? n : 0
}

// entra direto no Início: as perguntas do perfil ficam opcionais, num cartão do Início
const telaInicial = (_eu: Eu): Tela => ({ t: 'painel' })

export function App() {
  const [fase, setFase] = useState<Fase>({ f: 'carregando' })
  const [eu, setEu] = useState<Eu | null>(null)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [tela, setTela] = useState<Tela>({ t: 'painel' })
  const [aviso, setAviso] = useState<string | null>(null)
  const pendente = useRef<Estado | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const toastT = useRef<number | undefined>(undefined)
  const [popup, setPopup] = useState<{ comprado: UpsellPopup; oferta: UpsellPopup } | null>(null)

  const toast = useCallback((m: string) => {
    setAviso(m)
    clearTimeout(toastT.current)
    toastT.current = window.setTimeout(() => setAviso(null), 2800)
  }, [])

  const gravar = useCallback((keepalive = false) => {
    clearTimeout(timer.current)
    const e = pendente.current
    if (!e) return
    pendente.current = null
    api.salvar({ estado: e }, keepalive).catch(() => {
      pendente.current = pendente.current ?? e // tenta de novo na próxima mudança
    })
  }, [])

  const carregar = useCallback(async (primeiraVez: boolean) => {
    try {
      const d = await api.eu()
      setEu(d)
      if (primeiraVez) {
        const hoje = hojeBR()
        const e = abrirApp(d.estado ?? estadoNovo(hoje), hoje)
        setEstado(e)
        pendente.current = e
        gravar()
        const salva = history.state as (Tela & { n?: number }) | null
        const t = salva?.t ? salva : telaInicial(d)
        history.replaceState({ ...t, n: profundidade() }, '')
        setTela(t)
      }
      setFase({ f: 'dentro' })
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) setFase({ f: 'entrar' })
      else if (e instanceof ErroApi && e.status === 403) setFase({ f: 'bloqueada', msg: e.message })
      else if (primeiraVez) setFase({ f: 'bloqueada', msg: e instanceof Error ? e.message : 'Algo deu errado.' })
    }
  }, [gravar])

  useEffect(() => {
    carregar(true)
    const pop = (ev: PopStateEvent) => {
      if (ev.state) setTela(ev.state as Tela)
      window.scrollTo(0, 0)
    }
    const sumiu = () => {
      if (document.visibilityState === 'hidden') gravar(true)
      else carregar(false) // voltou do checkout: confere se a compra liberou
    }
    addEventListener('popstate', pop)
    document.addEventListener('visibilitychange', sumiu)
    return () => {
      removeEventListener('popstate', pop)
      document.removeEventListener('visibilitychange', sumiu)
    }
  }, [carregar, gravar])

  // popup de desconto pós-compra (shared/popupDesconto.ts): ao confirmar a compra de um upsell, leva à tela de acesso
  // do que ela comprou e abre a oferta do próximo por cima. Fechar deixa ela no material. Chave desligada: nada acontece.
  useEffect(() => {
    if (!eu) return
    const r = conferirPopup(eu)
    if (!r) return
    const t = TELA_ACESSO[r.comprado]
    history.replaceState({ ...t, n: profundidade() }, '')
    setTela(t)
    window.scrollTo(0, 0)
    setPopup(r)
  }, [eu])

  const ctx = useMemo<Ctx | null>(() => {
    if (!eu || !estado) return null
    return {
      eu,
      estado,
      ir(t) {
        history.pushState({ ...t, n: profundidade() + 1 }, '')
        setTela(t)
        window.scrollTo(0, 0)
      },
      trocar(t) {
        history.replaceState({ ...t, n: profundidade() }, '')
        setTela(t)
        window.scrollTo(0, 0)
      },
      // só volta no histórico quando a tela anterior é do app; senão vai para o Início (nunca para outro site)
      voltar() {
        if (profundidade() > 0) history.back()
        else {
          history.replaceState({ t: 'painel', n: 0 }, '')
          setTela({ t: 'painel' })
          window.scrollTo(0, 0)
        }
      },
      mudar(fn) {
        setEstado((atual) => {
          const novo = fn(atual!)
          pendente.current = novo
          clearTimeout(timer.current)
          timer.current = window.setTimeout(() => gravar(), 800)
          return novo
        })
      },
      salvarPerfil(d: Salvavel) {
        setEu((x) => (x ? { ...x, ...d } : x))
        api.salvar(d).catch(() => toast('Não consegui salvar agora. Confira a internet.'))
      },
      toast,
      evento: api.evento,
      recarregar: () => carregar(false),
      sair() {
        api.sair().finally(() => {
          setEu(null)
          setEstado(null)
          setFase({ f: 'entrar' })
        })
      },
    }
  }, [eu, estado, gravar, toast, carregar])

  if (fase.f === 'carregando') return <div className="carregando" aria-label="Carregando">🎄</div>
  if (fase.f === 'entrar') return <Entrar aoEntrar={() => carregar(true)} />
  if (fase.f === 'bloqueada')
    return (
      <div className="card pop">
        <h2>Não deu para abrir agora</h2>
        <p>{fase.msg}</p>
        <button className="btn" onClick={() => location.reload()}>Tentar de novo</button>
      </div>
    )
  if (!ctx) return null

  return (
    <CtxReact.Provider value={ctx}>
      {import.meta.env.VITE_DEMO === '1' && <BarraPrevia />}
      <Rota tela={tela} />
      {popup && <PopupDesconto comprado={popup.comprado} oferta={popup.oferta} fechar={() => setPopup(null)} />}
      {aviso && <div className="toast pop" role="status">{aviso}</div>}
    </CtxReact.Provider>
  )
}

function Rota({ tela }: { tela: Tela }) {
  switch (tela.t) {
    case 'boas': return <Boas />
    case 'pergunta': return <Pergunta />
    case 'resultado': return <Resultado />
    case 'avatar': return <Avatar />
    case 'jornada': return <Jornada />
    case 'licao': return <LicaoTela id={tela.id} />
    case 'ler': return <Leitor key={tela.m} m={tela.m} p={tela.p} />
    case 'receitas': return <Receitas />
    case 'sos': return <Sos />
    case 'bau': return <BauTela b={tela.b} />
    case 'raspa': return <Raspa etapa={tela.etapa} />
    case 'oferta': return <Oferta key={tela.p} p={tela.p} origem={tela.origem} />
    case 'loja': return <PresenteDaFabrica />
    case 'lojinha': return <Loja />
    case 'etiquetas': return <EtiquetasTela />
    case 'contafeita': return <ContaFeitaTela />
    case 'videoaulas': return <OfertaVideo />
    case 'materiais': return <Materiais />
    case 'conquistas': return <Conquistas />
    case 'aulas': return <Aulas />
    case 'aula': return <AulaTela key={tela.a} a={tela.a} />
    default: return <Painel />
  }
}

function BarraPrevia() {
  return (
    <div className="aviso" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
      <span>Prévia com dados de exemplo</span>
      <button className="chip" style={{ cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }} onClick={() => import('./demo').then((d) => d.recomecarPrevia())}>Recomeçar</button>
    </div>
  )
}
