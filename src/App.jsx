import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import NewLoan from './pages/NewLoan'
import Reports from './pages/Reports'
import NewClient from './pages/NewClient'
import Loans from './pages/Loans'
import LoanDetail from './pages/LoanDetail'
import { useTheme } from './hooks/useTheme'
import Collections from './pages/Collections'
import ClientDetail from './pages/ClientDetail'
import More from './pages/More'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CreditCard } from 'lucide-react'
import { useInactivity } from './hooks/useInactivity'

const HomeIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
)

const ClientsIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
)

const LoansIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
)

const CollectIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
)

const MoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

function BottomNav() {
  const base = "flex flex-col items-center gap-0.5 text-[11px] pt-2 pb-1 px-3 transition-colors"
  const active = "text-blue-400 font-semibold"
  const inactive = "text-gray-500"

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around z-50">
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => <><HomeIcon filled={isActive} /><span>Dashboard</span></>}
      </NavLink>
      <NavLink to="/clients" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => <><ClientsIcon filled={isActive} /><span>Clientes</span></>}
      </NavLink>
      <NavLink to="/loans" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => <><LoansIcon filled={isActive} /><span>Préstamos</span></>}
      </NavLink>
      <NavLink to="/collections" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => <><CollectIcon filled={isActive} /><span>Cobros</span></>}
      </NavLink>
      <NavLink to="/more" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => <><MoreIcon filled={isActive} /><span>Más</span></>}
      </NavLink>
    </nav>
  )
}

function AppRoutes() {
  useTheme()
  useInactivity(5) // cierra sesión tras 5 min de inactividad
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
  // ...resto igual

  if (user === null) return <Login />

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<NewClient />} />
        <Route path="/clients/:id" element={<NewClient />} />
        <Route path="/new-loan" element={<NewLoan />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/clients/:id/detail" element={<ClientDetail />} />
        <Route path="/more" element={<More />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
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