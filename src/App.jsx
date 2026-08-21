import { BrowserRouter, Routes, Route, Navigate, } from 'react-router-dom'
import Hub from './pages/Hub'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import NewLoan from './pages/NewLoan'
import UnifyLoans from './pages/UnifyLoans'
import Reports from './pages/Reports'
import NewClient from './pages/NewClient'
import Loans from './pages/Loans'
import LoanDetail from './pages/LoanDetail'
import { useTheme } from './hooks/useTheme'
import Collections from './pages/Collections'
import ClientDetail from './pages/ClientDetail'
import More from './pages/More'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CreditCard } from 'lucide-react'
import { useInactivity } from './hooks/useInactivity'
import PaymentScreen from './pages/PaymentScreen'
import Fuxion from './pages/Fuxion'
import LoansLayout from './layouts/LoansLayout'
import FuxionLayout from './layouts/FuxionLayout'

function AppRoutes() {
  useTheme()
  useInactivity(5)
  const { user, redirecting } = useAuth()

  if (user === undefined || redirecting) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)' }}>
          <CreditCard size={20} color="white" />
        </div>
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  )

  if (user === null) return <Login />

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-950">
      <Routes>
        {/* Hub: sin barra de navegación propia */}
        <Route path="/" element={<Hub />} />

        {/* Módulo Préstamos: comparte una sola barra */}
        <Route element={<LoansLayout />}>
          <Route path="/loans" element={<Dashboard />} />
          <Route path="/loans/list" element={<Loans />} />
          <Route path="/loans/:id" element={<LoanDetail />} />
          <Route path="/loans/:id/pay" element={<PaymentScreen />} />
          <Route path="/new-loan" element={<NewLoan />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/clients/:id" element={<NewClient />} />
          <Route path="/clients/:id/detail" element={<ClientDetail />} />
          <Route path="/clients/:id/unify-loans" element={<UnifyLoans />} />
          <Route path="/more" element={<More />} />
          <Route path="/reports" element={<Reports />} />
        </Route>

        {/* Módulo Fuxion: su propia barra */}
        <Route element={<FuxionLayout />}>
          <Route path="/fuxion" element={<Fuxion />} />
        </Route>

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}