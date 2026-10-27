import { type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CATALOG_ENABLED, CONFIG, PREVIEW, supportUrl } from '../data/config'
import type { Img } from '../data/images'
import { catalogImage, offerCover } from '../data/images'
import { COPY, brl, offerCopy, type DeliverableIcon, type Offer, type OfferContext, shortTitle } from '../../shared/catalog'
import { buyUrl, pendingFromBundles, unseenOffers } from '../lib/offers'
import { changeDemo, dismissOffer, owns, trackOffer, useStore } from '../lib/store'
import { themeStyle } from '../lib/theme'
import { contextOf } from '../lib/context'

export function Layout({ title, back, children }: { title?: string; back?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className={`page${CATALOG_ENABLED ? ' with-nav' : ''}`}>
      <header className="topbar">
        {back ? (
          <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(back)}>
            ‹
          </button>
        ) : (
          <span className="icon-btn" aria-hidden />
        )}
        <span className="topbar-title">{title ?? CONFIG.brand}</span>
        <Link to="/conta" className="icon-btn" aria-label="Minha conta">
          ☰
        </Link>
      </header>
      <main className="content">{children}</main>
      <SupportButton />
      <BottomNav />
    </div>
  )
}

// ---- navegação fixa (só com o catálogo ligado). O item "Biblioteca" leva a bolinha vermelha com o número de novidades não vistas.
const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, width: 24, height: 24, viewBox: '0 0 24 24' } as const
const IconHome = () => (
  <svg {...ICON}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
)
const IconGift = () => (
  <svg {...ICON}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13M5 12v9h14v-9" />
    <path d="M12 8c-1-3-5-4-5-1.5S10.5 8 12 8zM12 8c1-3 5-4 5-1.5S13.5 8 12 8z" />
  </svg>
)
const IconPath = () => (
  <svg {...ICON}>
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="6" r="2" />
    <path d="M7 18h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6" />
  </svg>
)
const IconUser = () => (
  <svg {...ICON}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
)

export function NewDot({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="new-dot" aria-hidden>
      {n}
    </span>
  )
}

export function BottomNav() {
  const s = useStore()
  if (!CATALOG_ENABLED) return null
  const n = unseenOffers(s).length
  return (
    <nav className="bottomnav" aria-label="Navegação principal">
      <NavLink to="/" end className="bn-item">
        <IconHome />
        <span>{COPY.nav.home}</span>
      </NavLink>
      <NavLink to="/catalogo" className="bn-item bn-catalog" aria-label={n > 0 ? `${COPY.nav.library}, ${n} ${n === 1 ? 'novidade' : 'novidades'}` : COPY.nav.library}>
        <span className="bn-icon">
          <IconGift />
          <NewDot n={n} />
        </span>
        <span>{COPY.nav.library}</span>
      </NavLink>
      <NavLink to="/caminho" className="bn-item">
        <IconPath />
        <span>{COPY.nav.journey}</span>
      </NavLink>
      <NavLink to="/conta" className="bn-item">
        <IconUser />
        <span>{COPY.nav.account}</span>
      </NavLink>
    </nav>
  )
}

// imagem com a proporção natural do arquivo: nunca é esticada nem cortada
export function Picture({ img, className, lazy = true }: { img: Img; className?: string; lazy?: boolean }) {
  return <img className={`pic ${className ?? ''}`} src={img.src} alt={img.alt} width={img.w} height={img.h} loading={lazy ? 'lazy' : 'eager'} decoding="async" />
}

export function SupportButton() {
  return (
    <a className="support" href={supportUrl()} target="_blank" rel="noreferrer" aria-label="Falar com o suporte no WhatsApp">
      <span aria-hidden>💬</span> Ajuda
    </a>
  )
}

