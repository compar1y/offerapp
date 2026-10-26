import { useNavigate } from 'react-router-dom'
import { CONFIG } from '../data/config'
import { finishWelcome, track } from '../lib/store'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function Welcome() {
  const navigate = useNavigate()

  function start() {
    finishWelcome()
    track('boas_vindas_concluida')
    navigate('/')
  }

  return (
    <div className="page access">
      <div className="access-hero">
        <h1>Boas-vindas à {CONFIG.brand}!</h1>
        <p>Aqui ficam suas receitas, seus bônus e tudo que você comprar depois.</p>
      </div>
      <div className="video-placeholder" role="img" aria-label="Vídeo de boas-vindas">
        <span>▶</span>
        <small>Vídeo de boas-vindas (1 min)</small>
      </div>
      <div className="card">
        <h2>Deixe o app na tela do celular</h2>
        {isIOS() ? (
          <ol className="steps">
            <li>Toque no botão de compartilhar (o quadrado com a seta) no Safari.</li>
            <li>Escolha "Adicionar à Tela de Início".</li>
            <li>Toque em "Adicionar".</li>
          </ol>
        ) : (
          <ol className="steps">
            <li>Toque nos três pontinhos no canto do navegador.</li>
            <li>Escolha "Adicionar à tela inicial" ou "Instalar app".</li>
            <li>Confirme. O ícone do panetone aparece junto dos seus apps.</li>
          </ol>
        )}
      </div>
      <button className="btn btn-primary btn-block" onClick={start}>
        Ver minhas receitas
      </button>
    </div>
  )
}
