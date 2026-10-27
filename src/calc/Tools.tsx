// Conta da Fornada: ferramentas (encomenda grande, kit de presente, fatia, custo-alvo, embalagem, lista de compras) e preços dos ingredientes.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { alertasDeAlta, brl, calcular, compararEmbalagem, custoAlvo, custoFatia, custoKit, encomenda, listaDeCompras, nomeIng, pctTxt, precoRes, type Conta, type Precos } from '../../shared/calc'
import { BASE, CalcLayout, Honestidade, Line, LockedTile, MoneyField, NumField, Travado, useOwned } from './ui'
import { IngRow } from './Wizard'
import { useCalc } from './store'

function ContaSelect({ id, set, contas }: { id: string; set: (id: string) => void; contas: Conta[] }) {
  return (
    <div className="cc-field">
      <label htmlFor="cc-ts">Conta</label>
      <select id="cc-ts" value={id} onChange={(e) => set(e.target.value)}>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
    </div>
  )
}

function usaConta(contas: Conta[], precos: Precos, id: string) {
  const c = contas.find((x) => x.id === id) ?? contas[0]
  const r = c ? calcular(c, precos) : null
  return { c, r: r && r.ok && r.c !== null ? r : null }
}

function Encomenda({ contas, precos }: { contas: Conta[]; precos: Precos }) {
  const [id, setId] = useState('')
  const [q, setQ] = useState(20)
  const [ab, setAb] = useState(0)
  const { c, r } = usaConta(contas, precos, id)
  if (!c || !r || r.c === null || !c.precoCents) return <p className="cc-small">Precisa de uma conta concluída com o preço de venda.</p>
  const e = encomenda(c.precoCents, r.c, c.taxaPct, c.taxaFixaCents, c.freteCents, q, ab)
  return (
    <>
      <ContaSelect id={c.id} set={setId} contas={contas} />
      <div className="cc-row2">
        <NumField label="Unidades da encomenda" value={q} min={1} max={100000} onCommit={(n) => setQ(Math.max(1, Math.round(n)))} />
        <NumField label="Abatimento no preço" value={ab} max={90} suffix="%" onCommit={setAb} hint="Desconto que pensa em dar" />
      </div>
      {e && (
        <>
          <Line k="Preço por unidade" v={brl(e.precoUn)} />
          <Line k="Sobra por unidade" v={brl(e.pi)} strong warn={e.prejuizo} />
          <Line k="Sobra da encomenda" v={brl(e.total)} strong warn={e.prejuizo} />
          {e.prejuizo && <p className="cc-warn">Nesse preço a encomenda dá prejuízo.</p>}
          {e.abatimentoMax !== null && <p className="cc-small">Abatimento máximo sem passar do preço de empate: {pctTxt(e.abatimentoMax)}.</p>}
        </>
      )}
    </>
  )
}

function Kit({ contas, precos }: { contas: Conta[]; precos: Precos }) {
  const [qs, setQs] = useState<Record<string, number>>({})
  const [emb, setEmb] = useState(0)
  const [outros, setOutros] = useState(0)
  const [preco, setPreco] = useState<number | null>(null)
  const itens = contas.map((c) => ({ c, r: calcular(c, precos) })).filter((x) => x.r.ok && x.r.c !== null)
  const custo = custoKit(itens.map((x) => ({ q: qs[x.c.id] ?? 0, c: x.r.c ?? 0 })), emb, outros)
  return (
    <>
      <p className="cc-small">Quantas unidades de cada receita vão no kit.</p>
      {itens.map((x) => (
        <NumField key={x.c.id} label={x.c.nome} value={qs[x.c.id] ?? 0} max={100} onCommit={(n) => setQs({ ...qs, [x.c.id]: Math.round(n) })} hint={`custa ${brl(x.r.c ?? 0)} cada`} />
      ))}
      <div className="cc-row2">
        <MoneyField label="Embalagem do kit" cents={emb} onCommit={setEmb} />
        <MoneyField label="Outros custos do kit" cents={outros} onCommit={setOutros} />
      </div>
      <Line k="Custo do kit" v={brl(custo)} strong />
      <MoneyField label="Preço que você cobra pelo kit" cents={preco} onCommit={setPreco} onClear={() => setPreco(null)} />
      {preco !== null && custo > 0 && <Line k="Sobra por kit" v={brl(preco - custo)} strong warn={preco - custo <= 0} />}
    </>
  )
}

