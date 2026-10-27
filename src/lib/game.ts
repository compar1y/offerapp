// Gamificação "Minha fornada" no aparelho: pontos, selos, livro de fornadas, encomendas, favoritas e configurações.
// Tudo fica em localStorage (uma chave por e-mail) e as fotos em IndexedDB. Nada disso vai para o servidor.
import { useEffect, useSyncExternalStore } from 'react'
import { ITEM_BY_ID, TRACKS, shortTitle, type ItemId, type OfferId } from '../../shared/catalog'
import * as G from '../../shared/game'
import { CALC_ENABLED, RANK_ENABLED } from '../data/config'
import { getState, owns, useStore } from './store'
import { rankLeave, rankScore, thisWeek } from './rank'
import { catalogOffers } from './offers'
import { delPhoto, delPhotos, putPhoto, resizeImage } from './photos'

const KEY = (email: string) => `panetone-game:v1:${email.toLowerCase()}`
const today = (): string => G.ymd(new Date())

export const titleOf = (id: string): string => {
  const it = ITEM_BY_ID[id as ItemId]
  if (!it) return id
  return it.kind === 'offer' ? shortTitle(id as OfferId) : it.title
}

function load(email: string): G.GameState {
  const base = G.emptyGame(today())
  try {
    const raw = email ? localStorage.getItem(KEY(email)) : null
    if (raw) {
      const j = JSON.parse(raw) as Partial<G.GameState>
      if (j && j.v === 1) return { ...base, ...j, config: { ...base.config, ...(j.config ?? {}) }, streak: { ...base.streak, ...(j.streak ?? {}) }, branch: { ...base.branch, ...(j.branch ?? {}) } }
    }
  } catch {
    /* começa limpo */
  }
  return base
}

let cache: { email: string; st: G.GameState } | null = null
let toast: { id: number; msgs: string[] } = { id: 0, msgs: [] }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const sub = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function snapshot(email: string): G.GameState {
  if (!cache || cache.email !== email) cache = { email, st: load(email) }
  return cache.st
}
const cur = (): { email: string; st: G.GameState } => {
  const email = getState().session?.email ?? ''
  snapshot(email)
  return cache as { email: string; st: G.GameState }
}
function commit(st: G.GameState, msgs: string[] = []) {
  const c = cur()
  cache = { email: c.email, st }
  try {
    if (c.email) localStorage.setItem(KEY(c.email), JSON.stringify(st))
  } catch {
    /* segue em memória */
  }
  if (msgs.length) toast = { id: toast.id + 1, msgs }
  emit()
}
let celebration: { id: number; c: G.Celebration | null } = { id: 0, c: null }
const apply = (r0: G.Res) => {
  const before = cur().st
  const r = G.withUnlocks(before, r0)
  if (r.st !== before || r.msgs.length) {
    commit(r.st, r.msgs)
    const c = G.showGame(r.st) && r.st.config.festa ? G.celebrationOf(r.msgs) : null
    if (c) {
      celebration = { id: celebration.id + 1, c }
      emit()
    }
    pushRankSoon()
  }
}
export const useCelebration = (): { id: number; c: G.Celebration | null } => useSyncExternalStore(sub, () => celebration)
export const closeCelebration = () => {
  celebration = { id: celebration.id, c: null }
  emit()
}

// ---- ranking anônimo: só manda os PF da semana quando a cliente entrou e o jogo está visível
let rankTimer: ReturnType<typeof setTimeout> | undefined
function pushRankSoon() {
  const st = cur().st
  if (!RANK_ENABLED || !st.rank?.on || !G.showRank(st)) return
  clearTimeout(rankTimer)
  rankTimer = setTimeout(() => {
    const s = cur().st
    if (s.rank?.on && G.showRank(s)) void rankScore(G.weeklyPf(s, today()), thisWeek())
  }, 2500)
}
/** entrar: o servidor gera o apelido; só então ele fica gravado aqui */
export function gameRankSet(apelido: string | null) {
  const st = cur().st
  commit({ ...st, rank: apelido ? { on: true, apelido } : undefined })
  if (apelido) pushRankSoon()
}

export function useGame(): G.GameState {
  const email = useStore().session?.email ?? ''
  return useSyncExternalStore(sub, () => snapshot(email))
}
export const useToast = (): { id: number; msgs: string[] } => useSyncExternalStore(sub, () => toast)
export const clearToast = () => {
  toast = { id: toast.id, msgs: [] }
  emit()
}

const contaOkNow = (): boolean => {
  if (!CALC_ENABLED) return false
  const t = getState().session?.tools?.calculadora
  return !!t && (t.owned || !t.roundUsed)
}
const base = (): G.BaseCtx => ({ today: today(), hasBump: owns(getState(), 'bump'), contaOk: contaOkNow(), hour: new Date().getHours() })
const ownedGameItems = (): string[] => (getState().session?.items ?? []) as string[]
const uid = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

// ---- derivados
export const inTrail = (id: string): boolean => TRACKS.some((t) => t.steps.some((s) => s.offer === id))
export const weekSuggestion = (): { item: string; reason: string } | null => G.suggestionOf(G.weekKey(today()), ownedGameItems())

