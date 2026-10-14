import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../db/supabase'
import { classifyLoan } from '../utils/loanCalc'
import { forceTileRepaint } from './useForceRepaint'
import { activePayments, groupBy, installmentsMade } from '../utils/loanMetrics'
import {
    isActiveLoan, totalLentOf, pendingBalanceOf, pendingOf, collectedSince, monthStart, walletBalances,
} from '../utils/accounting'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const STATUS_LABELS = {
    active: { label: 'Activos', color: '#3b5bdb' },
    overdue: { label: 'En mora', color: '#ef4444' },
    agreement: { label: 'Acuerdo especial', color: '#f59e0b' },
    frozen: { label: 'Congelados', color: '#a855f7' },
    paid: { label: 'Liquidados', color: '#22c55e' },
}

const NO_WALLET = { balance: 0, tracked: false }

const INITIAL_STATS = {
    totalLent: 0,
    availableCapital: 0,
    capitalByMethod: { efectivo: 0, nequi: 0, breb: 0 },
    wallets: { efectivo: NO_WALLET, nequi: NO_WALLET, breb: NO_WALLET },
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
}

async function fetchDashboardData() {
    const now = new Date()

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
    // Los pagos anulados no entran en ninguna cifra (cobrado, capital disponible, gráficas, saldos).
    const allPayments = activePayments(payments || [])
    const paymentsByLoan = groupBy(allPayments, 'loan_id')
    // Capital que realmente salió del negocio por un préstamo: en los cancelados el saldo
    // pendiente vuelve al disponible (como dice el modal de cancelar), solo cuenta lo ya abonado.
    const lentOf = (l) => l.status === 'cancelled'
        ? (l.amount || 0) - pendingOf(l, paymentsByLoan.get(l.id) || [])
        : (l.amount || 0)

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
            .reduce((s, l) => s + lentOf(l), 0)
        const withdrawnSinceStart = (withdrawals || [])
            .filter(w => w.date >= trackingStartDate)
            .reduce((s, w) => s + (w.amount || 0), 0)

        availableCapital = totalInjections + collectedSinceStart - lentSinceStart - withdrawnSinceStart
    }

    // Saldo de cada billetera (misma función que valida los desembolsos en Nuevo préstamo)
    const wallets = walletBalances({
        injections: allInjections, payments: allPayments, loans: allLoans,
        disbursements: allDisbursements, withdrawals: withdrawals || [],
    })
    const capitalByMethodResult = {
        efectivo: wallets.efectivo.balance,
        nequi: wallets.nequi.balance,
        breb: wallets.breb.balance,
    }

    const activeLoans = allLoans.filter(isActiveLoan)
    const onTimeLoans = allLoans.filter(l => ['active', 'frozen', 'agreement'].includes(l.status))
    const totalLent = totalLentOf(activeLoans, withdrawals || [])
    const collectedThisMonth = collectedSince(allPayments, monthStart(now))
    const pendingBalance = pendingBalanceOf(activeLoans, paymentsByLoan)

    const activeClients = allClients.filter(c => c.status === 'active').length

    // Mora y próximos usando loanCalc (igual que Collections)
    const overdue = []
    const dueSoon = []

    for (const loan of activeLoans) {
        if (!loan.first_payment_date) continue
        const loanPayments = paymentsByLoan.get(loan.id) || []
        // Mismo criterio que en LoanDetail.jsx: los pagos migrados de una
        // unificación no cuentan como cuotas del cronograma nuevo.
        const paymentsMade = installmentsMade(loanPayments)
        const classification = classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade)
        const client = allClients.find(c => c.id === loan.client_id)

        if (classification === 'overdue') overdue.push({ ...loan, client })
        if (classification === 'today' || classification === 'soon') dueSoon.push({ ...loan, client })
    }

    // Gráfica: últimos 6 meses
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        const dStr = monthStart(d)
        const nStr = monthStart(nextMonth)

        const cobrado = allPayments
            .filter(p => p.date && p.date >= dStr && p.date < nStr)
            .reduce((s, p) => s + (p.total_paid || 0), 0)

        const prestado = allLoans
            .filter(l => l.start_date && l.start_date >= dStr && l.start_date < nStr && !l.is_unification)
            .reduce((s, l) => s + lentOf(l), 0)

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
    // El porcentaje se calcula solo sobre los estados que se muestran (sin unificados ni cancelados)
    const totalLoansCount = Object.entries(statusCounts).filter(([status]) => STATUS_LABELS[status]).reduce((t, [, c]) => t + c, 0)
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

    return {
        totalLent, collectedThisMonth, pendingBalance, activeClients, availableCapital,
        capitalByMethod: capitalByMethodResult,
        activeLoans: activeLoans.length, onTime: onTimeLoans.length, overdue, dueSoon, monthlyData,
        attention, statusDistribution, recentPayments,
        agreementCount, frozenCount, paidCount,
        wallets,
    }
}

// Trae todo lo que necesita el Dashboard. `reload()` vuelve a calcular (tras retirar, inyectar o trasladar).
export function useDashboardData() {
    const [stats, setStats] = useState(INITIAL_STATS)

    const reload = useCallback(async () => {
        setStats(await fetchDashboardData())
        forceTileRepaint()
    }, [])

    useEffect(() => {
        let cancelled = false
        fetchDashboardData().then(result => {
            if (cancelled) return
            setStats(result)
            forceTileRepaint()
        })
        return () => { cancelled = true }
    }, [])

    return { stats, reload }
}
