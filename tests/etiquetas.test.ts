// Imagens e Etiquetas com o Seu Nome: produto escondido até ter checkout, webhook pelos dois códigos, nada liberado sem compra.
import { describe, expect, it } from 'vitest'
import { PRODUTOS, materiaisLiberados } from '../shared/catalogo'
import { ARQUIVOS, podeBaixar, podeVerAulasCom } from '../shared/acesso'
import { OFERTAS } from '../shared/conteudo'
import { lerPedido } from '../server/wiapy'
import { ofertaDisponivel, tem } from '../src/ctx'
import { DADOS_VAZIOS, EXEMPLO, PX_MIN_PDF, ajustarNome, caixaAssinatura, caixaCartao, caixaEtiqueta, formatarWhats, listaSabores, montarPdf, nomeArquivo, quebraEquilibrada, saborDaEtiqueta, type CaixaNome } from '../src/etiquetas'

const eu = (produtos: string[]) => ({ acesso: { produtos, pendentes: [], materiais: [] } }) as never
const pedido = (checkoutId: string, produtos: string[]) => ({
  customer: { email: 'c@x.com' },
  checkout: { id: checkoutId, amount: 1290 },
  payment: { id: 'pay_e', status: 'paid', amount: 1290, payment_method: 'pix' },
  products: produtos.map((id) => ({ id, title: 'Produto' })),
})

