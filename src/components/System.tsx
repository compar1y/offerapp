// Peças do catálogo como sistema: bullets, "O que você recebe", bônus com valor, valor somado, ganchos de trilha.
// Sem relógio, sem escassez, sem preço antigo: o valor riscado é só o "valor somado dos itens", dentro do detalhe.
import { Link } from 'react-router-dom'
import { COPY, OFFER_BY_ID, brl, shortTitle, hooksFrom, offerValueFromCents, type ItemId, type Offer, type OfferId } from '../../shared/catalog'
import { catalogBonusImage } from '../data/images'
import { PREVIEW } from '../data/config'
import { catalogOffers } from '../lib/offers'
import { owns, trackHook, useStore } from '../lib/store'
import { homeSlots, trackOf } from '../lib/system'
import { ComboBanner } from './Combo'
import { CATALOG_ENABLED } from '../data/config'
import { Icon, OfferCard, Picture, Section } from './ui'

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
            {COPY.price.sum.charAt(0).toUpperCase() + COPY.price.sum.slice(1)}: <s>{brl(from)}</s>
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

// gancho de rodapé: "O próximo passo natural depois de X" (sugestão de caminho, não estatística). `where` = de onde veio o clique (evento hook.click).
export function HookBox({ id, where }: { id: ItemId; where: string }) {
  const s = useStore()
  const hooks = hooksFrom(id)
  if (!hooks.length) return null
  return (
    <section className={`block block-info hookbox${s.done[id] ? ' hookbox-hl' : ''}`} aria-label="Próximo passo">
      <h2 className="section-title">Seu próximo passo</h2>
      {hooks.map((h) => {
        const o = OFFER_BY_ID[h.to]
        const have = owns(s, h.to)
        return (
          <div className={`hook hook-${h.kind}`} key={h.to}>
            <p>{h.text}</p>
            <Link className="btn btn-secondary btn-block" to={have ? `/produto/${h.to}` : hookTarget(h.to)} onClick={() => trackHook(id, h.to, where)}>
              {have ? `${COPY.button.open}: ${shortTitle(o.id)}` : `${COPY.button.card}: ${shortTitle(o.id)}`}
            </Link>
          </div>
        )
      })}
    </section>
  )
}

// Home: um espaço para o próximo passo da trilha e, com 3+ itens liberados, a Biblioteca completa.
// Sem relógio e sem "só hoje": os mesmos espaços valem o tempo todo.
export function HomeOffers() {
  const s = useStore()
  if (!CATALOG_ENABLED) return null
  const slots = homeSlots(s)
  const n = slots.next ? OFFER_BY_ID[slots.next.offer] : null
  const have = n ? owns(s, n.id) : false
  return (
    <>
      {n && !have && (
        <Section title={COPY.sections.forYou}>
          <OfferCard offer={n} hero isNext from="home" />
        </Section>
      )}
      {slots.leveTudo && <ComboBanner />}
      <Link className="btn btn-secondary btn-block" to="/caminho">
        Ver seu caminho
      </Link>
    </>
  )
}
