import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Todo evento('x') que o app manda precisa ser aceito por /api/evento; senão volta 400 e o painel perde o dado.
const arquivos = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? arquivos(p) : /\.tsx?$/.test(f) ? [p] : [] })

describe('/api/evento aceita todos os eventos que o app manda', () => {
  const api = readFileSync('api/evento.ts', 'utf8')
  const tipos = new Set([...api.match(/const TIPOS = new Set\(\[([\s\S]*?)\]\)/)![1].matchAll(/'([^']+)'/g)].map((m) => m[1]))
  const usados = new Set(arquivos('src').flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/evento\('([a-z.]+)'/g)].map((m) => m[1])))
  it('acha os eventos', () => expect(usados.size).toBeGreaterThan(15))
  for (const t of usados) it(t, () => expect(tipos.has(t)).toBe(true))
})
