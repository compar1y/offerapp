import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import * as G from '../../shared/game'
import { ITEM_BY_ID, type ItemId } from '../../shared/catalog'
import { Layout } from '../components/ui'
import { SealLink } from '../components/ToolCard'
import { ChallengesCard, ContaMetasCard, DailyGoalCard, MissionsCard, NextUnlockCard, FornadaEditor, Honest, IncentiveLine, LevelChip, NextStepCard, SkillTree, StreakLine, WeeklyPick } from '../components/Game'
import { Seal } from '../components/Seal'
import { gameDelEncomenda, gameDelFornada, gameEncomenda, gameEntregue, gameMetaEnc, gameRankSet, gameSeeExtra, titleOf, useGame } from '../lib/game'
import { RANK_ENABLED } from '../data/config'
import { CALC_ENABLED } from '../data/config'
import { RANK, rankText } from '../../shared/rank'
import { parseMoney, brl } from '../../shared/calc'
import { resumoMes } from '../../shared/calc-sync'
import { apagarVenda, openCalc, registrarVenda, useCalc } from '../calc/store'
import { rankBoard, rankJoin, rankLeave, rankScore, thisWeek, useRank } from '../lib/rank'
import { owns, useStore } from '../lib/store'
import { usePhotoUrl } from '../lib/photos'

const today = () => G.ymd(new Date())
const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
const stars = (n?: number) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '')

