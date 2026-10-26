// Teste de fumaça do servidor (sem rede, sem conta, sem dados reais): npm run test:api
// Usa segredos aleatórios gerados na hora, um KV em pasta temporária e um arquivo falso. Nada é gravado no projeto.

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = await mkdtemp(join(tmpdir(), 'panetone-test-'))
process.env.SESSION_SECRET = randomBytes(24).toString('hex')
process.env.FILE_SIGNING_SECRET = randomBytes(24).toString('hex')
process.env.WIAPY_WEBHOOK_TOKEN = randomBytes(12).toString('hex')
process.env.ADMIN_TOKEN = randomBytes(12).toString('hex')
process.env.DATA_FILE = join(tmp, 'db.json')
process.env.FILES_DIR = join(tmp, 'files')
process.env.DEV_LOG_CODES = '1'
delete process.env.VERCEL

const { parseJsonLoose, parseWiapyPayload } = await import('../wiapy.js')
const { buildMe, purchasesOf, meFor } = await import('../purchases.js')
const { parseCsv } = await import('../csv.js')
const { PLANS, ENTITLEMENTS, OFFERS, OFFER_BY_ID, itemsFor, findFile } = await import('../../shared/catalog.js')
const { isFullKit } = await import('../wiapy.js')
const webhook = await import('../../api/webhook/wiapy.js')
const reqCode = await import('../../api/auth/request-code.js')
const verify = await import('../../api/auth/verify.js')
const me = await import('../../api/me.js')
const fileApi = await import('../../api/file/[id].js')
const dl = await import('../../api/dl/[id].js')
const grant = await import('../../api/admin/grant.js')
const imp = await import('../../api/admin/import-csv.js')
const feedback = await import('../../api/feedback.js')
const eventApi = await import('../../api/event.js')
const events = await import('../../api/admin/events.js')
const { mkdir } = await import('node:fs/promises')

let n = 0
const ok = (name: string) => console.log(`  ok ${++n} ${name}`)
const T = process.env.WIAPY_WEBHOOK_TOKEN
const A = process.env.ADMIN_TOKEN
const BUMP_ID = '6ad318de6ebcdbf668bb03c1'

// payload no formato da doc (valores em centavos)
function payload(o: { id: string; status: string | null; email?: string; checkoutId: string; amount: number; bump?: boolean; method?: string }) {
  return {
    payment: o.status === null ? null : { id: o.id, status: o.status, amount: o.amount + (o.bump ? 790 : 0), payment_method: o.method ?? 'pix', type: 'payment' },
    subscription: {},
    customer: { id: 'c1', name: 'Cliente Teste', email: o.email ?? 'teste1@example.com', mobile_phone: '(11) 90000-0000', document: '000.000.000-00' },
    checkout: {
      id: o.checkoutId,
      title: 'Teste',
      amount: o.amount,
      orderbump: o.bump ? [{ id: BUMP_ID, title: '+20 Fichas de Socorro do Panetone', amount: 790 }] : [],
    },
    products: [],
    tracking: null,
  }
}
const post = (body: unknown, token: string | null = T) =>
  webhook.POST(new Request('http://x/api/webhook/wiapy', { method: 'POST', headers: token ? { authorization: token } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }))

