import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcInterest } from '../utils/loanCalc'
import { ChevronLeft, CreditCard, AlertTriangle } from 'lucide-react'

const ELIGIBLE_STATUSES = ['active', 'frozen', 'overdue', 'agreement']

export default function UnifyLoans() {
    const { id } = useParams() // client id
    const navigate = useNavigate()

    const [client, setClient] = useState(null)
    const [loans, setLoans] = useState([])
    const [paymentsByLoan, setPaymentsByLoan] = useState({})
    const [selected, setSelected] = useState(new Set())
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [interestType, setInterestType] = useState('fixed')

    const [interestRate, setInterestRate] = useState('')
    const [frequency, setFrequency] = useState('mensual')
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
    const [firstPaymentDate, setFirstPaymentDate] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => { load() }, [id])

    async function load() {
        setLoading(true)
        const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
        const { data: l } = await supabase
            .from('loans')
            .select('*')
            .eq('client_id', id)
            .in('status', ELIGIBLE_STATUSES)
            .order('created_at', { ascending: false })

        setClient(c)
        setLoans(l || [])

        if (l && l.length > 0) {
            const { data: p } = await supabase
                .from('payments')
                .select('*')
                .in('loan_id', l.map(loan => loan.id))
                .eq('voided', false)

            const grouped = {}
            for (const pay of (p || [])) {
                if (!grouped[pay.loan_id]) grouped[pay.loan_id] = []
                grouped[pay.loan_id].push(pay)
            }
            setPaymentsByLoan(grouped)
        }

        setLoading(false)
    }

    function toggle(loanId) {
        const next = new Set(selected)
        next.has(loanId) ? next.delete(loanId) : next.add(loanId)
        setSelected(next)

        const selectedLoans = loans.filter(l => next.has(l.id))
        if (selectedLoans.length > 0) {
            const rates = new Set(selectedLoans.map(l => l.interest_rate))
            if (rates.size === 1) setInterestRate(String([...rates][0]))

            const types = new Set(selectedLoans.map(l => l.interest_type))
            if (types.size === 1) setInterestType([...types][0])
        }
    }

    const selectedLoans = loans.filter(l => selected.has(l.id))
    const totalAmount = selectedLoans.reduce((s, l) => s + (l.amount || 0), 0)
    const allPaymentIds = selectedLoans.flatMap(l => (paymentsByLoan[l.id] || []).map(p => p.id))
    const totalCapitalHeredado = selectedLoans.reduce((s, l) => {
        const pays = paymentsByLoan[l.id] || []
        return s + pays.reduce((sum, p) => sum + (p.capital_paid || 0), 0)
    }, 0)
    const totalInterestHeredado = selectedLoans.reduce((s, l) => {
        const pays = paymentsByLoan[l.id] || []
        return s + pays.reduce((sum, p) => sum + (p.interest_paid || 0), 0)
    }, 0)
    const saldoPendienteNuevo = totalAmount - totalCapitalHeredado

    const totalPagosAMigrar = selectedLoans.reduce((s, l) => {
        return s + (paymentsByLoan[l.id] || []).length
    }, 0)

    async function handleSubmit() {
        setError('')

        if (selectedLoans.length < 2) {
            setError('Selecciona al menos 2 préstamos para unificar')
            return
        }
        if (!interestRate || !frequency) {
            setError('Completa la tasa de interés y frecuencia')
            return
        }

        setSaving(true)

        const rate = parseFloat(interestRate)
        const interestAmount = calcInterest(totalAmount, rate, frequency)

        const originNote = `Unificación de ${selectedLoans.length} préstamos: ` +
            selectedLoans.map(l => formatCOP(l.amount)).join(' + ') +
            ` = ${formatCOP(totalAmount)}` +
            (notes ? `. ${notes}` : '')

        // 1. Crear el préstamo unificado
        const { data: newLoan, error: loanError } = await supabase
            .from('loans')
            .insert({
                client_id: id,
                amount: totalAmount,
                interest_rate: rate,
                interest_amount: interestAmount,
                interest_type: interestType,   // 👈 nuevo
                frequency,
                start_date: startDate,
                first_payment_date: firstPaymentDate || null,
                status: 'active',
                notes: originNote,
                initial_capital_paid: 0,
                initial_interest_paid: 0,
                is_unification: true,                          // 👈 nuevo
            })
            .select()
            .single()

        if (loanError) {
            setError('Error creando el préstamo unificado: ' + loanError.message)
            setSaving(false)
            return
        }

        // ─── MIGRAR PAGOS AL NUEVO PRÉSTAMO ───
        if (allPaymentIds.length > 0) {
            // Actualizar cada préstamo seleccionado para migrar sus pagos
            for (const loan of selectedLoans) {
                const pays = paymentsByLoan[loan.id] || []
                if (pays.length === 0) continue

                const { error: paymentError } = await supabase
                    .from('payments')
                    .update({
                        loan_id: newLoan.id,
                        original_loan_id: loan.id
                    })
                    .in('id', pays.map(p => p.id))

                if (paymentError) {
                    setError('Error migrando pagos: ' + paymentError.message)
                    setSaving(false)
                    return
                }
            }
        }

        // 3. Marcar los préstamos viejos como unificados
        const { error: updateError } = await supabase
            .from('loans')
            .update({ status: 'unified', unified_into: newLoan.id })
            .in('id', selectedLoans.map(l => l.id))

        if (updateError) {
            setError('El préstamo se creó pero no se pudieron cerrar los préstamos viejos: ' + updateError.message)
            setSaving(false)
            return
        }

        navigate(`/clients/${id}/detail`)
    }

    if (loading) return <div className="p-6 text-gray-400">Cargando...</div>

    return (
        <div className="pb-10 min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="px-4 pt-6 pb-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-transparent"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">Unificar préstamos</h1>
            </div>

            <div className="mx-4 mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Selecciona los préstamos activos de <strong>{client?.name}</strong> que quieres unificar:
                </p>

                {loans.length < 2 ? (
                    <p className="text-sm text-gray-400 py-4">Este cliente no tiene suficientes préstamos activos para unificar.</p>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-transparent">
                        {loans.map((loan, i) => {
                            const pays = paymentsByLoan[loan.id] || []
                            const capPagado = pays.reduce((s, p) => s + (p.capital_paid || 0), 0)
                            return (
                                <label
                                    key={loan.id}
                                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer ${i < loans.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(loan.id)}
                                        onChange={() => toggle(loan.id)}
                                        className="w-4 h-4"
                                    />
                                    <CreditCard size={16} className="text-gray-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {formatCOP(loan.amount)} · {loan.interest_rate}%
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Capital pagado: {formatCOP(capPagado)}
                                        </p>
                                    </div>
                                </label>
                            )
                        })}
                    </div>
                )}
            </div>

            {selectedLoans.length >= 2 && (
                <>
                    <div className="mx-4 mb-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800/40">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">Resumen del préstamo unificado</p>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between"><span className="text-gray-500">Monto total</span><span className="font-medium">{formatCOP(totalAmount)}</span></div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Pagos a migrar</span>
                                <span className="font-medium">{totalPagosAMigrar} pagos</span>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-500">Capital ya pagado (heredado)</span><span className="font-medium">{formatCOP(totalCapitalHeredado)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Interés ya pagado (heredado)</span><span className="font-medium">{formatCOP(totalInterestHeredado)}</span></div>
                            <div className="flex justify-between border-t border-purple-200 dark:border-purple-700/40 pt-1 mt-1"><span className="text-gray-700 dark:text-gray-300 font-semibold">Saldo pendiente nuevo</span><span className="font-bold">{formatCOP(saldoPendienteNuevo)}</span></div>
                        </div>
                    </div>

                    <div className="mx-4 space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">Tasa de interés (%)</label>
                            <input
                                type="number"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Tipo de interés</label>
                            <select
                                value={interestType}
                                onChange={e => setInterestType(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="fixed">Fijo</option>
                                <option value="variable">Variable</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Frecuencia</label>
                            <select
                                value={frequency}
                                onChange={e => setFrequency(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="quincenal">Quincenal</option>
                                <option value="mensual">Mensual</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Fecha de inicio</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Fecha de primer pago</label>
                            <input
                                type="date"
                                value={firstPaymentDate}
                                onChange={e => setFirstPaymentDate(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Nota adicional (opcional)</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                rows={2}
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full bg-purple-600 rounded-2xl py-3 text-white text-sm font-medium active:scale-95 transition disabled:opacity-50"
                        >
                            {saving ? 'Unificando...' : `Unificar ${selectedLoans.length} préstamos en uno solo`}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}