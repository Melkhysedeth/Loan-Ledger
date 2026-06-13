// Factor por frecuencia: fracción del interés mensual que corresponde a cada periodo
const PERIOD_FACTOR = {
    mensual: 1,
    quincenal: 0.5,   // medio mes → mitad del interés mensual
    semanal: 7 / 30, // por si lo agregas después
}

/**
 * Interés por periodo.
 * @param {number} amount        - Capital del préstamo
 * @param {number} ratePercent   - Tasa MENSUAL en porcentaje (ej: 10 = 10%)
 * @param {string} frequency     - 'mensual' | 'quincenal'
 */
export function calcInterest(amount, ratePercent, frequency = 'mensual') {
    const factor = PERIOD_FACTOR[frequency] ?? 1
    return Math.round((amount * ratePercent * factor) / 100)
}

/**
 * Totales del préstamo.
 * @param {number} amount
 * @param {number} ratePercent   - Tasa mensual
 * @param {number} numPayments   - Número de cuotas (quincenas o meses)
 * @param {string} frequency     - 'mensual' | 'quincenal'
 */
export function calcTotalLoan(amount, ratePercent, numPayments, frequency = 'mensual') {
    const interestPerPeriod = calcInterest(amount, ratePercent, frequency)
    return {
        interestPerPeriod,
        totalInterest: interestPerPeriod * numPayments,
        totalToPay: amount + interestPerPeriod * numPayments,
        // Útil para mostrar en UI: equivalente mensual siempre consistente
        monthlyInterest: Math.round((amount * ratePercent) / 100),
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
export function calcNextPaymentDate(firstPaymentDate, frequency, paymentsMade) {
    if (!firstPaymentDate) return null
    const base = new Date(firstPaymentDate)
    const index = typeof paymentsMade === 'number' && paymentsMade >= 0 ? paymentsMade : 0

    if (frequency === 'quincenal') {
        const d = new Date(base)
        d.setDate(base.getDate() + index * 15)
        return d
    } else {
        const originalDay = base.getDate()
        const targetMonthRaw = base.getMonth() + index
        const targetYear = base.getFullYear() + Math.floor(targetMonthRaw / 12)
        const targetMonth = targetMonthRaw % 12
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

/**
 * Interés del próximo pago para préstamos de interés variable.
 * Se calcula sobre el capital pendiente (amount - capitalPaid).
 */
export function calcVariableInterest(amount, capitalPaid, ratePercent, frequency = 'mensual') {
    const remaining = amount - capitalPaid
    return calcInterest(remaining, ratePercent, frequency)
}