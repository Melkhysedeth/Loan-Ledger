import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { formatCOP } from '../utils/format'
import { useDashboardData } from '../hooks/useDashboardData'
import PaymentDetailModal from '../components/PaymentDetailModal'
import Carousel from '../components/Carousel'
import {
    Bell, DollarSign, LayoutList, Wallet, Users, CalendarPlus, Banknote, UserPlus, FileBarChart,
} from 'lucide-react'
import { MetricCard, QuickStat, AttentionRow, PaymentRow, QuickAction } from '../components/dashboard/DashboardWidgets'
import { WithdrawCapitalModal, InjectCapitalModal, CapitalBreakdownModal, TransferCapitalModal } from '../components/dashboard/CapitalModals'
import NotificationsModal from '../components/dashboard/NotificationsModal'
import MonthlyChart from '../components/dashboard/MonthlyChart'
import StatusDonut from '../components/dashboard/StatusDonut'

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return '¡Buenos días'
    if (h < 18) return '¡Buenas tardes'
    return '¡Buenas noches'
}

export default function Dashboard() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'usuario'

    const { stats, reload } = useDashboardData()
    const [showWithdraw, setShowWithdraw] = useState(false)
    const [showBreakdown, setShowBreakdown] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState(null)
    const [showInject, setShowInject] = useState(false)
    const [showTransfer, setShowTransfer] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)

    const {
        totalLent, collectedThisMonth, pendingBalance, activeClients, availableCapital,
        capitalByMethod, wallets,
        activeLoans, onTime, overdue, dueSoon, monthlyData, attention,
        statusDistribution, recentPayments,
        agreementCount, frozenCount, paidCount,
    } = stats

    const totalLine = pendingBalance + availableCapital
    const progressPct = totalLine > 0 ? Math.min(100, Math.round((pendingBalance / totalLine) * 100)) : 0

    return (
        <div className="pb-4 bg-[#f3f4f6] dark:bg-gray-950">
            {/* Header con fondo de color */}
            <div className="sticky top-0 z-20 overflow-hidden bg-[#83d4d2] dark:bg-[#3f8b89] pb-10">

                <div className="absolute inset-0 pointer-events-none">
                    <svg className="absolute -top-12 -right-20 w-72 h-72 text-white/15" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M45.3,-58.5C59.5,-49.8,72.1,-36.9,76.6,-21.5C81.1,-6.1,77.5,11.8,69.6,26.9C61.7,42,49.5,54.3,35.1,62.6C20.7,70.9,4.1,75.2,-12.7,74.2C-29.5,73.2,-46.5,66.9,-58.4,55.1C-70.3,43.3,-77.1,26,-78.7,8.1C-80.3,-9.8,-76.7,-28.3,-66.6,-42.1C-56.5,-55.9,-39.9,-65,-23.7,-72C-7.5,-79,8.3,-83.9,22.9,-79.9C37.5,-75.9,45.3,-58.5,45.3,-58.5Z" transform="translate(100 100)" />
                    </svg>
                    <svg className="absolute -bottom-24 -left-14 w-80 h-80 text-white/10" viewBox="0 0 200 200" fill="currentColor">
                        <path d="M42.8,-54.2C54.5,-45.6,62,-31.4,65.5,-16.2C69,-1,68.5,15.2,61.6,28.5C54.7,41.8,41.4,52.2,26.5,59.1C11.6,66,-4.9,69.4,-20.4,65.8C-35.9,62.2,-50.4,51.6,-59.4,37.6C-68.4,23.6,-71.9,6.2,-69.1,-10.1C-66.3,-26.4,-57.2,-41.6,-44.4,-50.4C-31.6,-59.2,-15.8,-61.6,0.3,-62C16.4,-62.4,31.1,-62.8,42.8,-54.2Z" transform="translate(100 100)" />
                    </svg>
                </div>

                <div className="relative z-10 px-4 pt-6 space-y-5">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-black text-gray-900 tracking-tight">
                                Loan<span className="text-teal-800">_</span>Ledger
                            </p>
                            <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-black/5 backdrop-blur-sm rounded-full">
                                <Bell size={20} className="text-gray-800" />
                                {(overdue.length + dueSoon.length) > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                        {overdue.length + dueSoon.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        <h1 className="text-sm font-semibold text-gray-800 mt-2">
                            {getGreeting()}, {userName}!
                        </h1>
                        <p className="text-xs text-gray-700">{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>

                    {/* Línea de préstamo: dinero en la calle vs disponible */}
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-xs text-gray-700">En la calle</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCOP(pendingBalance)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-700">Disponible</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCOP(availableCapital)}</p>
                            </div>
                        </div>
                        <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                        {totalLine > 0 && (
                            <p className="text-[12px] text-gray-700 mt-1.5 text-center">
                                Línea total: {formatCOP(totalLine)}
                            </p>
                        )}
                    </div>

                    {/* Carrusel de métricas: 2 tarjetas por slide */}
                    <div className="relative z-10">
                        <Carousel>
                            <div className="grid grid-cols-2 gap-3">
                                <div onClick={() => setShowBreakdown(true)} className="cursor-pointer active:scale-95 transition">
                                    <MetricCard
                                        label="Disponible para prestar"
                                        sub="capital libre"
                                        value={formatCOP(availableCapital)}
                                        color="green"
                                        Icon={Banknote}
                                    />
                                </div>
                                <MetricCard
                                    label="Total prestado"
                                    sub="capital colocado"
                                    value={formatCOP(totalLent)}
                                    color="blue"
                                    Icon={Wallet}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard
                                    label="Total cobrado"
                                    sub="este mes"
                                    value={formatCOP(collectedThisMonth)}
                                    color="green"
                                    Icon={DollarSign}
                                />
                                <MetricCard
                                    label="Saldo pendiente"
                                    sub="por cobrar"
                                    value={formatCOP(pendingBalance)}
                                    color="amber"
                                    Icon={LayoutList}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard
                                    label="Clientes activos"
                                    sub="con cuenta activa"
                                    value={activeClients}
                                    color="purple"
                                    Icon={Users}
                                />
                            </div>
                        </Carousel>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#f3f4f6] dark:bg-gray-950 rounded-t-[2rem] shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.25)] dark:shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.6)]" />
            </div>

            <div className="px-4 pt-3 space-y-5">

                {/* Resumen rápido: préstamos activos, en mora, próximos a vencer */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-4 pt-3 pb-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Resumen rápido</p>
                    <Carousel>
                        <div className="grid grid-cols-3 gap-2">
                            <QuickStat label="Al día" value={onTime} />
                            <QuickStat label="En mora" value={overdue.length} />
                            <QuickStat label="Por vencer" value={dueSoon.length} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <QuickStat label="Acuerdo" value={agreementCount} />
                            <QuickStat label="Congelados" value={frozenCount} />
                            <QuickStat label="Liquidados" value={paidCount} />
                        </div>
                    </Carousel>
                    <p className="text-[11px] text-gray-400 text-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        Total de préstamos activos: <span className="font-semibold text-gray-500 dark:text-gray-300">{activeLoans}</span>
                    </p>
                </div>

                <Carousel>
                    <MonthlyChart data={monthlyData} />
                    <StatusDonut distribution={statusDistribution} />
                </Carousel>

                {/* Clientes que requieren atención */}
                {attention?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-4 pt-4 pb-2">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Requieren atención</p>
                            <button onClick={() => navigate('/clients')} className="text-sm text-blue-500">Ver todos</button>
                        </div>
                        {attention.map((loan, i) => (
                            <AttentionRow key={loan.id} loan={loan} last={i === attention.length - 1} onPress={() => navigate(`/loans/${loan.id}`)} />
                        ))}
                    </div>
                )}

                {/* Pagos recientes */}
                {recentPayments?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-4 pt-4 pb-2">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Pagos recientes</p>
                            <button onClick={() => navigate('/collections')} className="text-sm text-blue-500">Ver todos</button>
                        </div>
                        {recentPayments.map((p, i) => (
                            <PaymentRow key={p.id} payment={p} last={i === recentPayments.length - 1} onClick={() => setSelectedPayment(p)} />
                        ))}
                    </div>
                )}

                {/* Acciones rápidas */}
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2 px-1">Acciones rápidas</p>
                    <div className="grid grid-cols-5 gap-2">
                        <QuickAction label="Nuevo préstamo" Icon={CalendarPlus} color="blue" onClick={() => navigate('/new-loan')} />
                        <QuickAction label="Retirar capital" Icon={Banknote} color="red" onClick={() => setShowWithdraw(true)} />
                        <QuickAction label="Inyectar capital" Icon={Banknote} color="green" onClick={() => setShowInject(true)} />
                        <QuickAction label="Nuevo cliente" Icon={UserPlus} color="purple" onClick={() => navigate('/clients/new')} />
                        <QuickAction label="Ver reportes" Icon={FileBarChart} color="amber" onClick={() => navigate('/reports')} />
                    </div>
                </div>
            </div>

            {showWithdraw && (
                <WithdrawCapitalModal
                    wallets={wallets}
                    onClose={() => setShowWithdraw(false)}
                    onDone={() => {
                        setShowWithdraw(false)
                        reload()
                    }}
                />
            )}
            {showBreakdown && (
                <CapitalBreakdownModal
                    breakdown={capitalByMethod}
                    total={availableCapital}
                    onClose={() => setShowBreakdown(false)}
                    onTransfer={() => setShowTransfer(true)}
                />
            )}
            {showTransfer && (
                <TransferCapitalModal
                    breakdown={capitalByMethod}
                    onClose={() => setShowTransfer(false)}
                    onDone={() => {
                        setShowTransfer(false)
                        reload()
                    }}
                />
            )}
            {showInject && (
                <InjectCapitalModal
                    onClose={() => setShowInject(false)}
                    onDone={() => {
                        setShowInject(false)
                        reload()
                    }}
                />
            )}
            {selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
            {showNotifications && (
                <NotificationsModal
                    overdue={overdue}
                    dueSoon={dueSoon}
                    onClose={() => setShowNotifications(false)}
                    onSelectLoan={(id) => {
                        setShowNotifications(false)
                        navigate(`/loans/${id}`)
                    }}
                />
            )}
        </div>
    )
}
