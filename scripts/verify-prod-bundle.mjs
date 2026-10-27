// Falha se o build de PRODUÇÃO (dist/) tiver qualquer coisa de demonstração/beta.
//   node scripts/verify-prod-bundle.mjs [pasta, padrão dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] || 'dist'
const banned = ['123456', 'Sem Fichas', 'Ligar ofertas', 'odo demonstra', 'preço de demonstração', 'Já comprei', 'Modo demonstração']
const bad = []
if (existsSync(join(root, 'demo'))) bad.push('pasta demo/ (PDFs de exemplo) dentro do build de produção')
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|css|html|json|webmanifest)$/.test(f)) {
      const txt = readFileSync(p, 'utf8')
      for (const w of banned) if (txt.includes(w)) bad.push(`${p}: contém "${w}"`)
    }
  }
}
walk(root)
const co = join(root, 'checkouts.json')
if (!existsSync(co)) bad.push('falta checkouts.json no build')
if (bad.length) {
  console.error('BUILD DE PRODUÇÃO COM RESTO DE DEMO:\n  ' + bad.join('\n  '))
  process.exit(1)
}
console.log('build de produção limpo: sem demo, sem código de teste, checkouts.json presente.')
