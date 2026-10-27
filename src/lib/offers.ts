// Regras de quais ofertas aparecem para a cliente. Tudo daqui só devolve algo se a oferta estiver LIGADA (enabled).
import { COMBO, OFFERS, comboShowStrike, comboSumCents, type Offer, type OfferPlacement } from '../../shared/catalog'
import { CATALOG_ENABLED, CONFIG } from '../data/config'
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
  return OFFERS.filter((o) => o.catalog && (o.enabled || CONFIG.demo))
    .map((o, i) => ({ o, i }))
    .sort((a, b) => rank(a.o) - rank(b.o) || a.i - b.i)
    .map((x) => x.o)
}

// ofertas novas (badgeNew) que a cliente ainda não abriu no catálogo e não comprou: é o número da bolinha vermelha
export function unseenOffers(s: State): Offer[] {
  return catalogOffers().filter((o) => o.badgeNew && !s.viewed[o.id] && !owns(s, o.id))
}

// ---- super oferta "Leve tudo"
// Preço de DEMONSTRAÇÃO: só no modo demo/prévia e só enquanto o Levi não definir COMBO.comboPriceCents. Nunca no modo real.
export const DEMO_COMBO_PRICE_CENTS = 19700

export interface ComboView {
  title: string
  items: Offer[]
  sumCents: number
  priceCents: number | null
  demoPrice: boolean
  strike: boolean
  checkoutUrl: string
  // tem preço e checkout: o botão abre o checkout. Senão: "Em breve" + "Quero ser avisada"
  buyable: boolean
}

// null = o combo não aparece (catálogo desligado, combo desligado, sem itens ou a cliente já tem tudo)
export function comboView(s: State): ComboView | null {
  if (!CATALOG_ENABLED || !(COMBO.enabled || CONFIG.demo)) return null
  const items = catalogOffers()
  if (items.length === 0 || items.every((o) => owns(s, o.id))) return null
  const demoPrice = CONFIG.demo && COMBO.comboPriceCents === null
  const priceCents = demoPrice ? DEMO_COMBO_PRICE_CENTS : COMBO.comboPriceCents
  const sumCents = comboSumCents(items)
  return {
    title: COMBO.title,
    items,
    sumCents,
    priceCents,
    demoPrice,
    strike: comboShowStrike(priceCents, sumCents),
    checkoutUrl: COMBO.checkoutUrl,
    buyable: !!COMBO.checkoutUrl && priceCents !== null && priceCents > 0,
  }
}
