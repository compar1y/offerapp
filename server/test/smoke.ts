// Teste de fumaça do servidor (sem rede, sem conta, sem dados reais): npm run test:api
// Usa segredos aleatórios gerados na hora, um KV em pasta temporária e um arquivo falso. Nada é gravado no projeto.

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = await mkdtemp(join(tmpdir(), 'panetone-test-'))
process.env.SESSION_SECRET = randomBytes(24).toString('hex')
process.env.FILE_SIGNING_SECRET = randomBytes(24).toString('hex')
process.env.WIAPY_WEBHOOK_TOKEN = randomBytes(12).toString('hex')
process.env.ADMIN_TOKEN = randomBytes(12).toString('hex')
process.env.DATA_FILE = join(tmp, 'db.json')
process.env.FILES_DIR = join(tmp, 'files')
process.env.CHECKOUTS_FILE = join(tmp, 'checkouts.json')
process.env.CHECKOUTS_CACHE_MS = '0'
await writeFile(process.env.CHECKOUTS_FILE, '{}')
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
// as 4 rotas admin/* são UMA função (api/admin/[action].ts); estes adaptadores só colocam a ação na URL
const adminApi = await import('../../api/admin/[action].js')
const viaAdmin = (action: string, method: 'GET' | 'POST') => async (r: Request) => {
  const search = new URL(r.url).search
  return adminApi[method](new Request(`http://x/api/admin/${action}${search}`, { method, headers: r.headers, ...(method === 'POST' ? { body: await r.text() } : {}) }))
}
const grant = { POST: viaAdmin('grant', 'POST') }
const imp = { POST: viaAdmin('import-csv', 'POST') }
const feedback = await import('../../api/feedback.js')
const eventApi = await import('../../api/event.js')
const events = { GET: viaAdmin('events', 'GET') }
const revokeApi = { POST: viaAdmin('revoke', 'POST') }
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
assert.deepEqual(OFFERS.filter((o) => ['kit-lucrativo', 'kit-embalagem-etiqueta', 'fornada-pascoa'].includes(o.id)).map((o) => [o.id, o.kind, o.priceCents, o.enabled, o.wiapyProductId]), [
  ['fornada-pascoa', 'seasonal', 7700, false, ''],
  ['kit-lucrativo', 'upsell', 7700, false, ''],
  ['kit-embalagem-etiqueta', 'downsell', 3700, false, ''],
])
assert.ok(OFFERS.every((o) => o.wiapyProductId === ''), 'nenhuma oferta tem id Wiapy ainda')
assert.ok(OFFERS.every((o) => !('checkoutUrl' in o) && !('status' in o) && !('available' in o)), 'o link e o estado de cada oferta vêm só de public/checkouts.json')
assert.ok(OFFERS.filter((o) => !o.catalog && !o.tool).every((o) => !o.enabled), 'fora do catálogo = desligada (a ferramenta é a única exceção)')
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
  assert.equal(typeof o.badgeNew, 'boolean', o.id)
  assert.ok(o.headline.length > 5 && o.promise.length > 5, `${o.id}: headline e promise preenchidos`)
  const copy = `${o.headline} ${o.promise} ${o.description} ${o.subtitle}`
  assert.ok(!/garant|ganhe|faturar|fature|renda|últimas? (vagas|unidades)|só hoje|termina em|\d+ ?(vagas|restantes)|R\$ ?\d+ ?(por|\/) ?(dia|mês|semana)/i.test(copy), `${o.id}: sem promessa de renda nem escassez falsa`)
}
assert.equal(new Set(OFFERS.map((o) => o.id)).size, OFFERS.length)
const inCatalog = OFFERS.filter((o) => o.catalog)
assert.equal(inCatalog.length, 17, '10 do tier S + 7 de Natal/Ano Novo no catálogo')
assert.ok(inCatalog.every((o) => o.enabled), 'todas as do catálogo estão enabled')
assert.equal(OFFERS.filter((o) => o.tierS).length, 10)
assert.ok(OFFERS.every((o) => o.deliverableType.trim() && o.imageType.trim() && ['2:3', '4:3', '4:5'].includes(o.imageRatio)), 'todo item tem tipo de entregável e briefing de imagem')
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
ok('catálogo: ofertas têm catalog/badgeNew/headline/promise, sem renda numérica nem escassez')

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

// combo "Biblioteca completa": desligado e sem preço por padrão; soma calculada; riscado só se o combo for mais barato
assert.equal(COMBO.enabled, false)
assert.equal(COMBO.comboPriceCents, 9700, 'Biblioteca completa: R$ 97,00 (config)')
assert.equal(COMBO.comboInstallments, null, 'parcelamento vazio por padrão')
assert.equal(COMBO.minAvailable, 10)
assert.equal(COMBO.title, 'Biblioteca completa')
assert.equal(comboSumCents(inCatalog), inCatalog.reduce((t, o) => t + o.priceCents, 0))
assert.equal(comboSumCents([{ priceCents: 2790 }, { priceCents: 3790 }]), 6580)
assert.equal(comboShowStrike(COMBO.comboPriceCents, comboSumCents(inCatalog)), true, 'R$ 97 é menor que a soma')
assert.equal(comboShowStrike(31500, 31500), false, 'preço igual à soma: sem riscado')
assert.equal(comboShowStrike(40000, 31500), false, 'combo mais caro: sem riscado')
assert.equal(comboShowStrike(null, 31500), false, 'sem preço: sem riscado')
assert.equal(comboShowStrike(0, 31500), false)
for (const name of ['combo.view', 'combo.spin', 'combo.click', 'combo.interest']) assert.equal((await ev({ name, from: 'catalog' })).status, 200, name)
assert.equal((await ev({ name: 'combo.view' }, {})).status, 401)
assert.equal((await ev({ name: 'combo.compra' })).status, 400)
const evCombo = (await (await events.GET(new Request('http://x/api/admin/events', { headers: adm }))).json()) as { name: string; props?: Record<string, string> }[]
for (const name of ['combo.view', 'combo.spin', 'combo.click', 'combo.interest']) assert.ok(evCombo.some((e) => e.name === name && e.props?.from === 'catalog'), name)
ok('combo "Biblioteca completa": desligado e sem preço, soma automática, riscado só quando o combo é mais barato, eventos combo.*')

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

// SISTEMA DE CATÁLOGO: pilha de valor, bullets, depoimentos, trilhas, ganchos e eventos novos
{
  const cat = await import('../../shared/catalog.js')
  const { OFFERS: OF, OFFER_BY_ID: BY, TRACKS, HOOKS, offerValueFromCents, trackNext, hooksFrom } = cat
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
  assert.ok(TRACKS.some((t) => /Encomendas de dezembro/i.test(t.title) || /Encomendas de dezembro/i.test(t.tagline)))
  assert.ok(!texts.some((t) => /Lucro em dezembro/i.test(t)))
  // coleções foram removidas do app (ordem do Levi): nenhuma exportação de coleção no catálogo
  assert.equal('COLLECTIONS' in cat, false)
  assert.equal('collectionPrice' in cat, false)
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
  assert.equal((await ev({ name: 'collection.view', collectionId: 'primeira-fornada' })).status, 400, 'evento de coleção não existe mais')
  assert.equal((await ev({ name: 'journey.view' }, {})).status, 401)
  // webhook: a "Biblioteca completa" (combo) libera os itens (só com wiapyProductId configurado); vazio não libera nada
  const { detectOffers, detectBundles } = await import('../wiapy.js')
  const fake = (checkoutId: string) => parseWiapyPayload(payload({ id: 'x', status: 'paid', checkoutId, amount: 1000 }))
  assert.deepEqual(detectOffers(fake('pid-combo-teste')), [], 'o combo grava o direito, não uma lista fixa de produtos')
  COMBO.wiapyProductId = 'pid-combo-teste'
  assert.deepEqual(detectBundles(fake('pid-combo-teste')), ['combo'])
  COMBO.wiapyProductId = ''
  assert.deepEqual(detectBundles(fake('pid-combo-teste')), [])
  void cat
  ok('sistema de catálogo: pilha de valor calculada, bullets 5-7, depoimentos vazios, trilhas/ganchos/pontes, eventos novos, combo grava o direito pelo webhook, sem renda/escassez')
}

