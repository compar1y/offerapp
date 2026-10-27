import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { brl } from '../../shared/catalog'
import { owns, trackCombo, useStore } from '../lib/store'
import { comboView, type ComboView } from '../lib/offers'
import { OfferMedia } from './ui'

const SLICES = 8
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Roleta: TODAS as fatias levam ao mesmo desconto real (o preço do combo). O giro é só uma revelação animada.
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
      <svg className="wheel" viewBox="0 0 200 200" role="img" aria-label="Roleta com 8 fatias. Todas valem o mesmo desconto: o preço do combo." style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.4s cubic-bezier(0.17, 0.67, 0.2, 1)' : 'none' }}>
        {paths.map((p, i) => (
          <g key={i}>
            <path d={p.d} fill={p.fill} stroke="#4d1019" strokeWidth="1.5" />
            <text x={p.tx} y={p.ty} fill={p.ink} fontSize="11" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${p.rot} ${p.tx} ${p.ty})`}>
              COMBO
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
  return (
    <div className="combo-card">
      <div className="combo-mocks">
        {v.items.slice(0, 5).map((o) => (
          <div className="combo-mock" key={o.id}>
            <OfferMedia offer={o} className="pic-combo" />
          </div>
        ))}
        {v.items.length > 5 && <span className="combo-more">+{v.items.length - 5}</span>}
      </div>
      <ul className="combo-list">
        {v.items.map((o) => (
          <li key={o.id}>
            {o.title} <span>{owns(s, o.id) ? 'você já tem' : brl(o.priceCents)}</span>
          </li>
        ))}
      </ul>
      {v.priceCents !== null && v.priceCents > 0 ? (
        <p className="combo-price">
          {v.strike && (
            <s className="combo-sum" aria-label={`Soma dos preços individuais: ${brl(v.sumCents)}`}>
              {brl(v.sumCents)}
            </s>
          )}
          <strong>{brl(v.priceCents)}</strong>
          <span className="combo-price-note">{v.demoPrice ? 'preço de demonstração, não é o valor real' : 'pagamento único'}</span>
        </p>
      ) : (
        <p className="combo-price">
          <span className="combo-price-note">Preço ainda não definido.</span>
        </p>
      )}
      {v.buyable ? (
        <a className="btn btn-primary btn-block" href={v.checkoutUrl} target="_blank" rel="noreferrer" onClick={() => trackCombo('combo.click', from)}>
          Quero levar tudo
        </a>
      ) : (
        <>
          <span className="flag flag-soon combo-soon">Em breve</span>
          <button className={`btn btn-block ${s.comboInterest ? 'btn-done' : 'btn-secondary'}`} disabled={s.comboInterest} onClick={() => trackCombo('combo.interest', from)}>
            {s.comboInterest ? 'Anotado ✓ Em breve' : 'Quero ser avisada'}
          </button>
        </>
      )}
    </div>
  )
}

// Seção do catálogo: roleta (antes do giro) e card do combo (depois do giro). Sem preço definido, mostra direto o card "Em breve".
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
    <section className="combo" aria-label="Super oferta Leve tudo">
      <span className="combo-eyebrow">SUPER OFERTA</span>
      <h2 className="combo-title">{v.title}</h2>
      <p className="combo-sub">Todos os materiais do catálogo juntos, por um preço único.</p>
      {phase !== 'done' ? (
        <>
          <Wheel angle={angle} spinning={phase === 'spinning'} />
          <button className="btn btn-spin" onClick={spin} disabled={phase === 'spinning'}>
            {phase === 'spinning' ? 'Girando...' : 'Girar a roleta'}
          </button>
          <p className="combo-fine">Todas as fatias valem o mesmo desconto: o preço do combo.</p>
        </>
      ) : (
        <>
          {hasPrice && <p className="combo-result">Todas as fatias valem o mesmo desconto: o preço do combo.</p>}
          <ComboCard v={v} from="catalog" />
        </>
      )}
    </section>
  )
}

// Card chamativo da home
export function ComboBanner() {
  const s = useStore()
  const v = comboView(s)
  if (!v) return null
  const hasPrice = v.priceCents !== null && v.priceCents > 0
  return (
    <section className="block">
      <Link to="/catalogo" className="combo-banner" onClick={() => trackCombo('combo.click', 'home-banner')}>
        <span className="combo-eyebrow">SUPER OFERTA</span>
        <strong className="combo-banner-title">{v.title}</strong>
        <span className="combo-banner-text">Todos os materiais do catálogo juntos, por um preço único.{hasPrice ? ' Gire a roleta e veja.' : ' Em breve.'}</span>
        <span className="btn btn-spin">{hasPrice && !s.comboSpun ? 'Girar a roleta' : 'Ver o Leve tudo'}</span>
      </Link>
    </section>
  )
}

// "Leve tudo" em destaque principal só depois de 3 ou mais itens liberados. Antes disso fica acessível, em tamanho menor.
export function ComboSlot({ prominent }: { prominent: boolean }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  if (!comboView(s)) return null
  if (prominent || open) return <ComboSection />
  return (
    <section className="combo-compact" aria-label="Leve tudo">
      <div>
        <strong>Leve tudo</strong>
        <span>Todos os materiais do catálogo num preço único.</span>
      </div>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        Ver o Leve tudo
      </button>
    </section>
  )
}
