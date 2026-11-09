import { useEffect } from 'react'
import { cena } from '../imagens'
import { reais, useApp } from '../ctx'

/**
 * Upsell de videoaulas (produto ainda em produção). Sem checkout, o botão só avisa "em breve".
 * Quando o checkout existir: preencha checkoutUrl. A copy precisa bater com o que os vídeos mostram.
 */
export const VIDEOAULAS = {
  mostrar: true,
  titulo: 'Videoaulas: veja cada passo sendo feito',
  nome: 'Videoaulas da Fábrica',
  precoCentavos: 1990,
  checkoutUrl: '' as string,
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
  const { voltar, evento, toast } = useApp()
  useEffect(() => { evento('oferta.vista', { produto: 'videoaulas', onde: 'pagina' }) }, [evento])
  const comprar = () => {
    evento('oferta.clique', { produto: 'videoaulas' })
    if (VIDEOAULAS.checkoutUrl) window.open(VIDEOAULAS.checkoutUrl, '_blank', 'noopener')
    else toast('As videoaulas chegam em breve aqui no app. 🎬')
  }
  return (
    <>
      <button className="voltar" onClick={voltar}>← Agora não</button>
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
        <button className="btn comprar-pulsa" onClick={comprar}>{VIDEOAULAS.botao}</button>
        <p className="sub" style={{ fontSize: 13 }}>{VIDEOAULAS.garantia} O pagamento abre numa página segura e o app continua aqui.</p>
      </div>
      <button className="link" onClick={voltar}>Agora não</button>
    </>
  )
}