// materiais que a cliente tem, marcou como visto, e ainda não marcou "Fiz essa", na ordem das trilhas
export function seenNotDone(): string[] {
  const s = getState()
  const ids = [...TRACKS.flatMap((t) => t.steps.map((x) => x.offer as string)), 'main']
  const inCat = new Set(catalogOffers().map((o) => o.id as string))
  return ids.filter((id) => (id === 'main' || inCat.has(id) || owns(s, id as ItemId)) && owns(s, id as ItemId) && s.seen[id as ItemId] && !s.done[id as ItemId])
}
export function useNextStep(): { step: G.NextStep | null; dot: number; st: G.GameState } {
  const st = useGame()
  const s = useStore() // refaz o cálculo quando "visto" e "fiz essa" mudam
  void s.seen
  void s.done
  const step = G.nextStepOf(st, { today: today(), titleOf, seenNotDone: seenNotDone() })
  return { step, dot: G.dotCount(st, step), st }
}

// ---- ações
export function gameDone(item: string) {
  const c = cur()
  apply(G.onDone(c.st, { ...base(), item, title: titleOf(item), id: uid(), trailStage: inTrail(item), sugestao: weekSuggestion()?.item ?? null }))
}
export async function gameNote(id: string, patch: { nota?: number; texto?: string; file?: File | null; removePhoto?: boolean }) {
  let foto: boolean | undefined
  if (patch.file) {
    try {
      await putPhoto(id, await resizeImage(patch.file))
      foto = true
    } catch {
      toast = { id: toast.id + 1, msgs: ['Não consegui salvar a foto neste aparelho. A anotação foi salva.'] }
      emit()
    }
  } else if (patch.removePhoto) {
    await delPhotos([id])
    foto = false
  }
  apply(G.onNote(cur().st, { ...base(), id, nota: patch.nota, texto: patch.texto, foto }))
}
export const gameGift = (id: string, on: boolean) => apply(G.onGift(cur().st, { ...base(), id, on }))
export const gameSocorro = (tipo: string, resolveu: boolean) => apply(G.onSocorro(cur().st, { ...base(), tipo, resolveu }))
export const gameMeta = () => apply(G.onMetaDia(cur().st, base()))
export const gameFav = (item: string) => apply(G.onFav(cur().st, { ...base(), item, title: titleOf(item) }))
export const gameConta = () => apply(G.onConta(cur().st, base()))
export const gameChecklist = (item: string, patch: { toggle?: string; add?: string; remove?: string }) => commit(G.setChecklist(cur().st, item, patch))
export const gameEncomenda = (v: { nome: string; sabor: string; qtd: number; entrega: string }) => apply(G.onEncomenda(cur().st, { ...base(), id: uid(), ...v }))
export const gameEntregue = (id: string) => apply(G.onEntregue(cur().st, { ...base(), id }))
export const gameDelEncomenda = (id: string) => commit(G.removeEncomenda(cur().st, id))
export const gameMetaEnc = (n: number | null) => commit(G.setMetaEncomendas(cur().st, n))
export async function gameDelFornada(id: string) {
  await delPhotos([id])
  commit(G.removeFornada(cur().st, id))
}
export const gameConfig = (patch: Parameters<typeof G.setConfig>[1]) => commit(G.setConfig(cur().st, patch))
export const gameCloseLevel = () => commit(G.closeLevelCard(cur().st))
export function gameSeeExtra(id: string) {
  const st = G.seeExtra(cur().st, id)
  if (st !== cur().st) commit(st)
  apply(G.onExtraAberto(cur().st, base())) // missão do dia "abra um extra" (uma vez por dia)
}
export const gameVenda = () => apply(G.onVendaAnotada(cur().st, base()))
/** grava a lista de missões de hoje (a mesma que a tela mostra) para ela não mudar durante o dia */
export function useMissions(): { itens: string[]; feitos: string[]; todas: boolean } {
  const st = useGame()
  useStore()
  const b = base()
  useEffect(() => {
    const c = cur()
    if (c.email && c.st.missoes?.d !== b.today) commit(G.startDay(c.st, base()))
  }, [st.missoes?.d, b.today])
  return G.missionsToday(st, b)
}
export const gameAck = (key: string | null) => commit(G.ackStep(cur().st, key))
export async function gameErase() {
  const c = cur()
  if (c.st.rank?.on) await rankLeave().catch(() => false) // sair do ranking apaga o apelido e os PF no servidor
  await delPhotos(c.st.fornadas.map((f) => f.id))
  commit(G.eraseAll(today()))
  toast = { id: toast.id + 1, msgs: ['Seus dados de jogo foram apagados deste aparelho.'] }
  emit()
}
export async function gameDeletePhoto(id: string) {
  await delPhoto(id).catch(() => undefined)
  commit({ ...cur().st, fornadas: cur().st.fornadas.map((f) => (f.id === id ? { ...f, foto: false } : f)) })
}

// ---- visita: guarda a data de hoje e lembra há quantos dias a cliente não aparecia (só para as boas-vindas de volta)
let away: { email: string; days: number } | null = null
export function useVisit(): { days: number } {
  const email = useStore().session?.email ?? ''
  const st = useGame()
  useEffect(() => {
    if (!email || (away && away.email === email)) return
    const c = cur()
    away = { email, days: G.awayDays(c.st, today()) }
    commit(G.visit(c.st, today()))
  }, [email, st])
  return { days: away?.email === email ? away.days : 0 }
}
export const markLastItem = (item: string) => {
  const c = cur()
  if (c.email && c.st.ultimoItem !== item) commit(G.visit(c.st, today(), item))
}

// Conta da Fornada: ao concluir uma conta ("Fiz minha conta" +15 PF uma vez; +5 PF por receita nova, máx. 2/dia). Abrir a ferramenta: 0 PF.
export const gameContaFeita = (receita: number | null) => apply(G.onContaFeita(cur().st, { ...base(), receita }))
