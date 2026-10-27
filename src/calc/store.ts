// Conta da Fornada: estado da ferramenta. O que a cliente digita fica no aparelho (local.ts). Com a ferramenta liberada, uma cópia vai
// para a conta dela (sincronização: a versão mais recente de cada item vence). Nada de valores vai para os eventos de uso.
import { useSyncExternalStore } from 'react'
import { PREMISSAS, alertasDeAlta, calcular, contaDaReceita, contaVazia, novoId, type Alta, type Conta, type PrecoIng, type Precos } from '../../shared/calc'
import { SYNC_LIMITS, docVazio, mesclar, validarDoc, vendaValida, type CalcDoc, type Cenario, type Prefs, type Venda } from '../../shared/calc-sync'
import { provider } from '../lib/access'
import { gameContaFeita, gameVenda } from '../lib/game'
import { getState, refreshSession } from '../lib/store'
import { apiDelete, apiExport, apiPush, apiRound } from './api'
import { META_PADRAO, eraseLocal, loadLocal, saveLocal, type Meta } from './local'

export type SyncState = 'off' | 'idle' | 'syncing' | 'ok' | 'offline' | 'erro'
export interface AlertaAlta {
  conta: string
  alta: Alta
}
export interface CalcState {
  email: string
  ready: boolean
  doc: CalcDoc
  meta: Meta
  sync: SyncState
  syncMsg: string
  alertas: AlertaAlta[]
  /** muda quando um valor é trocado por fora do campo (ex.: "preços de exemplo"), para os campos releerem */
  rev: number
}

let st: CalcState = { email: '', ready: false, doc: docVazio(new Date().toISOString()), meta: { ...META_PADRAO }, sync: 'off', syncMsg: '', alertas: [], rev: 0 }
const subs = new Set<() => void>()
const set = (p: Partial<CalcState>) => {
  st = { ...st, ...p }
  subs.forEach((f) => f())
}
export const getCalc = (): CalcState => st
export function useCalc(): CalcState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => st,
  )
}

const now = () => new Date().toISOString()
const ownedNow = (): boolean => !!getState().session?.tools?.calculadora.owned
let saveTimer: ReturnType<typeof setTimeout> | undefined
let syncTimer: ReturnType<typeof setTimeout> | undefined

function persistSoon() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void flush(), 350)
}
export async function flush(): Promise<void> {
  clearTimeout(saveTimer)
  if (!st.email) return
  await saveLocal(st.email, { doc: st.doc, meta: st.meta })
}
function syncSoon() {
  if (!ownedNow() || st.meta.syncOff || !st.email) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => void syncNow(), 4000)
}

/** abre a ferramenta para este e-mail: lê o aparelho e, com a ferramenta liberada, sincroniza */
export async function openCalc(email: string): Promise<void> {
  if (st.email === email && st.ready) return
  set({ email, ready: false })
  const saved = await loadLocal(email)
  set({ email, ready: true, doc: saved.doc, meta: saved.meta, sync: ownedNow() && !saved.meta.syncOff ? 'idle' : 'off', syncMsg: '', alertas: [] })
  void provider.trackEvent('calc.open', {})
  if (ownedNow() && !saved.meta.syncOff) void syncNow()
}

export async function syncNow(): Promise<boolean> {
  if (!st.email || !ownedNow() || st.meta.syncOff) return false
  clearTimeout(syncTimer)
  const email = st.email
  set({ sync: 'syncing', syncMsg: '' })
  const r = await apiPush(email, st.doc)
  if (st.email !== email) return false
  if (!r.ok) {
    set(r.status === 0 ? { sync: 'offline', syncMsg: 'Sem conexão. Seus dados continuam salvos neste aparelho e sobem quando voltar.' } : { sync: 'erro', syncMsg: r.error })
    return false
  }
  // o que ela digitou enquanto o pedido ia e voltava não se perde: junta de novo
  const doc = mesclar(st.doc, r.doc, now())
  doc.versao = r.doc.versao
  set({ doc, meta: { ...st.meta, lastSyncAt: now() }, sync: 'ok', syncMsg: '' })
  persistSoon()
  return true
}

