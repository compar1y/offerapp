// Estado da cliente. Hoje vive no navegador (modo demonstração).
// Na integração, compras e pedidos passam a vir do servidor (Supabase + webhook da Wiapy);
// as telas só falam com as funções exportadas aqui.

import { useSyncExternalStore } from 'react'
import { PRODUCTS, type ProductId } from '../data/config'

export type OrderStatus = 'pending' | 'paid' | 'refunded'

export interface Order {
  id: string
  product: ProductId
  status: OrderStatus
  createdAt: number
}

export type OfferSource = 'obrigado' | 'receita' | 'banner' | 'cadeado' | 'inicio'

export interface TrackedEvent {
  name: string
  at: number
  props?: Record<string, string>
}

export interface State {
  email: string | null
  pendingEmail: string | null
  welcomed: boolean
  orders: Order[]
  done: Record<string, boolean>
  upsellRefused: boolean
  downsellRefused: boolean
  events: TrackedEvent[]
}

const KEY = 'offerapp:v1'

const initial: State = {
  email: null,
  pendingEmail: null,
  welcomed: false,
  orders: [],
  done: {},
  upsellRefused: false,
  downsellRefused: false,
  events: [],
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...initial, ...JSON.parse(raw) } : initial
  } catch {
    return initial
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // sem armazenamento (aba anônima): segue só em memória
  }
  listeners.forEach((l) => l())
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function track(name: string, props?: Record<string, string>) {
  set({ events: [...state.events, { name, at: Date.now(), props }].slice(-500) })
}

// ---------- acesso ----------

export const DEMO_CODE = '123456'

export function requestCode(email: string) {
  set({ pendingEmail: email.trim().toLowerCase() })
  track('codigo_pedido')
}

export function verifyCode(code: string): boolean {
  if (!state.pendingEmail || code.trim() !== DEMO_CODE) return false
  const orders = state.orders.length
    ? state.orders
    : [{ id: newId(), product: 'front' as ProductId, status: 'paid' as OrderStatus, createdAt: Date.now() }]
  set({ email: state.pendingEmail, pendingEmail: null, orders })
  track('entrou')
  return true
}

export function logout() {
  set({ email: null, pendingEmail: null })
}

export function finishWelcome() {
  set({ welcomed: true })
}

// ---------- compras ----------

export function owns(s: State, product: ProductId): boolean {
  return s.orders.some((o) => o.product === product && o.status === 'paid')
}

// o downsell libera o mesmo guia em versão enxuta; o upsell cobre tudo
export function ownsGuide(s: State): 'full' | 'essential' | null {
  if (owns(s, 'upsell')) return 'full'
  if (owns(s, 'downsell')) return 'essential'
  return null
}

// qual oferta do guia mostrar agora: upsell, depois downsell, depois volta ao upsell
export function guideOffer(s: State): 'upsell' | 'downsell' | null {
  if (ownsGuide(s)) return null
  if (s.upsellRefused && !s.downsellRefused) return 'downsell'
  return 'upsell'
}

export function pendingOrder(s: State, product: ProductId): Order | undefined {
  return s.orders.find((o) => o.product === product && o.status === 'pending')
}

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

export function startCheckout(product: ProductId, source: OfferSource): Order {
  track('checkout_iniciado', { product, source })
  const existing = pendingOrder(state, product)
  if (existing) return existing
  const order: Order = { id: newId(), product, status: 'pending', createdAt: Date.now() }
  set({ orders: [...state.orders, order] })
  track('pix_gerado', { product })
  const url = PRODUCTS[product].checkoutUrl
  if (url && state.email) {
    window.open(`${url}${url.includes('?') ? '&' : '?'}email=${encodeURIComponent(state.email)}`, '_blank')
  }
  return order
}

// na integração isso é feito pelo webhook da Wiapy, nunca pelo navegador
export function simulatePayment(orderId: string) {
  const order = state.orders.find((o) => o.id === orderId)
  set({ orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o)) })
  if (order) track('compra_paga', { product: order.product })
}

export function refuse(product: 'upsell' | 'downsell') {
  set(product === 'upsell' ? { upsellRefused: true } : { downsellRefused: true })
  track('oferta_recusada', { product })
}

// ---------- progresso ----------

export function toggleDone(recipeId: string) {
  const done = { ...state.done, [recipeId]: !state.done[recipeId] }
  set({ done })
  if (done[recipeId]) track('receita_feita', { recipe: recipeId })
}

export function resetDemo() {
  set({ ...initial })
}
