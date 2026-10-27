// Estado da tela. Fala com o AccessProvider (demo ou servidor); guarda no aparelho só o que é da interface
// (boas-vindas feitas, materiais vistos, "fiz essa", ofertas dispensadas). Eventos também vão ao servidor, sem bloquear a tela.

import { useSyncExternalStore } from 'react'
import { provider, getDemoFlags, setDemoFlags, type OpenFileResult } from './access'
import { ITEM_BY_ID, findFile, type CollectionId, type ItemId, type MeResponse, type OfferId } from '../../shared/catalog'

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
  interested: Partial<Record<OfferId | 'bump', boolean>>
  // ofertas do catálogo que a cliente já viu (some a bolinha vermelha da navegação)
  viewed: Partial<Record<OfferId, boolean>>
  // combo "Leve tudo": já girou a roleta / já pediu aviso
  comboSpun: boolean
  comboInterest: boolean
  // coleções em que a cliente pediu aviso
  collectionInterest: Partial<Record<CollectionId, boolean>>
  demoBump: boolean
  demoOffers: boolean
  demoHave: number
}

const UI_KEY = 'panetone-app:v2'

type UiState = Pick<State, 'welcomed' | 'seen' | 'done' | 'dismissed' | 'interested' | 'viewed' | 'comboSpun' | 'comboInterest' | 'collectionInterest'>
const UI_EMPTY: UiState = { welcomed: false, seen: {}, done: {}, dismissed: {}, interested: {}, viewed: {}, comboSpun: false, comboInterest: false, collectionInterest: {} }

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
    localStorage.setItem(UI_KEY, JSON.stringify({ welcomed: state.welcomed, seen: state.seen, done: state.done, dismissed: state.dismissed, interested: state.interested, viewed: state.viewed, comboSpun: state.comboSpun, comboInterest: state.comboInterest, collectionInterest: state.collectionInterest }))
  } catch {
    /* segue em memória */
  }
}

let state: State = { ready: false, session: null, pendingEmail: null, demoBump: getDemoFlags().bump, demoOffers: getDemoFlags().offers, demoHave: getDemoFlags().have, ...loadUi() }
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

// confere de novo o que o cliente tem (usado enquanto o acesso está sendo liberado)
export async function refreshSession() {
  const session = await provider.getSession()
  if (session) set({ session })
}

export async function requestCode(email: string) {
  const r = await provider.requestCode(email)
  if (r.ok) set({ pendingEmail: email.trim().toLowerCase() })
  return r
}

// tela "compra confirmada": quando o acesso já existe, o código foi enviado e seguimos para a tela do código
export async function checkAccess(email: string) {
  const r = await provider.checkAccess(email)
  if (r.ok && r.ready) set({ pendingEmail: email.trim().toLowerCase() })
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
export function trackOffer(name: 'offer.click' | 'offer.interest', id: OfferId | 'bump', from: string) {
  if (name === 'offer.interest') {
    state = { ...state, interested: { ...state.interested, [id]: true } }
    saveUi()
    set({})
  }
  void provider.trackEvent(name, { offerId: id, from }).catch(() => undefined)
}

// A cliente abriu o catálogo: marca cada oferta mostrada como vista (guarda no aparelho) e avisa o servidor.
// catalog.view a cada abertura; offer.view só na primeira vez que cada oferta é vista.
export function viewCatalog(ids: OfferId[]) {
  const fresh = ids.filter((id) => !state.viewed[id])
  if (fresh.length) {
    state = { ...state, viewed: { ...state.viewed, ...Object.fromEntries(fresh.map((id) => [id, true])) } }
    saveUi()
    set({})
  }
  void provider.trackEvent('catalog.view', { count: String(ids.length), novas: String(fresh.length) }).catch(() => undefined)
  for (const id of fresh) void provider.trackEvent('offer.view', { offerId: id, from: 'catalog' }).catch(() => undefined)
}

// combo "Leve tudo": view/spin/click/interest. spin e interest também ficam guardados no aparelho.
export function trackCombo(name: 'combo.view' | 'combo.spin' | 'combo.click' | 'combo.interest', from: string) {
  if (name === 'combo.spin' || name === 'combo.interest') {
    state = { ...state, ...(name === 'combo.spin' ? { comboSpun: true } : { comboInterest: true }) }
    saveUi()
    set({})
  }
  void provider.trackEvent(name, { from }).catch(() => undefined)
}

// sistema de catálogo: mapa "Seu caminho", ganchos e coleções. Só registram, nunca bloqueiam.
export function trackJourney(count: number) {
  void provider.trackEvent('journey.view', { count: String(count) }).catch(() => undefined)
}

export function trackHook(fromItem: string, to: OfferId, where: string) {
  void provider.trackEvent('hook.click', { itemId: fromItem, to, from: where }).catch(() => undefined)
}

export function trackCollection(name: 'collection.view' | 'collection.click' | 'collection.interest', id: CollectionId, from: string) {
  if (name === 'collection.interest') {
    state = { ...state, collectionInterest: { ...state.collectionInterest, [id]: true } }
    saveUi()
    set({})
  }
  void provider.trackEvent(name, { collectionId: id, from }).catch(() => undefined)
}

// só no modo demonstração. Ligar/desligar as ofertas recarrega a página (OFFERS é lida ao iniciar o app).
export async function changeDemo(patch: Partial<{ bump: boolean; offers: boolean; have: number }>) {
  setDemoFlags(patch)
  if (patch.offers !== undefined) {
    window.location.reload()
    return
  }
  const session = await provider.getSession()
  set({ demoBump: getDemoFlags().bump, demoHave: getDemoFlags().have, session })
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
