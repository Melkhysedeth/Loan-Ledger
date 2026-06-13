import { useEffect, useState } from 'react'
import { supabase } from '../db/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCOP } from '../utils/format'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Bell, DollarSign, LayoutList, AlertTriangle, Smile, Calendar } from 'lucide-react'

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return '¡Buenos días'
    if (h < 18) return '¡Buenas tardes'
    return '¡Buenas noches'
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalLent: 0,
        collectedThisMonth: 0,
        activeLoans: 0,
        overdue: [],
        dueSoon: [],
        monthlyData: [],
        attention: []
    })

    const { user } = useAuth()
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'usuario'

    useEffect(() => {
        async function load() {
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

            const [{ data: clients }, { data: loans }, { data: payments }] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('loans').select('*'),
                supabase.from('payments').select('*'),
            ])

            const allLoans = loans || []
            const allClients = clients || []
            const allPayments = payments || []

            const activeLoans = allLoans.filter(l => ['active', 'overdue', 'frozen', 'agreement'].includes(l.status))
            const totalLent = activeLoans.reduce((s, l) => s + (l.amount || 0), 0)

            const collectedThisMonth = allPayments
                .filter(p => p.date >= startOfMonth.split('T')[0])
                .reduce((s, p) => s + (p.total_paid || 0), 0)

            // Mora y próximos usando loanCalc (igual que Collections)
            const overdue = []
            const dueSoon = []

            for (const loan of activeLoans) {
                if (!loan.first_payment_date) continue
                const loanPayments = allPayments.filter(p => p.loan_id === loan.id)
                const paymentsMade = loanPayments.length
                const classification = classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade)
                const client = allClients.find(c => c.id === loan.client_id)

                if (classification === 'overdue') overdue.push({ ...loan, client })
                if (classification === 'today' || classification === 'soon') dueSoon.push({ ...loan, client })
            }

            // Gráfica: últimos 6 meses
            const monthlyData = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
                const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
                const dStr = d.toISOString().split('T')[0]
                const nStr = nextMonth.toISOString().split('T')[0]

                const cobrado = allPayments
                    .filter(p => p.date >= dStr && p.date < nStr)
                    .reduce((s, p) => s + (p.total_paid || 0), 0)

                const prestado = allLoans
                    .filter(l => l.created_at >= dStr && l.created_at < nStr)
                    .reduce((s, l) => s + (l.amount || 0), 0)

                return { month: MONTHS[d.getMonth()], cobrado, prestado }
            })

            const attention = [
                ...overdue.map(l => ({ ...l, tag: 'overdue' })),
                ...dueSoon.map(l => ({ ...l, tag: 'dueSoon' })),
            ].slice(0, 5)

            setStats({ totalLent, collectedThisMonth, activeLoans: activeLoans.length, overdue, dueSoon, monthlyData, attention })
        }
        load()
    }, [])

    const { totalLent, collectedThisMonth, activeLoans, overdue, dueSoon, monthlyData, attention } = stats

    return (
        <div className="px-4 pt-6 pb-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Smile size={22} className="text-blue-400" />
                        {getGreeting()}, {userName}!
                    </h1>
                    <p className="text-sm text-gray-400">{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <button className="relative p-2 bg-white dark:bg-gray-800 rounded-full shadow">
                    <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Saldo total */}
            <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)' }}>
                <p className="text-sm opacity-80">Saldo total prestado</p>
                <p className="text-3xl font-bold mt-1">{formatCOP(totalLent)}</p>
            </div>

            {/* 4 métricas */}
            <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Total cobrado" sub="este mes" value={formatCOP(collectedThisMonth)} color="blue" Icon={DollarSign} />
                <MetricCard label="Préstamos activos" sub="activos" value={activeLoans} color="green" Icon={LayoutList} />
                <MetricCard label="En mora" sub="clientes" value={overdue.length} color="red" Icon={AlertTriangle} />
                <MetricCard label="Próximos a vencer" sub="clientes" value={dueSoon.length} color="purple" Icon={Calendar} />
            </div>

            {/* Gráfica mensual */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Resumen mensual</p>
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthlyData} barGap={2}>
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                            formatter={(v, name) => [formatCOP(v), name === 'cobrado' ? 'Cobrado' : 'Prestado']}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', backgroundColor: '#1f2937', color: '#f9fafb', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                        />
                        <Bar dataKey="cobrado" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="prestado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />Cobrado</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Prestado</div>
                </div>
            </div>

            {/* Requieren atención */}
            {attention?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-200">Requieren atención</p>
                        <button className="text-sm text-blue-500">Ver todos</button>
                    </div>
                    {attention.map((loan, i) => (
                        <AttentionRow key={loan.id} loan={loan} last={i === attention.length - 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

function MetricCard({ label, sub, value, color, Icon }) {
    const themes = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500', wave: '#3b5bdb' },
        green: { bg: 'bg-green-50 dark:bg-green-950/40', icon: 'bg-green-100 dark:bg-green-900/50 text-green-500', wave: '#22c55e' },
        red: { bg: 'bg-red-50 dark:bg-red-950/40', icon: 'bg-red-100 dark:bg-red-900/50 text-red-500', wave: '#ef4444' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500', wave: '#a855f7' },
    }
    const t = themes[color]

    return (
        <div className={`${t.bg} rounded-2xl p-4 shadow-sm relative overflow-hidden`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${t.icon} mb-2`}>
                <Icon size={16} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
            <svg className="absolute bottom-0 right-0 opacity-20" width="80" height="40" viewBox="0 0 80 40" fill="none">
                <path d="M0 30 Q10 10 20 25 Q30 40 40 20 Q50 0 60 18 Q70 35 80 15" stroke={t.wave} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
        </div>
    )
}

function AttentionRow({ loan, last }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const isOverdue = loan.tag === 'overdue'
    const avatarColor = isOverdue
        ? 'bg-red-100 dark:bg-red-900/40 text-red-600'
        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-500'

    return (
        <div className={`flex items-center gap-3 px-4 py-3 ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColor}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                    {isOverdue ? 'En mora' : 'Vence pronto'}
                </p>
            </div>
            <div className="text-right">
                <p className={`font-semibold text-sm ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                    {formatCOP(loan.amount)}
                </p>
                <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>
        </div>
    )
}