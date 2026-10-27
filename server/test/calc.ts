// Testes da Conta da Fornada: diferença ZERO, em centavos, contra o gabarito do Bônus 07 (calc.py) nas 100 receitas,
// mais os exemplos e os casos de borda do plano. Roda com: npx tsx server/test/calc.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  FORMULA_VERSION,
  PREMISSAS,
  RECEITAS,
  alertasDeAlta,
  brl,
  calcular,
  canais,
  ceil,
  compararEmbalagem,
  contaDaReceita,
  contaValida,
  contaVazia,
  custoAlvo,
  custoFatia,
  custoKit,
  encomenda,
  equilibrio,
  faixas,
  listaDeCompras,
  meta,
  parseMoney,
  parseQtd,
  perdaMedia,
  piMedio,
  precoEmpate,
  precoRes,
  precoSugerido,
  precosExemplo,
  retornoPorHora,
  round,
} from '../../shared/calc.js'

let n = 0
const ok = (cond: unknown, msg: string) => {
  assert.ok(cond, msg)
  n += 1
}
const eq = <T>(a: T, b: T, msg: string) => {
  assert.deepEqual(a, b, msg)
  n += 1
}

const cents = (s: string) => Math.round(Number(s) * 100)
const csv = readFileSync(fileURLToPath(new URL('./golden/receitas-100-custos.csv', import.meta.url)), 'utf8').trim().split(/\r?\n/)
const head = csv[0].split(';')
const rows = csv.slice(1).map((l) => Object.fromEntries(l.split(';').map((v, i) => [head[i], v])))
eq(rows.length, 100, 'gabarito tem 100 receitas')

// ---- 1. diferença zero nas 100 receitas (preços de exemplo, sem taxa, sem hora) ----
const precos = precosExemplo()
for (const row of rows) {
  const num = Number(row.n)
  const conta = contaDaReceita(num, '2026-01-01T00:00:00.000Z', `t${num}`)!
  const r = calcular(conta, precos)
  const tag = `receita ${row.n}`
  ok(r.ok && r.c !== null, `${tag}: conta completa`)
  eq(conta.tipo, row.tipo as 'G' | 'M', `${tag}: tipo`)
  eq(conta.rende, Number(row.rende), `${tag}: rende`)
  eq(r.I, cents(row.ingredientes), `${tag}: ingredientes`)
  eq(r.G, cents(row.gas_energia), `${tag}: gás`)
  eq(r.E, cents(row.embalagem_lote), `${tag}: embalagem do lote`)
  eq(r.K, cents(row.custo_lote), `${tag}: custo do lote`)
  eq(r.c!, cents(row.custo_unidade), `${tag}: custo por unidade`)
  eq(Number(row.rendimento_liquido), r.L, `${tag}: rendimento líquido`)
  const fx = faixas(r.c!)
  for (const f of fx) {
    const preco = cents(row[`${f.id}_preco`])
    eq(f.precoCents, preco, `${tag}: preço ${f.id}`)
    const pr = precoRes(f.precoCents, r.c!, r.K, r.L, 0, 0)
    eq(pr.m === null ? -1 : round(pr.m * 100), Number(row[`${f.id}_margem`].replace('%', '')), `${tag}: margem ${f.id}`)
    eq(pr.lote, cents(row[`${f.id}_lucro_lote`]), `${tag}: lucro do lote ${f.id}`)
  }
}

// ---- 2. exemplo da receita 001 do plano (seção 3.4) ----
{
  const r = calcular(contaDaReceita(1, 'x')!, precos)
  eq([r.I, r.G, r.E, r.K, r.c], [3054, 210, 1216, 4480, 2358], 'receita 001: números do Bônus 07')
  eq(faixas(r.c!).map((f) => f.precoCents), [3600, 4800, 7100], 'receita 001: faixas')
}

