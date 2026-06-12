import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { AlertCircle, Clock, CheckCircle, ChevronRight } from 'lucide-react'

const SECTIONS = {
    overdue: { label: 'Atrasados', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', avatarBg: 'bg-red-100 dark:bg-red-900/40', Icon: AlertCircle },
    today: { label: 'Cobrar hoy', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800/50', avatarBg: 'bg-yellow-100 dark:bg-yellow-900/40', Icon: Clock },
    soon: { label: 'Próximos 7 días', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', avatarBg: 'bg-blue-100 dark:bg-blue-900/40', Icon: Clock },
}

export default function Collections() {
    const navigate = useNavigate()
    const [grouped, setGrouped] = useState({ overdue: [], today: [], soon: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)

        const [{ data: allLoans }, { data: allClients }, { data: allPayments }] = await Promise.all([
            supabase.from('loans').select('*'),
            supabase.from('clients').select('*'),
            supabase.from('payments').select('*'),
        ])

        const activeLoans = (allLoans || []).filter(l =>
            l.status === 'active' || l.status === 'overdue' || l.status === 'agreement'
        )

        const result = { overdue: [], today: [], soon: [] }

        for (const loan of activeLoans) {
            if (!loan.first_payment_date) continue
            const loanPayments = (allPayments || []).filter(p => p.loan_id === loan.id)
            const paymentsMade = loanPayments.length
            const classification = classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade)
            if (!result[classification]) continue

            const client = (allClients || []).find(c => c.id === loan.client_id)
            const nextPayment = calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)

            result[classification].push({ ...loan, client, nextPayment, paymentsMade })
        }

        setGrouped(result)
        setLoading(false)
    }

    const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)

    return (
        <div className="px-4 pt-6 pb-24">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Cobros</h1>
            <p className="text-sm text-gray-400 mb-5">
                {total === 0 ? 'Todo al día 🎉' : `${total} préstamo${total > 1 ? 's' : ''} requieren atención`}
            </p>

            {loading && (
                <div className="space-y-3 mt-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3 animate-pulse border border-gray-100 dark:border-transparent">
                            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3" />
                            </div>
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                    ))}
                </div>
            )}

            {!loading && total === 0 && (
                <div className="text-center mt-24">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                    <p className="text-gray-400">No hay cobros pendientes</p>
                </div>
            )}

            {['overdue', 'today', 'soon'].map(key => {
                const items = grouped[key]
                if (items.length === 0) return null
                const cfg = SECTIONS[key]
                return (
                    <div key={key} className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <cfg.Icon size={15} className={cfg.color} />
                            <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{items.length}</span>
                        </div>
                        <div className="space-y-2">
                            {items.map(loan => (
                                <CollectionCard key={loan.id} loan={loan} cfg={cfg} onPress={() => navigate(`/loans/${loan.id}`)} />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function CollectionCard({ loan, cfg, onPress }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const isAgreement = loan.status === 'agreement'

    return (
        <button
            onClick={onPress}
            className={`w-full bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition text-left border shadow-sm dark:shadow-none ${cfg.border}`}
        >
            <div className={`w-11 h-11 rounded-full ${cfg.avatarBg} font-bold text-sm flex items-center justify-center shrink-0 ${cfg.color}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{name}</p>
                    {isAgreement && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0">Acuerdo</span>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatCOP(loan.interest_amount)} / cuota · {loan.frequency}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    Próximo pago: {loan.nextPayment ? loan.nextPayment.toLocaleDateString('es-CO') : '—'}
                </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <p className={`text-sm font-bold ${cfg.color}`}>{formatCOP(loan.amount)}</p>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
        </button>
    )
}