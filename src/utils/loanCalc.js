export function calcInterest(amount, ratePercent) {
    return Math.round((amount * ratePercent) / 100)
}

export function calcTotalLoan(amount, ratePercent, numPayments) {
    const interest = calcInterest(amount, ratePercent)
    return {
        interestPerPeriod: interest,
        totalInterest: interest * numPayments,
        totalToPay: amount + (interest * numPayments),
    }
}

// Calcula todas las fechas de pago de un préstamo
export function calcPaymentDates(firstPaymentDate, frequency, count = 12) {
    if (!firstPaymentDate) return []
    const dates = []
    const base = new Date(firstPaymentDate)
    for (let i = 0; i < count; i++) {
        const d = new Date(base)
        if (frequency === 'quincenal') {
            d.setDate(base.getDate() + i * 15)
        } else {
            d.setMonth(base.getMonth() + i)
        }
        dates.push(d)
    }
    return dates
}

// Devuelve la próxima fecha de pago pendiente
// Devuelve la próxima fecha de pago pendiente
export function calcNextPaymentDate(firstPaymentDate, frequency, paymentsMade) {
    if (!firstPaymentDate) return null
    const base = new Date(firstPaymentDate)
    // paymentsMade = cuántos pagos ya se hicieron; el próximo es el índice paymentsMade
    const index = typeof paymentsMade === 'number' && paymentsMade >= 0 ? paymentsMade : 0

    if (frequency === 'quincenal') {
        const d = new Date(base)
        d.setDate(base.getDate() + index * 15)
        return d
    } else {
        // Mensual: avanzar `index` meses desde firstPaymentDate
        // Preservar el día original del primer pago, ajustando al último día si el mes es más corto
        const originalDay = base.getDate()
        const targetMonthRaw = base.getMonth() + index
        const targetYear = base.getFullYear() + Math.floor(targetMonthRaw / 12)
        const targetMonth = targetMonthRaw % 12
        // Último día del mes destino
        const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
        const day = Math.min(originalDay, lastDay)
        return new Date(targetYear, targetMonth, day)
    }
}

// Clasifica el préstamo: 'overdue' | 'today' | 'soon' | 'ok'
export function classifyLoan(firstPaymentDate, frequency, paymentsMade) {
    const next = calcNextPaymentDate(firstPaymentDate, frequency, paymentsMade)
    if (!next) return 'ok'
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const nextDay = new Date(next.getFullYear(), next.getMonth(), next.getDate())
    const diffDays = Math.round((nextDay - today) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'overdue'
    if (diffDays === 0) return 'today'
    if (diffDays <= 7) return 'soon'
    return 'ok'
}