import { useNavigate } from 'react-router-dom'
import { CONFIG } from '../data/config'
import { PLANS, brl, BUMP, OFFER_BY_ID, type PurchaseStatus } from '../../shared/catalog'
import { logout, useStore } from '../lib/store'
import { DemoBar, Layout } from '../components/ui'

const STATUS: Record<PurchaseStatus, string> = {
  paid: 'Pago, acesso liberado',
  pending: 'Aguardando pagamento',
  refunded: 'Reembolsado, acesso encerrado',
  chargeback: 'Contestado, acesso encerrado',
  declined: 'Pagamento recusado',
}

export function Account() {
  const s = useStore()
  const navigate = useNavigate()
  const purchases = s.session?.purchases ?? []
  return (
    <Layout title="Minha conta" back="/">
      <DemoBar />
      <div className="card">
        <h2>Conta</h2>
        <p className="break">{s.session?.email}</p>
      </div>
      <div className="card">
        <h2>Meu acesso</h2>
        <ul className="orders">
          {purchases.map((p) => (
            <li key={p.orderId}>
              <span>
                {p.plan ? PLANS[p.plan].name : p.offers?.length ? p.offers.map((o) => OFFER_BY_ID[o].title).join(', ') : 'Fichas de Socorro'}
                <small>{p.plan ? brl(PLANS[p.plan].priceCents) : p.offers?.length ? brl(p.offers.reduce((t, o) => t + OFFER_BY_ID[o].priceCents, 0)) : brl(BUMP.priceCents)}</small>
              </span>
              <span className={`status status-${p.status}`}>{STATUS[p.status]}</span>
            </li>
          ))}
          {purchases.length === 0 && <li>Nenhuma compra encontrada para este e-mail.</li>}
        </ul>
        {purchases.some((p) => p.status === 'pending') && (
          <p className="hint">Pagamento por PIX gerado mas ainda não confirmado: o acesso é liberado quando o banco confirmar.</p>
        )}
        <p className="hint">Comprou com outro e-mail? Fale com o suporte pelo botão Ajuda.</p>
      </div>
      <button
        className="btn btn-secondary btn-block"
        onClick={async () => {
          await logout()
          navigate('/entrar')
        }}
      >
        Sair
      </button>
      {CONFIG.demo && <p className="hint center">Modo demonstração: nada aqui é cobrança real.</p>}
    </Layout>
  )
}
