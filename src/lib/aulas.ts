// Progresso das aulas em vídeo no aparelho: onde parou e quais já foram assistidas. Uma chave por e-mail, irmã da do jogo.
// Formato: { [arquivo]: { progressSec, watched, updatedAt } }. Nada vai para o servidor.
import { useSyncExternalStore } from 'react'
import { AULAS, AULA_BY_FILE } from '../data/aulas'
import { getState, useStore } from './store'
import { gameAulaAssistida } from './game'

export interface AulaProgress {
  progressSec: number
  watched: boolean
  updatedAt: number
}
type Prog = Record<string, AulaProgress>

const KEY = (email: string) => `panetone-aulas:v1:${email.toLowerCase()}`

function load(email: string): Prog {
  try {
    const raw = email ? localStorage.getItem(KEY(email)) : null
    const j = raw ? (JSON.parse(raw) as unknown) : null
    if (j && typeof j === 'object') return j as Prog
  } catch {
    /* começa limpo */
  }
  return {}
}

let cache: { email: string; p: Prog } | null = null
const listeners = new Set<() => void>()
const sub = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
function snapshot(email: string): Prog {
  if (!cache || cache.email !== email) cache = { email, p: load(email) }
  return cache.p
}
const email = (): string => getState().session?.email ?? ''

function save(file: string, patch: Partial<AulaProgress>) {
  const e = email()
  const p = snapshot(e)
  const cur = p[file] ?? { progressSec: 0, watched: false, updatedAt: 0 }
  cache = { email: e, p: { ...p, [file]: { ...cur, ...patch, updatedAt: Date.now() } } }
  try {
    if (e) localStorage.setItem(KEY(e), JSON.stringify(cache.p))
  } catch {
    /* segue em memória */
  }
  listeners.forEach((l) => l())
}

export function useAulas(): Prog {
  const e = useStore().session?.email ?? ''
  return useSyncExternalStore(sub, () => snapshot(e))
}

export const aulaProgress = (file: string): AulaProgress | undefined => snapshot(email())[file]

/** guarda onde parou (chamado de tempos em tempos e ao pausar/sair) */
export function saveAulaTime(file: string, sec: number) {
  if (!AULA_BY_FILE[file] || !Number.isFinite(sec)) return
  save(file, { progressSec: Math.max(0, Math.floor(sec)) })
}

/** terminou o vídeo ou tocou em "Já assisti": marca e conta no jogo (os pontos entram uma vez por aula) */
export function markAulaWatched(file: string) {
  const a = AULA_BY_FILE[file]
  if (!a) return
  save(file, { watched: true, progressSec: 0 })
  gameAulaAssistida(file, a.titulo)
}

export function unmarkAulaWatched(file: string) {
  if (AULA_BY_FILE[file]) save(file, { watched: false })
}

export const watchedCount = (p: Prog): number => AULAS.filter((a) => p[a.arquivo]?.watched).length
