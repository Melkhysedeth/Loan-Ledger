import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../db/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined) // undefined = cargando

    useEffect(() => {
        // Sesión actual
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null)
        })
        // Escucha cambios (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}