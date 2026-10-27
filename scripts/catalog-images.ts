// Confere public/img/catalogo/<id>.webp de cada oferta do catálogo e grava src/data/catalog-images.json
// (a lista dos que existem; o app só mostra <img> para esses, sem pedir arquivo que não existe).
//   npm run catalogo:imagens
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { OFFERS } from '../shared/catalog.js'

const dir = new URL('../public/img/catalogo/', import.meta.url)
const out = new URL('../src/data/catalog-images.json', import.meta.url)
const files = new Set((await readdir(dir)).filter((f) => f.endsWith('.webp')))
// a ferramenta (Conta da Fornada) não é do catálogo, mas tem mockup 4:5 (640x800) no mesmo lugar
const withImage = OFFERS.filter((o) => o.catalog || o.tool)
const ids: string[] = withImage.flatMap((o) => (o.bonus?.length ? [o.id, `${o.id}-bonus`] : [o.id]))
const have: string[] = []
const missing: string[] = []
let bad = 0

// cada item: [nome do arquivo sem .webp, briefing, tamanho esperado]
const wanted: [string, string, string][] = []
for (const o of withImage) {
  wanted.push([o.id, o.imageType, o.imageRatio === '2:3' ? '640x960' : o.imageRatio === '4:5' ? '640x800' : '800x600'])
  if (o.bonus?.length) wanted.push([`${o.id}-bonus`, `faixa de mini-mockups dos bônus: ${o.bonus.map((b) => b.title).join('; ')}`, '900x300'])
}
for (const [name, brief, size] of wanted) {
  const f = `${name}.webp`
  if (!files.has(f)) {
    missing.push(`${name} (${size}): ${brief}`)
    continue
  }
  const buf = await readFile(new URL(f, dir))
  const kb = Math.round((await stat(new URL(f, dir))).size / 1024)
  // confere só o cabeçalho RIFF/WEBP e o tamanho do arquivo
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    console.error(`FORMATO: ${f} não é um WebP válido`)
    bad++
    continue
  }
  if (kb > 300) console.warn(`PESADO: ${f} tem ${kb} KB (ideal até 80 KB)`)
  have.push(name)
}
for (const f of files) if (!ids.includes(f.replace(/\.webp$/, ''))) console.warn(`SOBRA: ${f} não é de nenhuma oferta do catálogo`)

await writeFile(out, JSON.stringify(have, null, 2) + '\n')
console.log(`${have.length} de ${ids.length} imagens do catálogo prontas (produto + faixa de bônus).`)
if (missing.length) console.log('Faltam:\n  ' + missing.join('\n  '))
if (bad) process.exit(1)
