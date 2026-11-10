// Popup de desconto pós-compra: chave ligada com os links reais, desligada não muda nada, preços com desconto, ordem do "próximo", uma vez por compra e webhook.
import { afterEach, describe, expect, it } from 'vitest'
import { PRODUTOS, type ProdutoId } from '../shared/catalogo'
import {
  CHECKOUT_DESCONTO_POPUP, POPUP_DESCONTO_LIGADO, PROXIMO, compraNova, precoComDesconto, proximoUpsell, type UpsellPopup,
} from '../shared/popupDesconto'
import { lerPedido, produtoDoCheckout } from '../server/wiapy'
import { podeVerAulasCom } from '../shared/acesso'
import { tem } from '../src/ctx'
import { COPY_POPUP, conferirPopup } from '../src/telas/PopupDesconto'

const eu = (produtos: string[]) => ({ email: 'm@x.com', acesso: { produtos, pendentes: [], materiais: [] } }) as never
const todos = () => true
const UPSELLS = ['videoaulas', 'etiquetas', 'contafeita']
const comLinks = () => ({
  videoaulas: { ...CHECKOUT_DESCONTO_POPUP.videoaulas, checkoutUrl: 'https://pay.wiapy.com/V' },
  etiquetas: { ...CHECKOUT_DESCONTO_POPUP.etiquetas, checkoutUrl: 'https://pay.wiapy.com/E' },
  contafeita: { ...CHECKOUT_DESCONTO_POPUP.contafeita, checkoutUrl: 'https://pay.wiapy.com/C' },
})

function armazenamento() {
  const m = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
  return m
}
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage })

describe('chave POPUP_DESCONTO_LIGADO', () => {
  it('está LIGADA, com os 3 links de desconto da Wiapy (ofertas especiais dentro dos checkouts normais)', () => {
    expect(POPUP_DESCONTO_LIGADO).toBe(true)
    expect(CHECKOUT_DESCONTO_POPUP.videoaulas.checkoutUrl).toBe('https://pay.wiapy.com/lQ_YTlxm58Y')
    expect(CHECKOUT_DESCONTO_POPUP.etiquetas.checkoutUrl).toBe('https://pay.wiapy.com/jeJTPWSMvEk')
    expect(CHECKOUT_DESCONTO_POPUP.contafeita.checkoutUrl).toBe('https://pay.wiapy.com/1ZIbLmZpsgq')
  })
  it('os links de preço normal continuam os mesmos nas ofertas normais', () => {
    expect(PRODUTOS.videoaulas.checkoutUrl).toBe('https://pay.wiapy.com/6af1e13a04a3ce9b11749472')
    expect(PRODUTOS.etiquetas.checkoutUrl).toBe('https://pay.wiapy.com/6af20863371815cbecf6456a')
    expect(PRODUTOS.contafeita.checkoutUrl).toBe('https://pay.wiapy.com/6af2a90804a3ce9b119ec3a8')
  })
  it('desligada: nada aparece e nada é gravado no aparelho, nem logo depois de uma compra', () => {
    const m = armazenamento()
    expect(conferirPopup(eu(['kit']), false)).toBeNull()
    expect(conferirPopup(eu(['kit', 'etiquetas']), false)).toBeNull()
    expect(m.size).toBe(0)
  })
  it('ligada: compra nova abre o popup com o próximo; quem já tinha antes não recebe popup de compra antiga', () => {
    armazenamento()
    expect(conferirPopup(eu(['kit', 'etiquetas']))).toBeNull() // primeira vez: só guarda a base
    expect(conferirPopup(eu(['kit', 'etiquetas', 'videoaulas']))).toEqual({ comprado: 'videoaulas', oferta: 'contafeita' })
    expect(conferirPopup(eu(['kit', 'etiquetas', 'videoaulas']))).toBeNull()
  })
})

describe('preços com desconto (30%, arredondado para baixo até terminar em ,90)', () => {
  it('tabela', () => {
    expect(PRODUTOS.videoaulas.precoCentavos).toBe(1990)
    expect(PRODUTOS.etiquetas.precoCentavos).toBe(1290)
    expect(PRODUTOS.contafeita.precoCentavos).toBe(990)
    expect(CHECKOUT_DESCONTO_POPUP.videoaulas.precoCentavos).toBe(1390)
    expect(CHECKOUT_DESCONTO_POPUP.etiquetas.precoCentavos).toBe(890)
    expect(CHECKOUT_DESCONTO_POPUP.contafeita.precoCentavos).toBe(690)
    // confere com os do presente da primeira compra que já usavam a mesma regra
    expect(precoComDesconto(4700)).toBe(3290)
    expect(precoComDesconto(2700)).toBe(1890)
  })
  it('o desconto nunca fica menor que 30%', () => {
    for (const p of ['videoaulas', 'etiquetas', 'contafeita'] as UpsellPopup[]) {
      expect(CHECKOUT_DESCONTO_POPUP[p].precoCentavos).toBeLessThanOrEqual(PRODUTOS[p].precoCentavos * 0.7)
    }
  })
})

