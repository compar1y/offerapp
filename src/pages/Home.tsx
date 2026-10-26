import { Link } from 'react-router-dom'
import { PRODUCTS, brl } from '../data/config'
import { MODULES, RECIPES } from '../data/content'
import { guideOffer, owns, ownsGuide, pendingOrder, useStore } from '../lib/store'
import { Layout, OfferCta, Picture, Progress } from '../components/ui'

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
        <Picture id="inicio-hero" className="hero" />
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
        <div className="cards">
          {RECIPES.map((r) => (
            <Link key={r.id} to={`/receita/${r.id}`} className="card-link">
              <Picture id={r.image} />
              <span className="card-info">
                <span className="tile-body">
                  <strong>{r.title}</strong>
                  <small>
                    {r.time} · {r.yield}
                  </small>
                </span>
                <span className={s.done[r.id] ? 'check check-on' : 'check'} aria-label={s.done[r.id] ? 'Feita' : 'Não feita'}>
                  {s.done[r.id] ? '✓' : ''}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Seus materiais</h2>
        <div className="cards">
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
    <Link to={unlocked ? `/modulo/${m.id}` : lockTo!} className={unlocked ? 'card-link' : 'card-link card-locked'}>
      <Picture id={m.mockup} locked={!unlocked} />
      <span className="card-info">
        <span className="tile-body">
          <strong>{m.title}</strong>
          <small>{m.subtitle}</small>
        </span>
        {unlocked ? (
          <span className="pill pill-ok">Liberado</span>
        ) : (
          <span className="pill">Desbloquear · {brl(PRODUCTS[m.product].price)}</span>
        )}
      </span>
    </Link>
  )
}