// 1. JSON da doc, com a vírgula faltando depois de "type": "payment"
const docJson = `{
  "payment": {
    "id": "680bb49dcc58d1620569cb2e",
    "status": "paid",
    "amount": 1770,
    "payment_method": "pix",
    "type": "payment"
    "installments": 0,
    "fee": 190
  },
  "subscription": {},
  "customer": { "id": "680bb49bcc58d1620569cb24", "name": "Thay", "email": "Thay@Wiapy.com" },
  "checkout": { "id": "66e0799f17f298ff3c60f345", "title": "Produto teste", "amount": 990, "orderbump": [ { "id": "67b9f0f5f777cbea4ba9cbfa", "title": "Orderbump teste", "amount": 780 }, ] },
  "products": [ { "id": "p1", "title": "Nome", "type": "E-book", "itens": [ { "title": "Arquivo 01", "url": "u" }, ] } ],
}`
const parsed = parseWiapyPayload(parseJsonLoose(docJson))
assert.equal(parsed.kind, 'payment')
assert.equal(parsed.paymentId, '680bb49dcc58d1620569cb2e')
assert.equal(parsed.status, 'paid')
assert.equal(parsed.email, 'thay@wiapy.com')
assert.equal(parsed.checkoutAmountCents, 990)
assert.equal(parsed.orderbump.length, 1)
ok('parser lê o exemplo da doc, inclusive com vírgula faltando e sobrando')

const aband = parseWiapyPayload(parseJsonLoose('{"payment":null,"subscription":null,"customer":{"email":"a@b.co"},"checkout":{"id":"x","amount":990,"orderbump":null},"products":null,"tracking":null}'))
assert.equal(aband.kind, 'abandoned')
ok('carrinho abandonado (payment: null) é reconhecido')

// 2. autenticação do webhook
assert.equal((await post(payload({ id: 'o0', status: 'paid', checkoutId: 'x', amount: 1 }), null)).status, 401)
assert.equal((await post(payload({ id: 'o0', status: 'paid', checkoutId: 'x', amount: 1 }), 'errado')).status, 401)
assert.equal((await post('{ isto não é json')).status, 400)
ok('webhook: sem token / token errado = 401, corpo ilegível = 400')

// 3. kit completo: só o checkout da lista libera (padrão: r2PHgYwK6CVi e o id interno do mesmo checkout)
const mk = (checkoutId: string, amount: number) => parseWiapyPayload(payload({ id: 'z', status: 'paid', checkoutId, amount }))
assert.equal(isFullKit(mk('r2PHgYwK6CVi', 3790)).ok, true)
assert.equal(isFullKit(mk('6accaf7eb11ba1ecaf89b37e', 3790)).ok, true)
assert.equal(isFullKit(mk('FFQCCYgi6wuh', 1000)).ok, false, 'R$10 antigo não libera mais')
assert.equal(isFullKit(mk('gT1z974uVg56', 1790)).ok, false)
assert.equal(isFullKit(mk('', 3790)).ok, false, 'sem checkout.id não libera')
process.env.FULL_KIT_CHECKOUT_IDS = 'abc123, def456'
assert.equal(isFullKit(mk('def456', 3790)).ok, true)
assert.equal(isFullKit(mk('r2PHgYwK6CVi', 3790)).ok, false, 'a variável sobrescreve o padrão')
delete process.env.FULL_KIT_CHECKOUT_IDS
process.env.FULL_KIT_REQUIRE_AMOUNT = '1'
assert.equal(isFullKit(mk('r2PHgYwK6CVi', 3790)).ok, true)
assert.equal(isFullKit(mk('r2PHgYwK6CVi', 2290)).ok, false, 'checagem opcional de valor')
delete process.env.FULL_KIT_REQUIRE_AMOUNT
ok('kit completo: só checkout da lista (FULL_KIT_CHECKOUT_IDS, padrão r2PHgYwK6CVi); outros e vazio não; valor opcional')

