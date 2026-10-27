// Compras e direitos. Regras (ANEXO-LEVI seção 10, itens 20, 21, 29, 32, 33):
//   pending  (PIX gerado)         : NÃO libera nada
//   paid                          : libera, uma única vez (idempotente por payment.id)
//   refunded / chargeback         : revoga. Um "paid" atrasado depois disso NÃO volta a liberar
//   declined (cartão recusado)    : não libera
//   carrinho abandonado           : só gera evento
// Os direitos são calculados na leitura, a partir das compras com status paid (inclui liberação manual e CSV).

import { ENTITLEMENTS, NO_TOOLS, itemsFor, type BundleId, type ItemId, type OfferId, type MeResponse, type PlanId, type PurchaseStatus, type PurchaseView } from '../shared/catalog.js'
import { readyIds } from './checkouts.js'
import { getKV } from './kv.js'
import { loadCheckouts } from './checkouts.js'
import { amountExpected, detectBumpVia, detectBundles, detectOffers, isFullKit, isStandaloneExtra, toolCheckoutIds, type ParsedWiapy } from './wiapy.js'

export interface Purchase {
  orderId: string
  email: string
  plan: PlanId | null
  bump: boolean
  offers: OfferId[]
  // direito do combo ('combo'). Os produtos são resolvidos na leitura (buildMe), só os prontos (available)
  bundles?: BundleId[]
  // snapshot dos ids liberados por este pagamento (o acesso real é calculado na leitura, ver buildMe)
  entitlements: ItemId[]
  status: PurchaseStatus
  source: 'wiapy' | 'manual' | 'csv'
  amountCents: number | null
  checkoutId: string
  method: string
  // reservado: true = compra que não libera nada, aguardando revisão manual (hoje o webhook ignora checkouts desconhecidos e só registra o evento)
  needsReview: boolean
  createdAt: string
  updatedAt: string
  history: { status: PurchaseStatus; at: string }[]
}

export interface AppEvent {
  name: string
  at: string
  email?: string
  orderId?: string
  // origem do evento: 'wiapy:checkout:<id>', 'manual', 'csv', 'app'
  origin: string
  props?: Record<string, unknown>
}

const emailKey = (e: string) => `purchases:${e}`
const orderKey = (id: string) => `order:${id}`

export const normEmail = (e: string) => e.trim().toLowerCase()
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254

export async function logEvent(ev: Omit<AppEvent, 'at'>): Promise<void> {
  await getKV().push('events', { ...ev, at: new Date().toISOString() } satisfies AppEvent, 5000)
}

export async function purchasesOf(email: string): Promise<Purchase[]> {
  return (await getKV().get<Purchase[]>(emailKey(normEmail(email)))) ?? []
}

async function saveOrder(p: Purchase) {
  const kv = getKV()
  const list = (await kv.get<Purchase[]>(emailKey(p.email))) ?? []
  const i = list.findIndex((x) => x.orderId === p.orderId)
  if (i >= 0) list[i] = p
  else list.push(p)
  await kv.set(emailKey(p.email), list)
  await kv.set(orderKey(p.orderId), { email: p.email })
}

const rank: Record<PurchaseStatus, number> = { pending: 0, declined: 0, paid: 1, refunded: 2, chargeback: 2 }

const FROM_WIAPY: Record<string, PurchaseStatus | undefined> = {
  paid: 'paid',
  unpaid: 'pending',
  credit_card_declined: 'declined',
  refunded: 'refunded',
  chargedback: 'chargeback',
}

export interface ApplyResult {
  ok: boolean
  action: 'created' | 'updated' | 'duplicate' | 'ignored' | 'abandoned' | 'invalid'
  status?: PurchaseStatus
  reason?: string
}

