import { ChevronRight } from 'lucide-react'
import { formatCOP } from '../../utils/format'
import { getMethodLabel } from '../../constants/paymentMethods'

// Colores de los íconos redondos (claro + oscuro), compartidos por MetricCard y QuickAction.
const ICON_TONES = {
    blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
    green: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
    red: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
    amber: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    purple: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
}

export function MetricCard({ label, sub, value, color, Icon }) {

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 relative overflow-hidden min-w-0 shadow-sm flex items-center gap-3">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl shrink-0 ${ICON_TONES[color] || 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{sub}</p>
            </div>
        </div>
    )
}

export function QuickStat({ label, value }) {
    return (
        <div className="text-center">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{label}</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">{value}</p>
        </div>
    )
}

export function AttentionRow({ loan, last, onPress }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const isOverdue = loan.tag === 'overdue'
    const avatarColor = isOverdue
        ? 'bg-red-100 dark:bg-red-900/40 text-red-600'
        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-500'

    return (
        <button onClick={onPress} className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40 transition ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarColor}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                    {isOverdue ? 'En mora' : 'Vence pronto'}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className={`font-semibold text-sm ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                    {formatCOP(loan.amount)}
                </p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
    )
}

export function PaymentRow({ payment, last, onClick }) {
    const name = payment.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const methodLabel = payment.payment_method ? getMethodLabel(payment.payment_method) : ''

    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40 transition ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold text-sm flex items-center justify-center shrink-0">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className="text-xs text-gray-400">
                    {new Date(payment.date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    {methodLabel ? ` · ${methodLabel}` : ''}
                </p>
            </div>
            <p className="font-semibold text-sm text-green-500 shrink-0">{formatCOP(payment.total_paid)}</p>
        </button>
    )
}

export function QuickAction({ label, Icon, color, onClick }) {
    return (
        <button
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 active:scale-95 transition text-center"
        >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${ICON_TONES[color]}`}>
                <Icon size={16} />
            </div>
            <span className="text-[10px] font-medium leading-tight text-gray-700 dark:text-gray-200">{label}</span>
        </button>
    )
}
