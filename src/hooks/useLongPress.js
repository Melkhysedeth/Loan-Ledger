import { useRef, useCallback } from 'react'

/**
 * Hook de long-press, compatible con touch (iPhone) y mouse (desktop).
 *
 * A diferencia de la versión simple, este recibe el elemento presionado
 * (currentTarget) y le pasa al callback su bounding rect, para poder
 * anclar un menú contextual justo sobre/junto a la card presionada.
 *
 * Uso:
 *   const longPress = useLongPress((rect) => abrirMenu(rect), 500)
 *   <div {...longPress}>...</div>
 */
export default function useLongPress(onLongPress, ms = 500) {
    const timerRef = useRef(null)

    const start = useCallback((e) => {
        const target = e.currentTarget
        timerRef.current = setTimeout(() => {
            const rect = target.getBoundingClientRect()
            onLongPress(rect)
        }, ms)
    }, [onLongPress, ms])

    const clear = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    return {
        onTouchStart: start,
        onTouchEnd: clear,
        onTouchMove: clear, // si el dedo se mueve (scroll), cancelamos el long-press
        onMouseDown: start,
        onMouseUp: clear,
        onMouseLeave: clear,
    }
}