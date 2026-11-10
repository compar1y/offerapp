// Hotfix 10/11: a página de vendas vende o kit pelo checkout NOVO do app (o8Euxe-W2nPN / 6af307cb…).
// Pedido pago desse checkout libera o kit inteiro; o order bump libera os 10 Recheios. Ids antigos seguem valendo.
import { describe, expect, it, vi } from 'vitest'
import { lerPedido, produtoDoCheckout } from '../server/wiapy'
import { materiaisLiberados, PRODUTOS } from '../shared/catalogo'

const KIT_INTEIRO = PRODUTOS.kit.libera

const pedido = (over: { checkout?: Record<string, unknown>; products?: unknown[]; amount?: number } = {}) => ({
  customer: { email: 'Cliente@Gmail.com', name: 'C' },
  checkout: { id: '6af307cb04a3ce9b11a7ea9c', title: 'Minha Fornada de Natal', amount: over.amount ?? 3790, orderbump: [], ...over.checkout },
  payment: { id: 'pay_novo_1', status: 'paid', amount: over.amount ?? 3790, payment_method: 'pix', dt_create: '2026-11-10T13:00:00.000Z', dt_update: '2026-11-10T13:02:00.000Z' },
  products: over.products ?? [{ id: '6af2fd6b371815cbec19ef04', title: 'Minha Fornada de Natal – Kit Fábrica de Panetones Caseiros', type: 'external' }],
})

describe('checkout novo do kit', () => {
  it('catálogo: link novo e ids novos, sem perder os antigos', () => {
    expect(PRODUTOS.kit.checkoutUrl).toBe('https://pay.wiapy.com/o8Euxe-W2nPN')
    expect(PRODUTOS.kit.checkoutIds).toEqual(expect.arrayContaining(['o8Euxe-W2nPN', '6af307cb04a3ce9b11a7ea9c', 'r2PHgYwK6CVi', '6accaf7eb11ba1ecaf89b37e']))
    expect(PRODUTOS.kit.produtoIds).toEqual(expect.arrayContaining(['6af2fd6b371815cbec19ef04', '6accab07c8bdfc2949d11bc6', '6accb04f9b597b6a2bd6a0f1']))
    for (const id of ['o8Euxe-W2nPN', '6af307cb04a3ce9b11a7ea9c', 'r2PHgYwK6CVi', '6accaf7eb11ba1ecaf89b37e']) expect(produtoDoCheckout(id)).toBe('kit')
  })
  it('pago, pelo conteúdo novo: libera o kit inteiro', () => {
    const p = lerPedido(pedido())
    expect(p.tipo).toBe('pagamento')
    expect(p.status).toBe('pago')
    expect(p.email).toBe('cliente@gmail.com')
    expect(p.produtos).toEqual(['kit'])
    expect(materiaisLiberados(p.produtos)).toEqual(expect.arrayContaining(KIT_INTEIRO))
  })
  it('pago, só pelo id do checkout (código do link ou id interno), sem conteúdo conhecido: libera o kit', () => {
    for (const id of ['6af307cb04a3ce9b11a7ea9c', 'o8Euxe-W2nPN']) expect(lerPedido(pedido({ checkout: { id }, products: [{ id: 'desconhecido', title: 'X' }] })).produtos).toEqual(['kit'])
  })
  it('com o order bump dos 10 Recheios: libera kit + recheios (pelo conteúdo, pelo título do bump e pelo valor)', () => {
    const porConteudo = lerPedido(pedido({ amount: 4580, products: [{ id: '6af2fd6b371815cbec19ef04', title: 'Kit' }, { id: '6ae587c02da3da6ee2a9dcbc', title: '10 Recheios que Mais Vendem' }] }))
    expect(porConteudo.produtos.sort()).toEqual(['kit', 'recheios'])
    const porTitulo = lerPedido(pedido({ checkout: { orderbump: [{ id: 'bump-novo', title: '10 Recheios que Mais Vendem', amount: 790 }] } }))
    expect(porTitulo.produtos.sort()).toEqual(['kit', 'recheios'])
    const porValor = lerPedido(pedido({ amount: 4580, checkout: { orderbump: [{ id: 'bump-novo', title: 'Oferta especial', amount: 790 }] } }))
    expect(porValor.produtos.sort()).toEqual(['kit', 'recheios'])
    expect(materiaisLiberados(porTitulo.produtos)).toEqual(expect.arrayContaining([...KIT_INTEIRO, 'recheios']))
  })
  it('sem bump: não libera recheios', () => {
    expect(lerPedido(pedido()).produtos).not.toContain('recheios')
  })
})

// webhook de ponta a ponta (api/webhook/wiapy.ts) com o banco em memória: grava as linhas pagas
const linhas: Record<string, unknown>[] = []
vi.mock('../server/db', () => ({
  db: () => ({
    from: () => {
      const q = {
        select: () => q, eq: () => q, limit: () => q,
        then: (ok: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok),
        upsert: async (n: Record<string, unknown>[]) => { linhas.push(...n); return { error: null } },
        insert: async () => ({ error: null }),
      }
      return q
    },
  }),
}))

describe('webhook do checkout novo (simulado)', () => {
  it('pago com bump: grava kit e recheios como pagos', async () => {
    vi.stubEnv('WIAPY_WEBHOOK_TOKEN', 'tok')
    const { POST } = await import('../api/webhook/wiapy')
    const corpo = pedido({ checkout: { orderbump: [{ id: 'bump-novo', title: '10 Recheios que Mais Vendem', amount: 790 }] }, amount: 4580 })
    const r = await POST(new Request('https://app/api/webhook/wiapy', { method: 'POST', headers: { authorization: 'Bearer tok' }, body: JSON.stringify(corpo) }))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true, produtos: ['kit', 'recheios'], status: 'pago' })
    expect(linhas.map((l) => [l.produto, l.status, l.checkout_id])).toEqual([['kit', 'pago', '6af307cb04a3ce9b11a7ea9c'], ['recheios', 'pago', '6af307cb04a3ce9b11a7ea9c']])
    vi.unstubAllEnvs()
  })
})
