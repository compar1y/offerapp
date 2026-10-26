// Confere se todos os arquivos do catálogo existem na pasta dada (ex.: ../pdfs-app). Só leitura.
//   npm run check:files -- <pasta>
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { ITEMS } from '../shared/catalog.js'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: npm run check:files -- <pasta>')
  process.exit(1)
}
const keys = ITEMS.flatMap((i) => i.files.map((f) => f.storageKey))
let bad = 0
for (const k of keys) {
  try {
    await access(join(dir, k))
  } catch {
    console.error(`FALTA: ${k}`)
    bad++
  }
}
console.log(`${keys.length - bad} de ${keys.length} arquivos encontrados`)
process.exit(bad ? 1 : 0)
