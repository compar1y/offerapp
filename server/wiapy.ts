// Parser do webhook da Wiapy, seguindo a documentação pública (help.wiapy.com/pt-br/article/webhook-jtggmu, 06/07/2026):
//   POST JSON; token no header `Authorization`; valores em centavos; sem campo de plano nem de evento.
//   payment.status: paid | unpaid | credit_card_declined | refunded | chargedback
//   carrinho abandonado = payment: null
//   a lista de arquivos de products[] se chama `itens` (não `items`)
// Tolerante: ignora campos extras e aceita o JSON com vírgulas faltando/sobrando (os exemplos da doc têm esse erro).

import { BUMP, DEFAULT_FULL_KIT_CHECKOUT_IDS, OFFERS, PLANS, type OfferId } from '../shared/catalog.js'
import { env } from './env.js'

export type WiapyStatus = 'paid' | 'unpaid' | 'credit_card_declined' | 'refunded' | 'chargedback' | 'unknown'

export interface ParsedWiapy {
  kind: 'payment' | 'abandoned' | 'invalid'
  reason?: string
  paymentId: string
  status: WiapyStatus
  rawStatus: string
  amountCents: number | null
  method: string
  email: string
  name: string
  checkoutId: string
  checkoutTitle: string
  checkoutAmountCents: number | null
  orderbump: { id: string; title: string; amountCents: number | null }[]
  products: { id: string; title: string; type: string }[]
}

// conserta JSON do tipo da doc: falta vírgula entre linhas e vírgula sobrando antes de } ou ]
export function repairJson(raw: string): string {
  return raw.replace(/("|\d|true|false|null|\}|\])([ \t]*\r?\n\s*)(")/g, '$1,$2$3').replace(/,(\s*[}\]])/g, '$1')
}

export function parseJsonLoose(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(repairJson(raw))
  }
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const cents = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? Math.round(n) : null
}

const STATUS: Record<string, WiapyStatus> = {
  paid: 'paid',
  unpaid: 'unpaid',
  credit_card_declined: 'credit_card_declined',
  refunded: 'refunded',
  chargedback: 'chargedback',
  chargeback: 'chargedback',
}

export function parseWiapyPayload(body: unknown): ParsedWiapy {
  const b = obj(body)
  const payment = b.payment == null ? null : obj(b.payment)
  const customer = obj(b.customer)
  const checkout = obj(b.checkout)
  const base: ParsedWiapy = {
    kind: 'invalid',
    paymentId: '',
    status: 'unknown',
    rawStatus: '',
    amountCents: null,
    method: '',
    email: str(customer.email).toLowerCase(),
    name: str(customer.name),
    checkoutId: str(checkout.id),
    checkoutTitle: str(checkout.title),
    checkoutAmountCents: cents(checkout.amount),
    orderbump: arr(checkout.orderbump).map((o) => {
      const x = obj(o)
      return { id: str(x.id), title: str(x.title), amountCents: cents(x.amount) }
    }),
    products: arr(b.products).map((p) => {
      const x = obj(p)
      return { id: str(x.id), title: str(x.title), type: str(x.type) }
    }),
  }
  if (!body || typeof body !== 'object') return { ...base, reason: 'corpo não é um objeto JSON' }
  if (payment === null) return { ...base, kind: 'abandoned' }
  const rawStatus = str(payment.status)
  return {
    ...base,
    kind: 'payment',
    paymentId: str(payment.id),
    rawStatus,
    status: STATUS[rawStatus] ?? 'unknown',
    amountCents: cents(payment.amount),
    method: str(payment.payment_method),
  }
}

const has = (hay: string, hints: string[]) => hints.some((h) => h && hay.toLowerCase().includes(h.toLowerCase()))

