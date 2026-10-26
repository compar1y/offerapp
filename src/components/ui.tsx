import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONFIG, PRODUCTS, brl, type ProductId } from '../data/config'
import { OFFER } from '../data/content'
import { IMAGES, type ImageId } from '../data/images'
import { track, type OfferSource } from '../lib/store'

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
          <span className="brand-mark" aria-hidden>
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

// bloco de imagem: mostra a imagem quando existe, senão um espaço marcado com o que falta
export function Picture({ id, locked, className }: { id: ImageId; locked?: boolean; className?: string }) {
  const img = IMAGES[id]
  return (
    <div className={`picture ${className ?? ''}`} style={{ aspectRatio: img.ratio }}>
      {img.src ? (
        <img src={img.src} alt={img.label} loading="lazy" />
      ) : (
        <div className="picture-empty">
          <span aria-hidden>🖼</span>
          <strong>{img.label}</strong>
          <small>{id}</small>
        </div>
      )}
      {locked && (
        <span className="picture-lock" aria-label="Bloqueado">
          🔒
        </span>
      )}
    </div>
  )
}

export function SupportButton() {
  const href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.supportMessage)}`
  return (
    <a className="support" href={href} target="_blank" rel="noreferrer" onClick={() => track('suporte_clicado')}>
      Ajuda
    </a>
  )
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="progress" aria-label={`${done} de ${total} receitas feitas`}>
      <div className="progress-label">
        <strong>
          Você já fez {done} de {total} receitas
        </strong>
        <span>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {done === total && total > 0 && <p className="progress-note">Fornada completa! 🎉</p>}
    </div>
  )
}

export function OfferCta({
  product,
  source,
  text,
  compact,
}: {
  product: ProductId
  source: OfferSource
  text?: string
  compact?: boolean
}) {
  useEffect(() => {
    track('oferta_vista', { product, source })
  }, [product, source])
  const p = PRODUCTS[product]
  const copy = product === 'bump' ? OFFER.bump : product === 'downsell' ? OFFER.downsell : OFFER.upsell
  return (
    <Link to={`/oferta/${product}?de=${source}`} className={compact ? 'cta cta-compact' : 'cta'}>
      <Picture id={copy.image} className="cta-picture" />
      <span className="cta-kicker">Próximo passo</span>
      <span className="cta-text">{text ?? copy.headline}</span>
      <span className="cta-action">
        Conhecer o {p.name} · {brl(p.price)} ›
      </span>
    </Link>
  )
}
