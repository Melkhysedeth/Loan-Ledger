import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function StatusDonut({ distribution }) {
    const total = distribution.reduce((s, d) => s + d.count, 0)
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Distribución de estado</p>
            {total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Sin préstamos registrados aún</p>
            ) : (
                <>
                    <div className="relative flex items-center justify-center" style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    dataKey="count"
                                    nameKey="label"
                                    innerRadius={62}
                                    outerRadius={88}
                                    paddingAngle={2}
                                    stroke="none"
                                >
                                    {distribution.map((d, i) => (
                                        <Cell key={i} fill={d.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{total}</p>
                        </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        {distribution.map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                    <span className="text-gray-600 dark:text-gray-300">{d.label}</span>
                                </div>
                                <span className="text-gray-400 text-xs">{d.count} ({d.pct}%)</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
