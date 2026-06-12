import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { formatCOP } from '../utils/format'
import { calcTotalLoan, calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { ChevronLeft, DollarSign, Snowflake, CheckCircle, AlertCircle, Clock, Pencil, X, Handshake } from 'lucide-react'

export default function LoanDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loan, setLoan] = useState(null)
    const [client, setClient] = useState(null)
    const [payments, setPayments] = useState([])
    const [modal, setModal] = useState(null) // 'pay' | 'interest' | 'freeze' | 'settle' | 'agreement'

    useEffect(() => { load() }, [id])

    async function load() {
        const l = await db.loans.get(Number(id))
        if (!l) return
        const c = await db.clients.get(l.clientId)
        const p = await db.payments.where('loanId').equals(Number(id)).toArray()
        setLoan(l)
        setClient(c)
        setPayments(p.sort((a, b) => new Date(b.date) - new Date(a.date)))
    }

    if (!loan) return <div className="p-6 text-center text-gray-400 mt-20">Cargando...</div>

    const totalPaid = payments.reduce((s, p) => s + (p.capitalPaid || 0), 0)
    const totalInterestPaid = payments.reduce((s, p) => s + (p.interestPaid || 0), 0)
    const remaining = loan.amount - totalPaid
    const preview = loan.numPayments ? calcTotalLoan(loan.amount, loan.interestRate, loan.numPayments) : null
    const paymentsMade = payments.length
    const nextPayment = calcNextPaymentDate(loan.firstPaymentDate, loan.frequency, paymentsMade)
    const classification = classifyLoan(loan.firstPaymentDate, loan.frequency, paymentsMade)

    // ── 1. STATUS incluye 'agreement' ──
    const STATUS = {
        active:    { label: 'Activo',           color: 'text-green-400 bg-green-900/30',  Icon: CheckCircle },
        frozen:    { label: 'Congelado',         color: 'text-blue-400 bg-blue-900/30',   Icon: Snowflake   },
        overdue:   { label: 'En mora',           color: 'text-red-400 bg-red-900/30',     Icon: AlertCircle },
        paid:      { label: 'Liquidado',         color: 'text-gray-400 bg-gray-700',      Icon: CheckCircle },
        agreement: { label: 'Acuerdo especial',  color: 'text-amber-400 bg-amber-900/30', Icon: AlertCircle },
    }
    const status = STATUS[loan.status] || STATUS.active

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="px-4 pt-6 pb-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="text-blue-400">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-white">{client?.name || 'Cliente'}</h1>
                    <p className="text-xs text-gray-400">{client?.phone} {client?.cedula ? `· CC ${client.cedula}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
                    <status.Icon size={11} /> {status.label}
                </span>
            </div>

            {/* Banner acuerdo especial */}
            {loan.status === 'agreement' && (
                <div className="mx-4 mb-4 bg-amber-900/30 border border-amber-700/40 rounded-2xl px-4 py-3 flex gap-3 items-start">
                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-amber-400">Acuerdo especial activo</p>
                        <p className="text-xs text-amber-300/70 mt-0.5">Sin intereses · Solo abono a capital</p>
                        {loan.agreementNote && <p className="text-xs text-gray-400 mt-1">{loan.agreementNote}</p>}
                    </div>
                </div>
            )}

            {/* Tarjeta principal */}
            <div className="mx-4 rounded-2xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #7048e8 100%)' }}>
                <p className="text-sm opacity-70">Capital prestado</p>
                <p className="text-3xl font-bold mt-1">{formatCOP(loan.amount)}</p>
                <div className="flex gap-6 mt-4">
                    <div>
                        <p className="text-xs opacity-60">Pagado</p>
                        <p className="font-semibold">{formatCOP(totalPaid)}</p>
                    </div>
                    <div>
                        <p className="text-xs opacity-60">Saldo</p>
                        <p className="font-semibold">{formatCOP(remaining)}</p>
                    </div>
                    <div>
                        <p className="text-xs opacity-60">Interés/cuota</p>
                        <p className="font-semibold">{formatCOP(loan.interestAmount)}</p>
                    </div>
                </div>
            </div>

            {/* Resumen de intereses recaudados */}
            <div className="mx-4 bg-gray-800 rounded-2xl px-4 py-3 mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-400">Intereses recaudados</p>
                <p className="text-sm font-bold text-green-400">{formatCOP(totalInterestPaid)}</p>
            </div>

            {/* Info del préstamo */}
            <div className="mx-4 bg-gray-800 rounded-2xl p-4 mb-4 space-y-2">
                <InfoRow label="Tasa de interés" value={`${loan.interestRate}%`} />
                <InfoRow label="Frecuencia" value={loan.frequency} />
                <InfoRow label="Cuotas" value={loan.numPayments ? `${payments.length} / ${loan.numPayments}` : '—'} />
                <InfoRow label="Inicio" value={loan.startDate ? new Date(loan.startDate).toLocaleDateString('es-CO') : '—'} />
                <InfoRow label="Primer pago" value={loan.firstPaymentDate ? new Date(loan.firstPaymentDate).toLocaleDateString('es-CO') : '—'} />
                <InfoRow label="Próximo pago" value={nextPayment ? nextPayment.toLocaleDateString('es-CO') : '—'} />
                {preview && <InfoRow label="Total intereses" value={formatCOP(preview.totalInterest)} />}
                {loan.notes && <InfoRow label="Notas" value={loan.notes} />}
            </div>

            {/* ── 2. Acciones — botón Acuerdo especial reemplaza Congelar cuando ya está en acuerdo ── */}
            {loan.status !== 'paid' && (
                <div className="mx-4 grid grid-cols-2 gap-3 mb-4">
                    <ActionBtn Icon={DollarSign} label="Registrar pago" color="bg-blue-600" onClick={() => setModal('pay')} />
                    <ActionBtn Icon={Pencil} label="Modificar interés" color="bg-gray-700" onClick={() => setModal('interest')} />

                    {loan.status !== 'agreement' ? (
                        <ActionBtn
                            Icon={Handshake}
                            label="Acuerdo especial"
                            color="bg-amber-700/80"
                            onClick={() => setModal('agreement')}
                        />
                    ) : (
                        <ActionBtn
                            Icon={Snowflake}
                            label={loan.status === 'frozen' ? 'Descongelar' : 'Congelar'}
                            color="bg-gray-700"
                            onClick={() => setModal('freeze')}
                        />
                    )}

                    <ActionBtn Icon={CheckCircle} label="Liquidar" color="bg-green-700" onClick={() => setModal('settle')} />
                </div>
            )}

            {/* Historial de pagos */}
            <div className="mx-4 bg-gray-800 rounded-2xl overflow-hidden">
                <p className="font-semibold text-gray-200 px-4 pt-4 pb-2">Historial de pagos</p>
                {payments.length === 0 ? (
                    <p className="text-sm text-gray-500 px-4 pb-4">Sin pagos registrados aún</p>
                ) : (
                    payments.map((p, i) => (
                        <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < payments.length - 1 ? 'border-b border-gray-700' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center shrink-0">
                                <DollarSign size={14} className="text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-200">{formatCOP(p.totalPaid)}</p>
                                <p className="text-xs text-gray-500">
                                    Capital: {formatCOP(p.capitalPaid)} · Interés: {formatCOP(p.interestPaid)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString('es-CO')}</p>
                                {p.late && <span className="text-[10px] text-red-400">Tardío</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── 3. Modales — se agrega agreement ── */}
            {modal === 'pay'       && <PayModal       loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'interest'  && <InterestModal  loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'freeze'    && <FreezeModal    loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'settle'    && <SettleModal    loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'agreement' && <AgreementModal loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
        </div>
    )
}

// ── Componentes pequeños ──────────────────────────────────────

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-100 font-medium capitalize">{value}</span>
        </div>
    )
}

function ActionBtn({ Icon, label, color, onClick }) {
    return (
        <button onClick={onClick} className={`${color} rounded-2xl p-3 flex items-center gap-2 text-white text-sm font-medium active:scale-95 transition`}>
            <Icon size={16} /> {label}
        </button>
    )
}

function ModalWrapper({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-white text-lg">{title}</h2>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

// ── Modal: Registrar pago ─────────────────────────────────────

function PayModal({ loan, onClose, onDone }) {
    const [capital, setCapital] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [late, setLate] = useState(false)
    const [saving, setSaving] = useState(false)

    const interest = loan.interestAmount || 0
    const capitalNum = Number(capital) || 0
    const total = interest + capitalNum

    async function handleSave() {
        setSaving(true)
        await db.payments.add({
            loanId: loan.id,
            date,
            totalPaid: total,
            interestPaid: interest,
            capitalPaid: capitalNum,
            late,
            notes: '',
        })
        onDone()
    }

    return (
        <ModalWrapper title="Registrar pago" onClose={onClose}>
            <div className="space-y-3">
                {interest > 0 ? (
                    <div className="bg-blue-900/30 rounded-xl p-3 text-sm text-blue-300">
                        Interés obligatorio: <span className="font-bold">{formatCOP(interest)}</span>
                    </div>
                ) : (
                    <div className="bg-amber-900/30 rounded-xl p-3 text-sm text-amber-300">
                        Acuerdo especial · Solo abono a capital
                    </div>
                )}
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                        {interest > 0 ? 'Capital adicional (opcional)' : 'Monto a abonar'}
                    </label>
                    <input
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="$ 0" type="number" value={capital}
                        onChange={e => setCapital(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Fecha de pago</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} className="accent-red-500" />
                    Marcar como pago tardío
                </label>
                <div className="flex justify-between text-sm font-semibold text-white pt-1">
                    <span>Total a recibir</span><span>{formatCOP(total)}</span>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Confirmar pago'}
                </button>
            </div>
        </ModalWrapper>
    )
}

// ── Modal: Modificar interés ──────────────────────────────────

function InterestModal({ loan, onClose, onDone }) {
    const [rate, setRate] = useState(String(loan.interestRate))
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        const newRate = parseFloat(rate)
        if (!newRate) return
        setSaving(true)
        const newInterest = Math.round((loan.amount * newRate) / 100)
        await db.loans.update(loan.id, { interestRate: newRate, interestAmount: newInterest })
        onDone()
    }

    return (
        <ModalWrapper title="Modificar interés" onClose={onClose}>
            <div className="space-y-3">
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Nueva tasa (%)</label>
                    <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {rate && (
                    <p className="text-sm text-gray-400">
                        Nuevo interés/cuota: <span className="text-white font-semibold">{formatCOP(Math.round((loan.amount * parseFloat(rate)) / 100))}</span>
                    </p>
                )}
                <button onClick={handleSave} disabled={saving}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar cambio'}
                </button>
            </div>
        </ModalWrapper>
    )
}

// ── Modal: Congelar / Descongelar ─────────────────────────────

function FreezeModal({ loan, onClose, onDone }) {
    const isFrozen = loan.status === 'frozen'
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await db.loans.update(loan.id, { status: isFrozen ? 'active' : 'frozen' })
        onDone()
    }

    return (
        <ModalWrapper title={isFrozen ? 'Descongelar préstamo' : 'Congelar préstamo'} onClose={onClose}>
            <p className="text-gray-400 text-sm mb-4">
                {isFrozen
                    ? 'El préstamo volverá a estado activo y se podrán registrar pagos normalmente.'
                    : 'El préstamo quedará congelado. No se generarán nuevos intereses hasta descongelarlo.'}
            </p>
            <button onClick={handleSave} disabled={saving}
                className={`w-full text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50 ${isFrozen ? 'bg-green-600' : 'bg-blue-600'}`}>
                {saving ? 'Guardando...' : isFrozen ? 'Descongelar' : 'Congelar'}
            </button>
        </ModalWrapper>
    )
}

// ── Modal: Liquidar ───────────────────────────────────────────

function SettleModal({ loan, onClose, onDone }) {
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await db.loans.update(loan.id, { status: 'paid' })
        onDone()
    }

    return (
        <ModalWrapper title="Liquidar préstamo" onClose={onClose}>
            <p className="text-gray-400 text-sm mb-4">
                El préstamo se marcará como <span className="text-green-400 font-semibold">Liquidado</span>. Esta acción no se puede deshacer fácilmente.
            </p>
            <button onClick={handleSave} disabled={saving}
                className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50">
                {saving ? 'Liquidando...' : 'Confirmar liquidación'}
            </button>
        </ModalWrapper>
    )
}

// ── Modal: Acuerdo especial ───────────────────────────────────

function AgreementModal({ loan, onClose, onDone }) {
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await db.loans.update(loan.id, {
            status: 'agreement',
            interestRate: 0,
            interestAmount: 0,
            agreementDate: new Date().toISOString().split('T')[0],
            agreementNote: note,
        })
        onDone()
    }

    return (
        <ModalWrapper title="Acuerdo especial" onClose={onClose}>
            <div className="space-y-3">
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 text-xs text-amber-300">
                    El préstamo pasará a <strong>sin intereses</strong>. Solo se registrarán abonos a capital hasta recuperarlo.
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Nota del acuerdo (opcional)</label>
                    <textarea
                        rows={3}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Ej: Acuerdo verbal junio 2026, paga cuando pueda..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
                    />
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="w-full bg-amber-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Activar acuerdo'}
                </button>
            </div>
        </ModalWrapper>
    )
}