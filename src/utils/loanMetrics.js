// Métricas básicas sobre pagos. Criterio único para todas las pantallas:
//  - los pagos anulados (voided) no cuentan para nada
//  - los pagos migrados de una unificación (original_loan_id) no cuentan como
//    cuotas del cronograma nuevo, pero sí como dinero cobrado.
//  - los abonos adicionales (is_extra) son dinero extra dentro de un periodo ya
//    cubierto: tampoco cuentan como cuota, así no adelantan el próximo vencimiento.

export const activePayments = (payments = []) => payments.filter(p => !p.voided)

const sumField = (list, field) => list.reduce((s, p) => s + (p[field] || 0), 0)

// Capital realmente abonado a un préstamo: pagos + capital inicial ya pagado al crearlo.
export const loanCapitalPaid = (loan, payments) => capitalPaidOf(payments) + (loan.initial_capital_paid || 0)

export const totalPaidOf = (payments) => sumField(payments, 'total_paid')
export const capitalPaidOf = (payments) => sumField(payments, 'capital_paid')
export const interestPaidOf = (payments) => sumField(payments, 'interest_paid')

// Cuotas (periodos) realmente cubiertas. Acepta pagos con o sin anulados.
export const installmentsMade = (payments = []) =>
    payments.filter(p => !p.voided && !p.original_loan_id && !p.is_extra).length

// Agrupa por una clave en un solo recorrido: Map<clave, item[]>.
// Evita el patrón O(n²) de `loans.map(l => payments.filter(p => p.loan_id === l.id))`.
export function groupBy(list, key) {
    const map = new Map()
    for (const item of list) {
        const k = item[key]
        const bucket = map.get(k)
        if (bucket) bucket.push(item)
        else map.set(k, [item])
    }
    return map
}
