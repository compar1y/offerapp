import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONFIG, supportUrl } from '../data/config'
import type { Img } from '../data/images'
import { MOCKUPS, offerCover } from '../data/images'
import { OFFER_BY_ID, brl, type Item, type Offer, type OfferId } from '../../shared/catalog'
import { lockInfo } from '../lib/lock'
import { changeDemo, dismissOffer, trackOffer, useStore } from '../lib/store'

export function Layout({ title, back, children }: { title?: string; back?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="topbar">
        {back ? (
          <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(back)}>
            ‹
          </button>
        ) : (
          <span className="icon-btn brand-mark" aria-hidden>
            🎄
          </span>
        )}
        <span className="topbar-title">{title ?? CONFIG.brand}</span>
        <Link to="/conta" className="icon-btn" aria-label="Minha conta">
          ☰
        </Link>
      </header>
      <main className="content">{children}</main>
      <SupportButton />
    </div>
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
export function OfferMedia({ offer, className = '' }: { offer: Offer; className?: string }) {
  const cover = offerCover(offer)
  if (cover) return <Picture img={cover} className={className} />
  if (!CONFIG.demo) return null
  return (
    <span className={`cover-ph ${className}`} role="img" aria-label={`Capa de ${offer.title} (placeholder: mockup em breve)`}>
      <span className="cover-ph-book">
        <span className="cover-ph-title">{offer.title}</span>
        <span className="cover-ph-soon">EM BREVE</span>
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
  const { demoBump, demoOffers } = useStore()
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
      </div>
    </div>
  )
}
