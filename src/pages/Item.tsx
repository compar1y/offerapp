import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ITEM_BY_ID, OFFER_BY_ID, brl, fileKey, type FileEntry, type ItemId } from '../../shared/catalog'
import { MOCKUPS, PHOTOS } from '../data/images'
import { CONFIG, supportUrl } from '../data/config'
import { openFile, owns, toggleDone, toggleSeen, trackOffer, useStore } from '../lib/store'
import { Layout, OfferBlock, OfferMedia, Picture } from '../components/ui'
import { visibleOffers } from '../lib/offers'
import { lockInfo, noKitInfo } from '../lib/lock'

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
    else if (CONFIG.demo) setMsg('Modo demonstração: abriu um PDF de exemplo, não o material real.')
  }

  return (
    <Layout title={item.badge} back="/">
      <section className="block">
        <div className={`detail-media ${unlocked || inKit ? '' : 'detail-locked'}`}>
          {offer ? <OfferMedia offer={offer} className="pic-detail" /> : mock ? <Picture img={mock} className="pic-detail" lazy={false} /> : <Picture img={PHOTOS.presente} className="pic-wide" lazy={false} />}
          {!unlocked && !inKit && (
            <span className="lock-badge lock-big" aria-label="Bloqueado">
              🔒
            </span>
          )}
        </div>
        <div className="block-info">
          <span className={unlocked || inKit ? 'tag' : 'tag tag-buy'}>{unlocked ? `${item.badge} · NO SEU KIT` : inKit ? item.badge : offer ? item.badge : `${item.badge} · ADICIONAL`}</span>
          <h1>{item.title}</h1>
          <p className="lead">{item.description}</p>
          <ul className="bullets">
            {item.includes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
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
          {inKit && (
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
        <section className="block block-info">
          <div className="upsell">
            <span className="tag tag-buy">COMPRA ADICIONAL</span>
            <p>
              <strong>Este material não está no seu kit.</strong> Preço: {brl(offer.priceCents)}, pagamento único no checkout da Wiapy.
            </p>
            {offer.kind === 'seasonal' && !offer.checkoutUrl ? (
              s.interested[offer.id] ? (
                <p className="demo-note" role="status">
                  Anotado. Obrigado pelo interesse! Esse material ainda está em preparação.
                </p>
              ) : (
                <button className="btn btn-primary btn-block" onClick={() => trackOffer('offer.interest', offer.id, 'detail')}>
                  Tenho interesse
                </button>
              )
            ) : (
              <a
                className="btn btn-buy btn-block"
                href={offer.checkoutUrl || supportUrl(`Oi! Quero comprar o ${offer.title} (${brl(offer.priceCents)}).`)}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackOffer('offer.click', offer.id, 'detail')}
              >
                🛒 Comprar por {brl(offer.priceCents)}
              </a>
            )}
            <p className="hint">Nada é cobrado ao tocar em outros botões do app.</p>
          </div>
        </section>
      ) : (
        <section className="block block-info">
          <div className="upsell">
            <span className="tag tag-buy">COMPRA ADICIONAL</span>
            <p>
              <strong>Este material não está no seu kit.</strong> As Fichas de Socorro são vendidas à parte, por {lock.price}.
            </p>
            <a className="btn btn-buy btn-block" href={lock.href} target="_blank" rel="noreferrer">
              🛒 {lock.buy} · {lock.price}
            </a>
            {lock.note && <p className="hint">{lock.note}</p>}
            <p className="hint">Compra feita no checkout da Wiapy. Nada é cobrado ao tocar em outros botões do app.</p>
          </div>
        </section>
      )}

      {footer && <OfferBlock offer={footer} from="item-footer" />}
    </Layout>
  )
}
