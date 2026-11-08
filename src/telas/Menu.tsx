import { useApp, type Tela } from '../ctx'

type Aba = { id: string; nome: string; ico: string; vai: Tela; ativa: (t: Tela) => boolean }

const ABAS: Aba[] = [
  { id: 'inicio', nome: 'Início', ico: '🏠', vai: { t: 'painel' }, ativa: (t) => t.t === 'painel' },
  { id: 'receitas', nome: 'Receitas', ico: '📖', vai: { t: 'receitas' }, ativa: (t) => t.t === 'receitas' || (t.t === 'ler' && t.m === 'ebook') },
  { id: 'sos', nome: 'Socorro', ico: '🆘', vai: { t: 'sos' }, ativa: (t) => t.t === 'sos' || (t.t === 'ler' && t.m === 'fichas-socorro') },
  { id: 'materiais', nome: 'Meus livros', ico: '📚', vai: { t: 'materiais' }, ativa: (t) => t.t === 'materiais' || (t.t === 'ler' && t.m !== 'ebook' && t.m !== 'fichas-socorro') },
  { id: 'jornada', nome: 'Passos', ico: '✅', vai: { t: 'jornada' }, ativa: (t) => t.t === 'jornada' || t.t === 'licao' },
]

const SEM_MENU = new Set(['boas', 'pergunta', 'resultado', 'avatar'])

/** barra de baixo, em formato de pílula, como a de um celular: 5 abas com nomes simples.
 *  Presentes e moedas ficam no Início (não são o que ela comprou). */
export function Menu({ tela }: { tela: Tela }) {
  const { ir, trocar } = useApp()
  if (SEM_MENU.has(tela.t)) return null
  return (
    <nav className="menu" aria-label="Menu">
      <div className="abas">
        {ABAS.map((a) => {
          const on = a.ativa(tela)
          return (
            <button key={a.id} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}
              onClick={() => (on ? window.scrollTo({ top: 0, behavior: 'smooth' }) : a.id === 'inicio' ? trocar(a.vai) : ir(a.vai))}>
              <span aria-hidden="true">{a.ico}</span>{a.nome}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
