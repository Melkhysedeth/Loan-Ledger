import { formatCOP } from './format'

function formatFecha(dateStr) {
    if (!dateStr) return ''
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
}

function primerNombre(nombreCompleto) {
    return (nombreCompleto || '').trim().split(' ')[0] || ''
}

// Mensaje enviado cuando se desembolsa un préstamo nuevo (no aplica en ediciones).
export function mensajeDesembolso({ client, loan }) {
    return `Hola ${primerNombre(client.name)}, tu préstamo ha sido desembolsado ✅

*Monto:* ${formatCOP(loan.amount)}
*Tasa de interés:* ${loan.interest_rate}% (${loan.interest_type === 'variable' ? 'variable' : 'fijo'})
*Frecuencia de pago:* ${loan.frequency}
*Fecha de desembolso:* ${formatFecha(loan.start_date)}
*Fecha del primer pago:* ${loan.first_payment_date ? formatFecha(loan.first_payment_date) : 'Por definir'}${loan.notes ? `\n*Notas:* ${loan.notes}` : ''}

Cualquier duda con gusto te ayudamos. 🙌`
}

// Mensaje enviado cuando se registra un pago.
// `interestPendiente` > 0 significa que quedó faltando interés de este período;
// `saldoFavorInteres` > 0 significa que pagó interés de más (a favor).
export function mensajePago({ client, date, totalPaid, interestPaid, capitalPaid, remainingCapital, interestPendiente, saldoFavorInteres, liquidado }) {
    let lineaInteres = ''
    if (liquidado) {
        lineaInteres = ''
    } else if (interestPendiente > 0) {
        lineaInteres = `\n  • Interés pendiente de este período: ${formatCOP(interestPendiente)}`
    } else if (saldoFavorInteres > 0) {
        lineaInteres = `\n  • Saldo a favor por interés pagado de más: ${formatCOP(saldoFavorInteres)}`
    }

    return `Hola ${primerNombre(client.name)}, registramos tu pago 💰

*Fecha:* ${formatFecha(date)}
*Total pagado:* ${formatCOP(totalPaid)}
  • Abono a interés: ${formatCOP(interestPaid)}
  • Abono a capital: ${formatCOP(capitalPaid)}

*Saldo pendiente:*
  • Capital: ${formatCOP(Math.max(0, remainingCapital))}${lineaInteres}

${liquidado ? '✅ *¡Tu préstamo ha quedado totalmente liquidado! Gracias por tu cumplimiento.*' : ''}`
}