// Conta da Fornada: documento guardado (aparelho e conta), mesclagem e limites. Puro, usado pelo app e pelo servidor.
// Regras: a mais recente vence, item por item (id + atualizadaEm); apagar deixa uma "lápide" por 90 dias para o apagado não voltar.
import { LIMITES, contaValida, type Conta, type Precos } from './calc.js'

export const DOC_VERSION = 1
export const SYNC_LIMITS = {
  /** por chave guardada no servidor (bytes) */
  keyBytes: 256 * 1024,
  /** total por cliente (bytes) */
  totalBytes: 768 * 1024,
  tombstoneDays: 90,
  maxPrecos: 400,
  maxTombstones: 1000,
  maxCenarios: 60,
  maxCanais: 12,
  /** pedidos de sincronização por hora e por cliente */
  perHour: 60,
}

/** ajustes da cliente (valem para todas as contas). `em` = quando foram mudados (a versão mais nova vence o conjunto inteiro) */
export interface Prefs {
  em: string
  /** custos fixos do mês (centavos) */
  despesasFixasCents: number
  /** valor da hora dela (centavos); 0 = não contar */
  valorHoraCents: number
  /** meta do mês: quanto ela quer que sobre (centavos); 0 = não definida */
  metaCents: number
  semanas: number
  horasMes: number
  /** quantas unidades de cada conta ela espera fazer por mês (pesos do mix), por id de conta */
  pesos: Record<string, number>
  canais: { id: string; nome: string; taxaPct: number; taxaFixaCents: number; freteCents: number; n: number }[]
  /** o que ela já viu (avisos de uma vez só) */
  vistos: Record<string, boolean>
}

export interface Cenario {
  id: string
  contaId: string
  nome: string
  atualizadaEm: string
  /** variações em % sobre preço de venda, custo de ingredientes e unidades por mês */
  precoPct: number
  custoPct: number
  unidadesPct: number
}

export interface CalcDoc {
  v: number
  /** versão guardada no servidor (só o servidor aumenta) */
  versao: number
  atualizadoEm: string
  contas: Conta[]
  precos: Precos
  prefs: Prefs
  cenarios: Cenario[]
  /** id da conta -> quando foi apagada */
  apagadas: Record<string, string>
  /** conta da rodada grátis (nunca se perde ao pagar) */
  rodadaContaId: string | null
}

export const PREFS_PADRAO = (em: string): Prefs => ({
  em,
  despesasFixasCents: 0,
  valorHoraCents: 0,
  metaCents: 0,
  semanas: 4,
  horasMes: 0,
  pesos: {},
  canais: [],
  vistos: {},
})

export const docVazio = (agora: string): CalcDoc => ({
  v: DOC_VERSION,
  versao: 0,
  atualizadoEm: agora,
  contas: [],
  precos: {},
  prefs: PREFS_PADRAO('1970-01-01T00:00:00.000Z'),
  cenarios: [],
  apagadas: {},
  rodadaContaId: null,
})

const t = (iso: string | undefined): number => {
  const n = Date.parse(iso ?? '')
  return Number.isFinite(n) ? n : 0
}

