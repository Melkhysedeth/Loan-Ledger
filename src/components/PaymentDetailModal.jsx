import { X } from 'lucide-react'
import { formatCOP } from '../utils/format'
import { getMethodLabel, getMethodIcon } from '../constants/paymentMethods'

export default function PaymentDetailModal({ payment, onClose }) {
    const methodsUsed = payment.payment_method
        ? [{ id: payment.payment_method, label: getMethodLabel(payment.payment_method), amount: payment.total_paid }]
        : payment.method_breakdown
            ? Object.entries(payment.method_breakdown).map(([m, amt]) => ({
                id: m, label: getMethodLabel(m), amount: amt,
            }))
            : []

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Detalle del pago</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {payment.client?.name && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
                        <p className="text-xs text-blue-400 mb-0.5">Cliente</p>
                        <p className="font-bold text-blue-800 dark:text-blue-300">{payment.client.name}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 mb-1">Fecha</p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {new Date(payment.date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 mb-1">Estado</p>
                        <p className={`text-sm font-semibold ${payment.late ? 'text-red-500' : 'text-green-500'}`}>
                            {payment.voided ? 'Anulado' : payment.late ? 'Pago en mora' : 'Al día'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 mb-1">Interés</p>
                        <p className="text-sm font-bold text-blue-500">{formatCOP(payment.interest_paid)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 mb-1">Capital</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatCOP(payment.capital_paid)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 mb-1">Total</p>
                        <p className="text-sm font-bold text-green-600">{formatCOP(payment.total_paid)}</p>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">Método(s) de pago</p>
                    {methodsUsed.length > 0 ? (
                        <div className="space-y-2">
                            {methodsUsed.map((m, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 shrink-0">
                                        {getMethodIcon(m.id)}
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{m.label}</span>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{formatCOP(m.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Sin método registrado</p>
                    )}
                </div>

                {payment.reference && (
                    <div className="mb-3">
                        <p className="text-[10px] text-gray-400 mb-0.5">Referencia</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{payment.reference}</p>
                    </div>
                )}

                {payment.notes && (
                    <div className="mb-3">
                        <p className="text-[10px] text-gray-400 mb-0.5">Observaciones</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{payment.notes}</p>
                    </div>
                )}

                {payment.voided && payment.void_reason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-xs text-red-500">
                        Motivo de anulación: {payment.void_reason}
                    </div>
                )}
            </div>
        </div>
    )
}