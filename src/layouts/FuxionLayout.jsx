import { NavLink, Outlet } from 'react-router-dom'
import { Home, ShoppingBag, Users, Box, MoreHorizontal, Leaf } from 'lucide-react'

// Color de acento de la barra activa, alineado con el azul del nuevo hero
// del dashboard. Antes era el morado de marca (#7e22ce); si prefieres
// mantener el morado en la nav aunque el hero sea azul, solo cambia esto.
const ACTIVE_COLOR = '#2563eb'

const NAV_ITEMS = [
    { to: '/hub', label: 'Inicio', Icon: Home, end: true },
    { to: '/fuxion', label: 'Fuxion', Icon: Leaf },
    { to: '/fuxion/sales', label: 'Ventas', Icon: ShoppingBag },
    { to: '/fuxion/clients', label: 'Clientes', Icon: Users }, // TODO: confirma esta ruta, no la vi en tu árbol de páginas
    { to: '/fuxion/products', label: 'Inventario', Icon: Box },
    { to: '/fuxion/more', label: 'Más', Icon: MoreHorizontal }, // TODO: ajusta si tu ruta "Más" es otra
]

function FuxionNav() {
    const base = "flex flex-col items-center gap-0.5 text-[11px] pt-2 pb-1 flex-1 transition-colors"
    const inactive = "text-gray-400"

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex z-50">
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `${base} ${isActive ? 'font-semibold' : inactive}`}
                    style={({ isActive }) => (isActive ? { color: ACTIVE_COLOR } : {})}
                >
                    <Icon size={20} />
                    <span>{label}</span>
                </NavLink>
            ))}
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