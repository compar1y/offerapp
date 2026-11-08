import { useEffect, useState } from 'react'
import { PRODUTOS, type ProdutoId } from '../../shared/catalogo'
import { OFERTAS } from '../../shared/conteudo'
import { ofertaDisponivel, reais, tem, useApp } from '../ctx'

/** página curta antes do checkout (TSL interna). O pagamento abre em outra aba; ao voltar, o app confere se liberou. */
export function Oferta({ p, origem }: { p: ProdutoId; origem: string }) {
  const { eu, estado, trocar, voltar, evento, recarregar, mudar } = useApp()
  const [abriu, setAbriu] = useState(false)
  const [conferindo, setConferindo] = useState(false)
  const prod = PRODUTOS[p]
  const texto = p === 'kit' ? null : OFERTAS[p]
  const comprado = tem(eu, p)
  const pendente = eu.acesso.pendentes.includes(p)

  useEffect(() => {
    evento('oferta.vista', { produto: p, onde: origem })
  }, [p, origem, evento])

  if (!texto) return null

  function comprar() {
    evento('oferta.clicada', { produto: p, onde: origem })
    window.open(prod.checkoutUrl, '_blank', 'noopener')
    setAbriu(true)
  }

  function agoraNao() {
    evento('oferta.recusada', { produto: p, onde: origem })
    // recusou a Encomenda Puxa Encomenda: mostra uma vez a versão menor (downsell)
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
    return (
      <div className="card pop" style={{ textAlign: 'center', gap: 14 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h1>Liberado!</h1>
        <p><b>{prod.nome}</b> já está em Meus materiais.</p>
        <button className="btn" onClick={() => trocar({ t: 'ler', m: primeiro, p: 1 })}>Abrir agora</button>
        <button className="link" onClick={() => trocar({ t: 'painel' })}>Voltar ao painel</button>
      </div>
    )
  }

  return (
    <>
      <button className="voltar" onClick={agoraNao}>← Agora não</button>
      <p className="eyebrow">{origem === 'downsell' ? 'Quer começar menor?' : origem.startsWith('etapa') ? `Você terminou a Etapa ${origem.slice(6)}` : 'O seu próximo passo'}</p>
      <h1>{texto.gancho}</h1>
      <div className="card oferta">
        <h3>{prod.nome}</h3>
        <ul className="passos">{texto.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span className="sub">por</span><span className="preco">R${reais(prod.precoCentavos)}</span></div>
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
          <button className="btn fita" onClick={comprar}>{texto.botao}</button>
        )}
        <p className="sub" style={{ fontSize: 13 }}>{texto.garantia} O pagamento abre numa página segura e o app continua aqui.</p>
      </div>
      <button className="link" onClick={agoraNao}>Agora não</button>
    </>
  )
}
