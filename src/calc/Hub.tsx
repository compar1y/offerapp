// Conta da Fornada: apresentação (quem ainda não tem), hub (quem tem) e "nova conta".
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { brl as brlCat } from '../../shared/catalog'
import { brl, calcular, pctTxt, precoRes, RECEITAS, type Conta } from '../../shared/calc'
import { Picture } from '../components/ui'
import { catalogImage } from '../data/images'
import { owns, useStore } from '../lib/store'
import { BASE, BuyButton, CalcLayout, Honestidade, TOOL, Tabs, UnlockBox, useOwned } from './ui'
import { criarConta, podeNova, useCalc } from './store'
import { secoes } from './helpers'
import { T } from './strings'

function resumo(c: Conta, precos: Parameters<typeof calcular>[1]) {
  const r = calcular(c, precos)
  if (!r.ok || r.c === null) return { texto: 'conta incompleta', ruim: false }
  if (!c.precoCents) return { texto: `custa ${brl(r.c)} por unidade`, ruim: false }
  const p = precoRes(c.precoCents, r.c, r.K, r.L, c.taxaPct, r.s)
  return { texto: `sobra ${brl(p.pi)} por unidade${p.m === null ? '' : ` · ${pctTxt(p.m)}`}`, ruim: p.pi <= 0 }
}

export function ListaContas() {
  const { doc } = useCalc()
  if (doc.contas.length === 0) return null
  return (
    <div className="cc-list" aria-label="Minhas contas">
      {doc.contas.map((c) => {
        const x = resumo(c, doc.precos)
        return (
          <Link key={c.id} className="cc-item" to={`${BASE}/conta/${c.id}${c.estado === 'rascunho' ? '/1' : ''}`}>
            <span>
              <strong>{c.nome}</strong>
              <small className={x.ruim ? 'cc-err' : ''}>
                {c.estado === 'rascunho' ? 'rascunho · ' : ''}
                {x.texto}
              </small>
            </span>
            <span aria-hidden>›</span>
          </Link>
        )
      })}
    </div>
  )
}

// ---- quem ainda não tem a ferramenta: o que ela faz, a conta grátis e o desbloqueio
export function Intro() {
  const { doc, ready } = useCalc()
  const s = useStore()
  const t = s.session?.tools?.calculadora
  const img = catalogImage(TOOL)
  const tem = doc.contas.length > 0
  const alvo = doc.contas.find((c) => c.id === doc.rodadaContaId) ?? doc.contas[0]
  const usada = !!t?.roundUsed
  return (
    <CalcLayout title={T.nome} back="/">
      <header className="cc-hero">
        {img && <Picture img={img} className="cc-hero-img" lazy={false} />}
        <h1>{T.nome}</h1>
        <p className="cc-sub">{T.sub}</p>
        <p className="cc-lead">{T.pergunta}</p>
      </header>
      {ready && tem && (
        <section className="cc-card" aria-label="Minha conta grátis">
          <h2>Sua conta</h2>
          <ListaContas />
        </section>
      )}
      {ready && !tem && usada && (
        <p className="cc-warn">A conta grátis deste e-mail já foi usada. Se ela estava em outro aparelho, abra por lá ou traga o arquivo em “Seus dados”. <Link to={`${BASE}/dados`}>Seus dados</Link></p>
      )}
      <section className="cc-card">
        {!tem && !usada ? (
          <>
            <Link className="btn btn-open btn-block cc-big" to={`${BASE}/nova`}>
              Fazer 1 conta grátis
            </Link>
            <p className="cc-small">Leva uns 5 minutos. Você só digita o que paga.</p>
          </>
        ) : (
          alvo && (
            <Link className="btn btn-open btn-block cc-big" to={`${BASE}/conta/${alvo.id}${alvo.estado === 'rascunho' ? '/1' : ''}`}>
              {alvo.estado === 'rascunho' ? 'Continuar minha conta' : 'Ver minha conta'}
            </Link>
          )
        )}
      </section>
      <section className="cc-card">
        <h2>O que a conta grátis já mostra</h2>
        <ul className="cc-ok">
          <li>Custo do lote e de cada unidade</li>
          <li>Quanto sobra por unidade e a margem</li>
          <li>Preço de empate e as 3 faixas do Bônus 07</li>
          <li>Quais ingredientes pesam mais</li>
          <li>Auditoria de 3 perguntas</li>
        </ul>
        <h2>
          <span aria-hidden>🔒 </span>Para continuar
        </h2>
        <ul className="cc-lockl">
          <li>Todas as receitas, quantas contas quiser</li>
          <li>Preço sugerido pela sua margem e por canal de venda</li>
          <li>Equilíbrio e meta do mês</li>
          <li>Retorno por hora e ranking das receitas</li>
          <li>“E se”, encomenda grande, kit de presente, lista de compras</li>
          <li>Alerta quando um ingrediente sobe de preço</li>
          <li>Cópia na sua conta para trocar de celular sem perder nada</li>
        </ul>
      </section>
      <UnlockBox from="calc-intro" />
      <p className="cc-small">Garantia de 7 dias. {T.privacidadeFree}</p>
      <Honestidade />
    </CalcLayout>
  )
}

