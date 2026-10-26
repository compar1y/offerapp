// Importação por CSV: cabeçalho `email,plano,bump,ofertas` (aceita vírgula ou ponto e vírgula).
// plano (kit completo): `completo`, `sim`, `1`, `true` ou o valor 37,90. Vazio = sem o kit (só bump/ofertas).
// bump: sim/nao, 1/0, true/false.  ofertas: ids separados por | ou espaço (kit-lucrativo, kit-embalagem-etiqueta, fornada-pascoa).

import { createHash } from 'node:crypto'
import { PLANS, isOfferId, type OfferId, type PlanId } from '../shared/catalog.js'
import { normEmail, validEmail } from './purchases.js'

export interface CsvRow {
  email: string
  plan: PlanId | null
  bump: boolean
  offers: OfferId[]
  orderId: string
}
export interface CsvResult {
  rows: CsvRow[]
  errors: { line: number; reason: string }[]
}

const truthy = (v: string) => ['sim', 's', '1', 'true', 'yes', 'x'].includes(v.trim().toLowerCase())

function planFrom(v: string): PlanId | null | undefined {
  const t = v.trim().toLowerCase().replace(/^r\$\s*/, '').replace(',', '.')
  if (!t) return null
  if (t in PLANS) return t as PlanId
  if (truthy(t)) return 'completo'
  const cents = Math.round(Number(t) * 100)
  if (Number.isFinite(cents)) return Object.values(PLANS).find((p) => p.priceCents === cents)?.id
  return undefined
}

export function parseCsv(text: string): CsvResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  const out: CsvResult = { rows: [], errors: [] }
  if (!lines.length) return out
  const sep = lines[0].includes(';') ? ';' : ','
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  const col = (names: string[]) => head.findIndex((h) => names.includes(h))
  const ie = col(['email', 'e-mail'])
  const ip = col(['plano', 'plan'])
  const ib = col(['bump'])
  const io = col(['ofertas', 'offers'])
  if (ie < 0) return { rows: [], errors: [{ line: 1, reason: 'cabeçalho sem coluna email' }] }
  const seen = new Set<string>()
  lines.slice(1).forEach((l, i) => {
    const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''))
    const line = i + 2
    const email = normEmail(c[ie] ?? '')
    if (!validEmail(email)) return void out.errors.push({ line, reason: 'e-mail inválido' })
    const plan = ip >= 0 ? planFrom(c[ip] ?? '') : null
    if (plan === undefined) return void out.errors.push({ line, reason: `plano não reconhecido: ${c[ip]}` })
    const bump = ib >= 0 && truthy(c[ib] ?? '')
    const rawOffers = io >= 0 ? (c[io] ?? '').split(/[|\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean) : []
    const badOffer = rawOffers.find((x) => !isOfferId(x))
    if (badOffer) return void out.errors.push({ line, reason: `oferta não reconhecida: ${badOffer}` })
    const offers = rawOffers.filter(isOfferId)
    if (!plan && !bump && !offers.length) return void out.errors.push({ line, reason: 'linha sem plano, bump ou oferta' })
    // id estável: importar o mesmo arquivo duas vezes não duplica
    const orderId = `csv-${createHash('sha256').update(`${email}|${plan ?? ''}|${bump}|${offers.join(',')}`).digest('hex').slice(0, 16)}`
    if (seen.has(orderId)) return void out.errors.push({ line, reason: 'linha repetida no arquivo' })
    seen.add(orderId)
    out.rows.push({ email, plan, bump, offers, orderId })
  })
  return out
}
