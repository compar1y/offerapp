// Entrega das "Respostas com a Conta Feita": ela preenche UMA encomenda e copia as respostas prontas (bônus 04 preenchido, com a conta feita).
// Só abre para quem tem o produto 'contafeita'. Tudo fica no celular dela (localStorage); nada vai para o servidor.
import { useEffect, useMemo, useState } from 'react'
import { PRODUTOS } from '../../shared/catalogo'
import { ofertaDisponivel, tem, useApp } from '../ctx'
import {
  ENCOMENDA_VAZIA, EXEMPLO_ENCOMENDA, EXEMPLO_MEUS, ITEM_VAZIO, MAX_ITENS, MEUS_VAZIOS, brl, calcular, respostas,
  type Encomenda, type FormaPagamento, type MeusDados, type Recebimento,
} from '../contafeita'

const chave = (email: string) => `fornada-contafeita:v1:${email.toLowerCase()}`
interface Guardado { meus: MeusDados; encomenda: Encomenda; parteConferidaNoTotal: number | null }
function ler(email: string): Guardado {
  try {
    const j = JSON.parse(localStorage.getItem(chave(email)) ?? 'null') as Partial<Guardado> | null
    if (j && typeof j === 'object') {
      const enc = { ...ENCOMENDA_VAZIA, ...(j.encomenda ?? {}) }
      if (!Array.isArray(enc.itens) || !enc.itens.length) enc.itens = [{ ...ITEM_VAZIO }]
      return { meus: { ...MEUS_VAZIOS, ...(j.meus ?? {}) }, encomenda: enc, parteConferidaNoTotal: j.parteConferidaNoTotal ?? null }
    }
  } catch { /* sem armazenamento */ }
  return { meus: MEUS_VAZIOS, encomenda: ENCOMENDA_VAZIA, parteConferidaNoTotal: null }
}
function gravar(email: string, g: Guardado) {
  try { localStorage.setItem(chave(email), JSON.stringify(g)) } catch { /* sem armazenamento: só não lembra */ }
}

/** copia para a área de transferência (com reserva para celulares antigos) */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const t = document.createElement('textarea')
      t.value = texto
      t.setAttribute('readonly', '')
      t.style.position = 'fixed'
      t.style.opacity = '0'
      document.body.appendChild(t)
      t.select()
      const ok = document.execCommand('copy')
      t.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function ContaFeitaTela() {
  const { eu, voltar, trocar } = useApp()
  const comprou = tem(eu, 'contafeita')
  // quem não comprou não vê a ferramenta: vai para a oferta (se ela estiver no ar) ou volta
  useEffect(() => {
    if (comprou) return
    if (ofertaDisponivel(eu, 'contafeita')) trocar({ t: 'oferta', p: 'contafeita', origem: 'entrega' })
    else voltar()
  }, [comprou, eu, trocar, voltar])
  return comprou ? <Ferramenta /> : null
}

