// Gera shared/receitas-custo.ts a partir dos dados do Bônus 07 (receitas-100.json, calc.py e receitas-100-custos.csv).
// Roda só quando os dados do Bônus mudam:  node scripts/gen-receitas-custo.mjs [pasta-do-bonus-07]
// A pasta padrão está fora deste repositório; o resultado (shared/receitas-custo.ts) é versionado.
// O arquivo server/test/golden/receitas-100-custos.csv é uma cópia da conferência do Bônus 07 (usada pelo teste de diferença zero).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] || '../../bonus-chatgpt/08-tabela-custo-preco'
const py = readFileSync(join(dir, 'calc.py'), 'utf8')
const data = JSON.parse(readFileSync(join(dir, 'receitas-100.json'), 'utf8'))
const csv = readFileSync(join(dir, 'receitas-100-custos.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(';'))
const tipoOf = Object.fromEntries(csv.map((r) => [Number(r[0]), r[4]]))

const cents = (s) => Math.round(Number(s) * 100)
// P = { "chave": p("Nome", "embalagem", "preco", qtd, "u", grupo), ... }
const ing = []
for (const m of py.matchAll(/^\s*"([a-z_0-9]+)": p\("([^"]+)", "([^"]+)", "([\d.]+)", (\d+), "(g|ml|un)", (\d+)\),/gm)) {
  ing.push({ id: m[1], nome: m[2], embalagem: m[3], precoCents: cents(m[4]), qtdPacote: Number(m[5]), unidade: m[6], grupo: Number(m[7]) })
}
if (ing.length !== 54) throw new Error(`esperava 54 ingredientes, li ${ing.length}`)
const alias = Object.fromEntries([...py.match(/^ALIAS = (\{.*\})/m)[1].matchAll(/"([a-z_]+)": "([a-z_]+)"/g)].map((m) => [m[1], m[2]]))
const xicLine = py.match(/^XIC = (\{.*\})/m)[1]
const xic = Object.fromEntries([...xicLine.matchAll(/"([a-z_]+)": D\((\d+)\)/g)].map((m) => [m[1], Number(m[2])]))
const ccg = Object.fromEntries([...py.match(/^CC_G = (\{.*\})/m)[1].matchAll(/"([a-z_]+)": D\((\d+)\)/g)].map((m) => [m[1], Number(m[2])]))
const un = Object.fromEntries([...py.match(/^UN = (\{.*?\})\s*#/m)[1].matchAll(/"([a-z_]+)": D\((\d+)\)/g)].map((m) => [m[1], Number(m[2])]))
const emb = {}
for (const m of py.matchAll(/"([a-z_0-9]+)": \("([^"]+)", D\("([\d.]+)"\)\)/g)) emb[m[1]] = { nome: m[2], cents: cents(m[3]) }
const embTipo = JSON.parse(py.match(/^EMB_TIPO = (\{.*\})/m)[1])
const embUn = Object.fromEntries(Object.entries(embTipo).map(([t, ks]) => [t, ks.reduce((s, k) => s + emb[k].cents, 0)]))

const receitas = data.receitas.map((r) => {
  const c = r.custeio
  let custeio
  if (c.kind === 'completa') custeio = { kind: 'completa', itens: c.itens }
  else if (c.kind === 'variacao') custeio = { kind: 'variacao', base: Number(c.base), remove: c.remove, add: c.add }
  else custeio = { kind: 'montagem', base: Number(c.base), baseUn: c.base_un, add: c.add }
  return { n: r.n, nome: r.nome, secao: r.secao, unidades: r.unidades, tipo: tipoOf[r.n], custeio }
})
if (receitas.length !== 100) throw new Error('esperava 100 receitas')

const j = (x) => JSON.stringify(x)
const lines = (arr) => '[\n' + arr.map((x) => '  ' + j(x)).join(',\n') + ',\n]'
const out = `// GERADO por scripts/gen-receitas-custo.mjs a partir do Bônus 07 (calc.py + receitas-100.json). NÃO edite à mão.
// Preços e medidas são EXEMPLOS do Bônus 07, não preços de mercado: a cliente troca pelos dela. Valores em centavos inteiros.
// Fórmula e arredondamento seguem o calc.py (fonte única do Bônus 07): ver shared/calc.ts e o teste de diferença zero em server/test/smoke.ts.

export type UnidadeBase = 'g' | 'ml' | 'un'
export type Medida = 'g' | 'ml' | 'xic' | 'cs' | 'cc' | 'un'
export interface IngredienteBase {
  id: string
  nome: string
  embalagem: string
  precoCents: number
  qtdPacote: number
  unidade: UnidadeBase
  grupo: number
}
// [ingrediente, quantidade (número ou fração em texto, ex.: "1/2"), medida]
export type LinhaTxt = [string, string, Medida]
export type Custeio =
  | { kind: 'completa'; itens: LinhaTxt[] }
  | { kind: 'variacao'; base: number; remove: LinhaTxt[]; add: LinhaTxt[] }
  | { kind: 'montagem'; base: number; baseUn: number; add: LinhaTxt[] }
export interface ReceitaCusto {
  n: number
  nome: string
  secao: string
  unidades: number
  // G = chocotone/panetone de 15 cm no forno; M = minichocotone de 7 cm na air fryer
  tipo: 'G' | 'M'
  custeio: Custeio
}

export const INGREDIENTES_BASE: IngredienteBase[] = ${lines(ing)}

// ingredientes do PDF que usam o mesmo preço de outro; água da torneira custa zero
export const ALIAS: Record<string, string> = ${j(alias)}
export const GRATIS: readonly string[] = ['agua']

// medidas caseiras -> g ou ml (xícara de 240 ml). A cliente pesa na balança dela.
export const CONVERSOES = {
  xic: ${j(xic)} as Record<string, number>,
  csMl: 15,
  ccMl: 5,
  ccG: ${j(ccg)} as Record<string, number>,
  un: ${j(un)} as Record<string, number>,
}

// embalagem de exemplo por item (centavos) e por tipo
export const EMBALAGEM_ITENS: Record<string, { nome: string; cents: number }> = ${j(emb)}
export const EMBALAGEM_TIPO: Record<'G' | 'M', string[]> = ${j(embTipo)}
export const EMBALAGEM_UN_EXEMPLO: Record<'G' | 'M', number> = ${j(embUn)}

export const RECEITAS: ReceitaCusto[] = ${lines(receitas)}
`
writeFileSync(new URL('../shared/receitas-custo.ts', import.meta.url), out)
console.log(`gravado shared/receitas-custo.ts: ${ing.length} ingredientes, ${receitas.length} receitas, embalagem por unidade`, embUn)
