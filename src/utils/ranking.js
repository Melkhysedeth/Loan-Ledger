import { Star, ThumbsUp, AlertTriangle, CircleAlert, Sparkles } from 'lucide-react'

export function calcRanking(payments, loans) {
  if (!payments || payments.length === 0) return 'nuevo'

  let lateCount = 0

  for (const loan of loans) {
    const loanPayments = payments.filter(p => p.loan_id === loan.id)
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
  excelente: { label: 'Excelente', Icon: Star,          color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' },
  bueno:     { label: 'Bueno',     Icon: ThumbsUp,       color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' },
  regular:   { label: 'Regular',   Icon: AlertTriangle,  color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30' },
  moroso:    { label: 'Moroso',    Icon: CircleAlert,    color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' },
  nuevo:     { label: 'Nuevo',     Icon: Sparkles,       color: 'text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-700' },
}

export const RANKING_OPTIONS = ['excelente', 'bueno', 'regular', 'moroso']