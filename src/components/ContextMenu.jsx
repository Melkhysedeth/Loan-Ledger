import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

const MENU_WIDTH = 200
const MARGIN = 8

/**
 * Menú contextual flotante anclado a la card que se presionó (estilo iOS),
 * en vez de un action sheet que sube desde abajo.
 *
 * Props:
 *  - open: boolean
 *  - anchorRect: DOMRect | null  (resultado de getBoundingClientRect() de la card)
 *  - onEdit: () => void
 *  - onDelete: () => void
 *  - onClose: () => void
 */
export default function ContextMenu({ open, anchorRect, onEdit, onDelete, onClose }) {
    const [style, setStyle] = useState(null)

    useEffect(() => {
        if (!open || !anchorRect) return

        const viewportW = window.innerWidth
        const viewportH = window.innerHeight

        // Centrado horizontal respecto a la card, sin salirse de la pantalla
        let left = anchorRect.left + anchorRect.width / 2 - MENU_WIDTH / 2
        left = Math.max(MARGIN, Math.min(left, viewportW - MENU_WIDTH - MARGIN))

        // Por defecto el menú aparece debajo de la card; si no hay espacio, arriba
        const menuHeightEstimate = 96
        const spaceBelow = viewportH - anchorRect.bottom
        const placeAbove = spaceBelow < menuHeightEstimate + MARGIN

        const top = placeAbove
            ? anchorRect.top - menuHeightEstimate - MARGIN
            : anchorRect.bottom + MARGIN

        setStyle({ left, top, transformOrigin: placeAbove ? 'bottom center' : 'top center' })
    }, [open, anchorRect])

    if (!open || !style) return null

    return (
        <div className="fixed inset-0 z-50" onClick={onClose}>
            {/* Dim suave de fondo, sin cubrir tanto como un action sheet */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Resalta la card original con un halo, dibujando un "recorte" en su posición */}
            {anchorRect && (
                <div
                    className="absolute rounded-2xl ring-2 ring-white/80 pointer-events-none"
                    style={{
                        left: anchorRect.left - 2,
                        top: anchorRect.top - 2,
                        width: anchorRect.width + 4,
                        height: anchorRect.height + 4,
                    }}
                />
            )}

            <div
                className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-pop"
                style={{ left: style.left, top: style.top, width: MENU_WIDTH, transformOrigin: style.transformOrigin }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onEdit}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
                >
                    <Pencil size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Editar</span>
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700" />
                <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
                >
                    <Trash2 size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-red-500">Eliminar</span>
                </button>
            </div>
        </div>
    )
}