// Aulas em vídeo: endereço dos vídeos e "onde parou" de cada aula.
// Vídeo só pelo nome do arquivo: VITE_AULAS_VIDEO_BASE_URL + "/" + nome. Sem YouTube, sem embed.
// Base vazia = os vídeos ainda não foram hospedados: a lista aparece e o player avisa que o vídeo está sendo preparado.
// Quais aulas ela já assistiu fica no estado do jogo (servidor, estado.aulas). O tempo de cada aula fica só neste aparelho.
import { ehAula } from '../shared/aulas'

export const AULAS_VIDEO_BASE_URL: string = import.meta.env.VITE_AULAS_VIDEO_BASE_URL ?? ''
export const AULAS_ON: boolean = AULAS_VIDEO_BASE_URL.trim() !== ''
export const aulaVideoUrl = (file: string): string => `${AULAS_VIDEO_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(file)}`

export interface AulaTempo { progressSec: number; updatedAt: number }
type Tempos = Record<string, AulaTempo>

const chave = (email: string) => `fornada-aulas:v1:${email.toLowerCase()}`

export function lerTempos(email: string): Tempos {
  try {
    const j = JSON.parse(localStorage.getItem(chave(email)) ?? '{}') as unknown
    return j && typeof j === 'object' ? (j as Tempos) : {}
  } catch {
    return {}
  }
}

/** guarda onde parou (perto do fim grava 0: ao reabrir, começa do início) */
export function gravarTempo(email: string, file: string, sec: number) {
  if (!ehAula(file) || !Number.isFinite(sec)) return
  const t = lerTempos(email)
  t[file] = { progressSec: Math.max(0, Math.floor(sec)), updatedAt: Date.now() }
  try {
    localStorage.setItem(chave(email), JSON.stringify(t))
  } catch {
    /* sem armazenamento: só não retoma */
  }
}
