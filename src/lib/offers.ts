// Regras de quais ofertas aparecem para a cliente. Tudo daqui só devolve algo se a oferta estiver LIGADA (enabled).
import { COMBO, OFFERS, bundlePending, comboGate, comboOffers, comboShowInstallments, comboShowStrike, comboSumCents, isBundleId, type BundleId, type Offer, type OfferId, type OfferPlacement } from '../../shared/catalog'
import { CATALOG_ENABLED, COMBO_MIN_AVAILABLE, PREVIEW } from '../data/config'
import { buyUrl, getCheckouts, isReady, readySet } from './checkouts'
import { owns, type State } from './store'

// Quem já comprou (entitlement) não vê a oferta. Dispensada ("Agora não") some. O downsell só aparece depois de
// dispensar a oferta anterior (requiresDismissed) e se a cliente não comprou essa oferta anterior.
export function visibleOffers(s: State, placement: OfferPlacement): Offer[] {
  return OFFERS.filter((o) => {
    if (!o.enabled || !o.placement.includes(placement)) return false
    if (owns(s, o.id) || s.dismissed[o.id]) return false
    if (o.requiresDismissed) {
      const prev = o.requiresDismissed
      if (!s.dismissed[prev] || owns(s, prev)) return false
    }
    return true
  })
}

// ofertas já compradas (viram um cartão "No seu kit" na home, sem texto de venda)
export function ownedOffers(s: State): Offer[] {
  return OFFERS.filter((o) => o.enabled && owns(s, o.id))
}

// ---- catálogo de ofertas (página /catalogo)
// Só existe com CATALOG_ENABLED. Em produção só entram ofertas com enabled = true; no modo demonstração entram todas as marcadas com catalog
// (as "em breve" aparecem com mockup placeholder claramente rotulado e botão "Quero ser avisada").
export function catalogOffers(): Offer[] {
  if (!CATALOG_ENABLED) return []
  // destaque primeiro, depois o top 10 (tierS), depois os demais, cada grupo na ordem da lista OFFERS
  const rank = (o: Offer) => (o.featured ? 0 : o.tierS ? 1 : 2)
  return OFFERS.filter((o) => o.catalog && (o.enabled || PREVIEW))
    .map((o, i) => ({ o, i }))
    .sort((a, b) => rank(a.o) - rank(b.o) || a.i - b.i)
    .map((x) => x.o)
}

// ofertas novas (badgeNew) que a cliente ainda não abriu no catálogo e não comprou: é o número da bolinha vermelha
export function unseenOffers(s: State): Offer[] {
  return catalogOffers().filter((o) => o.badgeNew && !s.viewed[o.id] && !owns(s, o.id))
}

// direito do combo que a cliente já pagou (vêm do /api/me) e os itens deles que ainda não saíram.
// Esses itens entram sozinhos quando `available` virar true: o app só mostra o aviso.
export { buyUrl, isReady }
export const ownedBundles = (s: State): BundleId[] => {
  const out = new Set<BundleId>()
  for (const p of s.session?.purchases ?? []) if (p.status === 'paid') for (const b of p.bundles ?? []) if (isBundleId(b)) out.add(b)
  return [...out]
}
export const pendingFromBundles = (s: State): Set<OfferId> => {
  const out = new Set<OfferId>()
  for (const b of ownedBundles(s)) for (const id of bundlePending(b, readySet())) if (!owns(s, id)) out.add(id)
  return out
}

// ---- super oferta "Leve tudo"
// Preço: COMBO.comboPriceCents (R$ 97,00). A soma riscada vem SEMPRE das ofertas enabled do catálogo. O rótulo "preço de demonstração"
// só existe na demonstração enquanto não houver checkout.
export interface ComboView {
  title: string
  items: Offer[]
  sumCents: number
  priceCents: number | null
  demoPrice: boolean
  strike: boolean
  // "ou 12x": só com COMBO.comboInstallments = 12 (confirmado pelo Caixa na Wiapy)
  installments: boolean
  // link do checkouts.json (null = sem compra)
  checkoutUrl: string | null
  // gate: botão de compra só com checkout E itens prontos >= mínimo. Senão "Em breve" + "Quero ser avisada"
  ready: number
  total: number
  min: number
  readyIds: Set<OfferId>
  buyable: boolean
}

// null = o combo não aparece (catálogo desligado, combo desligado, sem itens ou a cliente já tem tudo, inclusive o que vem por direito de bundle)
export function comboView(s: State): ComboView | null {
  if (!CATALOG_ENABLED || !(COMBO.enabled || PREVIEW)) return null
  const items = comboOffers()
  if (items.length === 0) return null
  const pending = pendingFromBundles(s)
  if (items.every((o) => owns(s, o.id) || pending.has(o.id))) return null
  const priceCents = COMBO.comboPriceCents
  const sumCents = comboSumCents(items)
  const g = comboGate(getCheckouts(), COMBO_MIN_AVAILABLE)
  const hasPrice = priceCents !== null && priceCents > 0
  return {
    title: COMBO.title,
    items,
    sumCents,
    priceCents,
    demoPrice: PREVIEW && !buyUrl('combo'),
    strike: comboShowStrike(priceCents, sumCents),
    installments: hasPrice && comboShowInstallments(COMBO.comboInstallments),
    checkoutUrl: buyUrl('combo'),
    ready: g.ready,
    total: g.total,
    min: g.min,
    readyIds: new Set(items.filter((o) => isReady(o.id)).map((o) => o.id)),
    buyable: hasPrice && g.open,
  }
}
