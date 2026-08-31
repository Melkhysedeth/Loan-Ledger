// src/utils/fuxionCalc.js
//
// Reglas del plan de compensación de Fuxion (PRO-LEV).
// ⚠️ Tabla de referencia pública — ajusta los valores si tu cuenta tiene
// condiciones distintas (rango, clientes mínimos, etc.). Solo edita este
// archivo, ninguna pantalla debería tener estos números hardcodeados.
export const FUXION_TIERS = [
    { pv: 800, discount: 0.50, label: '50%' },
    { pv: 500, discount: 0.40, label: '40%' },
    { pv: 300, discount: 0.30, label: '30%' },
    { pv: 100, discount: 0.25, label: '25%' },
    { pv: 60, discount: 0.20, label: '20%' },
]

const ASCENDING_TIERS = [...FUXION_TIERS].sort((a, b) => a.pv - b.pv)

// Fuxion cuenta la semana de lunes a domingo. Devuelve el lunes (YYYY-MM-DD)
// de la semana a la que pertenece `date`.
export function getFuxionWeekStart(date = new Date()) {
    const d = new Date(date)
    const day = d.getDay() // 0 = domingo
    const diff = day === 0 ? -6 : 1 - day
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
}

// Devuelve las 4 fechas de inicio de semana (más antigua -> más reciente)
// que componen la ventana PV4 actual.
export function getPV4WeekWindow(referenceDate = new Date()) {
    const currentMonday = new Date(getFuxionWeekStart(referenceDate))
    const weeks = []
    for (let i = 3; i >= 0; i--) {
        const d = new Date(currentMonday)
        d.setDate(d.getDate() - i * 7)
        weeks.push(d.toISOString().split('T')[0])
    }
    return weeks // [semana-3, semana-2, semana-1, semana actual]
}

// Dado un PV4 total, devuelve el tier actual (o null si no alcanza el mínimo de 60).
export function calculateBonusTier(pv4) {
    return FUXION_TIERS.find(tier => pv4 >= tier.pv) || null
}

// Cuántos PV faltan (en la semana actual) para alcanzar el siguiente tier.
export function pointsToNextTier(pv4) {
    const next = ASCENDING_TIERS.find(tier => tier.pv > pv4)
    if (!next) return null // ya está en el tier máximo (50%)
    return { next, pointsNeeded: Math.max(0, next.pv - pv4) }
}