// Componente reutilizable para evitar el flash en blanco
// Úsalo en cualquier pantalla mientras cargan datos

export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse border border-gray-100 dark:border-transparent shadow-sm dark:shadow-none">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={`h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 ${i === 0 ? 'w-1/3' : i % 2 === 0 ? 'w-2/3' : 'w-full'}`} />
            ))}
        </div>
    )
}

export function SkeletonList({ rows = 4 }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-transparent shadow-sm dark:shadow-none">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3" />
                    </div>
                    <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            ))}
        </div>
    )
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse border border-gray-100 dark:border-transparent shadow-sm dark:shadow-none">
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-2/3 mb-3" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                </div>
            ))}
        </div>
    )
}