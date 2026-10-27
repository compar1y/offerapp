import { ITEMS, ITEM_BY_ID } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { CONFIG, supportUrl } from '../data/config'
import { owns, progress, refreshSession, useStore, openFile } from '../lib/store'
import { DemoBar, Layout, OfferBlock, Picture, ProductCard, ProgressBar } from '../components/ui'
import { ownedOffers, visibleOffers } from '../lib/offers'
import { HomeOffers } from '../components/System'
import { DifficultyForm } from '../components/DifficultyForm'
import { WelcomeModal } from '../components/WelcomeModal'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export function Home() {
  const s = useStore()
  const { seen, total } = progress(s)
  const main = ITEM_BY_ID.main
  const bonuses = ITEMS.filter((i) => i.kind === 'bonus' && !i.extra)
  const extra = ITEMS.filter((i) => i.extra)
  const bump = ITEM_BY_ID.bump
  const hasMain = owns(s, 'main')
  const pending = !!s.session?.purchases.some((p) => p.status === 'pending')
  const [msg, setMsg] = useState('')

  // sem o kit ainda (webhook atrasado ou PIX pendente): confere sozinho a cada 8 s, por até ~3 min
  useEffect(() => {
    if (hasMain) return
    let n = 0
    const t = setInterval(() => {
      n += 1
      if (n > 22) clearInterval(t)
      else void refreshSession()
    }, 8000)
    return () => clearInterval(t)
  }, [hasMain])
  const banner = visibleOffers(s, 'home-banner')[0]
  const cards = visibleOffers(s, 'home-card')
  const mine = ownedOffers(s)

  async function openMain() {
    setMsg('')
    const r = await openFile(main.files[0].storageKey, false)
    if (!r.ok) setMsg(r.error ?? 'Não foi possível abrir.')
    else if (CONFIG.demo) setMsg('Modo demonstração: abriu um PDF de exemplo, não o produto.')
  }

  return (
    <Layout>
      <WelcomeModal />
      <DemoBar />

      <section className="block">
        <div className="block-info">
          <h1>Olá! Sua Fábrica de Panetones está aqui</h1>
          <p className="lead">
            Tudo para produzir em casa e ter seus panetones prontos para o Natal, para a família ou para vender. Siga as receitas, use os materiais e monte a sua meta.
          </p>
          {hasMain ? (
            <p className="kit-line">
              <strong>Seu kit completo está liberado</strong>
              <span>
                {total} {total === 1 ? 'material liberado' : 'materiais liberados'}
                {owns(s, 'bump') ? ', com as Fichas de Socorro' : ''}
              </span>
            </p>
          ) : (
            <p className="kit-line">
              <strong>{pending ? 'Aguardando a confirmação do pagamento' : 'Estamos liberando seu acesso, tente em instantes'}</strong>
              <span>{pending ? 'Assim que o banco confirmar, os materiais aparecem aqui.' : 'Esta tela confere sozinha. Se você já comprou e não aparecer, fale com o suporte.'}</span>
            </p>
          )}
          <ProgressBar seen={seen} total={total} />
        </div>
      </section>

      {hasMain && (
        <>
      <section className="block">
        <h2 className="section-title">Produto principal</h2>
        <div className="feature">
          <Picture img={MOCKUPS.main} className="pic-feature" lazy={false} />
          <div className="block-info">
            <span className="tag">{main.badge}</span>
            <h3>{main.title}</h3>
            <p className="lead">{main.subtitle}. Abra no celular e vá direto à receita que quiser.</p>
            {hasMain && (
              <div className="actions">
                <button className="btn btn-primary" onClick={openMain}>
                  Abrir PDF
                </button>
                <Link className="btn btn-secondary" to={`/produto/${main.id}`}>
                  Ver detalhes e baixar
                </Link>
              </div>
            )}
            {msg && <p className="demo-note" role="status">{msg}</p>}
          </div>
        </div>
      </section>

      <HomeOffers />

      <section className="block">
        <div className="block-info">
          <h2 className="section-title">Bônus do kit completo</h2>
          <p className="lead">
            Seus bônus estão liberados. Toque em um para abrir.
          </p>
        </div>
        <div className="grid">
          {bonuses.map((i) => (
            <ProductCard key={i.id} item={i} unlocked={owns(s, i.id)} seen={!!s.seen[i.id]} />
          ))}
        </div>
        {extra.map((i) => (
          <div className="grid grid-one" key={i.id}>
            <ProductCard item={i} unlocked={owns(s, i.id)} seen={!!s.seen[i.id]} />
          </div>
        ))}
      </section>

        </>
      )}

      <section className="block">
        <div className="block-info">
          <h2 className="section-title">Socorro do panetone</h2>
          <p className="lead">Se a massa não cresceu ou o panetone murchou, aqui você acha o que fazer.</p>
        </div>
        <div className="grid grid-one">
          <ProductCard item={bump} unlocked={owns(s, 'bump')} seen={!!s.seen.bump} />
        </div>
      </section>

      {mine.length > 0 && (
        <section className="block">
          <div className="block-info">
            <h2 className="section-title">Seus extras</h2>
          </div>
          <div className="grid grid-one">
            {mine.map((o) => (
              <ProductCard key={o.id} item={ITEM_BY_ID[o.id]} unlocked seen={!!s.seen[o.id]} />
            ))}
          </div>
        </section>
      )}

      {cards.length > 0 && (
        <section className="block">
          <div className="block-info">
            <h2 className="section-title">Materiais adicionais</h2>
          </div>
          <div className="grid grid-one">
            {cards.map((o) => (
              <ProductCard key={o.id} item={ITEM_BY_ID[o.id]} unlocked={false} seen={false} from="home-card" />
            ))}
          </div>
        </section>
      )}

      {banner && <OfferBlock offer={banner} from="home-banner" />}

      <section className="block">
        <div className="block-info">
          <h2 className="section-title">Qual sua maior dificuldade agora?</h2>
          <p className="lead">Conte para a gente. Isso ajuda a melhorar o app e os próximos materiais.</p>
          <DifficultyForm />
        </div>
      </section>

      <section className="block help">
        <div className="block-info">
          <h2 className="section-title">Precisa de ajuda?</h2>
          <p className="lead">Fale com o suporte pelo WhatsApp se algum material não abrir ou não aparecer.</p>
          <a className="btn btn-primary btn-block" href={supportUrl()} target="_blank" rel="noreferrer">
            Falar com o suporte
          </a>
        </div>
      </section>
    </Layout>
  )
}
