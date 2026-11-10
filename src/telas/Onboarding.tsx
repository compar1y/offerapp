import { cena, fotoPerfil } from '../imagens'
import { useState } from 'react'
import { PERFIS, PERGUNTAS, perfilDe, porqueDoPerfil } from '../../shared/conteudo'
import { AVATAR_PADRAO } from '../onboarding'
import { useApp } from '../ctx'

// Onboarding obrigatório, sem perguntas e sem escolher confeiteira (src/onboarding.ts): boas-vindas → nome → Início.
export function Boas() {
  const { ir, evento } = useApp()
  return (
    <div className="card pop" style={{ gap: 14, textAlign: 'center', paddingTop: 0, overflow: 'hidden' }}>
      <img className="foto-topo" src={cena('boas-vindas')} alt="" />
      <p className="eyebrow">Passo 1 de 2</p>
      <h1>Seu acesso está liberado!</h1>
      <p>
        Tudo o que você comprou já está aberto: as 100 receitas, os 8 bônus e o seu presente, o <b>SOS Massa</b>.
      </p>
      <p className="sub">Antes de entrar, só o seu nome. É rapidinho.</p>
      <button className="btn" onClick={() => { evento('onboarding.passo', { passo: 'boas' }); ir({ t: 'nome' }) }}>Começar</button>
    </div>
  )
}

export function Nome() {
  const { eu, trocar, salvarPerfil, evento } = useApp()
  const [apelido, setApelido] = useState(eu.apelido ?? '')
  const seguir = () => {
    // a confeiteira não é mais escolhida: vai a padrão
    salvarPerfil({ apelido: apelido.trim() || 'Confeiteira', avatar: eu.avatar ?? AVATAR_PADRAO })
    evento('onboarding.passo', { passo: 'nome' })
    trocar({ t: 'painel' })
  }
  return (
    <div className="card pop onb" style={{ gap: 14 }}>
      <p className="eyebrow">Passo 2 de 2</p>
      <h2><label htmlFor="apelido">Como você quer ser chamada?</label></h2>
      <p className="sub">É assim que o app vai falar com você.</p>
      <input id="apelido" type="text" maxLength={24} autoComplete="given-name" placeholder="Ex.: Cida" value={apelido}
        onChange={(e) => setApelido(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') seguir() }} />
      <button className="btn" onClick={seguir}>Entrar na minha cozinha</button>
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
      <div className="card pop" style={{ borderColor: 'var(--casca)', gap: 12, paddingTop: 0, overflow: 'hidden' }}>
        <img className="foto-topo" src={fotoPerfil(p.id)} alt="" />
        <h1>{p.nome}</h1>
        <p>{porqueDoPerfil(p.id, eu.respostas)}</p>
        <div className="tarefa"><b>Seu caminho</b><span>{p.frase}</span></div>
        <div className="tarefa"><b>Sua primeira missão</b><span>{p.missao}</span></div>
      </div>
      <button className="btn" onClick={() => ir({ t: 'painel' })}>Montar meu caminho</button>
    </>
  )
}