// PREÇOS, GATE e DIREITOS do combo (Biblioteca completa)
{
  const C = await import('../../shared/catalog.js')
  const { comboOffers, comboGate, effectiveMin, gateOpen, bundleItems, bundlePending, DEFAULT_COMBO_MIN_AVAILABLE } = C
  const { applyWiapyEvent } = await import('../purchases.js')
  void applyWiapyEvent
  // combo: R$ 97,00 contra a soma das ofertas enabled do catálogo (nunca digitada)
  const items = comboOffers()
  assert.equal(items.length, 17)
  assert.equal(C.comboSumCents(items), 55720, 'soma das 17: R$ 557,20')
  assert.equal(C.COMBO.comboPriceCents, 9700)
  OFFER_BY_ID['kit-lucrativo'].catalog = true
  OFFER_BY_ID['kit-lucrativo'].enabled = true
  assert.equal(C.comboSumCents(comboOffers()), 55720 + OFFER_BY_ID['kit-lucrativo'].priceCents, 'a soma acompanha as ofertas enabled')
  OFFER_BY_ID['kit-lucrativo'].catalog = false
  OFFER_BY_ID['kit-lucrativo'].enabled = false
  assert.equal(C.comboSumCents(comboOffers()), 55720)
  assert.equal(C.comboShowInstallments(null), false)
  assert.equal(C.comboShowInstallments(12), true)
  assert.equal(C.comboShowInstallments(6), false)

  // estado de cada oferta: só o arquivo de checkouts (ready). Sem arquivo nada está pronto.
  const { parseCheckouts, readyIdsOf, buyUrlOf, applyCheckoutPrices, CHECKOUT_IDS, ITEMS: ALLITEMS } = C
  const { loadCheckouts } = await import('../checkouts.js')
  const file = process.env.CHECKOUTS_FILE as string
  const cmap: Record<string, { checkoutUrl: string; ready: boolean; price?: number }> = {}
  const flush = () => writeFile(file, JSON.stringify(cmap))
  const setReady = async (id: string, v: boolean, url = `https://pay.exemplo.test/${id}`) => {
    cmap[id] = { checkoutUrl: v ? url : '', ready: v }
    await flush()
  }
  assert.equal(readyIdsOf(await loadCheckouts()).size, 0, 'arquivo vazio: nada pronto')
  assert.ok(ALLITEMS.length > 0)

  // parseCheckouts: só ids conhecidos, só https, ready exatamente true, price inteiro positivo
  const pc = parseCheckouts({
    'panetones-vulcao': { checkoutUrl: ' https://pay.exemplo.test/a ', ready: true, price: 2790 },
    'panetones-vitrine': { checkoutUrl: 'http://inseguro.test/x', ready: true },
    'segredo-recheios': { checkoutUrl: 'https://pay.exemplo.test/b', ready: 'true' },
    'ceia-doce': { checkoutUrl: 'javascript:alert(1)', ready: true, price: -5 },
    'mini-panetones': { checkoutUrl: 'https://pay.exemplo.test/c', ready: true, price: 12.5 },
    'id-desconhecido': { checkoutUrl: 'https://pay.exemplo.test/z', ready: true },
    combo: 'texto',
  })
  assert.deepEqual(pc['panetones-vulcao'], { checkoutUrl: 'https://pay.exemplo.test/a', ready: true, price: 2790 })
  assert.deepEqual(pc['panetones-vitrine'], { checkoutUrl: '', ready: true }, 'http não vale como link')
  assert.equal(pc['segredo-recheios'].ready, false, 'ready só vale se for exatamente true')
  assert.deepEqual(pc['ceia-doce'], { checkoutUrl: '', ready: true }, 'link inválido e price negativo descartados')
  assert.equal(pc['mini-panetones'].price, undefined, 'price precisa ser inteiro')
  assert.equal(pc['id-desconhecido'], undefined)
  assert.equal(pc.combo, undefined)
  assert.deepEqual(parseCheckouts(null), {})
  assert.deepEqual(parseCheckouts([1]), {})
  // buyUrlOf: ready E link
  assert.equal(buyUrlOf(pc, 'panetones-vulcao'), 'https://pay.exemplo.test/a')
  assert.equal(buyUrlOf(pc, 'panetones-vitrine'), null, 'ready sem link: sem botão Comprar')
  assert.equal(buyUrlOf(parseCheckouts({ 'ceia-doce': { checkoutUrl: 'https://pay.exemplo.test/ok', ready: false } }), 'ceia-doce'), null, 'link sem ready: sem botão Comprar')
  assert.equal(buyUrlOf({}, 'combo'), null)
  // ids do arquivo: as 24 ofertas (23 materiais + a ferramenta calculadora), combo e bump = 26 checkouts; as coleções saíram
  assert.equal(CHECKOUT_IDS.length, OFFERS.length + 2)
  assert.equal(CHECKOUT_IDS.length, 26)
  assert.ok(CHECKOUT_IDS.includes('calculadora'))
  assert.ok(CHECKOUT_IDS.includes('combo') && CHECKOUT_IDS.includes('bump'))
  assert.ok(!CHECKOUT_IDS.includes('primeira-fornada'), 'sem coleções nos checkouts')
  // preços do arquivo: aplicam e voltam ao valor base quando o campo some
  const baseVulcao = OFFER_BY_ID['panetones-vulcao'].priceCents
  applyCheckoutPrices(parseCheckouts({ 'panetones-vulcao': { checkoutUrl: '', ready: false, price: 2990 }, bump: { checkoutUrl: '', ready: false, price: 990 }, combo: { checkoutUrl: '', ready: false, price: 8900 } }))
  assert.equal(OFFER_BY_ID['panetones-vulcao'].priceCents, 2990)
  assert.equal(C.BUMP.priceCents, 990)
  assert.equal(C.COMBO.comboPriceCents, 8900)
  applyCheckoutPrices({})
  assert.equal(OFFER_BY_ID['panetones-vulcao'].priceCents, baseVulcao)
  assert.equal(C.BUMP.priceCents, 790)
  assert.equal(C.COMBO.comboPriceCents, 9700)

  // o public/checkouts.json que vai para produção: estrutura válida (ids conhecidos; ready:true exige link https). Não fixa o conteúdo.
  const real = JSON.parse(await readFile(new URL('../../public/checkouts.json', import.meta.url), 'utf8')) as Record<string, { checkoutUrl?: unknown; ready?: unknown; price?: unknown }>
  for (const [id, e] of Object.entries(real)) {
    assert.ok(CHECKOUT_IDS.includes(id), `public/checkouts.json: id desconhecido ${id}`)
    assert.equal(typeof e.ready, 'boolean', `${id}: ready é booleano`)
    assert.equal(typeof e.checkoutUrl, 'string', `${id}: checkoutUrl é texto`)
    if (e.ready) assert.match(String(e.checkoutUrl), /^https:\/\/\S+$/, `${id}: ready:true exige link https`)
  }
  for (const id of CHECKOUT_IDS) assert.ok(id in real, `public/checkouts.json: falta o id ${id}`)
  // o arquivo de exemplo também é válido e abre o gate do combo (12 prontos e link)
  const exMap = parseCheckouts(JSON.parse(await readFile(new URL('../../checkouts.example.json', import.meta.url), 'utf8')))
  assert.equal(CHECKOUT_IDS.every((id) => id in exMap), true)
  assert.equal(C.readyCount(items.map((o) => o.id), readyIdsOf(exMap)), 12)
  assert.equal(comboGate(exMap).open, true, 'exemplo: combo com link e 12 prontos abre')

  // gate do combo pelo mapa
  const ids = items.map((o) => o.id)
  const mapWith = (n: number, withLink = true, extra: Record<string, string> = {}) => {
    const m: Record<string, { checkoutUrl: string; ready: boolean }> = {}
    for (const id of ids.slice(0, n)) m[id] = { checkoutUrl: `https://pay.exemplo.test/${id}`, ready: true }
    if (withLink) m.combo = { checkoutUrl: 'https://pay.exemplo.test/combo', ready: true }
    for (const [id, u] of Object.entries(extra)) m[id] = { checkoutUrl: u, ready: true }
    return parseCheckouts(m)
  }
  assert.equal(DEFAULT_COMBO_MIN_AVAILABLE, 10)
  assert.equal(comboGate(mapWith(17, false)).open, false, 'sem link do combo: nunca abre')
  assert.deepEqual(comboGate(mapWith(2)), { ready: 2, total: 17, min: 10, open: false })
  assert.equal(comboGate(mapWith(9)).open, false)
  assert.equal(comboGate(mapWith(10)).open, true, '10 prontos + link: abre')
  assert.equal(comboGate(mapWith(17)).open, true)
  assert.equal(comboGate(mapWith(5), 5).open, true, 'o mínimo é configurável')
  assert.equal(effectiveMin(10, 7), 7, 'o mínimo nunca passa do total')
  assert.equal(effectiveMin(null, 3), 3)
  assert.equal(gateOpen(null, 99, 1), false)
  // direitos: comprar o combo grava o direito; /api/me libera os prontos e os demais saem sozinhos quando available vira true
  const BP = 'pid-combo-direito'
  C.COMBO.wiapyProductId = BP
  const EC = 'combo-cliente@example.com'
  const pay = (id: string, status: string, email = EC, checkoutId = BP) => post(payload({ id, status, email, checkoutId, amount: 9700 }))
  await setReady('panetones-vulcao', true)
  await setReady('panetones-vitrine', true)
  await pay('cb-1', 'unpaid')
  assert.deepEqual((await meFor(EC)).items, [], 'PIX pendente não libera')
  await pay('cb-1', 'paid')
  await pay('cb-1', 'paid')
  assert.equal((await purchasesOf(EC)).length, 1, 'idempotente')
  assert.deepEqual((await purchasesOf(EC))[0].bundles, ['combo'])
  let mc = await meFor(EC)
  assert.deepEqual(new Set(mc.items), new Set(['panetones-vulcao', 'panetones-vitrine']), 'só os prontos liberam na hora')
  assert.deepEqual(mc.purchases[0].bundles, ['combo'])
  const rs = readyIdsOf(await loadCheckouts())
  assert.equal(bundleItems('combo', rs).length, 2)
  assert.equal(bundlePending('combo', rs).length, 15)
  await setReady('segredo-recheios', true)
  mc = await meFor(EC)
  assert.ok(mc.items.includes('segredo-recheios'), 'quando ready vira true no arquivo, libera sozinho (sem nova compra)')
  assert.equal(mc.items.length, 3)
  assert.equal((await purchasesOf(EC)).length, 1)
  // um item ligado mas desligado depois (enabled=false) não libera
  OFFER_BY_ID['segredo-recheios'].enabled = false
  assert.ok(!(await meFor(EC)).items.includes('segredo-recheios'))
  OFFER_BY_ID['segredo-recheios'].enabled = true
  await pay('cb-1', 'refunded')
  assert.deepEqual((await meFor(EC)).items, [], 'estorno revoga o direito inteiro')
  await pay('cb-1', 'paid')
  assert.deepEqual((await meFor(EC)).items, [], 'paid atrasado não volta a liberar')
  C.COMBO.wiapyProductId = ''

  // liberação manual com bundle
  const gb = await grant.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: 'bundle-manual@example.com', bundles: ['combo'] }) }))
  assert.equal(gb.status, 200)
  assert.equal((await meFor('bundle-manual@example.com')).items.length, 3, 'vulcão, vitrine e recheios prontos')
  const gb2 = await grant.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: 'bundle-manual2@example.com', bundles: ['primeira-fornada'] }) }))
  assert.equal(gb2.status, 400)

  for (const id of ['panetones-vulcao', 'panetones-vitrine', 'segredo-recheios']) await setReady(id, false)
  assert.equal(readyIdsOf(await loadCheckouts()).size, 0)
  // arquivo ilegível: nada pronto, sem erro
  await writeFile(file, '{ isto não é json')
  assert.equal(readyIdsOf(await loadCheckouts()).size, 0)
  await flush()
  ok('preços (combo R$ 97, sem coleções, preço do arquivo), checkouts.json (parse, https, ready, buyUrl, arquivo real e exemplo válidos), gate (link + prontos >= mínimo) e direitos do combo resolvidos na leitura (libera prontos, libera os outros ao sair, estorno revoga)')
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

