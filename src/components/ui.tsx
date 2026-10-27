import { type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CATALOG_ENABLED, CONFIG, supportUrl } from '../data/config'
import type { Img } from '../data/images'
import { MOCKUPS, catalogImage, offerCover } from '../data/images'
import { OFFER_BY_ID, brl, type DeliverableIcon, type Item, type Offer, type OfferId } from '../../shared/catalog'
import { lockInfo } from '../lib/lock'
import { unseenOffers } from '../lib/offers'
import { changeDemo, dismissOffer, trackOffer, useStore } from '../lib/store'

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

// ---- navegação fixa (só com o catálogo ligado). O item "Catálogo" leva a bolinha vermelha com o número de ofertas novas não vistas.
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
        <span>Início</span>
      </NavLink>
      <NavLink to="/catalogo" className="bn-item bn-catalog" aria-label={n > 0 ? `Catálogo de ofertas, ${n} ${n === 1 ? 'nova' : 'novas'}` : 'Catálogo de ofertas'}>
        <span className="bn-icon">
          <IconGift />
          <NewDot n={n} />
        </span>
        <span>Ofertas</span>
      </NavLink>
      <NavLink to="/caminho" className="bn-item">
        <IconPath />
        <span>Caminho</span>
      </NavLink>
      <NavLink to="/conta" className="bn-item">
        <IconUser />
        <span>Conta</span>
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

// cartão de produto: imagem (mockup) em cima, informação embaixo.
// Comprado (já no seu kit) x adicional (bloqueado, com cadeado) são visualmente diferentes.
export function ProductCard({ item, unlocked, seen, from }: { item: Item; unlocked: boolean; seen: boolean; from?: string }) {
  const offer = item.kind === 'offer' ? OFFER_BY_ID[item.id as OfferId] : null
  const mock = offer ? null : MOCKUPS[item.id as keyof typeof MOCKUPS]
  return (
    <Link
      to={`/produto/${item.id}`}
      className={`pcard ${unlocked ? 'pcard-own' : 'pcard-locked'} ${item.extra ? 'pcard-extra' : ''}`}
      onClick={() => offer && !unlocked && trackOffer('offer.click', offer.id, from ?? 'home-card')}
    >
      <span className="pcard-state">{unlocked ? '✓ No seu kit' : '🔒 Adicional'}</span>
      <span className="pcard-media">
        {mock && <Picture img={mock} />}
        {offer && <OfferMedia offer={offer} className="pic-card" />}
        {!unlocked && (
          <span className="lock-badge" aria-label="Bloqueado">
            🔒
          </span>
        )}
      </span>
      <span className="pcard-body">
        <span className="tag">{item.badge}</span>
        <strong className="pcard-title">{item.title}</strong>
        {unlocked ? (
          <span className={seen ? 'pill pill-ok' : 'pill pill-open'}>{seen ? 'Visto ✓' : 'Acessar'}</span>
        ) : (
          <span className="pill pill-lock">{offer ? `Ver detalhes · ${brl(offer.priceCents)}` : lockInfo().label}</span>
        )}
      </span>
    </Link>
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
  if (!CONFIG.demo) return null
  return (
    <span className={`cover-ph ${className}${wide ? ' cover-ph-wide' : ''}`} role="img" aria-label={`Mockup de ${offer.title}: ${offer.imageType} (placeholder, imagem em breve)`}>
      <span className="cover-ph-book">
        <span className="cover-ph-title">{offer.deliverableType}</span>
        <span className="cover-ph-soon">IMAGEM EM BREVE</span>
      </span>
    </span>
  )
}

function offerHref(o: Offer): string {
  return o.checkoutUrl || supportUrl(`Oi! Quero comprar o ${o.title} (${brl(o.priceCents)}).`)
}

const OFFER_TAG: Record<Offer['kind'], string> = {
  upsell: 'COMPRA ADICIONAL · NÃO ESTÁ NO SEU KIT',
  downsell: 'COMPRA ADICIONAL · NÃO ESTÁ NO SEU KIT',
  seasonal: 'COMPRA ADICIONAL · SAZONAL',
}

// bloco de venda (banner da home e rodapé de uma página). `from` identifica de onde veio o clique nos eventos.
export function OfferBlock({ offer, from }: { offer: Offer; from: 'home-banner' | 'item-footer' }) {
  const canDismiss = offer.kind !== 'seasonal'
  return (
    <section className="block block-info" aria-label={`Oferta: ${offer.title}`}>
      <div className="upsell offer">
        <div className="offer-media">
          <OfferMedia offer={offer} className="pic-offer" />
        </div>
        <div className="offer-info">
          <span className="tag tag-buy">{OFFER_TAG[offer.kind]}</span>
          <h3>{offer.title}</h3>
          <p className="lead">{offer.description}</p>
          {offer.includes.length > 0 && (
            <ul className="bullets">
              {offer.includes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <p className="price-line">
            Preço: <strong>{brl(offer.priceCents)}</strong>, pagamento único no checkout da Wiapy.
          </p>
          <a className="btn btn-buy btn-block" href={offerHref(offer)} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', offer.id, from)}>
            🛒 Comprar por {brl(offer.priceCents)}
          </a>
          <Link className="btn btn-link btn-block" to={`/produto/${offer.id}`}>
            Ver o que é antes de decidir
          </Link>
          {canDismiss && (
            <button className="btn btn-link btn-block btn-quiet" onClick={() => dismissOffer(offer.id, from)}>
              Agora não
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// só aparece em modo demonstração: o cliente sempre tem o kit; alterna só as Fichas de Socorro e as ofertas
export function DemoBar() {
  const { demoBump, demoOffers, demoHave } = useStore()
  if (!CONFIG.demo) return null
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
