// Sobe os arquivos pagos para o Vercel Blob PRIVADO (uma vez, por quem tem a conta). Não roda sozinho nem no build.
//   BLOB_READ_WRITE_TOKEN=...  npm run upload:files -- <pasta com os arquivos>
// Cada arquivo usa o storageKey do catálogo como nome. Arquivo que falta é listado e o script termina com erro.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ITEMS, OFFERS } from '../shared/catalog.js'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: npm run upload:files -- <pasta com os PDFs>')
  process.exit(1)
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Defina BLOB_READ_WRITE_TOKEN no ambiente (não grave em arquivo versionado).')
  process.exit(1)
}

const { put } = await import('@vercel/blob')
const files = [...ITEMS, ...OFFERS.filter((o) => o.enabled)].flatMap((i) => i.files)
const missing: string[] = []
for (const f of files) {
  let data: Buffer
  try {
    data = await readFile(join(dir, f.storageKey))
  } catch {
    missing.push(f.storageKey)
    continue
  }
  await put(f.storageKey, data, { access: 'private', addRandomSuffix: false, allowOverwrite: true })
  console.log(`enviado: ${f.storageKey} (${(data.length / 1048576).toFixed(1)} MB)`)
}
if (missing.length) {
  console.error(`Faltando na pasta: ${missing.join(', ')}`)
  process.exit(1)
}
