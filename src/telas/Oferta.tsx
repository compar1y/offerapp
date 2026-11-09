import { useEffect, useRef, useState } from 'react'
import { PRODUTOS, type ProdutoId } from '../../shared/catalogo'
import { OFERTAS } from '../../shared/conteudo'
import { ganhaPresente, ofertaDisponivel, precoPresente, reais, tem, useApp } from '../ctx'
import { AvisoPresente, BarraPresente, FaixaDesconto, useRelogio } from './PresenteDesconto'
import { EXTRAS } from './Painel'

import { Capa } from './Materiais'
import { mockup } from '../imagens'
import { VitrineEtiquetas } from './Etiquetas'

/** página curta antes do checkout (TSL interna). O pagamento abre em outra aba; ao voltar, o app confere se liberou. */
export function Oferta({ p, origem }: { p: ProdutoId; origem: string }) {
  const { eu, estado, trocar, voltar, evento, recarregar, mudar } = useApp()
  const [abriu, setAbriu] = useState(false)
  const [conferindo, setConferindo] = useState(false)
  // trava contra toque duplo: ao recusar, a tela seguinte abre com o botão verde no mesmo lugar do vermelho
  const abertaEm = useRef(Date.now())
  const prod = PRODUTOS[p]
  const texto = p === 'kit' || p === 'videoaulas' ? null : OFERTAS[p]
  const comprado = tem(eu, p)
  const pendente = eu.acesso.pendentes.includes(p)
  useRelogio(eu.acesso.desconto?.ate) // re-renderiza a cada segundo enquanto o desconto vale; ao acabar, o preço normal volta
  const desc = precoPresente(eu, p)

  useEffect(() => {
    evento('oferta.vista', { produto: p, onde: origem })
  }, [p, origem, evento])

  if (!texto) return null
  // ofertas com downsell ganham o botão vermelho de recusa logo abaixo do botão de compra
  const mostrarRecusa = origem === 'downsell' || (p === 'encomenda' && ofertaDisponivel(eu, 'primeira') && !estado.ofertasVistas.includes('downsell-primeira'))

  async function comprar() {
    if (Date.now() - abertaEm.current < 900) return
    evento('oferta.clicada', { produto: p, onde: origem, desconto: desc ? desc.pct : 0 })
    if (import.meta.env.VITE_DEMO === '1') {
      const { comprarNaPrevia } = await import('../demo')
      comprarNaPrevia(p)
      await recarregar()
      return
    }
    window.open(desc?.checkoutUrl || prod.checkoutUrl, '_blank', 'noopener')
    setAbriu(true)
  }

  function agoraNao() {
    evento('oferta.recusada', { produto: p, onde: origem })
    // recusou a Encomenda Puxa Encomenda: mostra uma vez a versão menor (downsell). Ela não aparece em nenhum outro lugar do app.
    if (p === 'encomenda' && ofertaDisponivel(eu, 'primeira') && !estado.ofertasVistas.includes('downsell-primeira')) {
      mudar((e) => ({ ...e, ofertasVistas: [...e.ofertasVistas, 'downsell-primeira'] }))
      trocar({ t: 'oferta', p: 'primeira', origem: 'downsell' })
      return
    }
    if (origem.startsWith('etapa') || origem === 'downsell') trocar({ t: 'painel' })
    else voltar()
  }

  async function conferir() {
    setConferindo(true)
    await recarregar()
    setConferindo(false)
  }

  if (comprado) {
    const primeiro = prod.libera[0]
    // presente da primeira compra: aparece logo depois de liberar, se ainda tiver material extra para ela
    const presente = EXTRAS.filter((x) => ofertaDisponivel(eu, x)).map((x) => precoPresente(eu, x)).find(Boolean)
    return (
      <div className="card pop" style={{ textAlign: 'center', gap: 14 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h1>Liberado!</h1>
        <p><b>{prod.nome}</b> já está no Início, em “Minhas compras”.</p>
        {presente && (
          <>
            <FaixaDesconto pct={presente.pct} ate={presente.ate} texto={`Você ganhou ${presente.pct}% OFF no próximo material da Seleção especial.`} />
            <button className="btn comprar-pulsa" onClick={() => trocar({ t: 'painel' })}>🎁 Ver meu desconto</button>
          </>
        )}
        <button className={presente ? 'btn leve' : 'btn'} onClick={() => trocar(p === 'etiquetas' ? { t: 'etiquetas' } : { t: 'ler', m: primeiro, p: 1 })}>Abrir agora</button>
        <button className="link" onClick={() => trocar({ t: 'painel' })}>Voltar ao Início</button>
      </div>
    )
  }

  return (
    <>
      {desc ? <BarraPresente ate={desc.ate} /> : ganhaPresente(eu, p) && <BarraPresente />}
      <button className="voltar" onClick={agoraNao}>← Voltar</button>
      <p className="eyebrow">{origem === 'downsell' ? 'Quer começar menor?' : origem.startsWith('etapa') ? `Você terminou a Etapa ${origem.slice(6)}` : 'Material extra, vendido à parte'}</p>
      <h1>{texto.gancho}</h1>
      <div className="card oferta">
        {p === 'etiquetas'
          ? <img className="foto-oferta" src="/img/mockups/etiquetas-destaque.webp" width={800} height={1000} loading="lazy" alt="Confeiteira de avental vinho amarrando no panetone a etiqueta redonda “Panetones da Dona Cida”" />
          : mockup(p) ? <img className="mockup" src={mockup(p)!} alt="" /> : <Capa m={prod.libera[0]} />}
        {/* as peças de verdade, com o nome de exemplo, logo abaixo da capa */}
        {p === 'etiquetas' && <VitrineEtiquetas />}
        <h3>{prod.nome}</h3>
        <ul className="passos">{texto.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        {p === 'etiquetas' && <img className="foto-oferta" src="/img/mockups/etiquetas-detalhe.webp" width={800} height={800} loading="lazy" alt="Etiqueta redonda “Panetones da Dona Cida” com fita vinho ao lado dos cartões “Feito com carinho para o seu Natal”" />}
        {desc && <FaixaDesconto pct={desc.pct} ate={desc.ate} de={reais(prod.precoCentavos)} por={reais(desc.precoCentavos)} />}
        {!desc && ganhaPresente(eu, p) && <AvisoPresente />}
        {!desc && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span className="sub">por</span><span className="preco">R${reais(prod.precoCentavos)}</span></div>
        )}
        {abriu || pendente ? (
          <>
            <div className="aviso">
              <b>⏳ Pagou no PIX?</b>
              <span>Assim que o pagamento cair, libera aqui sozinho. Pode levar alguns minutos.</span>
            </div>
            <button className="btn" onClick={conferir} disabled={conferindo}>{conferindo ? 'Conferindo…' : 'Já paguei, conferir'}</button>
            <button className="link" onClick={comprar}>Abrir o pagamento de novo</button>
          </>
        ) : (
          <>
            <button className="btn comprar-pulsa" onClick={comprar}>{texto.botao}</button>
            {mostrarRecusa && <button className="btn recusar" onClick={agoraNao}>Não, obrigada</button>}
          </>
        )}
        <p className="sub" style={{ fontSize: 13 }}>{texto.garantia} {import.meta.env.VITE_DEMO === '1' ? 'Na prévia, o botão libera na hora, sem pagar.' : 'O pagamento abre numa página segura e o app continua aqui.'}</p>
      </div>
    </>
  )
}
