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
const { PLANS, ENTITLEMENTS, OFFERS, COMBO, comboSumCents, comboShowStrike, OFFER_BY_ID, itemsFor, findFile } = await import('../../shared/catalog.js')
const { isFullKit, detectBumpVia } = await import('../wiapy.js')
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

// 9. ofertas adicionais (OFFERS): 3 slots base + catálogo unificado (12 do GPT + seeds), todas desligadas; nada é liberado enquanto estiverem desligadas
assert.deepEqual(OFFERS.filter((o) => ['kit-lucrativo', 'kit-embalagem-etiqueta', 'fornada-pascoa'].includes(o.id)).map((o) => [o.id, o.kind, o.priceCents, o.enabled, o.checkoutUrl, o.wiapyProductId]), [
  ['fornada-pascoa', 'seasonal', 7700, false, '', ''],
  ['kit-lucrativo', 'upsell', 7700, false, '', ''],
  ['kit-embalagem-etiqueta', 'downsell', 3700, false, '', ''],
])
assert.ok(OFFERS.every((o) => o.checkoutUrl === '' && o.wiapyProductId === ''), 'nenhuma oferta tem checkout nem id Wiapy ainda')
assert.ok(OFFERS.filter((o) => !o.catalog).every((o) => !o.enabled), 'fora do catálogo = desligada')
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

// ---- bump (Fichas de Socorro) por cliente: detecção no webhook, entitlements, estorno só do pagamento
const bumpEvents = async (email: string) =>
  ((await (await events.GET(new Request('http://x/api/admin/events?name=purchase.bump_detected', { headers: adm }))).json()) as { email?: string; props?: Record<string, string> }[]).filter((e) => e.email === email)
