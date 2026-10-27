import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GAME_TEXT } from '../../shared/game'
import { gameConfig, gameErase, useGame } from '../lib/game'
import { Honest } from '../components/Game'
import { PREVIEW } from '../data/config'
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
  const g = useGame()
  const [sure, setSure] = useState(false)
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
      <div className="card" aria-label="Minha fornada: configurações">
        <h2>Minha fornada</h2>
        <ul className="switches">
          <li>
            <span>
              <strong>Modo sem pressão</strong>
              <small>Esconde pontos, níveis e sequência. Seus selos, o Livro de Fornadas e as encomendas continuam.</small>
            </span>
            <button role="switch" aria-checked={g.semPressao} aria-label="Modo sem pressão" className={`sw${g.semPressao ? ' sw-on' : ''}`} onClick={() => gameConfig({ semPressao: !g.semPressao })} />
          </li>
          <li>
            <span>
              <strong>Mostrar sequência de dias</strong>
              <small>Com um dia de descanso por semana. Desligue se não gostar.</small>
            </span>
            <button role="switch" aria-checked={g.config.sequencia} aria-label="Mostrar sequência de dias" className={`sw${g.config.sequencia ? ' sw-on' : ''}`} onClick={() => gameConfig({ sequencia: !g.config.sequencia })} />
          </li>
          <li>
            <span>
              <strong>Jogo ligado</strong>
              <small>Desligado, o app esconde a Minha fornada da tela inicial.</small>
            </span>
            <button role="switch" aria-checked={g.config.gamificacao} aria-label="Jogo ligado" className={`sw${g.config.gamificacao ? ' sw-on' : ''}`} onClick={() => gameConfig({ gamificacao: !g.config.gamificacao })} />
          </li>
        </ul>
        <p className="hint">
          <Link to="/fornada">Abrir minha fornada</Link>
        </p>
        <Honest text={GAME_TEXT.privacidade} />
        {sure ? (
          <div role="alertdialog" aria-label="Confirmar apagar dados de jogo" className="confirm">
            <p>Isso apaga pontos, selos, anotações, fotos e encomendas deste aparelho. Seus materiais comprados não mudam.</p>
            <div className="two">
              <button
                className="btn btn-open"
                onClick={async () => {
                  await gameErase()
                  setSure(false)
                }}
              >
                Sim, apagar
              </button>
              <button className="btn btn-secondary" onClick={() => setSure(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary btn-block" onClick={() => setSure(true)}>
            Apagar meus dados de jogo
          </button>
        )}
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
      {PREVIEW && <p className="hint center">Modo demonstração: nada aqui é cobrança real.</p>}
    </Layout>
  )
}
