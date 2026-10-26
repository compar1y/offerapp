import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import { Code, Login } from './pages/Access'
import { Welcome } from './pages/Welcome'
import { Home } from './pages/Home'
import { Recipe } from './pages/Recipe'
import { Lesson, Module } from './pages/Module'
import { Offer, Payment } from './pages/Offer'
import { Account } from './pages/Account'

function Private({ children }: { children: ReactNode }) {
  const { email, welcomed } = useStore()
  if (!email) return <Navigate to="/entrar" replace />
  if (!welcomed) return <Navigate to="/boas-vindas" replace />
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
  const { email, pendingEmail } = useStore()
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/entrar" element={email ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/codigo" element={pendingEmail ? <Code /> : <Navigate to="/entrar" replace />} />
        <Route path="/boas-vindas" element={email ? <Welcome /> : <Navigate to="/entrar" replace />} />
        <Route path="/" element={<Private><Home /></Private>} />
        <Route path="/receita/:id" element={<Private><Recipe /></Private>} />
        <Route path="/modulo/:id" element={<Private><Module /></Private>} />
        <Route path="/modulo/:id/:lessonId" element={<Private><Lesson /></Private>} />
        <Route path="/oferta/:product" element={<Private><Offer /></Private>} />
        <Route path="/pagamento/:orderId" element={<Private><Payment /></Private>} />
        <Route path="/conta" element={<Private><Account /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