export function ProgressBar({ seen, total }: { seen: number; total: number }) {
  const pct = total ? Math.round((seen / total) * 100) : 0
  return (
    <div className="progress" role="group" aria-label={`${seen} de ${total} materiais vistos`}>
      <div className="progress-label">
        <strong>
          {seen} de {total} materiais vistos
        </strong>
        <span>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ---- ofertas adicionais (OFFERS): compra ADICIONAL, sempre marcada como tal. Imagem em cima, informação embaixo.

// Capa da oferta: o mockup real quando existe. Sem mockup, só em modo demonstração aparece um placeholder
// simples marcado "em breve" (fundo transparente, no formato dos mockups 3D). No app real, sem mockup, não aparece imagem.
const ICON_PATHS: Record<DeliverableIcon, string> = {
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zm3 13h11M8 8h7',
  cards: 'M4 8l8-4 8 4-8 4-8-4zm0 4l8 4 8-4M4 16l8 4 8-4',
  print: 'M7 9V4h10v5M7 18H5a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  sheet: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  menu: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2',
  video: 'M4 6h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4zM17 10l4-2v8l-4-2',
  art: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01',
  kit: 'M3 8h18v12H3zM3 8l3-4h12l3 4M10 12h4',
}

export function Icon({ icon, size = 16 }: { icon: DeliverableIcon; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[icon]} />
    </svg>
  )
}

// chip do formato da entrega (ícone funcional + rótulo curto)
export function DeliverableChip({ offer }: { offer: Offer }) {
  return (
    <span className="chip-deliv">
      <Icon icon={offer.deliverableIcon} />
      {offer.deliverableType}
    </span>
  )
}

export function OfferMedia({ offer, className = '' }: { offer: Offer; className?: string }) {
  const cover = catalogImage(offer) ?? offerCover(offer)
  const wide = offer.imageRatio === '4:3'
  if (cover) return <Picture img={cover} className={`${className}${wide ? ' pic-wide' : ''}`} />
  if (!PREVIEW) return null
  return (
    <span className={`cover-ph ${className}${wide ? ' cover-ph-wide' : ''}`} role="img" aria-label={`Mockup de ${offer.title}: ${offer.imageType} (placeholder, imagem em breve)`}>
      <span className="cover-ph-book">
        <span className="cover-ph-title">{offer.deliverableType}</span>
        <span className="cover-ph-soon">IMAGEM EM BREVE</span>
      </span>
    </span>
  )
}

// contexto do card: o que a pessoa acabou de fazer (ou, sem contexto, a frase de necessidade do material)
export function Context({ ctx }: { ctx: OfferContext }) {
  return (
    <p className={`ctx ctx-${ctx.kind}`}>
      {ctx.label && <span className="ctx-k">{ctx.label}</span>}
      <span className="ctx-t">{ctx.text}</span>
    </p>
  )
}

// sugestão de próximo passo (home e rodapé de uma página): imagem, contexto, nome, uma frase e o convite para ver o detalhe. Sem checkout aqui.
export function OfferBlock({ offer, from }: { offer: Offer; from: 'home-banner' | 'item-footer' }) {
  const s = useStore()
  const canDismiss = offer.kind !== 'seasonal'
  const copy = offerCopy(offer.id)
  return (
    <Section title={COPY.sections.forYou} id={`oferta-${from}`}>
      <article className="vcard upsell offer" aria-label={`Sugestão: ${offer.title}`}>
        <Link to={`/produto/${offer.id}`} className="vcard-media">
          <OfferMedia offer={offer} className="pic-v" />
        </Link>
        <div className="vcard-body">
          <h3 className="vcard-title">
            <Link to={`/produto/${offer.id}`}>{shortTitle(offer.id)}</Link>
          </h3>
          <Context ctx={contextOf(s, offer.id)} />
          <p className="vcard-promise">{copy.cardLine}</p>
          <Price offer={offer} soon={!buyUrl(offer.id)} />
          <Link className="btn btn-buy btn-block" to={`/produto/${offer.id}`} onClick={() => trackOffer('offer.click', offer.id, from)}>
            {COPY.button.card}
          </Link>
          {canDismiss && (
            <button className="btn btn-link btn-block btn-quiet" onClick={() => dismissOffer(offer.id, from)}>
              Agora não
            </button>
          )}
        </div>
      </article>
    </Section>
  )
}

// ---- peças da organização visual: seções com título grande, carrossel com scroll-snap, cards limpos

export function Section({ id, title, lead, children }: { id?: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="sec" id={id} aria-label={title}>
      <h2 className="sec-title">{title}</h2>
      {lead && <p className="sec-lead">{lead}</p>}
      {children}
    </section>
  )
}

// carrossel horizontal com scroll-snap suave (cada filho vira um "car-item")
export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="carousel" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  )
}

// preço em segundo plano na lista (pequeno, discreto); no detalhe ele aparece grande (big)
export function Price({ offer, soon, big = false }: { offer: Offer; soon?: boolean; big?: boolean }) {
  return (
    <p className={`v-price${big ? ' v-price-big' : ''}`}>
      <strong>{brl(offer.priceCents)}</strong>
      <span>{soon ? COPY.price.planned : COPY.price.once}</span>
    </p>
  )
}

