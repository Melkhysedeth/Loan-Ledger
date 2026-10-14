const TONES = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40 text-blue-700 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/40 text-green-700 dark:text-green-400',
}

// Aviso con ícono y título. Los hijos van en texto secundario.
export default function Banner({ tone = 'blue', Icon, title, children }) {
    return (
        <div className={`${TONES[tone]} border rounded-2xl px-4 py-3 flex gap-3 items-start`}>
            {Icon && <Icon size={16} className="mt-0.5 shrink-0" />}
            <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                {children && <div className="text-xs mt-0.5 text-gray-600 dark:text-gray-400 space-y-0.5">{children}</div>}
            </div>
        </div>
    )
}
