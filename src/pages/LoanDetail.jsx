import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCOP } from '../utils/format'
import { calcVariableInterest } from '../utils/loanCalc'
import { calcTotalLoan, calcNextPaymentDate, classifyLoan, calcMora } from '../utils/loanCalc'
import { ChevronLeft, DollarSign, Snowflake, CheckCircle, AlertCircle, Pencil, X, Handshake, Calendar, Percent, RefreshCw, CreditCard } from 'lucide-react'

export default function LoanDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loan, setLoan] = useState(null)
    const [client, setClient] = useState(null)
    const [payments, setPayments] = useState([])
    const [modal, setModal] = useState(null)

    useEffect(() => { load() }, [id])

    async function load() {
        const [{ data: l }, { data: p }] = await Promise.all([
            supabase.from('loans').select('*').eq('id', id).single(),
            supabase.from('payments').select('*').eq('loan_id', id).order('date', { ascending: false }),
        ])
        if (!l) return
        const { data: c } = await supabase.from('clients').select('*').eq('id', l.client_id).single()
        setLoan(l)
        setClient(c)
        setPayments(p || [])
    }

    if (!loan) return <div className="p-6 text-center text-gray-400 mt-20">Cargando...</div>

    const totalPaid = payments.reduce((s, p) => s + (p.capital_paid || 0), 0)
    const totalInterestPaid = payments.reduce((s, p) => s + (p.interest_paid || 0), 0)
    const remaining = loan.amount - totalPaid
    const paymentsMade = payments.length
    const nextPayment = calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)
    const classification = classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade)
    const isVariable = loan.interest_type === 'variable'
    const nextInterest = isVariable
        ? calcVariableInterest(loan.amount, totalPaid, loan.interest_rate, loan.frequency)
        : (loan.interest_amount || 0)
    const preview = !isVariable && loan.num_payments
        ? calcTotalLoan(loan.amount, loan.interest_rate, loan.num_payments)
        : null
    const initials = (client?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const isOverdue = classification === 'overdue' || loan.status === 'overdue'
    const isPaid = loan.status === 'paid'
    const mora = (!isPaid && loan.status !== 'frozen')
        ? calcMora(loan, paymentsMade, totalPaid)
        : { inMora: false }

    const STATUS = {
        active: { label: 'Activo', color: 'text-green-400 bg-green-900/30', dot: 'bg-green-400' },
        frozen: { label: 'Congelado', color: 'text-blue-400 bg-blue-900/30', dot: 'bg-blue-400' },
        overdue: { label: 'En mora', color: 'text-red-400 bg-red-900/30', dot: 'bg-red-400' },
        paid: { label: 'Liquidado', color: 'text-gray-400 bg-gray-700', dot: 'bg-gray-400' },
        agreement: { label: 'Acuerdo especial', color: 'text-amber-400 bg-amber-900/30', dot: 'bg-amber-400' },
    }
    const status = STATUS[loan.status] || STATUS.active

    return (
        <div className="pb-32 bg-gray-50 dark:bg-gray-950 min-h-screen">

            {/* Header */}
            <div className="px-4 pt-6 pb-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="text-blue-400">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-bold text-gray-900 dark:text-white">Préstamo #{String(id).slice(-4).padStart(4, '0')}</h1>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} /> {status.label}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400">
                        Otorgado el {loan.start_date ? new Date(loan.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                </div>
            </div>

            {/* Banner acuerdo especial */}
            {loan.status === 'agreement' && (
                <div className="mx-4 mb-3 bg-amber-900/30 border border-amber-700/40 rounded-2xl px-4 py-3 flex gap-3 items-start">
                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-amber-400">Acuerdo especial activo</p>
                        <p className="text-xs text-amber-300/70 mt-0.5">Sin intereses · Solo abono a capital</p>
                        {loan.agreement_note && <p className="text-xs text-gray-400 mt-1">{loan.agreement_note}</p>}
                    </div>
                </div>
            )}

            {/* Tarjeta cliente */}
            <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold text-base flex items-center justify-center shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-100">{client?.name || '—'}</p>
                        {client?.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">{isOverdue ? 'Vencido desde' : isPaid ? 'Liquidado' : 'Próximo pago'}</p>
                        {!isPaid && nextPayment && (
                            <p className={`text-xs font-semibold flex items-center gap-1 justify-end mt-0.5 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                                <Calendar size={10} />
                                {nextPayment.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Métricas principales */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Monto</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{formatCOP(loan.amount)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Total a pagar</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{preview ? formatCOP(preview.totalToPay) : '—'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Pendiente</p>
                        <p className={`text-xs font-bold ${isPaid ? 'text-gray-400' : 'text-amber-500'}`}>{formatCOP(remaining)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Cuotas</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                            {loan.num_payments ? `${paymentsMade} / ${loan.num_payments}` : `${paymentsMade}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Detalles del préstamo */}
            <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Detalles del préstamo</p>
                <div className="grid grid-cols-2 gap-3">
                    <DetailCell Icon={Percent} label="Tasa de interés" value={`${loan.interest_rate}%`} />
                    <DetailCell Icon={Calendar} label="Fecha inicio" value={loan.start_date ? new Date(loan.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                    <DetailCell Icon={RefreshCw} label="Frecuencia" value={loan.frequency} />
                    <DetailCell
                        Icon={Calendar}
                        label="Próximo pago"
                        value={(() => {
                            const fecha = paymentsMade === 0
                                ? (loan.first_payment_date ? new Date(loan.first_payment_date) : null)
                                : calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)
                            return fecha
                                ? fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'
                        })()}
                        valueColor={isPaid ? 'text-gray-400' : isOverdue ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}
                    />
                    <DetailCell
                        Icon={CreditCard}
                        label="Tipo de interés"
                        value={isVariable ? 'Variable (sobre saldo)' : 'Fijo'}
                        valueColor={isVariable ? 'text-purple-500' : 'text-blue-500'}
                    />
                    <DetailCell Icon={DollarSign} label="Intereses cobrados" value={formatCOP(totalInterestPaid)} valueColor="text-green-500" />
                </div>
                {loan.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400">Notas</p>
                        <p className="text-sm text-gray-300 mt-0.5">{loan.notes}</p>
                    </div>
                )}
            </div>

            {/* Tarjeta mora */}
            {mora.inMora && (
                <div className="mx-4 border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={15} className="text-red-400 shrink-0" />
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">Préstamo en mora</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-gray-400 mb-1">Días en mora</p>
                            <p className="text-lg font-bold text-red-500 dark:text-red-400">{mora.diasMora}</p>
                            <p className="text-[10px] text-gray-400">días</p>
                        </div>
                        <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-gray-400 mb-1">Intereses vencidos</p>
                            <p className="text-lg font-bold text-red-500 dark:text-red-400">
                                {mora.mesesEnMora % 1 === 0 ? mora.mesesEnMora : mora.mesesEnMora.toFixed(1)}
                            </p>
                            <p className="text-[10px] text-gray-400">meses</p>
                        </div>
                        <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-gray-400 mb-1">Valor que debe</p>
                            <p className="text-base font-bold text-red-500 dark:text-red-400">{formatCOP(mora.valorInteresesDebe)}</p>
                            <p className="text-[10px] text-gray-400">en intereses</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Resumen de pagos */}
            <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Resumen de pagos</p>

                {/* Banner tipo de interés */}
                <div className={`rounded-xl p-3 mb-3 flex items-center gap-2 ${isVariable
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40'
                    }`}>
                    <Percent size={14} className={isVariable ? 'text-purple-500' : 'text-blue-500'} />
                    <div>
                        <p className={`text-xs font-semibold ${isVariable ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {isVariable ? 'Interés variable sobre saldo' : 'Interés fijo'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                            {isVariable
                                ? `Próximo interés: ${formatCOP(nextInterest)} (${loan.interest_rate}% sobre ${formatCOP(remaining)})`
                                : `Interés fijo por cuota: ${formatCOP(loan.interest_amount)}`
                            }
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <SummaryBox
                        label="Capital pagado"
                        value={formatCOP(totalPaid)}
                        sub={`${paymentsMade} cuotas`}
                        color="text-green-500"
                        bg="bg-green-50 dark:bg-green-900/20"
                    />
                    <SummaryBox
                        label="Capital pendiente"
                        value={formatCOP(remaining)}
                        sub={loan.num_payments && !isVariable ? `${loan.num_payments - paymentsMade} cuotas` : '—'}
                        color="text-amber-500"
                        bg="bg-amber-50 dark:bg-amber-900/20"
                    />
                    <SummaryBox
                        label="Próximo interés"
                        value={!isPaid && nextPayment ? formatCOP(nextInterest) : '—'}
                        sub={nextPayment && !isPaid ? nextPayment.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—'}
                        color={isVariable ? 'text-purple-500' : 'text-blue-500'}
                        bg={isVariable ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}
                    />
                    <SummaryBox
                        label="Intereses cobrados"
                        value={formatCOP(totalInterestPaid)}
                        sub="total histórico"
                        color="text-green-500"
                        bg="bg-green-50 dark:bg-green-900/20"
                    />
                </div>
            </div>

            {/* Historial de pagos */}
            <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-3 shadow-sm">
                <p className="font-bold text-gray-800 dark:text-gray-100 px-4 pt-4 pb-2 text-sm">Historial de pagos</p>
                {payments.length === 0 ? (
                    <p className="text-sm text-gray-500 px-4 pb-4">Sin pagos registrados aún</p>
                ) : (
                    payments.map((p, i) => (
                        <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < payments.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <CheckCircle size={14} className="text-green-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCOP(p.total_paid)}</p>
                                <p className="text-xs text-gray-400">
                                    Capital: {formatCOP(p.capital_paid)} · Interés: {formatCOP(p.interest_paid)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString('es-CO')}</p>
                                {p.late && <span className="text-[10px] text-red-400">Tardío</span>}
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                Pagado
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Acciones fila 1 */}
            {loan.status !== 'paid' && (
                <div className="mx-4 grid grid-cols-3 gap-2 mb-2">
                    <ActionBtn Icon={DollarSign} label="Registrar pago" color="bg-blue-600" onClick={() => setModal('pay')} />
                    <ActionBtn Icon={Pencil} label="Editar interés" color="bg-gray-700" onClick={() => setModal('interest')} />
                    {loan.status !== 'agreement' ? (
                        <ActionBtn Icon={Handshake} label="Acuerdo" color="bg-amber-700/80" onClick={() => setModal('agreement')} />
                    ) : (
                        <ActionBtn Icon={Snowflake} label="Congelar" color="bg-gray-700" onClick={() => setModal('freeze')} />
                    )}
                </div>
            )}
            {/* Acciones fila 2 */}
            {loan.status !== 'paid' && (
                <div className="mx-4 grid grid-cols-2 gap-2 mb-4">
                    <ActionBtn Icon={Snowflake} label={loan.status === 'frozen' ? 'Descongelar' : 'Congelar'} color="bg-gray-700" onClick={() => setModal('freeze')} />
                    <ActionBtn Icon={CheckCircle} label="Marcar liquidado" color="bg-red-700/80" onClick={() => setModal('settle')} />
                </div>
            )}

            {/* Modales */}
            {modal === 'pay' && <PayModal loan={loan} userId={user.id} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'interest' && <InterestModal loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'freeze' && <FreezeModal loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'settle' && <SettleModal loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
            {modal === 'agreement' && <AgreementModal loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
        </div>
    )
}

function DetailCell({ Icon, label, value, valueColor = 'text-gray-800 dark:text-gray-100' }) {
    return (
        <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={13} className="text-blue-500" />
            </div>
            <div>
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className={`text-xs font-semibold capitalize ${valueColor}`}>{value}</p>
            </div>
        </div>
    )
}

function SummaryBox({ label, value, sub, color, bg }) {
    return (
        <div className={`${bg} rounded-xl p-3`}>
            <p className="text-[10px] text-gray-400 mb-1">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
        </div>
    )
}

function ActionBtn({ Icon, label, color, onClick }) {
    return (
        <button onClick={onClick} className={`${color} rounded-2xl p-3 flex items-center justify-center gap-2 text-white text-xs font-medium active:scale-95 transition`}>
            <Icon size={14} /> {label}
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

function PayModal({ loan, userId, onClose, onDone }) {
    const [capital, setCapital] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [late, setLate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [payments, setPayments] = useState([])

    useEffect(() => {
        supabase.from('payments')
            .select('capital_paid')
            .eq('loan_id', loan.id)
            .then(({ data }) => setPayments(data || []))
    }, [])

    const capitalPaid = payments.reduce((s, p) => s + (p.capital_paid || 0), 0)
    const remainingCapital = loan.amount - capitalPaid

    // Si es variable, el interés se calcula sobre el saldo pendiente
    const interest = loan.interest_type === 'variable'
        ? Math.round(remainingCapital * (loan.interest_rate / 100))
        : (loan.interest_amount || 0)

    const capitalNum = Number(capital) || 0
    const total = interest + capitalNum

    async function handleSave() {
        setSaving(true)
        await supabase.from('payments').insert({
            loan_id: loan.id,
            date,
            total_paid: total,
            interest_paid: interest,
            capital_paid: capitalNum,
            late,
            notes: '',
        })
        onDone()
    }

    return (
        <ModalWrapper title="Registrar pago" onClose={onClose}>
            <div className="space-y-3">
                {loan.interest_type === 'variable' && (
                    <div className="bg-purple-900/30 rounded-xl p-3 text-xs text-purple-300">
                        Interés variable · Saldo pendiente: <span className="font-bold">{formatCOP(remainingCapital)}</span>
                    </div>
                )}
                {interest > 0 ? (
                    <div className="bg-blue-900/30 rounded-xl p-3 text-sm text-blue-300">
                        Interés a cobrar: <span className="font-bold">{formatCOP(interest)}</span>
                        {loan.interest_type === 'variable' && (
                            <span className="text-xs text-purple-300 ml-1">({loan.interest_rate}% sobre saldo)</span>
                        )}
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
                <button onClick={handleSave} disabled={saving || payments.length === 0 && loan.interest_type === 'variable'}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Confirmar pago'}
                </button>
            </div>
        </ModalWrapper>
    )
}

function InterestModal({ loan, onClose, onDone }) {
    const [rate, setRate] = useState(String(loan.interest_rate))
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        const newRate = parseFloat(rate)
        if (!newRate) return
        setSaving(true)
        const newInterest = Math.round((loan.amount * newRate) / 100)
        await supabase.from('loans').update({ interest_rate: newRate, interest_amount: newInterest }).eq('id', loan.id)
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

function FreezeModal({ loan, onClose, onDone }) {
    const isFrozen = loan.status === 'frozen'
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await supabase.from('loans').update({ status: isFrozen ? 'active' : 'frozen' }).eq('id', loan.id)
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

function SettleModal({ loan, onClose, onDone }) {
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await supabase.from('loans').update({ status: 'paid' }).eq('id', loan.id)
        onDone()
    }

    return (
        <ModalWrapper title="Liquidar préstamo" onClose={onClose}>
            <p className="text-gray-400 text-sm mb-4">
                El préstamo se marcará como <span className="text-green-400 font-semibold">Liquidado</span>. Esta acción no se puede deshacer fácilmente.
            </p>
            <button onClick={handleSave} disabled={saving}
                className="w-full bg-red-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50">
                {saving ? 'Liquidando...' : 'Confirmar liquidación'}
            </button>
        </ModalWrapper>
    )
}

function AgreementModal({ loan, onClose, onDone }) {
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await supabase.from('loans').update({
            status: 'agreement',
            interest_rate: 0,
            interest_amount: 0,
            agreement_date: new Date().toISOString().split('T')[0],
            agreement_note: note,
        }).eq('id', loan.id)
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