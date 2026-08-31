import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { Bell, Search, Plus, X, Trash2 } from 'lucide-react'

const HERO_BG = '#B8D9A0' // verde salvia — color de identidad del módulo Fuxion

const FILTERS = ['all', 'pending', 'partial', 'paid']
const STATUS_CONFIG = {
    all: { label: 'Todas', dot: 'bg-gray-400' },
    pending: { label: 'Pendiente', dot: 'bg-red-500' },
    partial: { label: 'Abonada', dot: 'bg-amber-500' },
    paid: { label: 'Pagada', dot: 'bg-green-500' },
}

export default function FuxionSales() {
    const navigate = useNavigate()
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState('all')
    const [saleModalOpen, setSaleModalOpen] = useState(false)
    const [abonoTarget, setAbonoTarget] = useState(null)

    async function load() {
        setLoading(true)
        const { data } = await supabase
            .from('fuxion_sales')
            .select('id, sale_date, total_amount, amount_paid, balance_due, status, payment_type, clients(name)')
            .order('sale_date', { ascending: false })
        setSales(data || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const totalSalesCount = sales.length
    const pendingCount = sales.filter(s => s.status !== 'paid').length
    const pendingTotal = sales.reduce((s, sale) => s + (sale.balance_due || 0), 0)

    const filtered = sales.filter(s => {
        const matchesQuery = (s.clients?.name || '').toLowerCase().includes(query.toLowerCase())
        const matchesFilter = filter === 'all' ? true : s.status === filter
        return matchesQuery && matchesFilter
    })

    return (
        <div className="pb-24">
            <div className="sticky top-0 z-20 overflow-hidden pt-6 pb-10 px-4" style={{ background: HERO_BG }}>
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
                        <button
                            onClick={() => navigate('/fuxion')}
                            className="relative p-2 bg-black/5 backdrop-blur-sm rounded-full"
                        >
                            <Bell size={20} className="text-gray-900" />
                            {pendingCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mt-3">Ventas</h1>
                    <p className="text-xs text-gray-800/70 mb-4">Ventas y créditos a clientes</p>

                    <div className="flex justify-between">
                        <div>
                            <p className="text-xs text-gray-800/70">Ventas</p>
                            <p className="text-xl font-bold text-gray-900">{totalSalesCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-800/70">Con saldo</p>
                            <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-800/70">Por cobrar</p>
                            <p className="text-xl font-bold text-gray-900">{formatCOP(pendingTotal)}</p>
                        </div>
                    </div>

                    <svg className="w-full h-4 mt-3" viewBox="0 0 400 20" preserveAspectRatio="none">
                        <path d="M0,10 Q50,20 100,10 T200,10 T300,10 T400,10" fill="none" stroke="rgba(255, 255, 255, 0.87)" strokeWidth="2" />
                    </svg>

                    <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                className="w-full border-none bg-white/45 rounded-full pl-9 pr-3 py-2 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/30"
                                placeholder="Buscar cliente..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-1 px-1 scrollbar-hide">
                        {FILTERS.map((f) => {
                            const cfg = STATUS_CONFIG[f]
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition flex items-center gap-1.5
                                        ${filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/45 text-gray-700 border-transparent'}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${filter === f ? 'bg-white' : cfg.dot}`} />
                                    {cfg.label}
                                </button>
                            )
                        })}
                    </div>

                    <button
                        onClick={() => setSaleModalOpen(true)}
                        className="w-full mt-3 mb-2 bg-gray-900 text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                        <Plus size={18} /> Nueva venta
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-8 bg-white dark:bg-gray-900 rounded-t-[1.8rem]" />
            </div>

            <div className="px-4 space-y-3">
                {loading ? (
                    <p className="text-center text-gray-400 mt-16 text-sm">Cargando...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm mt-16">No hay ventas {filter !== 'all' ? STATUS_CONFIG[filter].label.toLowerCase() + 's' : ''}</p>
                ) : (
                    filtered.map((s) => (
                        <SaleCard key={s.id} sale={s} onAbonar={() => setAbonoTarget(s)} />
                    ))
                )}
            </div>

            {saleModalOpen && (
                <NewSaleModal onClose={() => setSaleModalOpen(false)} onSaved={() => { setSaleModalOpen(false); load() }} />
            )}
            {abonoTarget && (
                <AbonoModal sale={abonoTarget} onClose={() => setAbonoTarget(null)} onSaved={() => { setAbonoTarget(null); load() }} />
            )}
        </div>
    )
}

function SaleCard({ sale, onAbonar }) {
    const cfg = STATUS_CONFIG[sale.status] || STATUS_CONFIG.pending
    return (
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800" style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px -4px rgba(16,24,40,0.08)' }}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: '#4a7a2c' }}>{sale.sale_date}</p>
                <span className="flex items-center gap-1 text-xs font-medium">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                </span>
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-base mt-0.5">{sale.clients?.name || 'Cliente eliminado'}</p>
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-[11px] text-gray-400">Total</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCOP(sale.total_amount)}</p>
                    </div>
                    {sale.balance_due > 0 && (
                        <div>
                            <p className="text-[11px] text-gray-400">Pendiente</p>
                            <p className="text-sm font-semibold text-red-500">{formatCOP(sale.balance_due)}</p>
                        </div>
                    )}
                </div>
                {sale.balance_due > 0 && (
                    <button onClick={onAbonar} className="px-3 py-2 rounded-full text-xs font-semibold text-white bg-gray-900 active:scale-95 transition">
                        Abonar
                    </button>
                )}
            </div>
        </div>
    )
}

// ---------- Nueva venta ----------

function NewSaleModal({ onClose, onSaved }) {
    const [clients, setClients] = useState([])
    const [products, setProducts] = useState([])
    const [clientSearch, setClientSearch] = useState('')
    const [selectedClient, setSelectedClient] = useState(null)
    const [items, setItems] = useState([])
    const [paymentType, setPaymentType] = useState('cash')
    const [amountPaid, setAmountPaid] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function loadData() {
            const [{ data: c }, { data: p }] = await Promise.all([
                supabase.from('clients').select('id, name, phone').order('name'),
                supabase.from('fuxion_products').select('id, name, list_price, cost_price, stock_quantity').eq('active', true).order('name'),
            ])
            setClients(c || [])
            setProducts(p || [])
        }
        loadData()
    }, [])

    const filteredClients = clientSearch
        ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
        : []

    function addProduct(p) {
        if (items.find(i => i.product_id === p.id)) return
        setItems(prev => [...prev, {
            product_id: p.id, name: p.name, quantity: 1,
            unit_price: p.list_price, cost_price: p.cost_price, stock_quantity: p.stock_quantity,
        }])
    }

    function updateItem(productId, field, value) {
        setItems(prev => prev.map(i => i.product_id === productId ? { ...i, [field]: Number(value) || 0 } : i))
    }

    function removeItem(productId) {
        setItems(prev => prev.filter(i => i.product_id !== productId))
    }

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
    const paid = paymentType === 'cash' ? totalAmount : (Number(amountPaid) || 0)
    const balanceDue = Math.max(0, totalAmount - paid)
    const status = balanceDue <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending'

    const canSave = selectedClient && items.length > 0 && !saving

    async function handleSave() {
        if (!canSave) return
        setSaving(true)

        const { data: sale, error } = await supabase.from('fuxion_sales').insert({
            client_id: selectedClient.id,
            sale_date: new Date().toISOString().split('T')[0],
            total_amount: totalAmount,
            payment_type: paymentType,
            amount_paid: paid,
            balance_due: balanceDue,
            status,
        }).select().single()

        if (error || !sale) { setSaving(false); return }

        await supabase.from('fuxion_sale_items').insert(
            items.map(i => ({
                sale_id: sale.id, product_id: i.product_id,
                quantity: i.quantity, unit_price: i.unit_price, unit_cost: i.cost_price,
            }))
        )

        await Promise.all(items.map(i =>
            supabase.from('fuxion_products')
                .update({ stock_quantity: Math.max(0, i.stock_quantity - i.quantity) })
                .eq('id', i.product_id)
        ))

        setSaving(false)
        onSaved()
    }

    return (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-base">Nueva venta</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700"><X size={16} /></button>
                </div>

                {!selectedClient ? (
                    <div>
                        <div className="relative mb-2">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={clientSearch}
                                onChange={e => setClientSearch(e.target.value)}
                                placeholder="Buscar cliente..."
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-sm outline-none"
                            />
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {filteredClients.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedClient(c)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-white"
                                >
                                    {c.name} {c.phone ? `· ${c.phone}` : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 rounded-xl px-3 py-2 mb-3">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedClient.name}</p>
                        <button onClick={() => setSelectedClient(null)} className="text-xs font-semibold" style={{ color: '#4a7a2c' }}>Cambiar</button>
                    </div>
                )}

                {selectedClient && (
                    <>
                        <p className="text-[11px] font-semibold text-gray-500 mt-3 mb-1">Productos</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {products.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => addProduct(p)}
                                    className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900/40 text-[11px] text-gray-700 dark:text-gray-200"
                                >
                                    + {p.name}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {items.map(i => (
                                <div key={i.product_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-2.5">
                                    <p className="flex-1 text-xs font-semibold text-gray-800 dark:text-white truncate">{i.name}</p>
                                    <input
                                        type="number" value={i.quantity}
                                        onChange={e => updateItem(i.product_id, 'quantity', e.target.value)}
                                        className="w-14 px-2 py-1 rounded-lg text-xs text-center bg-white dark:bg-gray-800"
                                    />
                                    <input
                                        type="number" value={i.unit_price}
                                        onChange={e => updateItem(i.product_id, 'unit_price', e.target.value)}
                                        className="w-20 px-2 py-1 rounded-lg text-xs text-center bg-white dark:bg-gray-800"
                                    />
                                    <button onClick={() => removeItem(i.product_id)} className="text-red-400"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mt-4 mb-2">
                            <span className="text-sm font-bold text-gray-800 dark:text-white">Total</span>
                            <span className="text-lg font-black text-gray-900 dark:text-white">{formatCOP(totalAmount)}</span>
                        </div>

                        <div className="flex gap-2 mb-3">
                            <PayTab label="Contado" active={paymentType === 'cash'} onClick={() => setPaymentType('cash')} />
                            <PayTab label="Crédito" active={paymentType === 'credit'} onClick={() => setPaymentType('credit')} />
                        </div>

                        {paymentType === 'credit' && (
                            <Field label="Abono inicial (opcional)" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                        )}

                        {paymentType === 'credit' && balanceDue > 0 && (
                            <p className="text-[11px] text-red-500 mt-2">Queda pendiente: {formatCOP(balanceDue)}</p>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={!canSave}
                            className="w-full mt-4 py-3 rounded-full text-white font-semibold bg-gray-900 active:scale-95 transition disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Registrar venta'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

function PayTab({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-2 rounded-full text-xs font-semibold transition ${active ? 'text-white bg-gray-900' : 'bg-gray-50 dark:bg-gray-900/40 text-gray-500'}`}
        >
            {label}
        </button>
    )
}

// ---------- Abono ----------

function AbonoModal({ sale, onClose, onSaved }) {
    const [amount, setAmount] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        const value = Number(amount)
        if (!value || value <= 0 || saving) return
        setSaving(true)

        await supabase.from('fuxion_payments').insert({
            sale_id: sale.id, client_id: sale.client_id, amount: value,
            date: new Date().toISOString().split('T')[0],
        })

        const newAmountPaid = (sale.amount_paid || 0) + value
        const newBalance = Math.max(0, sale.total_amount - newAmountPaid)
        const newStatus = newBalance <= 0 ? 'paid' : 'partial'

        await supabase.from('fuxion_sales').update({
            amount_paid: newAmountPaid, balance_due: newBalance, status: newStatus,
        }).eq('id', sale.id)

        setSaving(false)
        onSaved()
    }

    return (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="w-full sm:max-w-sm bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-base">Registrar abono</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700"><X size={16} /></button>
                </div>
                <p className="text-xs text-gray-400 mb-3">Saldo pendiente: <span className="font-semibold text-red-500">{formatCOP(sale.balance_due)}</span></p>
                <Field label="Monto del abono" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                <button
                    onClick={handleSave}
                    disabled={saving || !amount}
                    className="w-full mt-4 py-3 rounded-full text-white font-semibold bg-gray-900 active:scale-95 transition disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar abono'}
                </button>
            </div>
        </div>
    )
}

function Field({ label, value, onChange, type = 'text' }) {
    return (
        <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</span>
            <input
                type={type} value={value} onChange={onChange}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-800 dark:text-white outline-none"
            />
        </label>
    )
}