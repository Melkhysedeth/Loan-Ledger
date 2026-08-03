import { useState } from 'react'
import { CreditCard, X } from 'lucide-react'
import { supabase } from '../db/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showReset, setShowReset] = useState(false)

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

                    <div className="text-right">
                        <button
                            onClick={() => setShowReset(true)}
                            className="text-sm text-blue-600 font-medium"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

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

            {showReset && (
                <ForgotPasswordModal onClose={() => setShowReset(false)} />
            )}
        </div>
    )
}

function ForgotPasswordModal({ onClose }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState(null)

    async function handleSend() {
        if (!email) return
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) {
            setError('No se pudo enviar el correo. Verifica el email e intenta de nuevo.')
        } else {
            setSent(true)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 text-lg">Recuperar contraseña</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {sent ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-600">
                            Te enviamos un correo a <span className="font-semibold">{email}</span> con
                            un enlace para restablecer tu contraseña.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition mt-5"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500">
                            Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </p>
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <button
                            onClick={handleSend}
                            disabled={loading || !email}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}