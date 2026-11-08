import { useEffect, useState } from 'react'
import { MATERIAIS, PRODUTOS } from '../../shared/catalogo'
import { AVATARES, ETAPAS, OFERTAS, PERFIS, TODAS_LICOES } from '../../shared/conteudo'
import { fazerMissaoDoPerfil, hojeBR, type BauId } from '../../shared/jogo'
import { ofertaDisponivel, reais, useApp } from '../ctx'
import { Suporte } from './Entrar'

export const BAUS: { id: BauId; nome: string; ico: string; como: string }[] = [
  { id: 'prata', nome: 'Prata', ico: '🎁', como: '3 missões do dia' },
  { id: 'ouro', nome: 'Ouro', ico: '🎁', como: 'terminar uma etapa' },
  { id: 'diamante', nome: 'Diamante', ico: '💎', como: '7 dias seguidos' },
  { id: 'cristal', nome: 'Cristal', ico: '🔮', como: 'terminar a jornada' },
]

export function diasParaNatal(hoje = hojeBR()): number {
  const ano = Number(hoje.slice(0, 4))
  return Math.max(0, Math.round((Date.parse(`${ano}-12-24`) - Date.parse(hoje)) / 864e5))
}

/** a próxima lição na ordem sugerida para o perfil (tudo continua aberto) */
export function proximaLicao(comecaEm: number, feitas: string[]) {
  const ordem = [...ETAPAS.filter((e) => e.n >= comecaEm), ...ETAPAS.filter((e) => e.n < comecaEm)]
  for (const e of ordem) {
    const l = e.licoes.find((x) => !feitas.includes(x.id))
    if (l) return { etapa: e, licao: l }
  }
  return null
}

