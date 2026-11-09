import { MATERIAIS, PRODUTOS, type ProdutoId } from '../../shared/catalogo'
import { LOJA } from '../../shared/conteudo'
import type { SeloId } from '../../shared/jogo'
import { ofertaDisponivel, reais, useApp } from '../ctx'
import { lerRef } from './Jornada'
import { capa } from '../imagens'
import type { MaterialId } from '../../shared/catalogo'

/** frase curta de desejo em cada material com cadeado (sem promessa de ganho com número) */
export const DESEJO: Partial<Record<ProdutoId, string>> = {
  recheios: 'O recheio cremoso que faz a cliente voltar e pedir o segundo panetone.',
  encomenda: 'Cada cliente feliz traz a próxima: o caminho para as encomendas virem até você.',
  primeira: 'Sua primeira encomenda, passo a passo, começando por quem já confia em você.',
}

export function Materiais() {
  const { eu, estado, ir, voltar } = useApp()
  const aVenda = (['recheios', 'encomenda'] as ProdutoId[]).filter((p) => ofertaDisponivel(eu, p))
  const premios = LOJA.filter((i) => estado.itens.includes(i.id))
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <h1>Meus materiais</h1>
      <p className="sub">Tudo o que você comprou está aberto: é só tocar na capa. Os que têm cadeado são materiais extras, vendidos à parte.</p>
      <div className="grade capas">
        {eu.acesso.materiais.map((m) => (
          <button key={m} className="cartao-capa" onClick={() => (m === 'ebook' ? ir({ t: 'receitas' }) : ir({ t: 'ler', m, p: 1 }))}>
            <Capa m={m} />
            <span className="tit">{MATERIAIS[m].titulo}</span>
            {MATERIAIS[m].rotulo === 'presente' && <span className="tag presente">presente</span>}
          </button>
        ))}
        {aVenda.map((p) => (
          <button key={p} className="cartao-capa travado" onClick={() => ir({ t: 'oferta', p, origem: 'materiais' })}>
            <Capa m={PRODUTOS[p].libera[0]} />
            <span className="cadeado" aria-hidden="true">🔒</span>
            <span className="tit">{PRODUTOS[p].nome}</span>
            <span className="desejo">{DESEJO[p]}</span>
            <span className="tag comprar">Liberar · R${reais(PRODUTOS[p].precoCentavos)}</span>
          </button>
        ))}
      </div>
      {premios.length > 0 && (
        <>
          <h3>Prêmios da Lojinha</h3>
          <div className="lista">
            {premios.map((i) => {
              const a = i.ref ? lerRef(i.ref) : null
              return (
                <button key={i.id} className="item" onClick={() => a && ir({ t: 'ler', m: a.m, p: a.p })}>
                  <span>{i.icone}</span><span style={{ minWidth: 0 }}>{i.titulo}</span><span className="tag presente">prêmio</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

const SELOS: { id: SeloId; ico: string; t: string }[] = [
  { id: 'primeira-foto', ico: '📸', t: 'Primeira foto' },
  { id: 'etapa-1', ico: '🥇', t: 'Primeiro panetone' },
  { id: 'etapa-2', ico: '🎀', t: 'Cara de presente' },
  { id: 'etapa-3', ico: '🧮', t: 'Preço certo' },
  { id: 'etapa-4', ico: '📦', t: 'Primeiras encomendas' },
  { id: 'etapa-5', ico: '🎄', t: 'Pronta para o dia 24' },
  { id: 'sete-dias', ico: '🔥', t: '7 dias seguidos' },
  { id: 'cinco-receitas', ico: '📖', t: '5 receitas feitas' },
  { id: 'sos-usado', ico: '🆘', t: 'Salvou a massa' },
]

export function Conquistas() {
  const { estado, voltar } = useApp()
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <h1>Minhas Conquistas</h1>
      <div className="card">
        <div className="selos">
          {SELOS.map((s) => {
            const ok = estado.selos.includes(s.id)
            return (
              <div key={s.id} className={`selo ${ok ? 'ganho' : ''}`} aria-label={`${s.t}: ${ok ? 'conquistado' : 'ainda não'}`}>
                <div className="ico">{s.ico}</div>{s.t}
              </div>
            )
          })}
        </div>
      </div>
      <p className="sub" style={{ textAlign: 'center' }}>{estado.receitas.length} receitas feitas · {estado.licoes.length} lições · {estado.abertos} presentes abertos</p>
    </>
  )
}

/** capa do material; enquanto não tem imagem, mostra o ícone num cartão */
export function Capa({ m }: { m: MaterialId }) {
  return <img className="capa" src={capa(m)} alt="" loading="lazy" />
}
