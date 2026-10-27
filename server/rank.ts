// Ranking semanal anônimo (opt-in). Vive dentro de api/event.ts (?r=...) para não passar do limite de 12 funções da Vercel Hobby.
//
// O que o servidor guarda:
//   rank:me:<id>   apelido da cliente. <id> é um HMAC do e-mail, só o servidor liga as duas coisas. Some ao sair.
//   rank:names     os apelidos em uso (para não repetir)
//   rank:wk:<sem>  apelido -> PF da semana (sem e-mail, nome ou foto). Expira sozinho.
import { randomInt } from 'node:crypto'
import { env, requireEnv } from './env.js'
import { hmac } from './crypto.js'
import { getKV } from './kv.js'
import { fail, json, methodNotAllowed, readJson, sessionEmail } from './http.js'
import { RANK, boardOf, isNick, nickFrom, type Board } from '../shared/rank.js'
import { addDays, weekKey } from '../shared/game.js'

const WEEK_TTL = 60 * 60 * 24 * 21

export const rankMin = (): number => {
  const n = Number(env('RANK_MIN_PARTICIPANTS'))
  return Number.isInteger(n) && n >= 2 && n <= 1000 ? n : RANK.minDefault
}

/** a semana do ranking segue o horário de Brasília (UTC-3), onde as clientes estão */
export const rankWeek = (now = Date.now()): string => weekKey(new Date(now - 3 * 3600 * 1000).toISOString().slice(0, 10))

const idOf = (email: string) => hmac(requireEnv('SESSION_SECRET'), `rank|${email}`).slice(0, 24)
const meKey = (id: string) => `rank:me:${id}`
const wkKey = (w: string) => `rank:wk:${w}`

type Names = Record<string, 1>
type Scores = Record<string, number>

async function board(week: string, apelido: string | null): Promise<Board> {
  const scores = (await getKV().get<Scores>(wkKey(week))) ?? {}
  return boardOf(week, scores, apelido, rankMin())
}

async function join(id: string): Promise<string | null> {
  const kv = getKV()
  const cur = await kv.get<string>(meKey(id))
  if (isNick(cur)) return cur
  const names = (await kv.get<Names>('rank:names')) ?? {}
  if (Object.keys(names).length >= RANK.maxMembers) return null
  let nick = ''
  for (let i = 0; i < 200; i++) {
    nick = nickFrom(() => randomInt(0, 1 << 20))
    if (!names[nick]) break
    nick = ''
  }
  if (!nick) return null
  names[nick] = 1
  await kv.set('rank:names', names)
  await kv.set(meKey(id), nick)
  return nick
}

async function putScore(week: string, apelido: string, pf: number, onlyRise: boolean): Promise<void> {
  const kv = getKV()
  const scores = (await kv.get<Scores>(wkKey(week))) ?? {}
  if (!(apelido in scores) && Object.keys(scores).length >= RANK.maxMembers) return
  const prev = scores[apelido] ?? 0
  scores[apelido] = onlyRise ? Math.max(prev, pf) : pf
  await kv.set(wkKey(week), scores, WEEK_TTL)
}

async function leave(id: string, week: string): Promise<void> {
  const kv = getKV()
  const nick = await kv.get<string>(meKey(id))
  await kv.del(meKey(id))
  if (!isNick(nick)) return
  const names = (await kv.get<Names>('rank:names')) ?? {}
  delete names[nick]
  await kv.set('rank:names', names)
  for (const w of [week, addDays(week, -7), addDays(week, -14), addDays(week, 7)]) {
    const s = await kv.get<Scores>(wkKey(w))
    if (s && nick in s) {
      delete s[nick]
      await kv.set(wkKey(w), s, WEEK_TTL)
    }
  }
}

export async function rankHandle(request: Request, action: string): Promise<Response> {
  try {
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)
    const id = idOf(email)
    const kv = getKV()
    const rl = await kv.incr(`rank:rl:${id}`, 60)
    if (rl > 40) return json({ error: 'Muitas tentativas. Espere um minuto.' }, 429)
    const week = rankWeek()
    const nick = await kv.get<string>(meKey(id))
    const me = isNick(nick) ? nick : null

    if (action === 'board') {
      if (request.method !== 'GET') return methodNotAllowed('GET')
      return json(await board(week, me))
    }
    if (request.method !== 'POST') return methodNotAllowed('POST')

    if (action === 'join') {
      const apelido = await join(id)
      if (!apelido) return json({ error: 'O ranking está cheio agora. Tente mais tarde.' }, 503)
      await putScore(week, apelido, 0, true)
      return json(await board(week, apelido))
    }
    if (action === 'score') {
      if (!me) return json({ error: 'Entre no ranking primeiro.' }, 409)
      const b = await readJson<{ pf?: number; week?: string }>(request)
      const pf = b?.pf
      if (typeof pf !== 'number' || !Number.isInteger(pf) || pf < 0 || pf > RANK.maxWeekPf) return json({ error: 'PF inválido.' }, 400)
      // só vale a semana de agora (o servidor manda no calendário); semana velha é ignorada
      if (b?.week === week) await putScore(week, me, pf, true)
      return json(await board(week, me))
    }
    if (action === 'leave') {
      await leave(id, week)
      return json(await board(week, null))
    }
    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (e) {
    return fail(e)
  }
}
