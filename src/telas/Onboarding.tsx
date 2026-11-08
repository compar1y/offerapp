import { useState } from 'react'
import { AVATARES, PERFIS, PERGUNTAS, perfilDe, porqueDoPerfil } from '../../shared/conteudo'
import { useApp } from '../ctx'

export function Boas() {
  const { ir } = useApp()
  return (
    <div className="card pop" style={{ gap: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>🎄</div>
      <h1>Seu acesso está liberado!</h1>
      <p>
        Tudo o que você comprou já está aberto: as 100 receitas, os 8 bônus e o seu presente, o <b>SOS Massa</b>.
      </p>
      <p className="sub">Antes, 5 perguntas rápidas para o app montar o seu caminho até o Natal.</p>
      <button className="btn" onClick={() => ir({ t: 'pergunta' })}>Começar (1 minuto)</button>
    </div>
  )
}

export function Pergunta() {
  const { ir, salvarPerfil, evento } = useApp()
  const [resp, setResp] = useState<number[]>([])
  const i = resp.length
  const q = PERGUNTAS[Math.min(i, 4)]

  function responder(k: number) {
    const r = [...resp, k]
    if (r.length < 5) return setResp(r)
    const perfil = perfilDe(r)
    salvarPerfil({ perfil, respostas: r })
    evento('onboarding', { perfil, respostas: r })
    ir({ t: 'resultado' })
  }

  return (
    <>
      <div className="barra" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={5} aria-label={`Pergunta ${i + 1} de 5`}>
        <i style={{ width: `${(i / 5) * 100}%` }} />
      </div>
      <p className="eyebrow">Pergunta {i + 1} de 5</p>
      <h2 className="pop" key={i}>{q.t}</h2>
      <div className="opcoes">
        {q.o.map((o, k) => (
          <button key={o} className="opcao" onClick={() => responder(k)}>{o}</button>
        ))}
      </div>
      {i > 0 && <button className="link" onClick={() => setResp(resp.slice(0, -1))}>Voltar</button>}
    </>
  )
}

export function Resultado() {
  const { eu, ir } = useApp()
  if (!eu.perfil || !eu.respostas) return null
  const p = PERFIS[eu.perfil]
  return (
    <>
      <p className="eyebrow">Seu perfil</p>
      <div className="card pop" style={{ borderColor: 'var(--casca)', gap: 12 }}>
        <h1>{p.nome}</h1>
        <p>{porqueDoPerfil(p.id, eu.respostas)}</p>
        <div className="tarefa"><b>Seu caminho</b><span>{p.frase}</span></div>
        <div className="tarefa"><b>Sua primeira missão</b><span>{p.missao}</span></div>
      </div>
      <button className="btn" onClick={() => ir({ t: 'avatar' })}>Montar meu caminho</button>
    </>
  )
}

export function Avatar() {
  const { eu, trocar, salvarPerfil } = useApp()
  const [av, setAv] = useState<number | null>(eu.avatar)
  const [apelido, setApelido] = useState(eu.apelido)
  return (
    <>
      <h2>Escolha a sua confeiteira</h2>
      <div className="avatares">
        {AVATARES.map((a, k) => (
          <button key={k} className={`av ${av === k ? 'sel' : ''}`} onClick={() => setAv(k)} aria-label={`Avatar ${k + 1}`} aria-pressed={av === k}>{a}</button>
        ))}
      </div>
      <label htmlFor="apelido" style={{ fontWeight: 800 }}>Como quer ser chamada?</label>
      <input id="apelido" type="text" maxLength={24} placeholder="Ex.: Cida dos Panetones" value={apelido} onChange={(e) => setApelido(e.target.value)} />
      <button
        className="btn"
        disabled={av === null}
        onClick={() => {
          salvarPerfil({ avatar: av, apelido: apelido.trim() || 'Confeiteira' })
          trocar({ t: 'painel' })
        }}
      >
        Entrar na minha cozinha
      </button>
    </>
  )
}
