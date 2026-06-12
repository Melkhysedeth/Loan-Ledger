import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { supabase } from '../db/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    async function handleLogin() {
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError('Correo o contraseña incorrectos')
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                {/* Logo / título */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)' }}>
                        <CreditCard size={28} color="white" strokeWidth={2} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">LoanLedger</h1>
                    <p className="text-sm text-gray-500 mt-1">Inicia sesión para continuar</p>
                </div>

                {/* Form */}
                <div className="space-y-3">
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <button
                        onClick={handleLogin}
                        disabled={loading || !email || !password}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </div>
            </div>
        </div>
    )
}