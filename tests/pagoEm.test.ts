// Prazo de 3 h conta da APROVAÇÃO do pagamento (compras.pago_em), nunca do PIX gerado (Levi, 10/11).
// Roda o webhook de verdade (api/webhook/wiapy.ts) contra uma tabela compras em memória, e depois o /api/eu (acessoDe).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Linha = Record<string, unknown>
const banco = { compras: [] as Linha[], semColuna: false }

// tabela "compras" em memória com o pedaço da API do supabase-js que o webhook e o acesso usam
function tabela(nome: string) {
  const filtros: [string, unknown][] = []
  let colunas = '*'
  const linhas = () => (nome === 'compras' ? banco.compras : []).filter((l) => filtros.every(([k, v]) => l[k] === v))
  const erroColuna = () => ({ data: null, error: { code: '42703', message: 'column compras.pago_em does not exist' } })
  const q = {
    select(c: string) { colunas = c; return q },
    eq(k: string, v: unknown) { filtros.push([k, v]); return q },
    limit() { return q },
    then(ok: (r: unknown) => unknown, falhou?: (e: unknown) => unknown) {
      if (banco.semColuna && colunas.includes('pago_em')) return Promise.resolve(erroColuna()).then(ok, falhou)
      const cs = colunas.split(',')
      return Promise.resolve({ data: linhas().map((l) => Object.fromEntries(cs.map((k) => [k, l[k] ?? null]))), error: null }).then(ok, falhou)
    },
    async upsert(novas: Linha[]) {
      if (banco.semColuna && novas.some((n) => 'pago_em' in n)) return { error: { code: 'PGRST204', message: "Could not find the 'pago_em' column" } }
      for (const n of novas) {
        const i = banco.compras.findIndex((l) => l.pagamento_id === n.pagamento_id && l.produto === n.produto)
        if (i >= 0) banco.compras[i] = { ...banco.compras[i], ...n }
        else banco.compras.push({ criado_em: n.atualizado_em, pago_em: null, ...n })
      }
      return { error: null }
    },
    async insert() { return { error: null } },
  }
  return q
}
vi.mock('../server/db', () => ({ db: () => ({ from: tabela }) }))

const { POST } = await import('../api/webhook/wiapy')
const { acessoDe } = await import('../server/acesso')

const EMAIL = 'maria@x.com'
const aviso = (status: string, extra: Record<string, unknown> = {}) =>
  POST(new Request('https://app/api/webhook/wiapy', {
    method: 'POST',
    headers: { authorization: 'Bearer tok' },
    body: JSON.stringify({
      customer: { email: EMAIL },
      checkout: { id: '6af1e13a04a3ce9b11749472' },
      payment: { id: 'pix_1', status, amount: 1990, payment_method: 'pix', ...extra },
      products: [{ id: 'x', title: 'Aulas' }],
    }),
  }))
const relogio = (iso: string) => vi.setSystemTime(new Date(iso))
const comprarKit = () => banco.compras.push({ email: EMAIL, produto: 'kit', status: 'pago', pagamento_id: 'kit', pago_em: '2026-11-10T08:00:00.000Z', criado_em: '2026-11-10T08:00:00.000Z' })

