import { useEffect, useState } from 'react'
import { cena } from '../imagens'
import { reais, useApp } from '../ctx'
import { PRODUTOS } from '../../shared/catalogo'
import { podeVerAulas } from '../aulas'

/**
 * Oferta das Videoaulas (R$19,90, as 25 aulas de shared/aulas.ts). O pagamento abre na Wiapy em outra aba;
 * ao voltar, o app confere se liberou. Não tem downsell: quem não quer só volta pelo "← Voltar".
 */
export const VIDEOAULAS = {
  mostrar: true,
  titulo: 'Videoaulas: veja cada passo sendo feito',
  nome: 'Videoaulas da Fábrica',
  precoCentavos: 1990,
  // o mesmo link de shared/catalogo.ts (PRODUTOS.videoaulas)
  checkoutUrl: PRODUTOS.videoaulas.checkoutUrl as string,
  gancho: 'Ler a receita é bom. Ver a massa sendo feita, de perto, é o que tira a dúvida na hora.',
  itens: [
    'Vídeos curtos de cada etapa: sova, ponto da massa, modelagem e forno',
    'O ponto certo da massa mostrado de perto, para você comparar com a sua',
    'Os erros mais comuns e como corrigir na hora',
    'Assista no celular, quantas vezes quiser',
  ],
  ancora: 'Menos que um panetone vendido. Pagamento único.',
  botao: 'Quero assistir às aulas',
  garantia: '7 dias de garantia.',
}

export function OfertaVideo() {
  const { eu, voltar, trocar, evento, toast, recarregar } = useApp()
  const libera = podeVerAulas(eu)
  const [abriu, setAbriu] = useState(false)
  const [conferindo, setConferindo] = useState(false)
  const pendente = eu.acesso.pendentes.includes('videoaulas')
  // quem já tem as aulas não vê a venda: vai direto para a lista
  useEffect(() => { if (libera) trocar({ t: 'aulas' }) }, [libera, trocar])
  useEffect(() => { if (!libera) evento('oferta.vista', { produto: 'videoaulas', onde: 'pagina' }) }, [evento, libera])
  const comprar = async () => {
    evento('oferta.clicada', { produto: 'videoaulas', onde: 'videoaulas' })
    if (import.meta.env.VITE_DEMO === '1') {
      // na prévia, comprar libera na hora (igual às outras ofertas)
      const { comprarNaPrevia } = await import('../demo')
      comprarNaPrevia('videoaulas')
      await recarregar()
      return
    }
    if (!VIDEOAULAS.checkoutUrl) return toast('As videoaulas chegam em breve aqui no app. 🎬')
    window.open(VIDEOAULAS.checkoutUrl, '_blank', 'noopener')
    setAbriu(true)
  }
  const sair = () => {
    evento('oferta.recusada', { produto: 'videoaulas', onde: 'voltar' })
    voltar()
  }
  async function conferir() {
    setConferindo(true)
    await recarregar()
    setConferindo(false)
  }
  return (
    <>
      <button className="voltar" onClick={sair}>← Voltar</button>
      <p className="eyebrow">Material extra, vendido à parte</p>
      <h1>{VIDEOAULAS.gancho}</h1>
      <div className="card oferta">
        <div className="video-tela" aria-hidden="true">
          <img src={cena('receitas')} alt="" />
          <span className="play">▶</span>
        </div>
        <h3>{VIDEOAULAS.nome}</h3>
        <ul className="passos">{VIDEOAULAS.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span className="sub">por</span><span className="preco">R${reais(VIDEOAULAS.precoCentavos)}</span></div>
        <p className="sub" style={{ fontSize: 15 }}>{VIDEOAULAS.ancora}</p>
        {abriu || pendente ? (
          <>
            <div className="aviso">
              <b>⏳ Pagou no PIX?</b>
              <span>Assim que o pagamento cair, as aulas liberam aqui sozinhas. Pode levar alguns minutos.</span>
            </div>
            <button className="btn" onClick={conferir} disabled={conferindo}>{conferindo ? 'Conferindo…' : 'Já paguei, conferir'}</button>
            <button className="link" onClick={comprar}>Abrir o pagamento de novo</button>
          </>
        ) : (
          <button className="btn comprar-pulsa" onClick={comprar}>{VIDEOAULAS.botao}</button>
        )}
        <p className="sub" style={{ fontSize: 13 }}>{VIDEOAULAS.garantia} O pagamento abre numa página segura e o app continua aqui.</p>
      </div>
    </>
  )
}
