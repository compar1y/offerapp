import { useEffect, useRef } from 'react'
import { LevelChip } from '../components/Game'
import { Link, useSearchParams } from 'react-router-dom'
import { COPY, ITEM_BY_ID } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { lockInfo } from '../lib/lock'
import { ComboSlot } from '../components/Combo'
import { Context, Layout, LockMark, OfferCard, Picture } from '../components/ui'
import { bumpContextOf } from '../lib/context'
import { buyUrl, catalogOffers } from '../lib/offers'
import { owns, trackOffer, useStore, viewCatalog } from '../lib/store'
import { nextStepIds } from '../lib/system'

// Página /catalogo (rótulo "Biblioteca"): UMA lista vertical, todos os materiais um embaixo do outro, sem seções nem carrosséis.
// Ordem: o destaque "Para você" primeiro; depois os materiais já disponíveis (ordem de lançamento); depois os que ainda estão chegando; a Biblioteca completa fecha a lista.
// Cada card: imagem grande, nome, contexto ou necessidade, uma frase e o botão "Desbloquear por R$ X" (preço só no botão). O resto (bullets, bônus, depoimentos) fica na página da oferta (/produto/:id).
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
    const el = document.getElementById(foco === 'leve-tudo' ? 'leve-tudo' : `card-${foco}`)
    el?.scrollIntoView({ block: 'start' })
  }, [foco])
  const next = nextStepIds(s)
  // um destaque principal no topo ("Para você"): o destaque do catálogo ou o próximo passo da trilha
  const hero = offers.find((o) => o.featured && !owns(s, o.id)) ?? offers.find((o) => next.has(o.id) && !owns(s, o.id))
  // disponíveis (checkout pronto) antes dos que estão chegando; dentro de cada grupo vale a ordem de lançamento do catálogo
  const rest = offers.filter((o) => o.id !== hero?.id)
  const ordered = [...rest.filter((o) => buyUrl(o.id) || owns(s, o.id)), ...rest.filter((o) => !(buyUrl(o.id) || owns(s, o.id)))]
  const bumpReady = !!lockInfo().buyable || owns(s, 'bump')
  const at = bumpReady ? 0 : ordered.length
  const list: ('bump' | (typeof ordered)[number])[] = [...ordered.slice(0, at), 'bump', ...ordered.slice(at)]
  return (
    <Layout title={COPY.library.title}>
      <header className="screen-head">
        <h1>{COPY.library.title}</h1>
        <p className="lead">{COPY.library.lead}</p>
        <LevelChip compact />
      </header>
      <div className="vlist vlist-all" aria-label="Todos os materiais da biblioteca">
        {hero && <OfferCard offer={hero} hero isNew={fresh.current.has(hero.id)} isNext={next.has(hero.id)} focus={foco === hero.id} from="catalog" />}
        {list.map((o) => (o === 'bump' ? <BumpCard key="bump" /> : <OfferCard key={o.id} offer={o} isNew={fresh.current.has(o.id)} isNext={next.has(o.id)} focus={foco === o.id} from="catalog" />))}
        <ComboSlot prominent />
      </div>
      {offers.length === 0 && <p className="lead catalog-empty">Ainda não há outros materiais na biblioteca.</p>}
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
        {!owned && <LockMark />}
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
            {lock.buyable ? (
              <a className="btn btn-buy btn-block btn-want btn-pulse" href={lock.href} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', 'bump', 'catalog')}>
                {lock.buy}
              </a>
            ) : (
              <>
                <button className="btn btn-block btn-soon" disabled>
                  {COPY.button.soon}
                </button>
                <button className={`btn btn-block ${s.interested.bump ? 'btn-done' : 'btn-secondary'}`} disabled={!!s.interested.bump} onClick={() => trackOffer('offer.interest', 'bump', 'catalog')}>
                  {s.interested.bump ? COPY.button.notified : COPY.button.notify}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </article>
  )
}
