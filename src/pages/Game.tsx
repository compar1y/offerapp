import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import * as G from '../../shared/game'
import { ITEM_BY_ID, type ItemId } from '../../shared/catalog'
import { Layout } from '../components/ui'
import { SealLink } from '../components/ToolCard'
import { ChallengesCard, DailyGoalCard, FornadaEditor, Honest, IncentiveLine, LevelChip, NextStepCard, SkillTree, StreakLine, WeeklyPick } from '../components/Game'
import { Seal } from '../components/Seal'
import { gameDelEncomenda, gameDelFornada, gameEncomenda, gameEntregue, gameMetaEnc, gameSeeExtra, titleOf, useGame } from '../lib/game'
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
          <DailyGoalCard />
          <ChallengesCard />
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
    { h: 'Outros', ids: ['enc1', 'conta', 'presente', 'var3', 'var5', 'var8', ...(sp ? [] : ['seq3', 'seq7', 'desafio1', 'desafio3'])] },
  ]
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
      <ul className="extras">
        {G.EXTRAS.map((e) => {
          const ok = G.extraUnlocked(e, st.level, st.semPressao)
          const lv = G.LEVELS[e.level]
          return (
            <li key={e.id} className={ok ? 'extra-on' : 'extra-off'}>
              <span className="tag">{e.kind}</span>
              <strong>{e.title}</strong>
              {ok ? (
                <>
                  <small>{G.extraReason(e)}</small>
                  <Link className="btn btn-open" to={`/fornada/extras/${e.id}`}>
                    Ler agora
                  </Link>
                </>
              ) : (
                <small>Libera quando você chegar a {lv.name}.</small>
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
  const ok = !!e && G.extraUnlocked(e, st.level, st.semPressao)
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
