// Gera os dois arquivos de checkouts a partir do catálogo (ids sempre iguais aos do app):
//   public/checkouts.json     = padrão de PRODUÇÃO: sem link e ready:false em tudo (vira "Disponível em breve"). Só cria se não existir.
//   checkouts.example.json    = exemplo para testes e prévia: links fictícios (pay.exemplo.test) e alguns ready:true. Sempre regrava.
//   npm run checkouts:gen
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { CHECKOUT_IDS, OFFERS } from '../shared/catalog.js'

const pub = new URL('../public/checkouts.json', import.meta.url)
const ex = new URL('../checkouts.example.json', import.meta.url)
const empty = Object.fromEntries(CHECKOUT_IDS.map((id) => [id, { checkoutUrl: '', ready: false }]))
if (!existsSync(pub)) {
  await writeFile(pub, JSON.stringify(empty, null, 2) + '\n')
  console.log('criado public/checkouts.json (tudo ready:false)')
} else console.log('public/checkouts.json já existe: não mexi')

// exemplo: 12 das 17 ofertas prontas (passa do mínimo de 10 da Biblioteca completa) + combo + bump, com link; o resto sem link
const example: Record<string, { checkoutUrl: string; ready: boolean }> = {}
const offerIds: string[] = OFFERS.filter((o) => o.catalog).map((o) => o.id)
CHECKOUT_IDS.forEach((id) => {
  const idx = offerIds.indexOf(id)
  const on = (idx >= 0 && idx < 12) || id === 'combo' || id === 'bump' || id === 'calculadora'
  example[id] = { checkoutUrl: on ? `https://pay.exemplo.test/${id}` : '', ready: on }
})
await writeFile(ex, JSON.stringify(example, null, 2) + '\n')
console.log('gravado checkouts.example.json')
