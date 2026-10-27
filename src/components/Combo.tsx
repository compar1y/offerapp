import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { COPY, brl, unlockPrice } from '../../shared/catalog'
import { owns, trackCombo, useStore } from '../lib/store'
import { comboView, pendingFromBundles, type ComboView } from '../lib/offers'
import { OfferMedia } from './ui'

const SLICES = 8
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Roleta: TODAS as fatias levam ao mesmo valor (o preço da biblioteca completa). O giro é só uma revelação animada.
function Wheel({ angle, spinning }: { angle: number; spinning: boolean }) {
  const r = 96
  const paths = Array.from({ length: SLICES }, (_, i) => {
    const a0 = ((i * 360) / SLICES - 90) * (Math.PI / 180)
    const a1 = (((i + 1) * 360) / SLICES - 90) * (Math.PI / 180)
    const am = (a0 + a1) / 2
    return {
      d: `M100 100 L${100 + r * Math.cos(a0)} ${100 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${100 + r * Math.cos(a1)} ${100 + r * Math.sin(a1)} Z`,
      fill: i % 2 ? '#f7e2b0' : '#7a1f2b',
      ink: i % 2 ? '#4d1019' : '#f7e2b0',
      tx: 100 + 62 * Math.cos(am),
      ty: 100 + 62 * Math.sin(am),
      rot: (am * 180) / Math.PI,
    }
  })
  return (
    <div className="wheel-wrap">
      <span className="wheel-pointer" aria-hidden />
      <svg className="wheel" viewBox="0 0 200 200" role="img" aria-label="Roleta com 8 fatias. Todas levam ao mesmo valor: o preço da biblioteca completa." style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.4s cubic-bezier(0.17, 0.67, 0.2, 1)' : 'none' }}>
        {paths.map((p, i) => (
          <g key={i}>
            <path d={p.d} fill={p.fill} stroke="#4d1019" strokeWidth="1.5" />
            <text x={p.tx} y={p.ty} fill={p.ink} fontSize="11" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${p.rot} ${p.tx} ${p.ty})`}>
              TUDO
            </text>
          </g>
        ))}
        <circle cx="100" cy="100" r="13" fill="#fff" stroke="#4d1019" strokeWidth="3" />
      </svg>
    </div>
  )
}

function ComboCard({ v, from }: { v: ComboView; from: string }) {
  const s = useStore()
  const hasPrice = v.priceCents !== null && v.priceCents > 0
  return (
    <div className="combo-card">
      <div className="combo-mocks" aria-hidden>
        {v.items.slice(0, 5).map((o) => (
          <div className="combo-mock" key={o.id}>
            <OfferMedia offer={o} className="pic-combo" />
          </div>
        ))}
      </div>
      <p className="combo-count" role="status">
        <strong>{v.total} materiais</strong>
        <span>
          {v.ready === v.total ? 'todos disponíveis' : `${v.ready} de ${v.total} já disponíveis`}
        </span>
      </p>
      {hasPrice ? (
        <p className="combo-price">
          <strong>{brl(v.priceCents ?? 0)}</strong>
          <span className="combo-price-note">{v.demoPrice ? COPY.price.planned : COPY.price.once}</span>
          {v.installments && <span className="combo-price-note">ou 12x no cartão (a parcela aparece no checkout)</span>}
        </p>
      ) : null}
      {v.buyable && v.checkoutUrl ? (
        <a className="btn btn-buy btn-block btn-pulse" href={v.checkoutUrl} target="_blank" rel="noreferrer" onClick={() => trackCombo('combo.click', from)}>
          {COPY.button.unlockAll(unlockPrice(v.priceCents ?? 0))}
        </a>
      ) : (
        <>
          <button className="btn btn-block btn-soon" disabled>
            {COPY.button.soon}
          </button>
          <button className={`btn btn-block ${s.comboInterest ? 'btn-done' : 'btn-secondary'}`} disabled={s.comboInterest} onClick={() => trackCombo('combo.interest', from)}>
            {s.comboInterest ? COPY.button.notified : COPY.button.notify}
          </button>
        </>
      )}
      <details className="v-details">
        <summary>{COPY.combo.detailsOpen(v.total)}</summary>
        {hasPrice && v.strike && (
          <p className="v-sum">
            {COPY.price.sum}:{' '}
            <s className="combo-sum" aria-label={`Valor somado dos itens: ${brl(v.sumCents)}`}>
              {brl(v.sumCents)}
            </s>
          </p>
        )}
        <ul className="combo-list">
          {v.items.map((o) => (
            <li key={o.id}>
              <span className="combo-li-title">
                {o.title}
                {!owns(s, o.id) && !v.readyIds.has(o.id) && <em className="soon-note">{pendingFromBundles(s).has(o.id) ? 'já é seu: entra automático quando sair' : 'entra automático quando sair'}</em>}
              </span>
              <span>{owns(s, o.id) ? 'você já tem' : brl(o.priceCents)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

// Seção "Biblioteca completa": roleta (antes do giro) e card do combo (depois do giro). Sem preço definido, mostra direto o card.
export function ComboSection() {
  const s = useStore()
  const v = comboView(s)
  const hasPrice = !!v && v.priceCents !== null && v.priceCents > 0
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>(() => (s.comboSpun || !hasPrice ? 'done' : 'idle'))
  const [angle, setAngle] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const seen = useRef(false)
  const visible = !!v
  useEffect(() => {
    if (visible && !seen.current) {
      seen.current = true
      trackCombo('combo.view', 'catalog')
    }
  }, [visible])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  if (!v) return null
  function spin() {
    trackCombo('combo.spin', 'catalog')
    if (reduced()) {
      setPhase('done')
      return
    }
    // o ângulo é só enfeite: qualquer fatia leva ao mesmo preço
    setAngle(360 * 5 + Math.floor(Math.random() * 360))
    setPhase('spinning')
    timer.current = window.setTimeout(() => setPhase('done'), 3500)
  }
  return (
    <section id="leve-tudo" className="sec combo" aria-label={v.title}>
      <h2 className="sec-title">{v.title}</h2>
      <p className="sec-lead">{COPY.combo.need}</p>
      {phase !== 'done' ? (
        <div className="combo-card combo-spin">
          <Wheel angle={angle} spinning={phase === 'spinning'} />
          <button className="btn btn-open btn-block" onClick={spin} disabled={phase === 'spinning'}>
            {phase === 'spinning' ? 'Girando...' : COPY.combo.spin}
          </button>
          <p className="combo-fine">{COPY.combo.wheelNote}</p>
        </div>
      ) : (
        <ComboCard v={v} from="catalog" />
      )}
    </section>
  )
}

// Chamada da home para a biblioteca completa
export function ComboBanner() {
  const s = useStore()
  const v = comboView(s)
  if (!v) return null
  return (
    <section className="sec" aria-label={v.title}>
      <h2 className="sec-title">{v.title}</h2>
      <Link to="/catalogo#leve-tudo" className="combo-banner" onClick={() => trackCombo('combo.click', 'home-banner')}>
        <span className="combo-banner-text">{COPY.combo.short}</span>
        <span className="btn btn-open">{COPY.button.comboSee}</span>
      </Link>
    </section>
  )
}

// A biblioteca completa em destaque principal só depois de 3 ou mais itens liberados. Antes disso fica acessível, em tamanho menor.
export function ComboSlot({ prominent }: { prominent: boolean }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const v = comboView(s)
  if (!v) return null
  if (prominent || open) return <ComboSection />
  return (
    <section id="leve-tudo" className="sec" aria-label={v.title}>
      <h2 className="sec-title">{v.title}</h2>
      <div className="combo-compact">
        <span>{COPY.combo.short}</span>
        <button className="btn btn-secondary btn-block" onClick={() => setOpen(true)}>
          {COPY.button.comboSee}
        </button>
      </div>
    </section>
  )
}
