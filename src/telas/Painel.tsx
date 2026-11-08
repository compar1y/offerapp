import { capa, cena, fotoBau, fotoEtapa, mockup } from '../imagens'
import { RECEITAS } from '../../shared/receitas'
import { useEffect, useState } from 'react'
import { MATERIAIS, PRODUTOS } from '../../shared/catalogo'
import { ETAPAS, OFERTAS, PERFIS, TODAS_LICOES } from '../../shared/conteudo'
import { hojeBR, type BauId } from '../../shared/jogo'
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
  const { eu, estado, ir, evento, recarregar, sair } = useApp()
  const perfil = PERFIS[eu.perfil ?? 'iniciante']
  const prox = proximaLicao(perfil.comecaEm, estado.licoes)
  const oferta = perfil.ofertas.find((p) => ofertaDisponivel(eu, p))
  const dias = diasParaNatal()
  const temReceitas = eu.acesso.materiais.includes('ebook')
  const proxReceita = RECEITAS.find((r) => !estado.receitas.includes(r.n)) ?? RECEITAS[0]
  const bonus = eu.acesso.materiais.filter((m) => m !== 'ebook' && m !== 'fichas-socorro')
  const bausProntos = estado.baus.length

  useEffect(() => {
    if (oferta) evento('oferta.vista', { produto: oferta, onde: 'painel' })
  }, [oferta, evento])

  return (
    <>
      <p className="marca">Fábrica de Panetones Caseiros</p>
      <div className="ola">
        <h1>Olá{eu.apelido ? `, ${eu.apelido}` : ''}! 👋</h1>
        {dias > 0 && <span className="chip natal-chip">🎄 Natal em {dias} {dias === 1 ? 'dia' : 'dias'}</span>}
      </div>

      {eu.acesso.pendentes.length > 0 && (
        <div className="aviso">
          <b>⏳ Pagamento aguardando</b>
          <span>{eu.acesso.pendentes.map((p) => PRODUTOS[p].nome).join(', ')}: libera aqui assim que o pagamento cair.</span>
          <button className="btn leve" onClick={() => recarregar()}>Já paguei, conferir</button>
        </div>
      )}

      {/* 1. o que ela comprou, primeiro e grande */}
      {temReceitas && (
        <div className="card destaque">
          <img className="capa-destaque" src={capa('ebook')} alt="" />
          <div className="destaque-txt">
            <p className="eyebrow">Seu livro de receitas</p>
            <h2>100 receitas de panetone</h2>
            <p className="sub">Com foto de cada passo. Toque para abrir.</p>
          </div>
          <button className="btn grande" onClick={() => ir({ t: 'receitas' })}>📖 Abrir minhas receitas</button>
          <button className="btn leve" onClick={() => ir({ t: 'ler', m: 'ebook', p: proxReceita.n })}>
            {estado.receitas.length ? 'Próxima' : 'Comece pela'} Receita {String(proxReceita.n).padStart(3, '0')}: {proxReceita.titulo}
          </button>
        </div>
      )}

      {/* 2. socorro sempre à mão */}
      <button className="cartao-cena sos-cena" onClick={() => ir({ t: 'sos' })}>
        <img src={cena('sos')} alt="" />
        <span><b>🆘 Deu algo errado na massa?</b>Toque aqui e veja como salvar.</span>
      </button>

      {/* 3. os bônus, com capa */}
      {bonus.length > 0 && (
        <div className="card">
          <div className="titulo-linha"><h3>Seus bônus</h3><button className="link" onClick={() => ir({ t: 'materiais' })}>Ver todos</button></div>
          <div className="fileira">
            {bonus.map((m) => (
              <button key={m} className="mini-capa" onClick={() => ir({ t: 'ler', m, p: 1 })}>
                <img src={capa(m)} alt="" loading="lazy" />
                <span>{MATERIAIS[m].titulo.replace(/^Bônus \d+: /, '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. o passo a passo, um de cada vez */}
      {!eu.perfil ? (
        <div className="card">
          <p className="eyebrow">Opcional · 1 minuto</p>
          <h3>Quer um passo a passo feito para você até o Natal?</h3>
          <p className="sub">Responda 5 perguntas e o app monta o seu caminho.</p>
          <button className="btn leve" onClick={() => ir({ t: 'pergunta' })}>Responder as perguntas</button>
        </div>
      ) : prox ? (
        <div className="card etapa-card">
          <img className="foto-etapa" src={fotoEtapa(prox.etapa.n)} alt="" loading="lazy" />
          <p className="eyebrow">Seu próximo passo · uns {prox.licao.minutos} minutos</p>
          <h3>{prox.licao.titulo}</h3>
          <div className="barra"><i style={{ width: `${(estado.licoes.length / TODAS_LICOES.length) * 100}%` }} /></div>
          <p className="sub" style={{ fontSize: 14 }}>{estado.licoes.length} de {TODAS_LICOES.length} passos feitos</p>
          <button className="btn" onClick={() => ir({ t: 'licao', id: prox.licao.id })}>Fazer agora</button>
        </div>
      ) : null}

      {/* 5. próximo produto, com a capa */}
      {oferta && (
        <button className="card oferta-mini" onClick={() => ir({ t: 'oferta', p: oferta, origem: 'painel' })}>
          <img src={mockup(oferta) ?? capa(PRODUTOS[oferta].libera[0])} alt="" loading="lazy" />
          <span>
            <small>🔒 Livro extra, vendido à parte</small>
            <b>{PRODUTOS[oferta].nome}</b>
            <span className="sub">{OFERTAS[oferta as Exclude<typeof oferta, 'kit'>].gancho}</span>
            <span className="tag comprar">Liberar · R${reais(PRODUTOS[oferta].precoCentavos)}</span>
          </span>
        </button>
      )}

      {/* 6. o jogo fica por último, numa linha só */}
      <button className="card presentes-linha" onClick={() => ir({ t: 'loja' })}>
        <img src={fotoBau('ouro')} alt="" loading="lazy" />
        <span>
          <b>Presentes e moedas</b>
          <span className="sub">🪙 {estado.moedas} moedas · 🔥 {estado.seq.dias} {estado.seq.dias === 1 ? 'dia seguido' : 'dias seguidos'}{bausProntos ? ` · 🎁 ${bausProntos} para abrir` : ''}</span>
        </span>
      </button>

      <p className="sub" style={{ fontSize: 14, textAlign: 'center' }}>Precisa de ajuda? <Suporte /></p>
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
