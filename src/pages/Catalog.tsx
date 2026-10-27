import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BUMP, ITEM_BY_ID, brl, hooksFrom, type Offer } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { lockInfo } from '../lib/lock'
import { ComboSlot } from '../components/Combo'
import { Collections, OfferBullets, OfferStack, Testimonials, TrackLine } from '../components/System'
import { DeliverableChip, Layout, OfferMedia, Picture } from '../components/ui'
import { catalogOffers } from '../lib/offers'
import { owns, trackHook, trackOffer, useStore, viewCatalog } from '../lib/store'
import { themeStyle, themed, useTitleFont } from '../lib/theme'
import { leveTudoProminent, nextStepIds } from '../lib/system'

// Página /catalogo: só produtos. Mockup em cima, nome, promessa curta, preço, botão.
// Botão: checkout (status 'available' com checkoutUrl), "Quero ser avisada" (sem checkout, grava offer.interest) ou "Você já tem" + Abrir.
export function Catalog() {
  const s = useStore()
  const offers = catalogOffers()
  const [params] = useSearchParams()
  const foco = params.get('foco')
  // as novidades desta visita (a lista não muda quando a bolinha some)
  const fresh = useRef(new Set(offers.filter((o) => o.badgeNew && !s.viewed[o.id] && !owns(s, o.id)).map((o) => o.id)))
  const ids = offers.map((o) => o.id).join(',')
  useEffect(() => {
    viewCatalog(offers.map((o) => o.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])
  // gancho ou mapa levaram a um card: rola até ele
  useEffect(() => {
    if (!foco) return
    const el = document.getElementById(foco === 'leve-tudo' ? 'leve-tudo' : foco === 'colecoes' ? 'colecoes' : `card-${foco}`)
    el?.scrollIntoView({ block: 'start' })
  }, [foco])
  const next = nextStepIds(s)
  const prominent = leveTudoProminent(s)
  const card = (o: Offer) => <CatalogCard key={o.id} offer={o} isNew={fresh.current.has(o.id)} isNext={next.has(o.id)} focus={foco === o.id} />
  return (
    <Layout title="Catálogo de ofertas">
      {prominent && (
        <div id="leve-tudo">
          <ComboSlot prominent />
        </div>
      )}
      <section className="catalog-hero">
        <h1>Catálogo de ofertas</h1>
        <p className="lead">Materiais para complementar suas vendas de panetone. São compras à parte: nada daqui está no seu kit e nada é cobrado ao abrir esta página.</p>
        <Link className="btn btn-secondary" to="/caminho">
          Ver seu caminho
        </Link>
      </section>
      <div className="catalog-list">
        {offers.filter((o) => o.featured).map(card)}
        <BumpCard />
        {offers.length === 0 && <p className="lead catalog-empty">Ainda não há outras ofertas no catálogo.</p>}
      </div>
      <Collections from="catalog" />
      {!prominent && (
        <div id="leve-tudo">
          <ComboSlot prominent={false} />
        </div>
      )}
      <div className="catalog-list">{offers.filter((o) => !o.featured).map(card)}</div>
    </Layout>
  )
}

function CatalogCard({ offer, isNew, isNext, focus }: { offer: Offer; isNew: boolean; isNext: boolean; focus: boolean }) {
  const s = useStore()
  const owned = owns(s, offer.id)
  const buyable = offer.status === 'available' && !!offer.checkoutUrl
  const soon = !owned && !buyable
  const asked = !!s.interested[offer.id]
  const hooks = hooksFrom(offer.id)
  const ref = useTitleFont<HTMLElement>(offer.id)
  return (
    <article ref={ref} style={themeStyle(offer.id)} id={`card-${offer.id}`} className={`card ccard${themed(offer.id) ? ' themed' : ''}${offer.featured ? ' ccard-featured' : ''}${isNext && !owned ? ' ccard-next' : ''}${focus ? ' ccard-focus' : ''}`} aria-label={offer.title}>
      <div className="ccard-media">
        <OfferMedia offer={offer} className="pic-offer" />
        <span className="ccard-flags">
          {offer.featured && <span className="flag flag-featured">★ Destaque</span>}
          {owned ? <span className="flag flag-own">Você já tem</span> : soon ? <span className="flag flag-soon">Em breve</span> : null}
          {isNew && !owned && <span className="flag flag-new">Novo</span>}
          {isNext && !owned && <span className="flag flag-next">● Próximo passo</span>}
        </span>
      </div>
      <div className="ccard-body">
        <DeliverableChip offer={offer} />
        <span className="tag">{offer.title}</span>
        <h2 className="ccard-headline">{offer.headline}</h2>
        <p className="lead">{offer.promise}</p>
        <OfferBullets offer={offer} />
        {owned ? (
          <Link className="btn btn-primary btn-block" to={`/produto/${offer.id}`}>
            Abrir
          </Link>
        ) : (
          <>
            <OfferStack offer={offer} soon={soon} />
            <Testimonials offer={offer} />
            {buyable ? (
              <a className="btn btn-primary btn-block" href={offer.checkoutUrl} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', offer.id, 'catalog')}>
                Quero este material
              </a>
            ) : (
              <button className={`btn btn-block ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackOffer('offer.interest', offer.id, 'catalog')}>
                {asked ? 'Anotado ✓ Em breve' : 'Quero ser avisada'}
              </button>
            )}
          </>
        )}
        <TrackLine id={offer.id} />
        {hooks.map((h) => (
          <p className="hook-line" key={h.to}>
            {h.text}{' '}
            <Link to={`/catalogo?foco=${h.to}`} onClick={() => trackHook(offer.id, h.to, 'catalog')}>
              Ver o próximo ›
            </Link>
          </p>
        ))}
      </div>
    </article>
  )
}

// Fichas de Socorro (bump): mesmo mecanismo de direito dos outros produtos. Sem o direito = bloqueado + oferta; com o direito = "Você já tem" + Abrir.
function BumpCard() {
  const s = useStore()
  const owned = owns(s, 'bump')
  const lock = lockInfo()
  const asked = !!s.interested.bump
  const item = ITEM_BY_ID.bump
  return (
    <article className="card ccard" aria-label={item.title}>
      <div className="ccard-media">
        <Picture img={MOCKUPS.bump} className="pic-offer" />
        <span className="ccard-flags">{owned ? <span className="flag flag-own">Você já tem</span> : <span className="flag flag-lock">🔒 Bloqueado</span>}</span>
      </div>
      <div className="ccard-body">
        <span className="tag">{item.title}</span>
        <h2 className="ccard-headline">Fichas de Socorro: o que fazer quando o panetone não sai como esperado</h2>
        <p className="lead">{item.subtitle}</p>
        {owned ? (
          <Link className="btn btn-primary btn-block" to="/produto/bump">
            Abrir
          </Link>
        ) : (
          <>
            <p className="ccard-price">
              <strong>{brl(BUMP.priceCents)}</strong>
              <span> · pagamento único</span>
            </p>
            {lock.buyable ? (
              <a className="btn btn-primary btn-block" href={lock.href} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', 'bump', 'catalog')}>
                Quero as Fichas de Socorro
              </a>
            ) : (
              <button className={`btn btn-block ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackOffer('offer.interest', 'bump', 'catalog')}>
                {asked ? 'Anotado ✓ Em breve' : 'Quero ser avisada'}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  )
}
