import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OFFER_BY_ID, shortTitle } from '../../shared/catalog'
import { ComboSlot } from '../components/Combo'
import { Collections } from '../components/System'
import { Layout, OfferMedia } from '../components/ui'
import { catalogOffers } from '../lib/offers'
import { themeStyle } from '../lib/theme'
import { trackJourney, useStore } from '../lib/store'
import { leveTudoProminent, ownedOfferCount, trackViews, type StepView } from '../lib/system'

const MARK: Record<StepView['state'], { sym: string; label: string }> = {
  owned: { sym: '✓', label: 'Liberado' },
  next: { sym: '●', label: 'Próximo passo' },
  locked: { sym: '🔒', label: 'Bloqueado' },
}

// Tela "Seu caminho": 4 trilhas em linha, uma etapa por produto. A compra nunca é bloqueada: "bloqueado" só quer dizer "você ainda não tem".
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
      <section className="catalog-hero">
        <h1>Seu caminho</h1>
        <p className="lead">Cada material resolve o próximo passo depois do anterior. Você pode comprar na ordem que quiser: nada fica travado.</p>
      </section>
      <div className="journey">
        {views.map((tv) => (
          <section className="card track" key={tv.track.id} aria-label={`Trilha ${tv.track.title}`}>
            <h2 className="track-title">{tv.track.title}</h2>
            <p className="hint">
              {tv.track.tagline} · {tv.ownedCount} de {tv.steps.length}
            </p>
            <ol className="jsteps">
              {tv.steps.map((st) => {
                const o = OFFER_BY_ID[st.offer]
                const m = MARK[st.state]
                const to = inCatalog.has(st.offer) ? `/catalogo?foco=${st.offer}` : undefined
                const body = (
                  <>
                    <span className="jstep-media">
                      <OfferMedia offer={o} className="pic-jstep" />
                      <span className={`jstep-mark jm-${st.state}`} aria-hidden>
                        {m.sym}
                      </span>
                    </span>
                    <span className="jstep-name">{shortTitle(o.id)}</span>
                    <span className="jstep-state">{m.label}</span>
                    <span className="jstep-soon">{st.state === 'owned' ? '' : st.when ? `Em breve · ${st.when}` : o.status === 'soon' ? 'Em breve' : ''}</span>
                  </>
                )
                return (
                  <li key={st.offer} style={themeStyle(st.offer)} className={`jstep js-${st.state}${st.highlight ? ' js-hl' : ''}`} aria-label={`${o.title}: ${m.label}`}>
                    {st.state === 'owned' ? (
                      <Link to={`/produto/${st.offer}`}>{body}</Link>
                    ) : to ? (
                      <Link to={to}>{body}</Link>
                    ) : (
                      <div>{body}</div>
                    )}
                  </li>
                )
              })}
            </ol>
            {tv.steps.map((st) => st.hook && st.state === 'next' && <p key={st.offer} className="hook-line">{st.hook.text}</p>)}
            <p className="track-end">
              <Link to="/catalogo?foco=leve-tudo">Fecho da trilha: Leve tudo ›</Link>
            </p>
          </section>
        ))}
      </div>
      <Collections from="journey" />
      <ComboSlot prominent={leveTudoProminent(s)} />
    </Layout>
  )
}