// ação principal de uma oferta. Acessar (já é seu) e o convite ("Ver como ajuda" / "Quero isso") têm cor e rótulo diferentes.
//   já tem                       -> "Acessar" (verde escuro)
//   card (lista, home, coleção)  -> "Ver como ajuda": leva ao detalhe, nunca ao checkout
//   detalhe, ready + link        -> "Quero isso · preço" (verde vivo, abre o checkout direto)
//   detalhe, sem link            -> "Disponível em breve" + "Quero ser avisada"
export function OfferAction({ offer, from, variant = 'card' }: { offer: Offer; from: string; variant?: 'card' | 'detail' }) {
  const s = useStore()
  if (owns(s, offer.id))
    return (
      <Link className="btn btn-open btn-block" to={`/produto/${offer.id}`}>
        {COPY.button.open}
      </Link>
    )
  if (pendingFromBundles(s).has(offer.id)) return <p className="v-note">Incluído na sua compra. Entra automático quando sair.</p>
  const url = buyUrl(offer.id)
  if (variant === 'card')
    return (
      <>
        {!url && <p className="v-soon">{COPY.button.soon}</p>}
        <Link className="btn btn-buy btn-block" to={`/produto/${offer.id}`} onClick={() => trackOffer('offer.click', offer.id, from)}>
          {COPY.button.card}
        </Link>
      </>
    )
  if (url)
    return (
      <a className="btn btn-buy btn-block btn-want" href={url} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', offer.id, from)}>
        {COPY.button.detail} · {brl(offer.priceCents)}
      </a>
    )
  const asked = !!s.interested[offer.id]
  return (
    <>
      <p className="v-soon">{COPY.button.soon}</p>
      <button className={`btn btn-block ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackOffer('offer.interest', offer.id, from)}>
        {asked ? COPY.button.notified : COPY.button.notify}
      </button>
    </>
  )
}

// card de material: imagem grande, nome curto, contexto (ou necessidade), UMA frase, preço discreto e convite. Bullets, pilha de valor e bônus ficam na página da oferta.
export function OfferCard({ offer, hero = false, isNew = false, isNext = false, focus = false, from }: { offer: Offer; hero?: boolean; isNew?: boolean; isNext?: boolean; focus?: boolean; from: string }) {
  const s = useStore()
  const owned = owns(s, offer.id)
  return (
    <article id={`card-${offer.id}`} style={themeStyle(offer.id)} className={`vcard${hero ? ' vcard-hero' : ''}${focus ? ' vcard-focus' : ''}`} aria-label={offer.title}>
      <Link to={`/produto/${offer.id}`} className="vcard-media" aria-label={`Ver ${shortTitle(offer.id)}`}>
        <OfferMedia offer={offer} className="pic-v" />
        <span className="vflags">
          {offer.featured && <span className="flag flag-featured">★ Destaque</span>}
          {isNew && !owned && <span className="flag flag-new">Novo</span>}
          {isNext && !owned && <span className="flag flag-next">● {COPY.context.nextStep}</span>}
          {owned && <span className="flag flag-own">No seu acesso</span>}
        </span>
      </Link>
      <div className="vcard-body">
        <DeliverableChip offer={offer} />
        <h3 className="vcard-title">
          <Link to={`/produto/${offer.id}`}>{shortTitle(offer.id)}</Link>
        </h3>
        {!owned && <Context ctx={contextOf(s, offer.id)} />}
        <p className="vcard-promise">{owned ? offer.promise : offerCopy(offer.id).cardLine}</p>
        {!owned && <Price offer={offer} soon={!buyUrl(offer.id)} />}
        <OfferAction offer={offer} from={from} />
      </div>
    </article>
  )
}

// peça de carrossel (trilhas e coleções): imagem 2:3 grande, nome, estado
export function ProductTile({ to, media, title, state, tone = 'open', seen = false }: { to: string; media: ReactNode; title: string; state: string; tone?: 'open' | 'buy' | 'soon'; seen?: boolean }) {
  return (
    <Link to={to} className="tile">
      <span className="tile-media">
        {media}
        {seen && (
          <span className="jstep-mark jm-owned" role="img" aria-label="Visto">
            ✓
          </span>
        )}
      </span>
      <strong className="tile-title">{title}</strong>
      <span className={`tile-state tile-${tone}`}>{state}</span>
    </Link>
  )
}

// só aparece em modo demonstração: o cliente sempre tem o kit; alterna só as Fichas de Socorro e as ofertas
export function DemoBar() {
  const { demoBump, demoOffers, demoHave } = useStore()
  if (!PREVIEW) return null
  return (
    <div className="demobar" role="group" aria-label="Opções de teste (modo demonstração)">
      <span className="demobar-title">Modo demonstração · opções de teste</span>
      <div className="seg">
        <button className={demoBump ? 'seg-on' : ''} aria-pressed={demoBump} onClick={() => changeDemo({ bump: !demoBump })}>
          {demoBump ? 'Com Fichas' : 'Sem Fichas'}
        </button>
        <button className={demoOffers ? 'seg-on' : ''} aria-pressed={demoOffers} onClick={() => changeDemo({ offers: !demoOffers })}>
          {demoOffers ? 'Ofertas ligadas' : 'Ligar ofertas'}
        </button>
        <button className={demoHave > 0 ? 'seg-on' : ''} aria-label={`Itens que já comprei: ${demoHave}`} onClick={() => changeDemo({ have: demoHave === 0 ? 1 : demoHave === 1 ? 3 : 0 })}>
          {`Já comprei: ${demoHave}`}
        </button>
      </div>
    </div>
  )
}
