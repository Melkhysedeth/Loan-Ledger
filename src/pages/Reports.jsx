import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { ChevronLeft, TrendingUp, AlertCircle, Percent, BarChart2 } from 'lucide-react'

export default function Reports() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)

    useEffect(() => { load() }, [])

    async function load() {
        const [{ data: loans }, { data: payments }, { data: clients }] = await Promise.all([
            supabase.from('loans').select('id, amount, interest_rate, status, created_at'),
            supabase.from('payments').select('total_paid, created_at'),
            supabase.from('clients').select('id'),
        ])

        const activeLoans = (loans || []).filter(l => l.status === 'active' || l.status === 'frozen')
        const overdueLoans = (loans || []).filter(l => l.status === 'overdue')
        const allLoans = loans || []
        const allPayments = payments || []

        const capitalActivo = activeLoans.reduce((s, l) => s + (l.amount || 0), 0)
        const gananciaTotal = allPayments.reduce((s, p) => s + (p.total_paid || 0), 0)

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const pagosEsteMes = allPayments
            .filter(p => new Date(p.created_at) >= startOfMonth)
            .reduce((s, p) => s + (p.total_paid || 0), 0)

        const tasaPromedio = activeLoans.length > 0
            ? activeLoans.reduce((s, l) => s + (l.interest_rate || 0), 0) / activeLoans.length
            : 0

        const byRate = {}
        activeLoans.forEach(l => {
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
        const margen = capitalActivo > 0 ? ((pagosEsteMes / capitalActivo) * 100) : 0

        setStats({
            gananciaTotal, pagosEsteMes, capitalActivo,
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
        <div className="pb-10 min-h-screen bg-gray-50">

            {/* ── Header ── */}
            <div className="px-4 pt-6 pb-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 active:scale-95 transition"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <p className="text-xs text-gray-400 font-medium">Análisis</p>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Reportes</h1>
                </div>
            </div>

            {/* ── Hero: Ganancia total ── */}
            <div className="mx-4 mb-4 bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-sm text-gray-400 mb-1">Ganancia neta acumulada</p>
                <p className="text-4xl font-bold text-green-600 tracking-tight">
                    {formatCOP(stats.gananciaTotal)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp size={14} className="text-green-500" />
                    <p className="text-sm text-gray-400">
                        <span className="text-green-600 font-medium">{formatCOP(stats.pagosEsteMes)}</span>
                        {' '}cobrados este mes
                    </p>
                </div>
            </div>

            {/* ── Métricas en lista ── */}
            <div className="mx-4 mb-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <MetricRow label="Capital activo (prestado)" value={formatCOP(stats.capitalActivo)} valueClass="text-gray-900" />
                <MetricRow label="Préstamos activos" value={stats.activeCount} valueClass="text-gray-900" />
                <MetricRow
                    label="Clientes en mora"
                    value={stats.overdueCount}
                    valueClass={stats.overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}
                    Icon={stats.overdueCount > 0 ? AlertCircle : null}
                />
                <MetricRow label="Total clientes" value={stats.clientCount} valueClass="text-gray-900" />
                <MetricRow label="Tasa promedio cobrada" value={`${stats.tasaPromedio.toFixed(1)}%`} valueClass="text-gray-900" Icon={Percent} />
                <MetricRow label="Margen mensual estimado" value={`${stats.margen.toFixed(1)}%`} valueClass="text-green-600" />
                <MetricRow label="Proyección próximo mes" value={formatCOP(stats.proyeccion)} valueClass="text-green-600" last />
            </div>

            {/* ── Rendimiento por tasa ── */}
            {stats.rateGroups.length > 0 && (
                <div className="mx-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <BarChart2 size={16} className="text-gray-400" />
                        <p className="text-base font-bold text-gray-900">Rendimiento por tasa</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
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
                                        <p className="text-sm text-gray-500">
                                            Tasa {g.label} · {g.count} préstamo{g.count !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {formatCOP(g.monthlyIncome)}<span className="text-gray-400 font-normal">/mes</span>
                                        </p>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
        <div className={`flex items-center justify-between px-4 py-3.5 ${!last ? 'border-b border-gray-100' : ''}`}>
            <p className="text-sm text-gray-400">{label}</p>
            <div className="flex items-center gap-1.5">
                {Icon && <Icon size={13} className={valueClass} />}
                <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
            </div>
        </div>
    )
}