import { describe, expect, it } from 'vitest'
import { descontoDe } from '../shared/desconto'

const t = (iso: string) => Date.parse(iso)
describe('presente da primeira compra', () => {
  const kit = { produto: 'kit', status: 'pago', criado_em: '2026-11-09T10:00:00Z', pagamento_id: 'a' }
  it('vale 3 h depois da primeira compra de um extra', () => {
    const c = [kit, { produto: 'encomenda', status: 'pago', criado_em: '2026-11-09T11:00:00Z', atualizado_em: '2026-11-09T11:05:00Z', pagamento_id: 'b' }]
    expect(descontoDe(c, t('2026-11-09T12:00:00Z'))).toEqual({ pct: 30, ate: '2026-11-09T14:00:00.000Z' })
    expect(descontoDe(c, t('2026-11-09T14:01:00Z'))).toBeNull()
  })
  it('bump junto com o kit e presente de moedas não contam', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', criado_em: '2026-11-09T10:00:00Z', pagamento_id: 'a' }, { produto: 'primeira', status: 'pago', criado_em: '2026-11-09T10:30:00Z', metodo: 'presente', pagamento_id: 'p' }]
    expect(descontoDe(c, t('2026-11-09T10:40:00Z'))).toBeNull()
  })
  it('acaba quando ela usa (segunda compra de extra)', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', criado_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }, { produto: 'encomenda', status: 'pago', criado_em: '2026-11-09T11:30:00Z', pagamento_id: 'c' }]
    expect(descontoDe(c, t('2026-11-09T11:40:00Z'))).toBeNull()
  })
  it('pendente não conta', () => {
    expect(descontoDe([{ produto: 'encomenda', status: 'pendente', criado_em: '2026-11-09T11:00:00Z' }], t('2026-11-09T11:10:00Z'))).toBeNull()
  })
})

describe('presente de 30% sem checkout com desconto', () => {
  it('não mostra preço riscado nem aviso enquanto o checkout com desconto não existir', async () => {
    const { precoPresente, ganhaPresente } = await import('../src/ctx')
    const { PRECO_PRESENTE } = await import('../shared/desconto')
    const eu = { acesso: { produtos: ['kit'], pendentes: [], materiais: [], desconto: { pct: 30, ate: new Date(Date.now() + 3600e3).toISOString() }, ganhaPresente: true } } as never
    expect(Object.values(PRECO_PRESENTE).every((x) => !x?.checkoutUrl)).toBe(true)
    expect(precoPresente(eu, 'encomenda')).toBeNull()
    expect(ganhaPresente(eu, 'encomenda')).toBe(false)
  })
})
