import { useState } from 'react'
import { PRODUTOS, type ProdutoId } from '../../shared/catalogo'

// Painel do Levi: /#painel. Pede o ADMIN_TOKEN (fica só nesta aba).
type Dados = {
  resumo: Record<string, number>
  perfis: Record<string, number>
  licoes: { id: string; titulo: string; concluiram: number }[]
  ofertas: Record<string, Record<string, { vista: number; clicada: number; recusada: number; comprou: number }>>
  sosMaisAbertos: [string, number][]
  receitasMaisAbertas: [string, number][]
}

const ROTULO: Record<string, string> = { compradoras: 'Compradoras', entraram: 'Entraram no app', fizeramOnboarding: 'Fizeram as 5 perguntas', ativasUltimos7Dias: 'Ativas nos últimos 7 dias' }

export function Admin() {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem('fornada-admin') ?? '' } catch { return '' } })
  const [dados, setDados] = useState<Dados | null>(null)
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')
  const [produto, setProduto] = useState<ProdutoId>('kit')
  const [lista, setLista] = useState('')

  async function chamar(init?: RequestInit) {
    const r = await fetch('/api/admin', { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.erro ?? `erro ${r.status}`)
    return j
  }

  async function carregar() {
    setMsg('Carregando…')
    try {
      try { sessionStorage.setItem('fornada-admin', token) } catch { /* ok */ }
      setDados(await chamar())
      setMsg('')
    } catch (e) {
      setMsg(String((e as Error).message))
    }
  }

  const [arm, setArm] = useState<string>('')
  async function verArmazenamento() {
    try {
      const r = await fetch('/api/admin?armazenamento=1', { headers: { authorization: `Bearer ${token}` } })
      setArm(JSON.stringify(await r.json(), null, 2))
    } catch (e) {
      setArm(String((e as Error).message))
    }
  }

  async function liberar() {
    try {
      await chamar({ method: 'POST', body: JSON.stringify({ acao: 'liberar', email, produto }) })
      setMsg(`Liberado: ${email} → ${PRODUTOS[produto].nome}`)
      setEmail('')
    } catch (e) {
      setMsg(String((e as Error).message))
    }
  }

  async function importar() {
    const linhas = lista.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((l) => l[0]).map(([e, p]) => ({ email: e, produto: p || 'kit' }))
    try {
      const r = await chamar({ method: 'POST', body: JSON.stringify({ acao: 'importar', linhas }) })
      setMsg(`Importadas ${r.ok}. Linhas com erro: ${r.linhasComErro.join(', ') || 'nenhuma'}`)
    } catch (e) {
      setMsg(String((e as Error).message))
    }
  }

  return (
    <>
      <h1>Painel da Fornada</h1>
      <div className="card">
        <label htmlFor="tk" style={{ fontWeight: 800 }}>Chave do painel</label>
        <input id="tk" type="text" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
        <button className="btn" onClick={carregar}>Ver números</button>
        {msg && <p role="status">{msg}</p>}
      </div>
      {dados && (
        <>
          <div className="card">
            <h3>Resumo</h3>
            <table className="tabela"><tbody>{Object.entries(dados.resumo).map(([k, v]) => <tr key={k}><td>{ROTULO[k] ?? k}</td><td className="n">{v}</td></tr>)}</tbody></table>
          </div>
          <div className="card">
            <h3>Perfis</h3>
            <table className="tabela"><tbody>{Object.entries(dados.perfis).sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{k}</td><td className="n">{v}</td></tr>)}</tbody></table>
          </div>
          <div className="card">
            <h3>Onde elas param (concluíram cada lição)</h3>
            <table className="tabela"><tbody>{dados.licoes.map((l) => <tr key={l.id}><td>{l.id} {l.titulo}</td><td className="n">{l.concluiram}</td></tr>)}</tbody></table>
          </div>
          <div className="card">
            <h3>Ofertas por perfil (pessoas)</h3>
            <table className="tabela">
              <thead><tr><th>Oferta · perfil</th><th>Viu</th><th>Clicou</th><th>Recusou</th><th>Comprou</th></tr></thead>
              <tbody>
                {Object.entries(dados.ofertas).flatMap(([p, porPerfil]) =>
                  Object.entries(porPerfil).map(([perfil, n]) => (
                    <tr key={p + perfil}><td>{PRODUTOS[p as ProdutoId]?.nome ?? p} · {perfil}</td><td className="n">{n.vista}</td><td className="n">{n.clicada}</td><td className="n">{n.recusada}</td><td className="n">{n.comprou}</td></tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3>SOS mais abertos (ficha)</h3>
            <table className="tabela"><tbody>{dados.sosMaisAbertos.map(([k, v]) => <tr key={k}><td>Ficha {k}</td><td className="n">{v}</td></tr>)}</tbody></table>
            <h3>Receitas mais abertas</h3>
            <table className="tabela"><tbody>{dados.receitasMaisAbertas.map(([k, v]) => <tr key={k}><td>Receita {k}</td><td className="n">{v}</td></tr>)}</tbody></table>
          </div>
        </>
      )}
      <div className="card">
        <h3>Páginas no armazenamento</h3>
        <button className="btn leve" onClick={verArmazenamento} disabled={!token}>Conferir páginas</button>
        {arm && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0 }}>{arm}</pre>}
      </div>
      <div className="card">
        <h3>Liberar acesso</h3>
        <input type="email" placeholder="e-mail da cliente" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select value={produto} onChange={(e) => setProduto(e.target.value as ProdutoId)}>
          {Object.values(PRODUTOS).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <button className="btn" onClick={liberar} disabled={!token || !email}>Liberar</button>
      </div>
      <div className="card">
        <h3>Importar compradoras antigas</h3>
        <p className="sub">Uma por linha: e-mail;produto (kit, recheios, encomenda ou primeira). Sem produto = kit.</p>
        <textarea value={lista} onChange={(e) => setLista(e.target.value)} placeholder={'maria@gmail.com;kit\nana@gmail.com;recheios'} />
        <button className="btn" onClick={importar} disabled={!token || !lista.trim()}>Importar</button>
      </div>
    </>
  )
}
