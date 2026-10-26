import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CONFIG } from '../data/config'
import { DEMO_CODE, requestCode, useStore, verifyCode } from '../lib/store'
import { SupportButton } from '../components/ui'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const valid = /\S+@\S+\.\S+/.test(email)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    requestCode(email)
    navigate('/codigo')
  }

  return (
    <div className="page access">
      <div className="access-hero">
        <span className="access-icon" aria-hidden>
          🎄
        </span>
        <h1>{CONFIG.brand}</h1>
        <p>Entre com o e-mail que você usou na compra.</p>
      </div>
      <form className="card form" onSubmit={submit}>
        <label htmlFor="email">Seu e-mail</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary" disabled={!valid}>
          Receber código de acesso
        </button>
        <p className="hint">Você vai receber um código de 6 números no e-mail. Não precisa de senha.</p>
      </form>
      <SupportButton />
    </div>
  )
}

export function Code() {
  const navigate = useNavigate()
  const { pendingEmail } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (verifyCode(code)) navigate('/')
    else setError(true)
  }

  return (
    <div className="page access">
      <div className="access-hero">
        <h1>Confira seu e-mail</h1>
        <p>
          Mandamos um código para <strong>{pendingEmail}</strong>.
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
            setError(false)
          }}
        />
        {error && <p className="error">Código errado. Confira e tente de novo.</p>}
        <button className="btn btn-primary" disabled={code.length !== 6}>
          Entrar
        </button>
        <button type="button" className="btn btn-link" onClick={() => navigate('/entrar')}>
          Usar outro e-mail
        </button>
        {CONFIG.demo && <p className="demo-note">Modo demonstração: o código é {DEMO_CODE}.</p>}
      </form>
      <SupportButton />
    </div>
  )
}
