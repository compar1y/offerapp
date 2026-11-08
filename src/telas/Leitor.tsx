import { useEffect, useState } from 'react'
import { MATERIAIS, type MaterialId } from '../../shared/catalogo'
import { RECEITAS } from '../../shared/receitas'
import { fazerReceita, MOEDAS } from '../../shared/jogo'
import { urlPagina } from '../api'
import { temMaterial, useApp } from '../ctx'

const lerZoom = () => { try { return Number(localStorage.getItem('fornada-zoom')) || 100 } catch { return 100 } }

/** leitor de páginas dentro do app: as imagens vêm do armazenamento privado por link temporário */
export function Leitor({ m, p: inicial }: { m: MaterialId; p: number }) {
  const { eu, estado, voltar, mudar, evento, toast, ir } = useApp()
  const mat = MATERIAIS[m]
  const [p, setP] = useState(Math.min(Math.max(1, inicial), mat.paginas))
  const [zoom, setZoom] = useState(lerZoom)
  const [carregou, setCarregou] = useState<'sim' | 'nao' | 'erro'>('nao')
  const receita = m === 'ebook' ? RECEITAS[p - 1] : null
  const feita = receita ? estado.receitas.includes(receita.n) : false

  useEffect(() => {
    setCarregou('nao')
    history.replaceState({ t: 'ler', m, p }, '')
    if (m === 'ebook') evento('receita.aberta', { n: p })
    else if (m === 'fichas-socorro' && p >= 4 && p <= 24) evento('sos.aberto', { ficha: p - 3 })
    else evento('pagina.aberta', { m, p })
    // já pede a próxima página para virar sem esperar
    if (p < mat.paginas) new Image().src = urlPagina(m, p + 1)
  }, [m, p, mat.paginas, evento])

  const mudarZoom = (d: number) => {
    const z = Math.min(250, Math.max(100, zoom + d * 25))
    setZoom(z)
    try { localStorage.setItem('fornada-zoom', String(z)) } catch { /* sem armazenamento */ }
  }

  if (!temMaterial(eu, m)) {
    return (
      <>
        <button className="voltar" onClick={voltar}>← Voltar</button>
        <div className="card"><h3>{mat.titulo}</h3><p>Este material ainda não está no seu acesso.</p></div>
      </>
    )
  }

  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <p className="eyebrow">{mat.titulo} · pág. {p} de {mat.paginas}</p>
      {receita && <h2>Receita {String(receita.n).padStart(3, '0')} · {receita.titulo}</h2>}
      <div className="leitor">
        {carregou !== 'sim' && (
          <div className="vazio">{carregou === 'erro' ? 'Não consegui abrir esta página. Confira a internet e toque em Próxima ou Voltar.' : 'Abrindo a página…'}</div>
        )}
        <img
          key={p}
          src={urlPagina(m, p)}
          alt={`Página ${p} de ${mat.titulo}`}
          style={{ width: `${zoom}%`, display: carregou === 'sim' ? 'block' : 'none' }}
          onLoad={() => setCarregou('sim')}
          onError={() => setCarregou('erro')}
        />
      </div>
      <div className="chips" style={{ justifyContent: 'center' }}>
        <button className="chip" onClick={() => mudarZoom(-1)} disabled={zoom <= 100} style={{ cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>➖ Diminuir</button>
        <button className="chip" onClick={() => mudarZoom(1)} disabled={zoom >= 250} style={{ cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>➕ Aumentar</button>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn leve" onClick={() => setP(p - 1)} disabled={p <= 1}>← Anterior</button>
        <button className="btn leve" onClick={() => setP(p + 1)} disabled={p >= mat.paginas}>Próxima →</button>
      </div>
      {receita && (
        <button
          className="btn"
          disabled={feita}
          onClick={() => {
            mudar((e) => fazerReceita(e, receita.n))
            evento('receita.feita', { n: receita.n })
            toast(`+${MOEDAS.receita} 🪙 Receita feita!`)
          }}
        >
          {feita ? 'Você já fez esta ✓' : `Fiz esta receita! (+${MOEDAS.receita} 🪙)`}
        </button>
      )}
      {m === 'fichas-socorro' && p >= 4 && p <= 24 && <button className="btn" onClick={() => ir({ t: 'painel' })}>Entendi, voltar ao painel</button>}
    </>
  )
}
