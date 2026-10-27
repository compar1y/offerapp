import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CONFIG, DEMO_CODE, PREVIEW } from '../data/config'
import { cancelPending, checkAccess, requestCode, useStore, verifyCode } from '../lib/store'
import { SupportButton } from '../components/ui'

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
        <Link className="btn btn-link" to="/compra-confirmada">
          Acabei de comprar
        </Link>
        {PREVIEW && <p className="demo-note">Modo demonstração: use qualquer e-mail e o código {DEMO_CODE}.</p>}
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
        <Link className="btn btn-link" to={`/compra-confirmada?email=${encodeURIComponent(pendingEmail ?? '')}`}>
          Acabei de comprar e o código não chega
        </Link>
        <p className="hint">Não chegou ou comprou com outro e-mail? Fale com o suporte pelo botão Ajuda.</p>
        {PREVIEW && <p className="demo-note">Modo demonstração: o código é {DEMO_CODE}.</p>}
      </form>
      <SupportButton />
    </div>
  )
}

// Página pública para usar como "URL de obrigado" no Wiapy: #/compra-confirmada
// O webhook libera o acesso sozinho. Se esta tela abrir antes dele chegar, perguntamos de novo a cada 5 s (até ~2 min).
const POLL_MS = 5000
const POLL_MAX = 24

export function Confirmed() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [phase, setPhase] = useState<'form' | 'waiting' | 'timeout'>('form')
  const [error, setError] = useState('')
  const run = useRef(0)
  const valid = /\S+@\S+\.\S+/.test(email)

  useEffect(() => () => void (run.current += 1), [])

  async function start(e?: FormEvent) {
    e?.preventDefault()
    if (!valid || phase === 'waiting') return
    const id = ++run.current
    setError('')
    setPhase('waiting')
    for (let i = 0; i < POLL_MAX; i++) {
      const r = await checkAccess(email)
      if (id !== run.current) return
      if (!r.ok) {
        setError(r.error ?? 'Não foi possível conferir agora.')
        setPhase('form')
        return
      }
      if (r.ready) {
        navigate('/codigo')
        return
      }
      await new Promise((res) => setTimeout(res, POLL_MS))
      if (id !== run.current) return
    }
    setPhase('timeout')
  }

  return (
    <div className="page access">
      <div className="access-hero">
        <h1>Compra confirmada</h1>
        <p>Entre com o e-mail da compra. Seu acesso é liberado sozinho, sem precisar de aprovação.</p>
      </div>
      <form className="card form" onSubmit={start}>
        <label htmlFor="email">E-mail usado na compra</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={phase === 'waiting'} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {phase === 'waiting' && (
          <p className="ok-msg" role="status" aria-live="polite">
            Estamos liberando seu acesso, tente em instantes. Esta tela confere sozinha, não precisa recarregar.
          </p>
        )}
        {phase === 'timeout' && (
          <p className="error" role="status">
            Ainda não apareceu. Confira se o e-mail é o mesmo da compra e tente de novo. Se o pagamento foi no PIX, ele pode levar alguns minutos.
          </p>
        )}
        <button className="btn btn-primary" disabled={!valid || phase === 'waiting'}>
          {phase === 'waiting' ? 'Liberando...' : phase === 'timeout' ? 'Tentar de novo' : 'Receber código de acesso'}
        </button>
        <Link className="btn btn-link" to="/entrar">
          Já tenho acesso: entrar
        </Link>
        {PREVIEW && <p className="demo-note">Modo demonstração: um e-mail que começa com "aguardando" simula a espera da liberação (cerca de 12 s). Código: {DEMO_CODE}.</p>}
      </form>
      <SupportButton />
    </div>
  )
}
