import { useState, type FormEvent } from 'react'
import { sendFeedback } from '../lib/store'

const OPTIONS = [
  'Fazer a receita dar certo',
  'Organizar as encomendas',
  'Calcular custo e preço',
  'Oferecer e vender',
  'Embalar e apresentar',
  'Outra',
]

// Mini-formulário de escuta: a resposta vai para a tabela de eventos (não é obrigatório, nada é cobrado).
export function DifficultyForm() {
  const [choice, setChoice] = useState('')
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!choice || state === 'sending') return
    setState('sending')
    setError('')
    const r = await sendFeedback(choice, text.trim())
    if (r.ok) setState('done')
    else {
      setState('idle')
      setError(r.error ?? 'Não foi possível enviar agora.')
    }
  }

  if (state === 'done') return <p className="ok-msg" role="status">Recebido. Obrigada por contar!</p>

  return (
    <form className="form" onSubmit={submit}>
      <fieldset className="choices">
        <legend className="sr-only">Sua maior dificuldade</legend>
        {OPTIONS.map((o) => (
          <label key={o} className={`choice ${choice === o ? 'choice-on' : ''}`}>
            <input type="radio" name="dificuldade" value={o} checked={choice === o} onChange={() => setChoice(o)} />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>
      <label htmlFor="dif-text">Quer contar mais? (opcional)</label>
      <textarea id="dif-text" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-secondary" disabled={!choice || state === 'sending'}>
        {state === 'sending' ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  )
}
