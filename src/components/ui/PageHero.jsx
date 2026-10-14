import { ChevronLeft } from 'lucide-react'

const HERO_GRADIENTS = {
    blue: 'linear-gradient(180deg, #0087cd 0%, #005a86 100%)',
    teal: 'linear-gradient(180deg, #0d9488 0%, #0f766e 100%)',
    purple: 'linear-gradient(180deg, #7048e8 0%, #5232b8 100%)',
}

const DEFAULT_OVERLAP = 56

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
    return (
        <div
            className="px-4 pt-6 rounded-b-[28px]"
            style={{
                background: HERO_GRADIENTS[gradient] || gradient,
                paddingBottom: overlap + 16,
            }}
        >
            <div className="flex items-center gap-3">
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
            {children && <div className="mt-5">{children}</div>}
        </div>
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
