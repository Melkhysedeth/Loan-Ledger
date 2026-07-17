import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { ChevronLeft, TrendingUp, AlertCircle, Percent, BarChart2, Banknote, ChevronRight, X } from 'lucide-react'

export default function Reports() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [showWithdrawHistory, setShowWithdrawHistory] = useState(false)

    useEffect(() => { load() }, [])

    async function load() {
        const [{ data: loans }, { data: payments }, { data: clients }, { data: withdrawals }] = await Promise.all([
            supabase.from('loans').select('id, amount, interest_rate, status, created_at'),
            supabase.from('payments').select('total_paid, interest_paid, created_at'),
            supabase.from('clients').select('id'),
            supabase.from('capital_withdrawals').select('amount, date, notes').order('date', { ascending: false }),
        ])

        const activeLoans = (loans || []).filter(l => ['active', 'frozen', 'agreement'].includes(l.status))
        const overdueLoans = (loans || []).filter(l => l.status === 'overdue')
        const allPayments = payments || []
        const allWithdrawals = withdrawals || []

        const capitalRetirado = allWithdrawals.reduce((s, w) => s + (w.amount || 0), 0)
        const retirosCount = allWithdrawals.length
        const lastWithdrawal = allWithdrawals[0] || null

        // FIX: el capital en mora sigue siendo capital activo (es deuda viva que debe recuperarse),
        // así que se suma al capital activo en vez de mostrarse como una categoría aparte y excluida.
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
        const totalCapital = capitalActivo // ya incluye capitalEnMora, no se debe sumar de nuevo
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
            <div className="px-4 pt-6 pb-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 active:scale-95 transition"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <p className="text-xs text-gray-400 font-medium">Análisis</p>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Reportes</h1>
                </div>
            </div>

            {/* Hero: Ganancia total */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <p className="text-sm text-gray-400 mb-1">Ganancia neta acumulada (intereses)</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400 tracking-tight">
                    {formatCOP(stats.gananciaTotal)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp size={14} className="text-green-500" />
                    <p className="text-sm text-gray-400">
                        <span className="text-green-600 dark:text-green-400 font-medium">{formatCOP(stats.pagosEsteMes)}</span>
                        {' '}en intereses este mes
                    </p>
                </div>
            </div>

            {/* Métricas en lista */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <MetricRow label="Capital activo (prestado)" value={formatCOP(stats.capitalActivo)} valueClass="text-gray-900 dark:text-white" />
                <MetricRow
                    label="Capital en mora"
                    value={formatCOP(stats.capitalEnMora)}
                    valueClass={stats.capitalEnMora > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}
                    Icon={stats.capitalEnMora > 0 ? AlertCircle : null}
                />
                <MetricRow label="Préstamos activos" value={stats.activeCount} valueClass="text-gray-900 dark:text-white" />
                <MetricRow
                    label="Clientes en mora"
                    value={stats.overdueCount}
                    valueClass={stats.overdueCount > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}
                    Icon={stats.overdueCount > 0 ? AlertCircle : null}
                />
                <MetricRow label="Total clientes" value={stats.clientCount} valueClass="text-gray-900 dark:text-white" />
                <MetricRow label="Tasa promedio cobrada" value={`${stats.tasaPromedio.toFixed(1)}%`} valueClass="text-gray-900 dark:text-white" Icon={Percent} />
                <MetricRow label="Margen mensual estimado" value={`${stats.margen.toFixed(1)}%`} valueClass="text-green-600 dark:text-green-400" />
                <MetricRow label="Proyección próximo mes" value={formatCOP(stats.proyeccion)} valueClass="text-green-600 dark:text-green-400" last />
            </div>

            {/* Capital retirado del negocio */}
            {stats.retirosCount > 0 && (
                <div className="mx-4 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowWithdrawHistory(true)}
                        className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40 transition"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <Banknote size={18} className="text-red-500" />
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

function MetricRow({ label, value, valueClass, Icon, last }) {
    return (
        <div className={`flex items-center justify-between px-4 py-3.5 ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <p className="text-sm text-gray-400">{label}</p>
            <div className="flex items-center gap-1.5">
                {Icon && <Icon size={13} className={valueClass} />}
                <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
            </div>
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