// Contexto de cada card: o que a pessoa acabou de fazer no app ("Fiz essa", material aberto, trilha em andamento).
// A regra e os textos vivem em shared/catalog.ts (offerContextFor, COPY, OFFER_COPY); aqui só entram os dados reais do estado.
import { bumpContextFor, offerContextFor, type OfferContext, type OfferId } from '../../shared/catalog'
import type { State } from './store'
import { catalogOffers } from './offers'
import { ownedIds } from './system'

export function contextOf(s: State, id: OfferId): OfferContext {
  return offerContextFor(id, { done: s.done, seen: s.seen, owned: ownedIds(s), inCatalog: new Set(catalogOffers().map((o) => o.id)) })
}

export function bumpContextOf(s: State): OfferContext {
  return bumpContextFor({ done: s.done, seen: s.seen })
}
