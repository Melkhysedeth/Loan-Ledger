import { useEffect, useRef } from 'react'
import { supabase } from '../db/supabase'

export function useInactivity(minutes = 5) {
    const timer = useRef(null)

    useEffect(() => {
        const reset = () => {
            clearTimeout(timer.current)
            timer.current = setTimeout(async () => {
                await supabase.auth.signOut()
                window.location.href = '/'
            }, minutes * 60 * 1000)
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
        events.forEach(e => window.addEventListener(e, reset))
        reset() // inicia el timer al montar

        return () => {
            clearTimeout(timer.current)
            events.forEach(e => window.removeEventListener(e, reset))
        }
    }, [minutes])
}