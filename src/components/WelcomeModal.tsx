import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../data/config'
import { finishWelcome, useStore } from '../lib/store'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

function platform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

// Pop-up do primeiro acesso: boas-vindas + como deixar o app na tela inicial.
// Instalar é opcional: "Agora não" fecha e segue para o conteúdo.
export function WelcomeModal() {
  const { welcomed } = useStore()
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const os = platform()

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  useEffect(() => {
    if (!welcomed) startRef.current?.focus()
  }, [welcomed])

  if (welcomed) return null

  return (
    <div className="modal-back">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <h2 id="welcome-title">Bem-vinda à {CONFIG.brand}</h2>
        <p>Seu acesso está liberado. Se quiser, deixe o app na tela inicial do celular para abrir como um aplicativo.</p>
        <ol className="steps">
          {os === 'ios' ? (
            <>
              <li>Abra esta página no Safari.</li>
              <li>
                Toque em <strong>Compartilhar</strong> (quadrado com seta).
              </li>
              <li>
                Escolha <strong>Adicionar à Tela de Início</strong>.
              </li>
            </>
          ) : os === 'android' ? (
            <>
              <li>
                No Chrome, toque nos <strong>três pontinhos</strong> do canto.
              </li>
              <li>
                Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
              </li>
            </>
          ) : (
            <li>
              No navegador do celular, procure <strong>Adicionar à tela inicial</strong> no menu.
            </li>
          )}
        </ol>
        {deferred && (
          <button
            className="btn btn-secondary btn-block"
            onClick={async () => {
              await deferred.prompt()
              setDeferred(null)
            }}
          >
            Instalar agora
          </button>
        )}
        <button ref={startRef} className="btn btn-primary btn-block" onClick={finishWelcome}>
          Agora não, ver meus materiais
        </button>
        <p className="hint">Você pode instalar depois. O app funciona normalmente no navegador.</p>
      </div>
    </div>
  )
}
