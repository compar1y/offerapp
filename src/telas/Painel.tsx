import { capa, cena } from '../imagens'
import type { Eu } from '../api'
import { RECEITAS } from '../../shared/receitas'
import { useEffect, useState } from 'react'
import { MATERIAIS, PRODUTOS, type ProdutoId } from '../../shared/catalogo'
import { ETAPAS } from '../../shared/conteudo'
import { hojeBR, type BauId } from '../../shared/jogo'
import { ganhaPresente, ofertaDisponivel, precoPresente, presenteValendo, tem, textoFaixa, textoPresente, useApp } from '../ctx'
import { AvisoPresente, FaixaDesconto, useRelogio } from './PresenteDesconto'
import { Suporte } from './Entrar'
import { VIDEOAULAS } from './OfertaVideo'
import { AULAS } from '../../shared/aulas'
import { podeVerAulas } from '../aulas'
import { VitrineEtiquetas } from './Etiquetas'

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
// 'contafeita' só aparece com CONTAFEITA_VENDA_LIGADA = true em shared/catalogo.ts (ofertaDisponivel)
export const EXTRAS: ProdutoId[] = ['recheios', 'encomenda', 'etiquetas', 'contafeita']
/** produtos comprados à parte (mostrados em "Minhas compras") */
const COMPRAS_EXTRAS: ProdutoId[] = ['recheios', 'encomenda', 'primeira']

/** o que aparece na Seleção especial do Início: os extras à venda que ela ainda não comprou (+ Videoaulas).
 *  É a mesma lista que a bolinha da barra de baixo conta. */
export function ofertasSelecao(eu: Eu): ProdutoId[] {
  const extras = EXTRAS.filter((p) => ofertaDisponivel(eu, p))
  return [...extras, ...(VIDEOAULAS.mostrar && !podeVerAulas(eu) ? ['videoaulas' as ProdutoId] : [])]
}

/** id da seção, para a barra de baixo rolar até ela */
export const ID_SELECAO = 'selecao-especial'

