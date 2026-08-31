import { useNavigate } from 'react-router-dom'
import Carousel from '../components/Carousel'
import {
    Bell, ShoppingBag, DollarSign, Wallet, Box, Plus, UserPlus,
    PackagePlus, Banknote, FileText, MoreHorizontal, ChevronRight,
    ArrowUp, ArrowDown, Calendar, Info, ShoppingCart,
} from 'lucide-react'

// ---------------------------------------------------------------------
// DATOS DE EJEMPLO (mock) — solo para maquetar la interfaz.
// Cuando conectemos la base de datos, esto se reemplaza por el fetch real.
// ---------------------------------------------------------------------
const MOCK = {
    userName: 'Juan',
    week: 34,
    dateRange: '17 - 23 Ago 2025',
    cutoffLabel: 'Domingo 23:59',
    weeklyGoal: { current: 87, target: 100 },
    stats: [
        { key: 'ventas', label: 'Ventas\nsemana', value: '$480.000', trend: 18, trendLabel: 'vs sem. 33', direction: 'up', good: true },
        { key: 'ganancia', label: 'Ganancia\nreal', value: '$132.000', trend: 24, trendLabel: 'vs sem. 33', direction: 'up', good: true },
        { key: 'cobrar', label: 'Por\ncobrar', value: '$185.000', trend: 5, trendLabel: 'vs sem. 33', direction: 'up', good: false },
        { key: 'inventario', label: 'Inventario', value: '$920.000', trend: 8, trendLabel: 'vs sem. 33', direction: 'down', good: null },
        { key: 'pv', label: 'PV\nacumulado', value: '87 PV', trend: 13, trendLabel: 'PV', direction: 'up', good: true },
    ],
    bonus: {
        amount: '$64.500',
        pct: 78,
        note: 'Estimación según tu actividad registrada',
    },
    chart: {
        yLabels: ['700k', '525k', '350k', '175k', '0'],
        points: [
            { label: 'Sem. 31', value: 350 },
            { label: 'Sem. 32', value: 400 },
            { label: 'Sem. 33', value: 520 },
            { label: 'Sem. 34', value: 480 },
        ],
        maxValue: 700,
        lastValueLabel: '$480.000',
    },
    quickActions: [
        { key: 'venta', label: 'Nueva venta', Icon: Plus, bg: '#dbeafe', color: '#2563eb' },
        { key: 'cliente', label: 'Nuevo cliente', Icon: UserPlus, bg: '#dcfce7', color: '#16a34a' },
        { key: 'stock', label: 'Agregar stock', Icon: PackagePlus, bg: '#ffedd5', color: '#ea580c' },
        { key: 'pago', label: 'Registrar pago', Icon: Banknote, bg: '#f3e8ff', color: '#9333ea' },
        { key: 'gasto', label: 'Gasto', Icon: FileText, bg: '#d1fae5', color: '#059669' },
        { key: 'mas', label: 'Más', Icon: MoreHorizontal, bg: '#f3f4f6', color: '#6b7280' },
    ],
    movements: [
        {
            key: 1,
            Icon: ShoppingCart,
            iconBg: '#dcfce7',
            iconColor: '#16a34a',
            title: 'Venta a María Pérez',
            subtitle: 'Collagen + Thermo T3',
            amount: '+$85.000',
            positive: true,
            when: 'Hoy, 9:30 a.m.',
        },
        {
            key: 2,
            Icon: Wallet,
            iconBg: '#ffedd5',
            iconColor: '#ea580c',
            title: 'Pago recibido de Juan Pérez',
            subtitle: 'Pago parcial',
            amount: '+$40.000',
            positive: true,
            when: 'Ayer, 6:15 p.m.',
        },
        {
            key: 3,
            Icon: Box,
            iconBg: '#f3e8ff',
            iconColor: '#9333ea',
            title: 'Compra de inventario',
            subtitle: 'Pack Premium',
            amount: '-$320.000',
            positive: false,
            when: '15 Ago, 11:20 a.m.',
        },
    ],
}

const STAT_ICON_MAP = {
    ventas: { Icon: ShoppingBag, bg: '#dbeafe', color: '#2563eb' },
    ganancia: { Icon: DollarSign, bg: '#dcfce7', color: '#16a34a' },
    cobrar: { Icon: Wallet, bg: '#fef9c3', color: '#ca8a04' },
    inventario: { Icon: Box, bg: '#f3e8ff', color: '#9333ea' },
}

