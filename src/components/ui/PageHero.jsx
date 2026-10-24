import { useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'

const HERO_GRADIENTS = {
    blue: 'linear-gradient(180deg, #0087cd 0%, #005a86 100%)',
    teal: 'linear-gradient(180deg, #0d9488 0%, #0f766e 100%)',
    purple: 'linear-gradient(180deg, #7048e8 0%, #5232b8 100%)',
}

const DEFAULT_OVERLAP = 56

// Curva inferior: radio elíptico (50% del ancho) para que el arco sea largo y suave.
const CURVE_RADIUS = '50% 44px'

// Pinta la barra de estado del móvil con el color superior del hero mientras
// la pantalla está montada, y devuelve el color original al salir.
function useStatusBarColor(color) {
    useEffect(() => {
        if (!color) return
        const metas = [...document.querySelectorAll('meta[name="theme-color"]')]
        const previous = metas.map(m => m.getAttribute('content'))
        metas.forEach(m => m.setAttribute('content', color))
        return () => metas.forEach((m, i) => m.setAttribute('content', previous[i]))
    }, [color])
}

// Botón circular translúcido para usar dentro del hero (volver, editar, etc.)
export function HeroButton({ onClick, children, label }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-95 transition shrink-0"
        >
            {children}
        </button>
    )
}

/**
 * Hero para pantallas secundarias: degradado con curva inferior.
 * - `children` se dibuja dentro del hero (perfil, resumen...).
 * - Si luego pones un <HeroOverlap> con el mismo `overlap`, sus tarjetas
 *   quedan "montadas" a medias sobre la curva.
 */
export default function PageHero({
    title,
    subtitle,
    onBack,
    actions,
    gradient = 'blue',
    overlap = DEFAULT_OVERLAP,
    children,
}) {
    const background = HERO_GRADIENTS[gradient] || gradient
    const topColor = background.match(/#[0-9a-f]{3,8}/i)?.[0]
    useStatusBarColor(topColor)

    return (
        <>
            {/* Cabecera sticky en color sólido: mantiene la barra de estado pintada
                al hacer scroll, igual que los heros de las pantallas principales. */}
            <div
                className="sticky top-0 z-20 px-4 pt-6 pb-3 flex items-center gap-3"
                style={{ background: topColor || background }}
            >
                {onBack && (
                    <HeroButton onClick={onBack} label="Volver">
                        <ChevronLeft size={20} />
                    </HeroButton>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="text-white font-bold text-lg leading-tight truncate">{title}</h1>
                    {subtitle && <p className="text-blue-100/80 text-xs mt-0.5 truncate">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
            <div
                className="px-4 pt-2"
                style={{
                    background,
                    paddingBottom: overlap + 24,
                    borderBottomLeftRadius: CURVE_RADIUS,
                    borderBottomRightRadius: CURVE_RADIUS,
                }}
            >
                {children}
            </div>
        </>
    )
}

// Contenedor que sube sobre la curva del hero.
export function HeroOverlap({ overlap = DEFAULT_OVERLAP, className = '', children }) {
    return (
        <div className={`relative z-10 px-4 ${className}`} style={{ marginTop: -overlap }}>
            {children}
        </div>
    )
}
