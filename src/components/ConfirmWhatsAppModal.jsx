import { buildWhatsAppLink } from '../utils/whatsapp'

// open: boolean
// phone: teléfono del cliente (string, puede venir null/vacío)
// message: texto ya armado (mensajeDesembolso / mensajePago)
// onClose: se llama tanto si envía como si no envía — es el punto donde
//          el componente que lo invoca debe seguir su flujo (ej: navegar).
export default function ConfirmWhatsAppModal({ open, phone, message, onClose }) {
    if (!open) return null

    const link = buildWhatsAppLink(phone, message)

    function handleSend() {
        if (link) window.open(link, '_blank', 'noopener,noreferrer')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-20 sm:pb-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-5 shadow-xl max-h-[80vh] overflow-y-auto">
                <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                    ¿Enviar esta información al cliente?
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                    {link
                        ? 'Se abrirá WhatsApp con el mensaje ya redactado. Tú decides si lo envías.'
                        : 'Este cliente no tiene un teléfono válido registrado, no se puede enviar.'}
                </p>

                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-3 mb-4 max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-200 font-sans">
                        {message}
                    </pre>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium active:scale-95 transition"
                    >
                        No enviar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!link}
                        className="py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold active:scale-95 transition disabled:opacity-50"
                    >
                        Enviar por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    )
}