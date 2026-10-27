// Card da Conta da Fornada (ferramenta paga, R$ 19,90): primeira da lista de ofertas.
// Segue o OfferCard: imagem, 🔒, nome, necessidade, botão pulsante "Desbloquear por R$ 19,90" e o link "Fazer 1 conta grátis".
import { Link } from 'react-router-dom'
import { COPY, OFFER_BY_ID, offerCopy, shortTitle } from '../../shared/catalog'
import { BASE, BuyButton } from '../calc/ui'
import { useCalc } from '../calc/store'
import { CALC_ENABLED } from '../data/config'
import { contextOf } from '../lib/context'
import { owns, useStore } from '../lib/store'
import { themeStyle } from '../lib/theme'
import { Context, LockMark, OfferMedia } from './ui'

const TOOL = OFFER_BY_ID.calculadora

export function ToolCard({ from }: { from: string }) {
  const s = useStore()
  const calc = useCalc()
  if (!CALC_ENABLED) return null
  const owned = owns(s, 'calculadora')
  const t = s.session?.tools?.calculadora
  const alvo = calc.doc.contas.find((c) => c.id === calc.doc.rodadaContaId) ?? calc.doc.contas[0]
  return (
    <article id="card-calculadora" style={themeStyle('calculadora')} className="vcard" aria-label={TOOL.title}>
      <Link to={BASE} className="vcard-media" aria-label={`Abrir ${shortTitle('calculadora')}`}>
        <OfferMedia offer={TOOL} className="pic-v" />
        {!owned && <LockMark />}
        {owned && (
          <span className="vflags">
            <span className="flag flag-own">No seu acesso</span>
          </span>
        )}
      </Link>
      <div className="vcard-body">
        <h3 className="vcard-title">
          <Link to={BASE}>{shortTitle('calculadora')}</Link>
        </h3>
        {!owned && <Context ctx={contextOf(s, 'calculadora')} />}
        <p className="vcard-promise">{offerCopy('calculadora').cardLine}</p>
        {owned ? (
          <Link className="btn btn-open btn-block" to={BASE}>
            {COPY.button.open}
          </Link>
        ) : (
          <>
            <BuyButton from={from} />
            {!(t?.roundUsed && !alvo) && (
              <Link className="btn btn-link btn-block" to={alvo ? `${BASE}/conta/${alvo.id}${alvo.estado === 'rascunho' ? '/1' : ''}` : `${BASE}/nova`}>
                {alvo ? 'Continuar minha conta' : 'Fazer 1 conta grátis'}
              </Link>
            )}
          </>
        )}
      </div>
    </article>
  )
}

// entrada contextual (depois de "Fiz essa", no Bônus 07): convite curto, sem pulsar, sem insistir
export function ToolEntry({ where }: { where: 'item-done' | 'bonus-07' }) {
  const s = useStore()
  if (!CALC_ENABLED) return null
  const owned = owns(s, 'calculadora')
  return (
    <section className="game-card" aria-label="Conta da Fornada" data-from={where}>
      <h3>Quanto custou essa fornada?</h3>
      <p>
        {owned
          ? 'Abra a Conta da Fornada e faça a conta com os preços que você paga.'
          : 'Faça 1 conta de graça com os preços que você paga e veja quanto sobra de cada unidade.'}
      </p>
      <Link className="btn btn-open btn-block" to={owned ? BASE : `${BASE}/nova`}>
        {owned ? 'Abrir a Conta da Fornada' : 'Fazer 1 conta grátis'}
      </Link>
    </section>
  )
}

export const SealLink = () => {
  const s = useStore()
  if (!CALC_ENABLED) return null
  return (
    <Link className="btn btn-link" to={owns(s, 'calculadora') ? BASE : `${BASE}/nova`}>
      Fazer agora
    </Link>
  )
}
