// Conta da Fornada: seus dados (cópia em arquivo, sincronização com a conta, apagar).
import { useRef, useState } from 'react'
import { apagarAparelho, apagarDaConta, apagarTudo, arquivoDaConta, arquivoLocal, baixar, importarTexto, religarConta, syncNow, useCalc } from './store'
import { BASE, CalcLayout, useOwned } from './ui'
import { T } from './strings'

const dia = () => new Date().toISOString().slice(0, 10)
const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'ainda não')

export function Dados() {
  const owned = useOwned()
  const cs = useCalc()
  const [msg, setMsg] = useState('')
  const [conf, setConf] = useState<'' | 'aparelho' | 'conta' | 'tudo'>('')
  const file = useRef<HTMLInputElement>(null)
  const sincroniza = owned && !cs.meta.syncOff
  const feito = (m: string) => {
    setMsg(m)
    setConf('')
  }
  const exportar = () => baixar(`conta-da-fornada-${dia()}.json`, arquivoLocal())
  const exportarConta = async () => {
    const t = await arquivoDaConta()
    if (t) baixar(`conta-da-fornada-da-conta-${dia()}.json`, t)
    else setMsg('Não achei cópia guardada na sua conta.')
  }
  const importar = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 2_000_000) return setMsg('Esse arquivo é grande demais para ser uma cópia da Conta da Fornada.')
    const r = importarTexto(await f.text())
    setMsg(r.ok ? `Pronto: ${r.contas ?? 0} ${r.contas === 1 ? 'conta trazida' : 'contas trazidas'} para o app.` : (r.erro ?? 'Não consegui ler o arquivo.'))
    if (file.current) file.current.value = ''
  }
  return (
    <CalcLayout title="Seus dados" back={BASE}>
      <h1 className="cc-h1">Seus dados</h1>
      <p className="cc-lead">{owned ? T.privacidade : T.privacidadeFree}</p>
      {!owned && cs.doc.contas.length > 0 && <p className="cc-warn">{T.estorno}</p>}

      <section className="cc-card" aria-label="Sincronização">
        <h2>Cópia na sua conta</h2>
        {!owned ? (
          <p className="cc-small">Com a Conta da Fornada desbloqueada, suas contas ficam também na sua conta e acompanham você em outro celular. Sem ela, ficam só neste aparelho: faça a cópia em arquivo abaixo.</p>
        ) : cs.meta.syncOff ? (
          <>
            <p className="cc-small">A sincronização está desligada: nada novo é enviado. A cópia que estava na sua conta foi apagada.</p>
            <button className="btn btn-secondary btn-block" onClick={religarConta}>Ligar a sincronização de novo</button>
          </>
        ) : (
          <>
            <p role="status" className="cc-small">
              {cs.sync === 'syncing' ? 'Sincronizando…' : cs.sync === 'offline' ? 'Sem conexão: guardado no aparelho, envio quando voltar.' : cs.sync === 'erro' ? cs.syncMsg || 'Não deu para sincronizar agora.' : `Sincronizado. Última vez: ${quando(cs.meta.lastSyncAt)}.`}
            </p>
            <button className="btn btn-secondary btn-block" onClick={() => void syncNow().then((ok) => setMsg(ok ? 'Sincronizado.' : 'Não deu para sincronizar agora.'))}>Sincronizar agora</button>
          </>
        )}
      </section>

      <section className="cc-card" aria-label="Cópia em arquivo">
        <h2>Cópia em arquivo</h2>
        <p className="cc-small">Um arquivo seu, que você guarda onde quiser. Serve para trocar de celular ou como segurança.</p>
        <button className="btn btn-secondary btn-block" onClick={exportar}>Baixar a cópia deste aparelho</button>
        {sincroniza && (
          <button className="btn btn-secondary btn-block" onClick={() => void exportarConta()}>Baixar a cópia que está na minha conta</button>
        )}
        <button className="btn btn-secondary btn-block" onClick={() => file.current?.click()}>Trazer uma cópia (arquivo)</button>
        <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Escolher arquivo da cópia" onChange={(e) => void importar(e.target.files?.[0])} />
        <p className="cc-small">Ao trazer, o app junta com o que já tem: vale o mais recente de cada item. Nada é apagado.</p>
      </section>

      <section className="cc-card cc-danger" aria-label="Apagar">
        <h2>Apagar</h2>
        {conf === '' ? (
          <>
            <button className="btn btn-secondary btn-block" onClick={() => setConf('aparelho')}>Apagar deste aparelho</button>
            {owned && <button className="btn btn-secondary btn-block" onClick={() => setConf('conta')}>Apagar só da minha conta</button>}
            <button className="btn btn-secondary btn-block" onClick={() => setConf('tudo')}>Apagar tudo (aparelho e conta)</button>
          </>
        ) : (
          <div role="alertdialog" aria-label="Confirmar">
            <p>
              {conf === 'aparelho' && 'Apagar contas, preços e ajustes DESTE aparelho? A cópia na sua conta (se houver) continua.'}
              {conf === 'conta' && 'Apagar a cópia guardada na sua conta? O que está neste aparelho continua, mas deixa de sincronizar.'}
              {conf === 'tudo' && 'Apagar tudo, daqui e da sua conta? Não tem como desfazer. Baixe a cópia em arquivo antes, se quiser guardar.'}
            </p>
            <button
              className="btn btn-danger btn-block"
              onClick={async () => {
                if (conf === 'aparelho') {
                  await apagarAparelho()
                  feito('Apagado deste aparelho.')
                } else if (conf === 'conta') feito((await apagarDaConta()) ? 'Apagado da sua conta. A sincronização foi desligada.' : 'Não consegui apagar da conta agora. Tente de novo com internet.')
                else feito((await apagarTudo()) ? 'Tudo apagado.' : 'Apaguei deste aparelho, mas não consegui apagar da conta agora. Tente de novo com internet.')
              }}
            >
              Sim, apagar
            </button>
            <button className="btn btn-link btn-block btn-quiet" onClick={() => setConf('')}>Cancelar</button>
          </div>
        )}
      </section>
      {msg && <p role="status" className="cc-note">{msg}</p>}
    </CalcLayout>
  )
}
