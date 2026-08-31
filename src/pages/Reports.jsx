import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import {
    ChevronLeft, TrendingUp, AlertCircle, AlertTriangle, Percent, BarChart2,
    BarChart3, Banknote, ChevronRight, ChevronDown, X, DollarSign, Clock,
    Users, UserRound, Calendar
} from 'lucide-react'

export default function Reports() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [showWithdrawHistory, setShowWithdrawHistory] = useState(false)

    useEffect(() => { load() }, [])

    async function load() {
        const [{ data: loans }, { data: payments }, { data: clients }, { data: withdrawals }] = await Promise.all([
            supabase.from('loans').select('id, amount, interest_rate, status, created_at'),
            supabase.from('payments').select('total_paid, interest_paid, created_at').eq('voided', false),
            supabase.from('clients').select('id'),
            supabase.from('capital_withdrawals').select('amount, date, notes, is_transfer').order('date', { ascending: false }),
        ])

        const activeLoans = (loans || []).filter(l => ['active', 'frozen', 'agreement'].includes(l.status))
        const overdueLoans = (loans || []).filter(l => l.status === 'overdue')
        const allPayments = payments || []
        const allWithdrawals = (withdrawals || []).filter(w => !w.is_transfer)

        const capitalRetirado = allWithdrawals.reduce((s, w) => s + (w.amount || 0), 0)
        const retirosCount = allWithdrawals.length
        const lastWithdrawal = allWithdrawals[0] || null

        const capitalActivo = [...activeLoans, ...overdueLoans].reduce((s, l) => s + (l.amount || 0), 0) - capitalRetirado
        const capitalEnMora = overdueLoans.reduce((s, l) => s + (l.amount || 0), 0)
        const gananciaTotal = allPayments.reduce((s, p) => s + (p.interest_paid || 0), 0)

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const pagosEsteMes = allPayments
            .filter(p => new Date(p.created_at) >= startOfMonth)
            .reduce((s, p) => s + (p.interest_paid || 0), 0)

        const allActiveForRate = [...activeLoans, ...overdueLoans]
        const tasaPromedio = allActiveForRate.length > 0
            ? allActiveForRate.reduce((s, l) => s + (l.interest_rate || 0), 0) / allActiveForRate.length
            : 0

        const byRate = {}
        allActiveForRate.forEach(l => {
            const key = `${l.interest_rate}%`
            if (!byRate[key]) byRate[key] = { count: 0, totalAmount: 0, rate: l.interest_rate }
            byRate[key].count++
            byRate[key].totalAmount += l.amount || 0
        })
        const rateGroups = Object.entries(byRate)
            .map(([label, v]) => ({
                label,
                count: v.count,
                monthlyIncome: Math.round(v.totalAmount * (v.rate / 100)),
                rate: v.rate,
            }))
            .sort((a, b) => a.rate - b.rate)

        const proyeccion = rateGroups.reduce((s, g) => s + g.monthlyIncome, 0)
        const totalCapital = capitalActivo
        const margen = totalCapital > 0 ? ((pagosEsteMes / totalCapital) * 100) : 0

        setStats({
            gananciaTotal, pagosEsteMes, capitalActivo, capitalEnMora,
            capitalRetirado, retirosCount, lastWithdrawal, withdrawals: allWithdrawals,
            activeCount: activeLoans.length,
            overdueCount: overdueLoans.length,
            clientCount: (clients || []).length,
            tasaPromedio, margen, proyeccion, rateGroups,
        })
        setLoading(false)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-sm">Cargando reportes...</p>
        </div>
    )

    const maxIncome = Math.max(...stats.rateGroups.map(g => g.monthlyIncome), 1)

    return (
        <div className="pb-10 min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* Header */}
            <div className="px-4 pt-6 pb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 active:scale-95 transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Análisis</p>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Reportes</h1>
                    </div>
                </div>

                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 active:scale-95 transition shrink-0">
                    <Calendar size={15} className="text-gray-400" />
                    Este mes
                    <ChevronDown size={14} className="text-gray-400" />
                </button>
            </div>

            {/* Hero: Ganancia total */}
            <div className="mx-4 mb-4 rounded-2xl p-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)' }}>

                <div className="absolute inset-0 pointer-events-none opacity-15">
                    <svg className="absolute -bottom-14 -right-10 w-56 h-56 text-white" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M42.8,-54.2C54.5,-45.6,62,-31.4,65.5,-16.2C69,-1,68.5,15.2,61.6,28.5C54.7,41.8,41.4,52.2,26.5,59.1C11.6,66,-4.9,69.4,-20.4,65.8C-35.9,62.2,-50.4,51.6,-59.4,37.6C-68.4,23.6,-71.9,6.2,-69.1,-10.1C-66.3,-26.4,-57.2,-41.6,-44.4,-50.4C-31.6,-59.2,-15.8,-61.6,0.3,-62C16.4,-62.4,31.1,-62.8,42.8,-54.2Z" transform="translate(100 100)" />
                    </svg>
                </div>

                <div className="relative z-10 flex items-start gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={26} color="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 mb-1">Ganancia neta acumulada (intereses)</p>
                        <p className="text-3xl font-black text-white tracking-tight truncate">
                            {formatCOP(stats.gananciaTotal)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 bg-white/15 rounded-full px-2.5 py-1 w-fit">
                            <TrendingUp size={12} className="text-white" />
                            <p className="text-xs text-white">
                                {formatCOP(stats.pagosEsteMes)} en intereses este mes
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Métricas en lista */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <MetricRow
                    label="Capital activo (prestado)"
                    value={formatCOP(stats.capitalActivo)}
                    valueClass="text-gray-900 dark:text-white"
                    Icon={DollarSign}
                    iconBg="bg-green-50 dark:bg-green-900/30"
                    iconColor="text-green-600 dark:text-green-400"
                />
                <MetricRow
                    label="Capital en mora"
                    value={formatCOP(stats.capitalEnMora)}
                    valueClass={stats.capitalEnMora > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}
                    Icon={Clock}
                    iconBg="bg-red-50 dark:bg-red-900/30"
                    iconColor="text-red-500"
                />
                <MetricRow
                    label="Préstamos activos"
                    value={stats.activeCount}
                    valueClass="text-gray-900 dark:text-white"
                    Icon={Users}
                    iconBg="bg-blue-50 dark:bg-blue-900/30"
                    iconColor="text-blue-600 dark:text-blue-400"
                />
                <MetricRow
                    label="Clientes en mora"
                    value={stats.overdueCount}
                    valueClass={stats.overdueCount > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}
                    Icon={AlertTriangle}
                    iconBg="bg-amber-50 dark:bg-amber-900/30"
                    iconColor="text-amber-500"
                />
                <MetricRow
                    label="Total clientes"
                    value={stats.clientCount}
                    valueClass="text-gray-900 dark:text-white"
                    Icon={UserRound}
                    iconBg="bg-purple-50 dark:bg-purple-900/30"
                    iconColor="text-purple-500"
                />
                <MetricRow
                    label="Tasa promedio cobrada"
                    value={`${stats.tasaPromedio.toFixed(1)}%`}
                    valueClass="text-gray-900 dark:text-white"
                    Icon={Percent}
                    iconBg="bg-blue-50 dark:bg-blue-900/30"
                    iconColor="text-blue-500"
                />
                <MetricRow
                    label="Margen mensual estimado"
                    value={`${stats.margen.toFixed(1)}%`}
                    valueClass="text-green-600 dark:text-green-400"
                    Icon={BarChart3}
                    iconBg="bg-green-50 dark:bg-green-900/30"
                    iconColor="text-green-600 dark:text-green-400"
                />
                <MetricRow
                    label="Proyección próximo mes"
                    value={formatCOP(stats.proyeccion)}
                    valueClass="text-green-600 dark:text-green-400"
                    Icon={TrendingUp}
                    iconBg="bg-green-50 dark:bg-green-900/30"
                    iconColor="text-green-600 dark:text-green-400"
                    last
                />
            </div>

            {/* Capital retirado del negocio */}
            {stats.retirosCount > 0 && (
                <div className="mx-4 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowWithdrawHistory(true)}
                        className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40 transition"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <Banknote size={19} className="text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-400">Capital retirado del negocio</p>
                            <p className="text-lg font-bold text-red-500">{formatCOP(stats.capitalRetirado)}</p>
                            <p className="text-[11px] text-gray-400">
                                Último retiro: {formatCOP(stats.lastWithdrawal?.amount)}
                                {stats.lastWithdrawal?.date ? ` · ${new Date(stats.lastWithdrawal.date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ''}
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    </button>
                </div>
            )}

            {showWithdrawHistory && (
                <WithdrawHistoryModal
                    withdrawals={stats.withdrawals}
                    total={stats.capitalRetirado}
                    onClose={() => setShowWithdrawHistory(false)}
                />
            )}

            {/* Rendimiento por tasa */}
            {stats.rateGroups.length > 0 && (
                <div className="mx-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <BarChart2 size={16} className="text-gray-400" />
                        <p className="text-base font-bold text-gray-900 dark:text-white">Rendimiento por tasa</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-4">
                        {stats.rateGroups.map(g => {
                            const pct = Math.round((g.monthlyIncome / maxIncome) * 100)
                            const barColor =
                                g.rate <= 5 ? 'bg-blue-500' :
                                    g.rate <= 8 ? 'bg-green-500' :
                                        g.rate <= 10 ? 'bg-emerald-400' :
                                            'bg-amber-400'
                            return (
                                <div key={g.label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Tasa {g.label} · {g.count} préstamo{g.count !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCOP(g.monthlyIncome)}<span className="text-gray-400 font-normal">/mes</span>
                                        </p>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function MetricRow({ label, value, valueClass, Icon, iconBg, iconColor, last }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon size={16} className={iconColor} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">{label}</p>
            <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
        </div>
    )
}

function WithdrawHistoryModal({ withdrawals, total, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl pt-6 pb-6 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-1 px-6">
                    <div>
                        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Historial de retiros</h2>
                        <p className="text-xs text-gray-400">Total retirado: <span className="font-semibold text-red-500">{formatCOP(total)}</span></p>
                    </div>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="overflow-y-auto mt-3 pb-20">
                    {withdrawals.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin retiros registrados</p>
                    ) : (
                        withdrawals.map((w, i) => (
                            <div key={i} className={`flex items-center gap-3 px-6 py-3 ${i < withdrawals.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                                <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                    <Banknote size={15} className="text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCOP(w.amount)}</p>
                                    {w.notes && <p className="text-xs text-gray-400 truncate">{w.notes}</p>}
                                </div>
                                <p className="text-xs text-gray-400 shrink-0">
                                    {w.date ? new Date(w.date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}