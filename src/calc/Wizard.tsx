// Conta da Fornada: os 3 passos (ingredientes e preços; forno, embalagem e perda; preço de venda e tempo).
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PREMISSAS, brl, calcular, custoLinhaIng, ehProprio, INGREDIENTES_BASE, medidaPadrao, nomeIng, novoId, parseQtd, precosExemplo, type Conta, type LinhaIng, type Medida, type PrecoIng, type Resultado, type UnidadeBase } from '../../shared/calc'
import { BASE, CalcLayout, ExTag, MoneyField, NumField } from './ui'
import { apagarConta, concluir, contaDe, patchConta, podeEditar, setPreco, usarExemplos, useCalc } from './store'
import { ingredientesDaConta, usosDe } from './helpers'
import { MEDIDA, T } from './strings'

const PACOTE: Record<UnidadeBase, { un: string; mult: number }[]> = {
  g: [
    { un: 'g', mult: 1 },
    { un: 'kg', mult: 1000 },
  ],
  ml: [
    { un: 'ml', mult: 1 },
    { un: 'litro', mult: 1000 },
  ],
  un: [
    { un: 'un', mult: 1 },
    { un: 'dúzia', mult: 12 },
  ],
}

export function IngRow({ conta, ing, ro }: { conta?: Conta; ing: string; ro: boolean }) {
  const { doc, rev } = useCalc()
  const p: PrecoIng | undefined = doc.precos[ing]
  const unidade: UnidadeBase = p?.unidade ?? (medidaPadrao(ing, doc.precos) as UnidadeBase)
  const opts = PACOTE[unidade] ?? PACOTE.g
  const preenchido = !!p && p.qtdPacote > 0
  const [mult, setMult] = useState(() => (preenchido && p.qtdPacote >= 1000 && unidade !== 'un' && p.qtdPacote % 1000 === 0 ? 1000 : 1))
  const [preco, setPrecoTxt] = useState<number | null>(preenchido ? p.precoCents : null)
  const [qtd, setQtd] = useState<number | null>(preenchido ? p.qtdPacote / mult : null)
  const [lastRev, setLastRev] = useState(rev)
  if (rev !== lastRev) {
    // um valor mudou por fora (ex.: "preços de exemplo"): relê
    setLastRev(rev)
    const pp = doc.precos[ing]
    const ok = !!pp && pp.qtdPacote > 0
    const m = ok && pp.qtdPacote >= 1000 && unidade !== 'un' && pp.qtdPacote % 1000 === 0 ? 1000 : 1
    setMult(m)
    setPrecoTxt(ok ? pp.precoCents : null)
    setQtd(ok ? pp.qtdPacote / m : null)
  }
  const commit = (pr: number | null, q: number | null, m: number) => {
    if (pr !== null && q !== null && q > 0) setPreco(ing, { precoCents: pr, qtdPacote: Math.round(q * m * 1000) / 1000, unidade, ...(p?.nome ? { nome: p.nome } : {}), ...(p?.embalagem ? { embalagem: p.embalagem } : {}) })
  }
  const ex = p?.fonte === 'exemplo'
  const uso = conta ? usosDe(conta, ing) : ''
  return (
    <div className="cc-ing">
      <div className="cc-ing-h">
        <strong>{nomeIng(ing, doc.precos)}</strong>
        {uso && <span className="cc-uso">usa {uso}</span>}
        <ExTag on={ex} />
      </div>
      <div className="cc-row3">
        <MoneyField label="Paguei" cents={preco} disabled={ro} example={ex} onCommit={(c) => { setPrecoTxt(c); commit(c, qtd, mult) }} onClear={() => setPrecoTxt(null)} placeholder="ex.: 7,00" />
        <NumField label="no pacote de" value={qtd} disabled={ro} example={ex} onCommit={(n) => { setQtd(n); commit(preco, n, mult) }} onClear={() => setQtd(null)} placeholder="ex.: 1" />
        <div className="cc-field">
          <label htmlFor={`u-${ing}`}>unidade</label>
          <select id={`u-${ing}`} value={mult} disabled={ro} onChange={(e) => { const m = Number(e.target.value); setMult(m); commit(preco, qtd, m) }}>
            {opts.map((o) => (
              <option key={o.un} value={o.mult}>
                {o.un}
              </option>
            ))}
          </select>
        </div>
      </div>
      {ex && <small className="cc-exn">{T.precoExemplo}</small>}
      {!p?.qtdPacote && !ex && <small className="cc-exn">Digite o preço e o tamanho do pacote que você compra.</small>}
    </div>
  )
}

