// Cuentas del negocio. ÚNICA fuente para las cifras de dinero que se muestran
// en Hub, Dashboard, Loans, Clients, Collections y Reports.
//
// Reglas:
//  - los pagos anulados (voided) no cuentan en ninguna cifra
//  - el capital pagado de un préstamo incluye `initial_capital_paid`
//  - "este mes" se mide por la fecha del pago (`date`), no por cuándo se registró
//  - los retiros marcados `is_transfer` son traslados entre métodos, no salidas de capital
import { activePayments, loanCapitalPaid, totalPaidOf } from './loanMetrics'

export const ACTIVE_STATUSES = ['active', 'overdue', 'frozen', 'agreement']
export const isActiveLoan = (loan) => ACTIVE_STATUSES.includes(loan.status)

// Primer día del mes en YYYY-MM-DD (hora local, sin pasar por UTC).
export function monthStart(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// Capital retirado del negocio (sin traslados entre métodos).
export const withdrawnTotal = (withdrawals = []) =>
    withdrawals.filter(w => !w.is_transfer).reduce((s, w) => s + (w.amount || 0), 0)

// Capital colocado = suma de los préstamos vigentes menos lo retirado.
export const totalLentOf = (activeLoans, withdrawals) =>
    activeLoans.reduce((s, l) => s + (l.amount || 0), 0) - withdrawnTotal(withdrawals)

// Capital pendiente de un préstamo. `loanPayments` puede traer anulados.
export const pendingOf = (loan, loanPayments = []) =>
    (loan.amount || 0) - loanCapitalPaid(loan, activePayments(loanPayments))

// Capital pendiente de varios préstamos. `paymentsByLoan` es Map<loan_id, pagos[]> (ver groupBy).
export const pendingBalanceOf = (loans, paymentsByLoan) =>
    loans.reduce((s, l) => s + pendingOf(l, paymentsByLoan.get(l.id) || []), 0)

// Total cobrado desde una fecha (YYYY-MM-DD) en adelante.
export const collectedSince = (payments, fromDate) =>
    totalPaidOf(activePayments(payments).filter(p => p.date >= fromDate))

// ── Billeteras (efectivo, Nequi, Bre-B) ──────────────────────────────────────
export const WALLET_METHODS = ['efectivo', 'nequi', 'breb']

/**
 * Saldo disponible en cada billetera. Misma lógica para el Dashboard y para validar desembolsos.
 *
 * Cada billetera arranca en la fecha de su primera inyección (el saldo inicial real) y desde ahí suma:
 *   inyecciones + cobros recibidos por ese método - préstamos desembolsados por ese método - retiros
 * Los traslados entre billeteras son un retiro y una inyección con is_transfer, por eso cuentan aquí.
 *
 * Devuelve { efectivo: { balance, tracked }, nequi: {...}, breb: {...} }.
 * `tracked: false` = esa billetera nunca tuvo un saldo inicial registrado, su balance no es confiable.
 */
export function walletBalances({ injections = [], payments = [], loans = [], disbursements = [], withdrawals = [] }) {
    const valid = activePayments(payments)
    const paymentsByLoan = new Map()
    for (const p of valid) {
        if (!paymentsByLoan.has(p.loan_id)) paymentsByLoan.set(p.loan_id, [])
        paymentsByLoan.get(p.loan_id).push(p)
    }
    const loanById = new Map(loans.map(l => [l.id, l]))

    // Capital que realmente salió por un préstamo: en los cancelados el saldo pendiente vuelve.
    const lentOf = (l) => l.status === 'cancelled'
        ? (l.amount || 0) - pendingOf(l, paymentsByLoan.get(l.id) || [])
        : (l.amount || 0)

    const loanIdsWithDisbursements = new Set(disbursements.map(d => d.loan_id))
    const sortedInjections = [...injections].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    const result = {}
    for (const method of WALLET_METHODS) {
        const methodInjections = sortedInjections.filter(i => i.payment_method === method)
        if (methodInjections.length === 0) {
            result[method] = { balance: 0, tracked: false }
            continue
        }
        const start = methodInjections[0].date

        const injected = methodInjections.reduce((s, i) => s + (i.amount || 0), 0)

        const collected = valid.reduce((s, p) => {
            if (p.date < start) return s
            if (p.payment_method === method) return s + (p.total_paid || 0)
            if (p.method_breakdown?.[method]) return s + p.method_breakdown[method]
            return s
        }, 0)

        // Préstamos con desglose en loan_disbursements (los nuevos)
        const lentFromDisbursements = disbursements.reduce((s, d) => {
            if (d.payment_method !== method) return s
            const loan = loanById.get(d.loan_id)
            if (!loan || !loan.start_date || loan.start_date < start || loan.is_unification) return s
            // En un cancelado solo cuenta la parte proporcional ya abonada.
            const share = loan.amount ? lentOf(loan) / loan.amount : 1
            return s + (d.amount || 0) * share
        }, 0)

        // Préstamos viejos, sin fila en loan_disbursements: usan el método simple del préstamo
        const lentFromLegacyLoans = loans
            .filter(l => !loanIdsWithDisbursements.has(l.id) && l.payment_method === method
                && l.start_date && l.start_date >= start && !l.is_unification)
            .reduce((s, l) => s + lentOf(l), 0)

        const withdrawn = withdrawals
            .filter(w => w.payment_method === method && w.date >= start)
            .reduce((s, w) => s + (w.amount || 0), 0)

        result[method] = {
            balance: injected + collected - (lentFromDisbursements + lentFromLegacyLoans) - withdrawn,
            tracked: true,
        }
    }
    return result
}