/** mescla dois documentos: o mais novo vence item por item; lápide vence quando é igual ou mais nova que a conta */
export function mesclar(a: CalcDoc, b: CalcDoc, agora: string = new Date().toISOString()): CalcDoc {
  const apagadas: Record<string, string> = { ...a.apagadas }
  for (const [id, em] of Object.entries(b.apagadas)) if (t(em) > t(apagadas[id])) apagadas[id] = em
  const limite = t(agora) - SYNC_LIMITS.tombstoneDays * 86_400_000
  for (const [id, em] of Object.entries(apagadas)) if (t(em) < limite) delete apagadas[id]

  const contas = new Map<string, Conta>()
  for (const c of [...a.contas, ...b.contas]) {
    const cur = contas.get(c.id)
    if (!cur || t(c.atualizadaEm) > t(cur.atualizadaEm)) contas.set(c.id, c)
  }
  for (const [id, c] of contas) if (apagadas[id] && t(apagadas[id]) >= t(c.atualizadaEm)) contas.delete(id)

  const precos: Precos = { ...a.precos }
  for (const [id, p] of Object.entries(b.precos)) {
    const cur = precos[id]
    if (!cur || t(p.em) > t(cur.em)) precos[id] = p
  }

  const cen = new Map<string, Cenario>()
  for (const c of [...a.cenarios, ...b.cenarios]) {
    const cur = cen.get(c.id)
    if (!cur || t(c.atualizadaEm) > t(cur.atualizadaEm)) cen.set(c.id, c)
  }
  for (const [id, c] of cen) if (apagadas[id] && t(apagadas[id]) >= t(c.atualizadaEm)) cen.delete(id)

  const prefs = t(b.prefs.em) > t(a.prefs.em) ? b.prefs : a.prefs
  const rodada = a.rodadaContaId ?? b.rodadaContaId
  return {
    v: DOC_VERSION,
    versao: Math.max(a.versao, b.versao),
    atualizadoEm: t(a.atualizadoEm) >= t(b.atualizadoEm) ? a.atualizadoEm : b.atualizadoEm,
    contas: [...contas.values()].sort((x, y) => t(y.atualizadaEm) - t(x.atualizadaEm)),
    precos,
    prefs,
    cenarios: [...cen.values()],
    apagadas,
    rodadaContaId: rodada && contas.has(rodada) ? rodada : null,
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const iso = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v))

export type Validacao = { ok: true; doc: CalcDoc } | { ok: false; erro: string; status: 400 | 413 }

export const bytesOf = (v: unknown): number => new TextEncoder().encode(JSON.stringify(v)).length

