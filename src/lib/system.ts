// Catálogo como sistema: trilhas, ganchos, coleções e as 2 ofertas da home. Tudo calculado pelos entitlements da cliente.
// A compra nunca é bloqueada: o "próximo passo" só orienta e destaca.
import { COLLECTIONS, HOOKS, TRACKS, collectionMissing, collectionSumCents, trackNext, type Collection, type Hook, type OfferId, type Track, type TrackId } from '../../shared/catalog'
import { owns, type State } from './store'
import { catalogOffers } from './offers'

export const ownedIds = (s: State): string[] => s.session?.items ?? []
export const ownedOfferCount = (s: State): number => catalogOffers().filter((o) => owns(s, o.id)).length

// "Leve tudo" ganha o destaque principal depois de 3 ou mais itens liberados (antes disso fica acessível, em tamanho menor)
export const LEVE_TUDO_MIN_OWNED = 3
export const leveTudoProminent = (s: State): boolean => ownedOfferCount(s) >= LEVE_TUDO_MIN_OWNED

export type StepState = 'owned' | 'next' | 'locked'

export interface StepView {
  offer: OfferId
  when?: string
  state: StepState
  // a etapa anterior foi marcada com "Fiz essa": o próximo passo ganha destaque
  highlight: boolean
  hook?: Hook
}

export interface TrackView {
  track: Track
  steps: StepView[]
  ownedCount: number
  complete: boolean
}

export function trackViews(s: State): TrackView[] {
  const owned = ownedIds(s)
  // só as etapas que estão no catálogo (ofertas fora da lista fechada, como Páscoa, não aparecem no mapa)
  const inCatalog = new Set(catalogOffers().map((o) => o.id))
  return TRACKS.map((t) => ({ ...t, steps: t.steps.filter((st) => inCatalog.has(st.offer)) })).map((track) => {
    const next = trackNext(track, owned)
    const steps = track.steps.map((st, i) => {
      const prev = i > 0 ? track.steps[i - 1].offer : null
      const state: StepState = owned.includes(st.offer) ? 'owned' : next && next.index === i ? 'next' : 'locked'
      return {
        offer: st.offer,
        when: st.when,
        state,
        highlight: state === 'next' && !!prev && owned.includes(prev) && !!s.done[prev],
        hook: prev ? HOOKS.find((h) => h.from === prev && h.to === st.offer) : undefined,
      }
    })
    const ownedCount = steps.filter((x) => x.state === 'owned').length
    return { track, steps, ownedCount, complete: ownedCount === steps.length }
  })
}

export const trackOf = (id: string): TrackView['track'] | undefined => TRACKS.find((t) => t.steps.some((st) => st.offer === id))
export const stepNumber = (t: Track, id: string): number => t.steps.findIndex((st) => st.offer === id) + 1

// ofertas "próximo passo" que ganham destaque no catálogo: o próximo de cada trilha cuja etapa anterior a cliente já tem
export function nextStepIds(s: State): Set<OfferId> {
  const out = new Set<OfferId>()
  for (const tv of trackViews(s)) {
    tv.steps.forEach((st, i) => {
      if (st.state === 'next' && i > 0 && tv.steps[i - 1].state === 'owned') out.add(st.offer)
    })
  }
  return out
}

export interface CollectionView {
  collection: Collection
  missing: OfferId[]
  owned: number
  total: number
  sumCents: number
  priceCents: number | null
  strike: boolean
  buyable: boolean
}

export function collectionViews(s: State): CollectionView[] {
  const owned = ownedIds(s)
  return COLLECTIONS.map((collection) => {
    const missing = collectionMissing(collection, owned)
    const sumCents = collectionSumCents(collection)
    const priceCents = collection.collectionPriceCents && collection.collectionPriceCents > 0 ? collection.collectionPriceCents : null
    return {
      collection,
      missing,
      owned: collection.items.length - missing.length,
      total: collection.items.length,
      sumCents,
      priceCents,
      // riscada só quando existe preço da coleção e ele é menor que a soma; o rótulo é sempre "soma dos itens"
      strike: priceCents !== null && priceCents < sumCents,
      buyable: priceCents !== null && !!collection.checkoutUrl,
    }
  })
}

// Home: no máximo 2 ofertas. (1) o próximo passo da trilha, (2) a coleção que falta (ou o "Leve tudo", quando ele está em destaque).
export interface HomeSlots {
  next: { offer: OfferId; track: TrackId; hook?: Hook } | null
  collection: CollectionView | null
  leveTudo: boolean
}

export function homeSlots(s: State): HomeSlots {
  const inCatalog = new Set(catalogOffers().map((o) => o.id))
  const views = trackViews(s).filter((t) => !t.complete)
  // trilhas já começadas primeiro; depois as outras, na ordem de exibição (aprender, ceia, vender, temporadas)
  const started = views.filter((t) => t.ownedCount > 0)
  const rest = views.filter((t) => t.ownedCount === 0)
  let next: HomeSlots['next'] = null
  for (const tv of [...started, ...rest]) {
    const st = tv.steps.find((x) => x.state === 'next' && inCatalog.has(x.offer))
    if (st) {
      next = { offer: st.offer, track: tv.track.id, hook: st.hook }
      break
    }
  }
  const cols = collectionViews(s).filter((c) => c.missing.length > 0)
  const partial = cols.filter((c) => c.owned > 0).sort((a, b) => a.missing.length - b.missing.length)
  const collection = partial[0] ?? cols[0] ?? null
  return { next, collection: leveTudoProminent(s) ? null : collection, leveTudo: leveTudoProminent(s) }
}

