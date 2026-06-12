import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { formatCOP } from '../utils/format'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { AlertCircle, Clock, CheckCircle, ChevronRight } from 'lucide-react'

const SECTIONS = {
    overdue: { label: 'Atrasados', color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/40', Icon: AlertCircle, border: 'border-red-800/50', avatarBg: 'bg-red-900/40' },
    today: { label: 'Cobrar hoy', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40', Icon: Clock, border: 'border-yellow-800/50', avatarBg: 'bg-yellow-900/40' },
    soon: { label: 'Próximos 7 días', color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/40', Icon: Clock, border: 'border-blue-800/50', avatarBg: 'bg-blue-900/40' },
}

export default function Collections() {
    const navigate = useNavigate()
    const [grouped, setGrouped] = useState({ overdue: [], today: [], soon: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [allLoans, allClients, allPayments] = await Promise.all([
            db.loans.toArray(),
            db.clients.toArray(),
            db.payments.toArray(),
        ])

        const activeLoans = allLoans.filter(l => l.status === 'active' || l.status === 'overdue')

        const result = { overdue: [], today: [], soon: [] }

        for (const loan of activeLoans) {
            if (!loan.firstPaymentDate) continue
            const loanPayments = allPayments.filter(p => p.loanId === loan.id)
            const paymentsMade = loanPayments.length
            const classification = classifyLoan(loan.firstPaymentDate, loan.frequency, paymentsMade)
            if (!result[classification]) continue

            const client = allClients.find(c => c.id === loan.clientId)
            const nextPayment = calcNextPaymentDate(loan.firstPaymentDate, loan.frequency, paymentsMade)

            result[classification].push({ ...loan, client, nextPayment, paymentsMade })
        }

        setGrouped(result)
        setLoading(false)
    }

    const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)

    return (
        <div className="px-4 pt-6 pb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Cobros</h1>
            <p className="text-sm text-gray-400 mb-5">
                {total === 0 ? 'Todo al día 🎉' : `${total} préstamo${total > 1 ? 's' : ''} requieren atención`}
            </p>

            {loading && <p className="text-center text-gray-500 mt-20">Cargando...</p>}

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
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{items.length}</span>
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

    return (
        <button onClick={onPress} className={`w-full bg-gray-800 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition text-left border ${cfg.border}`}>
            <div className={`w-11 h-11 rounded-full ${cfg.avatarBg} text-gray-200 font-bold text-sm flex items-center justify-center shrink-0`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-100 text-sm truncate">{name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatCOP(loan.interestAmount)} / cuota · {loan.frequency}</p>
                <p className="text-xs text-gray-500">
                    Próximo pago: {loan.nextPayment ? loan.nextPayment.toLocaleDateString('es-CO') : '—'}
                </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <p className={`text-sm font-bold ${cfg.color}`}>{formatCOP(loan.amount)}</p>
                <ChevronRight size={16} className="text-gray-600" />
            </div>
        </button>
    )
}