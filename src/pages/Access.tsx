import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CONFIG } from '../data/config'
import { PHOTOS } from '../data/images'
import { cancelPending, requestCode, useStore, verifyCode } from '../lib/store'
import { Picture, SupportButton } from '../components/ui'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = /\S+@\S+\.\S+/.test(email)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError('')
    const r = await requestCode(email)
    setBusy(false)
    if (r.ok) navigate('/codigo')
    else setError(r.error ?? 'Não foi possível enviar o código.')
  }

  return (
    <div className="page access">
      <Picture img={PHOTOS.kit} lazy={false} className="pic-wide" />
      <div className="access-hero">
        <h1>{CONFIG.brand}</h1>
        <p>Entre com o e-mail que você usou na compra.</p>
      </div>
      <form className="card form" onSubmit={submit}>
        <label htmlFor="email">Seu e-mail</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={!valid || busy}>
          {busy ? 'Enviando...' : 'Receber código de acesso'}
        </button>
        <p className="hint">Você vai receber um código de 6 números no e-mail. Não precisa de senha.</p>
        {CONFIG.demo && <p className="demo-note">Modo demonstração: use qualquer e-mail e o código {CONFIG.demoCode}.</p>}
      </form>
      <SupportButton />
    </div>
  )
}

export function Code() {
  const navigate = useNavigate()
  const { pendingEmail } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(30)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function resend() {
    if (wait > 0 || !pendingEmail) return
    setError('')
    const r = await requestCode(pendingEmail)
    if (r.ok) {
      setResent(true)
      setWait(30)
    } else setError(r.error ?? 'Não foi possível reenviar agora.')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const r = await verifyCode(code)
    setBusy(false)
    if (r.ok) navigate('/')
    else setError(r.error ?? 'Código errado. Confira e tente de novo.')
  }

  return (
    <div className="page access">
      <div className="access-hero">
        <h1>Confira seu e-mail</h1>
        <p>
          Mandamos um código para <strong className="break">{pendingEmail}</strong>.
        </p>
      </div>
      <form className="card form" onSubmit={submit}>
        <label htmlFor="code">Código de 6 números</label>
        <input
          id="code"
          className="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''))
            setError('')
          }}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={code.length !== 6 || busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={wait > 0} onClick={resend}>
          {wait > 0 ? `Reenviar código em ${wait}s` : 'Reenviar código'}
        </button>
        {resent && (
          <p className="ok-msg" role="status">
            Código reenviado. Confira também a caixa de spam.
          </p>
        )}
        <button
          type="button"
          className="btn btn-link"
          onClick={() => {
            cancelPending()
            navigate('/entrar')
          }}
        >
          Usar outro e-mail
        </button>
        <p className="hint">Não chegou ou comprou com outro e-mail? Fale com o suporte pelo botão Ajuda.</p>
        {CONFIG.demo && <p className="demo-note">Modo demonstração: o código é {CONFIG.demoCode}.</p>}
      </form>
      <SupportButton />
    </div>
  )
}
