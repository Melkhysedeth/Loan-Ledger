import { CheckCircle, Ban } from 'lucide-react'
import { formatCOP, formatDate } from '../../utils/format'
import { CARD } from '../ui/Cards'

const shortId = (id) => String(id).slice(-4).padStart(4, '0')

function PaymentRow({ p, onSelect, onVoid }) {
    const voided = !!p.voided
    return (
        <div
            onClick={() => onSelect(p)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/40 transition ${voided ? 'opacity-50' : ''}`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${voided ? 'bg-gray-200 dark:bg-gray-700' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {voided ? <Ban size={14} className="text-gray-400" /> : <CheckCircle size={14} className="text-green-500" />}
            </div>

            <div className="flex-1 min-w-0">
                {p.notes && (
                    <p className={`text-xs ${voided ? 'text-gray-400' : 'text-amber-600 dark:text-amber-400'}`}>{p.notes}</p>
                )}
                <p className={`text-sm font-semibold ${voided ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                    {formatCOP(p.total_paid)}
                    {p.is_extra && !voided && (
                        <span className="ml-2 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            Abono adicional
                        </span>
                    )}
                </p>
                <p className="text-xs text-gray-400">
                    Capital: {formatCOP(p.capital_paid)} · Interés: {formatCOP(p.interest_paid)}
                </p>
                {p.payment_method && !voided && (
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {p.payment_method === 'breb' ? 'Bre-B' : p.payment_method}
                        {p.reference ? ` · Ref: ${p.reference}` : ''}
                    </p>
                )}
                {p.original_loan_id && !voided && (
                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">
                        Migrado de préstamo #{shortId(p.original_loan_id)}
                    </p>
                )}
                {voided && p.void_reason && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Anulado: {p.void_reason}</p>
                )}
            </div>

            <div className="text-right">
                <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                {p.late && !voided && <span className="text-[10px] text-red-500 dark:text-red-400">Tardío</span>}
            </div>

            {voided ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    Anulado
                </span>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); onVoid(p) }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 active:scale-95 transition"
                >
                    Anular
                </button>
            )}
        </div>
    )
}

export default function PaymentHistory({ payments, onSelect, onVoid }) {
    return (
        <div className={`${CARD} overflow-hidden`}>
            <p className="font-bold text-gray-800 dark:text-gray-100 px-4 pt-4 pb-2 text-sm">Historial de pagos</p>
            {payments.length === 0 ? (
                <p className="text-sm text-gray-500 px-4 pb-4">Sin pagos registrados aún</p>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payments.map(p => <PaymentRow key={p.id} p={p} onSelect={onSelect} onVoid={onVoid} />)}
                </div>
            )}
        </div>
    )
}
