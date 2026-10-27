import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type ItemId } from '../../shared/catalog'
import * as G from '../../shared/game'
import { owns, useStore } from '../lib/store'
import { clearToast, gameAck, gameChecklist, gameCloseLevel, gameConta, gameDeletePhoto, gameDone, gameFav, gameGift, gameMeta, gameNote, gameSocorro, titleOf, useGame, useNextStep, useToast, useVisit, weekSuggestion } from '../lib/game'
import { usePhotoUrl } from '../lib/photos'
import { Seal } from './Seal'

const today = () => G.ymd(new Date())

export function Honest({ text }: { text: string }) {
  return <p className="honest">{text}</p>
}

export function ProgressRing({ pct, size = 48, label, children }: { pct: number; size?: number; label: string; children?: ReactNode }) {
  const r = 20
  const c = 2 * Math.PI * r
  return (
    <span className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r={r} className="ring-bg" />
        <circle cx="24" cy="24" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)} transform="rotate(-90 24 24)" />
      </svg>
      {children && <span className="ring-in">{children}</span>}
    </span>
  )
}

// chip de nível com a barra "faltam N PF para X". Some no modo sem pressão.
export function LevelChip({ compact = false }: { compact?: boolean }) {
  const st = useGame()
  if (st.semPressao || !st.config.gamificacao) return null
  const v = G.levelView(st.pf, st.level)
  const icons = ['aprendiz', 'fornada', 'confeiteira', 'mestra'] as const
  return (
    <div className={`lvl${compact ? ' lvl-compact' : ''}`} aria-label={`Nível ${v.name}, ${st.pf} Pontos de Fornada`}>
      <Seal icon={icons[v.idx]} size={compact ? 44 : 56} />
      <div className="lvl-body">
        <p className="lvl-name">
          <strong>{v.name}</strong>
          <span>{st.pf} PF</span>
        </p>
        <div className="lvl-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.pct} aria-label="Progresso até o próximo nível">
          <div className="lvl-fill" style={{ width: `${v.pct}%` }} />
        </div>
        <p className="lvl-next">{v.next ? `faltam ${v.next.faltam} PF para ${v.next.name}` : 'Você chegou ao último nível.'}</p>
      </div>
    </div>
  )
}

// mensagens curtas depois de uma ação (aria-live). No modo sem pressão só aparecem selos e confirmações, sem pontos.
export function GameToast() {
  const t = useToast()
  const st = useGame()
  useEffect(() => {
    if (!t.msgs.length) return
    const id = setTimeout(clearToast, 7000)
    return () => clearTimeout(id)
  }, [t.id, t.msgs.length])
  const msgs = st.semPressao ? t.msgs.filter((m) => /^(Selo conquistado|Salva|Primeira|Fornada|Anotado|Você calculou|Seus dados|Não consegui)/.test(m)) : t.msgs
  if (!msgs.length) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      <ul>
        {msgs.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <button className="toast-x" onClick={clearToast} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  )
}

export function LevelUpCard() {
  const st = useGame()
  if (st.semPressao || st.levelCard === null) return null
  const icons = ['aprendiz', 'fornada', 'confeiteira', 'mestra'] as const
  return (
    <section className="levelup" aria-label="Novo nível">
      <Seal icon={icons[st.levelCard]} size={64} />
      <div>
        <h2>{G.levelUpText(st.levelCard)}</h2>
        <button className="btn btn-open" onClick={gameCloseLevel}>
          Continuar
        </button>
      </div>
    </section>
  )
}

export function IncentiveLine() {
  const st = useGame()
  if (st.semPressao) return null
  return <p className="incentive">{G.incentiveOf(G.statsOf(st, today()), today())}</p>
}

export function StreakLine() {
  const st = useGame()
  if (st.semPressao || !st.config.sequencia) return null
  const v = G.streakView(st, today())
  return (
    <div className="streak">
      <Seal icon="sequencia" size={40} grey={v.dias === 0} />
      <div>
        <p>{v.texto}</p>
        <p className="hint">{G.GAME_TEXT.descanso}</p>
      </div>
    </div>
  )
}

// a bolinha vermelha vira UM próximo passo útil; este cartão diz o motivo
export function NextStepCard() {
  const { step, st } = useNextStep()
  useEffect(() => {
    if (step && st.ack !== step.key) gameAck(step.key) // ao abrir a tela, a bolinha some
  }, [step, st.ack])
  if (!step || st.semPressao) return null
  return (
    <section className="game-card next-step" aria-label="Seu próximo passo">
      <p className="next-k">Seu próximo passo</p>
      <p>{step.text}</p>
      <Link className="btn btn-open btn-block" to={step.to}>
        Abrir
      </Link>
    </section>
  )
}

