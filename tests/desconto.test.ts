import { describe, expect, it } from 'vitest'
import { descontoDe, popupDe } from '../shared/desconto'
import { descontosAgora, LINKS_DESCONTO } from '../server/descontoLinks'

const t = (iso: string) => Date.parse(iso)
const kit = { produto: 'kit', status: 'pago', pago_em: '2026-11-09T10:00:00Z', pagamento_id: 'a' }

describe('presente da primeira compra: prazo REAL de 3 h a partir da compra gravada pelo webhook', () => {
  it('compra recente: vale, com o fim do prazo 3 h depois da compra (pago_em, a aprovação; não o reenvio do webhook)', () => {
    const c = [kit, { produto: 'encomenda', status: 'pago', pago_em: '2026-11-09T11:00:00Z', atualizado_em: '2026-11-09T11:05:00Z', pagamento_id: 'b' }]
    expect(descontoDe(c, t('2026-11-09T12:00:00Z'))).toEqual({ pct: 30, ate: '2026-11-09T14:00:00.000Z' })
    expect(descontoDe(c, t('2026-11-09T13:59:59Z'))).toEqual({ pct: 30, ate: '2026-11-09T14:00:00.000Z' })
  })
  it('compra com mais de 3 h: acabou', () => {
    const c = [kit, { produto: 'encomenda', status: 'pago', pago_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }]
    expect(descontoDe(c, t('2026-11-09T14:00:00Z'))).toBeNull()
    expect(descontoDe(c, t('2026-11-12T09:00:00Z'))).toBeNull()
  })
  it('cliente sem hora de compra registrada: sem desconto (não dá para provar o prazo)', () => {
    expect(descontoDe([kit, { produto: 'encomenda', status: 'pago', pago_em: null, pagamento_id: 'b' }], t('2026-11-09T12:00:00Z'))).toBeNull()
    expect(descontoDe([kit, { produto: 'encomenda', status: 'pago', pagamento_id: 'b' }], t('2026-11-09T12:00:00Z'))).toBeNull()
    expect(descontoDe([kit, { produto: 'encomenda', status: 'pago', pago_em: 'lixo', pagamento_id: 'b' }], t('2026-11-09T12:00:00Z'))).toBeNull()
  })
  it('bump junto com o kit e presente de moedas não contam', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', pago_em: '2026-11-09T10:00:00Z', pagamento_id: 'a' }, { produto: 'primeira', status: 'pago', pago_em: '2026-11-09T10:30:00Z', metodo: 'presente', pagamento_id: 'p' }]
    expect(descontoDe(c, t('2026-11-09T10:40:00Z'))).toBeNull()
  })
  it('acaba quando ela usa (compra depois um material com desconto: Aulas, Etiquetas ou Conta Feita)', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', pago_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }, { produto: 'etiquetas', status: 'pago', pago_em: '2026-11-09T11:30:00Z', pagamento_id: 'c' }]
    expect(descontoDe(c, t('2026-11-09T11:40:00Z'))).toBeNull()
  })
  it('comprar depois um material SEM desconto (Encomenda) não gasta nem renova o presente', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', pago_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }, { produto: 'encomenda', status: 'pago', pago_em: '2026-11-09T11:30:00Z', pagamento_id: 'c' }]
    expect(descontoDe(c, t('2026-11-09T11:40:00Z'))).toEqual({ pct: 30, ate: '2026-11-09T14:00:00.000Z' })
  })
  it('pendente não conta', () => {
    expect(descontoDe([{ produto: 'encomenda', status: 'pendente', criado_em: '2026-11-09T11:00:00Z' }], t('2026-11-09T11:10:00Z'))).toBeNull()
  })
})

describe('popup pós-compra: 3 h a partir da compra do upsell', () => {
  it('compra recente de upsell: popup com o próximo, até 3 h depois dessa compra', () => {
    const c = [kit, { produto: 'recheios', status: 'pago', pago_em: '2026-11-09T08:00:00Z', pagamento_id: 'r' }, { produto: 'etiquetas', status: 'pago', pago_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }]
    expect(popupDe(c, t('2026-11-09T11:01:00Z'))).toEqual({ comprado: 'etiquetas', ate: '2026-11-09T14:00:00.000Z' })
  })
  it('mais de 3 h: nada; sem hora registrada: nada', () => {
    expect(popupDe([kit, { produto: 'etiquetas', status: 'pago', pago_em: '2026-11-09T11:00:00Z', pagamento_id: 'b' }], t('2026-11-09T14:00:01Z'))).toBeNull()
    expect(popupDe([kit, { produto: 'etiquetas', status: 'pago', pago_em: null, pagamento_id: 'b' }], t('2026-11-09T11:01:00Z'))).toBeNull()
  })
})

