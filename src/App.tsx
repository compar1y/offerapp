import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { init, useStore } from './lib/store'
import { Code, Login } from './pages/Access'
import { Home } from './pages/Home'
import { Item } from './pages/Item'
import { Account } from './pages/Account'

function Private({ children }: { children: ReactNode }) {
  const { session } = useStore()
  if (!session) return <Navigate to="/entrar" replace />
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
        <Route path="/codigo" element={pendingEmail ? <Code /> : <Navigate to="/entrar" replace />} />
        <Route path="/" element={<Private><Home /></Private>} />
        <Route path="/produto/:id" element={<Private><Item /></Private>} />
        <Route path="/conta" element={<Private><Account /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
