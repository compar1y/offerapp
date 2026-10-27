import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { COPY, OFFER_BY_ID, brl as brlCat, unlockPrice } from '../../shared/catalog'
import { brl, parseMoney, parseNumero } from '../../shared/calc'
import { Layout } from '../components/ui'
import { buyUrl } from '../lib/checkouts'
import { provider } from '../lib/access'
import { owns, trackOffer, useStore } from '../lib/store'
import { useCalc } from './store'
import { T } from './strings'
import './calc.css'

export const BASE = '/conta-da-fornada'
export const TOOL = OFFER_BY_ID.calculadora

export function useOwned(): boolean {
  const s = useStore()
  return owns(s, 'calculadora')
}

export function CalcLayout({ title, back, children, tabs = false }: { title: string; back?: string; children: ReactNode; tabs?: boolean }) {
  return (
    <Layout title={title} back={back}>
      <div className="cc">
        {tabs && <Tabs />}
        {children}
      </div>
    </Layout>
  )
}

const TABS = [
  { to: '', label: 'Contas' },
  { to: '/preco', label: 'Preço' },
  { to: '/mes', label: 'Mês' },
  { to: '/hora', label: 'Hora' },
  { to: '/ferramentas', label: 'Mais' },
]
export function Tabs() {
  const owned = useOwned()
  return (
    <nav className="cc-tabs" aria-label="Partes da Conta da Fornada">
      {TABS.map((t) => (
        <NavLink key={t.to} to={BASE + t.to} end={t.to === ''} className={({ isActive }) => `cc-tab${isActive ? ' on' : ''}`}>
          {!owned && t.to !== '' && <span aria-hidden>🔒 </span>}
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

export const Honestidade = () => <p className="cc-honest">{T.honestidade}</p>

/** botão principal de compra (verde vivo, pulsante). Sem checkout pronto: "Disponível em breve" + "Quero ser avisada". */
export function BuyButton({ from, full = true }: { from: string; full?: boolean }) {
  const s = useStore()
  const url = buyUrl('calculadora')
  const cls = full ? ' btn-block' : ''
  if (url)
    return (
      <a
        className={`btn btn-buy${cls} btn-want btn-pulse`}
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          trackOffer('offer.click', 'calculadora', from)
          void provider.trackEvent('calc.unlock.click', { from })
        }}
      >
        <span aria-hidden>🔒 </span>
        {COPY.button.unlock(unlockPrice(TOOL.priceCents))}
      </a>
    )
  const asked = !!s.interested.calculadora
  return (
    <>
      <button className={`btn${cls} btn-soon`} disabled>
        {COPY.button.soon}
      </button>
      <button className={`btn${cls} ${asked ? 'btn-done' : 'btn-secondary'}`} disabled={asked} onClick={() => trackOffer('offer.interest', 'calculadora', from)}>
        {asked ? COPY.button.notified : COPY.button.notify}
      </button>
    </>
  )
}

export function UnlockBox({ from, children }: { from: string; children?: ReactNode }) {
  return (
    <div className="cc-unlock">
      {children}
      <BuyButton from={from} />
      <p className="cc-small">Pagamento único de {brlCat(TOOL.priceCents)}. Libera na hora. A conta que você já fez continua sua.</p>
    </div>
  )
}

/** tela de uma parte paga para quem ainda não tem: prévia legível, claramente de exemplo, sem borrão */
export function Travado({ titulo, texto, children, from }: { titulo: string; texto: string; children?: ReactNode; from: string }) {
  return (
    <section className="cc-card cc-lock" aria-label={`${titulo} (bloqueado)`}>
      <h2>
        <span aria-hidden>🔒 </span>
        {titulo}
      </h2>
      <p>{texto}</p>
      {children}
      <p className="cc-ex">{T.exemploFicticio}</p>
      <UnlockBox from={from} />
    </section>
  )
}

export function LockedTile({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="cc-tile">
      <strong>
        <span aria-hidden>🔒 </span>
        {titulo} <span className="cc-tag">exemplo</span>
      </strong>
      <span>{texto}</span>
    </div>
  )
}

// ---------------------------------------------------------------- campos

const fmtMoney = (c: number | null): string => (c === null ? '' : (c / 100).toFixed(2).replace('.', ','))
const fmtNum = (n: number | null): string => (n === null ? '' : String(Math.round(n * 1000) / 1000).replace('.', ','))

interface FieldBase {
  label: string
  hint?: string
  disabled?: boolean
  example?: boolean
  placeholder?: string
  suffix?: string
}

/** dinheiro em reais ("7,50"). onCommit só é chamado com valor válido. Vazio chama onClear (se houver). */
export function MoneyField({ label, cents, onCommit, onClear, hint, disabled, example, placeholder }: FieldBase & { cents: number | null; onCommit: (c: number) => void; onClear?: () => void }) {
  const id = useId()
  const { rev } = useCalc()
  const [txt, setTxt] = useState(fmtMoney(cents))
  useEffect(() => {
    if ((txt.trim() === '' ? null : parseMoney(txt)) !== cents) setTxt(fmtMoney(cents))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents, rev])
  const bad = txt.trim() !== '' && parseMoney(txt) === null
  return (
    <div className={`cc-field${example ? ' is-ex' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="cc-in">
        <span aria-hidden>R$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={txt}
          disabled={disabled}
          placeholder={placeholder ?? '0,00'}
          aria-invalid={bad}
          aria-describedby={hint || bad ? `${id}-h` : undefined}
          onChange={(e) => {
            setTxt(e.target.value)
            const v = e.target.value.trim() === '' ? null : parseMoney(e.target.value)
            if (v !== null) onCommit(v)
            else if (e.target.value.trim() === '') onClear?.()
          }}
        />
      </div>
      {(hint || bad) && (
        <small id={`${id}-h`} className={bad ? 'cc-err' : ''}>
          {bad ? 'Digite só números, por exemplo 7,50.' : hint}
        </small>
      )}
    </div>
  )
}

/** número (aceita vírgula e fração "1/2"). */
export function NumField({ label, value, onCommit, onClear, hint, disabled, example, suffix, max, min = 0, placeholder }: FieldBase & { value: number | null; onCommit: (n: number) => void; onClear?: () => void; max?: number; min?: number }) {
  const id = useId()
  const { rev } = useCalc()
  const [txt, setTxt] = useState(fmtNum(value))
  const parse = (t: string) => (t.trim() === '' ? null : parseNumero(t, max))
  useEffect(() => {
    if (parse(txt) !== value) setTxt(fmtNum(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rev])
  const p = parse(txt)
  const bad = txt.trim() !== '' && (p === null || p < min)
  return (
    <div className={`cc-field${example ? ' is-ex' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="cc-in">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={txt}
          disabled={disabled}
          placeholder={placeholder ?? '0'}
          aria-invalid={bad}
          aria-describedby={hint || bad ? `${id}-h` : undefined}
          onChange={(e) => {
            setTxt(e.target.value)
            const v = parse(e.target.value)
            if (v !== null && v >= min) onCommit(v)
            else if (e.target.value.trim() === '') onClear?.()
          }}
        />
        {suffix && <span aria-hidden>{suffix}</span>}
      </div>
      {(hint || bad) && (
        <small id={`${id}-h`} className={bad ? 'cc-err' : ''}>
          {bad ? 'Esse número não vale. Confira.' : hint}
        </small>
      )}
    </div>
  )
}

export function ExTag({ on, children = 'exemplo' }: { on?: boolean; children?: ReactNode }) {
  return on ? <span className="cc-tag">{children}</span> : null
}

/** linha de resultado (rótulo à esquerda, valor à direita) */
export function Line({ k, v, strong, warn, note }: { k: ReactNode; v: ReactNode; strong?: boolean; warn?: boolean; note?: ReactNode }) {
  return (
    <div className={`cc-line${strong ? ' strong' : ''}${warn ? ' warn' : ''}`}>
      <span>
        {k}
        {note && <small>{note}</small>}
      </span>
      <b>{v}</b>
    </div>
  )
}

export const Money = ({ c }: { c: number | null }) => <>{c === null ? '—' : brl(c)}</>

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="btn btn-secondary btn-block" to={to}>
      {children}
    </Link>
  )
}
