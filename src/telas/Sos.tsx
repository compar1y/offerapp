import { useEffect } from 'react'
import { SOS, SOS_CHECAGEM_PAGINA, SOS_LER_ANTES_PAGINAS } from '../../shared/receitas'
import { useApp } from '../ctx'
import { fotoSos } from '../imagens'

export function Sos() {
  const { ir, voltar, mudar } = useApp()
  useEffect(() => {
    mudar((e) => (e.selos.includes('sos-usado') ? e : { ...e, selos: [...e.selos, 'sos-usado'] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <p className="eyebrow">SOS Massa · seu presente</p>
      <h1>O que você está vendo?</h1>
      <p className="sub">Calma, quase todo mundo erra a primeira. Toque no problema e abre a ficha certa, com "dá pra salvar agora?" e "na próxima fornada".</p>
      {SOS.map(([grupo, itens]) => (
        <div key={grupo} className="card">
          <h3>{grupo}</h3>
          <div className="licoes">
            {itens.map(([t, p]) => (
              <button key={p} className="licao com-foto" onClick={() => ir({ t: 'ler', m: 'fichas-socorro', p })}>
                <img src={fotoSos(p - 3)} alt="" loading="lazy" />
                <span><small>Ficha {String(p - 3).padStart(2, '0')}</small>{t}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn leve" onClick={() => ir({ t: 'ler', m: 'fichas-socorro', p: SOS_CHECAGEM_PAGINA })}>✅ Checagem de 1 minuto antes de cada fornada</button>
      <div className="card">
        <h3>Antes da primeira fornada</h3>
        <p className="sub">Leia estas 3 fichas: são os erros mais comuns.</p>
        <div className="chips">
          {SOS_LER_ANTES_PAGINAS.map((p) => (
            <button key={p} className="chip" style={{ cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }} onClick={() => ir({ t: 'ler', m: 'fichas-socorro', p })}>Ficha {String(p - 3).padStart(2, '0')}</button>
          ))}
        </div>
      </div>
    </>
  )
}