export function Painel() {
  const { eu, estado, ir, mudar, evento, recarregar, sair } = useApp()
  const perfil = PERFIS[eu.perfil ?? 'iniciante']
  const prox = proximaLicao(perfil.comecaEm, estado.licoes)
  const missoes = ['Abrir o app hoje', 'Fazer uma lição ou uma receita', perfil.missao]
  const oferta = perfil.ofertas.find((p) => ofertaDisponivel(eu, p))
  const dias = diasParaNatal()
  const feitasTotal = estado.licoes.length

  useEffect(() => {
    if (oferta) evento('oferta.vista', { produto: oferta, onde: 'painel' })
  }, [oferta, evento])

  return (
    <>
      <div className="topo">
        <div className="avatar">{AVATARES[eu.avatar ?? 0]}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="nome">{eu.apelido || 'Confeiteira'}</div>
          <div className="sub" style={{ fontSize: 13 }}>{perfil.nome}</div>
        </div>
      </div>
      <div className="chips">
        <span className="chip" title="Fornadas Seguidas">🔥 {estado.seq.dias} {estado.seq.dias === 1 ? 'dia seguido' : 'dias seguidos'}</span>
        <span className="chip" title="Moedas Douradas">🪙 {estado.moedas}</span>
        <button className="chip" onClick={() => ir({ t: 'loja' })} style={{ cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>🛍️ Lojinha</button>
      </div>
      {dias > 0 && <div className="natal"><span>Faltam para o Natal</span><b>{dias} {dias === 1 ? 'dia' : 'dias'}</b></div>}

      {eu.acesso.pendentes.length > 0 && (
        <div className="aviso">
          <b>⏳ Pagamento aguardando</b>
          <span>{eu.acesso.pendentes.map((p) => PRODUTOS[p].nome).join(', ')}: libera aqui assim que o pagamento cair.</span>
          <button className="btn leve" onClick={() => recarregar()}>Já paguei, conferir</button>
        </div>
      )}

      <div className="card">
        <h3>Fornada do Dia</h3>
        {missoes.map((m, k) => {
          const ok = estado.missoes.feitas[k]
          return (
            <div key={k} className={`missao ${ok ? 'ok' : ''}`}>
              <div className={`check ${ok ? 'ok' : ''}`} aria-hidden>{ok ? '✓' : ''}</div>
              <span>{m}</span>
              {k === 2 && !ok && (
                <button className="btn leve feito-btn" onClick={() => { mudar(fazerMissaoDoPerfil); evento('missao.perfil', { perfil: perfil.id }) }}>Fiz</button>
              )}
              {k === 1 && !ok && prox && (
                <button className="btn leve feito-btn" onClick={() => ir({ t: 'licao', id: prox.licao.id })}>Ir</button>
              )}
            </div>
          )
        })}
        <p className="sub" style={{ fontSize: 13 }}>Complete as 3 e ganhe um Presente de Natal prata.</p>
      </div>

      {prox ? (
        <div className="card">
          <p className="eyebrow">{feitasTotal ? 'Continue de onde parou' : 'Comece por aqui'}</p>
          <h3>Etapa {prox.etapa.n} · {prox.licao.titulo}</h3>
          <div className="barra"><i style={{ width: `${(feitasTotal / TODAS_LICOES.length) * 100}%` }} /></div>
          <p className="sub" style={{ fontSize: 13 }}>{feitasTotal} de {TODAS_LICOES.length} lições · uns {prox.licao.minutos} minutos</p>
          <button className="btn" onClick={() => ir({ t: 'licao', id: prox.licao.id })}>Fazer agora</button>
        </div>
      ) : (
        <div className="card"><p className="eyebrow">Jornada completa 🎉</p><h3>Você fez todas as lições até o Natal.</h3></div>
      )}

      <button className="btn leve" style={{ fontSize: 18 }} onClick={() => ir({ t: 'receitas' })}>📖 Minhas 100 receitas</button>
      <button className="sos" onClick={() => ir({ t: 'sos' })}><span className="ico">🆘</span><span><b>SOS Massa</b>Deu algo errado? Toque aqui.</span></button>

      <div className="card">
        <h3>Presentes de Natal</h3>
        <div className="baus">
          {BAUS.map((b) => {
            const qtd = estado.baus.filter((x) => x === b.id).length
            return (
              <button key={b.id} className={`bau ${qtd ? 'pronto' : ''}`} title={b.como} onClick={() => (qtd ? ir({ t: 'bau', b: b.id }) : undefined)} aria-label={`Presente ${b.nome}: ${qtd ? `${qtd} para abrir` : `ganhe ao ${b.como}`}`}>
                <span className="ico">{b.ico}</span>{b.nome}{qtd > 1 ? ` ×${qtd}` : ''}
              </button>
            )
          })}
        </div>
        <p className="sub" style={{ fontSize: 13 }}>Prata: 3 missões do dia · Ouro: terminar uma etapa · Diamante: 7 dias seguidos · Cristal: terminar a jornada</p>
      </div>

      {oferta && (
        <div className="card oferta">
          <p className="eyebrow">Para o seu próximo passo</p>
          <h3>{PRODUTOS[oferta].nome}</h3>
          <p className="sub">{OFERTAS[oferta as Exclude<typeof oferta, 'kit'>].gancho}</p>
          <button className="btn fita" onClick={() => ir({ t: 'oferta', p: oferta, origem: 'painel' })}>Ver como funciona · R${reais(PRODUTOS[oferta].precoCentavos)}</button>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>Meus materiais</h3><span className="sub" style={{ fontSize: 13 }}>tudo aberto</span></div>
        <div className="lista">
          {eu.acesso.materiais.slice(0, 3).map((m) => (
            <button key={m} className="item" onClick={() => (m === 'ebook' ? ir({ t: 'receitas' }) : ir({ t: 'ler', m, p: 1 }))}>
              <span>{MATERIAIS[m].icone}</span><span style={{ minWidth: 0 }}>{MATERIAIS[m].titulo}</span>
              <span className={`tag ${MATERIAIS[m].rotulo === 'presente' ? 'presente' : ''}`}>{MATERIAIS[m].rotulo ?? 'aberto'}</span>
            </button>
          ))}
        </div>
        <button className="btn leve" onClick={() => ir({ t: 'materiais' })}>Ver todos ({eu.acesso.materiais.length})</button>
      </div>

      <button className="btn leve" onClick={() => ir({ t: 'conquistas' })}>🏅 Minhas Conquistas ({estado.selos.length})</button>
      <button className="btn leve" onClick={() => ir({ t: 'jornada' })}>Ver a jornada completa</button>
      <p className="sub" style={{ fontSize: 13, textAlign: 'center' }}>Precisa de ajuda? <Suporte /></p>
      <button className="link" onClick={sair}>Sair</button>
      <Instalar />
    </>
  )
}

interface PedidoInstalar extends Event { prompt(): Promise<void> }

function Instalar() {
  const ler = () => { try { return localStorage.getItem('fornada-instalar') === '1' } catch { return false } }
  const [visto, setVisto] = useState(ler)
  const [pedido, setPedido] = useState<PedidoInstalar | null>(null)
  const instalado = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches
  useEffect(() => {
    const f = (e: Event) => { e.preventDefault(); setPedido(e as PedidoInstalar) }
    addEventListener('beforeinstallprompt', f)
    return () => removeEventListener('beforeinstallprompt', f)
  }, [])
  if (visto || instalado) return null
  const fechar = () => { try { localStorage.setItem('fornada-instalar', '1') } catch { /* sem armazenamento */ } setVisto(true) }
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="inst-t">
      <div className="card pop" style={{ gap: 12 }}>
        <h3 id="inst-t">📲 Coloque o app na tela do seu celular</h3>
        {pedido ? (
          <button className="btn" onClick={() => pedido.prompt().finally(fechar)}>Colocar na tela</button>
        ) : (
          <ol className="passos">
            <li><b>Android:</b> toque nos 3 pontinhos do navegador e em "Adicionar à tela inicial".</li>
            <li><b>iPhone:</b> toque em Compartilhar e em "Adicionar à Tela de Início".</li>
          </ol>
        )}
        {!pedido && <button className="btn" onClick={fechar}>Já coloquei</button>}
        <button className="link" onClick={fechar}>Depois</button>
      </div>
    </div>
  )
}
