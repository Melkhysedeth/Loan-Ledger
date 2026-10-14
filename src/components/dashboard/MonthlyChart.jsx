import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCOP } from '../../utils/format'

export default function MonthlyChart({ data }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Resumen mensual</p>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="cobradoFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b5bdb" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#3b5bdb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="prestadoFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                        formatter={(v, name) => [formatCOP(v), name === 'cobrado' ? 'Cobrado' : 'Prestado']}
                        contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', backgroundColor: '#1f2937', color: '#f9fafb', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
                        cursor={{ stroke: '#3b5bdb', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="cobrado"
                        stroke="#3b5bdb"
                        strokeWidth={2.5}
                        fill="url(#cobradoFill)"
                        dot={{ r: 3, fill: '#3b5bdb', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#3b5bdb', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="prestado"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fill="url(#prestadoFill)"
                        dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />Cobrado</div>
                <div className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Prestado</div>
            </div>
        </div>
    )
}
