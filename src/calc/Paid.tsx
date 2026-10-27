// Conta da Fornada: preço, mês (equilíbrio e meta), hora (ranking). Para quem não tem a ferramenta, uma prévia de exemplo.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { brl, calcular, equilibrio, meta, piMedio, precoRes, retornoPorHora, type Conta } from '../../shared/calc'
import { BASE, CalcLayout, Honestidade, Line, LockedTile, MoneyField, NumField, Travado, useOwned } from './ui'
import { Sugestao } from './Result'
import { setPrefs, useCalc } from './store'
import { PREVIA, T } from './strings'

const num = (v: number, casas = 1) => String(Math.round(v * 10 ** casas) / 10 ** casas).replace('.', ',')

/** contas guardadas, com custo calculado e preço digitado */
function prontas(contas: Conta[], precos: Parameters<typeof calcular>[1]) {
  return contas
    .filter((c) => c.estado === 'concluida' && c.precoCents)
    .map((c) => {
      const r = calcular(c, precos)
      if (!r.ok || r.c === null || !c.precoCents) return null
      return { c, r, pre: precoRes(c.precoCents, r.c, r.K, r.L, c.taxaPct, r.s) }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
}

export function Preco() {
  const owned = useOwned()
  const { doc } = useCalc()
  const [id, setId] = useState('')
  if (!owned)
    return (
      <CalcLayout title="Preço" back={BASE} tabs>
        <Travado titulo="Preço sugerido pela sua margem" texto="Diga a margem que você quer e veja o preço que fecha a conta, inclusive por canal de venda (loja, aplicativo, encomenda)." from="calc-preco">
          <LockedTile titulo="Preço pela margem" texto="Exemplo: custo de R$ 20,00 por unidade, sem taxa, margem de 40%: o preço que dá essa margem é R$ 34,00." />
        </Travado>
      </CalcLayout>
    )
  const lista = doc.contas.filter((c) => c.estado === 'concluida')
  const c = lista.find((x) => x.id === id) ?? lista[0]
  const r = c ? calcular(c, doc.precos) : null
  return (
    <CalcLayout title="Preço" back={BASE} tabs>
      <h1 className="cc-h1">Preço</h1>
      {!c || !r ? (
        <p className="cc-lead">Conclua uma conta para ver o preço sugerido. <Link to={`${BASE}/nova`}>Nova conta</Link></p>
      ) : (
        <>
          <div className="cc-field">
            <label htmlFor="cc-conta">Conta</label>
            <select id="cc-conta" value={c.id} onChange={(e) => setId(e.target.value)}>
              {lista.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </div>
          <Sugestao c={c} r={r} />
          <CanaisEditor />
        </>
      )}
      <Honestidade />
    </CalcLayout>
  )
}

function CanaisEditor() {
  const { doc } = useCalc()
  const [nome, setNome] = useState('')
  const [taxa, setTaxa] = useState(0)
  const [fixa, setFixa] = useState(0)
  const [frete, setFrete] = useState(0)
  const [n, setN] = useState(1)
  const canais = doc.prefs.canais
  return (
    <section className="cc-card" aria-label="Canais de venda">
      <h3>Meus canais de venda</h3>
      <p className="cc-small">Cada canal tem a sua taxa. A conta mostra o preço de cada um acima.</p>
      {canais.map((c) => (
        <div className="cc-qrow" key={c.id}>
          <span>
            <b>{c.nome}</b> · {num(c.taxaPct)}% + {brl(c.taxaFixaCents)} + frete {brl(c.freteCents)} por {c.n} un
          </span>
          <button className="cc-x" aria-label={`Tirar ${c.nome}`} onClick={() => setPrefs({ canais: canais.filter((x) => x.id !== c.id) })}>
            ✕
          </button>
        </div>
      ))}
      {canais.length < 12 && (
        <>
          <div className="cc-field">
            <label htmlFor="cc-cn">Nome do canal</label>
            <input id="cc-cn" value={nome} maxLength={40} placeholder="ex.: aplicativo de entrega" onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="cc-row2">
            <NumField label="Taxa sobre a venda" value={taxa} max={50} suffix="%" onCommit={setTaxa} />
            <NumField label="Unidades por pedido" value={n} min={1} max={1000} onCommit={(v) => setN(Math.max(1, Math.round(v)))} />
          </div>
          <div className="cc-row2">
            <MoneyField label="Taxa fixa por pedido" cents={fixa} onCommit={setFixa} />
            <MoneyField label="Frete por pedido" cents={frete} onCommit={setFrete} />
          </div>
          <button className="btn btn-secondary btn-block" disabled={!nome.trim()} onClick={() => { setPrefs({ canais: [...canais, { id: `k${Date.now().toString(36)}`, nome: nome.trim(), taxaPct: taxa, taxaFixaCents: fixa, freteCents: frete, n }] }); setNome('') }}>
            + Adicionar canal
          </button>
        </>
      )}
    </section>
  )
}

export function Mes() {
  const owned = useOwned()
  const { doc } = useCalc()
  const p = doc.prefs
  const itens = prontas(doc.contas, doc.precos)
  if (!owned)
    return (
      <CalcLayout title="Mês" back={BASE} tabs>
        <Travado titulo="Equilíbrio e meta do mês" texto="Quantas unidades vender no mês para cobrir os custos fixos e para sobrar a meta que você quer." from="calc-mes">
          <div className="cc-tiles">
            <LockedTile titulo="Equilíbrio do mês" texto={PREVIA.equilibrio.texto} />
            <LockedTile titulo="Meta do mês" texto={PREVIA.meta.texto} />
          </div>
        </Travado>
      </CalcLayout>
    )
  const peso = (id: string) => p.pesos[id] ?? 1
  const pi = piMedio(itens.map((i) => ({ pi: i.pre.pi, peso: peso(i.c.id) })))
  const tot = itens.reduce((s, i) => s + Math.max(0, peso(i.c.id)), 0)
  const Lmed = tot > 0 ? itens.reduce((s, i) => s + (i.r.L * Math.max(0, peso(i.c.id))) / tot, 0) : 0
  const Hmed = tot > 0 ? itens.reduce((s, i) => s + (i.c.horas * Math.max(0, peso(i.c.id))) / tot, 0) : 0
  const eq = pi !== null ? equilibrio(p.despesasFixasCents, pi) : null
  const mt = pi !== null ? meta(p.metaCents, p.despesasFixasCents, pi, Lmed, Hmed, p.semanas) : null
  return (
    <CalcLayout title="Mês" back={BASE} tabs>
      <h1 className="cc-h1">O mês</h1>
      <section className="cc-card">
        <MoneyField label="Custos fixos do mês" cents={p.despesasFixasCents} onCommit={(c) => setPrefs({ despesasFixasCents: c })} hint="Aluguel de espaço, internet, sua assinatura de aplicativos, o que se paga mesmo sem vender" />
        <MoneyField label="Quanto você quer que sobre no mês" cents={p.metaCents || null} onCommit={(c) => setPrefs({ metaCents: c })} onClear={() => setPrefs({ metaCents: 0 })} hint="A sua meta. Deixe vazio se ainda não tem" />
        <NumField label="Semanas de venda no mês" value={p.semanas} min={1} max={6} onCommit={(n) => setPrefs({ semanas: Math.max(1, Math.min(6, Math.round(n))) })} />
      </section>
      {itens.length === 0 ? (
        <p className="cc-warn">Conclua uma conta com o preço de venda digitado para calcular o mês. <Link to={`${BASE}/nova`}>Nova conta</Link></p>
      ) : (
        <>
          <section className="cc-card">
            <h3>O que você espera vender</h3>
            <p className="cc-small">Quantas unidades de cada receita no mês (só a proporção importa).</p>
            {itens.map((i) => (
              <NumField key={i.c.id} label={i.c.nome} value={peso(i.c.id)} max={100000} suffix="un" onCommit={(n) => setPrefs({ pesos: { ...p.pesos, [i.c.id]: n } })} hint={`sobra ${brl(i.pre.pi)} por unidade`} />
            ))}
          </section>
          <section className="cc-card" aria-label="Resultado do mês">
            {pi === null || pi <= 0 ? (
              <p className="cc-warn">Com esses preços não sobra nada por unidade, então não há quantidade que feche o mês. Revise o preço.</p>
            ) : (
              <>
                <Line k="Sobra média por unidade" v={brl(Math.round(pi))} />
                {p.despesasFixasCents > 0 && eq !== null && <Line k="Para cobrir os custos fixos" v={`${eq} unidades no mês`} strong />}
                {mt && (
                  <>
                    <Line k="Para sobrar a sua meta" v={`${mt.unidades} unidades no mês`} strong note="inclui os custos fixos" />
                    <Line k="Isso são" v={`${mt.lotes} fornadas · ${mt.porSemana} un por semana`} />
                    {mt.horas > 0 && <Line k="Horas de trabalho" v={`${num(mt.horas)} h no mês`} />}
                  </>
                )}
                {p.metaCents === 0 && p.despesasFixasCents === 0 && <p className="cc-small">Digite os custos fixos ou a meta para ver as quantidades.</p>}
              </>
            )}
          </section>
        </>
      )}
      <Honestidade />
    </CalcLayout>
  )
}

export function Hora() {
  const owned = useOwned()
  const { doc } = useCalc()
  const [por, setPor] = useState<'hora' | 'un'>('hora')
  if (!owned)
    return (
      <CalcLayout title="Hora" back={BASE} tabs>
        <Travado titulo="Retorno por hora e ranking" texto="Qual receita compensa mais o seu tempo? A conta compara o que sobra por unidade e por hora de trabalho." from="calc-hora">
          <LockedTile titulo="Retorno por hora" texto={PREVIA.hora.texto} />
        </Travado>
      </CalcLayout>
    )
  const itens = prontas(doc.contas, doc.precos).map((i) => ({ ...i, rph: retornoPorHora(i.pre.lote, i.r.M, i.c.horas) }))
  const ord = [...itens].sort((a, b) => (por === 'hora' ? (b.rph ?? -1e12) - (a.rph ?? -1e12) : b.pre.pi - a.pre.pi))
  return (
    <CalcLayout title="Hora" back={BASE} tabs>
      <h1 className="cc-h1">Quanto rende a sua hora</h1>
      <div className="cc-seg" role="group" aria-label="Ordenar por">
        <button className={por === 'hora' ? 'on' : ''} aria-pressed={por === 'hora'} onClick={() => setPor('hora')}>
          Por hora
        </button>
        <button className={por === 'un' ? 'on' : ''} aria-pressed={por === 'un'} onClick={() => setPor('un')}>
          Por unidade
        </button>
      </div>
      {ord.length === 0 ? (
        <p className="cc-warn">Conclua contas com o preço de venda digitado para comparar.</p>
      ) : (
        <div className="cc-card">
          {ord.map((i, k) => (
            <Line key={i.c.id} k={`${k + 1}. ${i.c.nome}`} v={i.rph === null ? 'sem horas' : `${brl(i.rph)}/h`} note={`sobra ${brl(i.pre.pi)} por unidade · ${brl(i.pre.lote)} no lote`} />
          ))}
          <p className="cc-small">Retorno por hora = (o que sobra do lote + o valor da sua hora) ÷ horas da fornada. Contas sem horas informadas ficam sem o valor por hora: informe no passo 3.</p>
        </div>
      )}
      <Honestidade />
    </CalcLayout>
  )
}

void T
