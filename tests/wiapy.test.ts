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

  // formato real (webhook_bruto, 08/11): checkout.id = id interno do checkout; products[].id = id de cada conteúdo
  const real = (checkoutId: string, produtos: string[], valor: number, orderbump: unknown[] = []) => ({
    customer: { email: 'cliente@x.com', name: 'C' },
    checkout: { id: checkoutId, amount: valor, orderbump },
    payment: { id: `pay_${checkoutId}_${produtos.join('_')}`, status: 'paid', amount: valor, payment_method: 'credit_card' },
    products: produtos.map((id) => ({ id, title: 'Produto' })),
  })
  it('formato real: kit + bump com os conteúdos do E-book e dos Recheios', () => {
    const p = lerPedido(real('6accaf7eb11ba1ecaf89b37e', ['6accab07c8bdfc2949d11bc6', '6ae587c02da3da6ee2a9dcbc'], 4580, [{ id: '6ae58834a57aeb7e182e52ba', title: 'Bump' }]))
    expect(p.produtos.sort()).toEqual(['kit', 'recheios'])
  })
  it('formato real: kit sozinho pelo conteúdo antigo do E-book', () => {
    expect(lerPedido(real('6accaf7eb11ba1ecaf89b37e', ['6accb04f9b597b6a2bd6a0f1'], 3790)).produtos).toEqual(['kit'])
  })
  it('formato real: bump reconhecido pelo id real do orderbump', () => {
    expect(lerPedido(real('6accaf7eb11ba1ecaf89b37e', ['6accab07c8bdfc2949d11bc6'], 3790, [{ id: '6ae58834a57aeb7e182e52ba', title: 'Oferta' }])).produtos).toEqual(['kit', 'recheios'])
  })
  it('upsell de 1 clique com o checkout.id do KIT e o conteúdo Encomenda App: libera só a Encomenda', () => {
    expect(lerPedido(real('6accaf7eb11ba1ecaf89b37e', ['6af1f38f371815cbecf1c105'], 4700)).produtos).toEqual(['encomenda'])
  })
  it('upsell com o checkout próprio e o conteúdo antigo', () => {
    expect(lerPedido(real('6aee79cc4fbe72f8a1685733', ['6aee7888b7632434c318aaa4'], 4700)).produtos).toEqual(['encomenda'])
  })
  it('downsell de 1 clique (checkout do kit ou desconhecido) com o conteúdo Primeira App: libera só a Primeira', () => {
    expect(lerPedido(real('6accaf7eb11ba1ecaf89b37e', ['6af1f3ee04a3ce9b117a12fb'], 2700)).produtos).toEqual(['primeira'])
    expect(lerPedido(real('id-que-nao-conheco', ['6aee7b444fbe72f8a1689b1f'], 2700)).produtos).toEqual(['primeira'])
  })
  it('pedido com vários itens libera todos', () => {
    expect(lerPedido(real('qualquer', ['6af1e083371815cbecec6d54', '6af1f38f371815cbecf1c105', '6ae587c02da3da6ee2a9dcbc'], 7460)).produtos.sort()).toEqual(['encomenda', 'recheios', 'videoaulas'])
  })
  it('checkout só como reserva: conteúdo desconhecido no checkout do upsell ainda libera pelo checkout', () => {
    expect(lerPedido(real('6aee79cc4fbe72f8a1685733', ['conteudo-novo-que-nao-conheco'], 4700)).produtos).toEqual(['encomenda'])
    expect(lerPedido(real('nada', ['nada'], 4700)).produtos).toEqual([])
  })
  it('upsell no checkout do kit não ganha Recheios por engano', () => {
    expect(lerPedido(real('6accaf7eb11ba1ecaf89b37e', ['6af1f38f371815cbecf1c105'], 4580)).produtos).toEqual(['encomenda'])
  })
})
