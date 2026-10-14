// Estados de un préstamo: etiqueta, badge (claro + oscuro) y punto de color.
// Única fuente de verdad — no redefinir en cada pantalla.
export const LOAN_STATUS = {
    active: {
        label: 'Activo',
        badge: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
        dot: 'bg-green-500 dark:bg-green-400',
    },
    frozen: {
        label: 'Congelado',
        badge: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
        dot: 'bg-blue-500 dark:bg-blue-400',
    },
    overdue: {
        label: 'En mora',
        badge: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
        dot: 'bg-red-500 dark:bg-red-400',
    },
    paid: {
        label: 'Liquidado',
        badge: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700',
        dot: 'bg-gray-400',
    },
    agreement: {
        label: 'Acuerdo especial',
        badge: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    unified: {
        label: 'Unificado',
        badge: 'text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
        dot: 'bg-purple-500 dark:bg-purple-400',
    },
    cancelled: {
        label: 'Cancelado',
        badge: 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/20',
        dot: 'bg-red-400 dark:bg-red-300',
    },
}

export function getLoanStatus(status) {
    return LOAN_STATUS[status] || LOAN_STATUS.active
}