export async function applyWiapyEvent(p: ParsedWiapy): Promise<ApplyResult> {
  const origin = `wiapy:checkout:${p.checkoutId || 'desconhecido'}`
  if (p.kind === 'invalid') {
    await logEvent({ name: 'webhook.invalid', origin, props: { reason: p.reason } })
    return { ok: false, action: 'invalid', reason: p.reason }
  }
  if (p.kind === 'abandoned') {
    await logEvent({ name: 'purchase.abandoned', origin, email: p.email || undefined, props: { checkoutAmountCents: p.checkoutAmountCents } })
    return { ok: true, action: 'abandoned' }
  }
  const status = FROM_WIAPY[p.rawStatus]
  if (!status) {
    await logEvent({ name: 'webhook.unknown_status', origin, orderId: p.paymentId || undefined, props: { status: p.rawStatus } })
    return { ok: true, action: 'ignored', reason: `status desconhecido: ${p.rawStatus}` }
  }
  if (!p.paymentId || !p.email) {
    await logEvent({ name: 'webhook.invalid', origin, props: { reason: !p.paymentId ? 'sem payment.id' : 'sem customer.email', status: p.rawStatus } })
    return { ok: false, action: 'invalid', reason: !p.paymentId ? 'sem payment.id' : 'sem customer.email' }
  }

  const orderId = p.paymentId
  const props = { amountCents: p.amountCents, method: p.method, rawStatus: p.rawStatus }
  const existing = (await purchasesOf(p.email)).find((x) => x.orderId === orderId)
  const now = new Date().toISOString()

  if (!existing) {
    // só libera o que vem do checkout do kit (FULL_KIT_CHECKOUT_IDS) ou de um produto adicional avulso.
    // Qualquer outro checkout é ignorado, mas fica registrado como evento.
    const toolIds = toolCheckoutIds(await loadCheckouts())
    const kit = isFullKit(p)
    const extra = isStandaloneExtra(p, toolIds)
    if (!kit.ok && !extra) {
      await logEvent({ name: 'purchase.ignored_checkout', origin, email: p.email, orderId, props: { ...props, reason: kit.reason, checkoutTitle: p.checkoutTitle, checkoutAmountCents: p.checkoutAmountCents } })
      return { ok: true, action: 'ignored', status, reason: kit.reason }
    }
    const plan = kit.ok ? ('completo' as const) : null
    const bumpVia = detectBumpVia(p)
    const bump = bumpVia !== null
    const offers = detectOffers(p, toolIds)
    const bundles = detectBundles(p)
    const needsReview = false
    const created: Purchase = {
      orderId,
      email: p.email,
      plan,
      bump,
      offers,
      bundles,
      entitlements: itemsFor(plan, bump, offers, bundles, await readyIds()),
      status,
      source: 'wiapy',
      amountCents: p.amountCents,
      checkoutId: p.checkoutId,
      method: p.method,
      needsReview,
      createdAt: now,
      updatedAt: now,
      history: [{ status, at: now }],
    }
    await saveOrder(created)
    if (bump) await logEvent({ name: 'purchase.bump_detected', origin, email: p.email, orderId, props: { via: bumpVia, status } })
    await logEvent({ name: `purchase.${status}`, origin, email: p.email, orderId, props: { ...props, plan, bump, offers, bundles } })
    // ferramenta Conta da Fornada: valor diferente do esperado só avisa (evento), nunca bloqueia a liberação
    if (offers.includes('calculadora') && !plan) {
      const esperado = amountExpected()
      const got = p.checkoutAmountCents ?? p.amountCents
      if (got !== null && got !== esperado) await logEvent({ name: 'purchase.amount_mismatch', origin, email: p.email, orderId, props: { esperado, recebido: got, offerId: 'calculadora' } })
    }
    return { ok: true, action: 'created', status }
  }

  if (existing.status === status) {
    await logEvent({ name: 'purchase.duplicate', origin, email: p.email, orderId, props: { status } })
    return { ok: true, action: 'duplicate', status }
  }
  // não volta atrás: paid -> pending, estornado -> paid etc. são ignorados (webhook fora de ordem ou repetido)
  if (rank[status] < rank[existing.status] || (rank[status] === rank[existing.status] && rank[status] === 0 && existing.status !== 'pending')) {
    await logEvent({ name: 'purchase.ignored_out_of_order', origin, email: p.email, orderId, props: { atual: existing.status, recebido: status } })
    return { ok: true, action: 'ignored', status: existing.status, reason: 'fora de ordem' }
  }
  const next: Purchase = { ...existing, status, updatedAt: now, history: [...existing.history, { status, at: now }] }
  await saveOrder(next)
  await logEvent({ name: `purchase.${status}`, origin, email: p.email, orderId, props })
  return { ok: true, action: 'updated', status }
}