beforeEach(() => {
  banco.compras = []
  banco.semColuna = false
  vi.useFakeTimers()
  vi.stubEnv('WIAPY_WEBHOOK_TOKEN', 'tok')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('prazo de 3 h a partir do pagamento APROVADO', () => {
  it('PIX gerado às 10h e pago às 11h: o prazo conta das 11h (vale até 14h), não da geração', async () => {
    comprarKit()
    relogio('2026-11-10T10:00:00Z')
    expect((await aviso('pending')).status).toBe(200)
    const pendente = banco.compras.find((c) => c.produto === 'videoaulas')
    expect(pendente?.status).toBe('pendente')
    expect(pendente?.pago_em).toBeNull() // PIX gerado não inicia o prazo
    expect((await acessoDe(EMAIL)).desconto).toBeNull()

    relogio('2026-11-10T11:00:00Z')
    await aviso('paid')
    expect(banco.compras.find((c) => c.produto === 'videoaulas')?.pago_em).toBe('2026-11-10T11:00:00.000Z')
    const a = await acessoDe(EMAIL)
    expect(a.desconto).toEqual({ pct: 30, ate: '2026-11-10T14:00:00.000Z' })
    expect(a.popup?.ate).toBe('2026-11-10T14:00:00.000Z')

    // 13h30: pela geração do PIX já teria acabado (13h); pelo pagamento ainda vale
    relogio('2026-11-10T13:30:00Z')
    expect((await acessoDe(EMAIL)).desconto?.ate).toBe('2026-11-10T14:00:00.000Z')
    relogio('2026-11-10T14:00:01Z')
    expect((await acessoDe(EMAIL)).desconto).toBeNull()
  })

  it('aprovação com horário no webhook: usa o horário de aprovação', async () => {
    comprarKit()
    relogio('2026-11-10T11:02:00Z') // o aviso chega 2 min depois da aprovação
    await aviso('paid', { paid_at: '2026-11-10 08:00:00' }) // sem fuso = Brasília (11:00 UTC)
    expect(banco.compras.find((c) => c.produto === 'videoaulas')?.pago_em).toBe('2026-11-10T11:00:00.000Z')
    const a = await acessoDe(EMAIL)
    expect(a.desconto?.ate).toBe('2026-11-10T14:00:00.000Z')
    expect(a.popup?.ate).toBe('2026-11-10T14:00:00.000Z')
  })

  it('aprovação sem horário: usa a hora em que o app recebeu o aviso de pago', async () => {
    comprarKit()
    relogio('2026-11-10T11:07:00Z')
    await aviso('paid')
    expect(banco.compras.find((c) => c.produto === 'videoaulas')?.pago_em).toBe('2026-11-10T11:07:00.000Z')
    expect((await acessoDe(EMAIL)).desconto?.ate).toBe('2026-11-10T14:07:00.000Z')
  })

  it('reenvio do aviso de pago não reabre o prazo', async () => {
    comprarKit()
    relogio('2026-11-10T11:00:00Z')
    await aviso('paid')
    relogio('2026-11-10T13:00:00Z')
    await aviso('paid')
    await aviso('paid', { paid_at: '2026-11-10T12:59:00Z' })
    expect(banco.compras.find((c) => c.produto === 'videoaulas')?.pago_em).toBe('2026-11-10T11:00:00.000Z')
  })

  it('horário de aprovação no futuro (relógio errado): usa a hora do recebimento', async () => {
    relogio('2026-11-10T11:00:00Z')
    await aviso('paid', { paid_at: '2026-11-10T15:00:00Z' })
    expect(banco.compras.find((c) => c.produto === 'videoaulas')?.pago_em).toBe('2026-11-10T11:00:00.000Z')
  })

  it('banco sem a coluna pago_em (migração não rodada): grava a compra e não dá desconto', async () => {
    banco.semColuna = true
    comprarKit()
    relogio('2026-11-10T11:00:00Z')
    expect((await aviso('paid')).status).toBe(200)
    expect(banco.compras.find((c) => c.produto === 'videoaulas')?.status).toBe('pago')
    const a = await acessoDe(EMAIL)
    expect(a.produtos).toContain('videoaulas')
    expect(a.desconto).toBeNull()
    expect(a.popup).toBeNull()
  })
})

describe('hora de aprovação no webhook', () => {
  it('lê ISO, "AAAA-MM-DD HH:mm:ss" (Brasília) e epoch; ignora created_at/updated_at e status não pago', async () => {
    const { lerPedido, lerHora } = await import('../server/wiapy')
    const corpo = (payment: Record<string, unknown>) => ({ customer: { email: EMAIL }, checkout: { id: '6af1e13a04a3ce9b11749472' }, payment: { id: 'p', amount: 1990, ...payment }, products: [] })
    expect(lerPedido(corpo({ status: 'paid', approved_at: '2026-11-10T11:00:00-03:00' })).aprovadoEm).toBe('2026-11-10T14:00:00.000Z')
    expect(lerPedido(corpo({ status: 'paid', paid_at: 1762772400 })).aprovadoEm).toBe(new Date(1762772400e3).toISOString())
    expect(lerPedido(corpo({ status: 'paid', created_at: '2026-11-10T10:00:00Z', updated_at: '2026-11-10T10:00:00Z' })).aprovadoEm).toBeNull()
    expect(lerPedido(corpo({ status: 'pending', paid_at: '2026-11-10T10:00:00Z' })).aprovadoEm).toBeNull()
    expect(lerHora('lixo')).toBeNull()
    expect(lerHora('')).toBeNull()
  })
})
