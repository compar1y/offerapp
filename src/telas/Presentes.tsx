import { useEffect, useRef, useState } from 'react'
import { ETAPAS, LOJA } from '../../shared/conteudo'
import { abrirBau, premioRaspadinha, receberRaspadinha, trocar, type BauId, type Premio } from '../../shared/jogo'
import { ofertaDisponivel, useApp } from '../ctx'
import { lerRef } from './Jornada'
import { BAUS } from './Painel'

export function BauTela({ b }: { b: BauId }) {
  const { estado, mudar, voltar, evento } = useApp()
  const [premio, setPremio] = useState<Premio | null>(null)
  const [treme, setTreme] = useState(false)
  const info = BAUS.find((x) => x.id === b)!
  const tem = estado.baus.includes(b)

  function abrir() {
    if (!tem || treme) return
    setTreme(true)
    setTimeout(() => {
      const r = abrirBau(estado, b)
      mudar(() => r.estado)
      setPremio(r.premio ?? null)
      evento('bau.aberto', { bau: b })
    }, 900)
  }

  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <div className="card pop" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <h2>Presente de Natal {info.nome.toLowerCase()}</h2>
        {premio ? (
          <>
            <div className="pop" style={{ fontSize: 64 }}>🪙</div>
            <span className="raridade">{premio.raridade}</span>
            <h3>{premio.titulo}</h3>
            <p className="sub">Troque as moedas por presentes na Lojinha.</p>
            <button className="btn" onClick={voltar}>Oba! Voltar</button>
          </>
        ) : tem ? (
          <>
            <button className={`bauGrande ${treme ? 'treme' : ''}`} onClick={abrir} aria-label="Abrir o presente">{info.ico}</button>
            <p className="sub">Toque no presente para abrir</p>
          </>
        ) : (
          <p className="sub">Você ganha este presente ao {info.como}.</p>
        )}
      </div>
    </>
  )
}

/** Ingrediente Secreto: raspadinha ao terminar uma etapa. Depois, a oferta da etapa (se houver e ela ainda não tiver). */
export function Raspa({ etapa }: { etapa: number }) {
  const { eu, estado, mudar, trocar: trocarTela, toast } = useApp()
  const premio = premioRaspadinha(etapa)
  const jaRecebeu = estado.ofertasVistas.includes(`raspa-${etapa}`)
  const [raspou, setRaspou] = useState(jaRecebeu)
  const cv = useRef<HTMLCanvasElement>(null)

  function revelar() {
    if (raspou) return
    setRaspou(true)
    if (!jaRecebeu) {
      mudar((e) => receberRaspadinha(e, etapa))
      toast(`+${premio.moedas} 🪙 do Ingrediente Secreto`)
    }
  }

  useEffect(() => {
    const c = cv.current
    if (!c || raspou) return
    const r = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    c.width = r.width * dpr
    c.height = r.height * dpr
    const g = c.getContext('2d')
    if (!g) return
    g.scale(dpr, dpr)
    const grad = g.createLinearGradient(0, 0, r.width, r.height)
    grad.addColorStop(0, '#E2A23B')
    grad.addColorStop(0.5, '#F6D58E')
    grad.addColorStop(1, '#C9862A')
    g.fillStyle = grad
    g.fillRect(0, 0, r.width, r.height)
    g.fillStyle = '#5B3A12'
    g.font = '800 20px "Baloo 2", sans-serif'
    g.textAlign = 'center'
    g.fillText('RASPE AQUI ✨', r.width / 2, r.height / 2 + 7)
    g.globalCompositeOperation = 'destination-out'
    let down = false
    let n = 0
    let feito = false
    const risca = (e: PointerEvent) => {
      if (!down) return
      const p = c.getBoundingClientRect()
      g.beginPath()
      g.arc(e.clientX - p.left, e.clientY - p.top, 22, 0, Math.PI * 2)
      g.fill()
      if (++n > 40 && !feito) {
        feito = true
        revelar()
      }
    }
    const baixo = (e: PointerEvent) => { down = true; c.setPointerCapture(e.pointerId); risca(e) }
    const cima = () => { down = false }
    c.addEventListener('pointerdown', baixo)
    c.addEventListener('pointermove', risca)
    c.addEventListener('pointerup', cima)
    return () => {
      c.removeEventListener('pointerdown', baixo)
      c.removeEventListener('pointermove', risca)
      c.removeEventListener('pointerup', cima)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raspou])

  function continuar() {
    const et = ETAPAS.find((e) => e.n === etapa)
    const p = et?.ofertaAoConcluir
    const chave = `oferta-etapa-${etapa}`
    if (p && ofertaDisponivel(eu, p) && !estado.ofertasVistas.includes(chave)) {
      mudar((e) => ({ ...e, ofertasVistas: [...e.ofertasVistas, chave] }))
      trocarTela({ t: 'oferta', p, origem: `etapa-${etapa}` })
    } else trocarTela({ t: 'painel' })
  }

  return (
    <>
      <p className="eyebrow">Etapa {etapa} concluída 🎉</p>
      <h1>Seu Ingrediente Secreto</h1>
      <p className="sub">Raspe com o dedo para descobrir o seu prêmio. Você também ganhou um Presente de Natal ouro.</p>
      <div className="raspa">
        <div className="premio"><span className="raridade">{premio.raridade}</span><h3>{premio.titulo}</h3></div>
        {!raspou && <canvas ref={cv} tabIndex={0} aria-label="Área para raspar. Pressione Enter para revelar." onKeyDown={(e) => e.key === 'Enter' && revelar()} />}
      </div>
      {!raspou && <button className="link" onClick={revelar}>Revelar sem raspar</button>}
      <button className="btn" onClick={continuar} disabled={!raspou}>Continuar</button>
    </>
  )
}

export function Loja() {
  const { eu, estado, mudar, ir, voltar, evento, toast } = useApp()
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <h1>Lojinha</h1>
      <p>Você tem <b>🪙 {estado.moedas} Moedas Douradas</b>. Ganhe mais fazendo lições, receitas e missões.</p>
      <div className="lista">
        {LOJA.map((i) => {
          const seu = estado.itens.includes(i.id)
          const alvo = i.ref ? lerRef(i.ref) : null
          const pode = !alvo || eu.acesso.materiais.includes(alvo.m)
          if (!pode) return null
          return (
            <div key={i.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{i.icone}</span>
              <div style={{ flex: 1, minWidth: 0 }}><b>{i.titulo}</b><div className="sub" style={{ fontSize: 13 }}>🪙 {i.custo}</div></div>
              {seu ? (
                <button className="btn leve" style={{ width: 'auto', fontSize: 15, padding: '10px 14px' }} onClick={() => alvo && ir({ t: 'ler', m: alvo.m, p: alvo.p })}>Abrir</button>
              ) : (
                <button
                  className="btn"
                  style={{ width: 'auto', fontSize: 15, padding: '10px 14px' }}
                  disabled={estado.moedas < i.custo}
                  onClick={() => {
                    const n = trocar(estado, i.id, i.custo)
                    if (!n) return
                    mudar(() => n)
                    evento('loja.troca', { item: i.id })
                    toast('Trocado! Já está aberto para você.')
                  }}
                >
                  Trocar
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
