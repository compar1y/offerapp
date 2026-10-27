// Peças do catálogo como sistema: bullets, "O que você recebe", bônus com valor, valor somado, ganchos de trilha e coleções.
// Sem relógio, sem escassez, sem preço antigo: o valor riscado é só a "soma dos itens".
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { OFFER_BY_ID, brl, shortTitle, hooksFrom, offerValueFromCents, type ItemId, type Offer, type OfferId } from '../../shared/catalog'
import { catalogBonusImage } from '../data/images'
import { CONFIG } from '../data/config'
import { catalogOffers } from '../lib/offers'
import { owns, trackCollection, trackHook, useStore } from '../lib/store'
import { collectionViews, homeSlots, trackOf, type CollectionView } from '../lib/system'
import { ComboBanner } from './Combo'
import { CATALOG_ENABLED } from '../data/config'
import { Picture, OfferMedia, Icon } from './ui'

export function OfferBullets({ offer }: { offer: Offer }) {
  if (!offer.bullets?.length) return null
  return (
    <ul className="bullets bullets-copy">
      {offer.bullets.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}

export function Testimonials({ offer }: { offer: Offer }) {
  if (!offer.testimonials.length) return null
  return (
    <section className="testimonials" aria-label="O que dizem os clientes">
      <h3>O que dizem os clientes</h3>
      {offer.testimonials.map((t) => (
        <blockquote key={t.name + t.text}>
          <p>“{t.text}”</p>
          <footer>{t.name}</footer>
        </blockquote>
      ))}
    </section>
  )
}

// "O que você recebe" (passo a passo), antes → depois, bônus com valor, valor somado dos itens, preço e garantia
export function OfferStack({ offer, soon }: { offer: Offer; soon: boolean }) {
  const strip = catalogBonusImage(offer)
  const from = offerValueFromCents(offer)
  return (
    <div className="stack">
      {offer.stack && (
        <>
          <h3 className="stack-title">O que você recebe</h3>
          <p className="stack-deliv">
            Formato: <strong>{offer.deliverableType}</strong>
          </p>
          <ol className="stack-steps">
            {offer.stack.steps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <p className="stack-ba">
            <span>{offer.stack.before}</span>
            <b aria-label="vira">→</b>
            <strong>{offer.stack.after}</strong>
          </p>
        </>
      )}
      {!!offer.bonus?.length && (
        <>
          <h3 className="stack-title">Junto, estes bônus</h3>
          {strip ? (
            <Picture img={strip} className="bonus-strip" />
          ) : (
            CONFIG.demo && (
              <div className="bonus-strip-ph" role="img" aria-label={`Mini-mockups dos bônus de ${offer.title} (placeholder, imagem em breve)`}>
                {offer.bonus.map((b) => (
                  <span key={b.title} className="bonus-ph">
                    <Icon icon={b.icon} size={22} />
                    <small>{b.fileType}</small>
                  </span>
                ))}
              </div>
            )
          )}
          <ul className="stack-bonus">
            <li>
              <span>{shortTitle(offer.id)}</span>
              <b>{brl(offer.priceCents)}</b>
            </li>
            {offer.bonus.map((b) => (
              <li key={b.title}>
                <span>
                  <small className="bonus-type"><Icon icon={b.icon} size={14} /> {b.fileType}</small>
                  {b.title}
                </span>
                <b>{brl(b.valueCents)}</b>
              </li>
            ))}
          </ul>
          <p className="stack-sum">
            Valor somado dos itens: <s>{brl(from)}</s>
          </p>
        </>
      )}
      <p className="ccard-price">
        <strong>{soon ? `Preço previsto: ${brl(offer.priceCents)}` : brl(offer.priceCents)}</strong>
        {!soon && <span> · pagamento único</span>}
      </p>
      <p className="stack-guarantee">
        <span aria-hidden>🛡️</span> Garantia de 7 dias. <small>(confira as condições no checkout)</small>
      </p>
    </div>
  )
}

// "Trilha X · etapa N de M"
export function TrackLine({ id }: { id: string }) {
  const t = trackOf(id)
  if (!t) return null
  const inCat = new Set(catalogOffers().map((o) => o.id))
  const steps = t.steps.filter((st) => inCat.has(st.offer))
  const n = steps.findIndex((st) => st.offer === id) + 1
  if (n === 0) return null
  return (
    <p className="track-line">
      Trilha <strong>{t.title}</strong> · etapa {n} de {steps.length}
    </p>
  )
}

function hookTarget(to: OfferId): string {
  return catalogOffers().some((o) => o.id === to) ? `/catalogo?foco=${to}` : '/caminho'
}

// gancho de rodapé: "Depois de X, o próximo passo é Y". `where` = de onde veio o clique (evento hook.click).
export function HookBox({ id, where }: { id: ItemId; where: string }) {
  const s = useStore()
  const hooks = hooksFrom(id)
  if (!hooks.length) return null
  return (
    <section className={`block block-info hookbox${s.done[id] ? ' hookbox-hl' : ''}`} aria-label="Próximo passo">
      <h2 className="section-title">Depois deste, o próximo passo</h2>
      {hooks.map((h) => {
        const o = OFFER_BY_ID[h.to]
        const have = owns(s, h.to)
        return (
          <div className={`hook hook-${h.kind}`} key={h.to}>
            <p>{h.text}</p>
            <Link className="btn btn-secondary btn-block" to={have ? `/produto/${h.to}` : hookTarget(h.to)} onClick={() => trackHook(id, h.to, where)}>
              {have ? `Abrir: ${shortTitle(o.id)}` : `Ver: ${shortTitle(o.id)}`}
            </Link>
          </div>
        )
      })}
    </section>
  )
}

// coleção por objetivo: itens com ✓ / mockup, "Faltam N", barra de progresso real, soma dos itens e botão
export function CollectionCard({ v, from }: { v: CollectionView; from: string }) {
  const s = useStore()
  const c = v.collection
  const asked = !!s.collectionInterest[c.id]
  const done = v.missing.length === 0
  return (
    <article className="card colcard" aria-label={`Coleção ${c.title}`}>
      <h3 className="colcard-title">Coleção {c.title}</h3>
      <p className="lead">{c.goal}</p>
      <ul className="col-items">
        {c.items.map((id) => (
          <li key={id} className={owns(s, id) ? 'col-own' : ''}>
            <span className="col-mock">
              <OfferMedia offer={OFFER_BY_ID[id]} className="pic-col" />
              {owns(s, id) && <span className="col-check" aria-label="Você já tem">✓</span>}
            </span>
            <span className="col-name">{shortTitle(id)}</span>
          </li>
        ))}
      </ul>
      <div className="col-progress" role="group" aria-label={`${v.owned} de ${v.total} itens`}>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.round((v.owned / v.total) * 100)}%` }} />
        </div>
        <p className="hint">
          {done ? 'Você tem a coleção completa.' : v.owned === 0 ? `${v.total} itens nesta coleção.` : `Faltam ${v.missing.length} para completar sua coleção (${v.owned} de ${v.total}).`}
        </p>
      </div>
      {!done && (
        <>
          <p className="col-sum">
            {v.priceCents !== null && v.strike ? (
              <>
                Soma dos itens: <s>{brl(v.sumCents)}</s>
              </>
            ) : (
              <>Soma dos itens: {brl(v.sumCents)}</>
            )}
          </p>
          <p className="ccard-price">
            <strong>{v.priceCents !== null ? `Preço da coleção: ${brl(v.priceCents)}` : 'Preço da coleção: em breve'}</strong>
          </p>
          {v.buyable ? (
            <a className="btn btn-primary btn-block" href={c.checkoutUrl} target="_blank" rel="noreferrer" onClick={() => trackCollection('collection.click', c.id, from)}>
              Quero esta coleção
            </a>
          ) : (
            <button className={`btn btn-block ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackCollection('collection.interest', c.id, from)}>
              {asked ? 'Anotado ✓ Em breve' : 'Quero ser avisada'}
            </button>
          )}
        </>
      )}
    </article>
  )
}