const pay = (o: { id: string; email: string; amount: number; checkoutAmount?: number; orderbump?: { id: string; title: string; amount: number }[]; products?: { id: string; title: string }[] }) => ({
  payment: { id: o.id, status: 'paid', amount: o.amount, payment_method: 'pix', type: 'payment' },
  customer: { email: o.email, name: 'Cliente', mobile_phone: '', document: '' },
  checkout: { id: 'r2PHgYwK6CVi', title: 'Kit', amount: o.checkoutAmount ?? 3790, orderbump: o.orderbump ?? [] },
  products: o.products ?? [],
})
// (a) só o kit: sem bump
const pKit = parseWiapyPayload(pay({ id: 'b-a', email: 'bump-a@example.com', amount: 3790 }))
assert.equal(detectBumpVia(pKit), null)
await post(pay({ id: 'b-a', email: 'bump-a@example.com', amount: 3790 }))
let mb = await meFor('bump-a@example.com')
assert.ok(!mb.entitlements.includes('bump') && mb.entitlements.includes('main') && mb.entitlements.length === 9)
assert.deepEqual(mb.entitlements, mb.items)
assert.equal((await bumpEvents('bump-a@example.com')).length, 0)
// (b) kit + bump em checkout.orderbump[] (por id, por título sem diferenciar maiúsculas)
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 4580, orderbump: [{ id: BUMP_ID, title: 'qualquer', amount: 790 }] }))), 'orderbump')
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 4580, orderbump: [{ id: 'outro', title: '+20 FICHAS de socorro', amount: 790 }] }))), 'orderbump')
await post(pay({ id: 'b-b', email: 'bump-b@example.com', amount: 4580, orderbump: [{ id: BUMP_ID, title: '+20 Fichas de Socorro do Panetone', amount: 790 }] }))
mb = await meFor('bump-b@example.com')
assert.ok(mb.entitlements.includes('bump') && mb.entitlements.length === 10)
assert.ok(mb.purchases[0].entitlements?.includes('bump'))
assert.equal((await bumpEvents('bump-b@example.com'))[0]?.props?.via, 'orderbump')
// repetir o mesmo pagamento não duplica nem repete o evento
await post(pay({ id: 'b-b', email: 'bump-b@example.com', amount: 4580, orderbump: [{ id: BUMP_ID, title: '+20 Fichas de Socorro do Panetone', amount: 790 }] }))
assert.equal((await bumpEvents('bump-b@example.com')).length, 1)
assert.equal((await purchasesOf('bump-b@example.com')).length, 1)
// (c) kit + bump só pelo valor (4580), payload sem orderbump nem products
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 4580 }))), 'amount')
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 4000, checkoutAmount: 4580 }))), 'amount', 'checkout.amount também vale')
await post(pay({ id: 'b-c', email: 'bump-c@example.com', amount: 4580 }))
assert.ok((await meFor('bump-c@example.com')).entitlements.includes('bump'))
assert.equal((await bumpEvents('bump-c@example.com'))[0]?.props?.via, 'amount')
// (d) products[] com "Fichas" no título
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 3790, products: [{ id: 'p', title: 'Fábrica de Panetones' }, { id: 'q', title: '+20 Fichas de Socorro' }] }))), 'products')
// (e) BUMP_ORDERBUMP_IDS (id ou trecho do título) e valores em env
process.env.BUMP_ORDERBUMP_IDS = 'id-do-bump-novo, SOS extra'
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 3790, orderbump: [{ id: 'ID-DO-BUMP-NOVO', title: 'x', amount: 1 }] }))), 'orderbump')
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 3790, orderbump: [{ id: 'z', title: 'Pacote sos EXTRA', amount: 1 }] }))), 'orderbump')
delete process.env.BUMP_ORDERBUMP_IDS
process.env.FULL_KIT_AMOUNT_CENTS = '3000'
process.env.BUMP_TOTAL_CENTS = '3900'
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 3900 }))), 'amount')
assert.equal(detectBumpVia(parseWiapyPayload(pay({ id: 'x', email: 'x@x.co', amount: 4580 }))), null, 'valor padrão não vale com env novo')
delete process.env.FULL_KIT_AMOUNT_CENTS
delete process.env.BUMP_TOTAL_CENTS
// (f) estorno revoga só o que veio naquele pagamento: kit (pedido A) + Fichas avulsas (pedido B); estorna B, o kit fica
const EF = 'bump-f@example.com'
await post(pay({ id: 'b-f1', email: EF, amount: 3790 }))
await post({ ...pay({ id: 'b-f2', email: EF, amount: 790 }), checkout: { id: BUMP_ID, title: 'Fichas', amount: 790, orderbump: [] } })
assert.ok((await meFor(EF)).entitlements.includes('bump'))
await post({ ...pay({ id: 'b-f2', email: EF, amount: 790 }), payment: { id: 'b-f2', status: 'refunded', amount: 790, payment_method: 'pix', type: 'payment' }, checkout: { id: BUMP_ID, title: 'Fichas', amount: 790, orderbump: [] } })
mb = await meFor(EF)
assert.ok(!mb.entitlements.includes('bump') && mb.entitlements.includes('main') && mb.entitlements.length === 9, 'só as Fichas foram revogadas')
// (g) kit + bump no mesmo pagamento, estorno: revoga tudo daquele pagamento
await post({ ...pay({ id: 'b-b', email: 'bump-b@example.com', amount: 4580 }), payment: { id: 'b-b', status: 'refunded', amount: 4580, payment_method: 'pix', type: 'payment' } })
assert.deepEqual((await meFor('bump-b@example.com')).entitlements, [])
ok('bump por cliente: só kit, kit+bump em orderbump, kit+bump só pelo valor, products[], env, evento purchase.bump_detected, estorno só do pagamento')