// COMUNICAÇÃO DAS OFERTAS: tom de próximo passo, contexto real, sem gatilho comercial, sem estatística inventada, sem escassez
{
  const cat = await import('../../shared/catalog.js')
  const { OFFERS: OF, COPY, OFFER_COPY, HOOKS, TRACKS, ITEMS, BUMP, offerContextFor, bumpContextFor } = cat
  const catalog = OF.filter((o) => o.catalog)
  assert.equal(catalog.length, 17)
  // cada oferta do catálogo tem todos os textos, e os ids de "relatesTo" existem
  const all = new Set<string>([...ITEMS.map((i) => i.id), ...OF.map((o) => o.id)])
  const texts: string[] = []
  for (const o of catalog) {
    const c = OFFER_COPY[o.id]
    assert.ok(c, `${o.id}: sem texto de comunicação`)
    for (const k of ['need', 'cardLine', 'question', 'afterDone', 'afterOpened'] as const) assert.ok(c[k].length >= 20, `${o.id}.${k}`)
    assert.ok(c.relatesTo.length >= 1 && c.relatesTo.every((r: string) => all.has(r) && r !== o.id), `${o.id}: relatesTo`)
    assert.ok(c.need.length <= 110 && c.cardLine.length <= 120, `${o.id}: frase longa demais para o card`)
    texts.push(c.need, c.cardLine, c.question, c.afterDone, c.afterOpened)
  }
  for (const h of HOOKS) texts.push(h.text)
  const flat = (o: unknown): string[] => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o as object).flatMap(flat) : [])
  texts.push(...flat(COPY.nav), ...flat(COPY.library), ...flat(COPY.sections), ...flat(COPY.button), ...flat(COPY.price), ...flat(COPY.bump), COPY.combo.title, COPY.combo.need, COPY.combo.short, COPY.hookLabel, COPY.context.nextStep)
  // nada de gatilho comercial em destaque, estatística inventada, promessa de renda ou escassez; sem travessão
  const banned = /compr[aeo]|oferta|desconto|promo[çc][ãa]o|imperd|corra|garanta|aproveite|\d+\s?%|das alunas|das clientes|mais pedid|mais vendid|últim[ao]s?\b|só hoje|esgot|restam|vagas|faturamento|ganhe|renda|lucro|—/i
  for (const t of texts) assert.ok(!banned.test(t), `texto proibido: ${t}`)
  // áreas e botões com a linguagem combinada
  assert.deepEqual([COPY.nav.library, COPY.nav.journey, COPY.sections.forYou], ['Biblioteca', 'Seu caminho', 'Para você'])
  assert.equal(COPY.button.card, 'Ver como ajuda', 'só nos links de gancho')
  assert.equal(COPY.button.unlock(cat.unlockPrice(2790)).replace(/\u00a0/g, ' '), 'Desbloquear por R$ 27,90')
  assert.equal(COPY.button.unlock(cat.unlockPrice(9700)).replace(/\u00a0/g, ' '), 'Desbloquear por R$ 97')
  assert.equal(COPY.button.unlockAll(cat.unlockPrice(cat.COMBO.comboPriceCents ?? 0)).replace(/\u00a0/g, ' '), 'Desbloquear tudo por R$ 97')
  assert.equal(COPY.button.locked, 'Bloqueado, desbloqueie para acessar')
  texts.push(COPY.button.unlock('R$ 1'), COPY.button.unlockAll('R$ 1'), COPY.button.locked)
  for (const t of texts.slice(-3)) assert.ok(!banned.test(t), `texto proibido: ${t}`)
  assert.equal(COPY.price.sum, 'valor somado dos itens')
  assert.ok(HOOKS.some((h) => /próximo passo natural depois do Vulcão/i.test(h.text)), 'gancho como sugestão de caminho, não estatística')
  assert.ok(!HOOKS.some((h) => /geralmente|costuma|quem faz/i.test(h.text)), 'ganchos sem generalização')
  assert.ok(!texts.some((t) => /Leve tudo/.test(t)))
  // contexto real: feito > trilha > marcado como visto > necessidade
  const vul = OFFER_COPY['panetones-vulcao']!
  const none = { done: {}, seen: {}, owned: [] as string[] }
  let c = offerContextFor('panetones-vulcao', none)
  assert.deepEqual([c.kind, c.label, c.text], ['need', '', vul.need])
  c = offerContextFor('panetones-vulcao', { ...none, seen: { main: true } })
  assert.equal(c.kind, 'opened')
  assert.match(c.label, /Fábrica de Panetones Caseiros/)
  assert.equal(c.text, vul.afterOpened)
  c = offerContextFor('panetones-vulcao', { ...none, seen: { main: true }, done: { main: true } })
  assert.equal(c.kind, 'done')
  assert.equal(c.text, vul.afterDone)
  // trilha: tem o Vulcão (passo anterior) -> o Segredo dos Recheios mostra a trilha e o gancho
  c = offerContextFor('segredo-recheios', { ...none, owned: ['panetones-vulcao'] })
  assert.equal(c.kind, 'trail')
  assert.match(c.label, /Panetone de confeitaria.*1 de 4/)
  assert.equal(c.text, HOOKS.find((h) => h.from === 'panetones-vulcao' && h.to === 'segredo-recheios')!.text)
  // "inCatalog" limita a contagem da trilha aos materiais da biblioteca
  c = offerContextFor('segredo-recheios', { ...none, owned: ['panetones-vulcao'], inCatalog: new Set(['panetones-vulcao', 'segredo-recheios', 'panetones-vitrine']) })
  assert.match(c.label, /1 de 3/)
  // quem já tem o material não vê contexto de oferta
  assert.equal(offerContextFor('panetones-vulcao', { ...none, owned: ['panetones-vulcao'], done: { main: true } }).kind, 'need')
  // Fichas de Socorro
  assert.equal(bumpContextFor({ done: {}, seen: {} }).text, COPY.bump.need)
  assert.equal(bumpContextFor({ done: { 'bonus-06': true }, seen: {} }).text, COPY.bump.afterDone)
  assert.equal(bumpContextFor({ done: {}, seen: { main: true } }).kind, 'opened')
  assert.equal(BUMP.itemId, 'bump')
  assert.ok(TRACKS.length === 4)
  ok('comunicação: 17 ofertas com gancho, frase de card, pergunta e contexto; sem compre/oferta/desconto/estatística/escassez; contexto por feito > trilha > visto > necessidade')
}