function Fatia({ contas, precos }: { contas: Conta[]; precos: Precos }) {
  const [id, setId] = useState('')
  const [ap, setAp] = useState(5)
  const [por, setPor] = useState(8)
  const [emb, setEmb] = useState(0)
  const [pf, setPf] = useState<number | null>(null)
  const { c, r } = usaConta(contas, precos, id)
  if (!c || !r || r.c === null) return <p className="cc-small">Precisa de uma conta concluída.</p>
  const cf = custoFatia(r.c, ap, por, emb)
  return (
    <>
      <ContaSelect id={c.id} set={setId} contas={contas} />
      <div className="cc-row2">
        <NumField label="Fatias por unidade" value={por} min={1} max={100} onCommit={(n) => setPor(Math.max(1, Math.round(n)))} />
        <NumField label="Aparas (sobra do corte)" value={ap} max={50} suffix="%" onCommit={setAp} />
      </div>
      <MoneyField label="Embalagem de cada fatia" cents={emb} onCommit={setEmb} />
      {cf !== null && <Line k="Custo de cada fatia" v={brl(cf)} strong />}
      <MoneyField label="Preço da fatia" cents={pf} onCommit={setPf} onClear={() => setPf(null)} />
      {pf !== null && cf !== null && <Line k="Sobra por fatia" v={brl(Math.round(pf * (1 - c.taxaPct / 100)) - cf)} strong warn={Math.round(pf * (1 - c.taxaPct / 100)) - cf <= 0} />}
    </>
  )
}

function CustoAlvo({ contas, precos }: { contas: Conta[]; precos: Precos }) {
  const [id, setId] = useState('')
  const [p, setP] = useState<number | null>(null)
  const [m, setM] = useState(40)
  const { c, r } = usaConta(contas, precos, id)
  if (!c || !r || r.c === null) return <p className="cc-small">Precisa de uma conta concluída.</p>
  const P = p ?? c.precoCents ?? 0
  const alvo = P > 0 ? custoAlvo(P, r.s, c.taxaPct, m) : null
  return (
    <>
      <ContaSelect id={c.id} set={setId} contas={contas} />
      <MoneyField label="Preço que o seu cliente aceita" cents={P || null} onCommit={setP} />
      <NumField label="Margem que você quer" value={m} max={90} suffix="%" onCommit={setM} />
      {alvo !== null && (
        <>
          <Line k="Custo máximo por unidade" v={brl(alvo)} strong />
          <Line k="Custo de hoje" v={brl(r.c)} warn={r.c > alvo} />
          {r.c > alvo && <p className="cc-warn">Hoje custa {brl(r.c - alvo)} a mais por unidade do que esse preço e essa margem permitem.</p>}
        </>
      )}
    </>
  )
}

function Embalagem({ contas, precos }: { contas: Conta[]; precos: Precos }) {
  const [id, setId] = useState('')
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const { c, r } = usaConta(contas, precos, id)
  if (!c || !r || r.c === null || !c.precoCents) return <p className="cc-small">Precisa de uma conta concluída com o preço de venda.</p>
  const pre = precoRes(c.precoCents, r.c, r.K, r.L, c.taxaPct, r.s)
  const opts = [
    { nome: 'Opção A', embUn: a },
    { nome: 'Opção B', embUn: b },
  ].filter((o): o is { nome: string; embUn: number } => o.embUn !== null)
  const res = compararEmbalagem(r.c, c.embUnCents, opts, c.taxaPct, r.s, c.precoCents, pre.m)
  return (
    <>
      <ContaSelect id={c.id} set={setId} contas={contas} />
      <p className="cc-small">Hoje: {brl(c.embUnCents)} de embalagem por unidade.</p>
      <div className="cc-row2">
        <MoneyField label="Opção A (por unidade)" cents={a} onCommit={setA} onClear={() => setA(null)} />
        <MoneyField label="Opção B (por unidade)" cents={b} onCommit={setB} onClear={() => setB(null)} />
      </div>
      {res.map((x) => (
        <Line key={x.nome} k={x.nome} v={`sobra ${brl(x.pi)}`} note={`custo ${brl(x.c)}${x.precoParaManter ? ` · para manter a margem: ${brl(x.precoParaManter)}` : ''}`} warn={x.pi <= 0} />
      ))}
    </>
  )
}

function Compras({ contas, precos }: { contas: Conta[]; precos: Precos }) {
  const [lotes, setLotes] = useState<Record<string, number>>({})
  const plan = contas.filter((c) => (lotes[c.id] ?? 0) > 0).map((c) => ({ conta: c, lotes: lotes[c.id] }))
  const l = plan.length ? listaDeCompras(plan, precos) : null
  return (
    <>
      <p className="cc-small">Quantas fornadas de cada uma você vai fazer.</p>
      {contas.map((c) => (
        <NumField key={c.id} label={c.nome} value={lotes[c.id] ?? 0} max={1000} suffix="fornadas" onCommit={(n) => setLotes({ ...lotes, [c.id]: Math.round(n) })} />
      ))}
      {l && (
        <>
          {l.itens.map((i) => (
            <Line key={i.ing} k={nomeIng(i.ing, precos)} v={brl(i.gastoCents)} note={`${Math.round(i.qtd)} ${i.unidade} · ${i.pacotes} ${i.pacotes === 1 ? 'pacote' : 'pacotes'}`} />
          ))}
          <Line k="Gasto no mercado (pacotes inteiros)" v={brl(l.gasto)} strong />
          <Line k="Custo só do que vai nas receitas" v={brl(l.custoReceitas)} note="o que sobra nos pacotes fica para a próxima" />
          {l.naoCalculados.length > 0 && <p className="cc-warn">Não consegui somar: {l.naoCalculados.map((i) => nomeIng(i, precos)).join(', ')}.</p>}
        </>
      )}
    </>
  )
}

