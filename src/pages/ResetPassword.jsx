import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { supabase } from '../db/supabase'

export default function ResetPassword() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    async function handleUpdate() {
        setError(null)
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }
        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
            setError('No se pudo actualizar la contraseña. Intenta solicitar el enlace de nuevo.')
        } else {
            setDone(true)
            setTimeout(() => navigate('/'), 2000)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)' }}>
                        <CreditCard size={28} color="white" strokeWidth={2} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
                    <p className="text-sm text-gray-500 mt-1">Escribe tu nueva contraseña</p>
                </div>

                {done ? (
                    <p className="text-sm text-green-600 text-center">
                        Contraseña actualizada. Redirigiendo...
                    </p>
                ) : (
                    <div className="space-y-3">
                        <input
                            type="password"
                            placeholder="Nueva contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="password"
                            placeholder="Confirmar contraseña"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <button
                            onClick={handleUpdate}
                            disabled={loading || !password || !confirmPassword}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}