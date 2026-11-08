import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Admin } from './telas/Admin'
import './estilo.css'

if (import.meta.env.VITE_DEMO === '1') {
  const { instalarPrevia } = await import('./demo')
  instalarPrevia()
}

const raiz = createRoot(document.getElementById('app')!)
raiz.render(<StrictMode>{location.hash === '#painel' && import.meta.env.VITE_DEMO !== '1' ? <Admin /> : <App />}</StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_DEMO !== '1') {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