export function Ferramentas() {
  const owned = useOwned()
  const { doc } = useCalc()
  const contas = doc.contas.filter((c) => c.estado === 'concluida')
  if (!owned)
    return (
      <CalcLayout title="Mais" back={BASE} tabs>
        <Travado titulo="Ferramentas da Conta da Fornada" texto="Encomenda grande, kit de presente, fatia, custo-alvo, comparar embalagem e lista de compras com custo." from="calc-ferramentas">
          <LockedTile titulo="Encomenda grande" texto="Exemplo: 20 unidades com 10% de abatimento. A conta diz quanto sobra no total e até quanto dá para abater." />
        </Travado>
      </CalcLayout>
    )
  const itens: [string, React.ReactNode][] = [
    ['Encomenda grande', <Encomenda key="e" contas={contas} precos={doc.precos} />],
    ['Kit de presente', <Kit key="k" contas={contas} precos={doc.precos} />],
    ['Vender em fatia', <Fatia key="f" contas={contas} precos={doc.precos} />],
    ['Custo máximo (custo-alvo)', <CustoAlvo key="c" contas={contas} precos={doc.precos} />],
    ['Comparar embalagem', <Embalagem key="b" contas={contas} precos={doc.precos} />],
    ['Lista de compras com custo', <Compras key="l" contas={contas} precos={doc.precos} />],
  ]
  return (
    <CalcLayout title="Mais" back={BASE} tabs>
      <h1 className="cc-h1">Ferramentas</h1>
      {contas.length === 0 && (
        <p className="cc-warn">
          Conclua uma conta primeiro. <Link to={`${BASE}/nova`}>Nova conta</Link>
        </p>
      )}
      {contas.length > 0 &&
        itens.map(([t, el]) => (
          <details key={t} className="cc-card cc-tool">
            <summary>{t}</summary>
            {el}
          </details>
        ))}
      <Link className="btn btn-secondary btn-block" to={`${BASE}/ingredientes`}>
        Preços dos meus ingredientes
      </Link>
      <Honestidade />
    </CalcLayout>
  )
}

export function Ingredientes() {
  const owned = useOwned()
  const { doc, alertas } = useCalc()
  if (!owned)
    return (
      <CalcLayout title="Ingredientes" back={BASE}>
        <Travado titulo="Preços dos meus ingredientes" texto="Todos os seus preços num lugar só, com aviso quando um ingrediente sobe e o que isso faz na sobra de cada receita." from="calc-ingredientes" />
      </CalcLayout>
    )
  const chaves = Object.entries(doc.precos).filter(([, p]) => p.fonte === 'meu').map(([k]) => k)
  // alertas guardados: o último preço dela contra o de agora
  const altas: { conta: string; ing: string; altaPct: number; deltaUn: number; novaSobra: number | null }[] = []
  for (const k of chaves) {
    const p = doc.precos[k]
    const h = p.hist?.[p.hist.length - 1]
    if (!h) continue
    const antes: Precos = { ...doc.precos, [k]: { ...p, precoCents: h.precoCents, qtdPacote: h.qtdPacote } }
    for (const c of doc.contas) if (c.estado === 'concluida') for (const a of alertasDeAlta(c, antes, doc.precos)) if (a.ing === k) altas.push({ conta: c.nome, ing: k, altaPct: a.altaPct, deltaUn: a.deltaUn, novaSobra: a.novaSobra })
  }
  return (
    <CalcLayout title="Ingredientes" back={BASE}>
      <h1 className="cc-h1">Preços dos meus ingredientes</h1>
      {alertas.length > 0 && (
        <section className="cc-card cc-alert" role="status" aria-label="Alerta de alta">
          <h3>⚠ Acabou de subir</h3>
          {alertas.map((a) => (
            <p key={a.conta + a.alta.ing}>
              {nomeIng(a.alta.ing, doc.precos)} subiu {pctTxt(a.alta.altaPct)}: em “{a.conta}” o custo por unidade sobe {brl(a.alta.deltaUn)}
              {a.alta.novaSobra !== null ? ` e a sobra agora é ${brl(a.alta.novaSobra)}` : ''}.
            </p>
          ))}
        </section>
      )}
      {altas.length > 0 && alertas.length === 0 && (
        <section className="cc-card cc-alert" aria-label="Ingredientes que subiram">
          <h3>⚠ Ingredientes que subiram</h3>
          {altas.map((a) => (
            <p key={a.conta + a.ing}>
              {nomeIng(a.ing, doc.precos)} subiu {pctTxt(a.altaPct)} desde o seu preço anterior: em “{a.conta}” custa {brl(a.deltaUn)} a mais por unidade.
            </p>
          ))}
        </section>
      )}
      {chaves.length === 0 && <p className="cc-lead">Os preços que você digitar nas contas aparecem aqui.</p>}
      {chaves.map((k) => (
        <IngRow key={k} ing={k} ro={false} />
      ))}
      <p className="cc-small">Quando você troca um preço, o anterior fica guardado para o app avisar se algum ingrediente subiu 5% ou mais.</p>
      <Honestidade />
    </CalcLayout>
  )
}
