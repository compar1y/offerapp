// Aulas em vídeo: endereço dos vídeos e "onde parou" de cada aula.
// Os 25 .mp4 ficam dentro do próprio app, em public/aulas/ (servidos em /aulas/aula-NN.mp4). Sem serviço externo, sem YouTube, sem embed.
// O middleware.ts só entrega /aulas/* para quem está logada e comprou (o cookie de sessão vai junto, mesmo endereço).
// VITE_AULAS_VIDEO_BASE_URL troca a pasta (ATENÇÃO: fora do app, o middleware não protege); vazio = a pasta do app. "off" mostra "sendo preparado".
// Quais aulas ela já assistiu fica no estado do jogo (servidor, estado.aulas). O tempo de cada aula fica só neste aparelho.
import { aulaAtual, ehAula } from '../shared/aulas'
import { podeVerAulasCom, type ModoAulas } from '../shared/acesso'
import type { Eu } from './api'

const env = (import.meta.env.VITE_AULAS_VIDEO_BASE_URL ?? '').trim()
export const AULAS_VIDEO_BASE_URL: string = env && env !== 'off' ? env : '/aulas'
export const AULAS_ON: boolean = env !== 'off'
export const aulaVideoUrl = (file: string): string => `${AULAS_VIDEO_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(file)}`

// Quem vê as aulas (flag de build, decisão do Levi):
//   'venda' (padrão): só quem comprou a oferta Videoaulas (produto 'videoaulas'); as outras veem a página de venda.
//   'kit': VITE_AULAS_ACESSO=kit libera para quem tem o kit, e a oferta Videoaulas some para ela.
//   O middleware.ts lê a mesma variável no servidor.
export const AULAS_ACESSO: ModoAulas = import.meta.env.VITE_AULAS_ACESSO === 'kit' ? 'kit' : 'venda'
export const podeVerAulas = (eu: Eu): boolean => podeVerAulasCom(eu.acesso.produtos, AULAS_ACESSO)

export interface AulaTempo { progressSec: number; updatedAt: number }
type Tempos = Record<string, AulaTempo>

const chave = (email: string) => `fornada-aulas:v1:${email.toLowerCase()}`

export function lerTempos(email: string): Tempos {
  try {
    const j = JSON.parse(localStorage.getItem(chave(email)) ?? '{}') as unknown
    if (!j || typeof j !== 'object') return {}
    // tempos gravados com os nomes antigos dos vídeos passam para aula-NN.mp4
    const t: Tempos = {}
    for (const [k, v] of Object.entries(j as Tempos)) {
      const novo = aulaAtual(k)
      if (novo && (!t[novo] || (v?.updatedAt ?? 0) > t[novo].updatedAt)) t[novo] = v
    }
    return t
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
