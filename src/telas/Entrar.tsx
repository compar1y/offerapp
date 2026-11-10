import { cena } from '../imagens'
import { useState } from 'react'
import { LINK_SUPORTE } from '../../shared/catalogo'
import { api, ErroApi } from '../api'

/** botão do WhatsApp de suporte (+55 11 94192-6165), com a mensagem pronta (shared/catalogo.ts LINK_SUPORTE) */
export function Suporte({ texto = 'Falar com o suporte no WhatsApp' }: { texto?: string }) {
  return (
    <a className="btn-suporte" href={LINK_SUPORTE} target="_blank" rel="noreferrer">
      <span aria-hidden="true">💬</span> {texto}
    </a>
  )
}

export function Entrar({ aoEntrar }: { aoEntrar(): void }) {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  async function entrar(ev: React.FormEvent) {
    ev.preventDefault()
    setErro('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Confira o e-mail: parece que falta o @ ou o ponto.')
    setIndo(true)
    try {
      await api.entrar(email)
      aoEntrar()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setIndo(false)
    }
  }

  return (
    <form className="card pop" style={{ gap: 14, paddingTop: 0, overflow: 'hidden' }} onSubmit={entrar}>
      <img className="foto-topo" src={cena('boas-vindas')} alt="" />
      <p className="eyebrow">Fábrica de Panetones Caseiros</p>
      <h1>Entre com o e-mail da sua compra</h1>
      <p className="sub">É o mesmo e-mail que você usou no pagamento. Sem senha.</p>
      <label htmlFor="email" className="sub" style={{ fontWeight: 700 }}>Seu e-mail</label>
      <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="maria@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      {erro && <p role="alert" style={{ color: 'var(--fita)', fontWeight: 700 }}>{erro}</p>}
      <button className="btn" disabled={indo}>{indo ? 'Entrando…' : 'Entrar'}</button>
      <p className="sub ajuda" style={{ fontSize: 13 }}>Não achou seu acesso?</p>
      <Suporte />
    </form>
  )
}
