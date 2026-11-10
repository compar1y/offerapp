// Aulas em vídeo: lista por módulos (tela 'aulas') e player vertical em tela cheia (tela 'aula').
import { useCallback, useEffect, useRef, useState } from 'react'
import { AULAS, AULA_BY_FILE, MODULOS, durLabel, ehAula } from '../../shared/aulas'
import { assistirAula } from '../../shared/jogo'
import { AULAS_ON, aulaVideoUrl, gravarTempo, lerTempos, podeVerAulas } from '../aulas'
import { useApp } from '../ctx'

const GRAVAR_A_CADA_SEG = 3
const relogio = (s: number): string => {
  const t = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

// sem acesso (aulas vendidas à parte e ela ainda não comprou): vai para a página da oferta Videoaulas
function useSemAcesso(): boolean {
  const { eu, trocar } = useApp()
  const sem = !podeVerAulas(eu)
  useEffect(() => {
    if (sem) trocar({ t: 'videoaulas' })
  }, [sem, trocar])
  return sem
}

export function Aulas() {
  const { eu, estado, ir, voltar } = useApp()
  if (useSemAcesso()) return null
  const vistas = estado.aulas ?? []
  const tempos = lerTempos(eu.email)
  // a última aula mexida e não terminada vira o "Continuar de onde parei"
  const retomar = AULAS.filter((a) => !vistas.includes(a.arquivo) && (tempos[a.arquivo]?.progressSec ?? 0) > 0).sort((a, b) => (tempos[b.arquivo]?.updatedAt ?? 0) - (tempos[a.arquivo]?.updatedAt ?? 0))[0]
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <h1>Aulas em vídeo</h1>
      <p className="sub">{AULAS.length} aulas curtas, com o celular em pé. Você já assistiu {vistas.length} de {AULAS.length}.</p>
      <div className="barra"><i style={{ width: `${(vistas.length / AULAS.length) * 100}%` }} /></div>
      {!AULAS_ON && <div className="aviso"><b>🎬 Vídeos a caminho</b><span>Os vídeos estão sendo preparados e aparecem aqui em breve. A lista já mostra o que vem em cada aula.</span></div>}
      {AULAS_ON && retomar && (
        <button className="btn" onClick={() => ir({ t: 'aula', a: retomar.arquivo })}>Continuar de onde parei: {retomar.titulo}</button>
      )}
      {MODULOS.map((m) => (
        <div key={m.id} className="card">
          <h3>{m.titulo}</h3>
          <p className="sub" style={{ fontSize: 14 }}>{m.lead}</p>
          <div className="lista">
            {m.aulas.map((a, i) => {
              const ok = vistas.includes(a.arquivo)
              const parou = tempos[a.arquivo]?.progressSec ?? 0
              return (
                <button key={a.arquivo} className={`item aula-item ${ok ? 'ok' : ''}`} onClick={() => ir({ t: 'aula', a: a.arquivo })}>
                  <span className={`check ${ok ? 'ok' : ''}`} aria-hidden>{ok ? '✓' : i + 1}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b>{a.titulo}</b>
                    <span className="sub aula-linha">{durLabel(a.dur)} · {a.sub}{ok ? ' · Assistida' : parou > 0 ? ` · Parou em ${relogio(parou)}` : ''}</span>
                  </span>
                  <span className="aula-play" aria-hidden>▶</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export function AulaTela({ a }: { a: string }) {
  const { voltar } = useApp()
  const sem = useSemAcesso()
  const valida = ehAula(a)
  useEffect(() => {
    if (!valida && !sem) voltar()
  }, [valida, sem, voltar])
  // key: trocar de aula remonta o player do zero (tempo, erro, carregamento)
  return valida && !sem ? <Player key={a} file={a} /> : null
}

function Player({ file }: { file: string }) {
  const { eu, estado, mudar, trocar, voltar, toast, evento } = useApp()
  const aula = AULA_BY_FILE[file]
  const idx = AULAS.findIndex((x) => x.arquivo === file)
  const ant = idx > 0 ? AULAS[idx - 1] : null
  const prox = idx < AULAS.length - 1 ? AULAS[idx + 1] : null
  const vista = (estado.aulas ?? []).includes(file)
  const posNoModulo = aula.modulo.aulas.findIndex((x) => x.arquivo === file) + 1

  const video = useRef<HTMLVideoElement>(null)
  const ultimo = useRef(0)
  const [tocando, setTocando] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [dur, setDur] = useState(aula.dur)
  const [arrastando, setArrastando] = useState(false)
  const [carregando, setCarregando] = useState(AULAS_ON)
  const [falhou, setFalhou] = useState(false)
  const [acabou, setAcabou] = useState(false)

  const gravar = useCallback(() => {
    const v = video.current
    if (!v || !Number.isFinite(v.currentTime)) return
    gravarTempo(eu.email, file, v.duration && v.currentTime > v.duration - 2 ? 0 : v.currentTime)
  }, [eu.email, file])

  // sair da tela (voltar, trocar de aula, fechar o app) guarda onde parou
  useEffect(() => {
    const sumiu = () => {
      if (document.visibilityState === 'hidden') gravar()
    }
    document.addEventListener('visibilitychange', sumiu)
    return () => {
      document.removeEventListener('visibilitychange', sumiu)
      gravar()
    }
  }, [gravar])

  // trava a rolagem da página por baixo do player
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [])

  useEffect(() => {
    evento('aula.aberta', { aula: file })
  }, [evento, file])

  function marcar(como: 'fim' | 'botao') {
    if (!vista) toast('Aula assistida ✓')
    mudar((e) => assistirAula(e, file))
    if (!vista) evento('aula.assistida', { aula: file, como })
  }

  function aoCarregar() {
    const v = video.current
    if (!v) return
    if (Number.isFinite(v.duration) && v.duration > 0) setDur(v.duration)
    const salvo = lerTempos(eu.email)[file]?.progressSec ?? 0
    if (salvo > 1 && salvo < v.duration - 2) {
      v.currentTime = salvo
      setTempo(salvo)
    }
    setCarregando(false)
  }

  function alternar() {
    const v = video.current
    if (!v || falhou) return
    if (v.paused || v.ended) {
      if (v.ended) v.currentTime = 0
      setAcabou(false)
      void v.play().catch(() => setTocando(false))
    } else {
      v.pause()
    }
  }

  function aoTempo() {
    const v = video.current
    if (!v || arrastando) return
    setTempo(v.currentTime)
    if (Math.abs(v.currentTime - ultimo.current) >= GRAVAR_A_CADA_SEG) {
      ultimo.current = v.currentTime
      gravar()
    }
  }

  function pular(para: number) {
    const v = video.current
    setTempo(para)
    if (v && Number.isFinite(para)) v.currentTime = para
  }

  function aoFim() {
    setTocando(false)
    setAcabou(true)
    marcar('fim')
  }

  function tentarDeNovo() {
    setFalhou(false)
    setCarregando(true)
    video.current?.load()
  }

  // anterior/próxima trocam a tela (não empilham): o "‹ Aulas" sempre volta para a lista
  const ir = (x: (typeof AULAS)[number] | null) => {
    if (x) trocar({ t: 'aula', a: x.arquivo })
  }

  return (
    <div className="player" role="dialog" aria-modal="true" aria-label={`Aula: ${aula.titulo}`}>
      <div className="player-topo">
        <button className="player-fechar" onClick={voltar} aria-label="Fechar e voltar para a lista de aulas">‹ Aulas</button>
        <div className="player-titulo">
          <small>{aula.modulo.titulo} · aula {posNoModulo} de {aula.modulo.aulas.length}</small>
          <strong>{aula.titulo}</strong>
        </div>
      </div>

      <div className="player-palco">
        {AULAS_ON ? (
          <video
            ref={video}
            className="player-video"
            src={aulaVideoUrl(file)}
            playsInline
            preload="metadata"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onClick={alternar}
            onLoadedMetadata={aoCarregar}
            onCanPlay={() => setCarregando(false)}
            onWaiting={() => setCarregando(true)}
            onPlaying={() => setCarregando(false)}
            onPlay={() => setTocando(true)}
            onPause={() => {
              setTocando(false)
              gravar()
            }}
            onTimeUpdate={aoTempo}
            onEnded={aoFim}
            onError={() => {
              setFalhou(true)
              setCarregando(false)
            }}
          />
        ) : (
          <div className="player-msg" role="status">
            <p><strong>Este vídeo ainda está sendo preparado.</strong></p>
            <p>Logo ele aparece aqui. Enquanto isso, suas receitas já estão liberadas.</p>
          </div>
        )}

        {AULAS_ON && falhou && (
          <div className="player-msg" role="alert">
            <p><strong>Não consegui carregar o vídeo.</strong></p>
            <p>Confira a internet e tente de novo.</p>
            <button className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
          </div>
        )}

        {AULAS_ON && !falhou && (
          <button className={`player-grande${tocando && !carregando ? ' some' : ''}`} onClick={alternar} aria-label={tocando ? 'Pausar' : acabou ? 'Assistir de novo' : 'Assistir'}>
            {carregando && tocando ? <span className="player-gira" aria-hidden /> : <span aria-hidden>{tocando ? '❚❚' : acabou ? '↻' : '▶'}</span>}
          </button>
        )}
      </div>

      <div className="player-baixo">
        {AULAS_ON && (
          <div className="player-barra">
            <button className="player-pp" onClick={alternar} disabled={falhou} aria-label={tocando ? 'Pausar' : 'Assistir'}>{tocando ? '❚❚' : '▶'}</button>
            <span className="player-tempo" aria-hidden>{relogio(tempo)}</span>
            <input
              className="player-busca"
              type="range"
              min={0}
              max={Math.max(1, dur)}
              step={0.1}
              value={Math.min(tempo, dur)}
              disabled={falhou}
              aria-label="Posição do vídeo"
              aria-valuetext={`${relogio(tempo)} de ${relogio(dur)}`}
              style={{ ['--pct' as string]: `${(Math.min(tempo, dur) / Math.max(1, dur)) * 100}%` }}
              onPointerDown={() => setArrastando(true)}
              onPointerUp={() => setArrastando(false)}
              onPointerCancel={() => setArrastando(false)}
              onChange={(e) => pular(Number(e.target.value))}
            />
            <span className="player-tempo" aria-hidden>{relogio(dur)}</span>
          </div>
        )}

        <div className="player-acoes">
          <button className="player-nav" onClick={() => ir(ant)} disabled={!ant} aria-label={ant ? `Aula anterior: ${ant.titulo}` : 'Não há aula anterior'}>‹ Anterior</button>
          {vista ? (
            <span className="player-vista" role="status">✓ Assistida</span>
          ) : (
            <button className="player-ja" onClick={() => marcar('botao')}>Já assisti ✓</button>
          )}
          <button className={`player-nav${acabou && prox ? ' proxima' : ''}`} onClick={() => ir(prox)} disabled={!prox} aria-label={prox ? `Próxima aula: ${prox.titulo}` : 'Esta é a última aula'}>Próxima ›</button>
        </div>
      </div>
    </div>
  )
}