// 4. ciclo PIX: pendente NÃO libera, pago libera uma vez, duplicado não duplica, estorno revoga, pago atrasado não volta
const E = 'teste1@example.com'
await post(payload({ id: 'ord-1', status: 'unpaid', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
let m = await meFor(E)
assert.deepEqual(m.items, [])
assert.equal(m.purchases[0].status, 'pending')
ok('PIX gerado (unpaid) fica pendente e não libera nada')
await post(payload({ id: 'ord-1', status: 'paid', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
await post(payload({ id: 'ord-1', status: 'paid', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
m = await meFor(E)
assert.equal((await purchasesOf(E)).length, 1)
assert.equal(m.plan, 'completo')
assert.deepEqual(new Set(m.items), new Set(ENTITLEMENTS.completo))
assert.ok(!m.items.includes('bump'))
ok('pago libera o kit completo (sem o bump) uma única vez; repetido não duplica')
await post(payload({ id: 'ord-1', status: 'refunded', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
assert.deepEqual((await meFor(E)).items, [])
await post(payload({ id: 'ord-1', status: 'paid', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
assert.deepEqual((await meFor(E)).items, [])
assert.equal((await meFor(E)).purchases[0].status, 'refunded')
ok('estorno revoga e um "paid" atrasado não libera de novo')

// 5. checkout antigo (R$10) é ignorado mesmo com bump; bump avulso libera só as Fichas; kit + bump libera tudo
const E2 = 'teste2@example.com'
const ign = await post(payload({ id: 'ord-2', status: 'paid', email: E2, checkoutId: '6accb0c36ebcdbf668eecb13', amount: 1000, bump: true }))
assert.equal(ign.status, 200)
assert.equal((await purchasesOf(E2)).length, 0)
assert.deepEqual((await meFor(E2)).items, [])
await post(payload({ id: 'ord-2b', status: 'paid', email: E2, checkoutId: BUMP_ID, amount: 790 }))
m = await meFor(E2)
assert.deepEqual(m.items, ['bump'])
assert.equal(m.plan, null)
const E5 = 'teste5@example.com'
await post(payload({ id: 'ord-5', status: 'paid', email: E5, checkoutId: 'r2PHgYwK6CVi', amount: 3790, bump: true }))
m = await meFor(E5)
assert.equal(m.items.length, 10)
assert.ok(m.items.includes('bump') && m.items.includes('bonus-08'))
ok('checkout fora da lista é ignorado; bump avulso libera só as Fichas; kit + bump libera 10 itens')

// 6. chargeback, cartão recusado, carrinho abandonado, checkout desconhecido
const E3 = 'teste3@example.com'
await post(payload({ id: 'ord-3', status: 'credit_card_declined', email: E3, checkoutId: 'r2PHgYwK6CVi', amount: 3790, method: 'credit_card' }))
assert.deepEqual((await meFor(E3)).items, [])
await post(payload({ id: 'ord-3', status: 'paid', email: E3, checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
assert.equal((await meFor(E3)).items.length, 9)
await post(payload({ id: 'ord-3', status: 'chargedback', email: E3, checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
assert.deepEqual((await meFor(E3)).items, [])
assert.equal((await meFor(E3)).purchases[0].status, 'chargeback')
ok('cartão recusado não libera; chargeback revoga')
await post(payload({ id: '', status: null, email: 'abandonou@example.com', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
assert.equal((await purchasesOf('abandonou@example.com')).length, 0)
await post(payload({ id: 'ord-4', status: 'paid', email: 'x4@example.com', checkoutId: 'zzz', amount: 4242 }))
assert.equal((await purchasesOf('x4@example.com')).length, 0)
assert.deepEqual((await meFor('x4@example.com')).items, [])
ok('carrinho abandonado não cria compra; checkout desconhecido é ignorado (vira evento) e não libera')

// 7. login por código, sessão, arquivo assinado
const logs: string[] = []
const realLog = console.log
console.log = (...a: unknown[]) => void logs.push(a.join(' '))
const rc = async (email: string) =>
  reqCode.POST(new Request('http://x/api/auth/request-code', { method: 'POST', headers: { 'x-forwarded-for': '1.1.1.1' }, body: JSON.stringify({ email }) }))
assert.equal((await rc(E2)).status, 200)
assert.equal((await rc('ninguem@example.com')).status, 200)
console.log = realLog
assert.equal(logs.length, 1, 'só e-mail com compra recebe código')
const code = /: (\d{6})$/.exec(logs[0])![1]
const bad = await verify.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: E2, code: code === '000000' ? '111111' : '000000' }) }))
assert.equal(bad.status, 400)
const good = await verify.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: E2, code }) }))
assert.equal(good.status, 200)
const { token } = (await good.json()) as { token: string }
assert.equal((await verify.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: E2, code }) }))).status, 400, 'código só vale uma vez')
const bearer = { authorization: `Bearer ${token}` }
const meRes = await me.GET(new Request('http://x/api/me', { headers: bearer }))
assert.deepEqual(((await meRes.json()) as { items: string[] }).items, ['bump'])
assert.equal((await me.GET(new Request('http://x/api/me', { headers: { authorization: 'Bearer lixo.lixo' } }))).status, 401)
ok('login por código: só cliente recebe, código errado falha, vale uma vez, /api/me devolve os itens')

await mkdir(process.env.FILES_DIR!, { recursive: true })
await writeFile(join(process.env.FILES_DIR!, 'produto-principal.pdf'), 'ARQUIVO-FALSO-DE-TESTE')
await writeFile(join(process.env.FILES_DIR!, 'bonus-01-guia-de-embalagem.pdf'), 'ARQUIVO-FALSO-DE-TESTE')
await writeFile(join(process.env.FILES_DIR!, 'bump-20-fichas-de-socorro.pdf'), 'ARQUIVO-FALSO-DE-TESTE')
const fileReq = (key: string) => fileApi.GET(new Request(`http://x/api/file/${encodeURIComponent(key)}`, { headers: bearer }))
assert.equal((await fileReq('bonus-01-guia-de-embalagem.pdf')).status, 403, 'sem o kit não abre bônus')
assert.equal((await fileReq('produto-principal.pdf')).status, 403, 'sem o kit não abre o principal')
assert.equal((await fileReq('inexistente.pdf')).status, 404)
assert.equal((await fileApi.GET(new Request('http://x/api/file/bump-20-fichas-de-socorro.pdf'))).status, 401)
const fr = await fileReq('bump-20-fichas-de-socorro.pdf')
assert.equal(fr.status, 200)
const { url } = (await fr.json()) as { url: string }
const got = await dl.GET(new Request(`http://x${url}`))
assert.equal(got.status, 200)
assert.equal(await got.text(), 'ARQUIVO-FALSO-DE-TESTE')
assert.equal(got.headers.get('cache-control'), 'private, no-store')
assert.equal(got.headers.get('content-type'), 'application/pdf')
const tampered = url.replace(/s=[^&]+/, 's=abc')
assert.equal((await dl.GET(new Request(`http://x${tampered}`))).status, 403)
assert.equal((await dl.GET(new Request(`http://x/api/dl/bump-20-fichas-de-socorro.pdf`))).status, 403)
// URL de outro arquivo com a assinatura deste
assert.equal((await dl.GET(new Request(`http://x${url.replace('bump-20-fichas-de-socorro', 'bonus-01-guia-de-embalagem')}`))).status, 403)
// expirada
const { signFileUrl } = await import('../crypto.js')
const old = signFileUrl({ key: 'bump-20-fichas-de-socorro.pdf', exp: Math.floor(Date.now() / 1000) - 5, dl: false, uid: 'x' })
assert.equal((await dl.GET(new Request(`http://x${old}`))).status, 403)
ok('arquivo: 401 sem sessão, 403 sem direito, URL assinada entrega o arquivo; adulterada, trocada ou vencida = 403')

// 8. admin: grant manual, CSV idempotente, eventos e feedback
const adm = { authorization: `Bearer ${A}`, 'content-type': 'application/json' }
assert.equal((await grant.POST(new Request('http://x', { method: 'POST', headers: { authorization: 'Bearer errado' }, body: '{}' }))).status, 401)
const g = await grant.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: 'Manual@Example.com', plan: 'completo', bump: true }) }))
assert.equal(g.status, 200)
assert.equal((await meFor('manual@example.com')).items.length, 10)
const csv = 'email;plano;bump\nlinha1@example.com;completo;nao\nlinha2@example.com;37,90;sim\nruim;completo;nao\nlinha3@example.com;10;nao\n'
const parsedCsv = parseCsv(csv)
assert.equal(parsedCsv.rows.length, 2)
assert.equal(parsedCsv.errors.length, 2)
const i1 = (await (await imp.POST(new Request('http://x', { method: 'POST', headers: adm, body: csv }))).json()) as { created: number; duplicated: number }
const i2 = (await (await imp.POST(new Request('http://x', { method: 'POST', headers: adm, body: csv }))).json()) as { created: number; duplicated: number }
assert.deepEqual([i1.created, i1.duplicated, i2.created, i2.duplicated], [2, 0, 0, 2])
assert.equal((await meFor('linha2@example.com')).plan, 'completo')
assert.equal((await meFor('linha2@example.com')).items.length, 10)
ok('liberação manual e importação CSV (reimportar não duplica)')

const fb = await feedback.POST(new Request('http://x', { method: 'POST', headers: { ...bearer, 'content-type': 'application/json' }, body: JSON.stringify({ choice: 'Calcular custo e preço', text: 'teste' }) }))
assert.equal(fb.status, 200)
const evs = (await (await events.GET(new Request('http://x/api/admin/events?name=feedback', { headers: adm }))).json()) as { name: string; email: string }[]
assert.equal(evs.length, 1)
assert.equal(evs[0].name, 'feedback.dificuldade')
const all = (await (await events.GET(new Request('http://x/api/admin/events', { headers: adm }))).json()) as { name: string; origin: string; orderId?: string }[]
assert.ok(all.some((e) => e.name === 'purchase.paid' && e.origin.startsWith('wiapy:checkout:') && e.orderId === 'ord-1'))
assert.ok(all.some((e) => e.name === 'purchase.duplicate'))
assert.ok(all.some((e) => e.name === 'purchase.abandoned'))
assert.ok(all.some((e) => e.name === 'purchase.ignored_checkout' && e.origin === 'wiapy:checkout:zzz'))
ok('feedback vira evento; eventos de compra guardam origem e pedido')

// 9. ofertas adicionais (OFFERS): 3 slots, todas desligadas; nada é liberado enquanto estiverem desligadas
assert.deepEqual(OFFERS.map((o) => [o.id, o.kind, o.priceCents, o.enabled, o.checkoutUrl, o.wiapyProductId]), [
  ['kit-lucrativo', 'upsell', 7700, false, '', ''],
  ['kit-embalagem-etiqueta', 'downsell', 3700, false, '', ''],
  ['fornada-pascoa', 'seasonal', 7700, false, '', ''],
])
assert.equal(OFFER_BY_ID['kit-embalagem-etiqueta'].requiresDismissed, 'kit-lucrativo')
assert.ok(/etiquetas/i.test(OFFER_BY_ID['kit-embalagem-etiqueta'].description) && /B[ôo]nus 01/.test(OFFER_BY_ID['kit-embalagem-etiqueta'].description))
assert.deepEqual(itemsFor('completo', false, ['kit-lucrativo']).filter((i) => i === 'kit-lucrativo'), [], 'oferta desligada não libera item')
// CSV e grant com ofertas
const csvO = parseCsv('email;plano;ofertas\noferta1@example.com;completo;kit-lucrativo|fornada-pascoa\noferta2@example.com;completo;nao-existe\n')
assert.equal(csvO.rows.length, 1)
assert.deepEqual(csvO.rows[0].offers, ['kit-lucrativo', 'fornada-pascoa'])
assert.equal(csvO.errors.length, 1)
const gBad = await grant.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: 'oferta3@example.com', offers: ['xyz'] }) }))
assert.equal(gBad.status, 400)
ok('ofertas: 3 slots desligados, downsell depende do upsell, CSV e grant validam os ids')