function motivoTxt(m: string | undefined): string {
  if (m === 'sem-preco') return 'falta o preço'
  if (m === 'sem-conversao') return 'não sei converter esta medida para o pacote; use g, ml ou un'
  if (m === 'qtd-invalida') return 'digite a quantidade'
  return ''
}

function Quantidades({ conta, r, ro }: { conta: Conta; r: Resultado; ro: boolean }) {
  const { doc } = useCalc()
  const [novo, setNovo] = useState('')
  const [nomeProprio, setNomeProprio] = useState('')
  const [unProprio, setUnProprio] = useState<UnidadeBase>('g')
  const porId = new Map(r.linhas.map((l) => [l.linha.id, l]))
  const edit = (id: string, patch: Partial<LinhaIng>) => patchConta(conta.id, (c) => ({ linhas: c.linhas.map((l) => (l.id === id && l.k === 'i' ? { ...l, ...patch } : l)) }))
  const sel = [...INGREDIENTES_BASE.map((i) => ({ id: i.id, nome: i.nome })), ...Object.entries(doc.precos).filter(([k]) => ehProprio(k)).map(([k, v]) => ({ id: k, nome: v.nome ?? k }))]
  function adicionar() {
    let ing = novo
    if (novo === '__novo') {
      const nome = nomeProprio.trim().slice(0, 60)
      if (!nome) return
      ing = `x_${novoId('i')}`
      setPreco(ing, { precoCents: 0, qtdPacote: 0, unidade: unProprio, nome })
      setNomeProprio('')
    }
    if (!ing) return
    const med: Medida = (novo === '__novo' ? unProprio : medidaPadrao(ing, doc.precos)) as Medida
    patchConta(conta.id, (c) => ({ linhas: [...c.linhas, { id: novoId('l'), k: 'i', ing, qtd: '', med }] }))
    setNovo('')
  }
  return (
    <details className="cc-det">
      <summary>Ver e mudar as quantidades da receita</summary>
      <p className="cc-small">As quantidades vêm do livro. Se na sua cozinha a receita leva outra quantidade, troque aqui. A conta usa o que estiver aqui.</p>
      {conta.linhas.map((l) => {
        const lc = porId.get(l.id)
        if (l.k === 'b')
          return (
            <div className="cc-qrow" key={l.id}>
              <span>
                Receita-base nº {String(l.receita).padStart(3, '0')}: <b>{l.un}</b> un
              </span>
            </div>
          )
        return (
          <div className="cc-qrow" key={l.id}>
            <span className="cc-qname">
              {l.neg ? 'Tira: ' : ''}
              {nomeIng(l.ing, doc.precos)}
              {lc?.motivo && <small className="cc-err"> {motivoTxt(lc.motivo)}</small>}
            </span>
            <input aria-label={`Quantidade de ${nomeIng(l.ing, doc.precos)}`} inputMode="decimal" disabled={ro} defaultValue={String(l.qtd).replace('.', ',')} onChange={(e) => { const q = parseQtd(e.target.value); edit(l.id, { qtd: Number.isFinite(q) ? (e.target.value.includes('/') ? e.target.value.trim() : q) : '' }) }} />
            <select aria-label={`Medida de ${nomeIng(l.ing, doc.precos)}`} disabled={ro} value={l.med} onChange={(e) => edit(l.id, { med: e.target.value as Medida })}>
              {Object.entries(MEDIDA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {!ro && (
              <button className="cc-x" aria-label={`Tirar ${nomeIng(l.ing, doc.precos)} da conta`} onClick={() => patchConta(conta.id, (c) => ({ linhas: c.linhas.filter((x) => x.id !== l.id) }))}>
                ✕
              </button>
            )}
          </div>
        )
      })}
      {!ro && (
        <div className="cc-add">
          <label htmlFor="cc-novo">Adicionar um ingrediente</label>
          <select id="cc-novo" value={novo} onChange={(e) => setNovo(e.target.value)}>
            <option value="">Escolha</option>
            {sel.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
            <option value="__novo">Outro (digitar o nome)</option>
          </select>
          {novo === '__novo' && (
            <div className="cc-row2">
              <div className="cc-field">
                <label htmlFor="cc-nome-ing">Nome</label>
                <input id="cc-nome-ing" value={nomeProprio} maxLength={60} onChange={(e) => setNomeProprio(e.target.value)} />
              </div>
              <div className="cc-field">
                <label htmlFor="cc-un-ing">Comprado em</label>
                <select id="cc-un-ing" value={unProprio} onChange={(e) => setUnProprio(e.target.value as UnidadeBase)}>
                  <option value="g">gramas</option>
                  <option value="ml">mililitros</option>
                  <option value="un">unidades</option>
                </select>
              </div>
            </div>
          )}
          <button className="btn btn-secondary btn-block" disabled={!novo || (novo === '__novo' && !nomeProprio.trim())} onClick={adicionar}>
            + Adicionar
          </button>
        </div>
      )}
    </details>
  )
}

function Passo1({ conta, r, ro }: { conta: Conta; r: Resultado; ro: boolean }) {
  const { doc } = useCalc()
  const ings = useMemo(() => ingredientesDaConta(conta), [conta])
  const soma = r.linhas.reduce((s, l) => s + (l.cents ?? 0), 0)
  const falta = r.incompletos.length
  return (
    <>
      <h2 className="cc-h">1. Ingredientes e preços</h2>
      <p className="cc-lead">Digite quanto você pagou em cada ingrediente. As quantidades já vêm da receita.</p>
      {conta.receita === null && !ro && (
        <div className="cc-field">
          <label htmlFor="cc-nome">Nome da receita</label>
          <input id="cc-nome" value={conta.nome} maxLength={120} onChange={(e) => patchConta(conta.id, { nome: e.target.value })} />
        </div>
      )}
      <div className="cc-row2">
        <NumField label="A receita rende" value={conta.rende} min={1} max={10000} suffix="un" disabled={ro} onCommit={(n) => patchConta(conta.id, { rende: n })} />
        <NumField label="Vou fazer" value={conta.fator} min={0.1} max={100} suffix="x" disabled={ro} onCommit={(n) => patchConta(conta.id, { fator: n })} hint="2 = o dobro" />
      </div>
      {!ro && (
        <>
          <button className="btn btn-secondary btn-block" onClick={() => usarExemplos(ings, precosExemplo(), conta.id)}>
            {T.usarExemplos}
          </button>
          <p className="cc-small">{T.usarExemplosNota}</p>
        </>
      )}
      {ings.map((i) => (
        <IngRow key={i} conta={conta} ing={i} ro={ro} />
      ))}
      <Quantidades conta={conta} r={r} ro={ro} />
      <div className="cc-sum" role="status">
        <span>Ingredientes até aqui{falta ? ` (faltam ${falta})` : ''}</span>
        <b>{brl(r.linhas.length ? Math.round(soma * conta.fator) : 0)}</b>
      </div>
      {falta > 0 && <p className="cc-warn">Falta o preço de: {r.incompletos.map((i) => nomeIng(i, doc.precos)).join(', ')}.</p>}
    </>
  )
}

function Passo2({ conta, ro }: { conta: Conta; ro: boolean }) {
  const g = conta.gas
  return (
    <>
      <h2 className="cc-h">2. Forno, embalagem e perda</h2>
      <p className="cc-lead">Os custos que não são ingrediente, mas fazem parte da conta.</p>
      <section className="cc-card">
        <h3>
          Gás ou energia do forno <ExTag on={g.exemplo} />
        </h3>
        <MoneyField label="Quanto custa cada fornada" cents={g.porFornadaCents} disabled={ro} example={g.exemplo} onCommit={(c) => patchConta(conta.id, { gas: { ...g, porFornadaCents: c, exemplo: false } })} hint="Gás ou luz do forno ligado o tempo da receita" />
        <NumField label="Quantas unidades cabem por fornada" value={g.cabem} min={1} max={1000} disabled={ro} example={g.exemplo} onCommit={(n) => patchConta(conta.id, { gas: { ...g, cabem: Math.max(1, Math.round(n)), exemplo: false } })} />
        <label className="cc-check">
          <input type="checkbox" checked={g.fracionada} disabled={ro} onChange={(e) => patchConta(conta.id, { gas: { ...g, fracionada: e.target.checked, exemplo: false } })} />
          <span>Divido o gás pela quantidade que assei (forno que não enche)</span>
        </label>
        {g.exemplo && <small className="cc-exn">{T.precoExemplo}</small>}
      </section>
      <section className="cc-card">
        <h3>
          Embalagem <ExTag on={conta.embExemplo} />
        </h3>
        <MoneyField label="Embalagem de cada unidade" cents={conta.embUnCents} disabled={ro} example={conta.embExemplo} onCommit={(c) => patchConta(conta.id, { embUnCents: c, embExemplo: false })} hint="Caixa, fita, etiqueta, forma de papel" />
        {conta.embExemplo && <small className="cc-exn">{T.precoExemplo}</small>}
      </section>
      <section className="cc-card">
        <h3>Perda</h3>
        <NumField label="O que se perde (queimou, murchou, quebrou)" value={conta.perdaPct} max={PREMISSAS.perdaPct.G * 18} suffix="%" disabled={ro} onCommit={(n) => patchConta(conta.id, { perdaPct: Math.min(90, n) })} hint={`O livro usa ${conta.tipo === 'M' ? PREMISSAS.perdaPct.M : PREMISSAS.perdaPct.G}% como exemplo. Use a sua.`} />
        <NumField label="Taxa de cartão ou aplicativo sobre a venda" value={conta.taxaPct} max={50} suffix="%" disabled={ro} onCommit={(n) => patchConta(conta.id, { taxaPct: n })} hint="0 se você vende em dinheiro ou Pix sem taxa" />
      </section>
    </>
  )
}

function Passo3({ conta, r, ro }: { conta: Conta; r: Resultado; ro: boolean }) {
  return (
    <>
      <h2 className="cc-h">3. Preço de venda e tempo</h2>
      <p className="cc-lead">O preço que você cobra hoje, ou o que pensa em cobrar. A conta mostra quanto sobra.</p>
      <section className="cc-card">
        <MoneyField label="Preço que você cobra por unidade" cents={conta.precoCents} disabled={ro} onCommit={(c) => patchConta(conta.id, { precoCents: c })} onClear={() => patchConta(conta.id, { precoCents: null })} placeholder="ex.: 40,00" />
        <NumField label="Horas de trabalho em cada fornada" value={conta.horas} max={100} suffix="h" disabled={ro} onCommit={(n) => patchConta(conta.id, { horas: n })} hint="Do preparo à embalagem. Pode deixar 0." />
        <MoneyField label="Valor da sua hora" cents={conta.valorHoraCents} disabled={ro} onCommit={(c) => patchConta(conta.id, { valorHoraCents: c })} hint="Quanto vale uma hora do seu trabalho. 0 = não contar." />
        <MoneyField label="Outros custos da fornada" cents={conta.outrosCents} disabled={ro} onCommit={(c) => patchConta(conta.id, { outrosCents: c })} hint="Algo que só entra nesta receita (entrega, enfeite)" />
      </section>
      <details className="cc-det">
        <summary>Taxa fixa e frete por pedido</summary>
        <MoneyField label="Taxa fixa por pedido" cents={conta.taxaFixaCents} disabled={ro} onCommit={(c) => patchConta(conta.id, { taxaFixaCents: c })} />
        <MoneyField label="Frete por pedido" cents={conta.freteCents} disabled={ro} onCommit={(c) => patchConta(conta.id, { freteCents: c })} />
        <NumField label="Unidades em cada pedido" value={conta.unPorPedido} min={1} max={1000} disabled={ro} onCommit={(n) => patchConta(conta.id, { unPorPedido: Math.max(1, Math.round(n)) })} />
      </details>
      <div className="cc-sum" role="status">
        <span>Custo por unidade até aqui</span>
        <b>{r.c !== null ? brl(r.c) : '—'}</b>
      </div>
    </>
  )
}

export function Wizard() {
  const { id, passo } = useParams()
  const n = Number(passo)
  const nav = useNavigate()
  const { doc, ready } = useCalc()
  const conta = contaDe(id)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (!ready) return <CalcLayout title={T.nome}><p className="cc-lead" role="status">Carregando...</p></CalcLayout>
  if (!conta || ![1, 2, 3].includes(n)) return <Navigate to={BASE} replace />
  const ro = !podeEditar(conta)
  const r = calcular(conta, doc.precos)
  void custoLinhaIng
  const last = n === 3
  async function fim() {
    if (!conta) return
    setBusy(true)
    setMsg('')
    const c = await concluir(conta.id)
    setBusy(false)
    if (c.ok) nav(`${BASE}/conta/${conta.id}`)
    else if (c.gate) nav(`${BASE}/nova?gate=1`)
    else setMsg(c.erro)
  }
  const concluida = conta.estado === 'concluida'
  return (
    <CalcLayout title={conta.nome.length > 26 ? `${conta.nome.slice(0, 25)}…` : conta.nome} back={concluida ? `${BASE}/conta/${conta.id}` : BASE}>
      <div className="cc-steps" aria-label={`Passo ${n} de 3`}>
        {[1, 2, 3].map((i) => (
          <Link key={i} to={`${BASE}/conta/${conta.id}/${i}`} className={`cc-dot${i === n ? ' on' : ''}${i < n ? ' done' : ''}`} aria-current={i === n ? 'step' : undefined}>
            {i}
          </Link>
        ))}
        <span className="cc-steps-txt">{n} de 3</span>
      </div>
      {ro && <p className="cc-warn">Esta conta está só para ver. Para mudar, desbloqueie a Conta da Fornada completa.</p>}
      {n === 1 && <Passo1 conta={conta} r={r} ro={ro} />}
      {n === 2 && <Passo2 conta={conta} ro={ro} />}
      {n === 3 && <Passo3 conta={conta} r={r} ro={ro} />}
      {msg && (
        <p className="cc-err" role="alert">
          {msg}
        </p>
      )}
      <div className="cc-foot">
        {n > 1 && (
          <Link className="btn btn-secondary" to={`${BASE}/conta/${conta.id}/${n - 1}`}>
            Voltar
          </Link>
        )}
        {!last ? (
          <Link className="btn btn-open" to={`${BASE}/conta/${conta.id}/${n + 1}`}>
            Próximo
          </Link>
        ) : concluida || ro ? (
          <Link className="btn btn-open" to={`${BASE}/conta/${conta.id}`}>
            Ver a conta
          </Link>
        ) : (
          <button className="btn btn-open" disabled={busy || !r.ok || !conta.precoCents} onClick={fim}>
            {busy ? 'Guardando...' : 'Concluir e guardar a minha conta'}
          </button>
        )}
      </div>
      {!concluida && !ro && (
        <button className="btn btn-link btn-block btn-quiet" onClick={() => { apagarConta(conta.id); nav(BASE) }}>
          Descartar este rascunho
        </button>
      )}
    </CalcLayout>
  )
}