export function DailyGoalCard() {
  const st = useGame()
  if (st.semPressao) return null
  const done = st.metaDia.d === today() && st.metaDia.feita
  return (
    <section className="game-card" aria-label="Meta do dia">
      <h3>Meta do dia</h3>
      <p>Hoje, só isto: {G.dailyGoalOf(today()).toLowerCase()}.</p>
      <button className={`btn btn-block ${done ? 'btn-done' : 'btn-secondary'}`} disabled={done} onClick={gameMeta}>
        {done ? 'Feito ✓' : 'Marcar como feito'}
      </button>
      <p className="hint">Pode ignorar sem perder nada.</p>
    </section>
  )
}

export function ChallengesCard() {
  const st = useGame()
  const hasBump = owns(useStore(), 'bump')
  if (st.semPressao) return null
  const w = G.weekKey(today())
  const items = st.challenges.semana === w ? st.challenges.itens : G.pickChallenges(w, hasBump)
  const feitos = st.challenges.semana === w ? st.challenges.feitos : []
  return (
    <section className="game-card" aria-label="Desafios da semana">
      <h3>Esta semana: 3 desafios pequenos. Escolha o seu.</h3>
      <ul className="chal">
        {items.map((id) => {
          const c = G.challengeById(id)!
          const on = feitos.includes(id)
          return (
            <li key={id} className={on ? 'chal-on' : ''}>
              <span className="chk" aria-hidden="true">
                {on ? '✓' : ''}
              </span>
              <span>
                {c.txt}
                <small className="sr-only">{on ? ' (feito)' : ' (ainda não feito)'}</small>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="hint">Os desafios se completam sozinhos quando você faz a ação no app. Sem prazo: o que não deu, troca na semana seguinte.</p>
    </section>
  )
}

export function WeeklyPick() {
  const st = useGame()
  useStore()
  const s = weekSuggestion()
  if (!s || st.semPressao) return null
  return (
    <section className="game-card" aria-label="Sugestão da semana">
      <span className="tag">Sugestão da semana</span>
      <h3>{titleOf(s.item)}</h3>
      <p>Sugestão {s.reason}. Continua disponível sempre.</p>
      <Link className="btn btn-open btn-block" to={`/produto/${s.item}`}>
        Abrir
      </Link>
    </section>
  )
}

export function SkillTree() {
  const st = useGame()
  if (st.semPressao) return null
  const best = [...G.BRANCHES].sort((a, b) => st.branch[b.id] - st.branch[a.id])[0]
  return (
    <section className="game-card" aria-label="Ramos de habilidade">
      <h3>Seus ramos</h3>
      <ul className="branches">
        {G.BRANCHES.map((b) => {
          const pts = st.branch[b.id]
          const t = G.branchTier(pts)
          const pct = t.next ? Math.min(100, Math.round((pts / t.next) * 100)) : 100
          return (
            <li key={b.id}>
              <ProgressRing pct={pct} size={44} label={`${b.name}: ${t.name}`}>
                {pts / 2}
              </ProgressRing>
              <span>
                <strong>{b.name}</strong>
                <small>{t.name}</small>
              </span>
            </li>
          )
        })}
      </ul>
      {st.branch[best.id] > 0 && <p className="hint">Seu ramo mais forte: {best.name}.</p>}
    </section>
  )
}

export function StarButton({ item }: { item: string }) {
  const st = useGame()
  const on = st.fav.includes(item)
  return (
    <button className={`star${on ? ' star-on' : ''}`} aria-pressed={on} aria-label={on ? 'Tirar das minhas favoritas' : 'Salvar nas minhas favoritas'} onClick={() => gameFav(item)}>
      <span aria-hidden="true">{on ? '★' : '☆'}</span>
      <span>{on ? 'Nas favoritas' : 'Favoritar'}</span>
    </button>
  )
}

export function IngredientChecklist({ item }: { item: string }) {
  const st = useGame()
  const [t, setT] = useState('')
  const ck = st.ingr[item] ?? { extra: [], marcados: [] }
  const all = G.checklistItems(ck)
  const n = all.filter((x) => ck.marcados.includes(x)).length
  return (
    <details className="game-details">
      <summary>
        Antes de começar: separe tudo{' '}
        <span className="pill">
          {n} de {all.length}
        </span>
      </summary>
      <ul className="ck-list">
        {all.map((x) => (
          <li key={x}>
            <label className="ck-row">
              <input type="checkbox" checked={ck.marcados.includes(x)} onChange={() => gameChecklist(item, { toggle: x })} />
              <span>{x}</span>
            </label>
            {ck.extra.includes(x) && (
              <button className="ck-del" aria-label={`Tirar ${x} da lista`} onClick={() => gameChecklist(item, { remove: x })}>
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="ck-add"
        onSubmit={(e) => {
          e.preventDefault()
          gameChecklist(item, { add: t })
          setT('')
        }}
      >
        <label htmlFor={`ck-${item}`} className="sr-only">
          Adicionar um ingrediente seu
        </label>
        <input id={`ck-${item}`} value={t} maxLength={60} placeholder="Adicionar ingrediente seu" onChange={(e) => setT(e.target.value)} />
        <button className="btn btn-secondary" disabled={!t.trim()}>
          Adicionar
        </button>
      </form>
      <div className="ck-bar" role="progressbar" aria-valuemin={0} aria-valuemax={all.length} aria-valuenow={n} aria-label="Pronta para começar">
        <div style={{ width: `${(n / all.length) * 100}%` }} />
      </div>
      <p className="hint">{n === all.length ? 'Tudo separado. Mãos à obra.' : 'A barra mostra o quanto você já separou.'}</p>
    </details>
  )
}

// "Como ficou?": nota, anotação curta e foto opcional (a foto fica só no aparelho)
export function FornadaEditor({ f }: { f: G.Fornada }) {
  const st = useGame()
  const [nota, setNota] = useState(f.nota ?? 0)
  const [texto, setTexto] = useState(f.texto ?? '')
  const [rev, setRev] = useState(0)
  const [saved, setSaved] = useState(false)
  const url = usePhotoUrl(f.id, f.foto, rev)
  const priv = st.semPressao
  return (
    <div className="fe">
      <fieldset className="rate">
        <legend>Como ficou? (opcional)</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={`rate-b${nota >= n ? ' rate-on' : ''}`} aria-pressed={nota === n} aria-label={`Nota ${n} de 5`} onClick={() => setNota(n)}>
            <span aria-hidden="true">{nota >= n ? '★' : '☆'}</span>
          </button>
        ))}
      </fieldset>
      <label htmlFor={`txt-${f.id}`}>Anotação curta</label>
      <textarea id={`txt-${f.id}`} rows={2} maxLength={280} placeholder="Ex.: deixei 5 min a mais no forno" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="fe-photo">
        {url && <img src={url} alt="Foto da sua fornada" className="fe-img" />}
        <label className="btn btn-secondary">
          {f.foto ? 'Trocar a foto' : 'Adicionar foto'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                await gameNote(f.id, { file })
                setRev((x) => x + 1)
              }
              e.target.value = ''
            }}
          />
        </label>
        {f.foto && (
          <button className="btn btn-link" onClick={() => gameDeletePhoto(f.id).then(() => setRev((x) => x + 1))}>
            Apagar a foto
          </button>
        )}
      </div>
      <label className="ck-row">
        <input type="checkbox" checked={!!f.presente} onChange={(e) => gameGift(f.id, e.target.checked)} />
        <span>Esta fornada foi para presentear alguém</span>
      </label>
      <button
        className="btn btn-open btn-block"
        onClick={async () => {
          await gameNote(f.id, { nota: nota || undefined, texto })
          setSaved(true)
        }}
      >
        Salvar no Livro de Fornadas
      </button>
      {saved && (
        <p className="ok-msg" role="status">
          Salvo. {priv ? '' : 'Na próxima, você faz melhor ainda.'}
        </p>
      )}
      <Honest text={G.GAME_TEXT.privacidade} />
    </div>
  )
}

// no rodapé de um material que a cliente já marcou: a última fornada, "Fiz de novo" e as notas
export function FornadaPanel({ item }: { item: string }) {
  const st = useGame()
  const mine = st.fornadas.filter((f) => f.item === item)
  const last = mine[mine.length - 1]
  if (!last) return null
  const n = mine.length
  const todayMade = last.d === today()
  const def = G.sealDef(`r:${item}`, titleOf)
  return (
    <section className="game-card" aria-label="Fornada deste material">
      <p className="seal-line">
        <Seal icon="receita" size={44} />
        <span>
          <strong>Selo conquistado: {def?.name}</strong>
          <small>
            Você fez {n} {n === 1 ? 'vez' : 'vezes'}. {n < 3 && !st.semPressao ? 'Na 3ª vez vira "Receita de casa".' : ''}
            {st.seals[`casa:${item}`] ? ' Selo dourado: Receita de casa.' : ''}
          </small>
        </span>
      </p>
      <FornadaEditor key={last.id} f={last} />
      <button className="btn btn-secondary btn-block" disabled={todayMade} onClick={() => gameDone(item)}>
        {todayMade ? 'Fiz de novo: já anotado hoje' : 'Fiz de novo'}
      </button>
    </section>
  )
}

// bônus 07: marco "Fiz minha conta" (o app não sugere preço nem promete lucro)
export function ContaPanel() {
  const st = useGame()
  const on = !!st.seals.conta
  return (
    <section className="game-card" aria-label="Fiz minha conta">
      <h3>Fiz minha conta</h3>
      <p>Marque quando abrir a tabela e calcular o custo da SUA fornada. O app não sugere preço de venda nem promete ganho.</p>
      <button className={`btn btn-block ${on ? 'btn-done' : 'btn-secondary'}`} disabled={on} onClick={gameConta}>
        {on ? 'Fiz minha conta ✓' : 'Fiz minha conta'}
      </button>
    </section>
  )
}

// Fichas de Socorro: "Resolveu?"
export function SocorroPanel() {
  const st = useGame()
  const [tipo, setTipo] = useState('')
  const [fim, setFim] = useState<'' | 'sim' | 'nao'>('')
  const got = G.SOCORRO_TIPOS.filter((t) => st.seals[`socorro:${t.id}`]).length
  return (
    <section className="game-card" aria-label="Resolveu?">
      <h3>Resolveu?</h3>
      <p>Depois de usar uma ficha, conte qual era o problema.</p>
      <label htmlFor="socorro-tipo">Qual ficha você usou?</label>
      <select id="socorro-tipo" value={tipo} onChange={(e) => { setTipo(e.target.value); setFim('') }}>
        <option value="">Escolha</option>
        {G.SOCORRO_TIPOS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="two">
        <button className="btn btn-open" disabled={!tipo} onClick={() => { gameSocorro(tipo, true); setFim('sim') }}>
          Resolveu
        </button>
        <button className="btn btn-secondary" disabled={!tipo} onClick={() => { gameSocorro(tipo, false); setFim('nao') }}>
          Ainda não
        </button>
      </div>
      {fim === 'sim' && <p className="ok-msg" role="status">Fornada salva! Anotei para a próxima.</p>}
      {fim === 'nao' && <p className="hint" role="status">Sem problema. Releia a ficha com calma ou fale com o suporte pelo botão Ajuda.</p>}
      {!st.semPressao && <p className="hint">Selos de socorro: {got} de {G.SOCORRO_TIPOS.length}.</p>}
    </section>
  )
}

// boas-vindas de volta, sem culpa
export function WelcomeBack() {
  const v = useVisit()
  const st = useGame()
  const store = useStore()
  const [hide, setHide] = useState(false)
  if (hide || v.days < G.AWAY_DAYS || !st.ultimoItem || !owns(store, st.ultimoItem as ItemId)) return null
  return (
    <section className="game-card welcome-back" aria-label="Boas-vindas de volta">
      <h3>Que bom te ver!</h3>
      <p>Quer retomar de onde parou? Sua receita ficou te esperando: {titleOf(st.ultimoItem)}.</p>
      <Link className="btn btn-open btn-block" to={`/produto/${st.ultimoItem}`}>
        Retomar
      </Link>
      <button className="btn btn-link btn-block" onClick={() => setHide(true)}>
        Agora não
      </button>
    </section>
  )
}

// cartão da Home que leva para "Minha fornada"
export function GameEntry() {
  const { dot, st } = useNextStep()
  if (!st.config.gamificacao) return null
  return (
    <section className="game-card game-entry" aria-label="Minha fornada">
      <div className="game-entry-head">
        <h2>Minha fornada</h2>
        {dot > 0 && <span className="new-dot new-dot-inline" aria-label="1 próximo passo para você">1</span>}
      </div>
      {st.semPressao ? <p>Seus selos, o Livro de Fornadas e o caderno de encomendas estão aqui.</p> : <><LevelChip compact /><IncentiveLine /></>}
      <Link className="btn btn-open btn-block" to="/fornada">
        Abrir minha fornada
      </Link>
    </section>
  )
}


// só registra a visita (para as boas-vindas de volta); não mostra nada
export function VisitTracker() {
  useVisit()
  return null
}