// catálogo: campos obrigatórios, sem promessa de renda, sem escassez falsa
for (const o of OFFERS) {
  assert.equal(typeof o.catalog, 'boolean', o.id)
  assert.ok(o.status === 'available' || o.status === 'soon', o.id)
  assert.equal(typeof o.badgeNew, 'boolean', o.id)
  assert.ok(o.headline.length > 5 && o.promise.length > 5, `${o.id}: headline e promise preenchidos`)
  if (o.status === 'available') assert.ok(o.checkoutUrl, `${o.id}: oferta disponível precisa de checkout`)
  const copy = `${o.headline} ${o.promise} ${o.description} ${o.subtitle}`
  assert.ok(!/garant|ganhe|faturar|fature|renda|últimas? (vagas|unidades)|só hoje|termina em|\d+ ?(vagas|restantes)|R\$ ?\d+ ?(por|\/) ?(dia|mês|semana)/i.test(copy), `${o.id}: sem promessa de renda nem escassez falsa`)
}
assert.equal(new Set(OFFERS.map((o) => o.id)).size, OFFERS.length)
const inCatalog = OFFERS.filter((o) => o.catalog)
assert.equal(inCatalog.length, 17, '10 do tier S + 7 de Natal/Ano Novo no catálogo')
assert.ok(inCatalog.every((o) => o.status === 'soon' && o.checkoutUrl === '' && o.enabled), 'todos "em breve", sem checkout, enabled')
assert.equal(OFFERS.filter((o) => o.tierS).length, 10)
assert.ok(OFFERS.every((o) => o.deliverableType.trim() && o.imageType.trim() && ['2:3', '4:3'].includes(o.imageRatio)), 'todo item tem tipo de entregável e briefing de imagem')
assert.ok(inCatalog.every((o) => !/^pdf/i.test(o.deliverableType)), 'nenhum entregável é só "PDF"')
assert.ok(new Set(inCatalog.map((o) => o.deliverableType)).size >= 7, 'formatos variados no catálogo')
assert.deepEqual(OFFERS.filter((o) => o.tierS).map((o) => o.deliverableType), ['Caderno de receitas', 'Cartões de acabamento', 'Pasta de imprimíveis', 'Fichário de receitas', 'Planilha interativa', 'Cardápio imprimível', 'Calendário de parede', 'Kit de moldes para recortar', 'Vídeo-aulas', 'Kit de artes editáveis'])
assert.deepEqual(OFFERS.filter((o) => o.featured).map((o) => o.id), ['caixas-doces-natal'], 'um só destaque')
assert.ok(OFFERS.filter((o) => o.tierS).every((o) => o.catalog))
for (const id of ['kit-lucrativo', 'kit-embalagem-etiqueta', 'panetones-premium', 'ponto-perfeito', 'fornada-pascoa', 'ano-inteiro-encomendas'] as const) assert.equal(OFFER_BY_ID[id].catalog, false, `${id} fora do catálogo`)
for (const id of ['fotos-vitrine', 'panetones-travessa', 'kit-etiquetas-confeitaria', 'calendario-dezembro']) assert.equal(OFFER_BY_ID[id as keyof typeof OFFER_BY_ID], undefined, `${id} fundido ou cortado`)
assert.equal(OFFER_BY_ID['receitas-explodir-vendas'].title, '15 Receitas que VÃO EXPLODIR DE VENDAS a partir de dezembro')
assert.equal(OFFER_BY_ID['receitas-explodir-vendas'].priceCents, 4700)
assert.equal(OFFER_BY_ID['caixas-doces-natal'].priceCents, 3700)
assert.equal(OFFER_BY_ID['rabanada-padaria'].priceCents, 2490)
assert.equal(OFFER_BY_ID['panetones-vulcao'].priceCents, 2790)
assert.equal(OFFER_BY_ID['segredo-recheios'].priceCents, 3790)
ok('catálogo: ofertas têm catalog/status/badgeNew/headline/promise, sem renda numérica nem escassez')

