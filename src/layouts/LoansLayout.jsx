import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Users, Wallet, CircleDollarSign, MoreHorizontal, LayoutDashboard } from 'lucide-react'

function LoansNav() {
    const location = useLocation()
    const base = "flex flex-col items-center gap-0.5 text-[11px] pt-2 pb-1 px-3 transition-colors"
    const active = "text-teal-500 font-semibold"
    const inactive = "text-gray-500"

    // Cubre /loans/list, /loans/:id, /loans/:id/pay, y el caso especial /new-loan
    const isLoansModuleActive = location.pathname.startsWith('/loans/') || location.pathname === '/new-loan'

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around z-50">
            <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <Home size={22} /><span>Hub</span>
            </NavLink>
            <NavLink to="/loans" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <LayoutDashboard size={22} /><span>Dashboard</span>
            </NavLink>
            <NavLink to="/loans/list" className={`${base} ${isLoansModuleActive ? active : inactive}`}>
                <Wallet size={22} /><span>Préstamos</span>
            </NavLink>
            <NavLink to="/clients" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <Users size={22} /><span>Clientes</span>
            </NavLink>
            <NavLink to="/collections" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <CircleDollarSign size={22} /><span>Cobros</span>
            </NavLink>
            <NavLink to="/more" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <MoreHorizontal size={22} /><span>Más</span>
            </NavLink>
        </nav>
    )
}

export default function LoansLayout() {
    return (
        <div className="pb-16">
            <Outlet />
            <LoansNav />
        </div>
    )
}