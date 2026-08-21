import { NavLink, Outlet } from 'react-router-dom'
import { Home, Leaf, MoreHorizontal } from 'lucide-react'

function FuxionNav() {
    const base = "flex flex-col items-center gap-0.5 text-[11px] pt-2 pb-1 px-3 transition-colors"
    const active = "font-semibold"
    const inactive = "text-gray-500"

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around z-50">
            <NavLink to="/" className={`${base} ${inactive}`}>
                <Home size={22} /><span>Hub</span>
            </NavLink>
            <NavLink to="/fuxion" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`} style={({ isActive }) => isActive ? { color: '#7e22ce' } : {}}>
                <Leaf size={22} /><span>Fuxion</span>
            </NavLink>
            <NavLink to="/more" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <MoreHorizontal size={22} /><span>Más</span>
            </NavLink>
        </nav>
    )
}

export default function FuxionLayout() {
    return (
        <div className="pb-16">
            <Outlet />
            <FuxionNav />
        </div>
    )
}