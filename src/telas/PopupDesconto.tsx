import { useEffect } from 'react'
import { PRODUTOS, vendaLigada, type ProdutoId } from '../../shared/catalogo'
import { CHECKOUT_DESCONTO_POPUP, PCT_POPUP, POPUP_DESCONTO_LIGADO, compraNova, proximoUpsell, type MemoriaPopup, type UpsellPopup } from '../../shared/popupDesconto'
import type { Eu } from '../api'
import { reais, useApp, type Tela } from '../ctx'
import { VIDEOAULAS } from './OfertaVideo'

/** a tela de acesso do que ela acabou de comprar: o popup abre por cima dela e fechar deixa ela ali */
export const TELA_ACESSO: Record<UpsellPopup, Tela> = {
  videoaulas: { t: 'aulas' },
  etiquetas: { t: 'etiquetas' },
  contafeita: { t: 'contafeita' },
}

const chave = (email: string) => `fornada-popup-desconto:v1:${email.toLowerCase()}`

function lerMemoria(email: string): MemoriaPopup | null {
  try {
    const m = JSON.parse(localStorage.getItem(chave(email)) ?? 'null')
    return m && Array.isArray(m.base) && Array.isArray(m.mostrados) ? m : null
  } catch {
    return null
  }
}
function gravarMemoria(email: string, m: MemoriaPopup) {
  try { localStorage.setItem(chave(email), JSON.stringify(m)) } catch { /* sem armazenamento: no pior caso o popup não aparece */ }
}

/** o upsell está à venda no app agora? (Videoaulas tem chave própria; Conta Feita, a CONTAFEITA_VENDA_LIGADA) */
const aVenda = (p: UpsellPopup) => !!PRODUTOS[p].checkoutUrl && vendaLigada(p) && (p !== 'videoaulas' || VIDEOAULAS.mostrar)

/**
 * Confere se uma compra de upsell acabou de ser confirmada. Com a chave desligada não faz nada (nem grava no aparelho).
 * A compra fica marcada na hora, tenha ou não um próximo para oferecer: o popup aparece no máximo uma vez por compra.
 */
export function conferirPopup(eu: Eu, ligado = POPUP_DESCONTO_LIGADO): { comprado: UpsellPopup; oferta: UpsellPopup } | null {
  if (!ligado) return null
  const { comprado, memoria } = compraNova(eu.acesso.produtos as ProdutoId[], lerMemoria(eu.email))
  gravarMemoria(eu.email, memoria)
  if (!comprado) return null
  const oferta = proximoUpsell(comprado, eu.acesso.produtos as ProdutoId[], aVenda)
  return oferta ? { comprado, oferta } : null
}

const NOME_CURTO: Record<UpsellPopup, string> = { videoaulas: 'as Videoaulas', etiquetas: 'as Imagens e Etiquetas', contafeita: 'o Respostas com a Conta Feita' }
const IMAGEM: Record<UpsellPopup, string> = { videoaulas: '/img/cenas/videoaulas.webp', etiquetas: '/img/mockups/etiquetas.webp', contafeita: '/img/mockups/contafeita.webp' }

/** a copy do popup, por produto oferecido (sem escassez, sem cronômetro, sem número de ganho) */
export const COPY_POPUP: Record<UpsellPopup, { titulo: string; texto: string; itens: string[]; botao: string }> = {
  etiquetas: {
    titulo: 'Agora deixe cada panetone com o seu nome',
    texto: 'Você digita o nome do seu negócio uma vez e o app monta tudo na hora, pronto para postar e imprimir.',
    itens: [
      '6 imagens de Natal para o WhatsApp com o seu nome e os seus sabores',
      'Etiquetas “Feito à mão por” e cartões de presente com o seu nome',
      'Tudo em PDF para imprimir em casa ou na papelaria',
    ],
    botao: 'Quero com o meu nome',
  },
  contafeita: {
    titulo: 'Agora responda cada cliente com a conta feita',
    texto: 'Você preenche a encomenda uma vez e o app faz as contas e monta as respostas, prontas para copiar no WhatsApp.',
    itens: [
      'Orçamento com o total, a entrega e o que ela paga agora',
      'Pedido de pagamento, confirmação e lembretes já preenchidos',
      'Os textos das mensagens do seu kit (bônus 04), sem errar valor',
    ],
    botao: 'Quero minhas respostas prontas',
  },
  videoaulas: {
    titulo: 'Agora veja cada passo sendo feito',
    texto: 'Ler a receita é bom. Ver a massa de perto é o que tira a dúvida na hora.',
    itens: [
      'Sova, ponto da massa, modelagem e forno, de perto',
      'Tem versões sem glúten, sem leite e sem ovo, e também receitas no liquidificador ou na tigela',
      'Assista no celular, quantas vezes quiser',
    ],
    botao: 'Quero assistir às aulas',
  },
}

export function PopupDesconto({ comprado, oferta, fechar }: { comprado: UpsellPopup; oferta: UpsellPopup; fechar: () => void }) {
  const { evento } = useApp()
  const c = COPY_POPUP[oferta]
  const cheio = PRODUTOS[oferta].precoCentavos
  const desc = CHECKOUT_DESCONTO_POPUP[oferta]

  useEffect(() => {
    evento('popup.desconto.visto', { comprado, oferta })
  }, [comprado, oferta, evento])

  function comprar() {
    evento('popup.desconto.clicado', { comprado, oferta })
    window.open(desc.checkoutUrl, '_blank', 'noopener')
    fechar()
  }
  function sair(como: string) {
    evento('popup.desconto.fechado', { comprado, oferta, como })
    fechar()
  }

  return (
    <div className="overlay popup-desconto" role="dialog" aria-modal="true" aria-labelledby="pd-t">
      <div className="card pop">
        {/* só o botão verde e o X: o X fecha e deixa ela no material que acabou de comprar (Levi, 10/11) */}
        <button className="pd-x" aria-label="Fechar" onClick={() => sair('x')}>✕</button>
        <p className="pd-ok">✅ Compra confirmada: {NOME_CURTO[comprado]} já {comprado === 'contafeita' ? 'está liberado' : 'estão liberadas'} aqui embaixo.</p>
        <img className="pd-img" src={IMAGEM[oferta]} alt="" />
        <p className="pd-selo-linha"><span className="pd-selo">{PCT_POPUP}% OFF</span><span className="pd-selo-motivo">por ter acabado de comprar</span></p>
        <h3 id="pd-t">{c.titulo}</h3>
        <p className="pd-texto">{c.texto}</p>
        <ul className="pd-itens">{c.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        <p className="pd-preco"><b>{PRODUTOS[oferta].nome}</b><br />de <s>R${reais(cheio)}</s> por <span className="preco">R${reais(desc.precoCentavos)}</span></p>
        <button className="btn comprar-pulsa pd-comprar" onClick={comprar}>
          <span>{c.botao}</span>
          <span className="pd-comprar-preco">por R${reais(desc.precoCentavos)}</span>
        </button>
        <p className="sub" style={{ fontSize: 13 }}>7 dias de garantia. O pagamento abre numa página segura e o app continua aqui.</p>
      </div>
    </div>
  )
}