describe('servidor: os links com desconto só saem enquanto o prazo vale', () => {
  const recheios = { produto: 'recheios', status: 'pago', pago_em: '2026-11-09T11:00:00Z', pagamento_id: 'r' }
  it('compra recente: os 3 links (os que ela não tem), com preço e fim do prazo', () => {
    const r = descontosAgora([kit, recheios], ['kit', 'recheios'], t('2026-11-09T12:00:00Z'))
    expect(r.desconto).toEqual({ pct: 30, ate: '2026-11-09T14:00:00.000Z' })
    expect(r.ofertasDesconto.etiquetas).toEqual({ checkoutUrl: 'https://pay.wiapy.com/jeJTPWSMvEk', precoCentavos: 890, pct: 30, ate: '2026-11-09T14:00:00.000Z' })
    expect(r.ofertasDesconto.contafeita?.checkoutUrl).toBe('https://pay.wiapy.com/1ZIbLmZpsgq')
    expect(r.ofertasDesconto.videoaulas?.precoCentavos).toBe(1390)
  })
  it('compra com mais de 3 h: nenhum link, nenhum popup', () => {
    const r = descontosAgora([kit, recheios], ['kit', 'recheios'], t('2026-11-09T14:00:00Z'))
    expect(r).toEqual({ desconto: null, popup: null, ofertasDesconto: {} })
    expect(JSON.stringify(r)).not.toMatch(/wiapy/)
  })
  it('cliente sem hora de compra: nenhum link, nenhum popup', () => {
    const r = descontosAgora([kit, { ...recheios, pago_em: null }, { produto: 'etiquetas', status: 'pago', pago_em: null, pagamento_id: 'e' }], ['kit', 'recheios', 'etiquetas'], t('2026-11-09T12:00:00Z'))
    expect(r).toEqual({ desconto: null, popup: null, ofertasDesconto: {} })
  })
  it('popup de upsell: 3 h contadas a partir da compra do upsell, mesmo depois do presente acabar', () => {
    // presente da primeira compra (recheios às 08h) já acabou às 11h; a compra das Etiquetas às 12h abre o popup até 15h
    const c = [kit, { ...recheios, pago_em: '2026-11-09T08:00:00Z' }, { produto: 'etiquetas', status: 'pago', pago_em: '2026-11-09T12:00:00Z', pagamento_id: 'e' }]
    const r = descontosAgora(c, ['kit', 'recheios', 'etiquetas'], t('2026-11-09T12:30:00Z'))
    expect(r.desconto).toBeNull()
    expect(r.popup).toEqual({ comprado: 'etiquetas', oferta: 'contafeita', ate: '2026-11-09T15:00:00.000Z' })
    expect(Object.keys(r.ofertasDesconto)).toEqual(['contafeita'])
    expect(descontosAgora(c, ['kit', 'recheios', 'etiquetas'], t('2026-11-09T15:00:00Z')).ofertasDesconto).toEqual({})
  })
})

describe('os links com desconto não vão para o app', () => {
  it('nenhum arquivo do navegador (src/, shared/, index.html, public/) tem os links ou os códigos deles', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const codigos = Object.values(LINKS_DESCONTO).flatMap((l) => [l.checkoutUrl.split('/').pop()!, ...l.checkoutIds])
    const arquivos = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? arquivos(path.join(d, e.name)) : /\.(ts|tsx|js|html|json|css)$/.test(e.name) ? [path.join(d, e.name)] : [])
    for (const f of [...arquivos('src'), ...arquivos('shared'), 'index.html']) {
      const txt = fs.readFileSync(f, 'utf8')
      for (const c of codigos) expect(txt.includes(c), `${c} em ${f}`).toBe(false)
    }
  })
})