// webhook com o id do produto da oferta: desligada = ignorada; ligada (e configurada) = libera só aquela oferta, uma vez
const OFFER_PID = 'produto-oferta-teste'
OFFER_BY_ID['kit-lucrativo'].wiapyProductId = OFFER_PID
const offerPayload = (id: string) => payload({ id, status: 'paid', email: 'oferta@example.com', checkoutId: OFFER_PID, amount: 7700 })
await post(offerPayload('of-1'))
assert.equal((await purchasesOf('oferta@example.com')).length, 0, 'oferta desligada: checkout ignorado, nada criado')
OFFER_BY_ID['kit-lucrativo'].enabled = true
await post(offerPayload('of-2'))
await post(offerPayload('of-2'))
const pOf = await purchasesOf('oferta@example.com')
assert.equal(pOf.length, 1)
assert.deepEqual(pOf[0].offers, ['kit-lucrativo'])
assert.equal(pOf[0].plan, null)
assert.deepEqual((await meFor('oferta@example.com')).items, ['kit-lucrativo'])
// o arquivo de uma oferta só é encontrado quando ela está ligada
OFFER_BY_ID['kit-lucrativo'].files = [{ label: 'Teste', kind: 'pdf', storageKey: 'oferta-teste.pdf', pages: 1 } as (typeof OFFERS)[number]['files'][number]]
assert.ok(findFile('oferta-teste.pdf'))
OFFER_BY_ID['kit-lucrativo'].enabled = false
assert.equal(findFile('oferta-teste.pdf'), null)
assert.deepEqual((await meFor('oferta@example.com')).items, [], 'desligar a oferta esconde o acesso')
OFFER_BY_ID['kit-lucrativo'].files = []
OFFER_BY_ID['kit-lucrativo'].wiapyProductId = ''
ok('ofertas: webhook ignora oferta desligada e libera só a oferta ligada, sem duplicar')

