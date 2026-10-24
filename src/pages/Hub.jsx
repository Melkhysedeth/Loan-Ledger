import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { useAuth } from '../context/useAuth'
import { formatCOP } from '../utils/format'
import { classifyLoan } from '../utils/loanCalc'
import { activePayments, groupBy, installmentsMade } from '../utils/loanMetrics'
import { isActiveLoan, totalLentOf, pendingBalanceOf, collectedSince, monthStart } from '../utils/accounting'
import { forceTileRepaint } from '../hooks/useForceRepaint'
import { Users, Wallet, ChevronRight, Bell } from 'lucide-react'

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
}

export default function Hub() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Admin'

    const [metrics, setMetrics] = useState({
        totalClients: 0,
        activeLoans: 0,
        collectedThisMonth: 0,
        pendingBalance: 0,
        totalLent: 0,
        overdueCount: 0,
        dueSoonCount: 0,
        clientsWithLoan: 0,
    })

    useEffect(() => {
        async function load() {
            const [{ count: totalClients }, { data: loans }, { data: payments }, { data: withdrawals }] = await Promise.all([
                supabase.from('clients').select('id', { count: 'exact', head: true }),
                supabase.from('loans').select('*'),
                supabase.from('payments').select('*'),
                supabase.from('capital_withdrawals').select('amount, is_transfer'),
            ])

            const allLoans = loans || []
            const allPayments = activePayments(payments || [])
            const paymentsByLoan = groupBy(allPayments, 'loan_id')
            const activeLoans = allLoans.filter(isActiveLoan)

            const totalLent = totalLentOf(activeLoans, withdrawals || [])
            const collectedThisMonth = collectedSince(allPayments, monthStart())
            const pendingBalance = pendingBalanceOf(activeLoans, paymentsByLoan)

            let overdueCount = 0
            let dueSoonCount = 0
            const clientIdsWithLoan = new Set()

            for (const loan of activeLoans) {
                clientIdsWithLoan.add(loan.client_id)
                if (!loan.first_payment_date) continue
                const loanPayments = paymentsByLoan.get(loan.id) || []
                const classification = classifyLoan(loan.first_payment_date, loan.frequency, installmentsMade(loanPayments))
                if (classification === 'overdue') overdueCount++
                if (classification === 'today' || classification === 'soon') dueSoonCount++
            }

            setMetrics({
                totalClients: totalClients || 0,
                activeLoans: activeLoans.length,
                collectedThisMonth,
                pendingBalance,
                totalLent,
                overdueCount,
                dueSoonCount,
                clientsWithLoan: clientIdsWithLoan.size,
            })
        }
        load()
        forceTileRepaint()
    }, [])

    return (
        <div className="min-h-screen bg-[#f2e7d3] dark:bg-[#141414] pb-4">
            {/* Header claro */}
            <div className="sticky top-0 z-20 bg-[#f2e7d3] dark:bg-[#141414] px-4 pt-6 pb-5 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#F3BD68' }}>
                            <Wallet size={20} color="#172531" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-tight">Loan Ledger</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Centro de Operaciones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/clients')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/5 dark:bg-white/10 text-gray-800 dark:text-gray-100 text-sm font-semibold active:scale-95 transition"
                        >
                            <Users size={16} /> {metrics.totalClients}
                        </button>
                        <button className="relative p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-800 dark:text-gray-100 active:scale-95 transition">
                            <Bell size={18} />
                            {(metrics.overdueCount + metrics.dueSoonCount) > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                                    {metrics.overdueCount + metrics.dueSoonCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">¡{getGreeting()}, {userName}! </p>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">Resumen de tu negocio</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Así van tus operaciones hoy</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <SummaryCard
                        Icon={Wallet}
                        title="Préstamos"
                        value={formatCOP(metrics.totalLent)}
                        sub="Capital colocado"
                        stat1Label="Activos" stat1Value={metrics.activeLoans}
                        stat2Label="Vencidas" stat2Value={metrics.overdueCount} stat2Danger
                        onClick={() => navigate('/loans')}
                    />
                </div>
            </div>

            {/* Panel embebido — mismo contenedor "alto relieve", ahora blanco en vez de negro */}
            <div className="px-4 -mt-1">
                <div
                    className="rounded-[2rem] p-5 bg-white dark:bg-gray-900"
                    style={{
                        boxShadow: `
                            inset 0 2px 4px rgba(0,0,0,0.06),
                            inset 0 -1px 0 rgba(0,0,0,0.02),
                            0 1px 0 rgba(255,255,255,0.6)
                        `,
                    }}
                >
                    <ModuleCard
                        Icon={Wallet}
                        title="Préstamos"
                        badge={`${metrics.activeLoans} activos`}
                        badgeColor="#e6f4f3"
                        badgeText="#0f766e"
                        accent="#0f766e"
                        description="Gestiona préstamos, cobros y clientes de crédito."
                        onEnter={() => navigate('/loans')}
                    >
                        <MiniStat label="Cobrado este mes" value={formatCOP(metrics.collectedThisMonth)} />
                        <MiniStat label="Préstamos activos" value={metrics.activeLoans} />
                    </ModuleCard>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ Icon, title, value, sub, stat1Label, stat1Value, stat2Label, stat2Value, stat2Danger, onClick }) {
    return (
        <button
            onClick={onClick}
            className="text-left rounded-3xl p-4 active:scale-95 transition bg-white dark:bg-gray-800"
            style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 20px -6px rgba(16,24,40,0.10)' }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F3EFE9] dark:bg-gray-700">
                    <Icon size={18} className="text-teal-700 dark:text-teal-400" />
                </div>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-500" />
            </div>

            <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
            <p className="text-xl font-black mt-1 truncate text-gray-900 dark:text-white">{value}</p>
            <p className="text-[11px] mb-3 text-gray-400">{sub}</p>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <div>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">{stat1Value}</p>
                    <p className="text-[10px] text-gray-400">{stat1Label}</p>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold ${stat2Danger ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{stat2Value}</p>
                    <p className="text-[10px] text-gray-400">{stat2Label}</p>
                </div>
            </div>
        </button>
    )
}

function ModuleCard({ Icon, title, badge, badgeColor, badgeText, accent, description, onEnter, children }) {
    return (
        <div
            className="rounded-3xl p-4 bg-white dark:bg-gray-800"
            style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 20px -6px rgba(16,24,40,0.10)' }}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: accent, boxShadow: `0 6px 14px -4px ${accent}88` }}
                    >
                        <Icon size={22} color="white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h2>
                            <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: badgeColor, color: badgeText }}
                            >
                                {badge}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 max-w-[180px]">{description}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
                {children}
            </div>

            <button
                onClick={onEnter}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold active:scale-95 transition"
                style={{ background: accent }}
            >
                Entrar al módulo <ChevronRight size={16} />
            </button>
        </div>
    )
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900/40">
            <p className="text-[10px] text-gray-400">{label}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{value}</p>
        </div>
    )
}