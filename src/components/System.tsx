// Peças do catálogo como sistema: bullets, "O que você recebe", bônus com valor, valor somado, ganchos de trilha e coleções.
// Sem relógio, sem escassez, sem preço antigo: o valor riscado é só a "soma dos itens".
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { OFFER_BY_ID, brl, shortTitle, hooksFrom, offerValueFromCents, type ItemId, type Offer, type OfferId } from '../../shared/catalog'
import { catalogBonusImage } from '../data/images'
import { PREVIEW } from '../data/config'
import { buyUrl, catalogOffers, pendingFromBundles } from '../lib/offers'
import { themeStyle } from '../lib/theme'
import { owns, trackCollection, trackHook, useStore } from '../lib/store'
import { collectionViews, homeSlots, trackOf, type CollectionView } from '../lib/system'
import { ComboBanner } from './Combo'
import { CATALOG_ENABLED } from '../data/config'
import { Carousel, Icon, OfferCard, OfferMedia, Picture, Section } from './ui'

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
          <h3 className="stack-title">Como funciona</h3>
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
          <h3 className="stack-title">Bônus que vêm junto</h3>
          {strip ? (
            <Picture img={strip} className="bonus-strip" />
          ) : (
            PREVIEW && (
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
      <p className="stack-guarantee" data-soon={soon || undefined}>
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
  return catalogOffers().some((o) => o.id === to) ? `/produto/${to}` : '/caminho'
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

// coleção por objetivo (peça de carrossel): três capas grandes, nome, uma frase, "N de M prontos", preço e botão.
// A lista completa dos itens fica dentro de "Ver os itens".
export function CollectionCard({ v, from }: { v: CollectionView; from: string }) {
  const s = useStore()
  const c = v.collection
  const asked = !!s.collectionInterest[c.id]
  const done = v.missing.length === 0
  // a cliente já pagou esta coleção (ou o combo): o que falta sai sozinho, então não oferecemos compra de novo
  const covered = v.missing.length > 0 && v.missing.every((id) => pendingFromBundles(s).has(id))
  return (
    <article className="ccol" aria-label={`Coleção ${c.title}`}>
      <div className="ccol-media" aria-hidden>
        {c.items.slice(0, 3).map((id) => (
          <span className="ccol-cover" key={id} style={themeStyle(id)}>
            <OfferMedia offer={OFFER_BY_ID[id]} className="pic-col" />
          </span>
        ))}
      </div>
      <h3 className="ccol-title">{c.title}</h3>
      <p className="ccol-goal">{c.goal}</p>
      <p className="ccol-count" role="status">
        {done ? 'Você tem a coleção completa.' : v.owned > 0 ? `Você tem ${v.owned} de ${v.total}. ` : ''}
        {!done && `${v.ready} de ${v.total} prontos hoje`}
      </p>
      {!done &&
        (covered ? (
          <p className="v-note">Coleção comprada: o que falta entra sozinho quando sair.</p>
        ) : (
          <>
            <p className="v-price ccol-price">
              <strong>{brl(v.priceCents)}</strong>
              <span>
                soma dos itens {v.strike ? <s aria-label={`Soma dos itens: ${brl(v.sumCents)}`}>{brl(v.sumCents)}</s> : brl(v.sumCents)}
              </span>
            </p>
            {v.buyable && buyUrl(c.id) ? (
              <a className="btn btn-buy btn-block" href={buyUrl(c.id) ?? ''} target="_blank" rel="noreferrer" onClick={() => trackCollection('collection.click', c.id, from)}>
                <span aria-hidden>🛒</span> Comprar a coleção
              </a>
            ) : (
              <>
                <p className="v-soon">Disponível em breve</p>
                <button className={`btn btn-block ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackCollection('collection.interest', c.id, from)}>
                  {asked ? 'Anotado ✓ Avisamos você' : 'Quero ser avisada'}
                </button>
              </>
            )}
          </>
        ))}
      <details className="v-details">
        <summary>Ver os {v.total} itens</summary>
        <ul className="col-items">
          {c.items.map((id) => (
            <li key={id} className={owns(s, id) ? 'col-own' : ''}>
              <Link to={`/produto/${id}`} className="col-name">
                {shortTitle(id)}
              </Link>
              {owns(s, id) ? (
                <span className="col-check">✓ você tem</span>
              ) : !v.readyIds.has(id) ? (
                <span className="col-soon">{pendingFromBundles(s).has(id) ? 'já é seu: entra automático quando sair' : 'entra automático quando sair'}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
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
    <Section id="colecoes" title="Coleções" lead="Combinações que andam juntas. Compre item por item ou a coleção.">
      <Carousel label="Coleções por objetivo">
        {views.map((v) => (
          <div className="car-item car-col" key={v.collection.id}>
            <CollectionCard v={v} from={from} />
          </div>
        ))}
      </Carousel>
    </Section>
  )
}

// Home: no máximo 2 espaços de oferta. (1) o próximo passo da trilha (o destaque), (2) a coleção que falta ou, com 3+ itens liberados, o "Leve tudo".
// Sem relógio e sem "só hoje": os mesmos 2 espaços valem o tempo todo.
export function HomeOffers() {
  const s = useStore()
  if (!CATALOG_ENABLED) return null
  const slots = homeSlots(s)
  const n = slots.next ? OFFER_BY_ID[slots.next.offer] : null
  const have = n ? owns(s, n.id) : false
  const col = slots.collection
  return (
    <>
      {n && !have && (
        <Section title="Para você" lead={slots.next?.hook?.text}>
          <OfferCard offer={n} hero isNext from="home" />
        </Section>
      )}
      {col && (
        <Section title="Coleção para você">
          <Link to="/catalogo#colecoes" className="row-link" onClick={() => trackCollection('collection.view', col.collection.id, 'home')}>
            <span>
              <strong>{col.collection.title}</strong>
              <span>{col.owned > 0 ? `Faltam ${col.missing.length} para completar.` : col.collection.goal}</span>
            </span>
            <span className="row-link-go" aria-hidden>
              ›
            </span>
          </Link>
        </Section>
      )}
      {slots.leveTudo && <ComboBanner />}
      <Link className="btn btn-secondary btn-block" to="/caminho">
        Ver seu caminho
      </Link>
    </>
  )
}
