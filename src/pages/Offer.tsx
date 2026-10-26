import { useEffect } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CONFIG, PRODUCTS, brl, type ProductId } from '../data/config'
import { OFFER } from '../data/content'
import {
  owns,
  ownsGuide,
  refuse,
  simulatePayment,
  startCheckout,
  track,
  useStore,
  type OfferSource,
} from '../lib/store'
import { Layout, Picture } from '../components/ui'

const OFFERABLE: ProductId[] = ['bump', 'upsell', 'downsell']
const MODULE_OF: Record<string, string> = { bump: 'bonus', upsell: 'guia', downsell: 'essencial' }

export function Offer() {
  const { product } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const s = useStore()
  const source = (params.get('de') ?? 'inicio') as OfferSource
  const id = product as ProductId

  useEffect(() => {
    if (OFFERABLE.includes(id)) track('oferta_aberta', { product: id, source })
  }, [id, source])

  if (!OFFERABLE.includes(id)) return <Navigate to="/" replace />
  const alreadyOwned = id === 'bump' ? owns(s, 'bump') : ownsGuide(s) === 'full' || (id === 'downsell' && ownsGuide(s))
  if (alreadyOwned) return <Navigate to={`/modulo/${MODULE_OF[id]}`} replace />

  const p = PRODUCTS[id]
  const copy = OFFER[id as 'bump' | 'upsell' | 'downsell']

  function buy() {
    const order = startCheckout(id, source)
    navigate(`/pagamento/${order.id}`)
  }

  function decline() {
    if (id === 'upsell' || id === 'downsell') refuse(id)
    navigate('/')
  }

  return (
    <Layout title="Oferta" back="/">
      <article className="offer">
        <Picture id={copy.image} className="hero" />
        <span className="offer-kicker">{id === 'downsell' ? 'Condição especial' : 'Para você que já é cliente'}</span>
        <h1>{copy.headline}</h1>
        <p className="lead">{copy.intro}</p>
        <div className="video-placeholder small" role="img" aria-label="Vídeo da oferta">
          <span>▶</span>
          <small>Vídeo curto da oferta</small>
        </div>
        <ul className="bullets">
          {copy.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <div className="price-box">
          <span className="price-name">{p.name}</span>
          <span className="price">{brl(p.price)}</span>
          <span className="price-note">Pagamento único no PIX ou cartão. Acesso liberado aqui no app.</span>
        </div>
        <button className="btn btn-primary btn-block" onClick={buy}>
          Quero o {p.name}
        </button>
        <button className="btn btn-link btn-block" onClick={decline}>
          Não, obrigada. Quero só o que já comprei.
        </button>
      </article>
    </Layout>
  )
}

export function Payment() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const s = useStore()
  const order = s.orders.find((o) => o.id === orderId)
  if (!order) return <Navigate to="/" replace />
  const p = PRODUCTS[order.product]

  if (order.status === 'paid') {
    return (
      <Layout title="Pagamento" back="/">
        <div className="card center">
          <Picture id="pagamento-ok" className="hero" />
          <h1>Pagamento confirmado!</h1>
          <p>
            O <strong>{p.name}</strong> já está liberado.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate(`/modulo/${MODULE_OF[order.product]}`)}>
            Abrir agora
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Pagamento" back="/">
      <div className="card center">
        <span className="spinner" aria-hidden />
        <h1>Aguardando pagamento</h1>
        <p>
          {p.name} · <strong>{brl(p.price)}</strong>
        </p>
        <p className="hint">
          Pode pagar o PIX no app do seu banco e voltar depois. Assim que o pagamento cair, o acesso aparece aqui sozinho,
          mesmo se você fechar esta tela.
        </p>
        {p.checkoutUrl ? (
          <a className="btn btn-secondary btn-block" href={p.checkoutUrl} target="_blank" rel="noreferrer">
            Abrir o pagamento de novo
          </a>
        ) : null}
        {CONFIG.demo && (
          <button className="btn btn-secondary btn-block" onClick={() => simulatePayment(order.id)}>
            Simular pagamento (demonstração)
          </button>
        )}
        <button className="btn btn-link btn-block" onClick={() => navigate('/')}>
          Voltar para o início
        </button>
      </div>
    </Layout>
  )
}
