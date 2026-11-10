import { describe, expect, it } from 'vitest'
import { descontoDe } from '../shared/desconto'

const t = (iso: string) => Date.parse(iso)
describe('presente da primeira compra', () => {
  const kit = { produto: 'kit', status: 'pago', criado_em: '2026-11-09T10:00:00Z', pagamento_id: 'a' }
  it('vale depois da primeira compra de um extra, SEM prazo (o link com desconto não expira)', () => {
    const c = [kit, { produto: 'encomenda', status: 'pago', criado_em: '2026-11-09T11:00:00Z', atualizado_em: '2026-11-09T11:05:00Z', pagamento_id: 'b' }]
    expect(descontoDe(c, t('2026-11-09T12:00:00Z'))).toEqual({ pct: 30 })
    expect(descontoDe(c, t('2026-11-12T14:01:00Z'))).toEqual({ pct: 30 })
  })
  it('bump junto com o kit e presente de moedas não contam', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', criado_em: '2026-11-09T10:00:00Z', pagamento_id: 'a' }, { produto: 'primeira', status: 'pago', criado_em: '2026-11-09T10:30:00Z', metodo: 'presente', pagamento_id: 'p' }]
    expect(descontoDe(c, t('2026-11-09T10:40:00Z'))).toBeNull()
  })
  it('acaba quando ela usa (compra depois um material com desconto: Aulas, Etiquetas ou Conta Feita)', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', criado_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }, { produto: 'etiquetas', status: 'pago', criado_em: '2026-11-09T11:30:00Z', pagamento_id: 'c' }]
    expect(descontoDe(c, t('2026-11-09T11:40:00Z'))).toBeNull()
  })
  it('comprar depois um material SEM desconto (Encomenda) não gasta o presente', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', criado_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }, { produto: 'encomenda', status: 'pago', criado_em: '2026-11-09T11:30:00Z', pagamento_id: 'c' }]
    expect(descontoDe(c, t('2026-11-09T11:40:00Z'))).toEqual({ pct: 30 })
  })
  it('a primeira compra de um upsell do popup também abre o presente', () => {
    const c = [kit, { produto: 'etiquetas', status: 'pago', criado_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }]
    expect(descontoDe(c, t('2026-11-09T11:10:00Z'))).toEqual({ pct: 30 })
  })
  it('pendente não conta', () => {
    expect(descontoDe([{ produto: 'encomenda', status: 'pendente', criado_em: '2026-11-09T11:00:00Z' }], t('2026-11-09T11:10:00Z'))).toBeNull()
  })
})

describe('presente de 30% com os checkouts do popup', () => {
  const eu = (produtos: string[], extra: object = {}) => ({ email: 'm@x.com', acesso: { produtos, pendentes: [], materiais: [], desconto: null, ganhaPresente: true, ...extra } }) as never
  it('usa os 3 links de desconto do popup, com os mesmos preços', async () => {
    const { PRECO_PRESENTE } = await import('../shared/desconto')
    const { CHECKOUT_DESCONTO_POPUP } = await import('../shared/popupDesconto')
    expect(Object.keys(PRECO_PRESENTE).sort()).toEqual(['contafeita', 'etiquetas', 'videoaulas'])
    for (const p of ['videoaulas', 'etiquetas', 'contafeita'] as const) {
      expect(PRECO_PRESENTE[p]!.checkoutUrl).toBe(CHECKOUT_DESCONTO_POPUP[p].checkoutUrl)
      expect(PRECO_PRESENTE[p]!.precoCentavos).toBe(CHECKOUT_DESCONTO_POPUP[p].precoCentavos)
    }
    expect(PRECO_PRESENTE.etiquetas!.checkoutUrl).toBe('https://pay.wiapy.com/jeJTPWSMvEk')
  })
  it('preço com desconto nos 3, com os links do popup, sem prazo', async () => {
    const { precoPresente } = await import('../src/ctx')
    const e = eu(['kit', 'recheios'], { desconto: { pct: 30 } })
    expect(precoPresente(e, 'contafeita')).toEqual({ precoCentavos: 690, checkoutUrl: 'https://pay.wiapy.com/1ZIbLmZpsgq', checkoutIds: ['1ZIbLmZpsgq'], pct: 30 })
    expect(precoPresente(e, 'videoaulas')).toMatchObject({ precoCentavos: 1390, checkoutUrl: 'https://pay.wiapy.com/lQ_YTlxm58Y' })
    expect(precoPresente(e, 'encomenda')).toBeNull()
    const { textoFaixa } = await import('../src/ctx')
    expect(textoFaixa(eu(['kit', 'etiquetas']))).toBe('30% OFF em Aulas ou Conta Feita')
  })
  it('nenhum texto do presente fala em prazo, horas ou que o desconto acaba', async () => {
    const { textoPresente, textoFaixa } = await import('../src/ctx')
    const textos = [textoPresente(eu(['kit']), 'etiquetas'), textoPresente(eu(['kit'])), textoFaixa(eu(['kit']))]
    const fs = await import('node:fs')
    // o que aparece na tela (sem os comentários do código)
    textos.push(fs.readFileSync('src/telas/PresenteDesconto.tsx', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))
    for (const x of textos) expect(x).not.toMatch(/hora|acaba|termina|expira|prazo|só hoje|só agora|últim/i)
  })
  it('o aviso antes da compra volta e só promete o que ela ainda pode comprar com desconto', async () => {
    const { ganhaPresente, textoPresente } = await import('../src/ctx')
    expect(ganhaPresente(eu(['kit']), 'recheios')).toBe(true)
    expect(ganhaPresente(eu(['kit']), 'etiquetas')).toBe(true)
    expect(textoPresente(eu(['kit']), 'etiquetas')).toBe('Comprando este material, você ganha 30% OFF em mais um: nas Aulas em vídeo ou no Conta Feita.')
    expect(textoPresente(eu(['kit'])))
      .toBe('Comprando qualquer material daqui, você ganha 30% OFF em mais um (Aulas, Etiquetas ou Conta Feita).')
    // já tem os outros dois: comprar as Etiquetas não daria desconto em nada, então não há aviso
    expect(ganhaPresente(eu(['kit', 'videoaulas', 'contafeita']), 'etiquetas')).toBe(false)
    // já fez a primeira compra de extra: sem aviso
    expect(ganhaPresente(eu(['kit'], { ganhaPresente: false }), 'recheios')).toBe(false)
  })
})
