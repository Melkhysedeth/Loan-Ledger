import { useEffect, useRef } from 'react'
import { supabase } from '../db/supabase'

export function useInactivity(minutes = 5) {
    const timer = useRef(null)

    useEffect(() => {
        const reset = () => {
            localStorage.setItem('lastActivity', Date.now().toString())
            clearTimeout(timer.current)
            timer.current = setTimeout(async () => {
                await supabase.auth.signOut()
                window.location.href = '/'
            }, minutes * 60 * 1000)
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
        events.forEach(e => window.addEventListener(e, reset))
        const checkIfExpired = async () => {
            if (document.visibilityState !== 'visible') return
            const last = parseInt(localStorage.getItem('lastActivity') || '0', 10)
            const elapsed = Date.now() - last
            if (last && elapsed > minutes * 60 * 1000) {
                clearTimeout(timer.current)
                await supabase.auth.signOut()
                window.location.href = '/'
            } else {
                reset() // si no expiró, reinicia el timer normal
            }
        }

        document.addEventListener('visibilitychange', checkIfExpired)
        reset() // inicia el timer al montar

        return () => {
            clearTimeout(timer.current)
            events.forEach(e => window.removeEventListener(e, reset))
            document.removeEventListener('visibilitychange', checkIfExpired)
        }
    }, [minutes])
}