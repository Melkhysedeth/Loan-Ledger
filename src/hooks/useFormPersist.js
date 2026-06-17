import { useEffect } from 'react'

/**
 * Persiste el estado de un formulario en sessionStorage.
 * Se limpia automáticamente cuando el formulario se guarda con éxito.
 *
 * @param {string} key        - Clave única para identificar este formulario (ej: 'new-client-form')
 * @param {object} values     - El objeto de estado actual del formulario
 * @param {function} setValues - El setter de estado (useState)
 * @param {object} options
 * @param {any}    options.empty   - El estado vacío inicial para comparar al limpiar
 * @param {string[]} options.exclude - Campos a NO persistir (ej: passwords, referencias de pago)
 */
export function useFormPersist(key, values, setValues, { empty = {}, exclude = [], skip = false } = {}) {

    // Al montar: restaurar si hay datos guardados
    useEffect(() => {
        if (skip) return
        try {
            const saved = sessionStorage.getItem(key)
            if (saved) {
                const parsed = JSON.parse(saved)
                const hasData = Object.entries(parsed).some(([k, v]) =>
                    !exclude.includes(k) && v !== '' && v !== null && v !== undefined
                )
                if (hasData) setValues(prev => ({ ...prev, ...parsed }))
            }
        } catch {
            // sessionStorage bloqueado o JSON inválido, ignorar
        }
    }, []) // solo al montar

    // Al cambiar valores: guardar (excluyendo campos sensibles)
    useEffect(() => {
        if (skip) return
        try {
            const toSave = Object.fromEntries(
                Object.entries(values).filter(([k]) => !exclude.includes(k))
            )
            const isEmpty = Object.keys(empty).every(k => values[k] === empty[k])
            if (isEmpty) {
                sessionStorage.removeItem(key)
            } else {
                sessionStorage.setItem(key, JSON.stringify(toSave))
            }
        } catch {
            // sessionStorage lleno o bloqueado, ignorar
        }
    }, [values, skip])

    // Función para limpiar manualmente (llamar al guardar con éxito)
    function clearPersisted() {
        try { sessionStorage.removeItem(key) } catch { /* noop */ }
    }

    return { clearPersisted }
}