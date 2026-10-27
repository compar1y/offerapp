// Camada de dados trocável. As telas só falam com AccessProvider (via store.ts).
//   demo   : tudo no navegador (localStorage), código 123456, seletor de teste só para Fichas de Socorro e ofertas.
//   server : fetch para /api/* (Vercel Functions em api/), sessão por token assinado.

import { DEMO_CODE, PREVIEW } from '../data/config'
import { NO_TOOLS, itemsFor, type ItemId, type MeResponse, type PlanId, type PurchaseView } from '../../shared/catalog'

export type AppEventName = 'offer.click' | 'offer.dismiss' | 'offer.interest' | 'offer.view' | 'catalog.view' | 'combo.view' | 'combo.spin' | 'combo.click' | 'combo.interest' | 'journey.view' | 'hook.click' | 'item.done' | 'item.undone' | 'calc.open' | 'calc.unlock.click' | 'calc.round.start' | 'calc.conta.done' | 'calc.export' | 'calc.import'

export interface Result {
  ok: boolean
  error?: string
}

export interface OpenFileResult extends Result {
  url?: string
}

export interface AccessProvider {
  readonly mode: 'demo' | 'server'
  requestCode(email: string): Promise<Result>
  verifyCode(email: string, code: string): Promise<Result>
  // tela "compra confirmada": o acesso já foi liberado? (pergunta leve, repetida a cada ~5 s). Se sim, o código já foi enviado.
  checkAccess(email: string): Promise<{ ok: boolean; ready?: boolean; error?: string }>
  // null = sem sessão
  getSession(): Promise<MeResponse | null>
  logout(): Promise<void>
  // "qual sua maior dificuldade agora?" (vai para a tabela de eventos)
  sendFeedback(choice: string, text: string): Promise<Result>
  // eventos simples para medir interesse (clique em oferta, "agora não", "fiz essa"). Nunca bloqueia a tela.
  trackEvent(name: AppEventName, props: Record<string, string>): Promise<void>
  // devolve uma URL temporária para abrir/baixar o arquivo (só se o usuário tem direito)
  getFileUrl(fileKey: string, download: boolean): Promise<OpenFileResult>
}

// ------------------------------------------------------------------ demo

// demonstração: as ofertas que "Já comprei" simula (a 1ª; as 3 primeiras = o começo da trilha Panetone de confeitaria)
export const DEMO_OWNED = ['panetones-vulcao', 'segredo-recheios', 'panetones-vitrine']

export const DEMO_KEY = 'panetone-demo:v2'

// no modo demonstração o cliente sempre tem o kit completo; só se alterna "com Fichas de Socorro" e "ofertas ligadas"
interface DemoState {
  email: string | null
  bump: boolean
  offers: boolean
  // simula que a cliente já comprou as N primeiras ofertas de DEMO_OWNED (0, 1 ou 3)
  have: number
  // simula que a cliente já comprou a Conta da Fornada
  calc: boolean
}

function loadDemo(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) {
      const j = JSON.parse(raw) as Partial<DemoState>
      return { email: j.email ?? null, bump: !!j.bump, offers: !!j.offers, have: [0, 1, 3].includes(Number(j.have)) ? Number(j.have) : 0, calc: !!j.calc }
    }
  } catch {
    /* sem armazenamento */
  }
  return { email: null, bump: false, offers: false, have: 0, calc: false }
}

function saveDemo(s: DemoState) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(s))
  } catch {
    /* segue em memória */
  }
}

export function getDemoFlags(): { bump: boolean; offers: boolean; have: number; calc: boolean } {
  const { bump, offers, have, calc } = loadDemo()
  return { bump, offers, have, calc }
}

export function setDemoFlags(patch: Partial<{ bump: boolean; offers: boolean; have: number; calc: boolean }>) {
  saveDemo({ ...loadDemo(), ...patch })
}

// demonstração: a rodada grátis fica no navegador (no app real é contada no servidor)
const demoRoundKey = (email: string) => `panetone-demo-round:v1:${email}`
export function demoRound(email: string): { recipe: number | null; contaId: string } | null {
  try {
    return JSON.parse(localStorage.getItem(demoRoundKey(email)) ?? 'null') as { recipe: number | null; contaId: string } | null
  } catch {
    return null
  }
}
export function demoSetRound(email: string, v: { recipe: number | null; contaId: string } | null) {
  try {
    if (v) localStorage.setItem(demoRoundKey(email), JSON.stringify(v))
    else localStorage.removeItem(demoRoundKey(email))
  } catch {
    /* sem armazenamento */
  }
}

const demoWaitSince: Record<string, number> = {}
let demoPending: string | null = null