/** valida e normaliza o que veio do aparelho. Nada de campo desconhecido no nível de cima. */
export function validarDoc(raw: unknown): Validacao {
  if (!isObj(raw)) return { ok: false, erro: 'Documento inválido.', status: 400 }
  const contas = raw.contas
  const precos = raw.precos
  const prefs = raw.prefs
  if (!Array.isArray(contas) || !isObj(precos) || !isObj(prefs)) return { ok: false, erro: 'Documento inválido.', status: 400 }
  if (contas.length > LIMITES.maxContas) return { ok: false, erro: 'Contas demais.', status: 413 }
  for (const c of contas) if (!contaValida(c) || !iso((c as Conta).atualizadaEm)) return { ok: false, erro: 'Há uma conta com valores inválidos.', status: 400 }
  if (new Set(contas.map((c) => (c as Conta).id)).size !== contas.length) return { ok: false, erro: 'Contas repetidas.', status: 400 }
  const pe = Object.entries(precos)
  if (pe.length > SYNC_LIMITS.maxPrecos) return { ok: false, erro: 'Ingredientes demais.', status: 413 }
  const limpos: Precos = {}
  for (const [id, p] of pe) {
    if (id.length > 64 || !isObj(p)) return { ok: false, erro: 'Há um preço inválido.', status: 400 }
    if (!num(p.precoCents, 0, LIMITES.maxCents) || !num(p.qtdPacote, 0, LIMITES.maxQtd) || !['g', 'ml', 'un'].includes(p.unidade as string) || !['exemplo', 'meu'].includes(p.fonte as string))
      return { ok: false, erro: 'Há um preço inválido.', status: 400 }
    if (p.nome !== undefined && (typeof p.nome !== 'string' || p.nome.length > 80)) return { ok: false, erro: 'Há um nome inválido.', status: 400 }
    if (p.em !== undefined && !iso(p.em)) return { ok: false, erro: 'Há uma data inválida.', status: 400 }
    const hist = Array.isArray(p.hist) ? p.hist.slice(-12) : undefined
    limpos[id] = { ...(p as unknown as Precos[string]), ...(hist ? { hist: hist as Precos[string]['hist'] } : {}) }
  }
  if (!iso(prefs.em) || !num(prefs.despesasFixasCents, 0, LIMITES.maxCents) || !num(prefs.valorHoraCents, 0, LIMITES.maxCents) || !num(prefs.metaCents, 0, LIMITES.maxCents * 10) || !num(prefs.semanas, 1, 6) || !num(prefs.horasMes, 0, 744))
    return { ok: false, erro: 'Ajustes inválidos.', status: 400 }
  const pesos = isObj(prefs.pesos) ? prefs.pesos : {}
  for (const v of Object.values(pesos)) if (!num(v, 0, 100000)) return { ok: false, erro: 'Ajustes inválidos.', status: 400 }
  const canais = Array.isArray(prefs.canais) ? prefs.canais : []
  if (canais.length > SYNC_LIMITS.maxCanais) return { ok: false, erro: 'Canais demais.', status: 413 }
  for (const ch of canais) {
    if (!isObj(ch) || typeof ch.id !== 'string' || typeof ch.nome !== 'string' || ch.nome.length > 40 || !num(ch.taxaPct, 0, 50) || !num(ch.taxaFixaCents, 0, LIMITES.maxCents) || !num(ch.freteCents, 0, LIMITES.maxCents) || !num(ch.n, 1, 1000))
      return { ok: false, erro: 'Canal inválido.', status: 400 }
  }
  const apagadas = isObj(raw.apagadas) ? raw.apagadas : {}
  const ap = Object.entries(apagadas)
  if (ap.length > SYNC_LIMITS.maxTombstones) return { ok: false, erro: 'Apagadas demais.', status: 413 }
  for (const [id, em] of ap) if (id.length > 64 || !iso(em)) return { ok: false, erro: 'Lista de apagadas inválida.', status: 400 }
  const cenarios = Array.isArray(raw.cenarios) ? raw.cenarios : []
  if (cenarios.length > SYNC_LIMITS.maxCenarios) return { ok: false, erro: 'Cenários demais.', status: 413 }
  for (const c of cenarios) {
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.contaId !== 'string' || typeof c.nome !== 'string' || c.nome.length > 60 || !iso(c.atualizadaEm) || !num(c.precoPct, -50, 100) || !num(c.custoPct, -50, 100) || !num(c.unidadesPct, -90, 1000))
      return { ok: false, erro: 'Cenário inválido.', status: 400 }
  }
  const rodada = typeof raw.rodadaContaId === 'string' && raw.rodadaContaId.length <= 64 ? raw.rodadaContaId : null
  const doc: CalcDoc = {
    v: DOC_VERSION,
    versao: num(raw.versao, 0, 1e9) ? Math.trunc(raw.versao as number) : 0,
    atualizadoEm: iso(raw.atualizadoEm) ? raw.atualizadoEm : new Date().toISOString(),
    contas: contas as Conta[],
    precos: limpos,
    prefs: { em: prefs.em, despesasFixasCents: prefs.despesasFixasCents, valorHoraCents: prefs.valorHoraCents, metaCents: prefs.metaCents, semanas: prefs.semanas, horasMes: prefs.horasMes, pesos: pesos as Record<string, number>, canais: canais as Prefs['canais'], vistos: isObj(prefs.vistos) ? (prefs.vistos as Record<string, boolean>) : {} },
    cenarios: cenarios as Cenario[],
    apagadas: apagadas as Record<string, string>,
    rodadaContaId: rodada,
  }
  const total = bytesOf(doc)
  if (total > SYNC_LIMITS.totalBytes) return { ok: false, erro: 'Seus dados passaram do tamanho permitido para guardar na conta.', status: 413 }
  return { ok: true, doc }
}

/** pedaços guardados no servidor (uma chave cada, cada uma até keyBytes) */
export function partes(doc: CalcDoc): { core: unknown; contas: Conta[]; extra: unknown } {
  return {
    core: { v: doc.v, versao: doc.versao, atualizadoEm: doc.atualizadoEm, precos: doc.precos, prefs: doc.prefs, apagadas: doc.apagadas, rodadaContaId: doc.rodadaContaId },
    contas: doc.contas,
    extra: { cenarios: doc.cenarios },
  }
}
export function juntar(core: Record<string, unknown> | null, contas: Conta[] | null, extra: Record<string, unknown> | null, agora: string): CalcDoc {
  const base = docVazio(agora)
  if (!core) return base
  return {
    ...base,
    versao: typeof core.versao === 'number' ? core.versao : 0,
    atualizadoEm: typeof core.atualizadoEm === 'string' ? core.atualizadoEm : agora,
    precos: (core.precos as Precos) ?? {},
    prefs: (core.prefs as Prefs) ?? base.prefs,
    apagadas: (core.apagadas as Record<string, string>) ?? {},
    rodadaContaId: (core.rodadaContaId as string | null) ?? null,
    contas: contas ?? [],
    cenarios: ((extra?.cenarios as Cenario[]) ?? []),
  }
}
