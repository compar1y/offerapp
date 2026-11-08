import { useState } from 'react'
import { RECEITAS } from '../../shared/receitas'
import { useApp } from '../ctx'
import { fotoReceita } from '../imagens'

const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function Receitas() {
  const { estado, ir, voltar } = useApp()
  const [busca, setBusca] = useState('')
  const q = semAcento(busca.trim())
  const lista = RECEITAS.filter((r) => !q || semAcento(`${r.titulo} ${r.grupo} ${r.n}`).includes(q))
  const grupos = [...new Set(lista.map((r) => r.grupo))]
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <h1>100 receitas</h1>
      <label htmlFor="busca" className="sub" style={{ fontWeight: 700 }}>Buscar receita</label>
      <input id="busca" type="text" placeholder="Ex.: maracujá, brigadeiro, air fryer" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
      <p className="sub" style={{ fontSize: 13 }}>
        {lista.length} receitas{estado.receitas.length ? ` · ${estado.receitas.length} feitas por você` : ''}
      </p>
      {grupos.length === 0 && <p>Nenhuma receita com esse nome. Tente outra palavra.</p>}
      {grupos.map((g) => (
        <div key={g} className="card">
          <h3>{g}</h3>
          <div className="grade">
            {lista.filter((r) => r.grupo === g).map((r) => {
              const ok = estado.receitas.includes(r.n)
              return (
                <button key={r.n} className="cartao-foto" onClick={() => ir({ t: 'ler', m: 'ebook', p: r.n })}>
                  <img src={fotoReceita(r.n)} alt="" loading="lazy" />
                  {ok && <span className="selo-ok">✓ feita</span>}
                  <span className="num">{String(r.n).padStart(3, '0')}</span>
                  <span className="tit">{r.titulo}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
