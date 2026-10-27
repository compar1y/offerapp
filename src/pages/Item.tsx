import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { COPY, ITEM_BY_ID, OFFER_BY_ID, fileKey, offerCopy, type FileEntry, type ItemId } from '../../shared/catalog'
import { MOCKUPS } from '../data/images'
import { PREVIEW } from '../data/config'
import { openFile, owns, toggleDone, toggleSeen, trackOffer, useStore } from '../lib/store'
import { Context, DeliverableChip, Layout, OfferAction, OfferBlock, OfferMedia, Picture, Price } from '../components/ui'
import { buyUrl, visibleOffers } from '../lib/offers'
import { lockInfo, noKitInfo } from '../lib/lock'
import { themeStyle } from '../lib/theme'
import { bumpContextOf, contextOf } from '../lib/context'
import { Section } from '../components/ui'
import { HookBox, OfferBullets, OfferStack, Testimonials, TrackLine } from '../components/System'

const KIND_LABEL = { pdf: 'PDF', txt: 'Texto (TXT)', docx: 'Word (DOCX)', xlsx: 'Planilha (Excel)' }

export function Item() {
  const { id } = useParams()
  const s = useStore()
  const [msg, setMsg] = useState('')
  const item = id ? ITEM_BY_ID[id as ItemId] : undefined
  if (!item) return <Navigate to="/" replace />
  const unlocked = owns(s, item.id)
  const lock = lockInfo()
  const inKit = item.kind === 'main' || item.kind === 'bonus'
  const offer = item.kind === 'offer' ? OFFER_BY_ID[item.id as keyof typeof OFFER_BY_ID] : null
  const mock = offer ? null : MOCKUPS[item.id as keyof typeof MOCKUPS]
  // oferta desligada: a página não existe para a cliente
  if (offer && !offer.enabled) return <Navigate to="/" replace />
  // rodapé de oferta: só em receita/bônus que a cliente já marcou com "Fiz essa"
  const footer = inKit && unlocked && s.done[item.id] ? visibleOffers(s, 'item-footer')[0] : undefined

  async function act(f: FileEntry, download: boolean) {
    setMsg('')
    const r = await openFile(fileKey(f), download)
    if (!r.ok) setMsg(r.error ?? 'Não foi possível abrir.')
    else if (PREVIEW) setMsg('Modo demonstração: abriu um PDF de exemplo, não o material real.')
  }

  return (
    <Layout title={item.badge} back="/">
      <div style={offer ? themeStyle(offer.id) : undefined}>
      <section className="block">
        <div className={`detail-media ${unlocked || inKit ? '' : 'detail-locked'}`}>
          {offer ? <OfferMedia offer={offer} className="pic-detail" /> : mock ? <Picture img={mock} className="pic-detail" lazy={false} /> : null}
          {!unlocked && !inKit && (
            <span className="lock-badge lock-big" aria-label="Bloqueado">
              🔒
            </span>
          )}
        </div>
        <div className="block-info">
          <span className={unlocked || inKit ? 'tag' : 'tag tag-buy'}>{unlocked ? `${item.badge} · NO SEU KIT` : item.badge}</span>
          {offer && <DeliverableChip offer={offer} />}
          <h1>{item.title}</h1>
          {offer && !unlocked && (
            <>
              {offerCopy(offer.id).question && <p className="ask">{offerCopy(offer.id).question}</p>}
              <Context ctx={contextOf(s, offer.id)} />
              <p className="lead">{offerCopy(offer.id).cardLine}</p>
              <Price offer={offer} soon={!buyUrl(offer.id)} big />
              <OfferAction offer={offer} from="detail" variant="detail" />
            </>
          )}
          {offer && unlocked && <p className="lead">{item.description}</p>}
          {!offer && <p className="lead">{item.description}</p>}
          {(!offer || unlocked) && (
            <>
              {offer && <OfferBullets offer={offer} />}
              {offer && <TrackLine id={offer.id} />}
              <ul className="bullets">
                {item.includes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {unlocked ? (
        <section className="block block-info">
          <h2 className="section-title">Seus arquivos</h2>
          {item.files.length === 0 && <p className="hint">O arquivo deste material ainda não foi cadastrado.</p>}
          {item.files.map((f) => (
            <div className="file" key={fileKey(f)}>
              <div className="file-name">
                <strong>{f.label}</strong>
                <small>
                  {KIND_LABEL[f.kind]}
                  {f.pages ? ` · ${f.pages} páginas` : ''}
                </small>
              </div>
              <div className="actions">
                {f.kind === 'pdf' && (
                  <button className="btn btn-primary" onClick={() => act(f, false)}>
                    Abrir PDF
                  </button>
                )}
                <button className={f.kind === 'pdf' ? 'btn btn-secondary' : 'btn btn-primary'} onClick={() => act(f, true)}>
                  Baixar
                </button>
              </div>
            </div>
          ))}
          {msg && (
            <p className="demo-note" role="status">
              {msg}
            </p>
          )}
          {(inKit || !!offer) && (
            <button className={`btn btn-block ${s.done[item.id] ? 'btn-done' : 'btn-secondary'}`} aria-pressed={!!s.done[item.id]} onClick={() => toggleDone(item.id)}>
              {s.done[item.id] ? 'Fiz essa ✓ (toque para desmarcar)' : 'Fiz essa'}
            </button>
          )}
          <button className="btn btn-link btn-block" onClick={() => toggleSeen(item.id)}>
            {s.seen[item.id] ? 'Desmarcar como visto' : 'Marcar como visto ✓'}
          </button>
        </section>
      ) : inKit ? (
        <section className="block block-info">
          <div className="upsell upsell-notice">
            <p>
              <strong>Este material ainda não está liberado no seu acesso.</strong>
            </p>
            <p className="hint">
              {s.session?.purchases.some((p) => p.status === 'pending')
                ? 'Seu pagamento ainda não foi confirmado. Assim que o banco confirmar, o kit é liberado aqui.'
                : 'Se você já comprou o kit, fale com o suporte e a gente confere o seu acesso.'}
            </p>
            <a className="btn btn-primary btn-block" href={noKitInfo(item).href} target="_blank" rel="noreferrer">
              Falar com o suporte
            </a>
          </div>
        </section>
      ) : offer ? (
        <>
          <Section title="O que você recebe">
            <OfferBullets offer={offer} />
            <OfferStack offer={offer} soon={!buyUrl(offer.id)} />
          </Section>
          <Testimonials offer={offer} />
          <section className="sec" aria-label="Onde este material entra">
            <TrackLine id={offer.id} />
            <HookBox id={offer.id} where="detail" />
          </section>
          <section className="sec" aria-label="Quero isso">
            <OfferAction offer={offer} from="detail-end" variant="detail" />
            <p className="hint">Pagamento único no checkout da Wiapy. Nada é cobrado ao tocar em outros botões do app.</p>
          </section>
        </>
      ) : (
        <section className="block block-info">
          <div className="upsell">
            <span className="tag tag-buy">MATERIAL ADICIONAL</span>
            <p className="ask">{COPY.bump.question}</p>
            <Context ctx={bumpContextOf(s)} />
            <p>{COPY.bump.cardLine}</p>
            <p className="v-price v-price-big">
              <strong>{lock.price}</strong>
              <span>{lock.buyable ? COPY.price.once : COPY.price.planned}</span>
            </p>
            {lock.buyable ? (
              <a className="btn btn-buy btn-block btn-want" href={lock.href} target="_blank" rel="noreferrer" onClick={() => trackOffer('offer.click', 'bump', 'detail')}>
                {COPY.button.detail} · {lock.price}
              </a>
            ) : s.interested.bump ? (
              <p className="demo-note" role="status">
                Anotado ✓ Avisamos você assim que a compra pelo app abrir.
              </p>
            ) : (
              <button className="btn btn-secondary btn-block" onClick={() => trackOffer('offer.interest', 'bump', 'detail')}>
                {COPY.button.notify}
              </button>
            )}
            {lock.note && <p className="hint">{lock.note}</p>}
            <p className="hint">Compra feita no checkout da Wiapy. Nada é cobrado ao tocar em outros botões do app.</p>
          </div>
        </section>
      )}

      {offer && unlocked && <HookBox id={offer.id} where="detail" />}
      {footer && <OfferBlock offer={footer} from="item-footer" />}
      </div>
    </Layout>
  )
}