// gamificação "Minha fornada": regras de PF, teto diário, níveis, sequência com descanso, desafios semanais
{
  const G = await import('../../shared/game.js')
  const T0 = '2026-11-02' // segunda-feira
  assert.equal(G.weekKey('2026-11-04'), '2026-11-02')
  assert.equal(G.weekKey('2026-11-08'), '2026-11-02')
  assert.equal(G.weekKey('2026-11-09'), '2026-11-09')
  const ctx = (day: string, item: string, n: number): import('../../shared/game.js').DoneCtx => ({ today: day, item, title: item, id: `f${n}` })
  const sumLog = (st: import('../../shared/game.js').GameState) => st.pfLog.reduce((t, e) => t + e.pf, 0)

  // níveis: limites 0/100/300/700, nunca desce
  assert.deepEqual([0, 99, 100, 299, 300, 699, 700, 5000].map(G.levelIndex), [0, 0, 1, 1, 2, 2, 3, 3])
  assert.deepEqual(G.LEVELS.map((l) => l.name), ['Aprendiz', 'Fornada', 'Confeiteira', 'Mestra do Panetone'])
  const lv = G.levelView(60)
  assert.equal(lv.next?.faltam, 40)
  assert.equal(lv.next?.name, 'Fornada')
  assert.equal(G.levelView(10, 2).idx, 2, 'o nível alcançado nunca desce')
  assert.equal(G.levelView(800).next, null)
  assert.match(G.levelUpText(1), /Você agora é Fornada! Continue, a sua próxima parada é Confeiteira\./)

  // primeira vez: +10, selo da receita, ramo +2; mesma receita no mesmo dia não repete
  let st = G.emptyGame(T0)
  const r = G.onDone(st, ctx(T0, 'panetones-vulcao', 1))
  assert.equal(r.st.pf, 10)
  assert.ok(r.st.seals['r:panetones-vulcao'])
  assert.equal(r.st.branch.recheio, 2)
  assert.equal(r.st.pfLog[0].txt, 'Fiz panetones-vulcao')
  const again = G.onDone(r.st, ctx(T0, 'panetones-vulcao', 2))
  assert.equal(again.st, r.st, 'mesmo dia, mesma receita: nada muda')

  // teto: 60 PF por dia no total, e o extrato bate com o total
  st = G.emptyGame(T0)
  const ids = ['main', 'bonus-01', 'bonus-02', 'bonus-03', 'bonus-04', 'bonus-05', 'bonus-06', 'bonus-07', 'bonus-08', 'panetones-vulcao']
  ids.forEach((id, i) => {
    st = G.onDone(st, ctx(T0, id, i)).st
  })
  assert.equal(G.pfOnDay(st, T0), G.DAILY_CAP, 'teto de 60 PF por dia')
  assert.equal(st.pf, sumLog(st), 'o total é a soma do extrato')
  assert.ok(st.pfLog.every((e) => e.pf > 0))
  const capped = G.onDone(st, ctx(T0, 'segredo-recheios', 99))
  assert.equal(capped.st.pf, st.pf, 'passou do teto: ponto não entra')
  assert.ok(capped.msgs.some((m) => /teto de 60 PF/.test(m)))
  // dia seguinte: o teto zera
  const next = G.onDone(capped.st, ctx('2026-11-03', 'segredo-recheios', 100))
  assert.ok(next.st.pf > st.pf)

  // sequência: 3 dias +10, descanso 1x por semana não quebra, 2º descanso na mesma semana reinicia, sem zerar
  let sq = G.emptyGame(T0)
  sq = G.onDone(sq, ctx('2026-11-02', 'main', 1)).st
  sq = G.onDone(sq, ctx('2026-11-03', 'bonus-01', 2)).st
  assert.equal(sq.streak.dias, 2)
  assert.ok(!sq.seals.seq3)
  const d3 = G.onDone(sq, ctx('2026-11-04', 'bonus-02', 3))
  assert.equal(d3.st.streak.dias, 3)
  assert.ok(d3.st.pfLog.some((e) => e.k.startsWith('seq3:') && e.pf === G.PF.seq3))
  assert.ok(d3.st.seals.seq3)
  // descanso: dia 5 pulado, dia 6 continua (dias 4)
  const rest = G.onDone(d3.st, ctx('2026-11-06', 'bonus-03', 4))
  assert.equal(rest.st.streak.dias, 4, 'um dia de descanso por semana não quebra a sequência')
  assert.equal(rest.st.streak.descansoSemana, '2026-11-02')
  assert.ok(rest.msgs.some((m) => /descanso/i.test(m)))
  // segundo descanso na mesma semana (pula o dia 7, volta no dia 8 = domingo? usa 08 com dia 07 pulado): reinicia
  const broke = G.onDone(rest.st, ctx('2026-11-08', 'bonus-04', 5))
  assert.equal(broke.st.streak.dias, 1, 'reinício, nunca zero')
  assert.ok(broke.st.streak.recomecou)
  assert.equal(broke.st.streak.melhor, 4)
  assert.equal(G.streakView(rest.st, '2026-11-12').dias, 0)
  assert.match(G.streakView(rest.st, '2026-11-12').texto, /Recomeço/)
  // 7 dias: +25 uma vez
  let s7 = G.emptyGame(T0)
  for (let i = 0; i < 9; i++) s7 = G.onDone(s7, ctx(`2026-11-${String(2 + i).padStart(2, '0')}`, ids[i], i)).st
  assert.equal(s7.streak.dias, 9)
  assert.equal(s7.pfLog.filter((e) => e.k.startsWith('seq7:')).length, 1)
  assert.equal(s7.pfLog.filter((e) => e.k.startsWith('seq3:')).length, 1, 'bônus único por sequência')
  assert.ok(s7.seals.seq7)
  // sequência desligada: sem bônus
  let off = G.setConfig(G.emptyGame(T0), { sequencia: false })
  for (let i = 0; i < 4; i++) off = G.onDone(off, ctx(`2026-11-${String(2 + i).padStart(2, '0')}`, ids[i], i)).st
  assert.equal(off.streak.dias, 0)
  assert.ok(!off.pfLog.some((e) => e.k.startsWith('seq')))

  // nível sobe, cartão de parabéns, não desce
  let lvSt = G.emptyGame(T0)
  for (let d = 0; d < 12; d++) {
    const day = G.addDays(T0, d)
    lvSt = G.onDone(lvSt, ctx(day, ids[d % ids.length], d)).st
    lvSt = G.onNote(lvSt, { today: day, id: `f${d}`, texto: 'ficou bom', nota: 4 }).st
  }
  assert.ok(lvSt.pf >= 100)
  assert.equal(lvSt.level, 1)
  assert.equal(lvSt.levelCard, 1)
  assert.ok(lvSt.seals['nivel:1'])
  assert.equal(G.levelView(lvSt.pf, lvSt.level).idx, 1)

  // 3ª vez: selo dourado "Receita de casa" +5, e refazer dá +3 uma vez por dia
  let home = G.emptyGame(T0)
  home = G.onDone(home, ctx('2026-11-02', 'panetones-vulcao', 1)).st
  const redo = G.onDone(home, ctx('2026-11-03', 'panetones-vulcao', 2))
  assert.ok(redo.st.pfLog.some((e) => e.k.startsWith('refeita:') && e.pf === 3))
  assert.ok(!redo.st.seals['casa:panetones-vulcao'])
  const third = G.onDone(redo.st, ctx('2026-11-04', 'panetones-vulcao', 3))
  assert.ok(third.st.seals['casa:panetones-vulcao'])
  assert.ok(third.st.pfLog.some((e) => e.k === 'casa:panetones-vulcao' && e.pf === 5))
  assert.equal(G.makesOf(third.st, 'panetones-vulcao'), 3)
  assert.ok(G.sealDef('casa:panetones-vulcao', (x) => x)?.gold)

  // desafios: 3 por semana, lista fixa, +20 cada, +30 extra, máximo 90 por semana
  const w1 = G.pickChallenges('2026-11-02', true)
  assert.equal(new Set(w1).size, 3)
  assert.ok(w1.every((id) => G.challengeById(id)))
  assert.deepEqual(G.pickChallenges('2026-11-02', true), w1, 'sem sorteio: a escolha da semana é fixa')
  assert.notDeepEqual(G.pickChallenges('2026-11-09', true), w1)
  assert.ok(!G.pickChallenges('2026-11-02', false).includes('socorro') && !G.pickChallenges('2026-11-09', false).includes('socorro'))
  let ch = G.emptyGame(T0)
  ch = G.onMetaDia(ch, { today: '2026-11-02' }).st // abre a semana
  const week = ch.challenges.itens
  assert.deepEqual(week, G.pickChallenges('2026-11-02', false))
  // força os 3 desafios da semana em dias diferentes (evita o teto) e confere o total
  const cdone = (state: import('../../shared/game.js').GameState, ev: string, day: string, n: number) => {
    if (ev === 'nova') return G.onDone(state, ctx(day, `bonus-0${(n % 8) + 1}`, n)).st
    if (ev === 'foto') return G.onNote(state, { today: day, id: state.fornadas[0].id, foto: true }).st
    if (ev === 'nota') return G.onNote(state, { today: day, id: state.fornadas[0].id, texto: 'anotei' }).st
    if (ev === 'redo') return G.onDone(state, ctx(day, state.fornadas[0].item, n)).st
    if (ev === 'enc') return G.onEncomenda(state, { today: day, id: `e${n}`, nome: 'Cliente', sabor: 'Clássico', qtd: 2, entrega: day }).st
    if (ev === 'fav') return G.onFav(state, { today: day, item: 'main', title: 'main' }).st
    if (ev === 'meta') return G.onMetaDia(state, { today: day }).st
    if (ev === 'ingr') {
      let s2 = state
      for (const t of G.BASE_CHECKLIST) s2 = G.setChecklist(s2, 'bonus-05', { toggle: t })
      return G.onDone(s2, ctx(day, 'bonus-05', n)).st
    }
    return state
  }
  let wk = G.onDone(G.emptyGame(T0), ctx('2026-11-02', 'main', 0)).st
  wk = G.onDone(wk, ctx('2026-11-02', 'bonus-05', 1)).st // já feita antes: o checklist vale na refeita, sem estourar o teto do dia
  assert.deepEqual(wk.challenges.itens, G.pickChallenges('2026-11-02', false))
  const evs = G.pickChallenges('2026-11-02', false).map((id) => G.challengeById(id)!.ev)
  const before = wk.pf
  evs.forEach((ev, i) => {
    wk = cdone(wk, ev, G.addDays('2026-11-02', i + 1), 10 + i)
  })
  const fromChallenges = wk.pfLog.filter((e) => e.k.startsWith('desafio')).reduce((t, e) => t + e.pf, 0)
  // 3 x 20 + 30 = 90, no máximo: o teto de 60 PF por dia pode cortar um pouco do bônus quando missões e desafios caem no mesmo dia
  assert.ok(fromChallenges <= G.WEEKLY_CHALLENGE_MAX && fromChallenges >= 3 * 20, `desafios pagaram ${fromChallenges}`)
  assert.equal(G.WEEKLY_CHALLENGE_MAX, 90)
  assert.equal(wk.challenges.feitos.length, 3)
  assert.ok(wk.seals.desafio1 && wk.seals.desafio3)
  assert.ok(wk.pf > before)
  // fazer de novo o mesmo evento na semana não paga duas vezes
  const repeat = cdone(wk, 'meta', G.addDays('2026-11-02', 6), 77)
  assert.equal(repeat.pfLog.filter((e) => e.k.startsWith('desafio')).reduce((t, e) => t + e.pf, 0), fromChallenges)
  // semana nova: troca os desafios, sem punição
  const nx = G.onMetaDia(wk, { today: '2026-11-09' }).st
  assert.equal(nx.challenges.semana, '2026-11-09')
  assert.ok(nx.challenges.feitos.length <= 1 && nx.challenges.feitos.every((id) => nx.challenges.itens.includes(id)), 'a semana nova começa do zero')
  assert.equal(nx.pf >= wk.pf, true)

  // livro: foto +5, anotação +3 (uma vez por fornada); presente +10 uma vez
  let bk = G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st
  const pf0 = bk.pf
  bk = G.onNote(bk, { today: T0, id: 'f1', nota: 5, texto: 'deixei 5 min a mais', foto: true }).st
  assert.equal(bk.pfLog.filter((e) => e.k.startsWith('nota:') || e.k.startsWith('foto:')).reduce((t, e) => t + e.pf, 0), 8)
  assert.ok(bk.pf >= pf0 + 8)
  assert.equal(G.onNote(bk, { today: T0, id: 'f1', texto: 'mudei' }).st.pf, bk.pf, 'anotação paga uma vez por fornada')
  const gift = G.onGift(bk, { today: T0, id: 'f1', on: true })
  assert.ok(gift.st.seals.presente)
  assert.equal(G.onGift(gift.st, { today: T0, id: 'f1', on: true }).st.pf, gift.st.pf)

  // encomendas: +10 na primeira, +5 por entregue (3 por dia), sem valores
  let en = G.emptyGame(T0)
  en = G.onEncomenda(en, { today: T0, id: 'e1', nome: 'Vizinha', sabor: 'Chocolate', qtd: 2, entrega: '2026-11-10' }).st
  assert.equal(en.pf, 10)
  assert.ok(en.seals.enc1)
  for (let i = 2; i <= 5; i++) en = G.onEncomenda(en, { today: T0, id: `e${i}`, nome: 'N', sabor: 'S', qtd: 1, entrega: '2026-11-10' }).st
  assert.equal(en.pf, 10 + 0 + 0, 'só a primeira conta pontos de registro')
  const en2 = G.onEncomenda(en, { today: T0, id: 'e6', nome: 'N', sabor: 'S', qtd: 1, entrega: T0 }).st
  assert.equal(en2.pf, en.pf)
  let del = en2
  for (let i = 1; i <= 5; i++) del = G.onEntregue(del, { today: '2026-11-03', id: `e${i}` }).st
  assert.equal(del.pfLog.filter((e) => e.k.startsWith('ent:')).length, G.DELIVERED_PER_DAY, 'no máximo 3 entregas por dia contam ponto')
  assert.equal(G.entreguesOf(del), 5)
  assert.ok(!JSON.stringify(del.encomendas).match(/valor|preco|preço|lucro/i))

  // socorro: +5, no máximo 2 por dia
  let so = G.emptyGame(T0)
  so = G.onSocorro(so, { today: T0, tipo: 'massa-nao-cresce', resolveu: true }).st
  so = G.onSocorro(so, { today: T0, tipo: 'recheio-mole', resolveu: true }).st
  const so3 = G.onSocorro(so, { today: T0, tipo: 'miolo-seco', resolveu: true })
  assert.equal(so.pf, 10)
  assert.equal(so3.st.pf, 10)
  assert.equal(G.onSocorro(so, { today: '2026-11-03', tipo: 'miolo-seco', resolveu: false }).st.pf, 10, 'sem resolver não conta ponto')
  assert.ok(so.seals['socorro:massa-nao-cresce'])

  // outros marcos: meta do dia +2 (1x por dia), conta +15 (1x), checklist +2, sugestão +5, variedade 3/5/8
  const md = G.onMetaDia(G.emptyGame(T0), { today: T0 })
  const semDesafio = (st: import('../../shared/game.js').GameState) => st.pfLog.filter((e) => !e.k.startsWith('desafio') && !e.k.startsWith('missao')).reduce((t, e) => t + e.pf, 0) // o desafio da semana depende do rodízio fixo
  assert.equal(semDesafio(md.st), 2)
  assert.equal(semDesafio(G.onMetaDia(md.st, { today: T0 }).st), 2)
  const ct = G.onConta(G.emptyGame(T0), { today: T0 })
  assert.equal(ct.st.pf, 15)
  assert.equal(G.onConta(ct.st, { today: T0 }).st.pf, 15)
  let ck = G.emptyGame(T0)
  for (const t of G.BASE_CHECKLIST) ck = G.setChecklist(ck, 'main', { toggle: t })
  assert.ok(G.checklistComplete(ck.ingr.main))
  const withCk = G.onDone(ck, ctx(T0, 'main', 1))
  assert.equal(withCk.st.pfLog.filter((e) => !e.k.startsWith('desafio') && !e.k.startsWith('missao')).reduce((t, e) => t + e.pf, 0), 12, '+10 da receita e +2 do checklist antes de começar')
  assert.ok(withCk.st.challenges.feitos.includes('ingr'), 'o checklist também fecha o desafio de ingredientes')
  assert.equal(G.checklistComplete(withCk.st.ingr.main), false, 'a lista zera para a próxima fornada')
  const sug = G.suggestionOf('2026-11-02', ['main', 'panetones-vulcao'])
  assert.ok(sug && ['main', 'panetones-vulcao'].includes(sug.item))
  assert.equal(G.suggestionOf('2026-11-02', []), null)
  const withSug = G.onDone(G.emptyGame(T0), { ...ctx(T0, sug!.item, 1), sugestao: sug!.item })
  assert.equal(withSug.st.pf, 15)
  let vr = G.emptyGame(T0)
  const catItems = ['main', 'panetones-vulcao', 'panetones-vitrine', 'natal-criancas', 'ceia-doce', 'caixas-doces-natal', 'bonus-07', 'bonus-06']
  catItems.forEach((id, i) => {
    vr = G.onDone(vr, ctx(G.addDays(T0, i * 2), id, i)).st
  })
  assert.ok(vr.seals.var3 && vr.seals.var5 && vr.seals.var8)
  assert.equal(vr.pfLog.filter((e) => /^var\d$/.test(e.k)).length, 3)

  // a bolinha: no máximo 1, some depois de aberta, nunca por venda
  const titleOf = (x: string) => x
  const sx = G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st
  const step = G.nextStepOf(sx, { today: '2026-11-03', titleOf, seenNotDone: ['panetones-vulcao'] })
  assert.equal(step?.to, '/fornada/livro', 'anotar a fornada de ontem vem primeiro')
  assert.equal(G.dotCount(sx, step), 1)
  assert.equal(G.dotCount({ ...sx, ack: step!.key }, step), 0, 'some depois que a cliente abre')
  assert.equal(G.dotCount({ ...sx, semPressao: true }, step), 0)
  assert.equal(G.dotCount(sx, null), 0)
  assert.ok(!/compr|oferta|desconto|R\$/i.test(step!.text))
  const onlyTrail = G.nextStepOf(G.emptyGame(T0), { today: T0, titleOf, seenNotDone: ['panetones-vulcao', 'main'] })
  assert.equal(onlyTrail?.to, '/produto/panetones-vulcao')

  // extras por progresso (nunca por gastar PF), com texto real
  assert.ok(G.EXTRAS.length >= 12)
  assert.ok(G.EXTRAS.every((e) => e.blocks.length >= 2 && e.blocks.every((b) => b.p || b.ul?.length)))
  const lv1 = G.EXTRAS.find((e) => e.req.t === 'level' && e.req.n === 1)!
  assert.equal(G.extraUnlocked(lv1, G.emptyGame(T0)), false)
  assert.equal(G.extraUnlocked(lv1, { ...G.emptyGame(T0), pf: 100, level: 1 }), true)
  assert.equal(G.extraUnlocked(lv1, { ...G.emptyGame(T0), semPressao: true }), true, 'sem pressão: tudo aberto')
  assert.match(G.extraReason(G.EXTRAS[1]), /^Extra do app, liberado por progresso\./)

  // Meu mês: números reais
  const mv = G.monthView(vr, '2026-11')
  assert.equal(mv.receitas, 8)
  assert.match(mv.texto, /Em novembro você fez 8 receitas e ganhou \d+ selos\./)
  assert.match(G.monthView(G.emptyGame(T0), '2026-11').texto, /ainda não há receitas/)

  // textos fixos de aviso honesto e frases: sem promessa, sem escassez, sem renda
  assert.equal(G.GAME_TEXT.pontos, 'Pontos de Fornada contam o que você marcou como feito. Não valem dinheiro e não são sorteio.')
  assert.equal(G.GAME_TEXT.extras, 'Extra do app, liberado por progresso. Nada do que você comprou fica trancado.')
  assert.equal(G.GAME_TEXT.encomendas, 'Este caderno é só seu. O app não calcula nem promete ganho.')
  assert.equal(G.GAME_TEXT.privacidade, 'Suas fotos e anotações ficam no seu aparelho.')
  assert.equal(G.PHRASES.length, 30)
  const bannedGame = /lucro|renda\b|\bganhe\b|fatur|garanta|imperd|últim[ao]s\b|esgot|restam|vagas|desconto|promo[çc]|vai vender|corra|só hoje|punição|perdeu/i
  const full = G.statsOf(G.emptyGame(T0), T0)
  const stats = { ...full, semana: 4, hoje: 1, total: 12, dias: 8, fotos: 3, notas: 6, selos: 9, socorros: 1, encomendas: 3, entregues: 3, nivel: 2, variedade: 5, favs: 2, desafiosSemana: 2, casa: 1, presentes: 1, mes: 4 }
  for (const p of G.PHRASES) {
    assert.ok(!bannedGame.test(p.text(stats)), `frase proibida: ${p.text(stats)}`)
  }
  assert.ok(G.PHRASES.filter((p) => p.when(stats)).length >= 25, 'quase todas as frases têm condição real')
  const quiet = { ...stats, semana: 0 }
  assert.ok(bannedGame.test(G.PHRASES[22].text(quiet)) === false)
  assert.ok(G.PHRASES.every((p, i) => p.id === `p${String(i + 1).padStart(2, '0')}`))
  for (const t of [G.GAME_TEXT.extrato, G.GAME_TEXT.descanso, G.GAME_TEXT.semPressao, ...G.DAILY_GOALS, ...G.CHALLENGES.map((c) => c.txt), ...G.EXTRAS.flatMap((e) => [e.title, ...e.blocks.flatMap((b) => [b.h, b.p ?? '', ...(b.ul ?? [])])])]) assert.ok(!bannedGame.test(t), `texto proibido: ${t}`)
  assert.ok(G.incentiveOf(G.statsOf(G.emptyGame(T0), T0), T0).length > 10)
  // sem pressão e apagar tudo
  const sp = G.setConfig(vr, { semPressao: true })
  assert.equal(sp.semPressao, true)
  assert.equal(sp.pf, vr.pf, 'os pontos continuam guardados, só ficam escondidos')
  const wiped = G.eraseAll('2026-12-01')
  assert.equal(wiped.pf, 0)
  assert.deepEqual(wiped.fornadas, [])
  assert.deepEqual(Object.keys(wiped.seals), ['nivel:0'])
  // cada selo tem desenho funcional pronto e nome de arquivo mapeado para trocar por imagem
  assert.deepEqual(Object.keys(G.SEAL_FILES).sort(), ['album', 'aprendiz', 'casa', 'confeiteira', 'constancia', 'conta', 'contas', 'cozinha', 'desafio', 'domingo', 'encomenda', 'fornada', 'lua', 'madrugadora', 'mestra', 'natal', 'presente', 'receita', 'sequencia', 'socorro', 'tarde', 'variedade', 'venda', 'volta'])
  assert.ok(G.STATIC_SEALS.every((x) => x.icon in G.SEAL_FILES))
  ok('gamificação: níveis 0/100/300/700, teto 60 PF/dia, sequência com descanso e recomeço, desafios 3x20+30=90, selos, livro, encomendas, socorro, extras por nível, bolinha única, frases e avisos honestos')
}

