import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCOP } from '../utils/format'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
    Bell, DollarSign, LayoutList, AlertTriangle, Smile, Calendar,
    Wallet, Users, CalendarPlus, HandCoins, UserPlus, FileBarChart, ChevronRight
} from 'lucide-react'
import Carousel from '../components/Carousel'

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return '¡Buenos días'
    if (h < 18) return '¡Buenas tardes'
    return '¡Buenas noches'
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const STATUS_LABELS = {
    active: { label: 'Activos', color: '#3b5bdb' },
    overdue: { label: 'En mora', color: '#ef4444' },
    agreement: { label: 'Acuerdo especial', color: '#f59e0b' },
    frozen: { label: 'Congelados', color: '#a855f7' },
    paid: { label: 'Liquidados', color: '#22c55e' },
}

export default function Dashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        totalLent: 0,
        collectedThisMonth: 0,
        pendingBalance: 0,
        activeClients: 0,
        activeLoans: 0,
        overdue: [],
        dueSoon: [],
        monthlyData: [],
        attention: [],
        statusDistribution: [],
        recentPayments: [],
        agreementCount: 0,
        frozenCount: 0,
        paidCount: 0,
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
                supabase.from('payments').select('*').order('date', { ascending: false }),
            ])

            const allLoans = loans || []
            const allClients = clients || []
            const allPayments = payments || []

            const activeLoans = allLoans.filter(l => ['active', 'overdue', 'frozen', 'agreement'].includes(l.status))
            const totalLent = activeLoans.reduce((s, l) => s + (l.amount || 0), 0)

            const collectedThisMonth = allPayments
                .filter(p => p.date >= startOfMonth.split('T')[0])
                .reduce((s, p) => s + (p.total_paid || 0), 0)

            // Saldo pendiente: capital de préstamos activos menos lo ya pagado
            const pendingBalance = activeLoans.reduce((s, l) => {
                const paid = allPayments.filter(p => p.loan_id === l.id).reduce((a, p) => a + (p.capital_paid || 0), 0)
                return s + (l.amount - paid)
            }, 0)

            const activeClients = allClients.filter(c => c.status === 'active').length

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

            // Distribución de estado para la dona
            const statusCounts = allLoans.reduce((acc, l) => {
                acc[l.status] = (acc[l.status] || 0) + 1
                return acc
            }, {})
            const agreementCount = statusCounts['agreement'] || 0
            const frozenCount = statusCounts['frozen'] || 0
            const paidCount = statusCounts['paid'] || 0
            const totalLoansCount = allLoans.length
            const statusDistribution = Object.entries(statusCounts)
                .filter(([status]) => STATUS_LABELS[status])
                .map(([status, count]) => ({
                    status,
                    label: STATUS_LABELS[status].label,
                    color: STATUS_LABELS[status].color,
                    count,
                    pct: totalLoansCount ? Math.round((count / totalLoansCount) * 100) : 0,
                }))
                .sort((a, b) => b.count - a.count)

            // Pagos recientes (últimos 5) enriquecidos con nombre de cliente
            const recentPayments = allPayments.slice(0, 5).map(p => {
                const loan = allLoans.find(l => l.id === p.loan_id)
                const client = loan ? allClients.find(c => c.id === loan.client_id) : null
                return { ...p, client, loan }
            })

            setStats({
                totalLent, collectedThisMonth, pendingBalance, activeClients,
                activeLoans: activeLoans.length, overdue, dueSoon, monthlyData,
                attention, statusDistribution, recentPayments,
                agreementCount, frozenCount, paidCount,
            })
        }
        load()
    }, [])

    const {
        totalLent, collectedThisMonth, pendingBalance, activeClients,
        activeLoans, overdue, dueSoon, monthlyData, attention,
        statusDistribution, recentPayments,
        agreementCount, frozenCount, paidCount,
    } = stats

    const totalLoansForDonut = statusDistribution.reduce((s, d) => s + d.count, 0)

    return (
        <div className="px-4 pt-6 pb-4 space-y-5">
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

            {/* Carrusel de métricas: 2 tarjetas por slide */}
            <Carousel>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                        label="Total prestado"
                        sub="vs. mes anterior"
                        value={formatCOP(totalLent)}
                        color="blue"
                        Icon={Wallet}
                    />
                    <MetricCard
                        label="Total cobrado"
                        sub="este mes"
                        value={formatCOP(collectedThisMonth)}
                        color="green"
                        Icon={DollarSign}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                        label="Saldo pendiente"
                        sub="por cobrar"
                        value={formatCOP(pendingBalance)}
                        color="amber"
                        Icon={LayoutList}
                    />
                    <MetricCard
                        label="Clientes activos"
                        sub="vs. mes anterior"
                        value={activeClients}
                        color="purple"
                        Icon={Users}
                    />
                </div>
            </Carousel>

            {/* Resumen rápido: préstamos activos, en mora, próximos a vencer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-4 py-3 flex gap-4 overflow-x-auto no-scrollbar">
                <QuickStat label="Activos" value={activeLoans} color="text-blue-500" />
                <QuickStat label="En mora" value={overdue.length} color="text-red-500" />
                <QuickStat label="Por vencer" value={dueSoon.length} color="text-amber-500" />
                <QuickStat label="Acuerdo" value={agreementCount} color="text-orange-500" />
                <QuickStat label="Congelados" value={frozenCount} color="text-purple-500" />
                <QuickStat label="Liquidados" value={paidCount} color="text-green-500" />
            </div>

            {/* Carrusel: gráfica mensual + dona de distribución */}
            <Carousel>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Resumen mensual</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cobradoFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b5bdb" stopOpacity={0.28} />
                                    <stop offset="100%" stopColor="#3b5bdb" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="prestadoFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
                            <Tooltip
                                formatter={(v, name) => [formatCOP(v), name === 'cobrado' ? 'Cobrado' : 'Prestado']}
                                contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', backgroundColor: '#1f2937', color: '#f9fafb', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
                                cursor={{ stroke: '#3b5bdb', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="cobrado"
                                stroke="#3b5bdb"
                                strokeWidth={2.5}
                                fill="url(#cobradoFill)"
                                dot={{ r: 3, fill: '#3b5bdb', strokeWidth: 0 }}
                                activeDot={{ r: 5, fill: '#3b5bdb', stroke: '#fff', strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="prestado"
                                stroke="#f59e0b"
                                strokeWidth={2.5}
                                fill="url(#prestadoFill)"
                                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center">
                        <div className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />Cobrado</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Prestado</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Distribución de estado</p>
                    {totalLoansForDonut === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-12">Sin préstamos registrados aún</p>
                    ) : (
                        <>
                            <div className="relative flex items-center justify-center" style={{ height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            dataKey="count"
                                            nameKey="label"
                                            innerRadius={62}
                                            outerRadius={88}
                                            paddingAngle={2}
                                            stroke="none"
                                        >
                                            {statusDistribution.map((d, i) => (
                                                <Cell key={i} fill={d.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-xs text-gray-400">Total</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalLoansForDonut}</p>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1.5">
                                {statusDistribution.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                            <span className="text-gray-600 dark:text-gray-300">{d.label}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs">{d.count} ({d.pct}%)</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </Carousel>

            {/* Clientes que requieren atención */}
            {attention?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-200">Requieren atención</p>
                        <button onClick={() => navigate('/clients')} className="text-sm text-blue-500">Ver todos</button>
                    </div>
                    {attention.map((loan, i) => (
                        <AttentionRow key={loan.id} loan={loan} last={i === attention.length - 1} onPress={() => navigate(`/loans/${loan.id}`)} />
                    ))}
                </div>
            )}

            {/* Pagos recientes */}
            {recentPayments?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-200">Pagos recientes</p>
                        <button onClick={() => navigate('/collections')} className="text-sm text-blue-500">Ver todos</button>
                    </div>
                    {recentPayments.map((p, i) => (
                        <PaymentRow key={p.id} payment={p} last={i === recentPayments.length - 1} />
                    ))}
                </div>
            )}

            {/* Acciones rápidas */}
            <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2 px-1">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-3">
                    <QuickAction label="Nuevo préstamo" Icon={CalendarPlus} color="blue" onClick={() => navigate('/new-loan')} />
                    <QuickAction label="Registrar pago" Icon={HandCoins} color="green" onClick={() => navigate('/loans')} />
                    <QuickAction label="Nuevo cliente" Icon={UserPlus} color="purple" onClick={() => navigate('/clients/new')} />
                    <QuickAction label="Ver reportes" Icon={FileBarChart} color="amber" onClick={() => navigate('/reports')} />
                </div>
            </div>
        </div>
    )
}

function MetricCard({ label, sub, value, color, Icon }) {
    const themes = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500', wave: '#3b5bdb' },
        green: { bg: 'bg-green-50 dark:bg-green-950/40', icon: 'bg-green-100 dark:bg-green-900/50 text-green-500', wave: '#22c55e' },
        red: { bg: 'bg-red-50 dark:bg-red-950/40', icon: 'bg-red-100 dark:bg-red-900/50 text-red-500', wave: '#ef4444' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-500', wave: '#f59e0b' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500', wave: '#a855f7' },
    }
    const t = themes[color]

    return (
        <div className={`${t.bg} rounded-2xl p-4 shadow-sm relative overflow-hidden min-w-0`}>
            <div className={`w-9 h-9 flex items-center justify-center rounded-full ${t.icon} mb-2.5`}>
                <Icon size={18} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 truncate">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            <svg className="absolute bottom-0 right-0 opacity-20" width="90" height="45" viewBox="0 0 80 40" fill="none">
                <path d="M0 30 Q10 10 20 25 Q30 40 40 20 Q50 0 60 18 Q70 35 80 15" stroke={t.wave} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
        </div>
    )
}

function QuickStat({ label, value, color }) {
    return (
        <div className="text-center shrink-0 min-w-[64px]">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">{label}</p>
        </div>
    )
}

function AttentionRow({ loan, last, onPress }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const isOverdue = loan.tag === 'overdue'
    const avatarColor = isOverdue
        ? 'bg-red-100 dark:bg-red-900/40 text-red-600'
        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-500'

    return (
        <button onClick={onPress} className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40 transition ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarColor}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                    {isOverdue ? 'En mora' : 'Vence pronto'}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className={`font-semibold text-sm ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                    {formatCOP(loan.amount)}
                </p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
    )
}

const METHOD_LABELS = { breb: 'Bre-B', efectivo: 'Efectivo', nequi: 'Nequi' }

function PaymentRow({ payment, last }) {
    const name = payment.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const methodLabel = METHOD_LABELS[payment.payment_method] || payment.payment_method || ''

    return (
        <div className={`flex items-center gap-3 px-4 py-3 ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold text-sm flex items-center justify-center shrink-0">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className="text-xs text-gray-400">
                    {new Date(payment.date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    {methodLabel ? ` · ${methodLabel}` : ''}
                </p>
            </div>
            <p className="font-semibold text-sm text-green-500 shrink-0">{formatCOP(payment.total_paid)}</p>
        </div>
    )
}

function QuickAction({ label, Icon, color, onClick }) {
    const themes = {
        blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
        purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
        amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    }
    return (
        <button
            onClick={onClick}
            className={`${themes[color]} rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm active:scale-95 transition text-left`}
        >
            <Icon size={20} />
            <span className="text-sm font-semibold leading-tight">{label}</span>
        </button>
    )
}