// Conta da Fornada: o cartão da conta (resultado), a conta passo a passo, "e se" e auditoria.
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PREMISSAS, brl, calcular, canais, faixas, nomeIng, pctTxt, precoEmpate, precoRes, precoSugerido, type Conta, type Resultado as Res } from '../../shared/calc'
import { BASE, CalcLayout, ExTag, Honestidade, Line, LockedTile, UnlockBox, useOwned } from './ui'
import { apagarCenario, apagarConta, contaDe, duplicarConta, patchConta, podeEditar, podeNova, salvarCenario, setVisto, useCalc } from './store'
import { ingredientesDaConta } from './helpers'
import { PERGUNTAS, PERGUNTAS_FREE, PREVIA, T } from './strings'
import { NumField } from './ui'

const num = (v: number, casas = 0) => String(Math.round(v * 10 ** casas) / 10 ** casas).replace('.', ',')

export function Cartao({ c, r, pre }: { c: Conta; r: Res; pre: ReturnType<typeof precoRes> | null }) {
  const { doc } = useCalc()
  if (!r.ok || r.c === null) return <p className="cc-warn">A conta ainda está incompleta: falta preço em {r.incompletos.map((i) => nomeIng(i, doc.precos)).join(', ') || 'algum ingrediente'}.</p>
  const p0 = precoEmpate(r.c, r.s, c.taxaPct)
  const fx = faixas(r.c)
  const top = r.pesos.slice(0, 3)
  const ex = c.embExemplo || c.gas.exemplo || ingredientesDaConta(c).some((i) => doc.precos[i]?.fonte === 'exemplo')
  return (
    <section className="cc-card cc-print" aria-label="Cartão da conta">
      <h2>{c.nome}</h2>
      {ex && <p className="cc-ex-banner">Esta conta ainda usa preços de exemplo do Bônus 07. Troque pelos seus para valer. <ExTag /></p>}
      <Line k="Custo do lote" v={brl(r.K)} note={`${num(c.rende * c.fator, 1)} un − ${num(c.perdaPct, 1)}% de perda = ${num(r.L, 2)} boas`} />
      <Line k="Custo por unidade" v={brl(r.c)} strong />
      {pre && c.precoCents ? (
        <>
          <Line k="Preço que você usou" v={brl(c.precoCents)} />
          <Line k="Sobra por unidade" v={brl(pre.pi)} strong warn={pre.pi <= 0} note={c.taxaPct > 0 ? `já descontada a taxa de ${num(c.taxaPct, 1)}%` : undefined} />
          <Line k="Margem" v={pre.m === null ? '—' : pctTxt(pre.m)} warn={(pre.m ?? 0) <= 0} />
          {pre.pi <= 0 && <p className="cc-warn">Nesse preço cada unidade vendida dá prejuízo. O preço de empate está logo abaixo.</p>}
        </>
      ) : (
        <p className="cc-small">Digite o preço que você cobra (passo 3) para ver quanto sobra.</p>
      )}
      <Line k="Preço de empate" v={p0 === null ? '—' : brl(p0)} note="abaixo disso, prejuízo" />
      <div className="cc-faixas" aria-label="Faixas do Bônus 07">
        <span>Faixas do Bônus 07</span>
        <b>{fx.map((f) => `${f.nome} ${brl(f.precoCents)}`).join(' · ')}</b>
      </div>
      {top.length > 0 && (
        <div className="cc-pesos">
          <span>O que mais pesa no custo dos ingredientes</span>
          <ol>
            {top.map((p) => (
              <li key={p.ing}>
                {nomeIng(p.ing, doc.precos)} <b>{pctTxt(p.share)}</b>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Honestidade />
    </section>
  )
}

function PassoAPasso({ c, r }: { c: Conta; r: Res }) {
  const { doc } = useCalc()
  if (!r.ok) return null
  return (
    <details className="cc-det">
      <summary>Ver a conta passo a passo</summary>
      <div className="cc-steps-txt">
        {r.linhas.map((l) => (
          <Line key={l.linha.id} k={l.linha.k === 'i' ? `${l.linha.neg ? 'Tira: ' : ''}${nomeIng(l.linha.ing, doc.precos)}` : `Receita-base nº ${l.linha.receita}`} v={l.cents === null ? '—' : brl(l.cents)} />
        ))}
        <Line k={`Ingredientes${c.fator !== 1 ? ` (x${num(c.fator, 2)})` : ''}`} v={brl(r.I)} strong />
        <Line k="Gás ou energia" v={brl(r.G)} />
        <Line k="Embalagem" v={brl(r.E)} />
        <Line k="Sua hora" v={brl(r.M)} />
        <Line k="Outros custos" v={brl(r.A)} />
        <Line k="Custo do lote" v={brl(r.K)} strong />
        <Line k={`Unidades boas (${num(r.R, 1)} menos ${num(c.perdaPct, 1)}% de perda)`} v={num(r.L, 1)} />
        <Line k="Custo por unidade (lote ÷ unidades boas)" v={r.c !== null ? brl(r.c) : '—'} strong />
      </div>
    </details>
  )
}

export function Sugestao({ c, r }: { c: Conta; r: Res }) {
  const { doc } = useCalc()
  const ro = !podeEditar(c)
  if (!r.ok || r.c === null) return null
  const sug = precoSugerido(r.c, r.s, c.taxaPct, c.margemAlvoPct, c.arred)
  const ch = canais(r.c, doc.prefs.canais.map((x) => ({ nome: x.nome, taxaPct: x.taxaPct, taxaFixa: x.taxaFixaCents, frete: x.freteCents, n: x.n })), c.margemAlvoPct, c.precoCents ?? 0, c.arred)
  return (
    <section className="cc-card" aria-label="Preço sugerido pela sua margem">
      <h3>Preço sugerido pela sua margem</h3>
      <div className="cc-row2">
        <NumField label="Margem que você quer" value={c.margemAlvoPct} max={90} suffix="%" disabled={ro} onCommit={(n) => patchConta(c.id, { margemAlvoPct: n })} />
        <div className="cc-field">
          <label htmlFor="cc-arred">Arredondar</label>
          <select id="cc-arred" value={c.arred} disabled={ro} onChange={(e) => patchConta(c.id, { arred: e.target.value as Conta['arred'] })}>
            <option value="real">Para cima, ao real</option>
            <option value="noventa">Para cima, em ,90</option>
            <option value="nenhum">Sem arredondar</option>
          </select>
        </div>
      </div>
      {sug === null ? <p className="cc-warn">Taxa e margem somam 100% ou mais. Diminua a margem.</p> : <Line k="Preço que dá essa margem" v={brl(sug)} strong />}
      {sug !== null && !ro && c.precoCents !== sug && (
        <button className="btn btn-secondary btn-block" onClick={() => patchConta(c.id, { precoCents: sug })}>
          Usar {brl(sug)} como o meu preço
        </button>
      )}
      <p className="cc-small">É uma conta: o preço que seu cliente aceita depende da sua região e de quem compra de você.</p>
      {ch.length > 0 && (
        <>
          <h4>Por canal de venda</h4>
          {ch.map((x) => (
            <Line key={x.nome} k={x.nome} v={x.pSug === null ? '—' : brl(x.pSug)} note={`empate ${x.p0 === null ? '—' : brl(x.p0)} · sobra ${brl(x.pi)} no seu preço`} />
          ))}
        </>
      )}
    </section>
  )
}

export function ESe({ c, r, owned }: { c: Conta; r: Res; owned: boolean }) {
  const { doc } = useCalc()
  const [preco, setP] = useState(0)
  const [ingr, setI] = useState(0)
  const [perda, setPe] = useState(0)
  const [vol, setV] = useState(0)
  const [salvo, setSalvo] = useState('')
  if (!r.ok || r.c === null || !c.precoCents) return null
  const precos2 = ingr === 0 ? doc.precos : Object.fromEntries(Object.entries(doc.precos).map(([k, v]) => [k, { ...v, precoCents: Math.round(v.precoCents * (1 + ingr / 100)) }]))
  const c2 = { ...c, precoCents: Math.round(c.precoCents * (1 + preco / 100)), perdaPct: Math.max(0, Math.min(90, c.perdaPct + perda)), fator: Math.max(0.1, c.fator * (1 + vol / 100)) }
  const r2 = calcular(c2, precos2)
  const a = precoRes(c.precoCents, r.c, r.K, r.L, c.taxaPct, r.s)
  const b = r2.ok && r2.c !== null && c2.precoCents ? precoRes(c2.precoCents, r2.c, r2.K, r2.L, c.taxaPct, r2.s) : null
  const sl = (label: string, v: number, set: (n: number) => void, min: number, max: number, suf = '%') => (
    <div className="cc-slide">
      <label>
        {label}: <b>{v > 0 ? '+' : ''}{v}{suf}</b>
        <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => set(Number(e.target.value))} />
      </label>
    </div>
  )
  return (
    <section className="cc-card" aria-label="E se">
      <h3>E se...</h3>
      <p className="cc-small">Mexa nos controles e veja o que muda. Nada é salvo até você tocar em salvar.</p>
      {sl('Preço de venda', preco, setP, -30, 50)}
      {owned && sl('Preço dos ingredientes', ingr, setI, -30, 50)}
      {owned && sl('Perda', perda, setPe, -c.perdaPct, 30, ' pts')}
      {owned && sl('Quantidade de fornadas', vol, setV, -50, 100)}
      {!owned && <p className="cc-small"><span aria-hidden>🔒 </span>Na Conta da Fornada completa você também mexe nos ingredientes, na perda e na quantidade.</p>}
      {b ? (
        <div className="cc-cmp">
          <Line k="Sobra por unidade" v={`${brl(a.pi)} → ${brl(b.pi)}`} strong warn={b.pi <= 0} />
          <Line k="Custo por unidade" v={`${brl(r.c)} → ${brl(r2.c ?? 0)}`} />
          <Line k="Margem" v={`${a.m === null ? '—' : pctTxt(a.m)} → ${b.m === null ? '—' : pctTxt(b.m)}`} />
          <Line k="Sobra do lote" v={`${brl(a.lote)} → ${brl(b.lote)}`} />
        </div>
      ) : (
        <p className="cc-warn">Com esses números a conta não fecha. Mude um controle.</p>
      )}
      {owned && (
        <button
          className="btn btn-secondary btn-block"
          onClick={() => setSalvo(salvarCenario({ contaId: c.id, nome: `Preço ${preco >= 0 ? '+' : ''}${preco}%, ingredientes ${ingr >= 0 ? '+' : ''}${ingr}%`, precoPct: preco, custoPct: ingr, unidadesPct: vol }) ? 'Cenário salvo.' : 'Você já tem cenários demais. Apague algum.')}
        >
          Salvar este cenário
        </button>
      )}
      {salvo && <p className="cc-small" role="status">{salvo}</p>}
      {owned && doc.cenarios.filter((x) => x.contaId === c.id).length > 0 && (
        <ul className="cc-cen">
          {doc.cenarios.filter((x) => x.contaId === c.id).map((x) => (
            <li key={x.id}>
              {x.nome}
              <button className="cc-x" aria-label="Apagar cenário" onClick={() => apagarCenario(x.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Auditoria({ c, owned }: { c: Conta; owned: boolean }) {
  const { doc } = useCalc()
  const n = owned ? PERGUNTAS.length : PERGUNTAS_FREE
  const marcadas = PERGUNTAS.slice(0, n).filter((_, i) => doc.prefs.vistos[`aud:${c.id}:${i}`]).length
  return (
    <section className="cc-card" aria-label="Sua conta bate?">
      <h3>Sua conta bate?</h3>
      <p className="cc-small">Marque o que você fez. O que ficar sem marcar pode mudar o custo.</p>
      {PERGUNTAS.slice(0, n).map((q, i) => (
        <label className="cc-check" key={q}>
          <input type="checkbox" checked={!!doc.prefs.vistos[`aud:${c.id}:${i}`]} onChange={(e) => setVisto(`aud:${c.id}:${i}`, e.target.checked)} />
          <span>{q}</span>
        </label>
      ))}
      <p className="cc-small" role="status">
        {marcadas} de {n} conferidas.
      </p>
      {!owned && <p className="cc-small"><span aria-hidden>🔒 </span>A conta completa traz 10 perguntas.</p>}
    </section>
  )
}

export function Previa() {
  return (
    <section className="cc-card" aria-label="Para continuar a conta">
      <h3>Para continuar a conta</h3>
      <div className="cc-tiles">
        <LockedTile titulo="Equilíbrio do mês" texto={PREVIA.equilibrio.texto} />
        <LockedTile titulo="Retorno por hora" texto={PREVIA.hora.texto} />
        <LockedTile titulo="Meta do mês" texto={PREVIA.meta.texto} />
      </div>
      <p className="cc-ex">{T.exemploFicticio}</p>
      <UnlockBox from="calc-resultado" />
    </section>
  )
}

export function Resultado() {
  const { id } = useParams()
  const nav = useNavigate()
  const { doc, ready } = useCalc()
  const owned = useOwned()
  const c = contaDe(id)
  if (!ready) return <CalcLayout title={T.nome}><p className="cc-lead" role="status">Carregando...</p></CalcLayout>
  if (!c) return <Navigate to={BASE} replace />
  const r = calcular(c, doc.precos)
  const pre = r.ok && r.c !== null && c.precoCents ? precoRes(c.precoCents, r.c, r.K, r.L, c.taxaPct, r.s) : null
  const edit = podeEditar(c)
  return (
    <CalcLayout title={T.nome} back={BASE}>
      {c.estado === 'rascunho' && (
        <p className="cc-warn">
          Esta conta é um rascunho. <Link to={`${BASE}/conta/${c.id}/${edit ? 1 : 3}`}>Continuar</Link>
        </p>
      )}
      <Cartao c={c} r={r} pre={pre} />
      <PassoAPasso c={c} r={r} />
      <div className="cc-actions">
        {edit && (
          <Link className="btn btn-open" to={`${BASE}/conta/${c.id}/1`}>
            Mudar os números
          </Link>
        )}
        <button className="btn btn-secondary" onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </button>
      </div>
      <ESe c={c} r={r} owned={owned} />
      {owned && <Sugestao c={c} r={r} />}
      <Auditoria c={c} owned={owned} />
      {!owned && <Previa />}
      {owned && (
        <div className="cc-actions">
          <button className="btn btn-secondary" disabled={!podeNova()} onClick={() => { const n = duplicarConta(c.id); if (n) nav(`${BASE}/conta/${n}/1`) }}>
            Duplicar esta conta
          </button>
          <Link className="btn btn-secondary" to={`${BASE}/mes`}>
            Ver o mês
          </Link>
        </div>
      )}
      {(owned || c.estado === 'rascunho') && (
        <button className="btn btn-link btn-block btn-quiet" onClick={() => { if (window.confirm('Apagar esta conta? Isso não tem volta.')) { apagarConta(c.id); nav(BASE) } }}>
          Apagar esta conta
        </button>
      )}
      <p className="cc-small">Valores calculados com a fórmula versão {c.fv}; premissa de perda do livro: {PREMISSAS.perdaPct[c.tipo]}%.</p>
    </CalcLayout>
  )
}
