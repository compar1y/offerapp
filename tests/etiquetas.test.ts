// Imagens e Etiquetas com o Seu Nome: produto escondido até ter checkout, webhook pelos dois códigos, nada liberado sem compra.
import { afterEach, describe, expect, it } from 'vitest'
import { ETIQUETAS_WIAPY, PRODUTOS, materiaisLiberados } from '../shared/catalogo'
import { ARQUIVOS, podeBaixar, podeVerAulasCom } from '../shared/acesso'
import { OFERTAS } from '../shared/conteudo'
import { lerPedido } from '../server/wiapy'
import { ofertaDisponivel, tem } from '../src/ctx'
import { formatarWhats, listaSabores, montarPdf, nomeArquivo } from '../src/etiquetas'

const eu = (produtos: string[]) => ({ acesso: { produtos, pendentes: [], materiais: [] } }) as never
const pedido = (checkoutId: string, produtos: string[]) => ({
  customer: { email: 'c@x.com' },
  checkout: { id: checkoutId, amount: 1290 },
  payment: { id: 'pay_e', status: 'paid', amount: 1290, payment_method: 'pix' },
  products: produtos.map((id) => ({ id, title: 'Produto' })),
})

afterEach(() => {
  ETIQUETAS_WIAPY.checkoutUrl = ''
  ETIQUETAS_WIAPY.checkoutIds.length = 0
  ETIQUETAS_WIAPY.produtoIds.length = 0
  PRODUTOS.etiquetas.checkoutUrl = ''
})

describe('produto Imagens e Etiquetas', () => {
  it('no catálogo a R$12,90, com os códigos da Wiapy ainda vazios', () => {
    expect(PRODUTOS.etiquetas).toMatchObject({ id: 'etiquetas', precoCentavos: 1290, checkoutUrl: '', checkoutIds: [], produtoIds: [] })
    expect(OFERTAS.etiquetas.botao).toBe('Quero com o meu nome')
  })
  it('card de venda escondido enquanto não houver checkout; quem já tem também não vê', () => {
    expect(ofertaDisponivel(eu(['kit']), 'etiquetas')).toBe(false)
    PRODUTOS.etiquetas.checkoutUrl = 'https://pay.wiapy.com/exemplo'
    expect(ofertaDisponivel(eu(['kit']), 'etiquetas')).toBe(true)
    expect(ofertaDisponivel(eu(['kit', 'etiquetas']), 'etiquetas')).toBe(false)
  })
  it('a entrega só abre para quem tem "etiquetas"', () => {
    for (const outros of [['kit'], ['kit', 'recheios', 'encomenda', 'primeira', 'videoaulas']]) expect(tem(eu(outros), 'etiquetas')).toBe(false)
    expect(tem(eu(['etiquetas']), 'etiquetas')).toBe(true)
  })
  it('comprar etiquetas não abre nenhum PDF nem as aulas', () => {
    expect(materiaisLiberados(['etiquetas'])).toEqual([])
    for (const a of ARQUIVOS) expect(podeBaixar(['etiquetas'], a)).toBe(false)
    expect(podeVerAulasCom(['etiquetas'], 'venda')).toBe(false)
  })
  it('sem códigos cadastrados, nenhum pedido vira etiquetas', () => {
    expect(lerPedido(pedido('', [])).produtos).toEqual([])
    expect(lerPedido(pedido('qualquer', ['qualquer'])).produtos).not.toContain('etiquetas')
  })
  it('com os códigos: libera pelo conteúdo (inclusive no checkout do kit) e, na falta dele, pelo checkout', () => {
    ETIQUETAS_WIAPY.checkoutIds.push('codigoCheckoutEtq', 'idInternoCheckoutEtq')
    ETIQUETAS_WIAPY.produtoIds.push('idConteudoEtq')
    expect(lerPedido(pedido('6accaf7eb11ba1ecaf89b37e', ['idConteudoEtq'])).produtos).toEqual(['etiquetas'])
    expect(lerPedido(pedido('idInternoCheckoutEtq', ['desconhecido'])).produtos).toEqual(['etiquetas'])
    expect(lerPedido(pedido('codigoCheckoutEtq', [])).produtos).toEqual(['etiquetas'])
  })
})

describe('peças com o nome dela', () => {
  it('WhatsApp formatado, com ou sem 55, e vazio continua vazio', () => {
    expect(formatarWhats('11987654321')).toBe('(11) 98765-4321')
    expect(formatarWhats('+55 (11) 98765-4321')).toBe('(11) 98765-4321')
    expect(formatarWhats('1133334444')).toBe('(11) 3333-4444')
    expect(formatarWhats('   ')).toBe('')
  })
  it('sabores: um por linha (ou vírgula), até 6', () => {
    expect(listaSabores('A\n B ,C;;\n')).toEqual(['A', 'B', 'C'])
    expect(listaSabores('1,2,3,4,5,6,7,8')).toHaveLength(6)
  })
  it('nome do arquivo sem acento e sem espaço, mesmo com nome longo ou vazio', () => {
    expect(nomeArquivo('natal-abertas', 'Panetones da Dona Cida & Família Ção', 'png')).toBe('natal-abertas-panetones-da-dona-cida-familia-cao.png')
    expect(nomeArquivo('natal-abertas', '', 'png')).toBe('natal-abertas.png')
    expect(nomeArquivo('x', 'a'.repeat(200), 'pdf').length).toBeLessThan(50)
  })
  it('PDF bem formado: uma página A4 por imagem, xref apontando para cada objeto', async () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const b = montarPdf([jpg, jpg, jpg])
    const bytes = new Uint8Array(await b.arrayBuffer())
    const txt = new TextDecoder('latin1').decode(bytes)
    expect(txt.startsWith('%PDF-1.4')).toBe(true)
    expect(txt).toContain('/Count 3')
    expect(txt.match(/\/MediaBox \[0 0 595.28 841.89\]/g)).toHaveLength(3)
    const xref = Number(/startxref\n(\d+)/.exec(txt)![1])
    expect(txt.slice(xref, xref + 4)).toBe('xref')
    const linhas = txt.slice(xref).split('\n').slice(3, 3 + 11)
    linhas.forEach((l, i) => expect(txt.slice(Number(l.slice(0, 10)), Number(l.slice(0, 10)) + 10)).toMatch(new RegExp(`^${i + 1} 0 obj`)))
  })
})
