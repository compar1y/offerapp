// POST /api/admin/import-csv  (Bearer <ADMIN_TOKEN>)  corpo = texto CSV (email,plano,bump,ofertas)
// Importar o mesmo arquivo de novo não duplica (id estável por linha). Veja server/csv.ts.
import { fail, isAdmin, json, methodNotAllowed } from '../../server/http.js'
import { parseCsv } from '../../server/csv.js'
import { grantManual, logEvent, purchasesOf } from '../../server/purchases.js'

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAdmin(request)) return json({ error: 'unauthorized' }, 401)
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
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