export function Collections({ from }: { from: string }) {
  const s = useStore()
  const views = collectionViews(s)
  const seen = useRef(false)
  useEffect(() => {
    if (seen.current) return
    seen.current = true
    for (const v of views) if (v.missing.length > 0) trackCollection('collection.view', v.collection.id, from)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section id="colecoes" className="collections" aria-label="Coleções por objetivo">
      <h2 className="section-title">Coleções por objetivo</h2>
      <p className="lead">Combinações que andam juntas. Você pode comprar item por item ou a coleção, quando ela estiver disponível.</p>
      <div className="catalog-list">
        {views.map((v) => (
          <CollectionCard key={v.collection.id} v={v} from={from} />
        ))}
      </div>
    </section>
  )
}

// Home: no máximo 2 espaços de oferta. (1) o próximo passo da trilha, (2) a coleção que falta ou, com 3+ itens liberados, o "Leve tudo".
// Sem relógio e sem "só hoje": os mesmos 2 espaços valem o tempo todo.
export function HomeOffers() {
  const s = useStore()
  if (!CATALOG_ENABLED) return null
  const slots = homeSlots(s)
  const n = slots.next ? OFFER_BY_ID[slots.next.offer] : null
  const have = n ? owns(s, n.id) : false
  const col = slots.collection
  return (
    <section className="block home-offers" aria-label="Para você agora">
      {n && !have && (
        <Link to={`/catalogo?foco=${n.id}`} className="catalog-banner" onClick={() => slots.next?.hook && trackHook(slots.next.hook.from, n.id, 'home')}>
          <span className="catalog-banner-top">
            <span className="tag">PRÓXIMO PASSO</span>
          </span>
          <strong className="catalog-banner-title">{shortTitle(n.id)}</strong>
          <span className="catalog-banner-text">{slots.next?.hook?.text ?? n.promise}</span>
          <span className="catalog-banner-cta">Ver este material ›</span>
        </Link>
      )}
      {col && (
        <Link to="/catalogo?foco=colecoes" className="catalog-banner" onClick={() => trackCollection('collection.view', col.collection.id, 'home')}>
          <span className="catalog-banner-top">
            <span className="tag">COLEÇÃO</span>
          </span>
          <strong className="catalog-banner-title">{col.collection.title}</strong>
          <span className="catalog-banner-text">{col.owned > 0 ? `Faltam ${col.missing.length} para completar sua coleção.` : col.collection.goal}</span>
          <span className="catalog-banner-cta">Ver a coleção ›</span>
        </Link>
      )}
      {slots.leveTudo && <ComboBanner />}
      <Link className="btn btn-link btn-block" to="/caminho">
        Ver seu caminho
      </Link>
    </section>
  )
}
