export function formatCOP(value) {
  if (!value && value !== 0) return '$ 0'
  return '$ ' + Number(value).toLocaleString('es-CO')
}

export function parseCOP(str) {
  return Number(str.replace(/[^0-9]/g, ''))
}