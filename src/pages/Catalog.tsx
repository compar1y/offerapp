import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BUMP, COPY, ITEM_BY_ID, brl } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { lockInfo } from '../lib/lock'
import { ComboSlot } from '../components/Combo'
import { Collections } from '../components/System'
import { Context, Layout, OfferCard, Picture, Section } from '../components/ui'
import { bumpContextOf } from '../lib/context'
import { catalogOffers } from '../lib/offers'
import { owns, trackOffer, useStore, viewCatalog } from '../lib/store'
import { leveTudoProminent, nextStepIds } from '../lib/system'

// Página /catalogo (rótulo "Biblioteca"), em seções separadas e na ordem: Para você (um destaque), Para o seu caminho (coleções), Biblioteca completa, Todos os materiais.
// Cada card: imagem grande, nome, contexto ou necessidade, uma frase, preço discreto e "Ver como ajuda". O resto (bullets, bônus, depoimentos) fica na página da oferta (/produto/:id).
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
  // um destaque principal: a biblioteca completa (3+ itens liberados) ou o destaque do catálogo / próximo passo
  const hero = prominent ? undefined : (offers.find((o) => o.featured && !owns(s, o.id)) ?? offers.find((o) => next.has(o.id) && !owns(s, o.id)))
  const rest = offers.filter((o) => o.id !== hero?.id)
  return (
    <Layout title={COPY.library.title}>
      <header className="screen-head">
        <h1>{COPY.library.title}</h1>
        <p className="lead">{COPY.library.lead}</p>
      </header>
      {prominent && <ComboSlot prominent />}
      {hero && (
        <Section title={COPY.sections.forYou}>
          <OfferCard offer={hero} hero isNew={fresh.current.has(hero.id)} isNext={next.has(hero.id)} focus={foco === hero.id} from="catalog" />
        </Section>
      )}
      <Collections from="catalog" />
      {!prominent && <ComboSlot prominent={false} />}
      <Section title={COPY.sections.all} lead={COPY.sections.allLead}>
        <div className="vlist">
          <BumpCard />
          {rest.map((o) => (
            <OfferCard key={o.id} offer={o} isNew={fresh.current.has(o.id)} isNext={next.has(o.id)} focus={foco === o.id} from="catalog" />
          ))}
        </div>
        {offers.length === 0 && <p className="lead catalog-empty">Ainda não há outros materiais na biblioteca.</p>}
      </Section>
      <Link className="btn btn-secondary btn-block" to="/caminho">
        Ver seu caminho
      </Link>
    </Layout>
  )
}

// Fichas de Socorro (bump): mesmo mecanismo de direito dos outros produtos. Sem o direito = convite para ver; com o direito = "Acessar".
export function BumpCard() {
  const s = useStore()
  const owned = owns(s, 'bump')
  const lock = lockInfo()
  const item = ITEM_BY_ID.bump
  return (
    <article className="vcard" aria-label={item.title}>
      <Link to="/produto/bump" className="vcard-media" aria-label={`Ver ${item.title}`}>
        <Picture img={MOCKUPS.bump} className="pic-v" />
        <span className="vflags">{owned ? <span className="flag flag-own">No seu acesso</span> : <span className="flag flag-lock">Para quando precisar</span>}</span>
      </Link>
      <div className="vcard-body">
        <h3 className="vcard-title">
          <Link to="/produto/bump">{item.title}</Link>
        </h3>
        {owned ? (
          <>
            <p className="vcard-promise">{item.subtitle}</p>
            <Link className="btn btn-open btn-block" to="/produto/bump">
              {COPY.button.open}
            </Link>
          </>
        ) : (
          <>
            <Context ctx={bumpContextOf(s)} />
            <p className="vcard-promise">{COPY.bump.cardLine}</p>
            <p className="v-price">
              <strong>{brl(BUMP.priceCents)}</strong>
              <span>{lock.buyable ? COPY.price.once : COPY.price.planned}</span>
            </p>
            {!lock.buyable && <p className="v-soon">{COPY.button.soon}</p>}
            <Link className="btn btn-buy btn-block" to="/produto/bump" onClick={() => trackOffer('offer.click', 'bump', 'catalog')}>
              {COPY.button.card}
            </Link>
          </>
        )}
      </div>
    </article>
  )
}
