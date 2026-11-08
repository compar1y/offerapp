import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Admin } from './telas/Admin'
import './estilo.css'

const raiz = createRoot(document.getElementById('app')!)
raiz.render(<StrictMode>{location.hash === '#painel' ? <Admin /> : <App />}</StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