// ---- quem tem a ferramenta
export function Hub() {
  const { doc, ready, alertas } = useCalc()
  return (
    <CalcLayout title={T.nome} back="/" tabs>
      <header className="cc-head">
        <h1>Minha conta da fornada</h1>
        <Link className="cc-gear" to={`${BASE}/dados`} aria-label="Seus dados e ajustes">
          ⚙ Dados
        </Link>
      </header>
      <Link className="btn btn-open btn-block cc-big" to={`${BASE}/nova`}>
        + Nova conta
      </Link>
      {alertas.length > 0 && (
        <Link className="cc-alerta" to={`${BASE}/ingredientes`}>
          ⚠ {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'} de ingrediente que subiu
        </Link>
      )}
      {ready && doc.contas.length === 0 && <p className="cc-lead">Você ainda não fez nenhuma conta. Toque em “Nova conta” e escolha uma receita.</p>}
      <ListaContas />
      <Link className="cc-alerta soft" to={`${BASE}/ingredientes`}>
        Preços dos meus ingredientes ›
      </Link>
      <Honestidade />
    </CalcLayout>
  )
}

export function CalcHome() {
  const owned = useOwned()
  return owned ? <Hub /> : <Intro />
}

// ---- nova conta: escolher a receita (ou uma receita sua)
export function Nova() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const s = useStore()
  const cs = useCalc()
  const owned = useOwned()
  const [q, setQ] = useState('')
  const [nome, setNome] = useState('')
  const kit = owns(s, 'main')
  const pode = podeNova(cs)
  const gate = !pode || params.get('gate') === '1'
  const lista = RECEITAS.filter((r) => !q.trim() || `${r.n} ${r.nome}`.toLowerCase().includes(q.trim().toLowerCase()))
  if (gate && !owned)
    return (
      <CalcLayout title={T.nome} back={BASE}>
        <section className="cc-card cc-gate" aria-label={T.gateTitulo}>
          <h1>{T.gateTitulo}</h1>
          <p>{T.gateTexto}</p>
          <BuyButton from="calc-nova" />
          <Link className="btn btn-link btn-block btn-quiet" to={BASE}>
            Agora não
          </Link>
          <p className="cc-small">Pagamento único de {brlCat(TOOL.priceCents)}, sem mensalidade.</p>
        </section>
      </CalcLayout>
    )
  const go = (n: number | null, nm = '') => nav(`${BASE}/conta/${criarConta(n, nm)}/1`)
  return (
    <CalcLayout title="Nova conta" back={BASE}>
      <h1 className="cc-h1">Qual receita?</h1>
      {!owned && <p className="cc-lead">{T.grisFree} Escolha com cuidado: é essa que fica.</p>}
      <section className="cc-card">
        <h2>Uma receita minha</h2>
        <div className="cc-field">
          <label htmlFor="cc-minha">Nome da receita</label>
          <input id="cc-minha" value={nome} maxLength={120} placeholder="ex.: Brownie de ninho" onChange={(e) => setNome(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-block" disabled={!nome.trim()} onClick={() => go(null, nome)}>
          Fazer a conta da minha receita
        </button>
      </section>
      {kit ? (
        <section className="cc-card">
          <h2>Receitas do livro</h2>
          <div className="cc-field">
            <label htmlFor="cc-busca">Buscar pelo nome ou número</label>
            <input id="cc-busca" value={q} placeholder="ex.: brigadeiro ou 011" onChange={(e) => setQ(e.target.value)} />
          </div>
          {secoes().map((sec) => {
            const rs = lista.filter((r) => r.secao === sec)
            if (!rs.length) return null
            return (
              <details key={sec} className="cc-det" open={!!q.trim()}>
                <summary>
                  {sec} ({rs.length})
                </summary>
                {rs.map((r) => (
                  <button key={r.n} className="cc-rec" onClick={() => go(r.n)}>
                    <span>{String(r.n).padStart(3, '0')}</span> {r.nome}
                  </button>
                ))}
              </details>
            )
          })}
          {lista.length === 0 && <p className="cc-small">Nenhuma receita com esse nome.</p>}
        </section>
      ) : (
        <p className="cc-warn">{T.semKit}</p>
      )}
    </CalcLayout>
  )
}

export { Tabs }