function Ferramenta() {
  const { eu, voltar, evento, toast } = useApp()
  const [g, setG] = useState<Guardado>(() => ler(eu.email))
  const { meus, encomenda: e } = g
  useEffect(() => { evento('contafeita.aberta', {}) }, [evento])
  useEffect(() => { gravar(eu.email, g) }, [g, eu.email])

  const conta = useMemo(() => calcular(e), [e])
  const lista = useMemo(() => respostas(e, meus), [e, meus])
  // "uma parte agora": ao mudar itens ou taxa, mantém o valor escolhido e pede que ela confira
  const conferirParte = e.forma === 'parte' && !!e.parte.trim() && g.parteConferidaNoTotal !== null && g.parteConferidaNoTotal !== conta.total

  const mudaEnc = (f: (x: Encomenda) => Encomenda) => setG((x) => ({ ...x, encomenda: f(x.encomenda) }))
  const campo = (k: 'cliente' | 'taxa' | 'data' | 'horario' | 'local' | 'recebido') => (ev: { target: { value: string } }) => mudaEnc((x) => ({ ...x, [k]: ev.target.value }))
  const mudaItem = (i: number, k: 'produto' | 'qtd' | 'preco') => (ev: { target: { value: string } }) =>
    mudaEnc((x) => ({ ...x, itens: x.itens.map((it, j) => (j === i ? { ...it, [k]: ev.target.value } : it)) }))
  const mudaParte = (ev: { target: { value: string } }) =>
    setG((x) => ({ ...x, encomenda: { ...x.encomenda, parte: ev.target.value }, parteConferidaNoTotal: calcular({ ...x.encomenda, parte: ev.target.value }).total }))
  const confirmarParte = () => setG((x) => ({ ...x, parteConferidaNoTotal: conta.total }))

  function novaEncomenda() {
    if (!window.confirm('Começar uma nova encomenda? Os dados desta encomenda serão apagados. Seu nome e sua chave PIX continuam guardados.')) return
    setG((x) => ({ ...x, encomenda: { ...ENCOMENDA_VAZIA, itens: [{ ...ITEM_VAZIO }] }, parteConferidaNoTotal: null }))
    evento('contafeita.nova', {})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function copiarResposta(id: string, texto: string) {
    const ok = await copiar(texto)
    toast(ok ? 'Copiado! Agora é só colar no WhatsApp.' : 'Não consegui copiar. Toque e segure no texto para copiar.')
    if (ok) evento('contafeita.copiada', { resposta: id })
  }

  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <p className="eyebrow">Sua ferramenta</p>
      <h1>{PRODUTOS.contafeita.nome}</h1>
      <p className="sub">Preencha a encomenda uma vez. As respostas saem prontas, com a conta feita. Você confere, copia e cola no WhatsApp.</p>

      <div className="card form-etiquetas form-conta">
        <h3>1. A encomenda</h3>
        <label>Nome da cliente
          <input value={e.cliente} onChange={campo('cliente')} maxLength={40} placeholder="Ex.: Dona Marta" autoComplete="off" />
        </label>
        {e.itens.map((it, i) => (
          <fieldset key={i} className="cf-item">
            <legend>Item {i + 1}</legend>
            <label>Produto
              <input value={it.produto} onChange={mudaItem(i, 'produto')} maxLength={40} placeholder="Ex.: Panetone de frutas" />
            </label>
            <div className="cf-dupla">
              <label>Quantidade
                <input value={it.qtd} onChange={mudaItem(i, 'qtd')} inputMode="numeric" maxLength={3} placeholder="2" />
              </label>
              <label>Preço por unidade (R$)
                <input value={it.preco} onChange={mudaItem(i, 'preco')} inputMode="decimal" maxLength={10} placeholder="45,00" />
              </label>
            </div>
            {e.itens.length > 1 && (
              <button className="link cf-tirar" onClick={() => mudaEnc((x) => ({ ...x, itens: x.itens.filter((_, j) => j !== i) }))}>Tirar este item</button>
            )}
          </fieldset>
        ))}
        {e.itens.length < MAX_ITENS && (
          <button className="btn leve" onClick={() => mudaEnc((x) => ({ ...x, itens: [...x.itens, { ...ITEM_VAZIO }] }))}>+ outro item</button>
        )}

        <div className="cf-opcoes" role="radiogroup" aria-label="Entrega ou retirada">
          {(['entrega', 'retirada'] as Recebimento[]).map((r) => (
            <button key={r} role="radio" aria-checked={e.recebimento === r} className={`opcao-cf${e.recebimento === r ? ' on' : ''}`} onClick={() => mudaEnc((x) => ({ ...x, recebimento: r }))}>
              {r === 'entrega' ? '🚗 Entrega' : '🏠 Retirada'}
            </button>
          ))}
        </div>
        {e.recebimento === 'entrega' && (
          <label>Taxa de entrega (R$) <small>(opcional)</small>
            <input value={e.taxa} onChange={campo('taxa')} inputMode="decimal" maxLength={10} placeholder="10,00" />
          </label>
        )}
        <div className="cf-dupla">
          <label>Data <small>(opcional)</small>
            <input value={e.data} onChange={campo('data')} maxLength={20} placeholder="20/12" />
          </label>
          <label>Horário <small>(opcional)</small>
            <input value={e.horario} onChange={campo('horario')} maxLength={20} placeholder="10h" />
          </label>
        </div>
        <label>{e.recebimento === 'entrega' ? 'Endereço' : 'Local da retirada'} <small>(opcional)</small>
          <input value={e.local} onChange={campo('local')} maxLength={90} placeholder={e.recebimento === 'entrega' ? 'Rua das Flores, 120' : 'Aqui em casa'} />
        </label>

        <h3>2. Como você recebe</h3>
        <div className="cf-opcoes tres" role="radiogroup" aria-label="Como você recebe">
          {([['parte', 'Uma parte agora'], ['antes', 'Tudo antes'], ['depois', e.recebimento === 'entrega' ? 'Tudo na entrega' : 'Tudo na retirada']] as [FormaPagamento, string][]).map(([f, t]) => (
            <button key={f} role="radio" aria-checked={e.forma === f} className={`opcao-cf${e.forma === f ? ' on' : ''}`} onClick={() => mudaEnc((x) => ({ ...x, forma: f }))}>{t}</button>
          ))}
        </div>
        {e.forma === 'parte' && (
          <label>Valor da parte agora (R$)
            <input value={e.parte} onChange={mudaParte} inputMode="decimal" maxLength={10} placeholder="50,00" />
          </label>
        )}
        {conferirParte && (
          <div className="aviso">
            <b>O total mudou para {brl(conta.total)}.</b>
            <span>A parte agora continua {brl(conta.parte)}. Confira se é esse valor mesmo.</span>
            <button className="btn leve" onClick={confirmarParte}>Está certo, manter {brl(conta.parte)}</button>
          </div>
        )}
        <label>Quanto você já recebeu (R$) <small>(o total que você já conferiu, somando todos os pagamentos)</small>
          <input value={e.recebido} onChange={campo('recebido')} inputMode="decimal" maxLength={10} placeholder="0,00" />
        </label>
      </div>

      <div className="card cf-conta" aria-live="polite">
        <h3>🧮 A conta</h3>
        {conta.linhas.map((l, i) => <div key={i} className="cf-linha"><span>{l.qtd} × {l.produto}</span><b>{brl(l.subtotal)}</b></div>)}
        {e.recebimento === 'entrega' && conta.taxa > 0 && <div className="cf-linha"><span>Entrega</span><b>{brl(conta.taxa)}</b></div>}
        <div className="cf-linha total"><span>Total</span><b>{brl(conta.total)}</b></div>
        <div className="cf-linha"><span>Já recebido</span><b>{brl(conta.recebido)}</b></div>
        {conta.pedirAgora > 0 && <div className="cf-linha"><span>Pedir agora</span><b>{brl(conta.pedirAgora)}</b></div>}
        <div className="cf-linha falta"><span>Falta receber</span><b>{brl(conta.falta)}</b></div>
        {conta.erros.map((x) => <p key={x} className="cf-erro">⚠️ {x}</p>)}
      </div>

      <div className="card form-etiquetas">
        <h3>Seus dados <small className="sub">(uma vez só, opcional)</small></h3>
        <label>Seu nome, para assinar as mensagens
          <input value={meus.nome} onChange={(ev) => setG((x) => ({ ...x, meus: { ...x.meus, nome: ev.target.value } }))} maxLength={40} placeholder="Ex.: Cida" />
        </label>
        <label>Sua chave PIX <small>(vai no pedido de pagamento)</small>
          <input value={meus.pix} onChange={(ev) => setG((x) => ({ ...x, meus: { ...x.meus, pix: ev.target.value } }))} maxLength={80} placeholder="Celular, e-mail, CPF ou chave aleatória" />
        </label>
        <p className="sub" style={{ fontSize: 13, margin: 0 }}>Ficam guardados só neste celular. O app não acessa banco e não faz cobrança.</p>
      </div>

      <h2>Suas respostas prontas</h2>
      <p className="sub">Confira cada uma antes de copiar. Os textos são os das mensagens do seu kit (bônus 04), preenchidos com esta encomenda.</p>
      {lista.map((r) => (
        <div key={r.id} className={`card cf-resposta${r.texto ? '' : ' bloqueada'}`}>
          <div className="cf-resposta-topo"><b>{r.titulo}</b><small>{r.base}</small></div>
          {r.texto ? (
            <>
              <div className="cf-balao">{r.texto}</div>
              <button className="btn" onClick={() => copiarResposta(r.id, r.texto!)}>📋 Copiar</button>
            </>
          ) : (
            <p className="cf-falta">✏️ {r.aviso}</p>
          )}
        </div>
      ))}

      <button className="btn fita" onClick={novaEncomenda}>🗒️ Nova encomenda</button>
      <p className="sub" style={{ fontSize: 13, textAlign: 'center' }}>Nada é enviado sozinho e nada sai do seu celular.</p>
    </>
  )
}

