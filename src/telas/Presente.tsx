import { useState } from 'react'
import { PRODUTOS, type ProdutoId } from '../../shared/catalogo'
import { CUSTO_PRESENTE, diasQueFaltam, LIVROS_PRESENTE, MOEDAS_POR_DIA } from '../../shared/presente'
import { api, ErroApi } from '../api'
import { ofertaDisponivel, reais, tem, useApp } from '../ctx'
import { capa, cena, mockup } from '../imagens'
import { DESEJO } from './Materiais'

const imagem = (p: ProdutoId) => mockup(p) ?? capa(PRODUTOS[p].libera[0])

/**
 * Presente da Fábrica: 🪙10 por dia em que ela entra no app (o servidor conta), e com 🪙50 ela escolhe 1 livro grátis.
 * Depois da escolha, um aviso oferece os outros livros.
 */
export function PresenteDaFabrica() {
  const { eu, ir, voltar, evento, recarregar, toast } = useApp()
  const p = eu.presente
  const [confirmar, setConfirmar] = useState<ProdutoId | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [ganhou, setGanhou] = useState<ProdutoId | null>(null)
  const pode = !p.escolhido && p.moedas >= CUSTO_PRESENTE
  const livros = LIVROS_PRESENTE.filter((x) => x === p.escolhido || !tem(eu, x))
  const outros = (escolhido: ProdutoId) => LIVROS_PRESENTE.filter((x) => x !== escolhido && ofertaDisponivel(eu, x))
  const faltam = diasQueFaltam(p)

  async function escolher(x: ProdutoId) {
    setEnviando(true)
    try {
      await api.presente(x)
      await recarregar()
      setConfirmar(null)
      setGanhou(x)
      evento('oferta.vista', { produto: 'presente-promo', onde: 'presente' })
    } catch (e) {
      toast(e instanceof ErroApi ? e.message : 'Não deu certo. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <img className="foto-faixa" src={cena('presentes')} alt="" />
      <p className="eyebrow">Presente da Fábrica</p>
      <h1>{p.escolhido ? 'Seu presente já é seu' : 'Escolha 1 material de presente'}</h1>
      {!p.escolhido && (
        <p>Cada dia que você abre o app, ganha <b>🪙{MOEDAS_POR_DIA}</b>. Juntou <b>🪙{CUSTO_PRESENTE}</b>, escolhe 1 destes materiais, de graça. Vale 1 por pessoa.</p>
      )}

      {!p.escolhido && (
        <div className="card saldo">
          <b>🪙 {Math.min(p.moedas, CUSTO_PRESENTE)} de {CUSTO_PRESENTE} moedas</b>
          <div className="barra"><i style={{ width: `${Math.min(100, (p.moedas / CUSTO_PRESENTE) * 100)}%` }} /></div>
          <span className="sub">{pode ? 'Pronto! Escolha o seu material aqui embaixo.' : `Faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}. É só abrir o app amanhã de novo.`}</span>
        </div>
      )}

      {livros.length === 0 && <div className="card"><p>Você já tem todos os materiais. Obrigada por estar com a gente! 💛</p></div>}

      <div className="lista">
        {livros.map((x) => {
          const meu = p.escolhido === x
          return (
            <div key={x} className={`card livro-presente${meu ? ' meu' : ''}`}>
              <img src={imagem(x)} alt="" loading="lazy" />
              <span>
                <b>{PRODUTOS[x].nome}</b>
                <span className="sub">{DESEJO[x]}</span>
                {meu ? (
                  <button className="btn" onClick={() => ir({ t: 'ler', m: PRODUTOS[x].libera[0], p: 1 })}>🎁 Abrir meu presente</button>
                ) : (
                  <>
                    <span className="preco-presente"><s>R${reais(PRODUTOS[x].precoCentavos)}</s> <b>Grátis com 🪙{CUSTO_PRESENTE}</b></span>
                    {!p.escolhido && <button className="btn" disabled={!pode} onClick={() => setConfirmar(x)}>{pode ? 'Escolher este' : '🔒 Junte as moedas'}</button>}
                  </>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {confirmar && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="conf-t">
          <div className="card pop" style={{ gap: 12 }}>
            <h3 id="conf-t">Escolher "{PRODUTOS[confirmar].nome}"?</h3>
            <p className="sub">Você só pode escolher 1 material de presente. Depois de escolher, não dá para trocar.</p>
            <button className="btn" disabled={enviando} onClick={() => escolher(confirmar)}>{enviando ? 'Liberando…' : 'Sim, quero este'}</button>
            <button className="link" onClick={() => setConfirmar(null)}>Ver os outros</button>
          </div>
        </div>
      )}

      {ganhou && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ganhou-t">
          <div className="card pop" style={{ gap: 12 }}>
            <div style={{ fontSize: 56, textAlign: 'center' }}>🎉</div>
            <h3 id="ganhou-t" style={{ textAlign: 'center' }}>"{PRODUTOS[ganhou].nome}" é seu!</h3>
            <button className="btn" onClick={() => ir({ t: 'ler', m: PRODUTOS[ganhou].libera[0], p: 1 })}>🎁 Abrir meu presente</button>
            {outros(ganhou).length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: 6 }}>Aproveite e leve também</p>
                {outros(ganhou).map((x) => (
                  <button key={x} className="card oferta-mini" onClick={() => { setGanhou(null); ir({ t: 'oferta', p: x, origem: 'presente' }) }}>
                    <img src={imagem(x)} alt="" loading="lazy" />
                    <span>
                      <b>{PRODUTOS[x].nome}</b>
                      <span className="sub">{DESEJO[x]}</span>
                      <span className="tag comprar">Quero · R${reais(PRODUTOS[x].precoCentavos)}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
            <button className="link" onClick={() => setGanhou(null)}>Agora não</button>
          </div>
        </div>
      )}
    </>
  )
}
