import { describe, expect, it } from 'vitest'
import { lerJsonTolerante, lerPedido, produtoDoCheckout, semDadosPessoais } from '../server/wiapy'

const base = (over: Record<string, unknown> = {}) => ({
  customer: { email: 'Maria@Gmail.com ', name: 'Maria' },
  checkout: { id: 'r2PHgYwK6CVi', amount: 3790, orderbump: [] },
  payment: { id: 'pay_1', status: 'paid', amount: 3790, payment_method: 'pix' },
  products: [{ id: 'p1', title: 'Fábrica de Panetones' }],
  ...over,
})

describe('webhook da Wiapy', () => {
  it('reconhece o kit pago no PIX', () => {
    const p = lerPedido(base())
    expect(p).toMatchObject({ tipo: 'pagamento', status: 'pago', email: 'maria@gmail.com', produtos: ['kit'], metodo: 'pix', valorCentavos: 3790 })
  })
  it('kit + bump dos Recheios pelo título do orderbump', () => {
    const p = lerPedido(base({ checkout: { id: 'r2PHgYwK6CVi', orderbump: [{ id: 'x', title: '10 Recheios que Mais Vendem' }] } }))
    expect(p.produtos).toEqual(['kit', 'recheios'])
  })
  it('kit + bump pelo valor total de R$45,80', () => {
    const p = lerPedido(base({ payment: { id: 'pay_2', status: 'paid', amount: 4580 } }))
    expect(p.produtos).toEqual(['kit', 'recheios'])
  })
  it('Recheios avulso pelo checkout próprio', () => {
    for (const id of ['lNDHn0qgGdy7', '6af0613b371815cbeca7ea24']) {
      const p = lerPedido(base({ checkout: { id, amount: 790 }, payment: { id: 'pay_r', status: 'paid', amount: 790 }, products: [{ id, title: 'Produto' }] }))
      expect(p.produtos).toEqual(['recheios'])
    }
  })
  it('kit + bump dos Recheios pelo id do produto, sem depender do título', () => {
    const p = lerPedido(base({ checkout: { id: 'r2PHgYwK6CVi', orderbump: [{ id: '6af0613b371815cbeca7ea24', title: 'Bump' }] } }))
    expect(p.produtos).toEqual(['kit', 'recheios'])
  })
  it('upsell e downsell pelo id do checkout', () => {
    expect(produtoDoCheckout('6aee79cc4fbe72f8a1685733')).toBe('encomenda')
    expect(produtoDoCheckout('6aee7b90371815cbec6a481c')).toBe('primeira')
    expect(produtoDoCheckout('outro')).toBeNull()
  })
  it('PIX gerado e não pago fica pendente; estorno e chargeback tiram o acesso', () => {
    expect(lerPedido(base({ payment: { id: 'a', status: 'unpaid' } })).status).toBe('pendente')
    expect(lerPedido(base({ payment: { id: 'a', status: 'refunded' } })).status).toBe('estornado')
    expect(lerPedido(base({ payment: { id: 'a', status: 'chargedback' } })).status).toBe('estornado')
  })
  it('carrinho abandonado não libera nada', () => {
    expect(lerPedido(base({ payment: null })).tipo).toBe('abandono')
  })
  it('lê o JSON da documentação com vírgula faltando', () => {
    expect(lerJsonTolerante('{\n "a": 1\n "b": "x",\n}')).toEqual({ a: 1, b: 'x' })
  })
  it('tira dados pessoais do corpo guardado', () => {
    expect(semDadosPessoais({ customer: { email: 'a@b.c', name: 'A' }, payment: { status: 'paid' } })).toEqual({ customer: { email: '***', name: '***' }, payment: { status: 'paid' } })
  })
})
