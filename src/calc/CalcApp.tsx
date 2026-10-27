// Conta da Fornada: rotas de /conta-da-fornada/*
import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { refreshSession, useStore } from '../lib/store'
import { Dados } from './Data'
import { CalcHome, Nova } from './Hub'
import { Hora, Mes, Preco } from './Paid'
import { Resultado } from './Result'
import { Wizard } from './Wizard'
import { Ferramentas, Ingredientes } from './Tools'
import { openCalc } from './store'
import { BASE, useOwned } from './ui'

export function CalcApp() {
  const s = useStore()
  const email = s.session?.email ?? ''
  const owned = useOwned()
  useEffect(() => {
    if (email) void openCalc(email)
  }, [email])
  // quem acabou de pagar volta da Wiapy para cá: o app relê a conta ao voltar para a aba
  useEffect(() => {
    if (owned) return
    const f = () => document.visibilityState === 'visible' && void refreshSession()
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [owned])
  return (
    <Routes>
      <Route index element={<CalcHome />} />
      <Route path="nova" element={<Nova />} />
      <Route path="conta/:id" element={<Resultado />} />
      <Route path="conta/:id/:passo" element={<Wizard />} />
      <Route path="preco" element={<Preco />} />
      <Route path="mes" element={<Mes />} />
      <Route path="hora" element={<Hora />} />
      <Route path="ferramentas" element={<Ferramentas />} />
      <Route path="ingredientes" element={<Ingredientes />} />
      <Route path="dados" element={<Dados />} />
      <Route path="*" element={<Navigate to={BASE} replace />} />
    </Routes>
  )
}