// ---- liberação manual / CSV
export async function grantManual(args: { email: string; plan?: PlanId | null; bump?: boolean; offers?: OfferId[]; bundles?: BundleId[]; source: 'manual' | 'csv'; orderId?: string; note?: string }): Promise<Purchase> {
  const email = normEmail(args.email)
  const now = new Date().toISOString()
  const orderId = args.orderId ?? `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const existing = (await purchasesOf(email)).find((x) => x.orderId === orderId)
  if (existing) {
    await logEvent({ name: 'purchase.duplicate', origin: args.source, email, orderId })
    return existing
  }
  const p: Purchase = {
    orderId,
    email,
    plan: args.plan ?? null,
    bump: !!args.bump,
    offers: args.offers ?? [],
    bundles: args.bundles ?? [],
    entitlements: itemsFor(args.plan ?? null, !!args.bump, args.offers ?? [], args.bundles ?? [], await readyIds()),
    status: 'paid',
    source: args.source,
    amountCents: null,
    checkoutId: '',
    method: '',
    needsReview: false,
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'paid', at: now }],
  }
  await saveOrder(p)
  await logEvent({ name: args.source === 'csv' ? 'csv.grant' : 'manual.grant', origin: args.source, email, orderId, props: { plan: p.plan, bump: p.bump, offers: p.offers, bundles: p.bundles, note: args.note } })
  return p
}

export async function revokeManual(email: string, orderId?: string): Promise<number> {
  const e = normEmail(email)
  const list = await purchasesOf(e)
  let n = 0
  const now = new Date().toISOString()
  for (const p of list) {
    if (p.status === 'paid' && (!orderId || p.orderId === orderId)) {
      p.status = 'refunded'
      p.updatedAt = now
      p.history.push({ status: 'refunded', at: now })
      n++
      await logEvent({ name: 'manual.revoke', origin: 'manual', email: e, orderId: p.orderId })
    }
  }
  if (n) await getKV().set(emailKey(e), list)
  return n
}

// ---- leitura para o app
const planPower = (p: PlanId) => ENTITLEMENTS[p].length

export function buildMe(email: string, purchases: Purchase[], ready: ReadonlySet<string> = new Set()): MeResponse {
  const paid = purchases.filter((p) => p.status === 'paid' && !p.needsReview)
  let plan: PlanId | null = null
  for (const p of paid) if (p.plan && (!plan || planPower(p.plan) > planPower(plan))) plan = p.plan
  const items = new Set<ItemId>()
  for (const p of paid) for (const i of itemsFor(p.plan, p.bump, p.offers ?? [], p.bundles ?? [], ready)) items.add(i)
  const views: PurchaseView[] = purchases.map((p) => ({
    orderId: p.orderId,
    plan: p.plan,
    bump: p.bump,
    offers: p.offers ?? [],
    bundles: p.bundles ?? [],
    // o acesso real é recalculado a cada leitura: o snapshot guardado é só histórico, por isso aqui também resolvemos na hora
    entitlements: itemsFor(p.plan, p.bump, p.offers ?? [], p.bundles ?? [], ready),
    status: p.status,
    source: p.source,
    createdAt: p.createdAt,
  }))
  return { email, plan, items: [...items], entitlements: [...items], purchases: views, tools: { calculadora: { ...NO_TOOLS.calculadora, owned: items.has('calculadora') } } }
}

export async function meFor(email: string): Promise<MeResponse> {
  const e = normEmail(email)
  return buildMe(e, await purchasesOf(e), await readyIds())
}
