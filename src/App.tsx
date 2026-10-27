import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { init, owns, useStore } from './lib/store'
import { Code, Confirmed, Login } from './pages/Access'
import { Home } from './pages/Home'
import { Item } from './pages/Item'
import { Encomendas, ExtraView, Extras, Fornada, Livro, Mes, Pontos, Ranking, Selos, Vendas } from './pages/Game'
import { Account } from './pages/Account'
import { Catalog } from './pages/Catalog'
import { Journey } from './pages/Journey'
import { CALC_ENABLED, CATALOG_ENABLED } from './data/config'
import { CalcApp } from './calc/CalcApp'

function Private({ children }: { children: ReactNode }) {
  const { session } = useStore()
  if (!session) return <Navigate to="/entrar" replace />
  return <>{children}</>
}

// Minha fornada é para quem já tem o kit principal; sem ele, volta para o início.
function Kit({ children }: { children: ReactNode }) {
  const s = useStore()
  if (!s.session) return <Navigate to="/entrar" replace />
  if (!owns(s, 'main')) return <Navigate to="/" replace />
  return <>{children}</>
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { ready, session, pendingEmail } = useStore()
  useEffect(() => {
    void init()
  }, [])
  if (!ready) return <div className="loading" role="status">Carregando...</div>
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/entrar" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/compra-confirmada" element={session ? <Navigate to="/" replace /> : <Confirmed />} />
        <Route path="/codigo" element={pendingEmail ? <Code /> : <Navigate to="/entrar" replace />} />
        <Route path="/" element={<Private><Home /></Private>} />
        <Route path="/produto/:id" element={<Private><Item /></Private>} />
        {CATALOG_ENABLED && <Route path="/catalogo" element={<Private><Catalog /></Private>} />}
        {CATALOG_ENABLED && <Route path="/caminho" element={<Private><Journey /></Private>} />}
        <Route path="/fornada" element={<Kit><Fornada /></Kit>} />
        <Route path="/fornada/pontos" element={<Kit><Pontos /></Kit>} />
        <Route path="/fornada/selos" element={<Kit><Selos /></Kit>} />
        <Route path="/fornada/livro" element={<Kit><Livro /></Kit>} />
        <Route path="/fornada/encomendas" element={<Kit><Encomendas /></Kit>} />
        <Route path="/fornada/mes" element={<Kit><Mes /></Kit>} />
        <Route path="/fornada/extras" element={<Kit><Extras /></Kit>} />
        <Route path="/fornada/extras/:id" element={<Kit><ExtraView /></Kit>} />
        <Route path="/fornada/vendas" element={<Kit><Vendas /></Kit>} />
        <Route path="/fornada/ranking" element={<Kit><Ranking /></Kit>} />
        {CALC_ENABLED && <Route path="/conta-da-fornada/*" element={<Private><CalcApp /></Private>} />}
        <Route path="/conta" element={<Private><Account /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
