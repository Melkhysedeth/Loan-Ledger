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
