import { useState } from 'react'
import { CreditCard, Mail, Lock, Eye, EyeOff, Check, ShieldCheck, ArrowRight, X } from 'lucide-react'
import { supabase } from '../db/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showReset, setShowReset] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [remember, setRemember] = useState(true)

    async function handleLogin() {
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError('Correo o contraseña incorrectos')
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header con degradado y ondas */}
            <div className="relative overflow-hidden pt-16 pb-20 px-6"
                style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #2563eb 100%)' }}>

                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <svg className="absolute -top-10 -left-16 w-72 h-72 text-white" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M45.3,-58.5C59.5,-49.8,72.1,-36.9,76.6,-21.5C81.1,-6.1,77.5,11.8,69.6,26.9C61.7,42,49.5,54.3,35.1,62.6C20.7,70.9,4.1,75.2,-12.7,74.2C-29.5,73.2,-46.5,66.9,-58.4,55.1C-70.3,43.3,-77.1,26,-78.7,8.1C-80.3,-9.8,-76.7,-28.3,-66.6,-42.1C-56.5,-55.9,-39.9,-65,-23.7,-72C-7.5,-79,8.3,-83.9,22.9,-79.9C37.5,-75.9,45.3,-58.5,45.3,-58.5Z" transform="translate(100 100)" />
                    </svg>
                    <svg className="absolute -bottom-16 -right-10 w-72 h-72 text-white" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M42.8,-54.2C54.5,-45.6,62,-31.4,65.5,-16.2C69,-1,68.5,15.2,61.6,28.5C54.7,41.8,41.4,52.2,26.5,59.1C11.6,66,-4.9,69.4,-20.4,65.8C-35.9,62.2,-50.4,51.6,-59.4,37.6C-68.4,23.6,-71.9,6.2,-69.1,-10.1C-66.3,-26.4,-57.2,-41.6,-44.4,-50.4C-31.6,-59.2,-15.8,-61.6,0.3,-62C16.4,-62.4,31.1,-62.8,42.8,-54.2Z" transform="translate(100 100)" />
                    </svg>
                </div>

                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)' }}>
                        <CreditCard size={28} color="white" strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">LoanLedger</h1>
                    <p className="text-sm text-white/80 mt-1">Gestión inteligente de tu negocio</p>
                </div>
            </div>

            {/* Card blanca */}
            <div className="relative -mt-8 flex-1 bg-white rounded-t-[2rem] px-6 pt-8 pb-10">
                <div className="w-full max-w-sm mx-auto">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Bienvenido nuevamente <span>👋</span>
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 mb-6">Inicia sesión para continuar</p>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-teal-500">
                            <Mail size={18} className="text-teal-600 shrink-0" />
                            <div className="w-px h-6 bg-gray-200 shrink-0" />
                            <input
                                type="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-transparent py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-teal-500">
                            <Lock size={18} className="text-teal-600 shrink-0" />
                            <div className="w-px h-6 bg-gray-200 shrink-0" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Contraseña"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                className="w-full bg-transparent py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="text-gray-400 shrink-0"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <button
                                type="button"
                                onClick={() => setRemember(v => !v)}
                                className="flex items-center gap-2"
                            >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center transition ${remember ? 'bg-teal-500' : 'bg-gray-200'}`}>
                                    {remember && <Check size={13} color="white" strokeWidth={3} />}
                                </span>
                                <span className="text-sm text-gray-600">Recordar sesión</span>
                            </button>

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
                            className="w-full text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #2563eb 100%)' }}
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    Entrar <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-3 mt-8 bg-teal-50 rounded-2xl p-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} className="text-teal-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">Tus datos están protegidos</p>
                            <p className="text-xs text-gray-400">Utilizamos cifrado de extremo a extremo</p>
                        </div>
                    </div>
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