describe('o próximo upsell', () => {
  it('ordem fazer → apresentar → vender', () => {
    expect(PROXIMO.videoaulas).toEqual(['etiquetas', 'contafeita'])
    expect(PROXIMO.etiquetas).toEqual(['contafeita', 'videoaulas'])
    expect(PROXIMO.contafeita).toEqual(['etiquetas', 'videoaulas'])
  })
  it('pula o que ela já tem, o que não está à venda e o que não tem checkout com desconto', () => {
    const l = comLinks()
    expect(proximoUpsell('videoaulas', ['kit', 'videoaulas'], todos, l)).toBe('etiquetas')
    expect(proximoUpsell('videoaulas', ['kit', 'videoaulas', 'etiquetas'], todos, l)).toBe('contafeita')
    expect(proximoUpsell('etiquetas', ['kit', 'etiquetas'], todos, l)).toBe('contafeita')
    expect(proximoUpsell('contafeita', ['kit', 'contafeita'], todos, l)).toBe('etiquetas')
    expect(proximoUpsell('contafeita', ['kit', 'contafeita'], (p) => p !== 'etiquetas', l)).toBe('videoaulas')
    expect(proximoUpsell('contafeita', ['kit', 'contafeita'], todos, { ...l, etiquetas: { ...l.etiquetas, checkoutUrl: '' } })).toBe('videoaulas')
    expect(proximoUpsell('contafeita', ['kit', 'contafeita'], todos)).toBe('etiquetas') // com os links reais
  })
  it('já tem todos: nada', () => {
    const tudo: ProdutoId[] = ['kit', 'videoaulas', 'etiquetas', 'contafeita']
    for (const p of ['videoaulas', 'etiquetas', 'contafeita'] as UpsellPopup[]) expect(proximoUpsell(p, tudo, todos, comLinks())).toBeNull()
  })
  it('a copy não tem escassez, cronômetro nem número de ganho', () => {
    const tudo = Object.values(COPY_POPUP).flatMap((c) => [c.titulo, c.texto, c.botao, ...c.itens]).join(' ').toLowerCase()
    expect(tudo).not.toMatch(/últim|acaba|expira|só hoje|só agora|minuto|\d+ ?h(oras?)?\b|vagas|lucr|ganhe r\$|fature|renda/)
  })
})

describe('uma vez por compra', () => {
  it('primeira vez só guarda a base: compra antiga não ganha popup', () => {
    const a = compraNova(['kit', 'etiquetas'], null)
    expect(a.comprado).toBeNull()
    expect(a.memoria).toEqual({ base: ['etiquetas'], mostrados: [] })
  })
  it('compra nova aparece uma vez e fica marcada', () => {
    const base = { base: [] as ProdutoId[], mostrados: [] as ProdutoId[] }
    const a = compraNova(['kit', 'contafeita'], base)
    expect(a.comprado).toBe('contafeita')
    const b = compraNova(['kit', 'contafeita'], a.memoria)
    expect(b.comprado).toBeNull()
    const c = compraNova(['kit', 'contafeita', 'etiquetas'], b.memoria)
    expect(c.comprado).toBe('etiquetas')
  })
  it('no aparelho: com a chave ligada, aparece uma vez e não repete', () => {
    armazenamento()
    const salvo = CHECKOUT_DESCONTO_POPUP.etiquetas.checkoutUrl
    CHECKOUT_DESCONTO_POPUP.etiquetas.checkoutUrl = 'https://pay.wiapy.com/E'
    try {
      expect(conferirPopup(eu(['kit']), true)).toBeNull()
      expect(conferirPopup(eu(['kit', 'videoaulas']), true)).toEqual({ comprado: 'videoaulas', oferta: 'etiquetas' })
      expect(conferirPopup(eu(['kit', 'videoaulas']), true)).toBeNull()
    } finally {
      CHECKOUT_DESCONTO_POPUP.etiquetas.checkoutUrl = salvo
    }
  })
})