export const demoProvider: AccessProvider = {
  mode: 'demo',
  async requestCode(email) {
    demoPending = email.trim().toLowerCase()
    return { ok: true }
  },
  async checkAccess(email) {
    // demonstração: e-mail que começa com "aguardando" simula o webhook atrasado (libera ~12 s depois da primeira pergunta)
    const e = email.trim().toLowerCase()
    if (!e.startsWith('aguardando')) {
      demoPending = e
      return { ok: true, ready: true }
    }
    const first = (demoWaitSince[e] ??= Date.now())
    const ready = Date.now() - first >= 12000
    if (ready) {
      demoPending = e
      delete demoWaitSince[e]
    }
    return { ok: true, ready }
  },
  async verifyCode(email, code) {
    if (code.trim() !== DEMO_CODE) return { ok: false, error: 'Código errado. Confira e tente de novo.' }
    saveDemo({ ...loadDemo(), email: (demoPending ?? email).trim().toLowerCase() })
    return { ok: true }
  },
  async getSession() {
    const s = loadDemo()
    if (!s.email) return null
    const plan: PlanId = 'completo'
    const purchases: PurchaseView[] = [{ orderId: 'demo-1', plan, bump: false, status: 'paid', source: 'manual', createdAt: new Date().toISOString() }]
    if (s.bump) purchases.push({ orderId: 'demo-2', plan: null, bump: true, status: 'paid', source: 'manual', createdAt: new Date().toISOString() })
    const items = itemsFor(plan, s.bump, [...DEMO_OWNED.slice(0, s.have), ...(s.calc ? ['calculadora'] : [])])
    const round = demoRound(s.email)
    return { email: s.email, plan, items, entitlements: items, purchases, tools: { calculadora: { ...NO_TOOLS.calculadora, owned: s.calc, roundUsed: !!round, roundRecipe: round?.recipe ?? null } } }
  },
  async logout() {
    saveDemo({ ...loadDemo(), email: null })
  },
  async sendFeedback(choice, text) {
    try {
      const k = 'panetone-demo-events:v2'
      const list = JSON.parse(localStorage.getItem(k) ?? '[]') as unknown[]
      list.push({ name: 'dificuldade', choice, text, at: new Date().toISOString(), source: 'app-demo' })
      localStorage.setItem(k, JSON.stringify(list.slice(-50)))
    } catch {
      /* sem armazenamento */
    }
    return { ok: true }
  },
  async trackEvent(name, props) {
    try {
      const k = 'panetone-demo-events:v2'
      const list = JSON.parse(localStorage.getItem(k) ?? '[]') as unknown[]
      list.push({ name, ...props, at: new Date().toISOString(), source: 'app-demo' })
      localStorage.setItem(k, JSON.stringify(list.slice(-100)))
    } catch {
      /* sem armazenamento */
    }
  },
  async getFileUrl(fileKey, download) {
    // Nunca devolve PDF real. Só uma amostra gerada localmente.
    void fileKey
    void download
    return { ok: true, url: 'demo/amostra-modo-demonstracao.pdf' }
  },
}

// ------------------------------------------------------------------ server

const TOKEN_KEY = 'panetone-session:v2'

function token(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

async function api<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<{ status: number; data: T | null }> {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')
  const t = token()
  if (init?.auth && t) headers.set('authorization', `Bearer ${t}`)
  try {
    const res = await fetch(`/api${path}`, { ...init, headers })
    let data: T | null = null
    try {
      data = (await res.json()) as T
    } catch {
      data = null
    }
    return { status: res.status, data }
  } catch {
    return { status: 0, data: null }
  }
}

/** chamada autenticada à API (Conta da Fornada). status 0 = sem rede */
export const authedApi = <T,>(path: string, init?: RequestInit): Promise<{ status: number; data: T | null }> => api<T>(path, { ...init, auth: true })

export const serverProvider: AccessProvider = {
  mode: 'server',
  async requestCode(email) {
    const r = await api<{ error?: string }>('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) })
    if (r.status === 429) return { ok: false, error: 'Muitas tentativas. Espere alguns minutos e tente de novo.' }
    if (r.status === 0) return { ok: false, error: 'Sem conexão. Tente de novo.' }
    return r.status < 300 ? { ok: true } : { ok: false, error: r.data?.error ?? 'Não foi possível enviar o código.' }
  },
  async checkAccess(email) {
    const r = await api<{ ready?: boolean; error?: string }>('/auth/request-code', { method: 'POST', body: JSON.stringify({ email, wait: true }) })
    if (r.status === 429) return { ok: false, error: 'Muitas tentativas. Espere alguns minutos e tente de novo.' }
    if (r.status === 0) return { ok: false, error: 'Sem conexão. Tente de novo.' }
    if (r.status >= 300) return { ok: false, error: r.data?.error ?? 'Confira o e-mail digitado.' }
    return { ok: true, ready: r.data?.ready === true }
  },
  async verifyCode(email, code) {
    const r = await api<{ token?: string; error?: string }>('/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) })
    if (r.status < 300 && r.data?.token) {
      try {
        localStorage.setItem(TOKEN_KEY, r.data.token)
      } catch {
        return { ok: false, error: 'O navegador não deixou guardar o acesso. Saia do modo anônimo.' }
      }
      return { ok: true }
    }
    return { ok: false, error: r.data?.error ?? 'Código errado ou vencido. Peça um novo.' }
  },
  async getSession() {
    if (!token()) return null
    const r = await api<MeResponse>('/me', { auth: true })
    if (r.status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY)
      } catch {
        /* nada */
      }
      return null
    }
    return r.data
  },
  async logout() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* nada */
    }
  },
  async sendFeedback(choice, text) {
    const r = await api<{ error?: string }>('/feedback', { method: 'POST', auth: true, body: JSON.stringify({ choice, text }) })
    return r.status < 300 ? { ok: true } : { ok: false, error: r.data?.error ?? 'Não foi possível enviar agora. Tente de novo.' }
  },
  async trackEvent(name, props) {
    await api('/event', { method: 'POST', auth: true, body: JSON.stringify({ name, ...props }) })
  },
  async getFileUrl(fileKey, download) {
    const r = await api<{ url?: string; error?: string }>(`/file/${encodeURIComponent(fileKey)}${download ? '?dl=1' : ''}`, { auth: true })
    if (r.status === 403) return { ok: false, error: 'Este material não está liberado no seu acesso.' }
    if (r.status === 401) return { ok: false, error: 'Sua sessão venceu. Entre de novo.' }
    return r.status < 300 && r.data?.url ? { ok: true, url: r.data.url } : { ok: false, error: r.data?.error ?? 'Não foi possível abrir o arquivo.' }
  },
}

export const provider: AccessProvider = PREVIEW ? demoProvider : serverProvider

export type { ItemId }