function Row({ to, icon, title, sub }: { to: string; icon: Parameters<typeof Seal>[0]['icon']; title: string; sub: string }) {
  return (
    <Link className="hub-row" to={to}>
      <Seal icon={icon} size={44} />
      <span>
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
      <span className="hub-go" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}

export function Fornada() {
  const st = useGame()
  const off = !st.config.gamificacao
  return (
    <Layout title="Minha fornada" back="/">
      {off ? (
        <div className="card">
          <p>O jogo está desligado. Você pode ligar de novo em Minha conta.</p>
        </div>
      ) : st.semPressao ? (
        <div className="card">
          <h2>Modo sem pressão ligado</h2>
          <p>Pontos, níveis e sequência estão escondidos. Seus selos, o Livro de Fornadas e o caderno de encomendas continuam aqui.</p>
        </div>
      ) : (
        <>
          <LevelChip />
          <IncentiveLine />
          <StreakLine />
          <NextStepCard />
          <MissionsCard />
          <NextUnlockCard />
          <DailyGoalCard />
          <ChallengesCard />
          <ContaMetasCard />
          <WeeklyPick />
          <SkillTree />
        </>
      )}
      <nav className="hub" aria-label="Minha fornada">
        {!st.semPressao && !off && <Row to="/fornada/pontos" icon="fornada" title="Meus pontos" sub="O extrato do que você marcou" />}
        <Row to="/fornada/selos" icon="aprendiz" title="Meus selos" sub={`${Object.keys(st.seals).length} conquistados`} />
        <Row to="/fornada/livro" icon="receita" title="Livro de Fornadas" sub={`${st.fornadas.length} ${st.fornadas.length === 1 ? 'fornada anotada' : 'fornadas anotadas'}`} />
        <Row to="/fornada/encomendas" icon="encomenda" title="Caderno de encomendas" sub="Só seu, sem conta de ganho" />
        <Row to="/fornada/mes" icon="desafio" title="Meu mês na cozinha" sub="Seus números do mês" />
        <Row to="/fornada/extras" icon="presente" title="Extras do app" sub="Liberados por progresso" />
        {G.showDiary(st) && CALC_ENABLED && <Row to="/fornada/vendas" icon="venda" title="Diário de vendas" sub="Só os números que você digita" />}
        {G.showRank(st) && RANK_ENABLED && <Row to="/fornada/ranking" icon="desafio" title="Ranking da semana" sub="Opcional e anônimo" />}
      </nav>
      <Honest text={G.GAME_TEXT.privacidade} />
    </Layout>
  )
}

export function Pontos() {
  const st = useGame()
  if (st.semPressao || !st.config.gamificacao) return <Navigate to="/fornada" replace />
  const d = today()
  const hoje = G.pfOnDay(st, d)
  const log = [...st.pfLog].reverse().slice(0, 80)
  return (
    <Layout title="Meus pontos" back="/fornada">
      <LevelChip />
      <Honest text={G.GAME_TEXT.pontos} />
      <p className="card">
        Hoje: <strong>{hoje} de {G.DAILY_CAP} PF</strong>. O limite diário é só para manter o ritmo calmo.
      </p>
      <h2 className="sec-title">Extrato</h2>
      {log.length === 0 ? (
        <p className="hint">{G.GAME_TEXT.extrato}</p>
      ) : (
        <ul className="xt">
          {log.map((e, i) => (
            <li key={`${e.d}-${e.k}-${i}`}>
              <span>
                {e.txt}
                <small>{br(e.d)}</small>
              </span>
              <strong>+{e.pf} PF</strong>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}

export function Selos() {
  const st = useGame()
  const store = useStore()
  const sp = st.semPressao
  const owned = (Object.keys(ITEM_BY_ID) as ItemId[]).filter((id) => owns(store, id) && id !== 'bump')
  const sect: { h: string; ids: string[] }[] = [
    ...(sp ? [] : [{ h: 'Níveis', ids: ['nivel:0', 'nivel:1', 'nivel:2', 'nivel:3'] }]),
    { h: 'Receitas que você fez', ids: owned.map((i) => `r:${i}`) },
    { h: 'Receita de casa', ids: owned.filter((i) => st.seals[`casa:${i}`]).map((i) => `casa:${i}`) },
    { h: 'Salvei a fornada', ids: G.SOCORRO_TIPOS.map((t) => `socorro:${t.id}`) },
    { h: 'Outros', ids: ['enc1', 'conta', 'conta5', 'venda1', 'var3', 'var5', 'var8', ...(sp ? [] : ['seq3', 'seq7', 'desafio1', 'desafio3'])] },
  ]
  const surpresas = G.hiddenSealIds().filter((id) => st.seals[id])
  return (
    <Layout title="Meus selos" back="/fornada">
      <p className="lead">Cada selo é um passo seu. Os cinzas ainda estão te esperando.</p>
      {sect.map((s) =>
        s.ids.length === 0 ? null : (
          <section key={s.h} aria-label={s.h}>
            <h2 className="sec-title">{s.h}</h2>
            <ul className="seals">
              {s.ids.map((id) => {
                const def = G.sealDef(id, titleOf)
                if (!def) return null
                const got = st.seals[id]
                return (
                  <li key={id} className={got ? 'seal-got' : 'seal-miss'}>
                    <Seal icon={def.icon} grey={!got} gold={def.gold} size={64} />
                    <strong>{def.name}</strong>
                    <small>{got ? `Em ${br(got)}` : def.how}</small>
                    {!got && (id === 'conta' || id === 'conta5') && <SealLink />}
                    <span className="sr-only">{got ? 'Conquistado' : 'Ainda não conquistado'}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        ),
      )}
      <section aria-label="Selos surpresa">
        <h2 className="sec-title">Selos surpresa</h2>
        {surpresas.length === 0 ? (
          <p className="hint pad">Existem selos surpresa. Eles só aparecem aqui quando você os conquista, sem dica, e nenhum deles exige pressa.</p>
        ) : (
          <>
            <p className="hint pad">Você descobriu {surpresas.length} {surpresas.length === 1 ? 'selo surpresa' : 'selos surpresa'}. Podem existir outros.</p>
            <ul className="seals">
              {surpresas.map((id) => {
                const def = G.sealDef(id, titleOf)
                if (!def) return null
                return (
                  <li key={id} className="seal-got">
                    <Seal icon={def.icon} gold={def.gold} size={64} />
                    <strong>{def.name}</strong>
                    <small>Em {br(st.seals[id])}</small>
                    <span className="sr-only">Conquistado</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </Layout>
  )
}

function FornadaCard({ f }: { f: G.Fornada }) {
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)
  const url = usePhotoUrl(f.id, f.foto)
  return (
    <li className="fcard">
      <div className="fcard-head">
        <strong>{titleOf(f.item)}</strong>
        <small>{br(f.d)}</small>
      </div>
      {f.nota ? <p className="fcard-stars" aria-label={`Nota ${f.nota} de 5`}>{stars(f.nota)}</p> : null}
      {f.texto && <p>{f.texto}</p>}
      {url && <img className="fe-img" src={url} alt="Foto da sua fornada" />}
      {f.presente && <span className="tag">De presente</span>}
      <div className="two">
        <button className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Fechar' : 'Editar'}
        </button>
        {sure ? (
          <button className="btn btn-link" onClick={() => gameDelFornada(f.id)}>
            Sim, apagar
          </button>
        ) : (
          <button className="btn btn-link" onClick={() => setSure(true)}>
            Apagar
          </button>
        )}
      </div>
      {open && <FornadaEditor f={f} />}
    </li>
  )
}

export function Livro() {
  const st = useGame()
  const list = [...st.fornadas].reverse()
  return (
    <Layout title="Livro de Fornadas" back="/fornada">
      <p className="lead">Cada vez que você marca "Fiz essa", uma página nova aparece aqui para você anotar como ficou.</p>
      <Honest text={G.GAME_TEXT.privacidade} />
      {list.length === 0 ? (
        <div className="card">
          <p>Seu livro ainda está em branco. Abra um material e toque em "Fiz essa" quando fizer.</p>
          <Link className="btn btn-open btn-block" to="/">
            Ver meus materiais
          </Link>
        </div>
      ) : (
        <ul className="fornadas">
          {list.map((f) => (
            <FornadaCard key={f.id} f={f} />
          ))}
        </ul>
      )}
    </Layout>
  )
}

export function Encomendas() {
  const st = useGame()
  const [nome, setNome] = useState('')
  const [sabor, setSabor] = useState('')
  const [qtd, setQtd] = useState('1')
  const [entrega, setEntrega] = useState(today())
  const [meta, setMeta] = useState(st.metaEncomendas ? String(st.metaEncomendas) : '')
  const entregues = G.entreguesOf(st)
  function add(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    gameEncomenda({ nome: nome.trim(), sabor: sabor.trim(), qtd: Math.max(1, Number(qtd) || 1), entrega })
    setNome('')
    setSabor('')
    setQtd('1')
  }
  const sorted = [...st.encomendas].sort((a, b) => Number(a.entregue) - Number(b.entregue) || a.entrega.localeCompare(b.entrega))
  return (
    <Layout title="Caderno de encomendas" back="/fornada">
      <Honest text={G.GAME_TEXT.encomendas} />
      <form className="form card" onSubmit={add}>
        <h2>Nova encomenda</h2>
        <label htmlFor="enc-nome">Para quem (use só um apelido, como "Vizinha Ana")</label>
        <input id="enc-nome" value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} />
        <label htmlFor="enc-sabor">O que foi pedido</label>
        <input id="enc-sabor" value={sabor} maxLength={60} placeholder="Ex.: panetone de chocolate 500 g" onChange={(e) => setSabor(e.target.value)} />
        <div className="two">
          <div>
            <label htmlFor="enc-qtd">Quantidade</label>
            <input id="enc-qtd" type="number" min={1} inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </div>
          <div>
            <label htmlFor="enc-dia">Entrega</label>
            <input id="enc-dia" type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-open btn-block" disabled={!nome.trim()}>
          Anotar encomenda
        </button>
      </form>
      <section className="card" aria-label="Minha meta">
        <h2>Minha meta</h2>
        <p>Escolha quantas encomendas você quer entregar. A meta é sua; ninguém mais vê.</p>
        <div className="two">
          <div>
            <label htmlFor="enc-meta">Meta de entregas</label>
            <input id="enc-meta" type="number" min={1} inputMode="numeric" value={meta} onChange={(e) => setMeta(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={() => gameMetaEnc(Number(meta) || null)}>
            Salvar meta
          </button>
        </div>
        {st.metaEncomendas ? (
          <>
            <div className="ck-bar" role="progressbar" aria-valuemin={0} aria-valuemax={st.metaEncomendas} aria-valuenow={Math.min(entregues, st.metaEncomendas)} aria-label="Entregas da meta">
              <div style={{ width: `${Math.min(100, (entregues / st.metaEncomendas) * 100)}%` }} />
            </div>
            <p>
              Entregues: {entregues} de {st.metaEncomendas}
            </p>
          </>
        ) : (
          <p className="hint">Entregues até agora: {entregues}.</p>
        )}
      </section>
      <h2 className="sec-title">Minhas encomendas</h2>
      {sorted.length === 0 ? (
        <p className="hint">Nenhuma encomenda anotada ainda.</p>
      ) : (
        <ul className="fornadas">
          {sorted.map((e) => (
            <li key={e.id} className={`fcard${e.entregue ? ' fcard-done' : ''}`}>
              <div className="fcard-head">
                <strong>{e.nome}</strong>
                <small>Entrega {br(e.entrega)}</small>
              </div>
              <p>
                {e.qtd}x {e.sabor || 'panetone'}
              </p>
              <div className="two">
                <button className={`btn ${e.entregue ? 'btn-done' : 'btn-open'}`} aria-pressed={e.entregue} disabled={e.entregue} onClick={() => gameEntregue(e.id)}>
                  {e.entregue ? 'Entregue ✓' : 'Marcar entregue'}
                </button>
                <button className="btn btn-link" onClick={() => gameDelEncomenda(e.id)}>
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}

export function Mes() {
  const st = useGame()
  const [ym, setYm] = useState(today().slice(0, 7))
  const v = G.monthView(st, ym)
  const shift = (n: number) => {
    const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1)
    setYm(G.ymd(d).slice(0, 7))
  }
  const now = today().slice(0, 7)
  return (
    <Layout title="Meu mês na cozinha" back="/fornada">
      <div className="month-nav">
        <button className="btn btn-secondary" aria-label="Mês anterior" onClick={() => shift(-1)}>
          ‹
        </button>
        <strong>
          {G.MONTHS[Number(ym.slice(5, 7)) - 1]} de {ym.slice(0, 4)}
        </strong>
        <button className="btn btn-secondary" aria-label="Próximo mês" disabled={ym >= now} onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <p className="lead">{v.texto}</p>
      <ul className="stats">
        <li>
          <strong>{v.receitas}</strong>
          <span>receitas diferentes</span>
        </li>
        <li>
          <strong>{v.fornadas}</strong>
          <span>fornadas marcadas</span>
        </li>
        <li>
          <strong>{v.anotadas}</strong>
          <span>com anotação ou foto</span>
        </li>
        <li>
          <strong>{v.selos}</strong>
          <span>selos novos</span>
        </li>
        {!st.semPressao && (
          <li>
            <strong>{G.levelView(st.pf, st.level).name}</strong>
            <span>seu nível agora</span>
          </li>
        )}
      </ul>
      <Honest text="Números do seu próprio uso, calculados neste aparelho. Nada aqui é meta de venda." />
    </Layout>
  )
}

export function Extras() {
  const st = useGame()
  return (
    <Layout title="Extras do app" back="/fornada">
      <Honest text={G.GAME_TEXT.extras} />
      <NextUnlockCard />
      <ul className="extras">
        {G.EXTRAS.map((e) => {
          const ok = G.extraUnlocked(e, st)
          return (
            <li key={e.id} className={ok ? 'extra-on' : 'extra-off'}>
              <span className="tag">{e.kind}</span>
              <strong>{e.title}</strong>
              <span className="tag tag-soft">Extra do app, liberado por progresso</span>
              {ok ? (
                <>
                  <small>{G.extraReason(e)}</small>
                  <Link className="btn btn-open" to={`/fornada/extras/${e.id}`}>
                    Ler agora
                  </Link>
                </>
              ) : (
                <small>{G.reqRule(e)}</small>
              )}
            </li>
          )
        })}
      </ul>
    </Layout>
  )
}

export function ExtraView() {
  const { id } = useParams()
  const st = useGame()
  const e = G.EXTRAS.find((x) => x.id === id)
  const ok = !!e && G.extraUnlocked(e, st)
  const seen = !!e && st.extrasVistos.includes(e.id)
  useEffect(() => {
    if (e && ok && !seen) gameSeeExtra(e.id)
  }, [e, ok, seen])
  if (!e || !ok) return <Navigate to="/fornada/extras" replace />
  return (
    <Layout title="Extra do app" back="/fornada/extras">
      <span className="tag">Extra do app</span>
      <h1 className="h1">{e.title}</h1>
      <p className="hint">{G.GAME_TEXT.extras}</p>
      {e.blocks.map((b) => (
        <section key={b.h} className="card">
          <h2>{b.h}</h2>
          {b.p && <p>{b.p}</p>}
          {b.ul && (
            <ul className="bullets">
              {b.ul.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </Layout>
  )
}

// ---------------------------------------------------------------- Diário de vendas: só números que a cliente digita
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function Vendas() {
  const st = useGame()
  const store = useStore()
  const cs = useCalc()
  const email = store.session?.email ?? ''
  const hoje = today()
  const [data, setData] = useState(hoje)
  const [produto, setProduto] = useState('')
  const [qtd, setQtd] = useState('1')
  const [valor, setValor] = useState('')
  const [msg, setMsg] = useState('')
  const [sure, setSure] = useState('')
  useEffect(() => {
    if (email) void openCalc(email)
  }, [email])
  if (!G.showDiary(st) || !CALC_ENABLED) return <Navigate to="/fornada" replace />
  const ym = hoje.slice(0, 7)
  const mes = resumoMes(cs.doc.vendas, ym)
  const sincroniza = owns(store, 'calculadora') && !cs.meta.syncOff
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const q = Number(qtd.replace(',', '.'))
    const v = parseMoney(valor)
    if (!produto.trim()) return setMsg('Escreva o produto vendido.')
    if (!Number.isInteger(q) || q < 1) return setMsg('A quantidade precisa ser um número inteiro, de 1 para cima.')
    if (v === null) return setMsg('Digite o valor recebido, por exemplo 45,90.')
    if (data > hoje) return setMsg('A data não pode ser no futuro.')
    const r = registrarVenda({ data, produto, qtd: q, valorCents: v })
    if (!r.ok) return setMsg(r.erro)
    setMsg('Venda anotada.')
    setProduto('')
    setQtd('1')
    setValor('')
  }
  return (
    <Layout title="Diário de vendas" back="/fornada">
      <p className="lead">Anote o que você vendeu: produto, quantidade, valor e data. Tudo digitado por você.</p>
      <Honest text="O app só soma o que você anotou. Não estima, não compara e não promete ganho. Ele não sabe seus custos aqui: para isso, use a Conta da Fornada." />
      <form className="game-card form" onSubmit={enviar} aria-label="Anotar uma venda">
        <label>
          Produto
          <input className="field" value={produto} maxLength={60} onChange={(e) => setProduto(e.target.value)} placeholder="Ex.: panetone trufado 500 g" />
        </label>
        <div className="two">
          <label>
            Quantidade
            <input className="field" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </label>
          <label>
            Valor recebido (R$)
            <input className="field" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="45,90" />
          </label>
        </div>
        <label>
          Data
          <input className="field" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} />
        </label>
        <button className="btn btn-open btn-block" type="submit">
          Anotar venda
        </button>
        {msg && (
          <p role="status" className="hint">
            {msg}
          </p>
        )}
      </form>
      <section className="game-card" aria-label={`Total de ${MESES[Number(ym.slice(5)) - 1]}`}>
        <h2>Em {MESES[Number(ym.slice(5)) - 1]}</h2>
        {mes.vendas === 0 ? (
          <p>Nenhuma venda anotada neste mês.</p>
        ) : (
          <p>
            <strong>{brl(mes.totalCents)}</strong> em {mes.vendas} {mes.vendas === 1 ? 'venda' : 'vendas'}, {mes.unidades} {mes.unidades === 1 ? 'unidade' : 'unidades'}.
          </p>
        )}
        <p className="hint">É a soma só dos valores que você digitou. Nada é estimado.</p>
      </section>
      <section aria-label="Vendas anotadas">
        <h2 className="sec-title">Vendas anotadas</h2>
        {cs.doc.vendas.length === 0 ? (
          <p className="hint pad">Quando você anotar, a lista aparece aqui.</p>
        ) : (
          <ul className="sales">
            {cs.doc.vendas.slice(0, 60).map((v) => (
              <li key={v.id}>
                <span>
                  <strong>{v.produto}</strong>
                  <small>
                    {br(v.data)} · {v.qtd} {v.qtd === 1 ? 'unidade' : 'unidades'} · {brl(v.valorCents)}
                  </small>
                </span>
                {sure === v.id ? (
                  <span className="sale-del">
                    <button className="btn btn-open" onClick={() => (apagarVenda(v.id), setSure(''))}>
                      Apagar
                    </button>
                    <button className="btn btn-secondary" onClick={() => setSure('')}>
                      Não
                    </button>
                  </span>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setSure(v.id)} aria-label={`Apagar a venda de ${v.produto} em ${br(v.data)}`}>
                    Apagar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="hint pad">{sincroniza ? 'O diário fica neste aparelho e também na sua conta, junto com a Conta da Fornada (Seus dados mostra a sincronização).' : 'O diário fica só neste aparelho. Com a Conta da Fornada desbloqueada, ele acompanha você em outro celular.'} Apagar os dados da Conta da Fornada também apaga o diário.</p>
    </Layout>
  )
}

// ---------------------------------------------------------------- Ranking semanal anônimo (opcional)
export function Ranking() {
  const st = useGame()
  const { board, state, msg } = useRank()
  const [sure, setSure] = useState(false)
  const [info, setInfo] = useState('')
  const on = !!st.rank?.on
  useEffect(() => {
    if (!RANK_ENABLED || !G.showRank(st)) return
    void (async () => {
      const b = on ? await rankScore(G.weeklyPf(st, today()), thisWeek()) : await rankBoard()
      if (!b) return
      if (on && !b.joined) gameRankSet(null) // saiu em outro aparelho
      if (!on && b.joined && b.apelido) gameRankSet(b.apelido) // entrou em outro aparelho
    })()
    // só ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!RANK_ENABLED || !G.showRank(st)) return <Navigate to="/fornada" replace />
  const entrar = async () => {
    setInfo('')
    const b = await rankJoin()
    if (b?.apelido) {
      gameRankSet(b.apelido)
      setInfo(`Você entrou como ${b.apelido}.`)
    }
  }
  const sair = async () => {
    const ok = await rankLeave()
    setSure(false)
    if (ok) {
      gameRankSet(null)
      setInfo('Você saiu do ranking e seu apelido e seus PF foram apagados do servidor.')
    }
  }
  const min = board?.min ?? RANK.minDefault
  return (
    <Layout title={rankText.titulo} back="/fornada">
      <Honest text={rankText.explica} />
      {state === 'loading' && !board && <p className="hint pad">Carregando…</p>}
      {msg && (
        <p role="status" className="hint pad">
          {msg}
        </p>
      )}
      {!on ? (
        <section className="game-card" aria-label="Entrar no ranking">
          <h2>Quer participar?</h2>
          <p>{rankText.guardado}</p>
          {board && <p className="hint">Hoje há {board.participants} {board.participants === 1 ? 'participante' : 'participantes'}. A lista aparece com {min} ou mais.</p>}
          <button className="btn btn-open btn-block" onClick={() => void entrar()} disabled={state === 'loading'}>
            Entrar com um apelido gerado
          </button>
        </section>
      ) : (
        <>
          <section className="game-card" aria-label="Meu apelido">
            <p className="next-k">Você está como</p>
            <h2>{st.rank?.apelido}</h2>
            <p>Seus PF desta semana: <strong>{G.weeklyPf(st, today())}</strong></p>
          </section>
          {board && !board.ready && (
            <section className="game-card" aria-label="Lista ainda não disponível">
              <h3>{rankText.espera(Math.max(1, board.min - board.participants))}</h3>
              <p>{rankText.esperaTxt}</p>
            </section>
          )}
          {board?.ready && (
            <section className="game-card" aria-label="Top 10 da semana">
              <h3>Top {RANK.top} da semana</h3>
              <ol className="rank">
                {board.top.map((r) => (
                  <li key={r.apelido} className={r.me ? 'rank-me' : ''}>
                    <span className="rank-pos">{r.pos}º</span>
                    <span className="rank-nick">
                      {r.apelido}
                      {r.me && <small> (você)</small>}
                    </span>
                    <span className="rank-pf">{r.pf} PF</span>
                  </li>
                ))}
              </ol>
              {board.me && !board.top.some((r) => r.me) && (
                <p>
                  Sua posição: <strong>{board.me.pos}º</strong> de {board.participants}, com {board.me.pf} PF.
                </p>
              )}
              <p className="hint">Participantes reais, {board.participants} nesta semana. Recomeça toda segunda-feira.</p>
            </section>
          )}
          {sure ? (
            <div role="alertdialog" aria-label="Confirmar sair do ranking" className="confirm">
              <p>Seu apelido e seus PF da semana serão apagados do servidor. Seus pontos no app continuam.</p>
              <div className="two">
                <button className="btn btn-open" onClick={() => void sair()}>
                  Sim, sair e apagar
                </button>
                <button className="btn btn-secondary" onClick={() => setSure(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary btn-block" onClick={() => setSure(true)}>
              {rankText.sair}
            </button>
          )}
        </>
      )}
      {info && (
        <p role="status" className="hint pad">
          {info}
        </p>
      )}
      <p className="hint pad">Os PF só contam ações marcadas por você, com teto diário. Sem prêmio e sem promessa de nada.</p>
    </Layout>
  )
}