describe('textos do presente no app', () => {
  const eu = (produtos: string[], extra: object = {}) => ({ email: 'm@x.com', acesso: { produtos, pendentes: [], materiais: [], desconto: null, ganhaPresente: true, ...extra } }) as never
  const daqui = (h: number) => new Date(Date.now() + h * 3600e3).toISOString()
  it('preço e link com desconto só com o link que o servidor mandou e enquanto o prazo vale', async () => {
    const { precoPresente, textoFaixa } = await import('../src/ctx')
    const o = { checkoutUrl: 'https://link-do-servidor/C', precoCentavos: 690, pct: 30, ate: daqui(2) }
    const e = eu(['kit', 'recheios'], { desconto: { pct: 30, ate: daqui(2) }, ofertasDesconto: { contafeita: o } })
    expect(precoPresente(e, 'contafeita')).toEqual(o)
    expect(precoPresente(e, 'etiquetas')).toBeNull()
    expect(precoPresente(e, 'contafeita', Date.parse(o.ate) + 1000)).toBeNull() // passou do prazo: some sem recarregar
    expect(textoFaixa(e)).toBe('30% de presente em Conta Feita')
  })
  it('o aviso antes da compra só promete o que ela ainda pode comprar com desconto, e diz que fica guardado por 3 horas', async () => {
    const { ganhaPresente, textoPresente } = await import('../src/ctx')
    expect(ganhaPresente(eu(['kit']), 'recheios')).toBe(true)
    expect(ganhaPresente(eu(['kit']), 'etiquetas')).toBe(true)
    expect(textoPresente(eu(['kit']), 'etiquetas')).toBe('Sua primeira compra te deixa com 30% de presente em mais um: nas Aulas em vídeo ou no Conta Feita. Ele fica guardado por 3 horas depois da compra.')
    expect(textoPresente(eu(['kit'])))
      .toBe('Qualquer material daqui te deixa com 30% de presente em mais um (Aulas, Etiquetas ou Conta Feita), guardado por 3 horas.')
    expect(ganhaPresente(eu(['kit', 'videoaulas', 'contafeita']), 'etiquetas')).toBe(false)
    expect(ganhaPresente(eu(['kit'], { ganhaPresente: false }), 'recheios')).toBe(false)
  })
  it('tom de presente: "fica guardado por", sem "vale até você usar" e sem pressão', async () => {
    const fs = await import('node:fs')
    const tela = ['src/telas/PresenteDesconto.tsx', 'src/telas/PopupDesconto.tsx'].map((f) => fs.readFileSync(f, 'utf8')).join('\n')
    expect(tela).toContain('Seu presente fica guardado por')
    expect(tela).not.toMatch(/até você usar|corra|últim|só hoje|só agora|acaba em/i)
  })
})

describe('tela Liberado!: onde o que ela comprou aparece no Início', () => {
  it('Aulas, Etiquetas e Conta Feita: no topo do Início (têm cartão próprio)', async () => {
    const { ondeFica } = await import('../src/ctx')
    expect(ondeFica('videoaulas')).toBe('As Videoaulas já estão no Início, logo no topo.')
    expect(ondeFica('etiquetas')).toBe('As Imagens e Etiquetas com o Seu Nome já estão no Início, logo no topo.')
    expect(ondeFica('contafeita')).toBe('O Respostas com a Conta Feita já está no Início, logo no topo.')
  })
  it('os outros extras: em Minhas compras', async () => {
    const { ondeFica } = await import('../src/ctx')
    const { PRODUTOS } = await import('../shared/catalogo')
    for (const p of ['recheios', 'encomenda', 'primeira'] as const) expect(ondeFica(p)).toBe(`${PRODUTOS[p].nome} já está no Início, em “Minhas compras”.`)
  })
  it('bate com o Painel: quem fica em Minhas compras é exatamente quem não tem cartão no topo', async () => {
    const fs = await import('node:fs')
    const painel = fs.readFileSync('src/telas/Painel.tsx', 'utf8')
    expect(painel).toMatch(/COMPRAS_EXTRAS: ProdutoId\[\] = \['recheios', 'encomenda', 'primeira'\]/)
    expect(painel).not.toMatch(/Meus materiais<\/button>/)
  })
})

describe('cards da Seleção especial e selo do popup', () => {
  it('Etiquetas e Conta Feita usam a capa quadrada, sem as faixas borradas', async () => {
    const fs = await import('node:fs')
    const painel = fs.readFileSync('src/telas/Painel.tsx', 'utf8')
    expect(painel).not.toMatch(/etiquetas-capa\.webp|contafeita-capa\.webp/)
    expect(fs.readFileSync('src/estilo.css', 'utf8')).toMatch(/img\.capa-quadrada\{aspect-ratio:1\/1;object-fit:cover/)
  })
  it('motivo ao lado do selo do popup', async () => {
    const fs = await import('node:fs')
    expect(fs.readFileSync('src/telas/PopupDesconto.tsx', 'utf8')).toContain('<span className="pd-selo-motivo">um presente da sua compra</span>')
  })
})
