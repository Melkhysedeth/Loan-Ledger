// Colombia: los números en `clients.phone` se guardan normalmente como
// 10 dígitos (ej: "3001234567"). wa.me necesita el indicativo de país (57)
// sin '+', espacios ni guiones.
export function toWhatsAppNumber(phone) {
    if (!phone) return null
    const digits = String(phone).replace(/\D/g, '')
    if (!digits) return null
    // Si ya viene con indicativo (más de 10 dígitos empezando en 57), se respeta.
    if (digits.startsWith('57') && digits.length > 10) return digits
    return `57${digits}`
}

// Arma el enlace https://wa.me/... con el mensaje ya codificado.
// Devuelve null si no hay teléfono válido (el modal debe manejar ese caso).
export function buildWhatsAppLink(phone, message) {
    const number = toWhatsAppNumber(phone)
    if (!number) return null
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}