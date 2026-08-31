import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCOP, parseCOP } from '../utils/format'
import { METHODS, getMethodLabel, getMethodIcon } from '../constants/paymentMethods'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { forceTileRepaint } from '../hooks/useForceRepaint'
import PaymentDetailModal from '../components/PaymentDetailModal'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
    Bell, DollarSign, LayoutList, AlertTriangle, Smile, Calendar,
    Wallet, Users, CalendarPlus, Banknote, UserPlus, FileBarChart, ChevronRight, X, ArrowRightLeft
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
        availableCapital: 0,
        capitalByMethod: { efectivo: 0, nequi: 0, breb: 0 },
        collectedThisMonth: 0,
        pendingBalance: 0,
        activeClients: 0,
        activeLoans: 0,
        onTime: 0,
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
    const [showWithdraw, setShowWithdraw] = useState(false)
    const [showBreakdown, setShowBreakdown] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState(null)
    const [showInject, setShowInject] = useState(false)
    const [showTransfer, setShowTransfer] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)

    async function load() {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [{ data: clients }, { data: loans }, { data: payments }, { data: withdrawals }, { data: injections }, { data: disbursements }] = await Promise.all([
            supabase.from('clients').select('*'),
            supabase.from('loans').select('*'),
            supabase.from('payments').select('*').order('date', { ascending: false }),
            supabase.from('capital_withdrawals').select('amount, date, payment_method, is_transfer'),
            supabase.from('capital_injections').select('*').order('date', { ascending: true }),
            supabase.from('loan_disbursements').select('*'),
        ])

        const allDisbursements = disbursements || []

        const allLoans = loans || []
        const allClients = clients || []
        const allPayments = payments || []
        const totalWithdrawn = (withdrawals || [])
            .filter(w => !w.is_transfer)
            .reduce((s, w) => s + (w.amount || 0), 0)

        // ── Disponible para prestar ──
        // Se ancla en la fecha de tu primera inyección (el ajuste inicial).
        // Todo lo anterior a esa fecha no se cuenta, tal como acordamos.
        const allInjections = injections || []
        const totalInjections = allInjections
            .filter(i => !i.exclude_from_total)
            .reduce((s, i) => s + (i.amount || 0), 0)
        const trackingStartDate = allInjections.length > 0 ? allInjections[0].date : null

        let availableCapital = 0
        if (trackingStartDate) {
            const collectedSinceStart = allPayments
                .filter(p => p.date >= trackingStartDate)
                .reduce((s, p) => s + (p.total_paid || 0), 0)
            const lentSinceStart = allLoans
                .filter(l => l.start_date && l.start_date >= trackingStartDate && !l.is_unification)
                .reduce((s, l) => s + (l.amount || 0), 0)
            const withdrawnSinceStart = (withdrawals || [])
                .filter(w => w.date >= trackingStartDate)
                .reduce((s, w) => s + (w.amount || 0), 0)

            availableCapital = totalInjections + collectedSinceStart - lentSinceStart - withdrawnSinceStart
        }

        function capitalByMethod(method) {
            const methodInjections = allInjections.filter(i => i.payment_method === method)
            if (methodInjections.length === 0) return 0
            const start = methodInjections[0].date

            const inj = methodInjections.reduce((s, i) => s + (i.amount || 0), 0)

            const collected = allPayments.reduce((s, p) => {
                if (p.date < start) return s
                if (p.payment_method === method) return s + (p.total_paid || 0)
                if (p.method_breakdown?.[method]) return s + p.method_breakdown[method]
                return s
            }, 0)

            // Préstamos que ya tienen desglose en loan_disbursements (los nuevos)
            const loanIdsWithDisbursements = new Set(allDisbursements.map(d => d.loan_id))
            const lentFromDisbursements = allDisbursements.reduce((s, d) => {
                if (d.payment_method !== method) return s
                const loan = allLoans.find(l => l.id === d.loan_id)
                if (!loan || !loan.start_date || loan.start_date < start || loan.is_unification) return s
                return s + (d.amount || 0)
            }, 0)

            // Préstamos viejos, sin fila en loan_disbursements: caen al modo anterior
            const lentFromLegacyLoans = allLoans
                .filter(l => !loanIdsWithDisbursements.has(l.id) && l.payment_method === method
                    && l.start_date && l.start_date >= start && !l.is_unification)
                .reduce((s, l) => s + (l.amount || 0), 0)

            const lent = lentFromDisbursements + lentFromLegacyLoans

            const withdrawn = (withdrawals || []).filter(w => w.payment_method === method && w.date >= start)
                .reduce((s, w) => s + (w.amount || 0), 0)

            return inj + collected - lent - withdrawn
        }

        const capitalByMethodResult = {
            efectivo: capitalByMethod('efectivo'),
            nequi: capitalByMethod('nequi'),
            breb: capitalByMethod('breb'),
        }

        const activeLoans = allLoans.filter(l => ['active', 'overdue', 'frozen', 'agreement'].includes(l.status))
        const onTimeLoans = allLoans.filter(l => ['active', 'frozen', 'agreement'].includes(l.status))
        const totalLent = activeLoans.reduce((s, l) => s + (l.amount || 0), 0) - totalWithdrawn

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
            // Mismo criterio que en LoanDetail.jsx: los pagos migrados de una
            // unificación no cuentan como cuotas del cronograma nuevo.
            const paymentsMade = loanPayments.filter(p => !p.original_loan_id).length
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
                .filter(p => p.date && p.date >= dStr && p.date < nStr)
                .reduce((s, p) => s + (p.total_paid || 0), 0)

            const prestado = allLoans
                .filter(l => l.start_date && l.start_date >= dStr && l.start_date < nStr && !l.is_unification)
                .reduce((s, l) => s + (l.amount || 0), 0)

            return { month: MONTHS[d.getMonth()], cobrado, prestado }
        })

        const attention = [
            ...overdue.map(l => ({ ...l, tag: 'overdue' })),
            ...dueSoon.map(l => ({ ...l, tag: 'dueSoon' })),
        ].slice(0, 4)

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
        const recentPayments = allPayments.slice(0, 4).map(p => {
            const loan = allLoans.find(l => l.id === p.loan_id)
            const client = loan ? allClients.find(c => c.id === loan.client_id) : null
            return { ...p, client, loan }
        })

        setStats({
            totalLent, collectedThisMonth, pendingBalance, activeClients, availableCapital,
            capitalByMethod: capitalByMethodResult,
            activeLoans: activeLoans.length, onTime: onTimeLoans.length, overdue, dueSoon, monthlyData,
            attention, statusDistribution, recentPayments,
            agreementCount, frozenCount, paidCount,
        })
        forceTileRepaint()
    }

    useEffect(() => { load() }, [])

    const {
        totalLent, collectedThisMonth, pendingBalance, activeClients, availableCapital,
        capitalByMethod,
        activeLoans, onTime, overdue, dueSoon, monthlyData, attention,
        statusDistribution, recentPayments,
        agreementCount, frozenCount, paidCount,
    } = stats

    const totalLoansForDonut = statusDistribution.reduce((s, d) => s + d.count, 0)
    const totalLine = pendingBalance + availableCapital
    const progressPct = totalLine > 0 ? Math.min(100, Math.round((pendingBalance / totalLine) * 100)) : 0

    return (
        <div className="pb-4 bg-[#f3f4f6]">
            {/* Header con fondo de color */}
            <div className="sticky top-0 z-20 overflow-hidden bg-[#83d4d2] dark:bg-[#3f8b89] pb-10">

                <div className="absolute inset-0 pointer-events-none">
                    <svg className="absolute -top-12 -right-20 w-72 h-72 text-white/15" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M45.3,-58.5C59.5,-49.8,72.1,-36.9,76.6,-21.5C81.1,-6.1,77.5,11.8,69.6,26.9C61.7,42,49.5,54.3,35.1,62.6C20.7,70.9,4.1,75.2,-12.7,74.2C-29.5,73.2,-46.5,66.9,-58.4,55.1C-70.3,43.3,-77.1,26,-78.7,8.1C-80.3,-9.8,-76.7,-28.3,-66.6,-42.1C-56.5,-55.9,-39.9,-65,-23.7,-72C-7.5,-79,8.3,-83.9,22.9,-79.9C37.5,-75.9,45.3,-58.5,45.3,-58.5Z" transform="translate(100 100)" />
                    </svg>
                    <svg className="absolute -bottom-24 -left-14 w-80 h-80 text-white/10" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M42.8,-54.2C54.5,-45.6,62,-31.4,65.5,-16.2C69,-1,68.5,15.2,61.6,28.5C54.7,41.8,41.4,52.2,26.5,59.1C11.6,66,-4.9,69.4,-20.4,65.8C-35.9,62.2,-50.4,51.6,-59.4,37.6C-68.4,23.6,-71.9,6.2,-69.1,-10.1C-66.3,-26.4,-57.2,-41.6,-44.4,-50.4C-31.6,-59.2,-15.8,-61.6,0.3,-62C16.4,-62.4,31.1,-62.8,42.8,-54.2Z" transform="translate(100 100)" />
                    </svg>
                </div>

                <div className="relative z-10 px-4 pt-6 space-y-5">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-black text-gray-900 tracking-tight">
                                Loan<span className="text-teal-800">_</span>Ledger
                            </p>
                            <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-black/5 backdrop-blur-sm rounded-full">
                                <Bell size={20} className="text-gray-800" />
                                {(overdue.length + dueSoon.length) > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                        {overdue.length + dueSoon.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        <h1 className="text-sm font-semibold text-gray-800 mt-2">
                            {getGreeting()}, {userName}!
                        </h1>
                        <p className="text-xs text-gray-700">{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>

                    {/* Línea de préstamo: dinero en la calle vs disponible */}
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-xs text-gray-700">En la calle</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCOP(pendingBalance)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-700">Disponible</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCOP(availableCapital)}</p>
                            </div>
                        </div>
                        <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                        {totalLine > 0 && (
                            <p className="text-[12px] text-gray-700 mt-1.5 text-center">
                                Línea total: {formatCOP(totalLine)}
                            </p>
                        )}
                    </div>

                    {/* Carrusel de métricas: 2 tarjetas por slide */}
                    <div className="relative z-10">
                        <Carousel>
                            <div className="grid grid-cols-2 gap-3">
                                <div onClick={() => setShowBreakdown(true)} className="cursor-pointer active:scale-95 transition">
                                    <MetricCard
                                        label="Disponible para prestar"
                                        sub="capital libre"
                                        value={formatCOP(availableCapital)}
                                        color="green"
                                        Icon={Banknote}
                                    />
                                </div>
                                <MetricCard
                                    label="Total prestado"
                                    sub="vs. mes anterior"
                                    value={formatCOP(totalLent)}
                                    color="blue"
                                    Icon={Wallet}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard
                                    label="Total cobrado"
                                    sub="este mes"
                                    value={formatCOP(collectedThisMonth)}
                                    color="green"
                                    Icon={DollarSign}
                                />
                                <MetricCard
                                    label="Saldo pendiente"
                                    sub="por cobrar"
                                    value={formatCOP(pendingBalance)}
                                    color="amber"
                                    Icon={LayoutList}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard
                                    label="Clientes activos"
                                    sub="vs. mes anterior"
                                    value={activeClients}
                                    color="purple"
                                    Icon={Users}
                                />
                            </div>
                        </Carousel>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#f3f4f6] dark:bg-gray-900 rounded-t-[2rem] shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.25)] dark:shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.6)]" />
            </div>

            <div className="px-4 pt-3 space-y-5">

                {/* Resumen rápido: préstamos activos, en mora, próximos a vencer */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-4 pt-3 pb-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Resumen rápido</p>
                    <Carousel>
                        <div className="grid grid-cols-3 gap-2">
                            <QuickStat label="Al día" value={onTime} />
                            <QuickStat label="En mora" value={overdue.length} />
                            <QuickStat label="Por vencer" value={dueSoon.length} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <QuickStat label="Acuerdo" value={agreementCount} />
                            <QuickStat label="Congelados" value={frozenCount} />
                            <QuickStat label="Liquidados" value={paidCount} />
                        </div>
                    </Carousel>
                    <p className="text-[11px] text-gray-400 text-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        Total de préstamos activos: <span className="font-semibold text-gray-500 dark:text-gray-300">{activeLoans}</span>
                    </p>
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
                            <PaymentRow key={p.id} payment={p} last={i === recentPayments.length - 1} onClick={() => setSelectedPayment(p)} />
                        ))}
                    </div>
                )}

                {/* Acciones rápidas */}
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2 px-1">Acciones rápidas</p>
                    <div className="grid grid-cols-5 gap-2">
                        <QuickAction label="Nuevo préstamo" Icon={CalendarPlus} color="blue" onClick={() => navigate('/new-loan')} />
                        <QuickAction label="Retirar capital" Icon={Banknote} color="red" onClick={() => setShowWithdraw(true)} />
                        <QuickAction label="Inyectar capital" Icon={Banknote} color="green" onClick={() => setShowInject(true)} />
                        <QuickAction label="Nuevo cliente" Icon={UserPlus} color="purple" onClick={() => navigate('/clients/new')} />
                        <QuickAction label="Ver reportes" Icon={FileBarChart} color="amber" onClick={() => navigate('/reports')} />
                    </div>
                </div>
            </div>

            {showWithdraw && (
                <WithdrawCapitalModal
                    onClose={() => setShowWithdraw(false)}
                    onDone={() => {
                        setShowWithdraw(false)
                        load()
                    }}
                />
            )}
            {showBreakdown && (
                <CapitalBreakdownModal
                    breakdown={capitalByMethod}
                    total={availableCapital}
                    onClose={() => setShowBreakdown(false)}
                    onTransfer={() => setShowTransfer(true)}
                />
            )}
            {showTransfer && (
                <TransferCapitalModal
                    breakdown={capitalByMethod}
                    onClose={() => setShowTransfer(false)}
                    onDone={() => {
                        setShowTransfer(false)
                        load()
                    }}
                />
            )}
            {showInject && (
                <InjectCapitalModal
                    onClose={() => setShowInject(false)}
                    onDone={() => {
                        setShowInject(false)
                        load()
                    }}
                />
            )}
            {selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
            {showNotifications && (
                <NotificationsModal
                    overdue={overdue}
                    dueSoon={dueSoon}
                    onClose={() => setShowNotifications(false)}
                    onSelectLoan={(id) => {
                        setShowNotifications(false)
                        navigate(`/loans/${id}`)
                    }}
                />
            )}
        </div>
    )
}