// ---- 3. exemplos A e B (receita 011, taxa 4%) ----
{
  const conta = contaDaReceita(11, 'x')!
  conta.taxaPct = 4
  const r = calcular(conta, precos)
  eq([r.I, r.G, r.E, r.K, r.c], [1797, 105, 608, 2510, 2642], 'receita 011 (exemplo A)')
  eq(faixas(r.c!).map((f) => f.precoCents), [4000, 5300, 8000], 'faixas do exemplo A')
  const sem = precoRes(5300, r.c!, r.K, r.L, 0, 0)
  eq([sem.pi, sem.lote, round(sem.m! * 100)], [2658, 2525, 50], 'sobra, lucro do lote e margem sem taxa')
  const com = precoRes(5300, r.c!, r.K, r.L, 4, 0)
  eq(com.pi, 2446, 'sobra com taxa de 4%')
  eq(Math.round(com.m! * 1000), 462, 'margem com taxa de 4% = 46,2%')
  // P0 arredonda para cima ao centavo: 26,42 / 0,96 = 27,5208 -> 27,53
  eq(precoEmpate(r.c!, 0, 4), 2753, 'preço de empate arredonda para cima')
  ok(precoRes(2753, r.c!, r.K, r.L, 4, 0).pi >= 0, 'no preço de empate a sobra não é negativa')
  eq(precoSugerido(r.c!, 0, 4, 40, 'real'), 4800, 'preço sugerido (margem 40%, taxa 4%) = R$ 48')
  eq(precoRes(4800, r.c!, r.K, r.L, 4, 0).pi, 1966, 'sobra no preço sugerido')
  eq(equilibrio(30000, 2446), 13, 'equilíbrio com Fm = R$ 300')
  eq(custoAlvo(4500, 0, 4, 30), 2970, 'custo-alvo')
  const e = encomenda(5300, r.c!, 4, 0, 2500, 20, 10)!
  eq([e.precoUn, e.sPedido, e.pi], [4770, 125, 1812], 'encomenda de 20 un com 10% de abatimento e frete')
  eq(Math.round(e.abatimentoMax! * 1000), 456, 'abatimento máximo 45,6%')
}

// ---- 4. exemplo C e D ----
{
  eq(retornoPorHora(2446, 0, 1), 2446, 'retorno por hora do produto A')
  eq(retornoPorHora(225, 0, 0.25), 900, 'retorno por hora do produto B (sobra de lote 2,25 em 15 min)')
  ok(retornoPorHora(100, 0, 0) === null, 'sem horas não calcula')
  const m = meta(50000, 0, 1000, 1, 1)!
  eq(m.unidades, 50, 'exemplo D: R$ 10 por unidade e meta R$ 500 = 50 un')
  eq(meta(50000, 30000, 1000, 1, 1)!.unidades, 80, 'meta com custos fixos')
  eq(equilibrio(30000, 1000), 30, 'prévia: 30 unidades')
  ok(meta(0, 0, 1000, 1, 1) === null, 'meta zero não calcula')
  ok(meta(1000, 0, -5, 1, 1) === null, 'sobra negativa não calcula meta')
  eq(piMedio([{ pi: 1000, peso: 1 }, { pi: 3000, peso: 1 }]), 2000, 'média ponderada igual')
  eq(piMedio([{ pi: 1000, peso: 3 }, { pi: 3000, peso: 1 }]), 1500, 'média ponderada 3 para 1')
  ok(piMedio([{ pi: 1000, peso: 0 }]) === null, 'pesos zerados')
}

// ---- 5. casos de borda ----
{
  const c = contaDaReceita(1, 'x')!
  const incompleta = calcular(c, {})
  ok(!incompleta.ok && incompleta.c === null && incompleta.erro === 'incompleta' && incompleta.incompletos.length > 0, 'sem preços: conta incompleta e sem número final')
  const semRende = { ...c, rende: 0 }
  eq(calcular(semRende, precos).erro, 'rende', 'rende 0 bloqueia')
  eq(calcular({ ...c, fator: 0 }, precos).erro, 'rende', 'fator 0 bloqueia')
  eq(calcular({ ...c, perdaPct: 95 }, precos).erro, 'perda', 'perda acima de 90% bloqueia')
  const pr = precoRes(0, 2358, 4480, 1.9, 0, 0)
  ok(pr.m === null && pr.k === null, 'preço zero: margem e markup nulos, sem NaN')
  ok(precoSugerido(2000, 0, 50, 50, 'real') === null, 'taxa + margem >= 100%: sem sugestão')
  eq(precoSugerido(2358, 0, 0, 40, 'noventa'), 3990, 'arredondar para ,90 sobe até terminar em ,90')
  eq(precoSugerido(2000, 0, 0, 0, 'nenhum'), 2000, 'sem arredondar')
  ok(equilibrio(1000, 0) === null && equilibrio(1000, -50) === null, 'sobra <= 0: sem equilíbrio')
  eq(parseQtd('1/2'), 0.5, 'fração')
  eq(parseQtd('1 1/2'), 1.5, 'fração mista')
  ok(Number.isNaN(parseQtd('abc')) && Number.isNaN(parseQtd('1/0')), 'quantidade inválida')
  eq(parseMoney('7,00'), 700, 'dinheiro com vírgula')
  eq(parseMoney('R$ 1.234,56'), 123456, 'dinheiro com milhar')
  eq(parseMoney('7.5'), 750, 'dinheiro com ponto')
  ok(parseMoney('-3') === null && parseMoney('x') === null && parseMoney('') === null && parseMoney('200000') === null, 'dinheiro inválido ou acima de R$ 100.000')
  eq(brl(123456), 'R$ 1.234,56', 'formato brl')
  eq(brl(5), 'R$ 0,05', 'formato brl pequeno')
  eq(ceil(3.0000000001), 3, 'ceil tolera ponto flutuante')
  // ingrediente sem conversão segura: xícara de um ingrediente que não está na tabela
  const c2 = contaVazia('Meu bolo', 'x')
  c2.linhas = [{ id: 'a', k: 'i', ing: 'farinha', qtd: 2, med: 'xic' }, { id: 'b', k: 'i', ing: 'oleo', qtd: 1, med: 'xic' }]
  const r2 = calcular(c2, precos)
  ok(!r2.ok && r2.incompletos.includes('oleo'), 'xícara de ingrediente sem conversão marca como incompleta')
  // água custa zero
  c2.linhas = [{ id: 'a', k: 'i', ing: 'agua', qtd: 1, med: 'xic' }]
  eq(calcular(c2, precos).I, 0, 'água custa zero')
  ok(contaValida(contaDaReceita(1, 'x')), 'conta do livro é válida')
  ok(!contaValida({ ...contaDaReceita(1, 'x')!, taxaPct: 80 }) && !contaValida(null) && !contaValida({ id: 1 }), 'conta inválida é rejeitada')
  eq(FORMULA_VERSION, 1, 'versão da fórmula')
  eq(PREMISSAS.embUnCents, { G: 640, M: 140 }, 'embalagem por unidade do Bônus 07')
}