// ---------------------------------------------------------------- Conta da Fornada (ferramenta R$ 19,90, fora do combo)
{
  const { signSession } = await import('../crypto.js')
  const calcApi = await import('../../api/calc/[action].js')
  const { CHECKOUT_IDS, comboOffers, comboItemIds, comboGate, parseCheckouts } = await import('../../shared/catalog.js')
  const tk = (email: string) => ({ authorization: `Bearer ${signSession(email)}`, 'content-type': 'application/json' })
  const call = (action: string, method: string, email: string | null, body?: unknown) =>
    (calcApi as unknown as Record<string, (r: Request) => Promise<Response>>)[method](
      new Request(`http://x/api/calc/${action}`, { method, headers: email ? tk(email) : { 'content-type': 'application/json' }, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }),
    )
  const meOf = async (email: string) => (await (await me.GET(new Request('http://x/api/me', { headers: tk(email) }))).json()) as { items: string[]; tools: { calculadora: { owned: boolean; roundUsed: boolean; roundRecipe: number | null } } }
  const evNames = async () => ((await (await events.GET(new Request('http://x/api/admin/events', { headers: adm }))).json()) as { name: string; email?: string; props?: Record<string, unknown> }[])

  // 28. as 4 rotas admin são UMA função
  {
    const adm2 = { authorization: `Bearer ${A}`, 'content-type': 'application/json' }
    assert.equal((await adminApi.GET(new Request('http://x/api/admin/nada', { headers: adm2 }))).status, 404)
    assert.equal((await adminApi.GET(new Request('http://x/api/admin/grant', { headers: adm2 }))).status, 405, 'método errado')
    assert.equal((await adminApi.GET(new Request('http://x/api/admin/events'))).status, 401, 'sem token')
    await grant.POST(new Request('http://x', { method: 'POST', headers: adm2, body: JSON.stringify({ email: 'rev-admin@example.com', plan: 'completo' }) }))
    assert.ok((await meFor('rev-admin@example.com')).items.includes('main'))
    const rv = await revokeApi.POST(new Request('http://x', { method: 'POST', headers: adm2, body: JSON.stringify({ email: 'rev-admin@example.com' }) }))
    assert.equal(rv.status, 200)
    assert.deepEqual((await meFor('rev-admin@example.com')).items, [])
    ok('admin: grant, import-csv, revoke e events numa função só (404 ação desconhecida, 405 método, 401 sem token)')
  }

  // 29. catálogo e combo: a ferramenta fica FORA do combo
  {
    const tool = OFFER_BY_ID.calculadora
    assert.equal(tool.priceCents, 1990)
    assert.ok(tool.tool && tool.enabled && !tool.catalog)
    assert.ok(!comboOffers().some((o) => o.id === 'calculadora'), 'o combo não inclui a calculadora')
    assert.ok(!comboItemIds().includes('calculadora'))
    const somaSemTool = OFFERS.filter((o) => o.catalog && o.enabled).reduce((t, o) => t + o.priceCents, 0)
    assert.equal(comboSumCents(comboOffers()), somaSemTool, 'a soma riscada não conta a calculadora')
    assert.equal(CHECKOUT_IDS.length, 26)
    assert.equal(OFFERS[0].id, 'calculadora', 'é a primeira da lista')
    // o gate do combo (>= 10 prontos) não conta a calculadora: só ela pronta = 0 de 17
    const soTool = parseCheckouts({ calculadora: { checkoutUrl: 'https://pay.exemplo.test/c', ready: true }, combo: { checkoutUrl: 'https://pay.exemplo.test/combo', ready: true } })
    const gt = comboGate(soTool)
    assert.equal(gt.ready, 0)
    assert.equal(gt.total, 17)
    assert.equal(gt.open, false)
    // quem leva a Biblioteca completa NÃO ganha a ferramenta
    assert.ok(!itemsFor(null, false, [], ['combo'], new Set(OFFERS.map((o) => o.id))).includes('calculadora'))
    ok('Conta da Fornada: R$ 19,90, primeira da lista, fora do combo (itens, soma riscada e gate)')
  }

  // 30. webhook libera só a ferramenta (código público e id interno), idempotente, estorno revoga só ela
  {
    const CODE = 'CalcPub1234'
    const INTERNAL = 'aabbccddeeff001122334455'
    await writeFile(process.env.CHECKOUTS_FILE!, JSON.stringify({ calculadora: { checkoutUrl: `https://pay.wiapy.com/${CODE}`, ready: true } }))
    const EM = 'calc-a@example.com'
    const pg = (id: string, status: string, email: string, checkoutId: string, amount = 1990) => post(payload({ id, status, email, checkoutId, amount }))
    await pg('c-1', 'unpaid', EM, CODE)
    assert.ok(!(await meFor(EM)).items.includes('calculadora'), 'pendente não libera')
    await pg('c-1', 'declined', EM, CODE)
    assert.ok(!(await meFor(EM)).items.includes('calculadora'), 'recusado não libera')
    await pg('c-1', 'paid', EM, CODE)
    const m1 = await meOf(EM)
    assert.deepEqual(m1.items, ['calculadora'], 'só a ferramenta, sem kit nem bump')
    assert.equal(m1.tools.calculadora.owned, true)
    await pg('c-1', 'paid', EM, CODE)
    assert.equal((await purchasesOf(EM)).length, 1, 'idempotente por payment.id')
    // id interno via env
    process.env.CALC_CHECKOUT_IDS = INTERNAL
    await pg('c-2', 'paid', 'calc-b@example.com', INTERNAL)
    assert.deepEqual((await meFor('calc-b@example.com')).items, ['calculadora'])
    delete process.env.CALC_CHECKOUT_IDS
    // checkout desconhecido não libera
    await pg('c-3', 'paid', 'calc-c@example.com', 'outroCheckout99')
    assert.ok(!(await meFor('calc-c@example.com')).items.includes('calculadora'))
    // valor diferente: só avisa (evento), libera mesmo assim
    await pg('c-4', 'paid', 'calc-d@example.com', CODE, 990)
    assert.ok((await meFor('calc-d@example.com')).items.includes('calculadora'))
    assert.ok((await evNames()).some((e) => e.name === 'purchase.amount_mismatch' && e.email === 'calc-d@example.com'))
    // cliente que tem kit + ferramenta: o estorno da ferramenta mantém o kit
    const EK = 'calc-kit@example.com'
    await post(payload({ id: 'k-1', status: 'paid', email: EK, checkoutId: 'r2PHgYwK6CVi', amount: 3790 }))
    await pg('c-5', 'paid', EK, CODE)
    const both = await meFor(EK)
    assert.ok(both.items.includes('main') && both.items.includes('calculadora'))
    await pg('c-5', 'refunded', EK, CODE)
    const after = await meOf(EK)
    assert.ok(after.items.includes('main') && !after.items.includes('calculadora'), 'estorno revoga só a ferramenta')
    assert.equal(after.tools.calculadora.owned, false)
    await pg('c-1', 'chargedback', EM, CODE)
    assert.deepEqual((await meFor(EM)).items, [], 'chargeback também revoga')
    await pg('c-1', 'paid', EM, CODE) // pago atrasado depois de estorno não volta (regra geral do webhook)
    assert.deepEqual((await meFor(EM)).items, [])
    ok('webhook: calculadora por código público e id interno, idempotente, pendente/recusado não libera, valor diferente só avisa, estorno/chargeback revoga só a ferramenta')
  }

  // 31. API: rodada grátis no servidor, sync com direito, export e apagar
  {
    const R = 'calc-round@example.com'
    assert.equal((await call('round', 'POST', null, { recipe: 1, contaId: 'a' })).status, 401)
    assert.equal((await call('round', 'GET', R)).status, 405)
    assert.equal((await call('nada', 'POST', R, {})).status, 404)
    assert.equal((await call('round', 'POST', R, { recipe: 0, contaId: 'a' })).status, 400)
    assert.equal((await call('round', 'POST', R, { recipe: 5, contaId: '' })).status, 400)
    assert.deepEqual((await meOf(R)).tools.calculadora, { owned: false, roundUsed: false, roundRecipe: null })
    const r1 = await call('round', 'POST', R, { recipe: 3, contaId: 'conta-1' })
    assert.equal(r1.status, 200)
    assert.equal(((await r1.json()) as { started: boolean }).started, true)
    const r1b = await call('round', 'POST', R, { recipe: 3, contaId: 'conta-1' })
    assert.equal(((await r1b.json()) as { started: boolean }).started, false, 'mesma receita: idempotente')
    assert.equal((await call('round', 'POST', R, { recipe: 4, contaId: 'conta-2' })).status, 409, 'outra receita sem trocar: usada')
    const sw = await call('round', 'POST', R, { recipe: 4, contaId: 'conta-1', swap: true })
    assert.equal(sw.status, 200, 'uma troca dentro de 24 h')
    assert.equal((await call('round', 'POST', R, { recipe: 5, contaId: 'conta-1', swap: true })).status, 409, 'só uma troca')
    assert.deepEqual((await meOf(R)).tools.calculadora, { owned: false, roundUsed: true, roundRecipe: 4 })
    // corrida: duas chamadas ao mesmo tempo, só uma ganha
    const RR = 'calc-race@example.com'
    const race = await Promise.all([call('round', 'POST', RR, { recipe: 1, contaId: 'x' }), call('round', 'POST', RR, { recipe: 2, contaId: 'y' }), call('round', 'POST', RR, { recipe: 3, contaId: 'z' })])
    assert.equal(race.filter((x) => x.status === 200).length, 1, 'a rodada grátis é uma só, contada no servidor')
    // sem o direito: sync é 403, export e delete funcionam (só sessão)
    assert.equal((await call('sync', 'GET', R)).status, 403)
    assert.equal((await call('sync', 'PUT', R, { doc: {} })).status, 403)
    const exp0 = await call('export', 'GET', R)
    assert.equal(exp0.status, 200)
    assert.match(exp0.headers.get('content-disposition') ?? '', /conta-da-fornada\.json/)
    assert.equal((await call('delete', 'POST', R, {})).status, 200)
    assert.equal((await call('sync', 'GET', null)).status, 401)

    // com o direito
    const P = 'calc-pago@example.com'
    await grant.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: P, offers: ['calculadora'] }) }))
    assert.ok((await meOf(P)).tools.calculadora.owned)
    const { docVazio } = await import('../../shared/calc-sync.js')
    const { contaVazia } = await import('../../shared/calc.js')
    const g0 = (await (await call('sync', 'GET', P)).json()) as { doc: { versao: number; contas: unknown[] } }
    assert.equal(g0.doc.versao, 0)
    assert.equal(g0.doc.contas.length, 0)
    const t1 = '2026-11-02T10:00:00.000Z'
    const t2 = '2026-11-02T11:00:00.000Z'
    const c1 = { ...contaVazia('Aparelho A', t1, 'c-um'), atualizadaEm: t1 }
    const c2 = { ...contaVazia('Só no B', t1, 'c-dois'), atualizadaEm: t1 }
    const docA = { ...docVazio(t1), contas: [c1] }
    const putA = await call('sync', 'PUT', P, { doc: docA })
    assert.equal(putA.status, 200)
    const dA = ((await putA.json()) as { doc: { versao: number; contas: { id: string; nome: string }[] } }).doc
    assert.equal(dA.versao, 1)
    assert.equal(dA.contas.length, 1)
    // segundo aparelho: edita a mesma conta (mais recente) e cria outra: merge por item
    const docB = { ...docVazio(t1), contas: [{ ...c1, nome: 'Editada no B', atualizadaEm: t2 }, c2] }
    const dB = ((await (await call('sync', 'PUT', P, { doc: docB })).json()) as { doc: { versao: number; contas: { id: string; nome: string }[] } }).doc
    assert.equal(dB.versao, 2)
    assert.equal(dB.contas.length, 2)
    assert.equal(dB.contas.find((c) => c.id === 'c-um')?.nome, 'Editada no B', 'a mais recente vence')
    // versão velha do A não sobrescreve a mais nova
    const dA2 = ((await (await call('sync', 'PUT', P, { doc: docA })).json()) as { doc: { contas: { id: string; nome: string }[] } }).doc
    assert.equal(dA2.contas.find((c) => c.id === 'c-um')?.nome, 'Editada no B')
    assert.equal(dA2.contas.length, 2)
    // inválido e grande demais
    assert.equal((await call('sync', 'PUT', P, '{ não é json')).status, 400)
    assert.equal((await call('sync', 'PUT', P, { doc: { v: 99 } })).status, 400)
    const grande = { ...docVazio(t1), contas: Array.from({ length: 30 }, (_, i) => ({ ...contaVazia('x'.repeat(100), t1, `g${i}`), nota: 'y'.repeat(20000) })) }
    const big = await call('sync', 'PUT', P, { doc: grande })
    assert.ok([400, 413].includes(big.status), `grande demais recusado (${big.status})`)
    // exportar traz a cópia; apagar remove só o servidor; contador da rodada continua
    const ex = (await (await call('export', 'GET', P)).json()) as { doc: { contas: unknown[] } }
    assert.equal(ex.doc.contas.length, 2)
    assert.equal((await call('delete', 'POST', P, {})).status, 200)
    assert.equal(((await (await call('sync', 'GET', P)).json()) as { doc: { contas: unknown[] } }).doc.contas.length, 0)
    // estorno: perde o sync, mantém o export; dados continuam no servidor para quando ela voltar a ter acesso
    await call('sync', 'PUT', P, { doc: docA })
    await revokeApi.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: P }) }))
    assert.equal((await call('sync', 'GET', P)).status, 403)
    const exAfter = (await (await call('export', 'GET', P)).json()) as { doc: { contas: unknown[] } }
    assert.equal(exAfter.doc.contas.length, 1, 'os dados dela ficam depois do estorno')
    // limite por hora
    const L = 'calc-limite@example.com'
    await grant.POST(new Request('http://x', { method: 'POST', headers: adm, body: JSON.stringify({ email: L, offers: ['calculadora'] }) }))
    let last = 200
    for (let i = 0; i < 70 && last !== 429; i++) last = (await call('sync', 'GET', L)).status
    assert.equal(last, 429, 'passou de 60 por hora')
    // eventos
    const names = (await evNames()).map((e) => e.name)
    assert.ok(names.includes('calc.round.start') && names.includes('calc.sync') && names.includes('calc.delete'))
    // /api/event aceita calc.* sem guardar número
    const evr = await eventApi.POST(new Request('http://x/api/event', { method: 'POST', headers: tk(P), body: JSON.stringify({ name: 'calc.open', props: { from: 'card', valor: 123 } }) }))
    assert.ok(evr.status < 300)
    ok('api/calc: rodada grátis única no servidor (idempotente, 1 troca, corrida), sync só com direito, merge por item, tamanho, export/apagar, estorno mantém dados, limite 60/h')
  }
  // 32. gamificação da ferramenta: só por fazer de verdade
  {
    const G = await import('../../shared/game.js')
    const pfc = (x: import('../../shared/game.js').GameState) => x.pfLog.filter((e) => !/^(desafio|missao)/.test(e.k)).reduce((t, e) => t + e.pf, 0) // desafio da semana e missão do dia têm testes próprios
    let st = G.emptyGame('2026-11-02')
    let r = G.onContaFeita(st, { today: '2026-11-02', receita: 1 })
    assert.equal(pfc(r.st), G.PF.conta + G.PF.contaReceita, '+15 (Fiz minha conta) +5 (receita nova)')
    assert.ok(r.st.seals.conta)
    st = r.st
    r = G.onContaFeita(st, { today: '2026-11-02', receita: 1 })
    assert.equal(pfc(r.st), pfc(st), 'mesma receita de novo: 0')
    r = G.onContaFeita(st, { today: '2026-11-02', receita: 2 })
    assert.equal(pfc(r.st), pfc(st) + 5)
    st = r.st
    r = G.onContaFeita(st, { today: '2026-11-02', receita: 3 })
    assert.equal(pfc(r.st), pfc(st), 'máx. 2 receitas novas com pontos por dia')
    assert.ok(r.st.contas && '3' in r.st.contas, 'mas a receita conta para o selo')
    st = r.st
    st = G.onContaFeita(st, { today: '2026-11-03', receita: 4 }).st
    r = G.onContaFeita(st, { today: '2026-11-03', receita: 5 })
    assert.ok(r.st.seals.conta5, 'selo Conta de 5 receitas')
    assert.equal(pfc(r.st) - pfc(st), G.PF.contaReceita + G.PF.conta5)
    const again = G.onContaFeita(r.st, { today: '2026-11-04', receita: 6 })
    assert.equal(pfc(again.st) - pfc(r.st), G.PF.contaReceita, 'o selo só paga uma vez')
    assert.equal(pfc(G.onContaFeita(G.emptyGame('2026-11-02'), { today: '2026-11-02', receita: null }).st), G.PF.conta, 'conta livre: só o "Fiz minha conta"')
    // o botão manual do Bônus 07 continua e é idempotente
    assert.equal(G.onConta(r.st, { today: '2026-11-05' }).st, r.st)
    assert.ok(G.sealDef('conta5', () => '')?.icon === 'contas')
    ok('gamificação da Conta da Fornada: +15 uma vez, +5 por receita nova (máx. 2/dia), selo de 5 receitas (+10 uma vez), conta livre sem pontos extras, botão manual idempotente')
  }

}