function MetricCard({ label, sub, value, color, Icon }) {
    const iconColors = {
        blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50',
        amber: 'text-amber-600 bg-amber-50', purple: 'text-purple-600 bg-purple-50',
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 relative overflow-hidden min-w-0 shadow-sm flex items-center gap-3">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl shrink-0 ${iconColors[color] || 'bg-gray-50 text-gray-600'}`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{sub}</p>
            </div>
        </div>
    )
}

function QuickStat({ label, value }) {
    return (
        <div className="text-center">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{label}</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">{value}</p>
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

function PaymentRow({ payment, last, onClick }) {
    const name = payment.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const methodLabel = payment.payment_method ? getMethodLabel(payment.payment_method) : ''

    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40 transition ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
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
        </button>
    )
}

function QuickAction({ label, Icon, color, onClick }) {
    const iconColors = {
        blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50',
        amber: 'text-amber-600 bg-amber-50', purple: 'text-purple-600 bg-purple-50',
    }
    return (
        <button
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 active:scale-95 transition text-center"
        >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${iconColors[color]}`}>
                <Icon size={16} />
            </div>
            <span className="text-[10px] font-medium leading-tight text-gray-700 dark:text-gray-200">{label}</span>
        </button>
    )
}

function WithdrawCapitalModal({ onClose, onDone }) {
    const [methodAmounts, setMethodAmounts] = useState({ efectivo: '', nequi: '', breb: '' })
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const total = Object.values(methodAmounts).reduce((s, v) => s + (parseCOP(v) || 0), 0)

    async function handleSave() {
        const activeMethods = Object.entries(methodAmounts)
            .map(([m, v]) => [m, parseCOP(v) || 0])
            .filter(([, v]) => v > 0)

        if (activeMethods.length === 0) return

        setSaving(true)
        const rows = activeMethods.map(([m, amt]) => ({
            amount: amt,
            notes: notes.trim() || null,
            payment_method: m,
        }))
        const { error } = await supabase.from('capital_withdrawals').insert(rows)
        if (error) {
            console.error('Error al registrar retiro de capital:', error)
            alert('No se pudo registrar el retiro: ' + error.message)
            setSaving(false)
            return
        }
        onDone()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Retirar capital</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-xs text-red-500 dark:text-red-300">
                        Este dinero se resta del capital prestable del negocio. No es un préstamo ni una ganancia.
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">¿De dónde sale el dinero?</label>
                        <div className="space-y-2">
                            {METHODS.map(m => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 shrink-0">
                                        {m.icon}
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 w-16 shrink-0">{m.label}</span>
                                    <input
                                        className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="$ 0"
                                        inputMode="numeric"
                                        value={methodAmounts[m.id]}
                                        onChange={(e) => {
                                            const raw = parseCOP(e.target.value)
                                            setMethodAmounts({ ...methodAmounts, [m.id]: raw ? formatCOP(raw) : '' })
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        {total > 0 && (
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                Total a retirar: <span className="font-semibold text-red-500">{formatCOP(total)}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Nota (opcional)</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Retiro personal, gasto del negocio..."
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || total === 0}
                        className="w-full bg-red-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Confirmar retiro'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function InjectCapitalModal({ onClose, onDone }) {
    const [methodAmounts, setMethodAmounts] = useState({ efectivo: '', nequi: '', breb: '' })
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const total = Object.values(methodAmounts).reduce((s, v) => s + (parseCOP(v) || 0), 0)

    async function handleSave() {
        const activeMethods = Object.entries(methodAmounts)
            .map(([m, v]) => [m, parseCOP(v) || 0])
            .filter(([, v]) => v > 0)

        if (activeMethods.length === 0) return

        setSaving(true)
        const rows = activeMethods.map(([m, amt]) => ({
            amount: amt,
            notes: notes.trim() || null,
            payment_method: m,
        }))
        const { error } = await supabase.from('capital_injections').insert(rows)
        if (error) {
            console.error('Error al registrar inyección de capital:', error)
            alert('No se pudo registrar la inyección: ' + error.message)
            setSaving(false)
            return
        }
        onDone()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Inyectar capital</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-3 py-2 text-xs text-green-600 dark:text-green-300">
                        Este dinero aumenta el capital disponible para prestar.
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">¿A dónde entra el dinero?</label>
                        <div className="space-y-2">
                            {METHODS.map(m => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 shrink-0">
                                        {m.icon}
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 w-16 shrink-0">{m.label}</span>
                                    <input
                                        className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="$ 0"
                                        inputMode="numeric"
                                        value={methodAmounts[m.id]}
                                        onChange={(e) => {
                                            const raw = parseCOP(e.target.value)
                                            setMethodAmounts({ ...methodAmounts, [m.id]: raw ? formatCOP(raw) : '' })
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        {total > 0 && (
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                Total a inyectar: <span className="font-semibold text-green-600">{formatCOP(total)}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Nota (opcional)</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Ahorro personal, préstamo de un tercero..."
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || total === 0}
                        className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Confirmar inyección'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CapitalBreakdownModal({ breakdown, total, onClose, onTransfer }) {
    const METHOD_INFO = {
        efectivo: { label: 'Efectivo', color: 'bg-green-50 dark:bg-green-950/40 text-green-600' },
        nequi: { label: 'Nequi', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600' },
        breb: { label: 'Bre-B', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' },
    }

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-28 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Disponible por método</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="space-y-3">
                    {Object.entries(METHOD_INFO).map(([key, info]) => (
                        <div key={key} className={`${info.color} rounded-2xl p-4 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                {getMethodIcon(key)}
                                <span className="font-medium">{info.label}</span>
                            </div>
                            <span className="font-bold text-lg">{formatCOP(breakdown[key] || 0)}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 mt-4 pt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total disponible</span>
                    <span className="font-bold text-xl text-gray-800 dark:text-white">{formatCOP(total)}</span>
                </div>

                <button
                    onClick={onTransfer}
                    className="w-full mt-5 bg-blue-600 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition"
                >
                    <ArrowRightLeft size={18} />
                    Trasladar saldo entre métodos
                </button>
            </div>
        </div>
    )
}

function NotificationsModal({ overdue, dueSoon, onClose, onSelectLoan }) {
    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Notificaciones</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {overdue.length === 0 && dueSoon.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No tienes préstamos en mora ni por vencer 🎉</p>
                ) : (
                    <div className="space-y-5">
                        {overdue.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-red-500 mb-2">EN MORA ({overdue.length})</p>
                                <div className="space-y-2">
                                    {overdue.map(loan => (
                                        <NotificationRow key={loan.id} loan={loan} tone="red" onClick={() => onSelectLoan(loan.id)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {dueSoon.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-amber-500 mb-2">POR VENCER ({dueSoon.length})</p>
                                <div className="space-y-2">
                                    {dueSoon.map(loan => (
                                        <NotificationRow key={loan.id} loan={loan} tone="amber" onClick={() => onSelectLoan(loan.id)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function NotificationRow({ loan, tone, onClick }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const styles = {
        red: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600', label: 'text-red-500' },
        amber: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-500', label: 'text-amber-500' },
    }[tone]

    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition text-left">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${styles.bg} ${styles.text}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{name}</p>
                <p className={`text-xs ${styles.label}`}>{tone === 'red' ? 'En mora' : 'Vence pronto'}</p>
            </div>
            <p className={`font-semibold text-sm shrink-0 ${styles.text}`}>{formatCOP(loan.amount)}</p>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
    )
}

function TransferCapitalModal({ breakdown, onClose, onDone }) {
    const METHOD_INFO = {
        efectivo: { label: 'Efectivo' },
        nequi: { label: 'Nequi' },
        breb: { label: 'Bre-B' },
    }
    const [from, setFrom] = useState('nequi')
    const [to, setTo] = useState('efectivo')
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const amountValue = parseCOP(amount) || 0
    const availableInFrom = breakdown[from] || 0
    const exceedsBalance = amountValue > availableInFrom
    const sameMethod = from === to

    async function handleSave() {
        if (amountValue <= 0 || sameMethod || exceedsBalance) return
        setSaving(true)

        const fromLabel = METHOD_INFO[from].label
        const toLabel = METHOD_INFO[to].label
        const noteSuffix = notes.trim() ? ` — ${notes.trim()}` : ''

        const { error: err1 } = await supabase.from('capital_withdrawals').insert([{
            amount: amountValue,
            payment_method: from,
            notes: `Traslado a ${toLabel}${noteSuffix}`,
            is_transfer: true,
        }])
        if (err1) {
            console.error('Error al trasladar (retiro):', err1)
            alert('No se pudo registrar el traslado: ' + err1.message)
            setSaving(false)
            return
        }

        const { error: err2 } = await supabase.from('capital_injections').insert([{
            amount: amountValue,
            payment_method: to,
            notes: `Traslado desde ${fromLabel}${noteSuffix}`,
            is_transfer: true,
        }])
        if (err2) {
            console.error('Error al trasladar (inyección):', err2)
            alert('¡Atención! El retiro de ' + fromLabel + ' se registró pero falló la entrada en ' + toLabel + '. Revisa manualmente: ' + err2.message)
            setSaving(false)
            return
        }

        onDone()
    }

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Trasladar saldo</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-3 py-2 text-xs text-blue-600 dark:text-blue-300">
                        Mueve saldo disponible de un método a otro. El total disponible no cambia.
                    </div>

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Desde</label>
                        <select
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                        >
                            {Object.entries(METHOD_INFO).map(([key, info]) => (
                                <option key={key} value={key}>{info.label} — {formatCOP(breakdown[key] || 0)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-center">
                        <ArrowRightLeft size={18} className="text-gray-400 rotate-90" />
                    </div>

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Hacia</label>
                        <select
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                        >
                            {Object.entries(METHOD_INFO).map(([key, info]) => (
                                <option key={key} value={key}>{info.label}</option>
                            ))}
                        </select>
                        {sameMethod && (
                            <p className="text-xs text-red-500 mt-1">El origen y el destino no pueden ser el mismo</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm text-gray-500 dark:text-gray-400 block">Monto a trasladar</label>
                            <button
                                type="button"
                                onClick={() => setAmount(availableInFrom > 0 ? formatCOP(availableInFrom) : '')}
                                disabled={availableInFrom <= 0}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Trasladar todo
                            </button>
                        </div>
                        <input
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="$ 0"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => {
                                const raw = parseCOP(e.target.value)
                                setAmount(raw ? formatCOP(raw) : '')
                            }}
                        />
                        {exceedsBalance && (
                            <p className="text-xs text-red-500 mt-1">
                                No hay suficiente saldo en {METHOD_INFO[from].label} (disponible: {formatCOP(availableInFrom)})
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Nota (opcional)</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Me pagaron en efectivo y transferí por Nequi"
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || amountValue === 0 || sameMethod || exceedsBalance}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Trasladando...' : 'Confirmar traslado'}
                    </button>
                </div>
            </div>
        </div>
    )
}