// Popup de desconto pós-compra: chave desligada não muda nada, preços com desconto, ordem do "próximo", uma vez por compra e webhook.
import { afterEach, describe, expect, it } from 'vitest'
import { PRODUTOS, type ProdutoId } from '../shared/catalogo'
import {
  CHECKOUT_DESCONTO_POPUP, POPUP_DESCONTO_LIGADO, PROXIMO, compraNova, precoComDesconto, proximoUpsell, type UpsellPopup,
} from '../shared/popupDesconto'
import { lerPedido, produtoDoCheckout } from '../server/wiapy'
import { COPY_POPUP, conferirPopup } from '../src/telas/PopupDesconto'

const eu = (produtos: string[]) => ({ email: 'm@x.com', acesso: { produtos, pendentes: [], materiais: [] } }) as never
const todos = () => true
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
  it('está desligada e os checkouts com desconto estão vazios', () => {
    expect(POPUP_DESCONTO_LIGADO).toBe(false)
    for (const p of ['videoaulas', 'etiquetas', 'contafeita'] as UpsellPopup[]) {
      expect(CHECKOUT_DESCONTO_POPUP[p]).toMatchObject({ checkoutUrl: '', checkoutIds: [], produtoIds: [] })
    }
  })
  it('desligada: nada aparece e nada é gravado no aparelho, nem logo depois de uma compra', () => {
    const m = armazenamento()
    expect(conferirPopup(eu(['kit']))).toBeNull()
    expect(conferirPopup(eu(['kit', 'etiquetas']))).toBeNull()
    expect(conferirPopup(eu(['kit', 'etiquetas']), false)).toBeNull()
    expect(m.size).toBe(0)
  })
  it('ligada mas sem checkout com desconto: a compra é marcada e nenhum popup aparece', () => {
    armazenamento()
    expect(conferirPopup(eu(['kit']), true)).toBeNull() // primeira vez: guarda a base
    expect(conferirPopup(eu(['kit', 'videoaulas']), true)).toBeNull()
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
    expect(proximoUpsell('contafeita', ['kit', 'contafeita'], todos)).toBeNull() // checkouts reais ainda vazios
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
      e.checkoutIds.length = 0; e.produtoIds.length = 0
    }
  })
})
