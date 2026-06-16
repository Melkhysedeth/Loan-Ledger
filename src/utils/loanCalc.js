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

/**
 * Calcula la situación de mora de un préstamo.
 * @param {object} loan          - Objeto del préstamo (first_payment_date, frequency, interest_type, interest_rate, interest_amount, amount)
 * @param {number} paymentsMade  - Número de pagos realizados
 * @param {number} totalCapitalPaid - Capital total pagado hasta ahora
 * @returns {object} { inMora, diasMora, periodosEnMora, mesesEnMora, valorInteresesDebe }
 */
export function calcMora(loan, paymentsMade, totalCapitalPaid = 0) {
    if (!loan.first_payment_date) {
        return { inMora: false, diasMora: 0, periodosEnMora: 0, mesesEnMora: 0, valorInteresesDebe: 0 }
    }

    const today = new Date()
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Fecha del pago más antiguo sin pagar
    const fechaMasAntigua = calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)
    const fechaMasAntiguaClean = new Date(fechaMasAntigua.getFullYear(), fechaMasAntigua.getMonth(), fechaMasAntigua.getDate())

    // Días de mora: desde el día SIGUIENTE a la fecha vencida más antigua
    const diffMs = todayClean - fechaMasAntiguaClean
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // Solo está en mora si la fecha ya pasó (diffDias > 0 significa que ya era ayer o antes)
    if (diffDias <= 0) {
        return { inMora: false, diasMora: 0, periodosEnMora: 0, mesesEnMora: 0, valorInteresesDebe: 0 }
    }

    // Cuántos periodos han vencido desde el primer pago hasta hoy
    const diasPorPeriodo = loan.frequency === 'quincenal' ? 15 : 30
    const base = new Date(loan.first_payment_date)
    const baseClean = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    const diasTranscurridos = Math.floor((todayClean - baseClean) / (1000 * 60 * 60 * 24))
    const periodosVencidos = Math.floor(diasTranscurridos / diasPorPeriodo) + 1
    const periodosEnMora = Math.max(0, periodosVencidos - paymentsMade)

    // Meses de interés que debe (quincenal: 2 quincenas = 1 mes)
    const mesesEnMora = loan.frequency === 'quincenal' ? periodosEnMora / 2 : periodosEnMora

    // Valor en dinero de los intereses que debe
    let valorInteresesDebe = 0
    if (loan.interest_type === 'variable') {
        // Interés mensual sobre el saldo pendiente actual
        const interestMensual = Math.round(((loan.amount - totalCapitalPaid) * loan.interest_rate) / 100)
        valorInteresesDebe = Math.round(interestMensual * mesesEnMora)
    } else {
        // interest_amount ya es el interés por periodo (quincenal o mensual)
        // Para mora usamos el interés mensual: quincenal lo duplicamos
        const interestMensual = loan.frequency === 'quincenal'
            ? (loan.interest_amount || 0) * 2
            : (loan.interest_amount || 0)
        valorInteresesDebe = Math.round(interestMensual * mesesEnMora)
    }

    return {
        inMora: true,
        diasMora: diffDias,
        periodosEnMora,
        mesesEnMora,
        valorInteresesDebe,
    }
}