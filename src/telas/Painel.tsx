import { capa, cena } from '../imagens'
import { RECEITAS } from '../../shared/receitas'
import { useEffect, useState } from 'react'
import { MATERIAIS, PRODUTOS, type ProdutoId } from '../../shared/catalogo'
import { ETAPAS } from '../../shared/conteudo'
import { hojeBR, type BauId } from '../../shared/jogo'
import { ganhaPresente, ofertaDisponivel, precoPresente, tem, useApp } from '../ctx'
import { AvisoPresente, FaixaDesconto } from './PresenteDesconto'
import { Suporte } from './Entrar'
import { VIDEOAULAS } from './OfertaVideo'

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

/** extras vendidos à parte, sempre com preço e a palavra "extra" (aula 21 dicas, dica 6) */
export const EXTRAS: ProdutoId[] = ['recheios', 'encomenda']
/** produtos comprados à parte (mostrados em "Minhas compras") */
const COMPRAS_EXTRAS: ProdutoId[] = ['recheios', 'encomenda', 'primeira']

/** Início = área de membros: o que ela comprou primeiro, extras com preço embaixo. Uma tela só. */
export function Painel() {
  const { eu, estado, ir, evento, recarregar, sair } = useApp()
  const temReceitas = eu.acesso.materiais.includes('ebook')
  const proxReceita = RECEITAS.find((r) => !estado.receitas.includes(r.n)) ?? RECEITAS[0]
  // compras feitas depois do kit (bump dos Recheios, Encomenda, Primeira Encomenda) ficam em "Minhas compras", logo abaixo das receitas
  const compras = [...new Set(COMPRAS_EXTRAS.filter((p) => tem(eu, p)).flatMap((p) => PRODUTOS[p].libera))].filter((m) => eu.acesso.materiais.includes(m))
  const seus = eu.acesso.materiais.filter((m) => m !== 'ebook' && m !== 'fichas-socorro' && !compras.includes(m))
  const extras = EXTRAS.filter((p) => ofertaDisponivel(eu, p))
  const presente = extras.map((p) => precoPresente(eu, p)).find(Boolean) ?? null
  const clique = (botao: string) => evento('inicio.clique', { botao })
  const abrirVideoaulas = () => {
    clique('extra.videoaulas')
    ir({ t: 'videoaulas' })
  }

  useEffect(() => {
    if (extras.length) evento('oferta.vista', { produto: extras.join(','), onde: 'inicio' })
  }, [extras.join(','), evento]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="ola">
        <h1>Olá{eu.apelido ? `, ${eu.apelido}` : ''}! 👋</h1>
      </div>
      <p className="sub">Tudo o que você comprou está aqui. É só tocar.</p>

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
            <p className="eyebrow">Seu material de receitas</p>
            <h2>100 receitas de panetone e chocotone</h2>
          </div>
          <button className="btn grande" onClick={() => { clique('abrir-receitas'); ir({ t: 'ler', m: 'ebook', p: proxReceita.n }) }}>
            📖 Abrir minhas 100 receitas
          </button>
          <button className="btn leve" onClick={() => { clique('procurar-receita'); ir({ t: 'receitas' }) }}>🔎 Procurar uma receita</button>
          <p className="sub" style={{ fontSize: 15, textAlign: 'center' }}>
            {estado.receitas.length ? 'Você parou na' : 'Comece pela'} Receita {String(proxReceita.n).padStart(3, '0')}: {proxReceita.titulo}
          </p>
        </div>
      )}

      {/* 1b. o que ela comprou além do kit */}
      {compras.length > 0 && (
        <div className="card compras-card">
          <h3>🛍️ Minhas compras</h3>
          <div className={`grade-compras${compras.length === 1 ? ' uma' : ''}`}>
            {compras.map((m) => (
              <button key={m} className="mini-capa" onClick={() => { clique(`compra.${m}`); ir({ t: 'ler', m, p: 1 }) }}>
                <img src={capa(m)} alt="" loading="lazy" />
                <span>{MATERIAIS[m].titulo}</span>
                <span className="btn-abrir">📖 Abrir</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. socorro sempre à mão */}
      {eu.acesso.materiais.includes('fichas-socorro') && (
        <button className="cartao-cena sos-cena" onClick={() => { clique('socorro'); ir({ t: 'sos' }) }}>
          <img src={cena('sos')} alt="" />
          <span><b>🆘 Deu problema na massa?</b>Toque aqui e veja como salvar.</span>
        </button>
      )}

      {/* 3. bônus e livros que ela já tem, todos com capa */}
      {seus.length > 0 && (
        <div className="card">
          <h3>Seus bônus e materiais</h3>
          <div className="grade-inicio">
            {seus.map((m) => (
              <button key={m} className="mini-capa" onClick={() => { clique(`material.${m}`); ir({ t: 'ler', m, p: 1 }) }}>
                <img src={capa(m)} alt="" loading="lazy" />
                <span>{MATERIAIS[m].titulo.replace(/^Bônus \d+: /, '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. extras: seção separada, mesma cara dos outros; o toque leva à página de compra (pedido do Levi) */}
      {(extras.length > 0 || VIDEOAULAS.mostrar) && (
        <div className="card extras-card">
          <span className="selo-extras"><b className="estrela" aria-hidden="true">★</b> Seleção especial</span>
          <h3>Mais materiais da Fábrica</h3>
          <p className="sub-extras">Para quem quer ir além das receitas. <span className="dinheiro-pulsa" aria-hidden="true">💰</span></p>
          {presente ? <FaixaDesconto pct={presente.pct} ate={presente.ate} /> : extras.some((p) => ganhaPresente(eu, p)) && <AvisoPresente compacto />}
          {VIDEOAULAS.mostrar && (
            <div className="video-upsell">
              <button className="video-tela" aria-label="Assistir às videoaulas" onClick={abrirVideoaulas}>
                <img src={cena('receitas')} alt="" loading="lazy" />
                <span className="play" aria-hidden="true">▶</span>
                <span className="video-titulo">{VIDEOAULAS.titulo}</span>
              </button>
              <button className="btn-extra btn-video" onClick={abrirVideoaulas}>▶ Assistir às aulas</button>
            </div>
          )}
          <div className={`grade-extras${extras.length === 1 ? ' uma' : ''}`}>
            {extras.map((p) => (
              <button key={p} className="mini-capa" onClick={() => { clique(`extra.${p}`); ir({ t: 'oferta', p, origem: 'painel' }) }}>
                <img src={capa(PRODUTOS[p].libera[0])} alt="" loading="lazy" />
                {precoPresente(eu, p) && <span className="selo-off">-{precoPresente(eu, p)!.pct}%</span>}
                <span>{PRODUTOS[p].nome}</span>
                <span className="btn-extra">📖 Ver material</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="sub" style={{ fontSize: 15, textAlign: 'center' }}>Precisa de ajuda? <Suporte /></p>
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
