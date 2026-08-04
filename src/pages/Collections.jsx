import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import { AlertCircle, Clock, CheckCircle, ChevronRight, MessageCircle, Bell } from 'lucide-react'


const SECTIONS = {
    overdue: { label: 'Atrasados', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', avatarBg: 'bg-red-100 dark:bg-red-900/40', Icon: AlertCircle },
    today: { label: 'Cobrar hoy', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800/50', avatarBg: 'bg-yellow-100 dark:bg-yellow-900/40', Icon: Clock },
    soon: { label: 'Próximos 7 días', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', avatarBg: 'bg-blue-100 dark:bg-blue-900/40', Icon: Clock },
}

function enviarRecordatorio(loan) {
    const client = loan.client
    if (!client?.phone) { alert('Este cliente no tiene teléfono registrado'); return }
    const phone = client.phone.replace(/\D/g, '')
    const fullPhone = phone.startsWith('57') && phone.length === 12 ? phone : `57${phone}`
    const fecha = loan.nextPayment
        ? loan.nextPayment.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
        : 'próximamente'
    const mensaje = `Hola ${client.name}, te recordamos que tienes un pago de ${formatCOP(loan.interest_amount)} con fecha límite el ${fecha}. Por favor contáctanos para coordinar. 🙏`
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(mensaje)}`, '_blank')
}

export default function Collections() {
    const navigate = useNavigate()
    const [grouped, setGrouped] = useState({ overdue: [], today: [], soon: [] })
    const [loading, setLoading] = useState(true)
    const [collectedThisMonth, setCollectedThisMonth] = useState(0)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)

        const [{ data: allLoans }, { data: allClients }, { data: allPayments }] = await Promise.all([
            supabase.from('loans').select('*'),
            supabase.from('clients').select('*'),
            supabase.from('payments').select('*'),
        ])

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const collected = (allPayments || [])
            .filter(p => p.date >= startOfMonth)
            .reduce((s, p) => s + (p.total_paid || 0), 0)
        setCollectedThisMonth(collected)

        const activeLoans = (allLoans || []).filter(l =>
            l.status === 'active' || l.status === 'overdue' || l.status === 'agreement'
        )

        const result = { overdue: [], today: [], soon: [] }

        for (const loan of activeLoans) {
            if (!loan.first_payment_date) continue
            const loanPayments = (allPayments || []).filter(p => p.loan_id === loan.id)
            const paymentsMade = loanPayments.length
            const classification = classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade)
            if (!result[classification]) continue

            const client = (allClients || []).find(c => c.id === loan.client_id)
            const nextPayment = calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)

            result[classification].push({ ...loan, client, nextPayment, paymentsMade })
        }

        setGrouped(result)
        setLoading(false)
    }

    const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)

    return (
        <div className="pb-24">
            {/* Hero amarillo pastel */}
            <div className="sticky top-0 z-20 overflow-hidden pt-6 pb-10 px-4 bg-[#F5D98A]">
                <div className="absolute inset-0 pointer-events-none">
                    <svg className="absolute -top-12 -right-20 w-72 h-72 text-white/25" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M45.3,-58.5C59.5,-49.8,72.1,-36.9,76.6,-21.5C81.1,-6.1,77.5,11.8,69.6,26.9C61.7,42,49.5,54.3,35.1,62.6C20.7,70.9,4.1,75.2,-12.7,74.2C-29.5,73.2,-46.5,66.9,-58.4,55.1C-70.3,43.3,-77.1,26,-78.7,8.1C-80.3,-9.8,-76.7,-28.3,-66.6,-42.1C-56.5,-55.9,-39.9,-65,-23.7,-72C-7.5,-79,8.3,-83.9,22.9,-79.9C37.5,-75.9,45.3,-58.5,45.3,-58.5Z" transform="translate(100 100)" />
                    </svg>
                    <svg className="absolute -bottom-24 -left-14 w-80 h-80 text-white/15" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M42.8,-54.2C54.5,-45.6,62,-31.4,65.5,-16.2C69,-1,68.5,15.2,61.6,28.5C54.7,41.8,41.4,52.2,26.5,59.1C11.6,66,-4.9,69.4,-20.4,65.8C-35.9,62.2,-50.4,51.6,-59.4,37.6C-68.4,23.6,-71.9,6.2,-69.1,-10.1C-66.3,-26.4,-57.2,-41.6,-44.4,-50.4C-31.6,-59.2,-15.8,-61.6,0.3,-62C16.4,-62.4,31.1,-62.8,42.8,-54.2Z" transform="translate(100 100)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-gray-900 tracking-tight">
                            Loan<span className="text-gray-900/60">_</span>Ledger
                        </p>
                        <button className="relative p-2 bg-black/5 backdrop-blur-sm rounded-full">
                            <Bell size={20} className="text-gray-900" />
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mt-3">Cobros</h1>
                    <p className="text-xs text-gray-800/70 mb-4">
                        {total === 0 ? 'Todo al día 🎉' : `${total} préstamo${total > 1 ? 's' : ''} requieren atención`}
                    </p>

                    {/* Métricas */}
                    <div className="flex justify-between">
                        <div>
                            <p className="text-xs text-gray-800/70">Cobros este mes</p>
                            <p className="text-xl font-bold text-gray-900">{formatCOP(collectedThisMonth)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-800/70">Vencidos</p>
                            <p className="text-xl font-bold text-gray-900">
                                {formatCOP(grouped.overdue.reduce((s, l) => s + (l.interest_amount || 0), 0))}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-800/70">Próximos 7 días</p>
                            <p className="text-xl font-bold text-gray-900">
                                {formatCOP(grouped.soon.reduce((s, l) => s + (l.interest_amount || 0), 0))}
                            </p>
                        </div>
                    </div>

                    {/* Onda decorativa */}
                    <svg className="w-full h-4 mt-3" viewBox="0 0 400 20" preserveAspectRatio="none">
                        <path d="M0,10 Q50,20 100,10 T200,10 T300,10 T400,10" fill="none" stroke="rgba(255, 255, 255, 0.87)" strokeWidth="2" />
                    </svg>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-8 bg-white dark:bg-gray-900 rounded-t-[1.8rem]" />
            </div>

            <div className="px-4 pt-4">

                {loading && (
                    <div className="space-y-3 mt-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3 animate-pulse border border-gray-100 dark:border-transparent">
                                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3" />
                                </div>
                                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && total === 0 && (
                    <div className="text-center mt-24">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                        <p className="text-gray-400">No hay cobros pendientes</p>
                    </div>
                )}

                {['overdue', 'today', 'soon'].map(key => {
                    const items = grouped[key]
                    if (items.length === 0) return null
                    const cfg = SECTIONS[key]
                    return (
                        <div key={key} className="mb-5">
                            <div className="flex items-center gap-2 mb-2">
                                <cfg.Icon size={15} className={cfg.color} />
                                <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{items.length}</span>
                            </div>
                            <div className="space-y-2">
                                {items.map(loan => (
                                    <CollectionCard key={loan.id} loan={loan} cfg={cfg} onPress={() => navigate(`/loans/${loan.id}`)} />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
function CollectionCard({ loan, cfg, onPress }) {
    const name = loan.client?.name || 'Cliente'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const isAgreement = loan.status === 'agreement'

    return (
        <div className={`w-full bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-3 border shadow-sm dark:shadow-none ${cfg.border}`}>
            {/* Fila principal — navega al préstamo */}
            <button onClick={onPress} className="flex items-center gap-3 active:scale-[0.98] transition text-left">
                <div className={`w-11 h-11 rounded-full ${cfg.avatarBg} font-bold text-sm flex items-center justify-center shrink-0 ${cfg.color}`}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{name}</p>
                        {isAgreement && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0">Acuerdo</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatCOP(loan.interest_amount)} / cuota · {loan.frequency}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Próximo pago: {loan.nextPayment ? loan.nextPayment.toLocaleDateString('es-CO') : '—'}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-sm font-bold ${cfg.color}`}>{formatCOP(loan.amount)}</p>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                </div>
            </button>

            {/* Botón WhatsApp */}
            <button
                onClick={() => enviarRecordatorio(loan)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 text-green-600 dark:text-green-400 text-xs font-semibold active:scale-95 transition"
            >
                <MessageCircle size={14} /> Enviar recordatorio
            </button>
        </div>
    )
}