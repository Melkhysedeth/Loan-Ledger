import { useState, useEffect } from 'react'
import { supabase } from '../db/supabase'
import { formatCOP, parseCOP } from '../utils/format'
import { calcInterest } from '../utils/loanCalc'
import { useFormPersist } from '../hooks/useFormPersist'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { METHODS } from '../constants/paymentMethods'
import { useWalletBalances } from '../hooks/useWalletBalances'
import PageHero, { HeroOverlap } from '../components/ui/PageHero'
import ConfirmWhatsAppModal from '../components/ConfirmWhatsAppModal'
import { mensajeDesembolso } from '../utils/whatsappMessages'

const initialLoan = {
    amount: '', rate: '', frequency: 'mensual',
    startDate: '', firstPaymentDate: '', notes: '',
    interestType: 'fixed',
}

// Estado del cliente seleccionado también se persiste por separado
// porque es un objeto, no un campo de texto
const SELECTED_CLIENT_KEY = 'new-loan-client'

export default function NewLoan() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const editLoan = location.state?.editLoan || null
    const isEditing = !!editLoan

    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searched, setSearched] = useState(false)
    const [selectedClient, setSelectedClient] = useState(null)
    const [loan, setLoan] = useState(initialLoan)
    const [saving, setSaving] = useState(false)
    const [methodAmounts, setMethodAmounts] = useState({ efectivo: '', nequi: '', breb: '' })
    // Saldo de cada billetera para no desembolsar más de lo que hay (no aplica al editar)
    const { balances, refresh: refreshBalances } = useWalletBalances(!isEditing)

    // Modal de confirmación de envío de WhatsApp tras desembolsar
    const [waModal, setWaModal] = useState({ open: false, phone: '', message: '' })

    const amount = parseCOP(loan.amount)
    const rate = parseFloat(loan.rate) || 0
    // No hay cuotas fijas: el interés se genera cada período mientras haya capital pendiente.
    const interestPerPeriod = amount && rate ? calcInterest(amount, rate, loan.frequency) : null

    // Persistir campos del préstamo
    const { clearPersisted: clearLoanForm } = useFormPersist(
        'new-loan-form',
        loan,
        setLoan,
        { empty: initialLoan, skip: isEditing }
    )

    // Restaurar cliente seleccionado desde sessionStorage (solo si NO estamos editando)
    useEffect(() => {
        if (isEditing) return
        try {
            const saved = sessionStorage.getItem(SELECTED_CLIENT_KEY)
            if (saved) setSelectedClient(JSON.parse(saved))
        } catch { /* noop */ }
    }, [])

    // Precargar formulario si venimos en modo edición
    useEffect(() => {
        if (!editLoan) return

        setLoan({
            amount: editLoan.amount ? formatCOP(editLoan.amount) : '',
            rate: editLoan.interest_rate?.toString() || '',
            frequency: editLoan.frequency || 'mensual',
            startDate: editLoan.start_date || '',
            firstPaymentDate: editLoan.first_payment_date || '',
            notes: editLoan.notes || '',
            interestType: editLoan.interest_type || 'fixed',
        })

        supabase.from('loan_disbursements').select('*').eq('loan_id', editLoan.id)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    const amounts = { efectivo: '', nequi: '', breb: '' }
                    data.forEach(d => { amounts[d.payment_method] = formatCOP(d.amount) })
                    setMethodAmounts(amounts)
                } else if (editLoan.payment_method) {
                    // préstamos viejos que solo tenían el campo simple
                    setMethodAmounts({ efectivo: '', nequi: '', breb: '', [editLoan.payment_method]: formatCOP(editLoan.amount) })
                }
            })

        // El préstamo trae client_id, pero no el objeto cliente completo —
        // lo traemos para poder mostrarlo en la sección "Cliente"
        supabase.from('clients').select('*').eq('id', editLoan.client_id).single()
            .then(({ data }) => {
                if (data) setSelectedClient(data)
            })
    }, [editLoan])

    // Preseleccionar cliente si viene de ClientDetail o NewClient
    useEffect(() => {
        const clientId = searchParams.get('clientId')
        if (clientId) {
            supabase.from('clients').select('*').eq('id', clientId).single()
                .then(({ data }) => {
                    if (data) {
                        setSelectedClient(data)
                        try { sessionStorage.setItem(SELECTED_CLIENT_KEY, JSON.stringify(data)) } catch { /* noop */ }
                    }
                })
        }
    }, [])

    // Búsqueda con debounce
    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); setSearched(false); return }
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('clients')
                .select('*')
                .or(`name.ilike.%${query}%,cedula.ilike.%${query}%`)
                .limit(10)
            setResults(data || [])
            setSearched(true)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    function selectClient(client) {
        setSelectedClient(client)
        try { sessionStorage.setItem(SELECTED_CLIENT_KEY, JSON.stringify(client)) } catch { /* noop */ }
        setQuery('')
        setResults([])
        setSearched(false)
    }

    function clearClient() {
        setSelectedClient(null)
        try { sessionStorage.removeItem(SELECTED_CLIENT_KEY) } catch { /* noop */ }
        setLoan(initialLoan)
        clearLoanForm()
    }

    function handleLoanChange(e) {
        setLoan({ ...loan, [e.target.name]: e.target.value })
    }

    function handleAmountChange(e) {
        const raw = parseCOP(e.target.value)
        setLoan({ ...loan, amount: raw ? formatCOP(raw) : '' })
    }

    function clearAll() {
        clearLoanForm()
        try { sessionStorage.removeItem(SELECTED_CLIENT_KEY) } catch { /* noop */ }
    }

    // Se llama al cerrar el modal de WhatsApp (haya enviado o no) — es el
    // punto en el que sí navegamos y limpiamos el formulario.
    function finishAndExit() {
        setWaModal({ open: false, phone: '', message: '' })
        clearAll()
        navigate('/loans')
    }

    async function handleSubmit() {
        if (!selectedClient) { alert('Selecciona un cliente.'); return }
        if (!loan.amount || !loan.rate || !loan.startDate) {
            alert('Completa los campos obligatorios del préstamo.')
            return
        }

        let activeMethods = []
        if (!isEditing) {
            activeMethods = Object.entries(methodAmounts)
                .map(([m, v]) => [m, parseCOP(v) || 0])
                .filter(([, v]) => v > 0)
            const sumMethods = activeMethods.reduce((s, [, v]) => s + v, 0)
            if (sumMethods !== amount) {
                alert('Los métodos de desembolso no suman el monto del préstamo.')
                return
            }

            // Se recalculan los saldos justo ahora, por si cambiaron desde que se abrió la pantalla.
            const fresh = await refreshBalances()
            if (!fresh) {
                if (!confirm('No se pudieron verificar los saldos de las billeteras. ¿Guardar de todos modos?')) return
            } else {
                const over = activeMethods.filter(([m, v]) => fresh[m]?.tracked && v > fresh[m].balance)
                if (over.length > 0) {
                    const label = (m) => METHODS.find(x => x.id === m)?.label || m
                    const lines = over.map(([m, v]) => `${label(m)}: desembolsas ${formatCOP(v)} y hay ${formatCOP(fresh[m].balance)}`)
                    alert('Saldo insuficiente:\n' + lines.join('\n'))
                    return
                }
            }
        }

        setSaving(true)
        try {
            const isSingle = activeMethods.length === 1
            const payload = {
                client_id: selectedClient.id,
                interest_type: loan.interestType,
                amount,
                interest_rate: rate,
                interest_amount: calcInterest(amount, rate, loan.frequency),
                frequency: loan.frequency,
                start_date: loan.startDate,
                first_payment_date: loan.firstPaymentDate || null,
                notes: loan.notes,
                ...(!isEditing && { payment_method: isSingle ? activeMethods[0][0] : null }),
            }

            if (isEditing) {
                const { error } = await supabase.from('loans').update(payload).eq('id', editLoan.id)
                if (error) { alert(`No se pudo guardar el préstamo: ${error.message}`); return }
                // No se toca loan_disbursements: el desembolso ya ocurrió y no se vuelve a pedir.
                // Tampoco se ofrece WhatsApp: una edición no es un nuevo desembolso.
                clearAll()
                navigate('/loans')
                return
            }

            const { data, error } = await supabase.from('loans').insert({ ...payload, status: 'active' }).select().single()
            if (error || !data) { alert(`No se pudo guardar el préstamo: ${error?.message || 'error desconocido'}`); return }

            const disbursementRows = activeMethods.map(([m, amt]) => ({
                loan_id: data.id, payment_method: m, amount: amt,
            }))
            const { error: disbError } = await supabase.from('loan_disbursements').insert(disbursementRows)
            if (disbError) {
                // Sin desembolso registrado las cuentas por método quedarían mal: se deshace el préstamo.
                await supabase.from('loans').delete().eq('id', data.id)
                alert(`No se pudo registrar el desembolso, el préstamo no se guardó: ${disbError.message}`)
                return
            }

            // Préstamo nuevo desembolsado: ofrecemos enviar el WhatsApp.
            // El envío real solo ocurre si el usuario da clic en "Enviar" dentro del modal.
            const message = mensajeDesembolso({ client: selectedClient, loan: { ...payload, amount } })
            setWaModal({ open: true, phone: selectedClient.phone, message })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            <PageHero
                title={isEditing ? 'Editar préstamo' : 'Nuevo préstamo'}
                subtitle={isEditing ? 'Actualiza las condiciones del préstamo' : 'Selecciona el cliente y define las condiciones'}
                onBack={() => navigate(-1)}
            />

            <HeroOverlap>
            {/* CLIENTE */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
                <h2 className="font-semibold text-gray-500 dark:text-gray-400 mb-3 text-sm uppercase tracking-wide">Cliente</h2>

                {selectedClient ? (
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2">
                        <div>
                            <p className="font-semibold text-blue-800 dark:text-blue-300">{selectedClient.name}</p>
                            {selectedClient.cedula && <p className="text-xs text-blue-500">CC {selectedClient.cedula}</p>}
                        </div>
                        <button onClick={clearClient} className="text-blue-400 hover:text-blue-600 text-xl leading-none ml-3">×</button>
                    </div>
                ) : (
                    <div>
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar por nombre o cédula..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {results.length > 0 && (
                            <ul className="mt-2 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                                {results.map(c => (
                                    <li key={c.id}>
                                        <button onClick={() => selectClient(c)} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition text-sm">
                                            <span className="font-medium text-gray-800 dark:text-gray-100">{c.name}</span>
                                            {c.cedula && <span className="text-gray-400 ml-2 text-xs">CC {c.cedula}</span>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {searched && results.length === 0 && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-400 mb-2">Sin resultados para "{query}"</p>
                                <button
                                    onClick={() => navigate('/clients/new?from=loan')}
                                    className="text-sm text-blue-400 underline"
                                >
                                    + Crear nuevo cliente
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>
            </HeroOverlap>

            <div className="px-4 mt-4">
            {/* PRÉSTAMO */}
            {selectedClient && (
                <>
                    <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
                        <h2 className="font-semibold text-gray-500 dark:text-gray-400 mb-3 text-sm uppercase tracking-wide">Datos del Préstamo</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Monto prestado *</label>
                                <input
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={loan.amount} onChange={handleAmountChange} placeholder="$ 0" inputMode="numeric"
                                />
                            </div>
                            <Field label="Tasa de interés % *" name="rate" value={loan.rate} onChange={handleLoanChange} placeholder="Ej: 10" type="number" />
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Tipo de interés</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setLoan({ ...loan, interestType: 'fixed' })}
                                        className={`py-2 rounded-xl text-sm font-medium border transition ${loan.interestType === 'fixed'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        Interés fijo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoan({ ...loan, interestType: 'variable' })}
                                        className={`py-2 rounded-xl text-sm font-medium border transition ${loan.interestType === 'variable'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        Interés variable
                                    </button>
                                </div>
                            </div>
                            <div>
                                {!isEditing && (
                                    <div>
                                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Método de desembolso</label>
                                        <p className="text-xs text-gray-400 mb-2">Si el préstamo salió de varios métodos, escribe cuánto por cada uno.</p>
                                        <div className="space-y-2.5">
                                            {METHODS.map(m => {
                                                const wallet = balances?.[m.id]
                                                const assigned = parseCOP(methodAmounts[m.id]) || 0
                                                const exceeds = !!wallet?.tracked && assigned > wallet.balance
                                                const othersAssigned = Object.entries(methodAmounts)
                                                    .reduce((sum, [k, v]) => (k === m.id ? sum : sum + (parseCOP(v) || 0)), 0)
                                                // Sugerencia: lo que falta por asignar, sin pasar del saldo de esta billetera
                                                const suggestion = Math.max(0, Math.min(
                                                    wallet?.tracked ? wallet.balance : Infinity,
                                                    amount - othersAssigned,
                                                ))
                                                return (
                                                    <div key={m.id}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 shrink-0">
                                                                {m.icon}
                                                            </div>
                                                            <div className="w-24 shrink-0">
                                                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-tight">{m.label}</p>
                                                                <p className={`text-[11px] leading-tight ${exceeds ? 'text-red-500' : 'text-gray-400'}`}>
                                                                    {!balances
                                                                        ? 'Cargando saldo...'
                                                                        : wallet.tracked
                                                                            ? `Disp. ${formatCOP(wallet.balance)}`
                                                                            : 'Sin saldo registrado'}
                                                                </p>
                                                            </div>
                                                            <input
                                                                className={`flex-1 min-w-0 border bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${exceeds ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'}`}
                                                                placeholder="$ 0"
                                                                inputMode="numeric"
                                                                value={methodAmounts[m.id]}
                                                                onChange={(e) => {
                                                                    const raw = parseCOP(e.target.value)
                                                                    setMethodAmounts({ ...methodAmounts, [m.id]: raw ? formatCOP(raw) : '' })
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={suggestion <= 0 || suggestion === assigned}
                                                                onClick={() => setMethodAmounts({ ...methodAmounts, [m.id]: formatCOP(suggestion) })}
                                                                className="text-xs font-semibold px-2.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 disabled:opacity-40 active:scale-95 transition shrink-0"
                                                            >
                                                                Usar
                                                            </button>
                                                        </div>
                                                        {exceeds && (
                                                            <p className="text-xs text-red-500 mt-1 ml-12">
                                                                Excede el saldo de {m.label} por {formatCOP(assigned - wallet.balance)}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {(() => {
                                            const sum = Object.values(methodAmounts).reduce((s, v) => s + (parseCOP(v) || 0), 0)
                                            const diff = amount - sum
                                            if (sum === 0) return null
                                            return (
                                                <p className={`text-xs mt-2 text-right ${diff === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {diff === 0 ? 'Cuadra con el monto ✓' : `Faltan ${formatCOP(Math.abs(diff))} por asignar`}
                                                </p>
                                            )
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Frecuencia de pago</label>
                                <select name="frequency" value={loan.frequency} onChange={handleLoanChange}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="mensual">Mensual</option>
                                    <option value="quincenal">Quincenal</option>
                                </select>
                            </div>
                            <Field label="Fecha del préstamo *" name="startDate" value={loan.startDate} onChange={handleLoanChange} type="date" />
                            <Field label="Fecha del primer pago" name="firstPaymentDate" value={loan.firstPaymentDate} onChange={handleLoanChange} type="date" />
                            <Field label="Notas del préstamo" name="notes" value={loan.notes} onChange={handleLoanChange} placeholder="Condiciones especiales..." textarea />
                        </div>
                    </section>

                    {interestPerPeriod !== null && (
                        <section className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4 border border-blue-200 dark:border-blue-800/40">
                            <h2 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Resumen</h2>
                            <div className="space-y-1 text-sm">
                                <Row label="Capital prestado" value={formatCOP(amount)} />
                                <Row
                                    label={`Interés por período (${loan.frequency})`}
                                    value={formatCOP(interestPerPeriod)}
                                    bold
                                />
                            </div>
                            <p className="text-xs text-blue-600/70 dark:text-blue-300/60 mt-2">
                                {loan.interestType === 'variable'
                                    ? 'El interés se recalcula sobre el saldo pendiente en cada período.'
                                    : 'El interés se sigue generando cada período hasta que se pague el capital.'}
                            </p>
                        </section>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl shadow active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Guardar Préstamo')}
                    </button>
                </>
            )}
            </div>

            <ConfirmWhatsAppModal
                open={waModal.open}
                phone={waModal.phone}
                message={waModal.message}
                onClose={finishAndExit}
            />
        </div>
    )
}

function Field({ label, name, value, onChange, placeholder, type = 'text', textarea }) {
    const cls = "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
    return (
        <div>
            <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
            {textarea
                ? <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} className={cls} rows={2} />
                : <input name={name} value={value} onChange={onChange} placeholder={placeholder} type={type} className={cls}
                    inputMode={type === 'number' ? 'numeric' : undefined} />
            }
        </div>
    )
}

function Row({ label, value, bold }) {
    return (
        <div className={`flex justify-between ${bold ? 'font-bold text-blue-600 dark:text-blue-400 text-base mt-2 pt-2 border-t border-blue-200 dark:border-blue-800' : 'text-gray-600 dark:text-gray-300'}`}>
            <span>{label}</span><span>{value}</span>
        </div>
    )
}