import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BUMP, ITEM_BY_ID, brl } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { lockInfo } from '../lib/lock'
import { ComboSlot } from '../components/Combo'
import { Collections } from '../components/System'
import { Layout, OfferCard, Picture, Section } from '../components/ui'
import { catalogOffers } from '../lib/offers'
import { owns, trackOffer, useStore, viewCatalog } from '../lib/store'
import { leveTudoProminent, nextStepIds } from '../lib/system'

// Página /catalogo, em seções separadas e na ordem: Para você (um destaque), Coleções (carrossel), Leve tudo, Todos os materiais (lista vertical de cards limpos).
// Cada card: imagem grande, nome, uma frase, preço e botão. O resto (bullets, bônus, depoimentos) fica na página da oferta (/produto/:id).
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
  // um destaque principal: o Leve tudo (3+ itens liberados) ou o destaque do catálogo / próximo passo
  const hero = prominent ? undefined : (offers.find((o) => o.featured && !owns(s, o.id)) ?? offers.find((o) => next.has(o.id) && !owns(s, o.id)))
  const rest = offers.filter((o) => o.id !== hero?.id)
  return (
    <Layout title="Ofertas">
      <header className="screen-head">
        <h1>Ofertas</h1>
        <p className="lead">Materiais para vender mais panetone. Compra à parte, nada é cobrado ao abrir.</p>
      </header>
      {prominent && <ComboSlot prominent />}
      {hero && (
        <Section title="Para você">
          <OfferCard offer={hero} hero isNew={fresh.current.has(hero.id)} isNext={next.has(hero.id)} focus={foco === hero.id} from="catalog" />
        </Section>
      )}
      <Collections from="catalog" />
      {!prominent && <ComboSlot prominent={false} />}
      <Section title="Todos os materiais">
        <div className="vlist">
          <BumpCard />
          {rest.map((o) => (
            <OfferCard key={o.id} offer={o} isNew={fresh.current.has(o.id)} isNext={next.has(o.id)} focus={foco === o.id} from="catalog" />
          ))}
        </div>
        {offers.length === 0 && <p className="lead catalog-empty">Ainda não há outras ofertas no catálogo.</p>}
      </Section>
      <Link className="btn btn-secondary btn-block" to="/caminho">
        Ver seu caminho
      </Link>
    </Layout>
  )
}

// Fichas de Socorro (bump): mesmo mecanismo de direito dos outros produtos. Sem o direito = oferta; com o direito = "Acessar".
export function BumpCard() {
  const s = useStore()
  const owned = owns(s, 'bump')
  const lock = lockInfo()
  const asked = !!s.interested.bump
  const item = ITEM_BY_ID.bump
  return (
    <article className="vcard" aria-label={item.title}>
      <Link to="/produto/bump" className="vcard-media" aria-label={`Ver ${item.title}`}>
        <Picture img={MOCKUPS.bump} className="pic-v" />
        <span className="vflags">{owned ? <span className="flag flag-own">No seu acesso</span> : <span className="flag flag-lock">🔒 Bloqueado</span>}</span>
      </Link>
      <div className="vcard-body">
        <h3 className="vcard-title">
          <Link to="/produto/bump">{item.title}</Link>
        </h3>
        <p className="vcard-promise">{item.subtitle}</p>
        {owned ? (
          <Link className="btn btn-open btn-block" to="/produto/bump">
            Acessar
          </Link>
        ) : (
          <>
            <p className="v-price">
              <strong>{brl(BUMP.priceCents)}</strong>
              <span>{lock.buyable ? 'pagamento único' : 'preço previsto'}</span>
            </p>
            {lock.buyable ? (
              <a className="btn btn-buy btn-block" href={lock.href} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', 'bump', 'catalog')}>
                <span aria-hidden>🛒</span> Comprar
              </a>
            ) : (
              <>
                <p className="v-soon">Disponível em breve</p>
                <button className={`btn btn-block ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackOffer('offer.interest', 'bump', 'catalog')}>
                  {asked ? 'Anotado ✓ Avisamos você' : 'Quero ser avisada'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </article>
  )
}