// ---------------------------------------------------------------- mudanças

function mutate(fn: (d: CalcDoc) => CalcDoc) {
  const doc = fn(st.doc)
  set({ doc: { ...doc, atualizadoEm: now() } })
  persistSoon()
  syncSoon()
}

export const contaDe = (id: string | undefined): Conta | undefined => st.doc.contas.find((c) => c.id === id)

/** pode editar? com a ferramenta, sim. Sem ela: só a conta da rodada grátis (ou o rascunho dela, enquanto a rodada não foi usada) */
export function podeEditar(c: Conta, s: CalcState = st): boolean {
  const t = getState().session?.tools?.calculadora
  if (t?.owned) return true
  if (c.id === s.doc.rodadaContaId) return true
  return c.estado === 'rascunho' && !t?.roundUsed
}
/** pode começar uma conta nova? */
export function podeNova(s: CalcState = st): boolean {
  const t = getState().session?.tools?.calculadora
  if (t?.owned) return s.doc.contas.length < 300
  return !t?.roundUsed && s.doc.contas.length === 0
}

export function criarConta(receita: number | null, nome: string): string {
  const id = novoId()
  const t = now()
  const c = (receita !== null ? contaDaReceita(receita, t, id) : null) ?? contaVazia(nome.trim().slice(0, 120) || 'Minha receita', t, id)
  mutate((d) => {
    // preços: o que já digitou vale para todas; o que falta entra como exemplo (marcado)
    return { ...d, contas: [c, ...d.contas] }
  })
  return id
}

export function duplicarConta(id: string): string | null {
  const c = contaDe(id)
  if (!c) return null
  const nid = novoId()
  const t = now()
  const nova: Conta = { ...structuredClone(c), id: nid, nome: `${c.nome} (cópia)`.slice(0, 120), estado: 'rascunho', criadaEm: t, atualizadaEm: t }
  mutate((d) => ({ ...d, contas: [nova, ...d.contas] }))
  return nid
}

export function patchConta(id: string, patch: Partial<Conta> | ((c: Conta) => Partial<Conta>)) {
  mutate((d) => ({ ...d, contas: d.contas.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch), atualizadaEm: now() } : c)) }))
}

export function apagarConta(id: string) {
  mutate((d) => ({ ...d, contas: d.contas.filter((c) => c.id !== id), cenarios: d.cenarios.filter((x) => x.contaId !== id), apagadas: { ...d.apagadas, [id]: now() }, rodadaContaId: d.rodadaContaId === id ? null : d.rodadaContaId }))
}

const mudou = (a: PrecoIng | undefined, b: PrecoIng) => !a || a.precoCents !== b.precoCents || a.qtdPacote !== b.qtdPacote || a.unidade !== b.unidade

/** ela digitou um preço: vale para todas as contas. Guarda o anterior (dela) para o alerta de alta. */
export function setPreco(ing: string, novo: Omit<PrecoIng, 'fonte' | 'em' | 'hist'>) {
  const antes = st.doc.precos
  const velho = antes[ing]
  const p: PrecoIng = { ...velho, ...novo, fonte: 'meu', em: now() }
  if (velho && velho.fonte === 'meu' && mudou(velho, p)) p.hist = [...(velho.hist ?? []), { em: velho.em ?? now(), precoCents: velho.precoCents, qtdPacote: velho.qtdPacote }].slice(-12)
  const depois: Precos = { ...antes, [ing]: p }
  mutate((d) => ({ ...d, precos: depois }))
  // alerta: subiu 5% ou mais → o que muda na sobra de cada conta guardada
  if (ownedNow() && velho && velho.fonte === 'meu') {
    const alertas: AlertaAlta[] = []
    for (const c of st.doc.contas) {
      if (c.estado !== 'concluida') continue
      for (const a of alertasDeAlta(c, antes, depois)) if (a.ing === ing) alertas.push({ conta: c.nome, alta: a })
    }
    set({ alertas })
  }
}