// eventos de oferta (/api/event): só nomes conhecidos, sessão obrigatória
const ev = (body: unknown, h: Record<string, string> = bearer) => eventApi.POST(new Request('http://x/api/event', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify(body) }))
assert.equal((await ev({ name: 'offer.click', offerId: 'fornada-pascoa', from: 'home-card' }, {})).status, 401)
assert.equal((await ev({ name: 'offer.click', offerId: 'fornada-pascoa', from: 'home-card' })).status, 200)
assert.equal((await ev({ name: 'offer.dismiss', offerId: 'kit-lucrativo', from: 'home-banner' })).status, 200)
assert.equal((await ev({ name: 'item.done', itemId: 'bonus-03' })).status, 200)
assert.equal((await ev({ name: 'offer.interest', offerId: 'fornada-pascoa' })).status, 200)
assert.equal((await ev({ name: 'qualquer.coisa', offerId: 'fornada-pascoa' })).status, 400)
assert.equal((await ev({ name: 'offer.click', offerId: 'inexistente' })).status, 400)
assert.equal((await ev({ name: 'item.done', itemId: 'inexistente' })).status, 400)
const evAll = (await (await events.GET(new Request('http://x/api/admin/events', { headers: adm }))).json()) as { name: string; origin: string; props?: Record<string, string> }[]
assert.ok(evAll.some((e) => e.name === 'offer.click' && e.props?.offerId === 'fornada-pascoa' && e.props?.from === 'home-card'))
assert.ok(evAll.some((e) => e.name === 'offer.dismiss' && e.props?.offerId === 'kit-lucrativo'))
assert.ok(evAll.some((e) => e.name === 'item.done' && e.props?.itemId === 'bonus-03'))
ok('/api/event grava clique, "agora não", "fiz essa" e interesse; rejeita nome ou id desconhecido')

// buildMe sem plano
assert.equal(buildMe('a@b.co', []).plan, null)
assert.deepEqual(Object.keys(PLANS), ['completo'])
console.log(`\n${n} grupos de teste passaram.`)
