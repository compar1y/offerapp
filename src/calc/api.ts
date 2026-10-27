// Conta da Fornada: conversa com o servidor (rodada grátis, cópia na conta, exportar, apagar).
// Na prévia (demonstração) tudo isso é simulado no navegador; no app real vai para /api/calc/*.
import { authedApi, demoRound, demoSetRound } from '../lib/access'
import { PREVIEW } from '../data/config'
import { docVazio, mesclar, validarDoc, type CalcDoc } from '../../shared/calc-sync'

export type RoundOutcome = { ok: true } | { ok: false; used: boolean; offline: boolean; error: string }
export type PullOutcome = { ok: true; doc: CalcDoc } | { ok: false; status: number; error: string }

const demoDocKey = (email: string) => `panetone-demo-calcdoc:v1:${email}`
const readDemoDoc = (email: string): CalcDoc => {
  try {
    const raw = JSON.parse(localStorage.getItem(demoDocKey(email)) ?? 'null') as unknown
    const v = raw ? validarDoc(raw) : null
    if (v && v.ok) return v.doc
  } catch {
    /* começa vazio */
  }
  return docVazio(new Date().toISOString())
}

/** conta a rodada grátis no servidor (primeira chamada vence; a mesma conta reabre) */
export async function apiRound(email: string, recipe: number | null, contaId: string): Promise<RoundOutcome> {
  if (PREVIEW) {
    const cur = demoRound(email)
    if (cur && cur.contaId !== contaId) return { ok: false, used: true, offline: false, error: 'A conta grátis já foi usada.' }
    demoSetRound(email, { recipe, contaId })
    return { ok: true }
  }
  const r = await authedApi<{ error?: string }>('/calc/round', { method: 'POST', body: JSON.stringify({ recipe, contaId }) })
  if (r.status === 0) return { ok: false, used: false, offline: true, error: 'Sem conexão para guardar a conta. Tente de novo com internet.' }
  if (r.status === 409) return { ok: false, used: true, offline: false, error: 'A conta grátis já foi usada.' }
  if (r.status === 401) return { ok: false, used: false, offline: false, error: 'Sua sessão venceu. Entre de novo.' }
  if (r.status >= 300) return { ok: false, used: false, offline: false, error: r.data?.error ?? 'Não foi possível guardar agora. Tente de novo.' }
  return { ok: true }
}

export async function apiPull(email: string): Promise<PullOutcome> {
  if (PREVIEW) return { ok: true, doc: readDemoDoc(email) }
  const r = await authedApi<{ doc?: unknown; error?: string }>('/calc/sync')
  if (r.status === 0) return { ok: false, status: 0, error: 'Sem conexão.' }
  if (r.status >= 300 || !r.data?.doc) return { ok: false, status: r.status, error: r.data?.error ?? 'Não foi possível sincronizar agora.' }
  const v = validarDoc(r.data.doc)
  return v.ok ? { ok: true, doc: v.doc } : { ok: false, status: 500, error: 'A cópia guardada na conta veio inválida.' }
}

export async function apiPush(email: string, doc: CalcDoc): Promise<PullOutcome> {
  if (PREVIEW) {
    const agora = new Date().toISOString()
    const merged = mesclar(readDemoDoc(email), doc, agora)
    merged.versao = readDemoDoc(email).versao + 1
    merged.atualizadoEm = agora
    try {
      localStorage.setItem(demoDocKey(email), JSON.stringify(merged))
    } catch {
      /* segue */
    }
    return { ok: true, doc: merged }
  }
  const r = await authedApi<{ doc?: unknown; error?: string }>('/calc/sync', { method: 'PUT', body: JSON.stringify({ doc }) })
  if (r.status === 0) return { ok: false, status: 0, error: 'Sem conexão.' }
  if (r.status >= 300 || !r.data?.doc) return { ok: false, status: r.status, error: r.data?.error ?? 'Não foi possível sincronizar agora.' }
  const v = validarDoc(r.data.doc)
  return v.ok ? { ok: true, doc: v.doc } : { ok: false, status: 500, error: 'A cópia guardada na conta veio inválida.' }
}

/** texto do arquivo com a cópia guardada na conta (funciona mesmo sem a ferramenta, para ela levar os dados) */
export async function apiExport(email: string): Promise<string | null> {
  if (PREVIEW) return JSON.stringify({ app: 'conta-da-fornada', exportadoEm: new Date().toISOString(), doc: readDemoDoc(email) }, null, 2)
  const r = await authedApi<unknown>('/calc/export')
  return r.status < 300 && r.data ? JSON.stringify(r.data, null, 2) : null
}

export async function apiDelete(email: string): Promise<boolean> {
  if (PREVIEW) {
    try {
      localStorage.removeItem(demoDocKey(email))
    } catch {
      /* segue */
    }
    return true
  }
  const r = await authedApi<unknown>('/calc/delete', { method: 'POST', body: '{}' })
  return r.status < 300
}