// eventos do catálogo
assert.equal((await ev({ name: 'catalog.view', count: 5, novas: '5' }, {})).status, 401)
assert.equal((await ev({ name: 'catalog.view', count: 5 })).status, 200)
assert.equal((await ev({ name: 'catalog.view' })).status, 200)
assert.equal((await ev({ name: 'offer.view', offerId: 'panetones-vulcao', from: 'catalog' })).status, 200)
assert.equal((await ev({ name: 'offer.view' })).status, 400, 'offer.view exige offerId')
assert.equal((await ev({ name: 'offer.interest', offerId: 'bump', from: 'catalog' })).status, 200, 'interesse nas Fichas (bump)')
assert.equal((await ev({ name: 'offer.view', offerId: 'nao-existe' })).status, 400)
const evCat = (await (await events.GET(new Request('http://x/api/admin/events', { headers: adm }))).json()) as { name: string; props?: Record<string, string> }[]
assert.ok(evCat.some((e) => e.name === 'catalog.view' && e.props?.count === '5'))
assert.ok(evCat.some((e) => e.name === 'offer.view' && e.props?.offerId === 'panetones-vulcao' && e.props?.from === 'catalog'))
ok('/api/event grava catalog.view e offer.view')

// combo "Leve tudo": desligado e sem preço por padrão; soma calculada; riscado só se o combo for mais barato
assert.equal(COMBO.enabled, false)
assert.equal(COMBO.comboPriceCents, null)
assert.equal(COMBO.checkoutUrl, '')
assert.equal(COMBO.title, 'Leve tudo')
assert.equal(comboSumCents(inCatalog), inCatalog.reduce((t, o) => t + o.priceCents, 0))
assert.equal(comboSumCents([{ priceCents: 2790 }, { priceCents: 3790 }]), 6580)
assert.equal(comboShowStrike(29700, comboSumCents(inCatalog)), true, 'o preço de demonstração é menor que a soma')
assert.equal(comboShowStrike(31500, 31500), false, 'preço igual à soma: sem riscado')
assert.equal(comboShowStrike(40000, 31500), false, 'combo mais caro: sem riscado')
assert.equal(comboShowStrike(null, 31500), false, 'sem preço: sem riscado')
assert.equal(comboShowStrike(0, 31500), false)
for (const name of ['combo.view', 'combo.spin', 'combo.click', 'combo.interest']) assert.equal((await ev({ name, from: 'catalog' })).status, 200, name)
assert.equal((await ev({ name: 'combo.view' }, {})).status, 401)
assert.equal((await ev({ name: 'combo.compra' })).status, 400)
const evCombo = (await (await events.GET(new Request('http://x/api/admin/events', { headers: adm }))).json()) as { name: string; props?: Record<string, string> }[]
for (const name of ['combo.view', 'combo.spin', 'combo.click', 'combo.interest']) assert.ok(evCombo.some((e) => e.name === name && e.props?.from === 'catalog'), name)
ok('combo "Leve tudo": desligado e sem preço, soma automática, riscado só quando o combo é mais barato, eventos combo.*')

