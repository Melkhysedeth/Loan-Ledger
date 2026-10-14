// Superficie estándar de tarjeta (claro + oscuro).
export const CARD = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent'

export function StatCard({ label, value, sub, accent = 'text-gray-900 dark:text-white' }) {
    return (
        <div className={`${CARD} p-4`}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold truncate ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
    )
}

export function SectionCard({ title, Icon, children }) {
    return (
        <div className={`${CARD} p-4`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Icon size={14} className="text-gray-500 dark:text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

// Celda con ícono para cuadrículas de detalle.
export function DetailCell({ Icon, label, value, valueColor = 'text-gray-800 dark:text-gray-100' }) {
    return (
        <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={13} className="text-blue-500" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className={`text-xs font-semibold capitalize ${valueColor}`}>{value}</p>
            </div>
        </div>
    )
}

export function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between items-start text-sm py-0.5">
            <span className="text-gray-400 shrink-0 mr-3">{label}</span>
            <span className="text-gray-800 dark:text-gray-100 font-medium capitalize text-right">{value}</span>
        </div>
    )
}

export function EmptyState({ text }) {
    return (
        <div className={`${CARD} px-4 py-8 text-center`}>
            <p className="text-sm text-gray-400">{text}</p>
        </div>
    )
}
