// Estado da tela. Fala com o AccessProvider (demo ou servidor); guarda no aparelho só o que é da interface
// (boas-vindas feitas, materiais vistos, "fiz essa", ofertas dispensadas). Eventos também vão ao servidor, sem bloquear a tela.

import { useSyncExternalStore } from 'react'
import { provider, getDemoFlags, setDemoFlags, type OpenFileResult } from './access'
import { ITEM_BY_ID, findFile, type ItemId, type MeResponse, type OfferId } from '../../shared/catalog'

export interface State {
  ready: boolean
  session: MeResponse | null
  pendingEmail: string | null
  welcomed: boolean
  seen: Partial<Record<ItemId, boolean>>
  // "Fiz essa": receitas/bônus que a cliente marcou
  done: Partial<Record<ItemId, boolean>>
  // ofertas que a cliente dispensou com "Agora não"
  dismissed: Partial<Record<OfferId, boolean>>
  // ofertas em que a cliente já disse ter interesse (oferta sazonal sem checkout)
  interested: Partial<Record<OfferId, boolean>>
  demoBump: boolean
  demoOffers: boolean
}

const UI_KEY = 'panetone-app:v2'

type UiState = Pick<State, 'welcomed' | 'seen' | 'done' | 'dismissed' | 'interested'>
const UI_EMPTY: UiState = { welcomed: false, seen: {}, done: {}, dismissed: {}, interested: {} }

function loadUi(): UiState {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (raw) return { ...UI_EMPTY, ...JSON.parse(raw) }
  } catch {
    /* nada */
  }
  return UI_EMPTY
}

function saveUi() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ welcomed: state.welcomed, seen: state.seen, done: state.done, dismissed: state.dismissed, interested: state.interested }))
  } catch {
    /* segue em memória */
  }
}

let state: State = { ready: false, session: null, pendingEmail: null, demoBump: getDemoFlags().bump, demoOffers: getDemoFlags().offers, ...loadUi() }
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
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

export async function init() {
  const session = await provider.getSession()
  set({ session, ready: true })
}

export async function requestCode(email: string) {
  const r = await provider.requestCode(email)
  if (r.ok) set({ pendingEmail: email.trim().toLowerCase() })
  return r
}

export async function verifyCode(code: string) {
  if (!state.pendingEmail) return { ok: false, error: 'Peça o código de novo.' }
  const r = await provider.verifyCode(state.pendingEmail, code)
  if (r.ok) {
    const session = await provider.getSession()
    set({ session, pendingEmail: null })
  }
  return r
}

export async function logout() {
  await provider.logout()
  set({ session: null, pendingEmail: null })
}

export function finishWelcome() {
  state = { ...state, welcomed: true }
  saveUi()
  set({})
}

export function cancelPending() {
  set({ pendingEmail: null })
}

export function toggleSeen(id: ItemId) {
  state = { ...state, seen: { ...state.seen, [id]: !state.seen[id] } }
  saveUi()
  set({})
}

// "Fiz essa": marca local + evento no servidor. Libera o rodapé de oferta da página (ver lib/offers.ts).
export function toggleDone(id: ItemId) {
  const on = !state.done[id]
  state = { ...state, done: { ...state.done, [id]: on } }
  saveUi()
  set({})
  void provider.trackEvent(on ? 'item.done' : 'item.undone', { itemId: id }).catch(() => undefined)
}

// "Agora não": guarda local + evento. É o que libera o downsell (requiresDismissed).
export function dismissOffer(id: OfferId, from: string) {
  state = { ...state, dismissed: { ...state.dismissed, [id]: true } }
  saveUi()
  set({})
  void provider.trackEvent('offer.dismiss', { offerId: id, from }).catch(() => undefined)
}

// clique numa oferta (comprar, abrir card) ou interesse (oferta sazonal sem checkout). Só registra, nunca bloqueia.
export function trackOffer(name: 'offer.click' | 'offer.interest', id: OfferId, from: string) {
  if (name === 'offer.interest') {
    state = { ...state, interested: { ...state.interested, [id]: true } }
    saveUi()
    set({})
  }
  void provider.trackEvent(name, { offerId: id, from }).catch(() => undefined)
}

// só no modo demonstração. Ligar/desligar as ofertas recarrega a página (OFFERS é lida ao iniciar o app).
export async function changeDemo(patch: Partial<{ bump: boolean; offers: boolean }>) {
  setDemoFlags(patch)
  if (patch.offers !== undefined) {
    window.location.reload()
    return
  }
  const session = await provider.getSession()
  set({ demoBump: getDemoFlags().bump, session })
}

export function owns(s: State, id: ItemId): boolean {
  return !!s.session?.items.includes(id)
}

// abre ou baixa um arquivo. A janela é aberta antes do pedido ao servidor para o navegador do celular não bloquear.
export async function openFile(fileKey: string, download: boolean): Promise<OpenFileResult> {
  const hit = findFile(fileKey)
  if (!hit || !owns(state, hit.item.id)) return { ok: false, error: 'Este material não está liberado no seu acesso.' }
  const win = download ? null : window.open('', '_blank')
  const r = await provider.getFileUrl(fileKey, download)
  if (!r.ok || !r.url) {
    win?.close()
    return r
  }
  if (download) {
    const a = document.createElement('a')
    a.href = r.url
    a.download = ''
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } else if (win) {
    win.location.href = r.url
  } else {
    window.location.assign(r.url)
  }
  return r
}

export function sendFeedback(choice: string, text: string) {
  return provider.sendFeedback(choice, text)
}

export function progress(s: State): { seen: number; total: number } {
  const ids = (s.session?.items ?? []).filter((i) => ITEM_BY_ID[i] && ITEM_BY_ID[i].kind !== 'offer')
  return { seen: ids.filter((i) => s.seen[i]).length, total: ids.length }
}
