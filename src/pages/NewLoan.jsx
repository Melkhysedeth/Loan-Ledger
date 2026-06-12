import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db/db'
import { formatCOP, parseCOP } from '../utils/format'
import { calcInterest, calcTotalLoan } from '../utils/loanCalc'

const initialLoan = {
    amount: '', rate: '', frequency: 'mensual',
    startDate: '', firstPaymentDate: '', notes: ''
}

export default function NewLoan() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searched, setSearched] = useState(false)
    const [selectedClient, setSelectedClient] = useState(null)
    const [loan, setLoan] = useState(initialLoan)
    const [saving, setSaving] = useState(false)

    const amount = parseCOP(loan.amount)
    const rate = parseFloat(loan.rate) || 0
    const numPayments = parseInt(loan.numPayments) || 0
    const preview = amount && rate ? calcTotalLoan(amount, rate, numPayments) : null

    // Preseleccionar cliente si viene de NewClient
    useEffect(() => {
        const clientId = searchParams.get('clientId')
        if (clientId) db.clients.get(Number(clientId)).then(c => { if (c) setSelectedClient(c) })
    }, [])

    // Búsqueda con debounce
    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); setSearched(false); return }
        const timer = setTimeout(async () => {
            const q = query.toLowerCase()
            const all = await db.clients.toArray()
            setResults(all.filter(c => c.name?.toLowerCase().includes(q) || c.cedula?.includes(q)))
            setSearched(true)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    function selectClient(client) {
        setSelectedClient(client)
        setQuery('')
        setResults([])
        setSearched(false)
    }

    function clearClient() {
        setSelectedClient(null)
        setLoan(initialLoan)
    }

    function handleLoanChange(e) {
        setLoan({ ...loan, [e.target.name]: e.target.value })
    }

    function handleAmountChange(e) {
        const raw = parseCOP(e.target.value)
        setLoan({ ...loan, amount: raw ? formatCOP(raw) : '' })
    }

    async function handleSubmit() {
        if (!selectedClient) { alert('Selecciona un cliente.'); return }
        if (!loan.amount || !loan.rate || !loan.startDate) {
            alert('Completa los campos obligatorios del préstamo.')
            return
        }
        setSaving(true)
        try {
            await db.loans.add({
                clientId: selectedClient.id,
                amount,
                interestRate: rate,
                interestAmount: calcInterest(amount, rate),
                frequency: loan.frequency,
                startDate: loan.startDate,
                firstPaymentDate: loan.firstPaymentDate,
                notes: loan.notes,
                status: 'active',
                createdAt: new Date().toISOString(),
            })
            navigate('/clients')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Nuevo Préstamo</h1>

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

            {/* PRÉSTAMO — solo si hay cliente */}
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
                                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Frecuencia de pago</label>
                                <select name="frequency" value={loan.frequency} onChange={handleLoanChange}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="mensual">Mensual</option>
                                    <option value="quincenal">Quincenal</option>
                                </select>
                            </div>
                            <Field
                                label="Fecha del préstamo *"
                                name="startDate"
                                value={loan.startDate}
                                onChange={handleLoanChange}
                                type="date"
                            />
                            <Field
                                label="Fecha del primer pago *"
                                name="firstPaymentDate"
                                value={loan.firstPaymentDate}
                                onChange={handleLoanChange}
                                type="date"
                            />
                            <Field label="Notas del préstamo" name="notes" value={loan.notes} onChange={handleLoanChange} placeholder="Condiciones especiales..." textarea />
                        </div>
                    </section>

                    {preview && (
                        <section className="bg-blue-900/20 rounded-2xl p-4 mb-4 border border-blue-800/40">
                            <h2 className="font-semibold text-blue-400 mb-3 text-sm uppercase tracking-wide">Resumen</h2>
                            <div className="space-y-1 text-sm">
                                <Row label="Capital prestado" value={formatCOP(amount)} />
                                <Row label="Interés por cuota" value={formatCOP(preview.interestPerPeriod)} />
                                {numPayments > 0 && <>
                                    <Row label="Total en intereses" value={formatCOP(preview.totalInterest)} />
                                    <Row label="Total a recibir" value={formatCOP(preview.totalToPay)} bold />
                                </>}
                            </div>
                        </section>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl shadow active:scale-95 transition disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar Préstamo'}
                    </button>
                </>
            )}

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
        <div className={`flex justify-between ${bold ? 'font-bold text-blue-400 text-base mt-2 pt-2 border-t border-blue-800' : 'text-gray-300'}`}>
            <span>{label}</span><span>{value}</span>
        </div>
    )
}