/** "Usar preços de exemplo do Bônus 07": só onde ela ainda não digitou nada. Tudo marcado "exemplo" até ela trocar. */
export function usarExemplos(ings: string[], exemplo: Precos, contaId?: string) {
  mutate((d) => {
    const precos = { ...d.precos }
    for (const i of ings) if (!precos[i] || precos[i].fonte === 'exemplo') if (exemplo[i]) precos[i] = { ...exemplo[i] }
    return { ...d, precos }
  })
  const c = contaId ? contaDe(contaId) : undefined
  if (c) {
    const g = { ...PREMISSAS.gas[c.tipo], exemplo: true }
    const ex = PREMISSAS.embUnCents[c.tipo]
    patchConta(c.id, (x) => ({ ...(x.gas.porFornadaCents === 0 ? { gas: g } : {}), ...(x.embUnCents === 0 ? { embUnCents: ex, embExemplo: true } : {}) }))
  }
  set({ rev: st.rev + 1 })
}

export function setPrefs(p: Partial<Prefs>) {
  mutate((d) => ({ ...d, prefs: { ...d.prefs, ...p, em: now() } }))
}
export function setVisto(chave: string, v = true) {
  setPrefs({ vistos: { ...st.doc.prefs.vistos, [chave]: v } })
}

export function salvarCenario(c: Omit<Cenario, 'id' | 'atualizadaEm'>) {
  const lista = st.doc.cenarios
  if (lista.length >= 60) return false
  mutate((d) => ({ ...d, cenarios: [{ ...c, id: novoId('s'), atualizadaEm: now() }, ...d.cenarios] }))
  return true
}
export function apagarCenario(id: string) {
  mutate((d) => ({ ...d, cenarios: d.cenarios.filter((x) => x.id !== id), apagadas: { ...d.apagadas, [id]: now() } }))
}

// ---------------------------------------------------------------- Diário de vendas: só o que ela digitou
export type VendaIn = { data: string; produto: string; qtd: number; valorCents: number }
export function registrarVenda(v: VendaIn): { ok: true } | { ok: false; erro: string } {
  const venda: Venda = { id: novoId('v'), data: v.data, produto: v.produto.trim().slice(0, 60), qtd: Math.round(v.qtd), valorCents: Math.round(v.valorCents), atualizadaEm: now() }
  if (!vendaValida(venda)) return { ok: false, erro: 'Confira a data, o produto, a quantidade e o valor.' }
  if (st.doc.vendas.length >= SYNC_LIMITS.maxVendas) return { ok: false, erro: 'O diário chegou ao limite. Apague vendas antigas para anotar novas.' }
  mutate((d) => ({ ...d, vendas: [venda, ...d.vendas] }))
  gameVenda() // primeira venda anotada: selo e PF uma vez (o app só conta a ação, nunca o valor)
  return { ok: true }
}
export function apagarVenda(id: string) {
  mutate((d) => ({ ...d, vendas: d.vendas.filter((x) => x.id !== id), apagadas: { ...d.apagadas, [id]: now() } }))
}

// ---------------------------------------------------------------- concluir (gasta a rodada grátis, no servidor)

export type Conclusao = { ok: true } | { ok: false; gate: boolean; erro: string }
export async function concluir(id: string): Promise<Conclusao> {
  const c = contaDe(id)
  if (!c || !st.email) return { ok: false, gate: false, erro: 'Conta não encontrada.' }
  const r = calcular(c, st.doc.precos)
  if (!r.ok || r.c === null) return { ok: false, gate: false, erro: 'Falta preço em algum ingrediente. Volte ao passo 1.' }
  if (!c.precoCents || c.precoCents <= 0) return { ok: false, gate: false, erro: 'Digite o preço que você cobra por unidade.' }
  const owned = ownedNow()
  if (!owned && c.id !== st.doc.rodadaContaId) {
    const o = await apiRound(st.email, c.receita, c.id)
    if (!o.ok) return { ok: false, gate: o.used, erro: o.error }
    void provider.trackEvent('calc.round.start', {})
    void refreshSession()
  }
  const primeira = c.estado !== 'concluida'
  mutate((d) => ({
    ...d,
    contas: d.contas.map((x) => (x.id === id ? { ...x, estado: 'concluida', atualizadaEm: now() } : x)),
    rodadaContaId: !owned && !d.rodadaContaId ? id : d.rodadaContaId,
  }))
  await flush()
  if (primeira) {
    gameContaFeita(c.receita)
    void provider.trackEvent('calc.conta.done', {})
  }
  return { ok: true }
}

