// Eventos de teste da Wiapy (user-agent "Wiapy Evento de Teste" ou produto "Produto de Teste Wiapy") nunca liberam nada.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ehEventoDeTeste } from '../server/wiapy'

const gravado = { upserts: [] as unknown[], eventos: [] as unknown[] }
vi.mock('../server/db', () => ({
  db: () => ({
    from: (tabela: string) => {
      const q = {
        select: () => q, eq: () => q, limit: () => q,
        then: (ok: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok),
        upsert: async (n: unknown[]) => { gravado.upserts.push(...n); return { error: null } },
        insert: async (n: unknown) => { if (tabela === 'eventos') gravado.eventos.push(n); return { error: null } },
      }
      return q
    },
  }),
}))
const { POST } = await import('../api/webhook/wiapy')

const corpo = (produtos = [{ id: '6af2fd6b371815cbec19ef04', title: 'Minha Fornada de Natal – Kit Fábrica de Panetones Caseiros' }]) => ({
  customer: { email: 'teste@wiapy.com', name: 'Teste' },
  checkout: { id: '6af307cb04a3ce9b11a7ea9c', amount: 4580, orderbump: [{ id: 'b', title: '10 Recheios que Mais Vendem' }] },
  payment: { id: 'pay_teste', status: 'paid', amount: 4580, payment_method: 'pix' },
  products: produtos,
})
const enviar = (c: unknown, ua = 'Wiapy/1.0') =>
  POST(new Request('https://app/api/webhook/wiapy', { method: 'POST', headers: { authorization: 'Bearer tok', 'user-agent': ua }, body: JSON.stringify(c) }))

beforeEach(() => { gravado.upserts = []; gravado.eventos = []; vi.stubEnv('WIAPY_WEBHOOK_TOKEN', 'tok') })
afterEach(() => vi.unstubAllEnvs())

describe('evento de teste da Wiapy', () => {
  it('reconhece pelo user-agent ou pelo produto de teste', () => {
    expect(ehEventoDeTeste('Wiapy Evento de Teste', corpo())).toBe(true)
    expect(ehEventoDeTeste('wiapy evento de teste/2.0', corpo())).toBe(true)
    expect(ehEventoDeTeste('Wiapy/1.0', corpo([{ id: 'x', title: 'Produto de Teste Wiapy' }]))).toBe(true)
    expect(ehEventoDeTeste(null, { checkout: { title: 'Produto de Teste Wiapy' } })).toBe(true)
    expect(ehEventoDeTeste('Wiapy/1.0', corpo())).toBe(false)
    expect(ehEventoDeTeste(undefined, null)).toBe(false)
  })
  it('user-agent de teste: 200, nada gravado em compras, só o registro do ignorado', async () => {
    const r = await enviar(corpo(), 'Wiapy Evento de Teste')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true, ignorado: 'teste' })
    expect(gravado.upserts).toEqual([])
    expect(gravado.eventos).toEqual([{ email: null, tipo: 'webhook.ignorado', dados: { motivo: 'evento de teste da Wiapy' } }])
  })
  it('produto de teste (mesmo com bump de recheios no pedido): não libera kit nem recheios', async () => {
    const r = await enviar(corpo([{ id: '6accab07c8bdfc2949d11bc6', title: 'Produto de Teste Wiapy' }]))
    expect(await r.json()).toEqual({ ok: true, ignorado: 'teste' })
    expect(gravado.upserts).toEqual([])
  })
  it('compra de verdade continua liberando (kit + recheios)', async () => {
    const r = await enviar(corpo())
    expect(await r.json()).toEqual({ ok: true, produtos: ['kit', 'recheios'], status: 'pago' })
    expect(gravado.upserts).toHaveLength(2)
  })
  it('token errado continua 401 antes de tudo', async () => {
    const r = await POST(new Request('https://app/api/webhook/wiapy', { method: 'POST', headers: { authorization: 'Bearer x', 'user-agent': 'Wiapy Evento de Teste' }, body: '{}' }))
    expect(r.status).toBe(401)
  })
})
