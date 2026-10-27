import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { COPY, OFFER_BY_ID, shortTitle } from '../../shared/catalog'
import { ComboSlot } from '../components/Combo'
import { Collections } from '../components/System'
import { Carousel, Layout, OfferMedia, Section } from '../components/ui'
import { buyUrl, catalogOffers } from '../lib/offers'
import { themeStyle } from '../lib/theme'
import { trackJourney, useStore } from '../lib/store'
import { leveTudoProminent, ownedOfferCount, trackViews, type StepView } from '../lib/system'

const MARK: Record<StepView['state'], { sym: string; label: string }> = {
  owned: { sym: '✓', label: 'Liberado' },
  next: { sym: '●', label: COPY.context.nextStep },
  locked: { sym: '○', label: 'Mais adiante' },
}

// Tela "Seu caminho": Trilhas (um carrossel por trilha, uma peça por produto), Para o seu caminho (coleções) e Biblioteca completa.
// Nada é bloqueado: "mais adiante" só quer dizer que o material não está no seu acesso.
export function Journey() {
  const s = useStore()
  const views = trackViews(s)
  const have = ownedOfferCount(s)
  useEffect(() => {
    trackJourney(have)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const inCatalog = new Set(catalogOffers().map((o) => o.id))
  return (
    <Layout title="Seu caminho">
      <header className="screen-head">
        <h1>Seu caminho</h1>
        <p className="lead">Cada material resolve um próximo passo. Siga na ordem que fizer sentido para você: nada fica travado.</p>
      </header>
      <Section title="Trilhas">
        <div className="journey">
          {views.map((tv) => (
            <section className="track" key={tv.track.id} aria-label={`Trilha ${tv.track.title}`}>
              <h3 className="track-title">{tv.track.title}</h3>
              <p className="track-sub">
                {tv.track.tagline} · {tv.ownedCount} de {tv.steps.length}
              </p>
              <Carousel label={`Trilha ${tv.track.title}`}>
                {tv.steps.map((st) => {
                  const o = OFFER_BY_ID[st.offer]
                  const m = MARK[st.state]
                  const to = st.state === 'owned' || inCatalog.has(st.offer) ? `/produto/${st.offer}` : undefined
                  const soon = st.state !== 'owned' && !buyUrl(st.offer)
                  const body = (
                    <>
                      <span className="tile-media" style={themeStyle(st.offer)}>
                        <OfferMedia offer={o} className="pic-tile" />
                        <span className={`jstep-mark jm-${st.state}`} aria-hidden>
                          {m.sym}
                        </span>
                      </span>
                      <strong className="tile-title">{shortTitle(o.id)}</strong>
                      <span className={`tile-state ${st.state === 'owned' ? 'tile-open' : 'tile-soon'}`}>{st.state === 'owned' ? COPY.button.open : soon ? COPY.button.soon : m.label}</span>
                    </>
                  )
                  return (
                    <div key={st.offer} className={`car-item car-tile js-${st.state}${st.highlight ? ' js-hl' : ''}`} aria-label={`${o.title}: ${m.label}`}>
                      {to ? (
                        <Link to={to} className="tile">
                          {body}
                        </Link>
                      ) : (
                        <div className="tile">{body}</div>
                      )}
                    </div>
                  )
                })}
              </Carousel>
            </section>
          ))}
        </div>
      </Section>
      <Collections from="journey" />
      <ComboSlot prominent={leveTudoProminent(s)} />
    </Layout>
  )
}
