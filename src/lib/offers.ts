// Regras de quais ofertas aparecem para a cliente. Tudo daqui só devolve algo se a oferta estiver LIGADA (enabled).
import { OFFERS, type Offer, type OfferPlacement } from '../../shared/catalog'
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
