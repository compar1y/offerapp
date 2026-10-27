import { COPY, ITEMS, ITEM_BY_ID, OFFER_BY_ID, type Item } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { PREVIEW, supportUrl } from '../data/config'
import { owns, progress, refreshSession, useStore, openFile } from '../lib/store'
import { Carousel, DemoBar, Layout, OfferBlock, OfferCard, OfferMedia, Picture, ProductTile, ProgressBar, Section } from '../components/ui'
import { BumpCard } from './Catalog'
import { ownedOffers, visibleOffers } from '../lib/offers'
import { HomeOffers } from '../components/System'
import { DifficultyForm } from '../components/DifficultyForm'
import { WelcomeModal } from '../components/WelcomeModal'
import { useEffect, useState } from 'react'
import { GameEntry, WelcomeBack } from '../components/Game'
import { useGame } from '../lib/game'

export function Home() {
  const s = useStore()
  const game = useGame()
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
    else if (PREVIEW) setMsg('Modo demonstração: abriu um PDF de exemplo, não o produto.')
  }

  const mineItems: Item[] = [main, ...bonuses, ...extra, ...(owns(s, 'bump') ? [bump] : []), ...mine.map((o) => ITEM_BY_ID[o.id])]
  const media = (i: Item) => (i.kind === 'offer' ? <OfferMedia offer={OFFER_BY_ID[i.id as keyof typeof OFFER_BY_ID]} className="pic-tile" /> : <Picture img={MOCKUPS[i.id as keyof typeof MOCKUPS]} className="pic-tile" lazy={i.id !== 'main'} />)

  const favItems = mineItems.filter((i) => game.fav.includes(i.id))

  return (
    <Layout>
      <WelcomeModal />
      <DemoBar />

      <header className="screen-head">
        <h1>Olá! Sua Fábrica de Panetones está aqui</h1>
        {hasMain ? (
          <>
            <p className="lead">
              Seu kit está liberado: {total} {total === 1 ? 'material' : 'materiais'}
              {owns(s, 'bump') ? ', com as Fichas de Socorro' : ''}.
            </p>
            <ProgressBar seen={seen} total={total} />
            <button className="btn btn-open btn-block" onClick={openMain}>
              Abrir o livro de receitas
            </button>
            {msg && (
              <p className="demo-note" role="status">
                {msg}
              </p>
            )}
          </>
        ) : (
          <p className="kit-line">
            <strong>{pending ? 'Aguardando a confirmação do pagamento' : 'Estamos liberando seu acesso'}</strong>
            <span>{pending ? 'Assim que o banco confirmar, os materiais aparecem aqui.' : 'Esta tela confere sozinha. Se você já comprou e não aparecer, fale com o suporte.'}</span>
          </p>
        )}
      </header>

      {hasMain && <WelcomeBack />}
      {hasMain && <GameEntry />}

      {hasMain && (
        <Section title="Meus produtos">
          <Carousel label="Meus produtos">
            {mineItems.map((i) => (
              <div className="car-item car-tile" key={i.id}>
                <ProductTile to={`/produto/${i.id}`} media={media(i)} title={i.title} state="Acessar" seen={!!s.seen[i.id]} />
              </div>
            ))}
          </Carousel>
        </Section>
      )}

      {hasMain && favItems.length > 0 && (
        <Section title="Minhas favoritas">
          <Carousel label="Minhas favoritas">
            {favItems.map((i) => (
              <div className="car-item car-tile" key={i.id}>
                <ProductTile to={`/produto/${i.id}`} media={media(i)} title={i.title} state="Acessar" seen={!!s.seen[i.id]} />
              </div>
            ))}
          </Carousel>
        </Section>
      )}

      {hasMain && <HomeOffers />}

      {!owns(s, 'bump') && (
        <Section title={COPY.sections.rescue} lead={COPY.sections.rescueLead}>
          <BumpCard />
        </Section>
      )}

      {cards.length > 0 && (
        <Section title="Materiais adicionais">
          <div className="vlist">
            {cards.map((o) => (
              <OfferCard key={o.id} offer={o} from="home-card" />
            ))}
          </div>
        </Section>
      )}

      {banner && <OfferBlock offer={banner} from="home-banner" />}

      <Section title="Qual sua maior dificuldade agora?" lead="Conte para a gente. Isso ajuda a melhorar o app e os próximos materiais.">
        <DifficultyForm />
      </Section>

      <Section title="Precisa de ajuda?" lead="Fale com o suporte pelo WhatsApp se algum material não abrir ou não aparecer.">
        <a className="btn btn-open btn-block" href={supportUrl()} target="_blank" rel="noreferrer">
          Falar com o suporte
        </a>
      </Section>
    </Layout>
  )
}