// ---- 6. ferramentas ----
{
  const conta = contaDaReceita(1, 'x')!
  const r = calcular(conta, precos)
  eq(custoFatia(2358, 10, 8, 50), round((2358 * 0.9) / 8) + 50, 'fatia')
  ok(custoFatia(2358, 0, 0, 0) === null, 'fatia sem porções')
  eq(custoKit([{ q: 2, c: 1000 }, { q: 1, c: 500 }], 300, 100), 2900, 'kit')
  const lc = listaDeCompras([{ conta, lotes: 2 }], precos)
  ok(lc.itens.length > 5 && lc.gasto >= lc.custoReceitas - 1, 'lista de compras: o gasto no mercado cobre o custo das receitas (pacotes inteiros)')
  ok(lc.itens.every((i) => i.sobra >= -1e-6 && i.pacotes >= 1), 'lista de compras: pacotes inteiros, sobra no armário não negativa')
  eq(perdaMedia([{ produzidas: 20, boas: 18 }, { produzidas: 10, boas: 10 }]), 1 - 28 / 30, 'perda média real')
  ok(perdaMedia([]) === null, 'perda média sem lotes')
  const mais = { ...precos, farinha: { ...precos.farinha, precoCents: Math.round(precos.farinha.precoCents * 1.2) } }
  const conta2 = { ...conta, precoCents: 4800 }
  const al = alertasDeAlta(conta2, precos, mais)
  ok(al.length === 1 && al[0].ing === 'farinha' && al[0].deltaUn > 0 && al[0].novaSobra !== null, 'alerta de alta de 20% na farinha')
  const baixa = { ...precos, farinha: { ...precos.farinha, precoCents: Math.round(precos.farinha.precoCents * 1.03) } }
  eq(alertasDeAlta(conta2, precos, baixa).length, 0, 'alta de 3% não alerta')
  const cmp = compararEmbalagem(r.c!, 640, [{ nome: 'Caixa simples', embUn: 500 }], 0, 0, 4800, 0.4)
  ok(cmp[0].c < r.c! && cmp[0].pi > 0, 'embalagem mais barata baixa o custo')
  const ch = canais(r.c!, [{ nome: 'Pix', taxaPct: 0, taxaFixa: 0, frete: 0, n: 1 }, { nome: 'Maquininha', taxaPct: 4, taxaFixa: 0, frete: 0, n: 1 }], 40, 4800, 'real')
  ok(ch[1].p0! > ch[0].p0! && ch[1].pSug! >= ch[0].pSug!, 'canal com taxa pede preço maior')
}

// ---- 7. dados do Bônus 07 ----
eq(RECEITAS.filter((r) => r.custeio.kind === 'completa').length, 3, '3 receitas completas')
eq(RECEITAS.filter((r) => r.custeio.kind === 'variacao').length, 2, '2 variações')
eq(RECEITAS.filter((r) => r.custeio.kind === 'montagem').length, 95, '95 montagens')

console.log(`calc: ${n} verificações passaram (100 receitas com diferença zero em centavos).`)
