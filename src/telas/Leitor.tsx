import { useEffect, useRef, useState } from 'react'
import { MATERIAIS, type MaterialId } from '../../shared/catalogo'
import { RECEITAS } from '../../shared/receitas'
import { fazerReceita } from '../../shared/jogo'
import { urlPagina } from '../api'
import { ofertaDisponivel, temMaterial, useApp } from '../ctx'

/** páginas em pé têm 1054×1492; o Caderninho é deitado. Serve só para reservar o espaço antes da imagem chegar. */
const proporcao = (m: MaterialId) => (m === 'caderninho' ? '1.414 / 1' : '1054 / 1492')

/**
 * Leitor em rolagem contínua: todas as páginas uma embaixo da outra, como um PDF no celular.
 * As imagens só carregam quando chegam perto da tela (loading="lazy"). Abre já na página pedida.
 */
export function Leitor({ m, p: inicial }: { m: MaterialId; p: number }) {
  const { eu, estado, ir, voltar, mudar, evento, toast } = useApp()
  const mostrarRecheios = m === 'ebook' && ofertaDisponivel(eu, 'recheios')
  const mat = MATERIAIS[m]
  const alvo = Math.min(Math.max(1, inicial), mat.paginas)
  const [atual, setAtual] = useState(alvo)
  const [erros, setErros] = useState<Set<number>>(new Set())
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const vistas = useRef<Set<number>>(new Set())

  // abre na página pedida (ex.: Receita 37 ou a ficha do SOS)
  useEffect(() => {
    if (alvo > 1) refs.current[alvo - 1]?.scrollIntoView({ block: 'start' })
  }, [alvo])

  // descobre qual página está na tela: atualiza o contador, guarda a posição e registra a leitura uma vez por página
  useEffect(() => {
    const obs = new IntersectionObserver(
      (itens) => {
        for (const it of itens) {
          if (!it.isIntersecting) continue
          const p = Number((it.target as HTMLElement).dataset.p)
          setAtual(p)
          const st = history.state as { t?: string; m?: string } | null
          if (st?.t === 'ler' && st.m === m) history.replaceState({ t: 'ler', m, p }, '')
          if (vistas.current.has(p)) continue
          vistas.current.add(p)
          if (m === 'ebook') evento('receita.aberta', { n: p })
          else if (m === 'fichas-socorro' && p >= 4 && p <= 24) evento('sos.aberto', { ficha: p - 3 })
          else evento('pagina.aberta', { m, p })
        }
      },
      { rootMargin: '-45% 0px -50% 0px' }, // conta a página que cruza o meio da tela
    )
    refs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [m, evento])

  if (!temMaterial(eu, m)) {
    return (
      <>
        <button className="voltar" onClick={voltar}>← Voltar</button>
        <div className="card"><h3>{mat.titulo}</h3><p>Este material ainda não está no seu acesso.</p></div>
      </>
    )
  }

  const paginas = Array.from({ length: mat.paginas }, (_, i) => i + 1)

  return (
    <>
      <div className="leitor-topo">
        <button className="voltar" onClick={voltar}>← Voltar</button>
        <span className="sub">pág. {atual} de {mat.paginas}</span>
      </div>
      <h2>{mat.titulo}</h2>
      <div className="rolagem">
        {paginas.map((p) => {
          const receita = m === 'ebook' ? RECEITAS[p - 1] : null
          const feita = receita ? estado.receitas.includes(receita.n) : false
          return (
            <div key={p} className="folha" data-p={p} ref={(el) => { refs.current[p - 1] = el }}>
              {erros.has(p) ? (
                <div className="vazio" style={{ aspectRatio: proporcao(m) }}>
                  {import.meta.env.VITE_DEMO === '1' ? 'Na prévia só algumas páginas vieram junto. No app de verdade, todas abrem aqui.' : 'Não consegui abrir esta página. Confira a internet.'}
                </div>
              ) : (
                <img
                  src={urlPagina(m, p)}
                  alt={receita ? `Receita ${receita.n}: ${receita.titulo}` : `Página ${p} de ${mat.titulo}`}
                  loading={Math.abs(p - alvo) <= 1 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ aspectRatio: proporcao(m) }}
                  onError={() => setErros((s) => new Set(s).add(p))}
                />
              )}
              {receita && (
                <button
                  className="btn"
                  disabled={feita}
                  onClick={() => {
                    mudar((e) => fazerReceita(e, receita.n))
                    evento('receita.feita', { n: receita.n })
                    toast('Receita marcada como feita ✓')
                  }}
                >
                  {feita ? `Receita ${receita.n} feita ✓` : `Fiz a receita ${receita.n} ✓`}
                </button>
              )}
              {receita && mostrarRecheios && (
                <button
                  className="faixa-recheio"
                  onClick={() => {
                    evento('inicio.clique', { botao: 'extra.recheios', origem: 'fim-receita', n: receita.n })
                    ir({ t: 'oferta', p: 'recheios', origem: 'receita' })
                  }}
                >
                  <b aria-hidden="true">★</b>
                  <span>Quer rechear este panetone?<small>Veja os 10 Recheios que Mais Vendem</small></span>
                  <i aria-hidden="true">›</i>
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button className="btn leve" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑ Voltar ao topo</button>
    </>
  )
}