// ---------------------------------------------------------------- dados: exportar, importar, apagar

export function arquivoLocal(): string {
  return JSON.stringify({ app: 'conta-da-fornada', exportadoEm: now(), doc: st.doc }, null, 2)
}
export async function arquivoDaConta(): Promise<string | null> {
  return st.email ? apiExport(st.email) : null
}
export function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  void provider.trackEvent('calc.export', {})
}

/** junta o arquivo ao que já está no aparelho (o item mais recente vence). Sem a ferramenta, só entra se não passar do limite da rodada grátis. */
export function importarTexto(texto: string): { ok: boolean; erro?: string; contas?: number } {
  let raw: unknown
  try {
    raw = JSON.parse(texto)
  } catch {
    return { ok: false, erro: 'Este arquivo não é uma cópia da Conta da Fornada.' }
  }
  const doc = raw && typeof raw === 'object' && 'doc' in raw ? (raw as { doc: unknown }).doc : raw
  const v = validarDoc(doc)
  if (!v.ok) return { ok: false, erro: v.erro }
  const juntado = mesclar(st.doc, v.doc, now())
  juntado.versao = st.doc.versao
  if (!ownedNow()) {
    const t = getState().session?.tools?.calculadora
    const novas = juntado.contas.filter((c) => !st.doc.contas.some((x) => x.id === c.id))
    const tudo = juntado.contas
    // só cabe a conta da rodada grátis: no máximo 1 conta, e a mesma receita já usada neste e-mail
    const cabe = tudo.length <= 1 && (!t?.roundUsed || tudo.every((c) => c.receita === (t.roundRecipe ?? null)))
    if (novas.length > 0 && !cabe) return { ok: false, erro: 'Para trazer outras contas para o app, desbloqueie a Conta da Fornada completa. Suas contas continuam no arquivo.' }
  }
  set({ doc: juntado, rev: st.rev + 1 })
  persistSoon()
  syncSoon()
  void provider.trackEvent('calc.import', {})
  return { ok: true, contas: v.doc.contas.length }
}

/** apaga TUDO deste aparelho (contas, preços, ajustes). A conta grátis continua contada como usada. */
export async function apagarAparelho(): Promise<void> {
  clearTimeout(saveTimer)
  clearTimeout(syncTimer)
  if (st.email) await eraseLocal(st.email)
  set({ doc: docVazio(now()), meta: { ...st.meta, lastSyncAt: null }, alertas: [], rev: st.rev + 1 })
  // fica sem cópia local vazia sendo enviada: nada para mesclar até ela digitar de novo
  await flush()
}
/** apaga a cópia guardada na conta e para de sincronizar (o aparelho fica como está) */
export async function apagarDaConta(): Promise<boolean> {
  if (!st.email) return false
  const ok = await apiDelete(st.email)
  if (ok) {
    set({ meta: { ...st.meta, syncOff: true, lastSyncAt: null }, sync: 'off', syncMsg: '' })
    await flush()
  }
  return ok
}
export function religarConta() {
  set({ meta: { ...st.meta, syncOff: false }, sync: 'idle' })
  persistSoon()
  void syncNow()
}
/** apaga do aparelho E da conta */
export async function apagarTudo(): Promise<boolean> {
  const ok = !st.email || (await apiDelete(st.email))
  await apagarAparelho()
  return ok
}

export function resetCalcState() {
  set({ email: '', ready: false, doc: docVazio(now()), meta: { ...META_PADRAO }, sync: 'off', alertas: [] })
}
