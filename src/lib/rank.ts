// Ranking semanal anônimo: conversa com /api/event?r=... (mesma função do /api/event). Na prévia, é simulado só neste navegador
// e nunca inventa participantes: com uma pessoa só, a lista não aparece.
import { useSyncExternalStore } from 'react'
import { PREVIEW } from '../data/config'
import { RANK, boardOf, nickFrom, type Board } from '../../shared/rank'
import { weekKey, ymd } from '../../shared/game'
import { authedApi } from './access'
import { getState } from './store'

export interface RankView {
  board: Board | null
  /** carregando ou erro de rede */
  state: 'idle' | 'loading' | 'ok' | 'offline' | 'erro'
  msg: string
}
let view: RankView = { board: null, state: 'idle', msg: '' }
const subs = new Set<() => void>()
const set = (v: Partial<RankView>) => {
  view = { ...view, ...v }
  subs.forEach((f) => f())
}
export const useRank = (): RankView => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => view)
export const resetRank = () => set({ board: null, state: 'idle', msg: '' })

export const thisWeek = (): string => weekKey(ymd(new Date())) // a semana do servidor (horário de Brasília) é a que vale
const demoKey = () => `panetone-demo-rank:v1:${getState().session?.email ?? ''}`
const demoNick = (): string | null => {
  try {
    return localStorage.getItem(demoKey())
  } catch {
    return null
  }
}

async function call(action: 'board' | 'join' | 'score' | 'leave', body?: unknown): Promise<Board | null> {
  set({ state: 'loading', msg: '' })
  if (PREVIEW) {
    let nick = demoNick()
    if (action === 'join' && !nick) {
      nick = nickFrom(() => Math.floor(Math.random() * 1e6))
      localStorage.setItem(demoKey(), nick)
    }
    if (action === 'leave') {
      localStorage.removeItem(demoKey())
      nick = null
    }
    const wk = thisWeek()
    const b = boardOf(wk, nick ? { [nick]: (body as { pf?: number } | undefined)?.pf ?? 0 } : {}, nick, RANK.minDefault)
    set({ board: b, state: 'ok' })
    return b
  }
  const method = action === 'board' ? 'GET' : 'POST'
  const r = await authedApi<Board & { error?: string }>(`/event?r=${action}`, { method, ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}) })
  if (r.status === 0) {
    set({ state: 'offline', msg: 'Sem conexão. O ranking volta quando você tiver internet.' })
    return null
  }
  if (r.status >= 300 || !r.data) {
    set({ state: 'erro', msg: r.data?.error ?? 'Não foi possível falar com o ranking agora.' })
    return null
  }
  set({ board: r.data, state: 'ok' })
  return r.data
}

export const rankBoard = () => call('board')
export const rankJoin = () => call('join')
export const rankLeave = async (): Promise<boolean> => (await call('leave')) !== null
/** manda os PF da semana (só sobem). Chamado só quando a cliente entrou no ranking. */
export const rankScore = (pf: number, wk: string) => call('score', { pf: Math.max(0, Math.min(RANK.maxWeekPf, Math.round(pf))), week: wk })
