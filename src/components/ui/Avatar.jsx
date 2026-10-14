function getInitials(name = '') {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

const SIZES = {
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
}

// `onHero`: versión translúcida para usar sobre el degradado del hero.
export default function Avatar({ name, size = 'md', onHero = false }) {
    const tone = onHero
        ? 'bg-white/20 text-white border-2 border-white/30'
        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
    return (
        <div className={`${SIZES[size]} ${tone} rounded-full font-bold flex items-center justify-center shrink-0`}>
            {getInitials(name)}
        </div>
    )
}