/** Início = área de membros: o que ela comprou primeiro, extras com preço embaixo. Uma tela só. */
export function Painel() {
  const { eu, estado, ir, evento, recarregar, sair } = useApp()
  const temReceitas = eu.acesso.materiais.includes('ebook')
  const proxReceita = RECEITAS.find((r) => !estado.receitas.includes(r.n)) ?? RECEITAS[0]
  // compras feitas depois do kit (bump dos Recheios, Encomenda, Primeira Encomenda) ficam em "Minhas compras", logo abaixo das receitas
  const compras = [...new Set(COMPRAS_EXTRAS.filter((p) => tem(eu, p)).flatMap((p) => PRODUTOS[p].libera))].filter((m) => eu.acesso.materiais.includes(m))
  const seus = eu.acesso.materiais.filter((m) => m !== 'ebook' && m !== 'fichas-socorro' && !compras.includes(m))
  const aVendaAqui = ofertasSelecao(eu)
  const extras = aVendaAqui.filter((p) => p !== 'videoaulas')
  const presente = aVendaAqui.map((p) => precoPresente(eu, p)).find(Boolean) ?? null
  useRelogio(presente?.ate) // quando o prazo acaba, a faixa e os preços com desconto somem sozinhos
  const avisoPresente = !presente && aVendaAqui.some((p) => ganhaPresente(eu, p))
  const clique = (botao: string) => evento('inicio.clique', { botao })
  const aulas = podeVerAulas(eu)
  // quem já pode ver as aulas não vê a oferta delas
  const mostrarOfertaVideo = VIDEOAULAS.mostrar && !aulas
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

      {/* 1a. aulas em vídeo (liberadas pela compra das Videoaulas ou, com a flag, pelo kit) */}
      {aulas && (
        <div className="video-upsell aulas-entrada">
          <button className="video-tela" aria-label="Abrir as aulas em vídeo" onClick={() => { clique('aulas'); ir({ t: 'aulas' }) }}>
            <img src={cena('aulas-em-video')} alt="" loading="lazy" style={{ objectPosition: '80% 50%' }} />
            <span className="play" aria-hidden="true">▶</span>
            <span className="video-titulo">Aulas em vídeo · {(estado.aulas ?? []).length} de {AULAS.length} assistidas</span>
          </button>
          <button className="btn" onClick={() => { clique('aulas'); ir({ t: 'aulas' }) }}>▶ Assistir às aulas</button>
        </div>
      )}

      {/* 1a2. Imagens e Etiquetas: gerador com o nome dela */}
      {tem(eu, 'etiquetas') && (
        <button className="cartao-cena etiquetas-entrada" onClick={() => { clique('etiquetas'); ir({ t: 'etiquetas' }) }}>
          <VitrineEtiquetas compacta />
          <span><b>🏷️ Imagens e Etiquetas com o Seu Nome</b>Toque para gerar as imagens e o PDF com o seu nome.</span>
        </button>
      )}

      {/* 1a3. Respostas com a Conta Feita: a ferramenta de encomenda */}
      {tem(eu, 'contafeita') && (
        <button className="card contafeita-entrada" onClick={() => { clique('contafeita'); ir({ t: 'contafeita' }) }}>
          <img src="/img/mockups/contafeita.webp" alt="" loading="lazy" />
          <span><b>💬 Respostas com a Conta Feita</b>Preencha a encomenda da cliente e copie as respostas prontas, com a conta feita.</span>
        </button>
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
      {(extras.length > 0 || mostrarOfertaVideo) && (
        <div className="card extras-card" id={ID_SELECAO}>
          <span className="selo-extras"><b className="estrela" aria-hidden="true">★</b> Seleção especial</span>
          <h3>Mais materiais da Fábrica</h3>
          <p className="sub-extras">Para quem quer ir além das receitas. <span className="dinheiro-pulsa" aria-hidden="true">💰</span></p>
          {/* presente de 30% por 3 h (primeira compra ou popup): vale nas Aulas, nas Etiquetas e no Conta Feita */}
          {presente ? <FaixaDesconto pct={presente.pct} ate={presente.ate} titulo={presenteValendo(eu) ? undefined : 'Seu presente da sua compra'} texto={textoFaixa(eu)} /> : avisoPresente && <AvisoPresente compacto texto={textoPresente(eu)} />}
          {(presente || avisoPresente) && <span className="seta-pulsa" aria-hidden="true">⬇</span>}
          {mostrarOfertaVideo && (
            <div className="video-upsell">
              <button className="video-tela" aria-label="Assistir às videoaulas" onClick={abrirVideoaulas}>
                <img src={cena('videoaulas')} alt="" loading="lazy" />
                <span className="play" aria-hidden="true">▶</span>
                {precoPresente(eu, 'videoaulas') && <span className="selo-off">-{precoPresente(eu, 'videoaulas')!.pct}%</span>}
                <span className="video-titulo">{VIDEOAULAS.titulo}</span>
              </button>
              <button className="btn-extra btn-video" onClick={abrirVideoaulas}>▶ Quero assistir às aulas</button>
            </div>
          )}
          <div className={`grade-extras${extras.length === 1 ? ' uma' : ''}`}>
            {extras.map((p) => (
              <button key={p} className="mini-capa" onClick={() => { clique(`extra.${p}`); ir({ t: 'oferta', p, origem: 'painel' }) }}>
                {/* Etiquetas e Conta Feita: a capa é quadrada (as versões -capa.webp tinham faixas borradas em cima e embaixo) */}
                {p === 'etiquetas' || p === 'contafeita'
                  ? <img className="capa-quadrada" src={`/img/mockups/${p}.webp`} alt="" loading="lazy" />
                  : <img src={capa(PRODUTOS[p].libera[0])} alt="" loading="lazy" />}
                {precoPresente(eu, p) && <span className="selo-off">-{precoPresente(eu, p)!.pct}%</span>}
                <span>{PRODUTOS[p].nome}</span>
                {p === 'etiquetas' && <span className="mini-capa-sub">✍️ Digite o nome e sai pronto, com a sua marca</span>}
                {p === 'recheios' && <span className="mini-capa-sub">Faz a pessoa pedir outro. Dá pra cobrar o sabor a mais.</span>}
                {p === 'encomenda' && <span className="mini-capa-sub">A primeira encomenda, a cliente que volta e a que traz outra.</span>}
                {p === 'contafeita' && <span className="mini-capa-sub">Preencha uma vez e receba tudo pronto, com a conta feita.</span>}
                {p === 'contafeita' && <span className="mini-capa-sub2">Orçamento e mensagens do kit, prontos para copiar e cobrar certo.</span>}
                <span className="btn-extra">{p === 'etiquetas' ? '🏷️ Quero com o meu nome' : p === 'contafeita' ? '💬 Quero minhas respostas prontas' : p === 'recheios' ? '📖 Quero os 10 recheios' : p === 'encomenda' ? '📖 Quero minhas clientes' : '📖 Ver material'}</span>
              </button>
            ))}
          </div>
        </div>
      )}


      <div className="ajuda-bloco">
        <p className="sub" style={{ fontSize: 15, textAlign: 'center', margin: 0 }}>Precisa de ajuda?</p>
        <Suporte />
      </div>
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
