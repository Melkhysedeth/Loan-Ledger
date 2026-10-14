export function formatCOP(value) {
  if (!value && value !== 0) return '$ 0'
  return '$ ' + Number(value).toLocaleString('es-CO')
}

// Fechas YYYY-MM-DD (o ISO) a texto local. Se fija el mediodía para que la
// zona horaria no corra la fecha un día.
export function formatDate(value, options) {
    if (!value) return '—'
    const str = String(value)
    const d = new Date(str.length === 10 ? `${str}T12:00:00` : str)
    return d.toLocaleDateString('es-CO', options)
}

export function parseCOP(str) {
  return Number(str.replace(/[^0-9]/g, ''))
}