describe('webhook pronto para os checkouts com desconto', () => {
  const pago = (checkout: string, produto: string) => ({ customer: { email: 'c@x.com' }, checkout: { id: checkout, amount: 890 }, payment: { id: 'p', status: 'paid', amount: 890, payment_method: 'pix' }, products: [{ id: produto, title: 'x' }] })
  it('vazios: nada muda', () => {
    expect(lerPedido(pago('novo-checkout', 'novo-conteudo') as never).produtos).toEqual([])
  })
  it('preenchidos: o checkout e o conteúdo com desconto contam como o mesmo produto', () => {
    const e = CHECKOUT_DESCONTO_POPUP.etiquetas
    e.checkoutIds.push('desc-checkout-etq'); e.produtoIds.push('desc-conteudo-etq')
    try {
      expect(produtoDoCheckout('desc-checkout-etq')).toBe('etiquetas')
      expect(lerPedido(pago('desc-checkout-etq', 'qualquer') as never).produtos).toEqual(['etiquetas'])
      expect(lerPedido(pago('qualquer', 'desc-conteudo-etq') as never).produtos).toEqual(['etiquetas'])
    } finally {
      e.checkoutIds.splice(e.checkoutIds.indexOf('desc-checkout-etq'), 1); e.produtoIds.splice(e.produtoIds.indexOf('desc-conteudo-etq'), 1)
    }
  })

  // os checkouts com desconto vão ser criados em cima dos MESMOS conteúdos que já existem (Levi, 10/11)
  const CONTEUDOS: Record<UpsellPopup, string> = { videoaulas: '6af1e083371815cbecec6d54', etiquetas: '6af207d3371815cbecf61968', contafeita: '6af2a8a304a3ce9b119ebf8d' }
  const EXEMPLO_CHECKOUT: Record<UpsellPopup, string> = { videoaulas: 'exemplo-desc-aulas-1390', etiquetas: 'exemplo-desc-etq-890', contafeita: 'exemplo-desc-conta-690' }
  const valor: Record<UpsellPopup, number> = { videoaulas: 1390, etiquetas: 890, contafeita: 690 }
  const pedidoDesc = (p: UpsellPopup, conteudo: string, checkout: string) => ({ customer: { email: 'c@x.com' }, checkout: { id: checkout, amount: valor[p] }, payment: { id: 'pg-' + p, status: 'paid', amount: valor[p], payment_method: 'pix' }, products: [{ id: conteudo, title: PRODUTOS[p].nome }] })
  it('os conteúdos reais são os do catálogo', () => {
    for (const p of UPSELLS as UpsellPopup[]) expect(PRODUTOS[p].produtoIds).toContain(CONTEUDOS[p])
  })
  it('mesmo conteúdo + checkout com desconto (ainda não cadastrado): já vira o produto certo, pelo id do conteúdo', () => {
    for (const p of UPSELLS as UpsellPopup[]) {
      const r = lerPedido(pedidoDesc(p, CONTEUDOS[p], EXEMPLO_CHECKOUT[p]) as never)
      expect(r.produtos).toEqual([p])
      expect(r.valorCentavos).toBe(valor[p])
    }
  })
  it('checkout com desconto cadastrado: vira o produto certo pelo checkoutId, mesmo sem o conteúdo no pedido', () => {
    for (const p of UPSELLS as UpsellPopup[]) CHECKOUT_DESCONTO_POPUP[p].checkoutIds.push(EXEMPLO_CHECKOUT[p])
    try {
      for (const p of UPSELLS as UpsellPopup[]) {
        expect(produtoDoCheckout(EXEMPLO_CHECKOUT[p])).toBe(p)
        expect(lerPedido(pedidoDesc(p, 'conteudo-que-nao-veio', EXEMPLO_CHECKOUT[p]) as never).produtos).toEqual([p])
        expect(lerPedido(pedidoDesc(p, CONTEUDOS[p], EXEMPLO_CHECKOUT[p]) as never).produtos).toEqual([p]) // os dois juntos: um produto só
      }
    } finally {
      for (const p of UPSELLS as UpsellPopup[]) CHECKOUT_DESCONTO_POPUP[p].checkoutIds.splice(CHECKOUT_DESCONTO_POPUP[p].checkoutIds.indexOf(EXEMPLO_CHECKOUT[p]), 1)
    }
  })
  it('a compra com desconto libera o produto certo, e só ele', () => {
    expect(podeVerAulasCom(['kit', 'videoaulas'], 'venda')).toBe(true)
    expect(tem(eu(['kit', 'etiquetas']), 'etiquetas')).toBe(true)
    expect(tem(eu(['kit', 'etiquetas']), 'contafeita')).toBe(false)
    expect(tem(eu(['kit', 'contafeita']), 'contafeita')).toBe(true)
    expect(podeVerAulasCom(['kit', 'etiquetas', 'contafeita'], 'venda')).toBe(false)
  })

  // ofertas especiais: o checkoutId e o conteúdo são os MESMOS do preço normal, só o valor pago muda
  it('compra pela oferta especial (mesmo checkoutId e conteúdo, valor com desconto) libera o produto certo e registra o valor pago', () => {
    const casos: [UpsellPopup, string, string, number][] = [
      ['videoaulas', '6af1e13a04a3ce9b11749472', '6af1e083371815cbecec6d54', 1390],
      ['etiquetas', '6af20863371815cbecf6456a', '6af207d3371815cbecf61968', 890],
      ['contafeita', '6af2a90804a3ce9b119ec3a8', '6af2a8a304a3ce9b119ebf8d', 690],
    ]
    for (const [p, checkout, conteudo, v] of casos) {
      const ped = { customer: { email: 'c@x.com' }, checkout: { id: checkout, amount: v }, payment: { id: 'pg', status: 'paid', amount: v, payment_method: 'pix' }, products: [{ id: conteudo, title: PRODUTOS[p].nome }] }
      const r = lerPedido(ped as never)
      expect(r.produtos).toEqual([p])
      expect(r.valorCentavos).toBe(v)
      expect(r.status).toBe('pago')
      // só pelo checkoutId (sem o conteúdo) e pelo código do link
      expect(lerPedido({ ...ped, products: [] } as never).produtos).toEqual([p])
      expect(produtoDoCheckout(CHECKOUT_DESCONTO_POPUP[p].checkoutUrl.split('/').pop()!)).toBe(p)
    }
  })
})
