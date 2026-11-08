import { fotoEtapa } from '../imagens'
import { useEffect, useState } from 'react'
import { MATERIAIS, type MaterialId } from '../../shared/catalogo'
import { ETAPAS, PERFIS, TODAS_LICOES, type Ref } from '../../shared/conteudo'
import { concluirLicao, MOEDAS } from '../../shared/jogo'
import { temMaterial, useApp } from '../ctx'

export const lerRef = (r: Ref): { m: MaterialId; p: number } => {
  const [m, p] = r.split(':')
  return { m: m as MaterialId, p: Number(p) }
}

export function Jornada() {
  const { eu, estado, ir, voltar } = useApp()
  const comeca = PERFIS[eu.perfil ?? 'iniciante'].comecaEm
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <h2>Seu passo a passo até o Natal</h2>
      <p className="sub">Tudo aberto. A ordem é só uma sugestão para o seu perfil.</p>
      {ETAPAS.map((e) => {
        const feita = e.licoes.every((l) => estado.licoes.includes(l.id))
        return (
          <div key={e.n} className="card etapa-card">
            <img className="foto-etapa" src={fotoEtapa(e.n)} alt="" loading="lazy" />
            <div className="etapa">
              <div className={`n ${feita ? 'feito' : ''}`}>{feita ? '✓' : e.n}</div>
              <div>
                <h3>{e.titulo}</h3>
                <span className="sub" style={{ fontSize: 13 }}>{e.subtitulo}{e.n === comeca && comeca !== 1 ? ' · sugerida para você começar' : ''}</span>
              </div>
            </div>
            <div className="licoes">
              {e.licoes.map((l) => {
                const ok = estado.licoes.includes(l.id)
                return (
                  <button key={l.id} className="licao" onClick={() => ir({ t: 'licao', id: l.id })}>
                    <span className={`check ${ok ? 'ok' : ''}`} style={{ width: 22, height: 22, fontSize: 13 }}>{ok ? '✓' : ''}</span>
                    {l.titulo}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

export function LicaoTela({ id }: { id: string }) {
  const { eu, estado, ir, voltar, mudar, evento, toast } = useApp()
  const l = TODAS_LICOES.find((x) => x.id === id)
  const [foto, setFoto] = useState<string | null>(null)
  useEffect(() => {
    if (l) evento('licao.aberta', { licao: l.id })
  }, [l, evento])
  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto) }, [foto])
  if (!l) return <button className="voltar" onClick={voltar}>← Voltar</button>
  const etapa = ETAPAS.find((e) => e.n === l.etapa)!
  const pos = etapa.licoes.findIndex((x) => x.id === id) + 1
  const feita = estado.licoes.includes(id)

  // material que ela tem: se não tiver o do bump, abre a alternativa do kit
  const ver = l.ver && (!l.ver.seTiver || temMaterial(eu, l.ver.seTiver) ? l.ver : l.ver.senao)
  const alvo = ver ? lerRef(ver.ref) : null
  const podeVer = alvo && temMaterial(eu, alvo.m)

  function concluir() {
    const r = concluirLicao(estado, id)
    mudar(() => r.estado)
    evento('licao.feita', { licao: id })
    toast(`+${MOEDAS.licao} 🪙 Lição feita!`)
    if (r.etapaConcluida) ir({ t: 'raspa', etapa: r.etapaConcluida })
  }

  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <p className="eyebrow">Etapa {etapa.n} · Lição {pos} de {etapa.licoes.length} · {l.minutos} min</p>
      <h1>{l.titulo}</h1>
      <p>{l.texto}</p>
      {l.foto && (
        <label className="foto" style={{ cursor: 'pointer', padding: foto ? 0 : 16, overflow: 'hidden' }}>
          {foto ? <img src={foto} alt="Sua foto do panetone" className="fotoPrevia" /> : <span>📷 Toque para tirar a foto do panetone aberto.<br /><span style={{ fontSize: 13 }}>A foto fica só no seu celular.</span></span>}
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setFoto(URL.createObjectURL(f)) }} />
        </label>
      )}
      <div className="tarefa"><b>Sua tarefa de hoje</b><span>{l.tarefa}</span></div>
      {ver && alvo && podeVer && (
        <button className="btn leve" onClick={() => ir({ t: 'ler', m: alvo.m, p: alvo.p })}>📖 Ver no material ({ver.rotulo})</button>
      )}
      {ver && alvo && !podeVer && <p className="sub">Está em: {MATERIAIS[alvo.m].titulo}.</p>}
      <button className="btn" onClick={concluir} disabled={feita}>{feita ? 'Lição feita ✓' : `Fiz! (+${MOEDAS.licao} 🪙)`}</button>
      <button className="link" onClick={() => ir({ t: 'sos' })}>A massa deu problema? Abrir o SOS Massa</button>
    </>
  )
}
