export function calcRanking(payments, loans) {
  if (!payments || payments.length === 0) return 'nuevo'

  let lateCount = 0

  for (const loan of loans) {
    const loanPayments = payments.filter(p => p.loanId === loan.id)
    for (const payment of loanPayments) {
      if (payment.late) lateCount++
    }
  }

  if (lateCount === 0) return 'excelente'
  if (lateCount <= 2) return 'bueno'
  if (lateCount <= 4) return 'regular'
  return 'moroso'
}

export const RANKING_LABELS = {
  excelente: { label: 'Excelente', emoji: '⭐', color: 'text-green-600 bg-green-50' },
  bueno:     { label: 'Bueno',     emoji: '👍', color: 'text-blue-600 bg-blue-50' },
  regular:   { label: 'Regular',   emoji: '⚠️', color: 'text-yellow-600 bg-yellow-50' },
  moroso:    { label: 'Moroso',    emoji: '🔴', color: 'text-red-600 bg-red-50' },
  nuevo:     { label: 'Nuevo',     emoji: '🆕', color: 'text-gray-600 bg-gray-50' },
}

export const RANKING_OPTIONS = ['excelente', 'bueno', 'regular', 'moroso']