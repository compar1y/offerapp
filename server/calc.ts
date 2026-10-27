// Conta da Fornada no servidor: rodada grátis, sincronização na conta, exportar e apagar.
// Chaves no KV (por e-mail):  calc:round:<e> (contador incr)  calc:roundinfo:<e>  calc:<e>:core  calc:<e>:contas  calc:<e>:extra
// Dados pessoais da cliente (contas, preços, ajustes) ficam SÓ nas chaves calc:<e>:*; "apagar" remove as três. O contador da rodada grátis
// e a receita escolhida NÃO são dados de uso da ferramenta: ficam para a rodada grátis não ser repetida (ver README, privacidade).
import { OFFER_BY_ID, type MeResponse, type ToolsState } from '../shared/catalog.js'
import { SYNC_LIMITS, bytesOf, docVazio, juntar, mesclar, partes, validarDoc, type CalcDoc } from '../shared/calc-sync.js'
import type { Conta } from '../shared/calc.js'
import { getKV } from './kv.js'
import { logEvent, meFor, normEmail } from './purchases.js'

export const roundKey = (e: string) => `calc:round:${normEmail(e)}`
export const roundInfoKey = (e: string) => `calc:roundinfo:${normEmail(e)}`
const dataKey = (e: string, p: 'core' | 'contas' | 'extra') => `calc:${normEmail(e)}:${p}`

export interface RoundInfo {
  recipe: number | null
  contaId: string
  at: string
  swapsLeft: number
}
const DAY = 24 * 60 * 60 * 1000

export async function roundState(email: string): Promise<{ used: boolean; info: RoundInfo | null }> {
  const info = await getKV().get<RoundInfo>(roundInfoKey(email))
  return { used: !!info, info }
}

/** estado da ferramenta para /api/me */
export async function toolsFor(email: string, owned: boolean): Promise<ToolsState> {
  const { used, info } = await roundState(email)
  return { calculadora: { owned, roundUsed: used, roundRecipe: info?.recipe ?? null } }
}

// /api/me: o estado normal mais a rodada grátis da Conta da Fornada (contada no servidor)
export async function meWithTools(email: string): Promise<MeResponse> {
  const me = await meFor(email)
  return { ...me, tools: await toolsFor(me.email, me.items.includes('calculadora')) }
}

export type RoundResult =
  | { ok: true; started: boolean; swapped: boolean; info: RoundInfo }
  | { ok: false; status: 400 | 409; error: string; info?: RoundInfo | null }

/**
 * Rodada grátis: UMA conta, contada no servidor (kv.incr). A primeira chamada ganha. A mesma receita volta a abrir a mesma conta (idempotente);
 * dentro de 24 h dá para trocar de receita uma vez. Depois disso a rodada está usada.
 */
export async function startRound(email: string, input: { recipe?: unknown; contaId?: unknown; swap?: unknown }): Promise<RoundResult> {
  const kv = getKV()
  const recipe = input.recipe === null || input.recipe === undefined ? null : Number(input.recipe)
  if (recipe !== null && !(Number.isInteger(recipe) && recipe >= 1 && recipe <= 100)) return { ok: false, status: 400, error: 'Receita inválida.' }
  const contaId = typeof input.contaId === 'string' && input.contaId.length > 0 && input.contaId.length <= 64 ? input.contaId : ''
  if (!contaId) return { ok: false, status: 400, error: 'Conta inválida.' }
  const now = new Date()
  const existing = await kv.get<RoundInfo>(roundInfoKey(email))
  if (existing) {
    const mesma = existing.recipe === recipe && existing.contaId === contaId
    if (mesma) return { ok: true, started: false, swapped: false, info: existing }
    if (input.swap === true && existing.swapsLeft > 0 && now.getTime() - Date.parse(existing.at) <= DAY) {
      const info: RoundInfo = { ...existing, recipe, contaId, swapsLeft: existing.swapsLeft - 1 }
      await kv.set(roundInfoKey(email), info)
      await logEvent({ name: 'calc.round.swap', origin: 'app', email, props: { recipe } })
      return { ok: true, started: false, swapped: true, info }
    }
    return { ok: false, status: 409, error: 'A conta grátis já foi usada.', info: existing }
  }
  // primeira vez: quem chega primeiro (incr = 1) grava; uma segunda chamada ao mesmo tempo não grava
  const n = await kv.incr(roundKey(email))
  if (n !== 1) {
    const again = await kv.get<RoundInfo>(roundInfoKey(email))
    return { ok: false, status: 409, error: 'A conta grátis já foi usada.', info: again }
  }
  const info: RoundInfo = { recipe, contaId, at: now.toISOString(), swapsLeft: 1 }
  await kv.set(roundInfoKey(email), info)
  await logEvent({ name: 'calc.round.start', origin: 'app', email, props: { recipe } })
  return { ok: true, started: true, swapped: false, info }
}

export async function hasTool(email: string): Promise<boolean> {
  const me = await meFor(email)
  return me.items.includes('calculadora')
}

export async function rateLimited(email: string): Promise<boolean> {
  return (await getKV().incr(`rl:calc:${normEmail(email)}`, 3600)) > SYNC_LIMITS.perHour
}

export async function readDoc(email: string, agora = new Date().toISOString()): Promise<CalcDoc> {
  const kv = getKV()
  const [core, contas, extra] = await Promise.all([kv.get<Record<string, unknown>>(dataKey(email, 'core')), kv.get<Conta[]>(dataKey(email, 'contas')), kv.get<Record<string, unknown>>(dataKey(email, 'extra'))])
  return juntar(core, contas, extra, agora)
}

export type SaveResult = { ok: true; doc: CalcDoc } | { ok: false; status: 400 | 413; error: string }

/** recebe o documento do aparelho, mescla com o do servidor (a mais recente vence, item por item), guarda e devolve o resultado */
export async function saveDoc(email: string, raw: unknown): Promise<SaveResult> {
  const v = validarDoc(raw)
  if (!v.ok) return { ok: false, status: v.status, error: v.erro }
  const agora = new Date().toISOString()
  const atual = await readDoc(email, agora)
  const merged = mesclar(atual, v.doc, agora)
  merged.versao = atual.versao + 1
  merged.atualizadoEm = agora
  const check = validarDoc(merged)
  if (!check.ok) return { ok: false, status: check.status, error: check.erro }
  const p = partes(merged)
  for (const part of [p.core, p.contas, p.extra]) {
    if (bytesOf(part) > SYNC_LIMITS.keyBytes) return { ok: false, status: 413, error: 'Seus dados passaram do tamanho permitido para guardar na conta.' }
  }
  const kv = getKV()
  await Promise.all([kv.set(dataKey(email, 'core'), p.core), kv.set(dataKey(email, 'contas'), p.contas), kv.set(dataKey(email, 'extra'), p.extra)])
  await logEvent({ name: 'calc.sync', origin: 'app', email, props: { versao: merged.versao, contas: merged.contas.length } })
  return { ok: true, doc: merged }
}

export async function deleteDoc(email: string): Promise<void> {
  const kv = getKV()
  await Promise.all([kv.del(dataKey(email, 'core')), kv.del(dataKey(email, 'contas')), kv.del(dataKey(email, 'extra'))])
  await logEvent({ name: 'calc.delete', origin: 'app', email })
}

export const toolPrice = (): number => OFFER_BY_ID.calculadora.priceCents
export { docVazio }