// Cuánto del banner de bono queda "metido" dentro del hero azul (debe
// coincidir con el -marginTop del banner para que quede a la mitad).
const HERO_OVERLAP_PX = 56
// Aire entre el fondo de las stat cards y el banner de bono, sin mover el
// punto donde termina el azul del hero respecto al banner.
const STATS_TO_BANNER_GAP_PX = 22

function chunk(arr, size) {
    const out = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

export default function FuxionHub() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#f3f4f6]">
            {/* =========================================================
                BLOQUE FIJO: header + semana/meta + stats + mitad del banner.
                Todo esto no se mueve al hacer scroll del contenido de abajo.
               ========================================================= */}
            <div className="sticky top-0 z-30">
                <div
                    className="px-5 pt-6 rounded-b-[28px]"
                    style={{
                        background: 'linear-gradient(180deg, #0087cd 0%, #005a86 100%)',
                        paddingBottom: STATS_TO_BANNER_GAP_PX + HERO_OVERLAP_PX,
                    }}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-white font-black text-xl tracking-tight">
                            Fu<span className="text-orange-400">X</span>ion
                        </p>
                        <div className="flex items-center gap-3">
                            <p className="text-white text-sm font-semibold">¡Hola, {MOCK.userName}! 👋</p>
                            <button className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-95 transition">
                                <Bell size={16} color="white" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start justify-between mt-5 gap-3">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-bold text-[15px]">Semana {MOCK.week}</span>
                                <span className="flex items-center gap-1 bg-white/15 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                                    <Calendar size={12} />
                                    {MOCK.dateRange}
                                </span>
                            </div>
                            <p className="flex items-center gap-1 text-blue-200 text-xs mt-2">
                                Próximo corte: {MOCK.cutoffLabel}
                                <Info size={12} />
                            </p>
                        </div>

                        <div className="bg-white/15 rounded-2xl px-3.5 py-2.5 shrink-0">
                            <p className="flex items-center gap-1.5 text-white text-xs font-semibold whitespace-nowrap">
                                <span className="text-yellow-400 text-sm">★</span> Meta semanal
                            </p>
                            <p className="text-white font-black text-sm mt-0.5">
                                {MOCK.weeklyGoal.current} / {MOCK.weeklyGoal.target} PV
                            </p>
                            <div className="w-full h-1 rounded-full bg-white/25 mt-1.5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-white"
                                    style={{ width: `${Math.min(100, (MOCK.weeklyGoal.current / MOCK.weeklyGoal.target) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats: ahora en carrusel de a 2 por vista, dentro del hero */}
                    <div className="mt-5">
                        <Carousel>
                            {chunk(MOCK.stats, 2).map((group, gi) => (
                                <div key={gi} className="grid grid-cols-2 gap-3">
                                    {group.map((s) => {
                                        const isPv = s.key === 'pv'
                                        const iconInfo = STAT_ICON_MAP[s.key]
                                        const trendColor =
                                            s.good === true ? 'text-green-600' : s.good === false ? 'text-red-500' : 'text-gray-500'
                                        return (
                                            <div
                                                key={s.key}
                                                className="rounded-2xl p-3 bg-white flex items-center gap-3"
                                                style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)' }}
                                            >
                                                {isPv ? (
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-600">
                                                        <span className="text-white text-xs font-black">PV</span>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                                                        style={{ background: iconInfo.bg }}
                                                    >
                                                        <iconInfo.Icon size={20} color={iconInfo.color} />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-gray-500 leading-tight truncate">{s.label.replace(/\n/g, ' ')}</p>
                                                    <p className="text-[15px] font-black text-gray-900 mt-0.5">{s.value}</p>
                                                    <div className={`flex items-center gap-0.5 mt-0.5 text-[11px] font-semibold ${trendColor}`}>
                                                        {s.direction === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                                                        {s.trend}{s.trendLabel === 'PV' ? ' PV' : '%'} {s.trendLabel !== 'PV' && s.trendLabel}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </Carousel>
                    </div>
                </div>

                {/* Banner de bono: sube sobre el hero exactamente HERO_OVERLAP_PX,
                    así su mitad superior queda sobre el azul y la mitad inferior
                    sobre el gris de la página. Sigue dentro del bloque sticky. */}
                <button
                    onClick={() => navigate('/fuxion/bonus')}
                    className="w-[calc(100%-2.5rem)] mx-5 text-left rounded-3xl p-5 flex items-center justify-between active:scale-[0.99] transition"
                    style={{
                        marginTop: -HERO_OVERLAP_PX,
                        background: 'linear-gradient(135deg, #57a45b 0%, #2f5c32 100%)',
                        boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 20px -6px rgba(29,78,216,0.35)',
                    }}
                >
                    <div className="min-w-0 pr-3">
                        <p className="text-sm text-green-100 font-medium">Bono estimado esta semana</p>
                        <p className="text-[28px] font-black text-white mt-1 leading-none">{MOCK.bonus.amount}</p>
                        <p className="text-[11px] text-green-100/80 mt-2">{MOCK.bonus.note}</p>
                    </div>
                    <div className="relative w-[72px] h-[72px] shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 72 72" className="w-[72px] h-[72px] -rotate-90">
                            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                            <circle
                                cx="36" cy="36" r="30" fill="none" stroke="#ffffff" strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 30}
                                strokeDashoffset={2 * Math.PI * 30 * (1 - MOCK.bonus.pct / 100)}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-white font-black text-base leading-none">{MOCK.bonus.pct}%</span>
                            <span className="text-green-100 text-[9px] mt-1">de la meta</span>
                        </div>
                        <ChevronRight size={16} className="absolute -right-4 text-green-100" />
                    </div>
                </button>
            </div>

            {/* =========================================================
                CONTENIDO QUE SCROLLEA debajo del bloque fijo.
               ========================================================= */}
            <div className="px-5 space-y-4 pb-6 pt-6">
                {/* Gráfico */}
                <div className="rounded-3xl p-4 bg-white" style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[15px] font-bold text-gray-900">Ventas de las últimas 4 semanas</p>
                        <button onClick={() => navigate('/fuxion/sales')} className="text-xs font-semibold text-blue-600 shrink-0">
                            Ver detalle
                        </button>
                    </div>
                    <ChartMock data={MOCK.chart} />
                </div>

                {/* Acciones rápidas */}
                <div>
                    <p className="text-[15px] font-bold text-gray-900 mb-3">Acciones rápidas</p>
                    <div className="grid grid-cols-3 gap-3">
                        {MOCK.quickActions.map((a) => (
                            <button
                                key={a.key}
                                onClick={() => navigate(`/fuxion/${a.key}`)}
                                className="flex flex-col items-center gap-2 active:scale-95 transition"
                            >
                                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: a.bg }}>
                                    <a.Icon size={20} color={a.color} />
                                </div>
                                <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{a.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Últimos movimientos */}
                <div className="rounded-3xl p-4 bg-white" style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[15px] font-bold text-gray-900">Últimos movimientos</p>
                        <button onClick={() => navigate('/fuxion/movements')} className="text-xs font-semibold text-blue-600">
                            Ver todos
                        </button>
                    </div>
                    <div>
                        {MOCK.movements.map((m) => (
                            <button
                                key={m.key}
                                className="w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-0 active:opacity-70 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                                        style={{ background: m.iconBg }}
                                    >
                                        <m.Icon size={18} color={m.iconColor} />
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{m.subtitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${m.positive ? 'text-green-600' : 'text-red-500'}`}>{m.amount}</p>
                                        <p className="text-[10px] text-gray-400">{m.when}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ChartMock({ data }) {
    const width = 300
    const height = 140
    const paddingLeft = 34
    const paddingRight = 10
    const paddingTop = 30
    const paddingBottom = 20
    const plotW = width - paddingLeft - paddingRight
    const plotH = height - paddingTop - paddingBottom

    const points = data.points.map((p, i) => ({
        ...p,
        x: paddingLeft + (i * plotW) / (data.points.length - 1),
        y: paddingTop + plotH - (p.value / data.maxValue) * plotH,
    }))
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const last = points[points.length - 1]
    const areaPath = `${linePath} L ${last.x} ${paddingTop + plotH} L ${points[0].x} ${paddingTop + plotH} Z`

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {data.yLabels.map((label, i) => {
                const y = paddingTop + (i * plotH) / (data.yLabels.length - 1)
                return (
                    <g key={i}>
                        <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{label}</text>
                    </g>
                )
            })}

            <path d={areaPath} fill="#2563eb" opacity="0.08" />
            <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4.5 : 3.5} fill="#2563eb" />
            ))}

            <g>
                <rect x={last.x - 34} y={last.y - 26} width="68" height="18" rx="9" fill="#0f172a" />
                <text x={last.x} y={last.y - 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
                    {data.lastValueLabel}
                </text>
            </g>

            {points.map((p, i) => (
                <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="9.5" fill="#9ca3af">
                    {p.label}
                </text>
            ))}
        </svg>
    )
}