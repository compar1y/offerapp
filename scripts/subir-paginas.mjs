// Sobe as páginas (WebP) para o armazenamento privado do Supabase.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run subir:paginas -- /mnt/project-files/app-novo/paginas
// Pode rodar de novo: o que já subiu é substituído (upsert).
import { createClient } from '@supabase/supabase-js'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const pasta = process.argv[2] ?? '/mnt/project-files/app-novo/paginas'
const url = process.env.SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !chave) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}
const db = createClient(url, chave, { auth: { persistSession: false } })

let total = 0
let falhas = 0
for (const material of (await readdir(pasta, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const arquivos = (await readdir(join(pasta, material))).filter((f) => /^\d{3}\.webp$/.test(f)).sort()
  for (const f of arquivos) {
    const corpo = await readFile(join(pasta, material, f))
    const { error } = await db.storage.from('paginas').upload(`${material}/${f}`, corpo, { contentType: 'image/webp', upsert: true, cacheControl: '86400' })
    if (error) {
      falhas++
      console.error(`${material}/${f}: ${error.message}`)
    } else total++
  }
  console.log(`${material}: ${arquivos.length} páginas`)
}
console.log(`Pronto: ${total} enviadas, ${falhas} com erro.`)
if (falhas) process.exit(1)
