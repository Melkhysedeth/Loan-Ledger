import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP, parseCOP } from '../utils/format'
import { calcNextPaymentDate, calcVariableInterest, calcMora } from '../utils/loanCalc'
import { ChevronLeft, Calendar, DollarSign, CheckCircle } from 'lucide-react'

const METHODS = [
    {
        id: 'efectivo',
        label: 'Efectivo',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M6 12h.01M18 12h.01" />
            </svg>
        ),
    },
    {
        id: 'nequi',
        label: 'Nequi',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                <path d="M8 12l3 3 5-5" />
            </svg>
        ),
    },
    {
        id: 'breb',
        label: 'Bre-B',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
        ),
    },
]

export default function PaymentScreen() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [loan, setLoan] = useState(null)
    const [client, setClient] = useState(null)
    const [payments, setPayments] = useState([])
    const [saving, setSaving] = useState(false)

    const [capital, setCapital] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [method, setMethod] = useState('efectivo')
    const [reference, setReference] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => { load() }, [id])

    async function load() {
        const [{ data: l }, { data: p }] = await Promise.all([
            supabase.from('loans').select('*').eq('id', id).single(),
            supabase.from('payments').select('*').eq('loan_id', id),
        ])
        if (!l) return
        const { data: c } = await supabase.from('clients').select('*').eq('id', l.client_id).single()
        setLoan(l)
        setClient(c)
        setPayments(p || [])
    }

    if (!loan || !client) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
    )

    const totalCapitalPaid = payments.reduce((s, p) => s + (p.capital_paid || 0), 0)
    const totalInterestPaid = payments.reduce((s, p) => s + (p.interest_paid || 0), 0)
    const paymentsMade = payments.length
    const remaining = loan.amount - totalCapitalPaid
    const isVariable = loan.interest_type === 'variable'

    const interest = loan.status === 'agreement'
        ? 0
        : isVariable
            ? calcVariableInterest(loan.amount, totalCapitalPaid, loan.interest_rate, loan.frequency)
            : (loan.interest_amount || 0)

    const mora = calcMora(loan, paymentsMade, totalCapitalPaid)

    const nextPayment = calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)
    const capitalNum = parseCOP(capital) || 0
    const total = interest + capitalNum

    const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    const cuotaLabel = loan.num_payments
        ? `${paymentsMade + 1} de ${loan.num_payments}`
        : `Cuota ${paymentsMade + 1}`

    async function handleSave() {
        if (saving) return
        setSaving(true)
        try {
            await supabase.from('payments').insert({
                loan_id: loan.id,
                date,
                total_paid: total,
                interest_paid: interest,
                capital_paid: capitalNum,
                late: mora.inMora,
                notes: notes || null,
                payment_method: method,
                reference: reference || null,
            })
            navigate(`/loans/${id}`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-10">

            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-1">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:scale-95 transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Registrar pago</h1>
                        <p className="text-xs text-blue-500">Préstamo #{String(id).slice(-4).padStart(4, '0')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">

                {/* Cliente */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{client.name}</p>
                        {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">Saldo pendiente</p>
                        <p className="text-sm font-bold text-amber-500">{formatCOP(remaining)}</p>
                    </div>
                </div>

                {/* Info cuota */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl p-4 grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-[10px] text-blue-400 mb-0.5 flex items-center gap-1">
                            <Calendar size={10} /> Próxima cuota
                        </p>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {nextPayment ? nextPayment.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-400 mb-0.5 flex items-center gap-1">
                            <DollarSign size={10} /> Valor cuota
                        </p>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{formatCOP(interest)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-400 mb-0.5">Cuota</p>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{cuotaLabel}</p>
                    </div>
                </div>

                {/* Banner mora */}
                {mora.inMora && (
                    <div className="border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 rounded-2xl p-4">
                        <p className="text-sm font-bold text-red-500 dark:text-red-400 mb-2">⚠ Cuenta en mora</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-2">
                                <p className="text-[10px] text-gray-400">Días</p>
                                <p className="text-base font-bold text-red-500">{mora.diasMora}</p>
                            </div>
                            <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-2">
                                <p className="text-[10px] text-gray-400">Meses</p>
                                <p className="text-base font-bold text-red-500">
                                    {mora.mesesEnMora % 1 === 0 ? mora.mesesEnMora : mora.mesesEnMora.toFixed(1)}
                                </p>
                            </div>
                            <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-2">
                                <p className="text-[10px] text-gray-400">Debe</p>
                                <p className="text-sm font-bold text-red-500">{formatCOP(mora.valorInteresesDebe)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 1. Monto */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">1. Monto del pago</p>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 mb-1">Interés</p>
                            <p className="text-sm font-bold text-blue-500">{formatCOP(interest)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 mb-1">Capital adicional</p>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                {capitalNum > 0 ? formatCOP(capitalNum) : '—'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 mb-1.5 block">
                            {interest > 0 ? 'Abono a capital (opcional)' : 'Monto a abonar'}
                        </label>
                        <input
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="$ 0"
                            inputMode="numeric"
                            value={capital}
                            onChange={e => {
                                const raw = parseCOP(e.target.value)
                                setCapital(raw ? formatCOP(raw) : '')
                            }}
                        />
                        {capitalNum > 0 && (
                            <p className="text-xs text-gray-400 mt-1.5">
                                Saldo después del pago: <span className="text-amber-500 font-semibold">{formatCOP(remaining - capitalNum)}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* 2. Fecha */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">2. Fecha del pago</p>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>

                {/* 3. Método de pago */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">3. Método de pago</p>
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition active:scale-95 ${method === m.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                    }`}
                            >
                                {m.icon}
                                <span className="text-xs font-medium">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Referencia */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">4. Referencia <span className="text-gray-400 font-normal">(opcional)</span></p>
                    <p className="text-xs text-gray-400 mb-3">Número de comprobante o transacción</p>
                    <input
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Ej: 1234567890"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                    />
                </div>

                {/* 5. Observaciones */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">5. Observaciones <span className="text-gray-400 font-normal">(opcional)</span></p>
                    <textarea
                        rows={3}
                        maxLength={120}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        placeholder="Notas adicionales sobre el pago..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 text-right mt-1">{notes.length}/120</p>
                </div>

                {/* Resumen */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={15} className="text-green-500" />
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">Resumen del pago</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                            <p className="text-[10px] text-gray-400">Interés</p>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCOP(interest)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400">Capital</p>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCOP(capitalNum)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400">Total a recibir</p>
                            <p className="text-base font-bold text-green-600 dark:text-green-400">{formatCOP(total)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400">Método</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">{method === 'breb' ? 'Bre-B' : method.charAt(0).toUpperCase() + method.slice(1)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400">Fecha</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        {capitalNum > 0 && (
                            <div>
                                <p className="text-[10px] text-gray-400">Saldo restante</p>
                                <p className="text-sm font-semibold text-amber-500">{formatCOP(remaining - capitalNum)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botones */}
                <div className="grid grid-cols-2 gap-3 pb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium active:scale-95 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="py-3 rounded-2xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                    >
                        <CheckCircle size={16} />
                        {saving ? 'Guardando...' : 'Registrar pago'}
                    </button>
                </div>
            </div>
        </div>
    )
}