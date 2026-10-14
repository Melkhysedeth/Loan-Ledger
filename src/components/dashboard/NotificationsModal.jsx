import { X, ChevronRight } from 'lucide-react'
import { formatCOP } from '../../utils/format'

export default function NotificationsModal({ overdue, dueSoon, onClose, onSelectLoan }) {
    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Notificaciones</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {overdue.length === 0 && dueSoon.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No tienes préstamos en mora ni por vencer 🎉</p>
                ) : (
                    <div className="space-y-5">
                        {overdue.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-red-500 mb-2">EN MORA ({overdue.length})</p>
                                <div className="space-y-2">
                                    {overdue.map(loan => (
                                        <NotificationRow key={loan.id} loan={loan} tone="red" onClick={() => onSelectLoan(loan.id)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {dueSoon.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-amber-500 mb-2">POR VENCER ({dueSoon.length})</p>
                                <div className="space-y-2">
                                    {dueSoon.map(loan => (
                                        <NotificationRow key={loan.id} loan={loan} tone="amber" onClick={() => onSelectLoan(loan.id)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function NotificationRow({ loan, tone, onClick }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const styles = {
        red: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600', label: 'text-red-500' },
        amber: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-500', label: 'text-amber-500' },
    }[tone]

    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition text-left">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${styles.bg} ${styles.text}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className={`text-xs ${styles.label}`}>{tone === 'red' ? 'En mora' : 'Vence pronto'}</p>
            </div>
            <p className={`font-semibold text-sm shrink-0 ${styles.text}`}>{formatCOP(loan.amount)}</p>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
    )
}
