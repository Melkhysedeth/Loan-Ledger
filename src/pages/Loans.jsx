import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { formatCOP } from '../utils/format'
import { Search, Plus, ChevronRight, AlertCircle, Clock, CheckCircle } from 'lucide-react'

const STATUS_CONFIG = {
    active: { label: 'Activo', color: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400', Icon: CheckCircle },
    frozen: { label: 'Congelado', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', Icon: Clock },
    overdue: { label: 'En mora', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400', Icon: AlertCircle },
    paid: { label: 'Liquidado', color: 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400', Icon: CheckCircle },
}

export default function Loans() {
    const navigate = useNavigate()
    const [loans, setLoans] = useState([])
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState('active')

    useEffect(() => { loadLoans() }, [])

    async function loadLoans() {
        const [allLoans, allClients] = await Promise.all([
            db.loans.toArray(),
            db.clients.toArray(),
        ])
        const enriched = allLoans.map(loan => ({
            ...loan,
            client: allClients.find(c => c.id === loan.clientId),
        }))
        setLoans(enriched)
    }

    const filters = ['active', 'overdue', 'frozen', 'paid']

    const filtered = loans.filter(l => {
        const matchStatus = l.status === filter
        const q = query.toLowerCase()
        const matchQuery = !q
            || l.client?.name?.toLowerCase().includes(q)
            || l.client?.cedula?.includes(q)
        return matchStatus && matchQuery
    })

    return (
        <div className="pb-6">
            <div className="px-4 pt-6 pb-3">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-white">Préstamos</h1>
                    <button
                        onClick={() => navigate('/new-loan')}
                        className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow active:scale-95 transition"
                    >
                        + Nuevo
                    </button>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input
                        className="flex-1 text-sm text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none placeholder-gray-400"
                        placeholder="Buscar cliente o cédula..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
                {filters.map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition
              ${filter === f
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}
                    >
                        {STATUS_CONFIG[f].label}
                    </button>
                ))}
            </div>

            <div className="px-4 space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-16">
                        <p>No hay préstamos {STATUS_CONFIG[filter].label.toLowerCase()}s</p>
                    </div>
                ) : (
                    filtered.map(loan => <LoanCard key={loan.id} loan={loan} onPress={() => navigate(`/loans/${loan.id}`)} />)
                )}
            </div>
        </div>
    )
}

function LoanCard({ loan, onPress }) {
    const cfg = STATUS_CONFIG[loan.status] || STATUS_CONFIG.active
    const { Icon } = cfg
    const initials = (loan.client?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    return (
        <button onClick={onPress} className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition text-left">
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{loan.client?.name || 'Cliente'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatCOP(loan.amount)} · {loan.frequency}</p>
                {loan.dueDate && (
                    <p className="text-xs text-gray-400">Vence: {new Date(loan.dueDate).toLocaleDateString('es-CO')}</p>
                )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                    <Icon size={10} /> {cfg.label}
                </span>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
        </button>
    )
}