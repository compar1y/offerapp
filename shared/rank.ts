// Ranking semanal ANÔNIMO e opcional. Regras puras, usadas pelo servidor (server/rank.ts) e pelo app.
// O servidor guarda só o apelido e os PF da semana. Sem nome, e-mail ou foto. Nunca completa a lista com perfis falsos.

export const RANK = {
  /** mínimo de participantes reais para a lista aparecer (o servidor lê RANK_MIN_PARTICIPANTS) */
  minDefault: 10,
  /** teto de PF numa semana: 60 por dia x 7 dias (é o teto diário do jogo) */
  maxWeekPf: 420,
  top: 10,
  /** 3 caracteres sem 0/1/I/O para não confundir: "Fornada 4F2" */
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  maxMembers: 5000,
} as const

export const NICK_RE = /^Fornada [A-HJ-NP-Z2-9]{3}$/

export const isNick = (s: unknown): s is string => typeof s === 'string' && NICK_RE.test(s)

export const nickFrom = (pick: () => number): string => {
  let s = ''
  for (let i = 0; i < 3; i++) s += RANK.alphabet[pick() % RANK.alphabet.length]
  return `Fornada ${s}`
}

export interface BoardRow {
  pos: number
  apelido: string
  pf: number
  me: boolean
}

export interface Board {
  joined: boolean
  apelido: string | null
  week: string
  participants: number
  min: number
  /** true só quando há participantes reais suficientes */
  ready: boolean
  top: BoardRow[]
  me: { pos: number; pf: number } | null
}

/** posição de competição: empate divide a mesma posição (1, 2, 2, 4) */
export function boardOf(week: string, scores: Record<string, number>, me: string | null, min: number): Board {
  const rows = Object.entries(scores)
    .filter(([a, pf]) => isNick(a) && Number.isFinite(pf) && pf >= 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const participants = rows.length
  const ready = participants >= min
  const base: Board = { joined: me !== null, apelido: me, week, participants, min, ready, top: [], me: null }
  if (!ready) return base
  const posOf = (pf: number) => 1 + rows.filter((r) => r[1] > pf).length
  base.top = rows.slice(0, RANK.top).map(([apelido, pf]) => ({ pos: posOf(pf), apelido, pf, me: apelido === me }))
  const mine = me !== null ? scores[me] : undefined
  if (me !== null && typeof mine === 'number') base.me = { pos: posOf(mine), pf: mine }
  return base
}

export const rankText = {
  titulo: 'Ranking da semana',
  explica: 'Opcional e anônimo. Você aparece só com um apelido gerado (por exemplo "Fornada 4F2") e os PF da semana. Sem nome, e-mail ou foto. Não tem prêmio, e o ranking recomeça toda segunda-feira.',
  guardado: 'O servidor guarda só o apelido e os PF da semana. Você pode sair e apagar tudo quando quiser.',
  espera: (falta: number) => (falta === 1 ? 'Falta 1 participante para a lista aparecer.' : `Faltam ${falta} participantes para a lista aparecer.`),
  esperaTxt: 'A lista só aparece quando houver participantes de verdade suficientes. Nunca preenchemos com perfis de mentira.',
  sair: 'Sair e apagar meus dados do ranking',
} as const
