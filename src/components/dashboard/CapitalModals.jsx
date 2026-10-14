import { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'
import { supabase } from '../../db/supabase'
import { formatCOP, parseCOP } from '../../utils/format'
import { METHODS, getMethodIcon } from '../../constants/paymentMethods'

export function WithdrawCapitalModal({ wallets, onClose, onDone }) {
    const [methodAmounts, setMethodAmounts] = useState({ efectivo: '', nequi: '', breb: '' })
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const total = Object.values(methodAmounts).reduce((s, v) => s + (parseCOP(v) || 0), 0)

    async function handleSave() {
        const activeMethods = Object.entries(methodAmounts)
            .map(([m, v]) => [m, parseCOP(v) || 0])
            .filter(([, v]) => v > 0)

        if (activeMethods.length === 0) return

        // No se puede retirar más de lo que hay en cada billetera.
        const over = activeMethods.filter(([m, v]) => wallets?.[m]?.tracked && v > wallets[m].balance)
        if (over.length > 0) {
            const label = (m) => METHODS.find(x => x.id === m)?.label || m
            const detail = over.map(([m, v]) => `${label(m)}: retiras ${formatCOP(v)} y hay ${formatCOP(wallets[m].balance)}`)
            alert('Saldo insuficiente:\n' + detail.join('\n'))
            return
        }

        setSaving(true)
        const rows = activeMethods.map(([m, amt]) => ({
            amount: amt,
            notes: notes.trim() || null,
            payment_method: m,
        }))
        const { error } = await supabase.from('capital_withdrawals').insert(rows)
        if (error) {
            console.error('Error al registrar retiro de capital:', error)
            alert('No se pudo registrar el retiro: ' + error.message)
            setSaving(false)
            return
        }
        onDone()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Retirar capital</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-xs text-red-500 dark:text-red-300">
                        Este dinero se resta del capital prestable del negocio. No es un préstamo ni una ganancia.
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">¿De dónde sale el dinero?</label>
                        <div className="space-y-2">
                            {METHODS.map(m => {
                                const wallet = wallets?.[m.id]
                                const exceeds = !!wallet?.tracked && (parseCOP(methodAmounts[m.id]) || 0) > wallet.balance
                                return (
                                <div key={m.id}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 shrink-0">
                                        {m.icon}
                                    </div>
                                    <div className="w-24 shrink-0">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-tight">{m.label}</p>
                                        <p className={`text-[11px] leading-tight ${exceeds ? 'text-red-500' : 'text-gray-400'}`}>
                                            {wallet?.tracked ? `Disp. ${formatCOP(wallet.balance)}` : 'Sin saldo registrado'}
                                        </p>
                                    </div>
                                    <input
                                        className={`flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 border rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 ${exceeds ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                                        placeholder="$ 0"
                                        inputMode="numeric"
                                        value={methodAmounts[m.id]}
                                        onChange={(e) => {
                                            const raw = parseCOP(e.target.value)
                                            setMethodAmounts({ ...methodAmounts, [m.id]: raw ? formatCOP(raw) : '' })
                                        }}
                                    />
                                </div>
                                {exceeds && (
                                    <p className="text-xs text-red-500 mt-1 ml-12">
                                        Excede el saldo de {m.label} por {formatCOP((parseCOP(methodAmounts[m.id]) || 0) - wallet.balance)}
                                    </p>
                                )}
                                </div>
                                )
                            })}
                        </div>
                        {total > 0 && (
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                Total a retirar: <span className="font-semibold text-red-500">{formatCOP(total)}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Nota (opcional)</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Retiro personal, gasto del negocio..."
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || total === 0}
                        className="w-full bg-red-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Confirmar retiro'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function InjectCapitalModal({ onClose, onDone }) {
    const [methodAmounts, setMethodAmounts] = useState({ efectivo: '', nequi: '', breb: '' })
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const total = Object.values(methodAmounts).reduce((s, v) => s + (parseCOP(v) || 0), 0)

    async function handleSave() {
        const activeMethods = Object.entries(methodAmounts)
            .map(([m, v]) => [m, parseCOP(v) || 0])
            .filter(([, v]) => v > 0)

        if (activeMethods.length === 0) return

        setSaving(true)
        const rows = activeMethods.map(([m, amt]) => ({
            amount: amt,
            notes: notes.trim() || null,
            payment_method: m,
        }))
        const { error } = await supabase.from('capital_injections').insert(rows)
        if (error) {
            console.error('Error al registrar inyección de capital:', error)
            alert('No se pudo registrar la inyección: ' + error.message)
            setSaving(false)
            return
        }
        onDone()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Inyectar capital</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-3 py-2 text-xs text-green-600 dark:text-green-300">
                        Este dinero aumenta el capital disponible para prestar.
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">¿A dónde entra el dinero?</label>
                        <div className="space-y-2">
                            {METHODS.map(m => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 shrink-0">
                                        {m.icon}
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 w-16 shrink-0">{m.label}</span>
                                    <input
                                        className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="$ 0"
                                        inputMode="numeric"
                                        value={methodAmounts[m.id]}
                                        onChange={(e) => {
                                            const raw = parseCOP(e.target.value)
                                            setMethodAmounts({ ...methodAmounts, [m.id]: raw ? formatCOP(raw) : '' })
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        {total > 0 && (
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                Total a inyectar: <span className="font-semibold text-green-600">{formatCOP(total)}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Nota (opcional)</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Ahorro personal, préstamo de un tercero..."
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || total === 0}
                        className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Confirmar inyección'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function CapitalBreakdownModal({ breakdown, total, onClose, onTransfer }) {
    const METHOD_INFO = {
        efectivo: { label: 'Efectivo', color: 'bg-green-50 dark:bg-green-950/40 text-green-600' },
        nequi: { label: 'Nequi', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600' },
        breb: { label: 'Bre-B', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' },
    }

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-28 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Disponible por método</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="space-y-3">
                    {Object.entries(METHOD_INFO).map(([key, info]) => (
                        <div key={key} className={`${info.color} rounded-2xl p-4 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                {getMethodIcon(key)}
                                <span className="font-medium">{info.label}</span>
                            </div>
                            <span className="font-bold text-lg">{formatCOP(breakdown[key] || 0)}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 mt-4 pt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total disponible</span>
                    <span className="font-bold text-xl text-gray-800 dark:text-white">{formatCOP(total)}</span>
                </div>

                <button
                    onClick={onTransfer}
                    className="w-full mt-5 bg-blue-600 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition"
                >
                    <ArrowRightLeft size={18} />
                    Trasladar saldo entre métodos
                </button>
            </div>
        </div>
    )
}

export function TransferCapitalModal({ breakdown, onClose, onDone }) {
    const METHOD_INFO = {
        efectivo: { label: 'Efectivo' },
        nequi: { label: 'Nequi' },
        breb: { label: 'Bre-B' },
    }
    const [from, setFrom] = useState('nequi')
    const [to, setTo] = useState('efectivo')
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const amountValue = parseCOP(amount) || 0
    const availableInFrom = breakdown[from] || 0
    const exceedsBalance = amountValue > availableInFrom
    const sameMethod = from === to

    async function handleSave() {
        if (amountValue <= 0 || sameMethod || exceedsBalance) return
        setSaving(true)

        const fromLabel = METHOD_INFO[from].label
        const toLabel = METHOD_INFO[to].label
        const noteSuffix = notes.trim() ? ` — ${notes.trim()}` : ''

        const { data: withdrawal, error: err1 } = await supabase.from('capital_withdrawals').insert([{
            amount: amountValue,
            payment_method: from,
            notes: `Traslado a ${toLabel}${noteSuffix}`,
            is_transfer: true,
        }]).select().single()
        if (err1) {
            console.error('Error al trasladar (retiro):', err1)
            alert('No se pudo registrar el traslado: ' + err1.message)
            setSaving(false)
            return
        }

        const { error: err2 } = await supabase.from('capital_injections').insert([{
            amount: amountValue,
            payment_method: to,
            notes: `Traslado desde ${fromLabel}${noteSuffix}`,
            is_transfer: true,
        }])
        if (err2) {
            console.error('Error al trasladar (inyección):', err2)
            // Se deshace el retiro para que el dinero no quede "desaparecido" entre billeteras.
            await supabase.from('capital_withdrawals').delete().eq('id', withdrawal.id)
            alert('No se pudo completar el traslado, no se movió nada: ' + err2.message)
            setSaving(false)
            return
        }

        onDone()
    }

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Trasladar saldo</h2>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-3 py-2 text-xs text-blue-600 dark:text-blue-300">
                        Mueve saldo disponible de un método a otro. El total disponible no cambia.
                    </div>

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Desde</label>
                        <select
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                        >
                            {Object.entries(METHOD_INFO).map(([key, info]) => (
                                <option key={key} value={key}>{info.label} — {formatCOP(breakdown[key] || 0)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-center">
                        <ArrowRightLeft size={18} className="text-gray-400 rotate-90" />
                    </div>

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Hacia</label>
                        <select
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                        >
                            {Object.entries(METHOD_INFO).map(([key, info]) => (
                                <option key={key} value={key}>{info.label}</option>
                            ))}
                        </select>
                        {sameMethod && (
                            <p className="text-xs text-red-500 mt-1">El origen y el destino no pueden ser el mismo</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm text-gray-500 dark:text-gray-400 block">Monto a trasladar</label>
                            <button
                                type="button"
                                onClick={() => setAmount(availableInFrom > 0 ? formatCOP(availableInFrom) : '')}
                                disabled={availableInFrom <= 0}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Trasladar todo
                            </button>
                        </div>
                        <input
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="$ 0"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => {
                                const raw = parseCOP(e.target.value)
                                setAmount(raw ? formatCOP(raw) : '')
                            }}
                        />
                        {exceedsBalance && (
                            <p className="text-xs text-red-500 mt-1">
                                No hay suficiente saldo en {METHOD_INFO[from].label} (disponible: {formatCOP(availableInFrom)})
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Nota (opcional)</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Me pagaron en efectivo y transferí por Nequi"
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || amountValue === 0 || sameMethod || exceedsBalance}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Trasladando...' : 'Confirmar traslado'}
                    </button>
                </div>
            </div>
        </div>
    )
}
