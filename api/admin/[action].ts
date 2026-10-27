// Rotas de administração numa só função (limite de 12 funções da Vercel Hobby). Todas com Authorization: Bearer <ADMIN_TOKEN>.
//   GET  /api/admin/events?limit=200&name=feedback.dificuldade   últimos eventos (compras, acessos, respostas do formulário)
//   POST /api/admin/grant       { email, plan?, bump?, offers?: [ids], bundles?: ['combo'], note? }   libera acesso manualmente (inclui a ferramenta: offers ["calculadora"])
//   POST /api/admin/import-csv  corpo = texto CSV (email,plano,bump,ofertas); importar de novo não duplica
//   POST /api/admin/revoke      { email, orderId? }   encerra o acesso (reembolso feito por fora)
import { PLANS, isBundleId, isOfferId, type PlanId } from '../../shared/catalog.js'
import { parseCsv } from '../../server/csv.js'
import { getKV } from '../../server/kv.js'
import { fail, isAdmin, json, methodNotAllowed, readJson } from '../../server/http.js'
import { grantManual, logEvent, normEmail, purchasesOf, revokeManual, validEmail, type AppEvent } from '../../server/purchases.js'

const actionOf = (request: Request): string => new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop() ?? ''

async function events(request: Request): Promise<Response> {
  const u = new URL(request.url)
  const limit = Math.min(Number(u.searchParams.get('limit')) || 200, 2000)
  const name = u.searchParams.get('name')
  const all = await getKV().list<AppEvent>('events', 5000)
  return json((name ? all.filter((e) => e.name === name || e.name.startsWith(`${name}.`)) : all).slice(-limit))
}

async function grant(request: Request): Promise<Response> {
  const b = await readJson<{ email?: string; plan?: string; bump?: boolean; offers?: string[]; bundles?: string[]; note?: string }>(request)
  if (!b) return json({ error: 'corpo inválido' }, 400)
  const email = normEmail(b.email ?? '')
  if (!validEmail(email)) return json({ error: 'e-mail inválido' }, 400)
  if (b?.plan && !(b.plan in PLANS)) return json({ error: `plano inválido. Use: ${Object.keys(PLANS).join(', ')}` }, 400)
  const offers = (b?.offers ?? []).filter(isOfferId)
  if ((b?.offers ?? []).length !== offers.length) return json({ error: 'oferta inválida em offers' }, 400)
  const bundles = (b?.bundles ?? []).filter(isBundleId)
  if ((b?.bundles ?? []).length !== bundles.length) return json({ error: "bundle inválido em bundles (só 'combo')" }, 400)
  if (!b?.plan && !b?.bump && !offers.length && !bundles.length) return json({ error: 'informe plan, bump, offers ou bundles' }, 400)
  const p = await grantManual({ email, plan: (b.plan as PlanId | undefined) ?? null, bump: b.bump, offers, bundles, source: 'manual', note: b.note })
  return json({ ok: true, orderId: p.orderId })
}

async function importCsv(request: Request): Promise<Response> {
  const { rows, errors } = parseCsv(await request.text())
  let created = 0
  let duplicated = 0
  for (const r of rows) {
    const had = (await purchasesOf(r.email)).some((p) => p.orderId === r.orderId)
    await grantManual({ email: r.email, plan: r.plan, bump: r.bump, offers: r.offers, source: 'csv', orderId: r.orderId })
    if (had) duplicated++
    else created++
  }
  await logEvent({ name: 'csv.import', origin: 'csv', props: { created, duplicated, errors: errors.length } })
  return json({ ok: true, created, duplicated, errors })
}

async function revoke(request: Request): Promise<Response> {
  const b = await readJson<{ email?: string; orderId?: string }>(request)
  if (!b?.email) return json({ error: 'informe email' }, 400)
  return json({ ok: true, revoked: await revokeManual(b.email, b.orderId) })
}

const ROUTES: Record<string, { method: 'GET' | 'POST'; run: (r: Request) => Promise<Response> }> = {
  events: { method: 'GET', run: events },
  grant: { method: 'POST', run: grant },
  'import-csv': { method: 'POST', run: importCsv },
  revoke: { method: 'POST', run: revoke },
}

async function handle(request: Request, method: 'GET' | 'POST'): Promise<Response> {
  try {
    const route = ROUTES[actionOf(request)]
    if (!route) return json({ error: 'rota não encontrada' }, 404)
    if (route.method !== method) return methodNotAllowed(route.method)
    if (!isAdmin(request)) return json({ error: 'unauthorized' }, 401)
    return await route.run(request)
  } catch (e) {
    return fail(e)
  }
}

export const GET = (request: Request) => handle(request, 'GET')
export const POST = (request: Request) => handle(request, 'POST')