// ACESSO IMEDIATO: webhook paid -> código -> sessão -> direito, sem nenhuma ação manual
{
  const grab = async <T>(fn: () => Promise<T>): Promise<{ r: T; codes: string[] }> => {
    const out: string[] = []
    const old = console.log
    console.log = (...a: unknown[]) => void out.push(a.join(' '))
    try {
      return { r: await fn(), codes: out.map((l) => /: (\d{6})$/.exec(l)?.[1] ?? '').filter(Boolean) }
    } finally {
      console.log = old
    }
  }
  const rcw = (email: string, wait: boolean, ip = '9.9.9.9') =>
    reqCode.POST(new Request('http://x/api/auth/request-code', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify({ email, wait }) }))
  const meWith = async (email: string, code: string) => {
    const v = await verify.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email, code }) }))
    assert.equal(v.status, 200)
    const { token: tk } = (await v.json()) as { token: string }
    return (await (await me.GET(new Request('http://x/api/me', { headers: { authorization: `Bearer ${tk}` } }))).json()) as { items: string[]; entitlements: string[] }
  }

  // 1) kit pago com e-mail "sujo": cliente criado na hora (e-mail normalizado), código funciona logo depois, sessão e direitos corretos
  const dirty = '  Compra.Imediata@Example.COM '
  await post(payload({ id: 'imd-1', status: 'paid', email: dirty, checkoutId: 'r2PHgYwK6CVi', amount: 3790, bump: true }))
  assert.equal((await purchasesOf('compra.imediata@example.com')).length, 1, 'e-mail normalizado')
  const a = await grab(async () => (await rcw('COMPRA.imediata@example.com ', false, '9.9.9.1')).json() as Promise<{ ok: boolean; ready?: boolean }>)
  assert.deepEqual(a.r, { ok: true })
  assert.equal(a.codes.length, 1, 'o código sai logo após a compra, sem aprovação manual')
  const meA = await meWith('compra.imediata@example.com', a.codes[0])
  assert.ok(meA.items.includes('main') && meA.items.includes('bump') && meA.entitlements.includes('bonus-01'), 'kit + bump liberados na hora')

  // 2) e-mail desconhecido: resposta neutra, sem código, sem revelar cliente
  const b = await grab(async () => (await rcw('ninguem-ainda@example.com', true, '9.9.9.2')).json())
  assert.deepEqual(b.r, { ok: true, ready: false })
  assert.equal(b.codes.length, 0)

  // 3) a compra chega depois: a mesma pergunta passa a dar ready:true e manda o código (uma vez; repetir em 90 s não reenvia)
  await post(payload({ id: 'imd-2', status: 'paid', email: 'ninguem-ainda@example.com', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
  const c1 = await grab(async () => (await rcw('ninguem-ainda@example.com', true, '9.9.9.2')).json())
  assert.deepEqual(c1.r, { ok: true, ready: true })
  assert.equal(c1.codes.length, 1)
  const c2 = await grab(async () => (await rcw('ninguem-ainda@example.com', true, '9.9.9.2')).json())
  assert.deepEqual(c2.r, { ok: true, ready: true })
  assert.equal(c2.codes.length, 0, 'não reenvia a cada 5 s')
  const meC = await meWith('ninguem-ainda@example.com', c1.codes[0])
  assert.ok(meC.items.includes('main') && !meC.items.includes('bump'))

  // 4) PIX ainda pendente: entra, mas nada libera
  await post(payload({ id: 'imd-3', status: 'unpaid', email: 'pix-imediato@example.com', checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
  const d = await grab(async () => (await rcw('pix-imediato@example.com', true, '9.9.9.3')).json())
  assert.deepEqual(d.r, { ok: true, ready: true })
  assert.deepEqual((await meWith('pix-imediato@example.com', d.codes[0])).items, [], 'pendente não libera')

  // 5) compra antiga (mais de 30 min) não é revelada pela pergunta de espera
  const realNow = Date.now
  Date.now = () => realNow() + 31 * 60 * 1000
  try {
    const e = await grab(async () => (await rcw('teste1@example.com', true, '9.9.9.4')).json())
    assert.deepEqual(e.r, { ok: true, ready: false }, 'cliente antigo não é revelado')
    assert.equal(e.codes.length, 0)
  } finally {
    Date.now = realNow
  }

  // 6) oferta do catálogo e bump comprados à parte liberam na hora pelo mapeamento de configuração
  OFFER_BY_ID['panetones-vulcao'].wiapyProductId = 'pid-vulcao-teste'
  await post(payload({ id: 'imd-4', status: 'paid', email: 'so-oferta@example.com', checkoutId: 'pid-vulcao-teste', amount: 2790 }))
  const f = await grab(async () => (await rcw('so-oferta@example.com', false, '9.9.9.5')).json())
  assert.equal(f.codes.length, 1)
  assert.deepEqual((await meWith('so-oferta@example.com', f.codes[0])).items, ['panetones-vulcao'])
  OFFER_BY_ID['panetones-vulcao'].wiapyProductId = ''
  await post(payload({ id: 'imd-5', status: 'paid', email: 'so-bump@example.com', checkoutId: BUMP_ID, amount: 790 }))
  const g = await grab(async () => (await rcw('so-bump@example.com', false, '9.9.9.6')).json())
  assert.deepEqual((await meWith('so-bump@example.com', g.codes[0])).items, ['bump'])

  // 7) limite próprio da pergunta de espera: depois de 60 por e-mail, 429
  let last = 200
  for (let i = 0; i < 62; i++) last = (await rcw('spam@example.com', true, '9.9.8.8')).status
  assert.equal(last, 429)
  ok('acesso imediato: webhook paid -> código -> sessão -> direito (kit, bump, oferta), espera neutra com limite, compra antiga não é revelada')
}

// SISTEMA DE CATÁLOGO: pilha de valor, bullets, depoimentos, trilhas, ganchos, coleções e eventos novos
{
  const cat = await import('../../shared/catalog.js')
  const { OFFERS: OF, OFFER_BY_ID: BY, TRACKS, HOOKS, COLLECTIONS, offerValueFromCents, collectionMissing, collectionSumCents, trackNext, hooksFrom, isCollectionId } = cat
  const tierS = OF.filter((o) => o.tierS)
  assert.equal(tierS.length, 10)
  // pilha de valor: 2 a 3 bônus, soma calculada (nunca digitada) e no máximo ~2,5x o preço
  const wantBonus: Record<string, number> = { 'panetones-vulcao': 2, 'panetones-vitrine': 3, 'caixas-doces-natal': 2, 'segredo-recheios': 3, 'receitas-explodir-vendas': 3, 'sobremesas-natal': 2, 'ceia-doce': 3, 'mini-panetones': 2, 'rabanada-padaria': 2, 'doces-para-revender': 3 }
  for (const o of tierS) {
    assert.equal(o.bonus?.length, wantBonus[o.id], `${o.id}: nº de bônus`)
    assert.ok(o.stack && o.stack.steps.length >= 3 && o.stack.before && o.stack.after, `${o.id}: stack`)
    const sum = o.priceCents + o.bonus!.reduce((t, b) => t + b.valueCents, 0)
    assert.equal(offerValueFromCents(o), sum)
    assert.ok(sum > o.priceCents && sum <= o.priceCents * 2.6, `${o.id}: valor somado ${sum} fora de 1x a 2,6x`)
    assert.ok(o.bullets && o.bullets.length >= 5 && o.bullets.length <= 7, `${o.id}: 5 a 7 bullets`)
  }
  assert.deepEqual(OF.map((o) => o.testimonials.length).filter(Boolean), [], 'depoimentos vazios por padrão (nada inventado)')
  assert.equal(offerValueFromCents(BY['panetones-vulcao']), 4980)
  // nenhum texto novo promete renda, número de renda, escassez, relógio, "mais pedida" ou "preço antigo"
  const texts: string[] = []
  for (const o of tierS) texts.push(o.headline, o.promise, ...(o.bullets ?? []), ...o.stack!.steps, o.stack!.before, o.stack!.after, ...o.bonus!.map((b) => b.title))
  for (const h of HOOKS) texts.push(h.text)
  for (const c of COLLECTIONS) texts.push(c.title, c.goal)
  for (const t of TRACKS) texts.push(t.title, t.tagline)
  const bad = /últim[ao]s? (unidades?|vagas?)|só hoje|acaba (hoje|em)|esgot|restam|mais pedida|preço antigo|faturamento|ganhe \d|R\$\s?\d[\d.,]*\s*(por|\/|ao)\s*(dia|mês|semana)|renda garantida|garantid[oa] de (lucro|renda|venda)/i
  for (const t of texts) assert.ok(!bad.test(t), `texto proibido: ${t}`)
  // trilhas: ordem aprender, ceia, vender, temporadas; ofertas existem e a pilha vive
  assert.deepEqual(TRACKS.map((t) => t.id), ['aprender', 'ceia', 'vender', 'temporadas'])
  for (const t of TRACKS) for (const st of t.steps) assert.ok(BY[st.offer], `trilha ${t.id}: ${st.offer}`)
  for (const h of HOOKS) assert.ok(BY[h.from] && BY[h.to] && h.from !== h.to, `gancho ${h.from} -> ${h.to}`)
  const has = (a: string, b: string) => HOOKS.some((h) => h.from === a && h.to === b)
  assert.ok(has('mini-panetones', 'caixas-doces-natal'), 'ponte Mini -> Caixas')
  assert.ok(has('panetones-vitrine', 'ceia-doce'), 'ponte Vitrine -> Ceia Doce')
  assert.ok(HOOKS.some((h) => h.kind === 'bridge'))
  assert.equal(hooksFrom('panetones-vulcao').length, 1)
  assert.ok(TRACKS.some((t) => /Encomendas de dezembro/i.test(t.title) || /Encomendas de dezembro/i.test(t.tagline)) || COLLECTIONS.some((c) => c.title === 'Encomendas de Dezembro'))
  assert.ok(!texts.some((t) => /Lucro em dezembro/i.test(t)))
  // coleções: 5, itens existem, Primeira Fornada = Vulcão + Rabanada, sem preço = sem compra
  assert.equal(COLLECTIONS.length, 5)
  assert.deepEqual(COLLECTIONS.find((c) => c.id === 'primeira-fornada')!.items, ['panetones-vulcao', 'rabanada-padaria'])
  for (const c of COLLECTIONS) {
    for (const id of c.items) assert.ok(BY[id], `coleção ${c.id}: ${id}`)
    assert.equal(c.collectionPriceCents, null)
    assert.equal(c.checkoutUrl, '')
    assert.equal(collectionSumCents(c), c.items.reduce((t, id) => t + BY[id].priceCents, 0))
  }
  const pf = COLLECTIONS.find((c) => c.id === 'primeira-fornada')!
  assert.deepEqual(collectionMissing(pf, ['panetones-vulcao']), ['rabanada-padaria'])
  assert.deepEqual(collectionMissing(pf, ['panetones-vulcao', 'rabanada-padaria']), [])
  assert.equal(isCollectionId('primeira-fornada'), true)
  assert.equal(isCollectionId('x'), false)
  // próximo passo da trilha
  const aprender = TRACKS[0]
  assert.equal(trackNext(aprender, [])!.offer, aprender.steps[0].offer)
  assert.equal(trackNext(aprender, [aprender.steps[0].offer])!.index, 1)
  assert.equal(trackNext(aprender, aprender.steps.map((x) => x.offer)), null)
  // eventos novos: validação
  assert.equal((await ev({ name: 'journey.view', count: 3 })).status, 200)
  assert.equal((await ev({ name: 'hook.click', itemId: 'panetones-vulcao', to: 'segredo-recheios', from: 'detail' })).status, 200)
  assert.equal((await ev({ name: 'hook.click', itemId: 'panetones-vulcao', to: 'nao-existe' })).status, 400)
  assert.equal((await ev({ name: 'hook.click', to: 'segredo-recheios' })).status, 400)
  for (const name of ['collection.view', 'collection.click', 'collection.interest']) {
    assert.equal((await ev({ name, collectionId: 'primeira-fornada', from: 'catalog' })).status, 200, name)
    assert.equal((await ev({ name, collectionId: 'nao-existe' })).status, 400, name)
  }
  assert.equal((await ev({ name: 'journey.view' }, {})).status, 401)
  // webhook: coleção e "Leve tudo" liberam os itens (só com wiapyProductId configurado); vazio não libera nada
  const { detectOffers } = await import('../wiapy.js')
  const fake = (checkoutId: string) => parseWiapyPayload(payload({ id: 'x', status: 'paid', checkoutId, amount: 1000 }))
  assert.deepEqual(detectOffers(fake('pid-colecao-teste')), [])
  pf.wiapyProductId = 'pid-colecao-teste'
  assert.deepEqual(detectOffers(fake('pid-colecao-teste')), ['panetones-vulcao', 'rabanada-padaria'])
  pf.wiapyProductId = ''
  COMBO.wiapyProductId = 'pid-combo-teste'
  assert.deepEqual(detectOffers(fake('pid-combo-teste')), OF.filter((o) => o.catalog && o.enabled).map((o) => o.id))
  COMBO.wiapyProductId = ''
  assert.deepEqual(detectOffers(fake('pid-combo-teste')), [])
  void cat
  ok('sistema de catálogo: pilha de valor calculada, bullets 5-7, depoimentos vazios, trilhas/ganchos/pontes/coleções, eventos novos, coleção e combo liberam itens pelo webhook, sem renda/escassez')
}

// GUIA VISUAL por oferta: cor de destaque, paleta e fonte do título, com contraste AA
{
  const { OFFERS: OF, OFFER_VISUAL, visualOf, hasOwnVisual, contrastRatio, readableOn, titleFontUrl, INK } = await import('../../shared/catalog.js')
  const tierS = OF.filter((o) => o.tierS)
  assert.deepEqual(Object.keys(OFFER_VISUAL).sort(), tierS.map((o) => o.id).sort(), 'as 10 ofertas tier S têm guia visual')
  const hex = /^#[0-9a-f]{6}$/i
  const fams = new Set<string>()
  for (const o of tierS) {
    const v = visualOf(o.id)
    assert.ok(hasOwnVisual(o.id))
    for (const c of [v.accentColor, v.palette.primary, v.palette.secondary, v.palette.bg]) assert.match(c, hex, `${o.id}: ${c}`)
    // texto e botão na cor de destaque: AA (4,5:1) contra branco e contra o fundo da paleta; texto escuro do app sobre o fundo também
    assert.ok(contrastRatio(v.accentColor, '#ffffff') >= 4.5, `${o.id}: destaque x branco ${contrastRatio(v.accentColor, '#ffffff').toFixed(2)}`)
    assert.ok(contrastRatio(v.accentColor, v.palette.bg) >= 4.5, `${o.id}: destaque x fundo`)
    assert.ok(contrastRatio(INK, v.palette.bg) >= 4.5, `${o.id}: texto x fundo`)
    // chip com a cor secundária: o texto (branco ou escuro) escolhido tem AA
    assert.ok(contrastRatio(readableOn(v.palette.secondary), v.palette.secondary) >= 4.5, `${o.id}: texto no chip ${contrastRatio(readableOn(v.palette.secondary), v.palette.secondary).toFixed(2)}`)
    assert.ok(v.titleFont.family && v.bodyFont, `${o.id}: fontes`)
    assert.match(titleFontUrl(v), /^https:\/\/fonts\.googleapis\.com\/css2\?family=[A-Za-z0-9+]+:wght@\d+&display=swap$/)
    fams.add(v.titleFont.family)
  }
  assert.equal(fams.size, 10, 'cada oferta com a própria fonte de título')
  assert.equal(new Set(tierS.map((o) => visualOf(o.id).accentColor)).size, 10, 'cada oferta com a própria cor de destaque')
  assert.equal(visualOf('cesta-natal-caseira').titleFont.family, '', 'sem guia: visual padrão do app, sem fonte externa')
  assert.equal(titleFontUrl(visualOf('cesta-natal-caseira')), '')
  assert.ok(contrastRatio(visualOf('cesta-natal-caseira').accentColor, '#ffffff') >= 4.5)
  ok('guia visual: 10 ofertas com cor de destaque, paleta e fonte própria; contraste AA conferido; sem guia = padrão do app')
}

// buildMe sem plano
assert.equal(buildMe('a@b.co', []).plan, null)
assert.deepEqual(Object.keys(PLANS), ['completo'])
console.log(`\n${n} grupos de teste passaram.`)
