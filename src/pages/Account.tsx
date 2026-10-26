import { useNavigate } from 'react-router-dom'
import { CONFIG, PRODUCTS, brl } from '../data/config'
import { logout, resetDemo, useStore } from '../lib/store'
import { Layout } from '../components/ui'

const STATUS = { pending: 'Aguardando pagamento', paid: 'Pago', refunded: 'Estornado' }

export function Account() {
  const s = useStore()
  const navigate = useNavigate()

  return (
    <Layout title="Minha conta" back="/">
      <div className="card">
        <h2>Conta</h2>
        <p>{s.email}</p>
      </div>
      <div className="card">
        <h2>Minhas compras</h2>
        <ul className="orders">
          {s.orders.map((o) => (
            <li key={o.id}>
              <span>{PRODUCTS[o.product].name}</span>
              <span>{brl(PRODUCTS[o.product].price)}</span>
              <span className={`status status-${o.status}`}>{STATUS[o.status]}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        className="btn btn-secondary btn-block"
        onClick={() => {
          logout()
          navigate('/entrar')
        }}
      >
        Sair
      </button>

      {CONFIG.demo && (
        <div className="card demo">
          <h2>Demonstração</h2>
          <p className="hint">{s.events.length} eventos registrados neste aparelho.</p>
          <ul className="events">
            {s.events
              .slice(-8)
              .reverse()
              .map((e) => (
                <li key={e.at + e.name}>
                  {e.name}
                  {e.props ? ` · ${Object.values(e.props).join(' · ')}` : ''}
                </li>
              ))}
          </ul>
          <button
            className="btn btn-link btn-block"
            onClick={() => {
              resetDemo()
              navigate('/entrar')
            }}
          >
            Recomeçar do zero
          </button>
        </div>
      )}
    </Layout>
  )
}
