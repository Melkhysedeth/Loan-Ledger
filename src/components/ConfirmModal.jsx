import { AlertTriangle } from 'lucide-react'

/**
 * Modal genérico para:
 *  - Confirmar una eliminación (mode="confirm")
 *  - Avisar que la eliminación está bloqueada (mode="blocked")
 *
 * Props:
 *  - open: boolean
 *  - mode: 'confirm' | 'blocked'
 *  - message: string
 *  - onConfirm: () => void   (solo se usa en mode="confirm")
 *  - onClose: () => void
 */
export default function ConfirmModal({ open, mode = 'confirm', message, onConfirm, onClose }) {
    if (!open) return null

    const isBlocked = mode === 'blocked'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
            <div
                className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isBlocked ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                    <AlertTriangle size={22} className={isBlocked ? 'text-amber-500' : 'text-red-500'} />
                </div>

                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    {isBlocked ? 'No se puede eliminar' : '¿Eliminar este registro?'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{message}</p>

                {isBlocked ? (
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2.5 rounded-xl active:scale-95 transition"
                    >
                        Entendido
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2.5 rounded-xl active:scale-95 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl active:scale-95 transition"
                        >
                            Eliminar
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}