// o bump aparece em checkout.orderbump[] e também em products[]. Reconhece por id, por título ou por valor (R$ 7,90 = 790).
export function detectBump(p: ParsedWiapy): boolean {
  if (p.checkoutId && BUMP.wiapyProductId && p.checkoutId === BUMP.wiapyProductId) return true
  if (p.orderbump.some((o) => (BUMP.wiapyProductId && o.id === BUMP.wiapyProductId) || has(o.title, BUMP.titleHints) || o.amountCents === BUMP.priceCents)) return true
  return p.products.some((x) => (BUMP.wiapyProductId && x.id === BUMP.wiapyProductId) || has(x.title, BUMP.titleHints))
}

// ofertas adicionais (OFFERS): só contam as que estão ligadas (enabled) e configuradas (id do produto ou trecho do título)
export function detectOffers(p: ParsedWiapy): OfferId[] {
  return OFFERS.filter((o) => {
    if (!o.enabled) return false
    const id = o.wiapyProductId
    if (id && (p.checkoutId === id || p.orderbump.some((x) => x.id === id) || p.products.some((x) => x.id === id))) return true
    return o.titleHints.length > 0 && (p.orderbump.some((x) => has(x.title, o.titleHints)) || p.products.some((x) => has(x.title, o.titleHints)))
  }).map((o) => o.id)
}

// valor do checkout principal em centavos: checkout.amount; senão payment.amount menos os bumps
export function mainAmount(p: ParsedWiapy): number | null {
  if (p.checkoutAmountCents != null) return p.checkoutAmountCents
  if (p.amountCents == null) return null
  const bumps = p.orderbump.reduce((s, o) => s + (o.amountCents ?? 0), 0)
  return p.amountCents - bumps
}

// remove dados pessoais antes de guardar o corpo bruto (só quando WEBHOOK_LOG_RAW=1, para conferir o formato real)
export function redact(body: unknown): unknown {
  const b = JSON.parse(JSON.stringify(body ?? null)) as Record<string, unknown> | null
  if (!b) return b
  const c = obj(b.customer)
  if ('document' in c) c.document = '[removido]'
  if ('mobile_phone' in c) c.mobile_phone = '[removido]'
  if ('email' in c) c.email = String(c.email).replace(/^(.).*(@.*)$/, '$1***$2')
  if ('name' in c) c.name = '[removido]'
  const t = obj(b.tracking)
  for (const k of ['ip', 'useragent']) if (k in t) t[k] = '[removido]'
  const p = obj(b.payment)
  if (p.pix_boleto) p.pix_boleto = '[removido]'
  return b
}

// ---------------------------------------------------------------- kit completo (único ticket R$ 37,90)

// Lista de checkouts que liberam o kit. Vem de FULL_KIT_CHECKOUT_IDS (separada por vírgula); vazia = padrão do catálogo.
export function fullKitCheckoutIds(): string[] {
  const fromEnv = env('FULL_KIT_CHECKOUT_IDS')
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
  return fromEnv.length ? fromEnv : DEFAULT_FULL_KIT_CHECKOUT_IDS
}

// Checagem extra OPCIONAL de valor: com FULL_KIT_REQUIRE_AMOUNT=1 só libera se o valor do checkout for exatamente R$ 37,90.
export function isFullKit(p: ParsedWiapy): { ok: boolean; reason?: string } {
  if (!p.checkoutId) return { ok: false, reason: 'sem checkout.id' }
  if (!fullKitCheckoutIds().includes(p.checkoutId)) return { ok: false, reason: 'checkout fora da lista FULL_KIT_CHECKOUT_IDS' }
  if (env('FULL_KIT_REQUIRE_AMOUNT') === '1') {
    const amount = mainAmount(p)
    if (amount !== PLANS.completo.priceCents) return { ok: false, reason: `valor ${amount ?? 'desconhecido'} diferente de ${PLANS.completo.priceCents}` }
  }
  return { ok: true }
}

// compra avulsa de um produto adicional (o checkout É o produto do bump ou de uma oferta ligada)
export function isStandaloneExtra(p: ParsedWiapy): boolean {
  if (!p.checkoutId) return false
  if (BUMP.wiapyProductId && p.checkoutId === BUMP.wiapyProductId) return true
  return OFFERS.some((o) => o.enabled && !!o.wiapyProductId && p.checkoutId === o.wiapyProductId)
}
