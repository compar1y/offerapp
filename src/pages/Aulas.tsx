// Aulas em vídeo: lista por módulos (/aulas) e player vertical em tela cheia (/aulas/:arquivo).
// Vídeo só pelo nome do arquivo (VITE_AULAS_VIDEO_BASE_URL + nome). Sem YouTube, sem embed.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AULAS, AULAS_ON, AULA_BY_FILE, MODULOS, aulaVideoUrl, durLabel } from '../data/aulas'
import { aulaProgress, markAulaWatched, saveAulaTime, unmarkAulaWatched, useAulas, watchedCount } from '../lib/aulas'
import { useGame } from '../lib/game'
import { PF, showGame } from '../../shared/game'
import { Layout, Section } from '../components/ui'
import { CelebrationLayer, GameToast } from '../components/Game'

const SAVE_EVERY_SEC = 3
const clock = (s: number): string => {
  const t = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export function Aulas() {
  const prog = useAulas()
  const game = useGame()
  const done = watchedCount(prog)
  // a última aula mexida e não terminada vira o "Continuar de onde parei"
  const resume = AULAS.filter((a) => !prog[a.arquivo]?.watched && (prog[a.arquivo]?.progressSec ?? 0) > 0).sort((a, b) => (prog[b.arquivo]?.updatedAt ?? 0) - (prog[a.arquivo]?.updatedAt ?? 0))[0]
  return (
    <Layout title="Aulas em vídeo" back="/">
      <header className="screen-head">
        <h1>Aulas em vídeo</h1>
        <p className="lead">
          {AULAS.length} aulas curtas, com o celular em pé. Você já assistiu {done} de {AULAS.length}.
        </p>
        {showGame(game) && <p className="aulas-pf">Cada aula assistida pela primeira vez vale +{PF.aula} PF na Minha fornada.</p>}
        {!AULAS_ON && (
          <p className="demo-note" role="status">
            Os vídeos estão sendo preparados e aparecem aqui em breve. A lista já mostra o que vem em cada aula.
          </p>
        )}
        {AULAS_ON && resume && (
          <Link className="btn btn-open btn-block" to={`/aulas/${encodeURIComponent(resume.arquivo)}`}>
            Continuar de onde parei: {resume.titulo}
          </Link>
        )}
      </header>

      {MODULOS.map((m) => (
        <Section key={m.id} title={m.titulo} lead={m.lead}>
          <ol className="aula-list">
            {m.aulas.map((a, i) => {
              const p = prog[a.arquivo]
              return (
                <li key={a.arquivo}>
                  <Link className={`aula-row${p?.watched ? ' aula-done' : ''}`} to={`/aulas/${encodeURIComponent(a.arquivo)}`}>
                    <span className="aula-num" aria-hidden="true">
                      {p?.watched ? '✓' : i + 1}
                    </span>
                    <span className="aula-txt">
                      <strong>{a.titulo}</strong>
                      <small>
                        {durLabel(a.dur)} · {a.sub}
                        {p?.watched ? <span className="aula-tag"> · Assistida</span> : (p?.progressSec ?? 0) > 0 ? <span className="aula-tag"> · Parou em {clock(p!.progressSec)}</span> : null}
                      </small>
                    </span>
                    <span className="aula-play" aria-hidden="true">
                      ▶
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </Section>
      ))}
    </Layout>
  )
}

export function AulaPlayer() {
  const { arquivo = '' } = useParams()
  const file = decodeURIComponent(arquivo)
  const aula = AULA_BY_FILE[file]
  if (!aula) return <Navigate to="/aulas" replace />
  // key: trocar de aula remonta o player do zero (tempo, erro, carregamento)
  return <Player key={file} file={file} />
}

function Player({ file }: { file: string }) {
  const navigate = useNavigate()
  const aula = AULA_BY_FILE[file]
  const idx = AULAS.findIndex((a) => a.arquivo === file)
  const prev = idx > 0 ? AULAS[idx - 1] : null
  const next = idx < AULAS.length - 1 ? AULAS[idx + 1] : null
  const prog = useAulas()
  const watched = !!prog[file]?.watched
  const posInModule = aula.modulo.aulas.findIndex((a) => a.arquivo === file) + 1

  const video = useRef<HTMLVideoElement>(null)
  const lastSaved = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(aula.dur)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(AULAS_ON)
  const [failed, setFailed] = useState(false)
  const [ended, setEnded] = useState(false)

  const persist = useCallback(() => {
    const v = video.current
    if (!v || !Number.isFinite(v.currentTime)) return
    // perto do fim não guarda o tempo: ao reabrir, começa do início
    saveAulaTime(file, v.duration && v.currentTime > v.duration - 2 ? 0 : v.currentTime)
  }, [file])

  // sair da tela (voltar, trocar de aula, fechar o app) guarda onde parou
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      persist()
    }
  }, [persist])

  // trava a rolagem da página por baixo do player
  useEffect(() => {
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = old
    }
  }, [])

  function onLoaded() {
    const v = video.current
    if (!v) return
    if (Number.isFinite(v.duration) && v.duration > 0) setDur(v.duration)
    const saved = aulaProgress(file)?.progressSec ?? 0
    if (saved > 1 && saved < v.duration - 2) {
      v.currentTime = saved
      setTime(saved)
    }
    setLoading(false)
  }

  function toggle() {
    const v = video.current
    if (!v || failed) return
    if (v.paused || v.ended) {
      if (v.ended) v.currentTime = 0
      setEnded(false)
      void v.play().catch(() => setPlaying(false))
    } else {
      v.pause()
    }
  }

  function onTime() {
    const v = video.current
    if (!v || dragging) return
    setTime(v.currentTime)
    if (Math.abs(v.currentTime - lastSaved.current) >= SAVE_EVERY_SEC) {
      lastSaved.current = v.currentTime
      persist()
    }
  }

  function seek(to: number) {
    const v = video.current
    setTime(to)
    if (v && Number.isFinite(to)) v.currentTime = to
  }

  function onEnd() {
    setPlaying(false)
    setEnded(true)
    markAulaWatched(file)
  }

  function retry() {
    setFailed(false)
    setLoading(true)
    video.current?.load()
  }

  const go = (a: (typeof AULAS)[number] | null) => {
    if (a) navigate(`/aulas/${encodeURIComponent(a.arquivo)}`, { replace: true })
  }

  return (
    <>
    <div className="player" role="dialog" aria-modal="true" aria-label={`Aula: ${aula.titulo}`}>
      <div className="player-top">
        <button className="player-close" onClick={() => navigate('/aulas')} aria-label="Fechar e voltar para a lista de aulas">
          ‹ Aulas
        </button>
        <div className="player-title">
          <small>
            {aula.modulo.titulo} · aula {posInModule} de {aula.modulo.aulas.length}
          </small>
          <strong>{aula.titulo}</strong>
        </div>
      </div>

      <div className="player-stage">
        {AULAS_ON ? (
          <video
            ref={video}
            className="player-video"
            src={aulaVideoUrl(file)}
            playsInline
            preload="metadata"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onClick={toggle}
            onLoadedMetadata={onLoaded}
            onCanPlay={() => setLoading(false)}
            onWaiting={() => setLoading(true)}
            onPlaying={() => setLoading(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false)
              persist()
            }}
            onTimeUpdate={onTime}
            onEnded={onEnd}
            onError={() => {
              setFailed(true)
              setLoading(false)
            }}
          />
        ) : (
          <div className="player-msg" role="status">
            <p>
              <strong>Este vídeo ainda está sendo preparado.</strong>
            </p>
            <p>Logo ele aparece aqui. Enquanto isso, as receitas do seu kit já estão liberadas.</p>
          </div>
        )}

        {AULAS_ON && failed && (
          <div className="player-msg" role="alert">
            <p>
              <strong>Não consegui carregar o vídeo.</strong>
            </p>
            <p>Confira a internet e tente de novo.</p>
            <button className="btn btn-open" onClick={retry}>
              Tentar de novo
            </button>
          </div>
        )}

        {AULAS_ON && !failed && (
          <button className={`player-big${playing && !loading ? ' is-hidden' : ''}`} onClick={toggle} aria-label={playing ? 'Pausar' : ended ? 'Assistir de novo' : 'Assistir'}>
            {loading && playing ? <span className="player-spin" aria-hidden="true" /> : <span aria-hidden="true">{playing ? '❚❚' : ended ? '↻' : '▶'}</span>}
          </button>
        )}
      </div>

      <div className="player-bottom">
        {AULAS_ON && (
          <div className="player-bar">
            <button className="player-pp" onClick={toggle} disabled={failed} aria-label={playing ? 'Pausar' : 'Assistir'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <span className="player-time" aria-hidden="true">
              {clock(time)}
            </span>
            <input
              className="player-seek"
              type="range"
              min={0}
              max={Math.max(1, dur)}
              step={0.1}
              value={Math.min(time, dur)}
              disabled={failed}
              aria-label="Posição do vídeo"
              aria-valuetext={`${clock(time)} de ${clock(dur)}`}
              style={{ ['--pct' as string]: `${(Math.min(time, dur) / Math.max(1, dur)) * 100}%` }}
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <span className="player-time" aria-hidden="true">
              {clock(dur)}
            </span>
          </div>
        )}

        <div className="player-actions">
          <button className="player-nav" onClick={() => go(prev)} disabled={!prev} aria-label={prev ? `Aula anterior: ${prev.titulo}` : 'Não há aula anterior'}>
            ‹ Anterior
          </button>
          {watched ? (
            <button className="player-watch is-on" onClick={() => unmarkAulaWatched(file)} aria-pressed="true">
              ✓ Assistida
            </button>
          ) : (
            <button className="player-watch" onClick={() => markAulaWatched(file)} aria-pressed="false">
              Já assisti
            </button>
          )}
          <button className={`player-nav${ended && next ? ' is-next' : ''}`} onClick={() => go(next)} disabled={!next} aria-label={next ? `Próxima aula: ${next.titulo}` : 'Esta é a última aula'}>
            Próxima ›
          </button>
        </div>
      </div>
    </div>
    {/* os avisos de PF e a comemoração aparecem por cima do player */}
    <GameToast />
    <CelebrationLayer />
    </>
  )
}