/** "1 Você preenche → 2 Sai pronto": a encomenda de exemplo e o orçamento que sai dela, montado pela mesma função da ferramenta */
export function PreenchePronto() {
  const r = respostas(EXEMPLO_ENCOMENDA, EXEMPLO_MEUS).find((x) => x.id === 'orcamento')!
  const e = EXEMPLO_ENCOMENDA
  const c = calcular(e)
  // o orçamento aparece "digitando" uma vez, para mostrar que sai na hora
  const [n, setN] = useState(0)
  const alvo = r.texto ?? ''
  useEffect(() => {
    let parado = false
    try { parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { /* sem matchMedia */ }
    if (parado) { setN(alvo.length); return }
    const t = setInterval(() => setN((x) => { if (x >= alvo.length) { clearInterval(t); return x } return Math.min(alvo.length, x + 6) }), 30)
    return () => clearInterval(t)
  }, [alvo])
  return (
    <div className="digite-pronto preenche-pronto" aria-label="Exemplo: você preenche a encomenda e o orçamento sai pronto, com a conta feita">
      <span className="cf-exemplo">Exemplo</span>
      <div className="dp-passo"><b>1</b> Você preenche</div>
      <div className="cf-mini-form" aria-hidden="true">
        <div><small>Cliente</small><span>{e.cliente}</span></div>
        {e.itens.map((it, i) => <div key={i}><small>Item {i + 1}</small><span>{it.qtd} × {it.produto} · R$ {it.preco},00 cada</span></div>)}
        <div><small>Entrega</small><span>taxa de R$ {e.taxa},00 · {e.data}, {e.horario}</span></div>
        <div><small>Como recebe</small><span>uma parte agora: R$ {e.parte},00</span></div>
      </div>
      <div className="dp-seta" aria-hidden="true">⬇ a conta sai feita: total {brl(c.total)}</div>
      <div className="dp-passo"><b>2</b> Sai pronto, para copiar</div>
      <div className="cf-balao zap" role="img" aria-label={`Resposta de orçamento pronta: ${alvo}`}>{alvo.slice(0, n)}<span className="cf-hora" aria-hidden="true">10:24 ✓✓</span></div>
      <p className="cf-nota">Este é o orçamento (mensagem 07 do bônus 04) com os dados da encomenda e a conta feita. Na ferramenta saem também o pedido de pagamento, a confirmação e os dois lembretes.</p>
    </div>
  )
}
