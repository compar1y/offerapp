import { Link } from 'react-router-dom'
import { PRODUCTS, brl } from '../data/config'
import { MODULES, RECIPES } from '../data/content'
import { guideOffer, owns, ownsGuide, pendingOrder, useStore } from '../lib/store'
import { Layout, OfferCta, Progress } from '../components/ui'

export function Home() {
  const s = useStore()
  const done = RECIPES.filter((r) => s.done[r.id]).length
  const offer = guideOffer(s)
  const guide = ownsGuide(s)
  const hasBump = owns(s, 'bump')
  const waiting = s.orders.filter((o) => o.status === 'pending')

  return (
    <Layout>
      <section className="hello">
        <h1>Olá! O que vamos assar hoje?</h1>
        <Progress done={done} total={RECIPES.length} />
      </section>

      {waiting.map((o) => (
        <Link key={o.id} to={`/pagamento/${o.id}`} className="notice">
          Pagamento do {PRODUCTS[o.product].name} aguardando. Toque para ver.
        </Link>
      ))}

      <section>
        <h2 className="section-title">Receitas</h2>
        <div className="list">
          {RECIPES.map((r) => (
            <Link key={r.id} to={`/receita/${r.id}`} className="tile">
              <span className={s.done[r.id] ? 'check check-on' : 'check'} aria-hidden>
                {s.done[r.id] ? '✓' : ''}
              </span>
              <span className="tile-body">
                <strong>{r.title}</strong>
                <small>
                  {r.time} · {r.yield}
                </small>
              </span>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Seus materiais</h2>
        <div className="list">
          <ModuleTile id="bonus" unlocked={hasBump} lockTo="/oferta/bump?de=cadeado" />
          {guide === 'essential' ? (
            <ModuleTile id="essencial" unlocked />
          ) : (
            <ModuleTile id="guia" unlocked={guide === 'full'} lockTo={`/oferta/${offer ?? 'upsell'}?de=cadeado`} />
          )}
        </div>
      </section>

      {offer && <OfferCta product={offer} source="banner" />}
      {!hasBump && !pendingOrder(s, 'bump') && (
        <OfferCta
          product="bump"
          source="banner"
          compact
          text={`Ainda não tem o Bônus da Fornada? Leve por ${brl(PRODUCTS.bump.price)}.`}
        />
      )}
    </Layout>
  )
}

function ModuleTile({ id, unlocked, lockTo }: { id: string; unlocked: boolean; lockTo?: string }) {
  const m = MODULES.find((x) => x.id === id)!
  return (
    <Link to={unlocked ? `/modulo/${m.id}` : lockTo!} className={unlocked ? 'tile' : 'tile tile-locked'}>
      <span className="lock" aria-hidden>
        {unlocked ? '📖' : '🔒'}
      </span>
      <span className="tile-body">
        <strong>{m.title}</strong>
        <small>{unlocked ? m.subtitle : `${m.subtitle} · ${brl(PRODUCTS[m.product].price)}`}</small>
      </span>
      <span className="chev">›</span>
    </Link>
  )
}