describe('produto Imagens e Etiquetas', () => {
  it('no catálogo a R$12,90, com o checkout e o conteúdo da Wiapy', () => {
    expect(PRODUTOS.etiquetas).toMatchObject({
      id: 'etiquetas',
      precoCentavos: 1290,
      checkoutUrl: 'https://pay.wiapy.com/6af20863371815cbecf6456a',
      checkoutIds: ['6af20863371815cbecf6456a'],
      produtoIds: ['6af207d3371815cbecf61968'],
    })
    expect(OFERTAS.etiquetas.botao).toBe('Quero com o meu nome')
  })
  it('card de venda aparece para quem não comprou e some para quem já tem', () => {
    expect(ofertaDisponivel(eu(['kit']), 'etiquetas')).toBe(true)
    expect(ofertaDisponivel(eu(['kit', 'videoaulas', 'encomenda']), 'etiquetas')).toBe(true)
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
  it('webhook: libera pelo conteúdo (inclusive no checkout do kit) e, na falta dele, pelo checkout', () => {
    expect(lerPedido(pedido('6accaf7eb11ba1ecaf89b37e', ['6af207d3371815cbecf61968'])).produtos).toEqual(['etiquetas'])
    expect(lerPedido(pedido('6af20863371815cbecf6456a', ['6af207d3371815cbecf61968'])).produtos).toEqual(['etiquetas'])
    expect(lerPedido(pedido('6af20863371815cbecf6456a', ['desconhecido'])).produtos).toEqual(['etiquetas'])
    expect(lerPedido(pedido('qualquer', ['qualquer'])).produtos).not.toContain('etiquetas')
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

describe('nome que se ajusta ao espaço', () => {
  // medida falsa e previsível: cada letra ocupa meia fonte
  const medir = (t: string, px: number) => [...t.normalize('NFC')].length * px * 0.5
  const CURTO = 'Bia'
  const MEDIO = 'Panetones da Dona Cida'
  const LONGO = 'Panetones Artesanais da Maria Aparecida'
  const ACENTOS = 'Pães e Panetones da Conceição Ângela'
  // a etiqueta do PDF (célula de 537 × 306 px a 150 dpi)
  const et = caixaEtiqueta(537, 306)
  const caixas: [string, CaixaNome][] = [
    ['etiqueta', et.caixa],
    ['cartão', caixaCartao(537)],
    ['imagem 9:16', caixaAssinatura(880, 122)],
    ['imagem quadrada', caixaAssinatura(880, 82)],
  ]
  const dentro = (r: ReturnType<typeof ajustarNome>, cx: CaixaNome) => {
    for (const l of r.linhas) expect(medir(l, r.px)).toBeLessThanOrEqual(cx.largura)
    expect(r.linhas.length * r.px * (cx.entre ?? 1.15)).toBeLessThanOrEqual(cx.altura)
  }

  it('nome curto fica numa linha, na letra ideal', () => {
    for (const [, cx] of caixas) {
      const r = ajustarNome(CURTO, cx, medir)
      expect(r.linhas).toEqual(['Bia'])
      expect(r.px).toBe(cx.max)
    }
  })
  it('tenta uma linha só, diminuindo a letra até 60% da ideal', () => {
    const cx: CaixaNome = { largura: 300, altura: 200, max: 50 }
    // 22 letras: a 50 px dá 550; cabe em 300 só a 27 px (< 60% de 50 = 30) → vai para 2 linhas
    expect(ajustarNome(MEDIO, cx, medir).linhas).toHaveLength(2)
    // em 400 px cabe a 36 px (≥ 30): uma linha, letra menor
    const r = ajustarNome(MEDIO, { ...cx, largura: 400 }, medir)
    expect(r.linhas).toEqual([MEDIO])
    expect(r.px).toBeGreaterThanOrEqual(30)
    expect(r.px).toBeLessThan(50)
  })
  it('em 2 linhas, quebra equilibrada e nunca deixa uma palavra sozinha embaixo', () => {
    const r = ajustarNome(LONGO, et.caixa, medir)
    expect(r.linhas).toEqual(['Panetones Artesanais', 'da Maria Aparecida'])
    // a linha mais larga é a menor possível (12 letras), nunca "Panetones da Dona" (17) + "Cida"
    expect(Math.max(...quebraEquilibrada(MEDIO.split(' '), (t) => t.length)!.map((l) => l.length))).toBe(12)
    // "Panetones da Dona" + "Cida" sozinho seria a quebra antiga: proibida
    for (const n of [MEDIO, LONGO, ACENTOS, 'Ana Maria Doces', 'Doces da Vovó Zica Caseiros']) {
      const q = quebraEquilibrada(n.split(' '), (t) => t.length)!
      expect(q[1].split(' ').length).toBeGreaterThan(1)
    }
    // com só 2 palavras, a quebra é entre elas
    expect(quebraEquilibrada(['Panetonaria', 'Cidinha'], (t) => t.length)).toEqual(['Panetonaria', 'Cidinha'])
  })
  it('os 3 nomes e o nome com acentos cabem em todas as peças, sem cortar', () => {
    for (const n of [CURTO, MEDIO, LONGO, ACENTOS]) for (const [, cx] of caixas) {
      const r = ajustarNome(n, cx, medir)
      expect(r.cortado).toBe(false)
      expect(r.linhas.join(' ')).toBe(n)
      dentro(r, cx)
    }
  })
  it('qualquer nome de até 60 letras fica dentro da caixa, e nunca abaixo de 8 pt no PDF', () => {
    expect(PX_MIN_PDF).toBe(17)
    const palavras = ['Doces', 'da', 'Maria', 'Panetones', 'Artesanais', 'Aparecida', 'e', 'Conceição', 'Cia', 'Ângela', 'Fornada']
    let semente = 7
    const sorteia = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280 }
    for (let k = 0; k < 400; k++) {
      let n = ''
      while (n.length < 1 + sorteia() * 60) n = `${n} ${palavras[Math.floor(sorteia() * palavras.length)]}`.trim()
      n = n.slice(0, 60)
      for (const [nome, cx] of caixas) {
        const r = ajustarNome(n, cx, medir)
        dentro(r, cx)
        if (nome === 'etiqueta' || nome === 'cartão') expect(r.px).toBeGreaterThanOrEqual(PX_MIN_PDF)
        expect(r.linhas.length).toBeLessThanOrEqual(2)
      }
    }
  })
  it('palavra enorme: reticências, sem sair da caixa', () => {
    const r = ajustarNome('Panetoneriadadonacidinhadobairrodaliberdade', et.caixa, medir)
    expect(r.cortado).toBe(true)
    dentro(r, et.caixa)
  })
  it('nome vazio não desenha nada', () => {
    expect(ajustarNome('   ', et.caixa, medir).linhas).toEqual([])
  })
  it('na etiqueta, a caixa do nome fica entre "Feito à mão por" e o "Sabor:", com folga', () => {
    const p = 22
    const topoSabor = 306 - p - 58 - 24 * 0.8
    expect(et.caixa.altura).toBeGreaterThan(80)
    expect(et.topo + et.caixa.altura + 24).toBeLessThanOrEqual(topoSabor)
  })
  it('sabores vão no "Sabor:" das etiquetas, revezando; sem sabores, a linha fica em branco', () => {
    expect([0, 1, 2, 3, 4].map((i) => saborDaEtiqueta(EXEMPLO, i))).toEqual(['Frutas cristalizadas', 'Gotas de chocolate', 'Doce de leite', 'Trufado de chocolate', 'Frutas cristalizadas'])
    expect(saborDaEtiqueta(DADOS_VAZIOS, 0)).toBe('')
  })
})
