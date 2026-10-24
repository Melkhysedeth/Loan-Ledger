import { useEffect, useState } from 'react'
import { supabase } from '../db/supabase'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined)
    const [redirecting, setRedirecting] = useState(false)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null)
            if (event === 'SIGNED_IN') {
                setRedirecting(true)
                window.location.href = '/'
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ user, redirecting }}>
            {children}
        </AuthContext.Provider>
    )
}