// ---------------------------------------------------------------- v3: missões, extras por progresso, selos surpresa, diário de vendas, ranking anônimo
{
  const G = await import('../../shared/game.js')
  const R = await import('../../shared/rank.js')
  const CS = await import('../../shared/calc-sync.js')
  const { signSession } = await import('../crypto.js')
  const T0 = '2026-11-02' // segunda-feira
  const ctx = (day: string, item: string, n: number, hour?: number) => ({ today: day, item, title: item, id: `f${n}`, ...(hour !== undefined ? { hour } : {}) })
  const pfOf = (st: import('../../shared/game.js').GameState, pre: string) => st.pfLog.filter((e) => e.k.startsWith(pre)).reduce((t, e) => t + e.pf, 0)

  // 29. missões do dia: 3 de uma lista fixa, só por ação real, 4 PF cada, +6 pelas 3, tudo dentro do teto
  {
    const none = G.pickMissions(T0, { bump: false, conta: false, extra: false })
    assert.equal(new Set(none).size, 3)
    assert.deepEqual(none, G.pickMissions(T0, { bump: false, conta: false, extra: false }), 'determinística')
    for (let i = 0; i < 40; i++) {
      const d = G.addDays(T0, i)
      const a = G.pickMissions(d, { bump: false, conta: false, extra: false })
      assert.ok(!a.includes('conta') && !a.includes('socorro') && !a.includes('extra'), 'sem direito, sem missão dessa ação')
      assert.equal(new Set(a).size, 3)
      const b = G.pickMissions(d, { bump: true, conta: true, extra: true })
      assert.ok(b.every((id) => G.missionById(id)))
    }
    const union = new Set(Array.from({ length: 40 }, (_, i) => G.pickMissions(G.addDays(T0, i), { bump: true, conta: true, extra: true })).flat())
    assert.equal(union.size, G.MISSIONS.length, 'o rodízio passa por todas as missões')
    assert.equal(G.PF.missao, 4)
    assert.equal(G.MISSION_MAX, 18)

    let st = G.startDay(G.emptyGame(T0), { today: T0 })
    st = { ...st, missoes: { d: T0, itens: ['fav', 'feita', 'nota'], feitos: [], todas: false } }
    const f1 = G.onFav(st, { today: T0, item: 'main', title: 'Receita' })
    assert.equal(pfOf(f1.st, 'missao:'), 4)
    assert.equal(G.onFav(G.onFav(f1.st, { today: T0, item: 'main', title: 'x' }).st, { today: T0, item: 'main', title: 'x' }).st.missoes!.feitos.length, 1, 'repetir não paga de novo')
    const f2 = G.onDone(f1.st, ctx(T0, 'main', 1))
    assert.equal(pfOf(f2.st, 'missao:'), 8)
    const f3 = G.onNote(f2.st, { today: T0, id: 'f1', texto: 'ficou macio' })
    assert.equal(pfOf(f3.st, 'missao'), 12 + G.PF.missaoTodas)
    assert.ok(f3.st.missoes!.todas)
    assert.ok(f3.msgs.some((m) => m.startsWith('Missões de hoje completas')))
    assert.ok(G.pfOnDay(f3.st, T0) <= G.DAILY_CAP, 'dentro do teto de 60 PF')
    const next = G.onFav(f3.st, { today: G.addDays(T0, 1), item: 'bonus-01', title: 'y' }).st
    assert.equal(next.missoes!.d, G.addDays(T0, 1))
    assert.equal(next.missoes!.feitos.length <= 1, true, 'dia novo recomeça, sem punição')
    // abrir um extra vale uma vez por dia e só com a missão na lista
    const ex = { ...G.emptyGame(T0), missoes: { d: T0, itens: ['extra', 'foto', 'nota'], feitos: [], todas: false } }
    const ex1 = G.onExtraAberto(ex, { today: T0 })
    assert.equal(pfOf(ex1.st, 'missao:'), 4)
    assert.equal(pfOf(G.onExtraAberto(ex1.st, { today: T0 }).st, 'missao:'), 4)
    assert.equal(pfOf(G.onExtraAberto(G.emptyGame(T0), { today: T0 }).st, 'missao:'), 0, 'sem a missão do dia, abrir extra não dá ponto')
    // desafio da semana "faça uma conta" só entra com a calculadora
    const weeks = Array.from({ length: 30 }, (_, i) => G.addDays(T0, i * 7))
    assert.ok(weeks.every((w) => !G.pickChallenges(w, false, false).includes('conta')))
    assert.ok(weeks.some((w) => G.pickChallenges(w, false, true).includes('conta')))
    ok('missões do dia: lista fixa, 3 por dia, 4 PF cada e +6 pelas 3 (18 PF no máximo, dentro do teto), uma vez por ação, extra só com a missão, desafio "conta" só com a calculadora')
  }

  // 30. selos surpresa: só por ação real, uma vez, sem pressa
  {
    assert.equal(G.hiddenSealIds().length, 10)
    assert.ok(G.HIDDEN_SEALS.every((h) => h.hidden && G.sealDef(h.id, (x) => x)))
    const mad = G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1, 6))
    assert.ok(mad.st.seals['h:madrugadora'] && !mad.st.seals['h:noite'])
    assert.ok(mad.msgs.includes('Selo surpresa conquistado: Madrugadora.'))
    assert.ok(G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1, 22)).st.seals['h:noite'])
    assert.ok(!G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1, 12)).st.seals['h:madrugadora'], 'meio-dia não ganha selo de madrugada')
    assert.ok(G.onDone(G.emptyGame('2026-11-01'), ctx('2026-11-01', 'main', 1)).st.seals['h:domingo'], '01/11/2026 é domingo')
    assert.ok(!G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st.seals['h:domingo'])
    assert.ok(G.onDone(G.emptyGame('2026-12-22'), ctx('2026-12-22', 'main', 1)).st.seals['h:natal'])
    assert.ok(!G.onDone(G.emptyGame('2026-12-26'), ctx('2026-12-26', 'main', 1)).st.seals['h:natal'])
    const again = G.onDone(mad.st, ctx(G.addDays(T0, 1), 'bonus-01', 2, 5))
    assert.equal(again.st.pfLog.filter((e) => e.k === 'h:madrugadora').length, 1, 'o selo paga uma vez')
    // 3 receitas diferentes no mesmo dia
    let t = G.emptyGame(T0)
    for (const [i, it] of ['main', 'bonus-01', 'bonus-02'].entries()) t = G.onDone(t, ctx(T0, it, i + 1)).st
    assert.ok(t.seals['h:tarde-cheia'])
    // volta depois de 7 dias; 10 fornadas; 5 fotos; 14 dias de sequência
    const v = G.onDone(G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st, ctx(G.addDays(T0, 7), 'main', 2))
    assert.ok(v.st.seals['h:volta'])
    assert.ok(!G.onDone(G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st, ctx(G.addDays(T0, 6), 'main', 2)).st.seals['h:volta'])
    let c10 = G.emptyGame(T0)
    for (let i = 0; i < 10; i++) c10 = G.onDone(c10, ctx(G.addDays(T0, i), 'main', i + 1)).st
    assert.ok(c10.seals['h:cozinha-cheia'])
    assert.ok(c10.seals['h:constancia'] === undefined || c10.fornadas.length === 10)
    let c14 = G.emptyGame(T0)
    for (let i = 0; i < 14; i++) c14 = G.onDone(c14, ctx(G.addDays(T0, i), 'main', i + 1)).st
    assert.ok(c14.seals['h:constancia'], '14 dias seguidos')
    let ph = c10
    for (let i = 1; i <= 5; i++) ph = G.onNote(ph, { today: G.addDays(T0, 11), id: `f${i}`, foto: true }).st
    assert.ok(ph.seals['h:album'])
    const gift = G.onGift(G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st, { today: T0, id: 'f1', on: true })
    assert.ok(gift.st.seals.presente && gift.msgs.some((m) => /^Selo surpresa conquistado/.test(m)))
    assert.ok(Object.values(G.PF).every((x) => x <= 60))
    for (const h of G.HIDDEN_SEALS) assert.ok(!/lucro|renda|ganhe|garanta|desconto|restam|vagas|perdeu/i.test(`${h.name} ${h.how}`), h.id)
    ok('selos surpresa: 10 escondidos, cada um só pela ação real (hora, domingo, Natal, 3 receitas no dia, volta, 10 fornadas, 5 fotos, 14 dias, presente), pagam uma vez, sem promessa nem pressão')
  }

  // 31. extras por progresso: próximo desbloqueio, quanto falta, nunca volta a trancar, nada comprado é trancado
  {
    const e0 = G.emptyGame(T0)
    const nu = G.nextUnlock(e0)
    assert.ok(nu && nu.missing.length > 5 && nu.pct >= 0 && nu.pct <= 100)
    assert.ok(G.EXTRAS.every((e) => ['level', 'fornadas', 'dias', 'selos', 'contas'].includes(e.req.t) && G.reqRule(e).startsWith('Libera')))
    assert.ok(G.EXTRAS.some((e) => e.req.t === 'fornadas') && G.EXTRAS.some((e) => e.req.t === 'contas'))
    const guia = G.EXTRAS.find((e) => e.id === 'guia-anotar-fornada')!
    assert.equal(G.extraUnlocked(guia, e0), false)
    const done1 = G.withUnlocks(e0, G.onDone(e0, ctx(T0, 'main', 1)))
    assert.ok(done1.msgs.includes(`Extra liberado: ${guia.title}.`))
    assert.ok(done1.st.desbloqueados!.includes(guia.id))
    assert.ok(G.extraUnlocked(guia, done1.st))
    const again = G.withUnlocks(done1.st, { st: done1.st, msgs: [] })
    assert.deepEqual(again.msgs, [], 'não avisa duas vezes')
    // apagar a fornada não tranca de novo
    const apagada = { ...done1.st, fornadas: [] }
    assert.ok(G.extraUnlocked(guia, apagada), 'o que abriu continua aberto')
    assert.equal(G.extrasUnlockedIds({ ...e0, semPressao: true }).length, G.EXTRAS.length, 'sem pressão: tudo aberto')
    const nu2 = G.nextUnlock(done1.st)
    assert.ok(nu2 && nu2.extra.id !== guia.id)
    assert.ok(G.nextUnlock({ ...e0, desbloqueados: G.EXTRAS.map((e) => e.id) }) === null)
    for (const e of G.EXTRAS) assert.ok(e.blocks.flatMap((b) => [b.p ?? '', ...(b.ul ?? [])]).join(' ').length > 200, `texto real em ${e.id}`)
    ok('extras por progresso: regra por extra, próximo desbloqueio com quanto falta, aviso único, nunca volta a trancar, sem pressão abre tudo, texto real')
  }

  // 32. comemoração, PF da semana, metas da conta e primeira venda anotada
  {
    assert.equal(G.celebrationOf([])?.kind ?? null, null)
    const c = G.celebrationOf(['+10 PF: Fiz Panetone', 'Selo conquistado: Panetone', 'Você agora é Fornada! Continue.'])
    assert.equal(c?.kind, 'nivel')
    assert.equal(G.celebrationOf(['Extra liberado: X.', 'Selo surpresa conquistado: Madrugadora.'])?.kind, 'selo')
    const sur = G.celebrationOf(['Selo conquistado: Panetone.', 'Selo surpresa conquistado: Madrugadora.'])
    assert.equal(sur?.title, 'Selo surpresa!', 'selo surpresa vence o selo comum na comemoração')
    assert.equal(sur?.icon, 'madrugadora')
    assert.equal(G.celebrationOf(['Extra liberado: X.', 'Missões de hoje completas. Descanse.'])?.kind, 'extra')
    assert.equal(G.celebrationOf(['+10 PF: Fiz Panetone'])?.kind, 'receita')
    assert.equal(G.celebrationOf(['Salva nas suas favoritas: X.']), null)
    let st = G.onDone(G.emptyGame(T0), ctx(T0, 'main', 1)).st
    st = G.onDone(st, ctx(G.addDays(T0, 7), 'main', 2)).st
    assert.equal(G.weeklyPf(st, T0), st.pfLog.filter((e) => e.d === T0).reduce((a, e) => a + e.pf, 0))
    assert.ok(G.weeklyPf(st, G.addDays(T0, 7)) > 0)
    assert.equal(G.weeklyPf(G.emptyGame(T0), T0), 0)
    const m0 = G.contaMetas(G.emptyGame(T0))
    assert.deepEqual(m0.map((m) => [m.id, m.feita, m.now, m.de]), [['conta1', false, 0, 1], ['conta5', false, 0, 5], ['venda1', false, 0, 1]])
    const v = G.onVendaAnotada(G.emptyGame(T0), { today: T0 })
    assert.equal(v.st.pf, G.PF.venda1)
    assert.ok(v.st.seals.venda1)
    assert.equal(G.onVendaAnotada(v.st, { today: G.addDays(T0, 1) }).st, v.st, 'só a primeira venda paga, e o valor nunca entra na conta')
    assert.equal(G.contaMetas(v.st)[2].feita, true)
    assert.ok(G.showGame(G.emptyGame(T0)) && G.showRank(G.emptyGame(T0)) && G.showDiary(G.emptyGame(T0)))
    const sp = G.setConfig(G.emptyGame(T0), { semPressao: true })
    assert.ok(!G.showGame(sp) && !G.showRank(sp) && !G.showDiary(sp), 'sem pressão esconde jogo, ranking e diário')
    const off = G.setConfig(G.emptyGame(T0), { gamificacao: false })
    assert.ok(!G.showRank(off) && !G.showDiary(off))
    assert.equal(G.emptyGame(T0).config.festa, true)
    ok('comemoração (prioridade nível > selo > extra > missões > receita), PF da semana, metas da conta (1 conta, 5 contas, 1ª venda), ranking e diário escondidos no modo sem pressão')
  }

  // 33. diário de vendas: validação, mescla com apagados, partes do servidor e total só do que ela digitou
  {
    const t1 = '2026-11-02T10:00:00.000Z'
    const t2 = '2026-11-02T11:00:00.000Z'
    const venda = (id: string, data: string, qtd: number, valorCents: number, em = t1) => ({ id, data, produto: 'Panetone trufado', qtd, valorCents, atualizadaEm: em })
    assert.ok(CS.vendaValida(venda('v1', '2026-11-02', 2, 9000)))
    assert.ok(CS.vendaValida(venda('v1', '2026-11-02', 1, 0)), 'valor 0 é permitido (brinde)')
    for (const bad of [venda('', '2026-11-02', 1, 100), venda('v', '02/11/2026', 1, 100), venda('v', '2026-02-31', 1, 100), venda('v', '2026-11-02', 0, 100), venda('v', '2026-11-02', 1.5, 100), venda('v', '2026-11-02', 1, -1), venda('v', '2026-11-02', 1, 1.5), { ...venda('v', '2026-11-02', 1, 100), produto: ' ' }, { ...venda('v', '2026-11-02', 1, 100), produto: 'x'.repeat(61) }]) assert.ok(!CS.vendaValida(bad))
    const a = { ...CS.docVazio(t1), vendas: [venda('v1', '2026-11-02', 2, 9000), venda('v2', '2026-11-03', 1, 4500)] }
    const b = { ...CS.docVazio(t1), vendas: [{ ...venda('v1', '2026-11-02', 3, 13500, t2) }, venda('v3', '2026-10-30', 1, 4000)], apagadas: { v2: t2 } }
    const m = CS.mesclar(a, b, t2)
    assert.deepEqual(m.vendas.map((x) => x.id), ['v1', 'v3'], 'v2 apagada some, ordem pela data')
    assert.equal(m.vendas.find((x) => x.id === 'v1')!.qtd, 3, 'a edição mais recente vence')
    assert.deepEqual(CS.resumoMes(m.vendas, '2026-11'), { vendas: 1, unidades: 3, totalCents: 13500 })
    assert.deepEqual(CS.resumoMes(m.vendas, '2026-10'), { vendas: 1, unidades: 1, totalCents: 4000 })
    assert.deepEqual(CS.resumoMes(m.vendas, '2026-09'), { vendas: 0, unidades: 0, totalCents: 0 }, 'sem venda, zero: nada estimado')
    // ida e volta pelas partes que o servidor guarda
    const p = CS.partes(m)
    const back = CS.juntar(p.core as Record<string, unknown>, p.contas, p.extra as Record<string, unknown>, t2)
    assert.deepEqual(back.vendas, m.vendas)
    assert.equal(CS.validarDoc(m).ok, true)
    const bad = CS.validarDoc({ ...m, vendas: [venda('x', '2026-11-02', 0, 1)] })
    assert.equal(bad.ok, false)
    const rep = CS.validarDoc({ ...m, vendas: [venda('x', '2026-11-02', 1, 1), venda('x', '2026-11-02', 1, 1)] })
    assert.equal(rep.ok, false, 'id repetido')
    const many = CS.validarDoc({ ...CS.docVazio(t1), vendas: Array.from({ length: CS.SYNC_LIMITS.maxVendas + 1 }, (_, i) => venda(`v${i}`, '2026-11-02', 1, 1)) })
    assert.ok(!many.ok && many.status === 413)
    ok('diário de vendas: validação (data, produto, quantidade inteira, valor em centavos), mescla com apagados e edição mais recente, total do mês só da soma digitada (zero sem vendas), partes/juntar, limite')
  }

  // 34. ranking: regras puras
  {
    const nk = (i: number) => `Fornada ${R.RANK.alphabet[i % 32]}${R.RANK.alphabet[(i >> 5) % 32]}2`
    assert.match(R.nickFrom(() => 7), R.NICK_RE)
    assert.ok(R.isNick('Fornada 4F2') && !R.isNick('Fornada 0F2') && !R.isNick('Maria Silva') && !R.isNick('a@b.com'))
    const nine: Record<string, number> = {}
    for (let i = 0; i < 9; i++) nine[nk(i)] = i * 10
    const w = '2026-11-02'
    const b9 = R.boardOf(w, nine, nk(3), 10)
    assert.equal(b9.ready, false)
    assert.deepEqual(b9.top, [])
    assert.equal(b9.me, null, 'abaixo do mínimo, nem posição aparece')
    assert.equal(b9.participants, 9)
    const twelve = { ...nine, [nk(9)]: 90, [nk(10)]: 90, [nk(11)]: 5 }
    const b12 = R.boardOf(w, twelve, nk(11), 10)
    assert.equal(b12.ready, true)
    assert.equal(b12.top.length, 10)
    assert.deepEqual(b12.top.slice(0, 3).map((r) => r.pos), [1, 1, 3], 'empate divide a posição')
    assert.equal(b12.me!.pos, 11, 'a posição dela fora do top 10: 10 pessoas com mais PF')
    assert.ok(R.boardOf(w, { ...twelve, 'Maria Silva': 999, 'x@y.com': 999 }, null, 10).participants === 12, 'nome e e-mail nunca entram na lista')
    assert.equal(R.RANK.minDefault, 10)
    assert.ok(!/prêmio de|sorteio de|ganhe|dinheiro/i.test(R.rankText.explica.replace('Não tem prêmio', '')))
    ok('ranking: apelido "Fornada XXX" sem 0/1/I/O, lista só com o mínimo de participantes reais, empate divide posição, top 10 + posição, nada fora do formato de apelido')
  }

  // 35. ranking no servidor (dentro de api/event.ts): sessão, entrar, pontuar só subindo, semana certa, sair apaga
  {
    const req = (action: string, method: string, email: string | null, body?: unknown) =>
      (method === 'GET' ? eventApi.GET : eventApi.POST)(new Request(`http://x/api/event?r=${action}`, { method, headers: email ? { authorization: `Bearer ${signSession(email)}`, 'content-type': 'application/json' } : { 'content-type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}) }))
    type B = import('../../shared/rank.js').Board & { error?: string }
    const jb = async (r: Response) => (await r.json()) as B
    const { rankWeek, rankMin } = await import('../rank.js')
    assert.equal(rankMin(), 10)
    assert.equal((await req('board', 'GET', null)).status, 401)
    assert.equal((await req('join', 'POST', null)).status, 401)
    assert.equal((await req('board', 'POST', 'r0@example.com')).status, 405)
    assert.equal((await req('score', 'POST', 'r0@example.com', { pf: 5, week: rankWeek() })).status, 409, 'pontuar sem ter entrado')
    const wk = rankWeek()
    assert.equal(wk, G.weekKey(wk), 'a chave da semana é uma segunda-feira')
    const nicks = new Set<string>()
    let last: B | null = null
    for (let i = 1; i <= 9; i++) {
      const b = await jb(await req('join', 'POST', `rank${i}@example.com`))
      assert.ok(b.joined && R.isNick(b.apelido))
      nicks.add(b.apelido!)
      last = b
    }
    assert.equal(nicks.size, 9, 'apelidos diferentes')
    assert.equal(last!.participants, 9)
    assert.equal(last!.ready, false)
    assert.deepEqual(last!.top, [], 'com 9 participantes reais a lista não aparece')
    const again = await jb(await req('join', 'POST', 'rank1@example.com'))
    assert.equal(again.participants, 9, 'entrar de novo não duplica')
    const mine = [...nicks][0]
    assert.equal(again.apelido, mine)
    const view = await jb(await req('board', 'GET', 'rank-fora@example.com'))
    assert.equal(view.joined, false)
    assert.equal(view.apelido, null)
    // o décimo participante abre a lista
    const b10 = await jb(await req('join', 'POST', 'rank10@example.com'))
    assert.equal(b10.ready, true)
    assert.equal(b10.top.length, 10)
    assert.ok(b10.top.every((r) => R.isNick(r.apelido)))
    assert.ok(!JSON.stringify(b10).includes('@'), 'nenhum e-mail na resposta')
    // PF: só sobe, 0..420, só a semana de agora
    const s1 = await jb(await req('score', 'POST', 'rank1@example.com', { pf: 80, week: wk }))
    assert.equal(s1.me!.pf, 80)
    assert.equal((await jb(await req('score', 'POST', 'rank1@example.com', { pf: 30, week: wk }))).me!.pf, 80, 'não desce')
    assert.equal((await jb(await req('score', 'POST', 'rank1@example.com', { pf: 120, week: wk }))).me!.pf, 120)
    assert.equal((await jb(await req('score', 'POST', 'rank1@example.com', { pf: 400, week: G.addDays(wk, -7) }))).me!.pf, 120, 'semana velha é ignorada')
    for (const pf of [-1, 421, 1.5, 'x', null]) assert.equal((await req('score', 'POST', 'rank1@example.com', { pf, week: wk })).status, 400)
    assert.equal(s1.me!.pos, 1)
    // limite mínimo configurável
    process.env.RANK_MIN_PARTICIPANTS = '12'
    assert.equal((await jb(await req('board', 'GET', 'rank1@example.com'))).ready, false)
    process.env.RANK_MIN_PARTICIPANTS = '3'
    assert.equal((await jb(await req('board', 'GET', 'rank1@example.com'))).ready, true)
    process.env.RANK_MIN_PARTICIPANTS = 'lixo'
    assert.equal(rankMin(), 10, 'valor inválido volta para 10')
    delete process.env.RANK_MIN_PARTICIPANTS
    // sair apaga apelido e PF
    const left = await jb(await req('leave', 'POST', 'rank1@example.com'))
    assert.equal(left.joined, false)
    assert.equal(left.participants, 9)
    assert.equal((await jb(await req('board', 'GET', 'rank1@example.com'))).joined, false)
    assert.ok(!JSON.stringify(await jb(await req('board', 'GET', 'rank2@example.com'))).includes(mine), 'o apelido some da lista')
    assert.equal((await req('score', 'POST', 'rank1@example.com', { pf: 10, week: wk })).status, 409)
    const rejoin = await jb(await req('join', 'POST', 'rank1@example.com'))
    assert.equal(rejoin.me?.pf ?? 0, 0, 'quem volta começa do zero')
    assert.equal((await req('nada', 'POST', 'rank1@example.com')).status, 400)
    // /api/event de sempre continua funcionando
    const ev = await eventApi.POST(new Request('http://x/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'catalog.view', props: {} }) }))
    assert.ok(ev.status < 500)
    ok('ranking no servidor (dentro de api/event.ts): 401 sem sessão, 405, 409 sem entrar, apelido único, lista só com 10 reais, sem e-mail na resposta, PF só sobe (0 a 420, semana atual), mínimo configurável, sair apaga')
  }
}

// buildMe sem plano
assert.equal(buildMe('a@b.co', []).plan, null)
assert.deepEqual(Object.keys(PLANS), ['completo'])
console.log(`\n${n} grupos de teste passaram.`)
