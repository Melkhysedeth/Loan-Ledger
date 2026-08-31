import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { Bell, Search, Plus, X, Power } from 'lucide-react'

const HERO_BG = '#B8D9A0' // verde salvia — color de identidad del módulo Fuxion

const FILTERS = ['all', 'low', 'out', 'inactive']
const STATUS_CONFIG = {
    all: { label: 'Todos', dot: 'bg-gray-400' },
    low: { label: 'Bajo stock', dot: 'bg-amber-500' },
    out: { label: 'Agotado', dot: 'bg-red-500' },
    inactive: { label: 'Inactivos', dot: 'bg-gray-300' },
}
const LOW_STOCK_THRESHOLD = 5

const emptyForm = {
    name: '', sku: '', category: '', points: '', cost_price: '', list_price: '', stock_quantity: '', unit: 'unidad',
}

export default function FuxionProducts() {
    const navigate = useNavigate()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)

    async function load() {
        setLoading(true)
        const { data } = await supabase
            .from('fuxion_products')
            .select('id, name, sku, category, points, cost_price, list_price, stock_quantity, unit, active')
            .order('name')
        setProducts(data || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    function statusOf(p) {
        if (!p.active) return 'inactive'
        if (p.stock_quantity <= 0) return 'out'
        if (p.stock_quantity <= LOW_STOCK_THRESHOLD) return 'low'
        return 'ok'
    }

    const activeCount = products.filter(p => p.active).length
    const lowStockCount = products.filter(p => p.active && p.stock_quantity <= LOW_STOCK_THRESHOLD).length
    const stockValue = products.reduce((s, p) => s + (p.stock_quantity || 0) * (p.cost_price || 0), 0)

    const filtered = products.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || (p.sku || '').toLowerCase().includes(query.toLowerCase())
        const matchesFilter = filter === 'all' ? true : statusOf(p) === filter
        return matchesQuery && matchesFilter
    })

    function openNew() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
    function openEdit(p) {
        setEditing(p)
        setForm({
            name: p.name || '', sku: p.sku || '', category: p.category || '',
            points: p.points ?? '', cost_price: p.cost_price ?? '', list_price: p.list_price ?? '',
            stock_quantity: p.stock_quantity ?? '', unit: p.unit || 'unidad',
        })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name.trim()) return
        setSaving(true)
        const payload = {
            name: form.name.trim(), sku: form.sku.trim() || null, category: form.category.trim() || null,
            points: Number(form.points) || 0, cost_price: Number(form.cost_price) || 0,
            list_price: Number(form.list_price) || 0, stock_quantity: Number(form.stock_quantity) || 0,
            unit: form.unit || 'unidad',
        }
        if (editing) await supabase.from('fuxion_products').update(payload).eq('id', editing.id)
        else await supabase.from('fuxion_products').insert(payload)
        setSaving(false)
        setModalOpen(false)
        load()
    }

    async function toggleActive(p) {
        await supabase.from('fuxion_products').update({ active: !p.active }).eq('id', p.id)
        load()
    }

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
                            {lowStockCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                                    {lowStockCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mt-3">Productos</h1>
                    <p className="text-xs text-gray-800/70 mb-4">Catálogo, precios y stock de Fuxion</p>

                    <div className="flex justify-between">
                        <div>
                            <p className="text-xs text-gray-800/70">Activos</p>
                            <p className="text-xl font-bold text-gray-900">{activeCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-800/70">Bajo stock</p>
                            <p className="text-xl font-bold text-gray-900">{lowStockCount}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-800/70">Valor en stock</p>
                            <p className="text-xl font-bold text-gray-900">{formatCOP(stockValue)}</p>
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
                                placeholder="Buscar producto o SKU..."
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
                        onClick={openNew}
                        className="w-full mt-3 mb-2 bg-gray-900 text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                        <Plus size={18} /> Nuevo producto
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-8 bg-white dark:bg-gray-900 rounded-t-[1.8rem]" />
            </div>

            <div className="px-4 space-y-3">
                {loading ? (
                    <p className="text-center text-gray-400 mt-16 text-sm">Cargando...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm mt-16">No hay productos {filter !== 'all' ? STATUS_CONFIG[filter].label.toLowerCase() : ''}</p>
                ) : (
                    filtered.map((p) => (
                        <ProductCard key={p.id} product={p} status={statusOf(p)} onPress={() => openEdit(p)} onToggle={() => toggleActive(p)} />
                    ))
                )}
            </div>

            {modalOpen && (
                <ProductModal form={form} setForm={setForm} editing={editing} saving={saving} onClose={() => setModalOpen(false)} onSave={handleSave} />
            )}
        </div>
    )
}

function ProductCard({ product, status, onPress, onToggle }) {
    const dotColor = { ok: 'bg-green-500', low: 'bg-amber-500', out: 'bg-red-500', inactive: 'bg-gray-300' }[status]
    const label = { ok: 'Disponible', low: 'Bajo stock', out: 'Agotado', inactive: 'Inactivo' }[status]

    return (
        <div className={`rounded-2xl p-4 bg-white dark:bg-gray-800 ${status === 'inactive' ? 'opacity-50' : ''}`} style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px -4px rgba(16,24,40,0.08)' }}>
            <div className="flex items-start justify-between gap-2">
                <button onClick={onPress} className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold" style={{ color: '#4a7a2c' }}>{product.sku || product.category || 'Producto'}</p>
                        <span className="flex items-center gap-1 text-xs font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            {label}
                        </span>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-base mt-0.5">{product.name}</p>
                    <div className="flex items-center gap-4 mt-2">
                        <div>
                            <p className="text-[11px] text-gray-400">Precio</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCOP(product.list_price)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400">Stock</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{product.stock_quantity} {product.unit}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400">Puntos</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{product.points} PV</p>
                        </div>
                    </div>
                </button>
                <button onClick={onToggle} className="p-2 rounded-full bg-gray-50 dark:bg-gray-900/40 text-gray-400 shrink-0">
                    <Power size={14} />
                </button>
            </div>
        </div>
    )
}

function ProductModal({ form, setForm, editing, saving, onClose, onSave }) {
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
    return (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white text-base">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    <Field label="Nombre" value={form.name} onChange={set('name')} placeholder="Ej: Berry Boost" />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="SKU" value={form.sku} onChange={set('sku')} placeholder="Opcional" />
                        <Field label="Categoría" value={form.category} onChange={set('category')} placeholder="Opcional" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Costo" value={form.cost_price} onChange={set('cost_price')} type="number" />
                        <Field label="Precio de venta" value={form.list_price} onChange={set('list_price')} type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Puntos (PV)" value={form.points} onChange={set('points')} type="number" />
                        <Field label="Stock" value={form.stock_quantity} onChange={set('stock_quantity')} type="number" />
                    </div>
                    <Field label="Unidad" value={form.unit} onChange={set('unit')} placeholder="unidad, caja, sobre..." />
                    {editing && <p className="text-[11px] text-gray-400">Editar el stock aquí lo corrige manualmente. Para reabastecer con trazabilidad, usa Pedidos.</p>}
                </div>
                <button onClick={onSave} disabled={saving || !form.name.trim()} className="w-full mt-5 py-3 rounded-full text-white font-semibold bg-gray-900 active:scale-95 transition disabled:opacity-50">
                    {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
                </button>
            </div>
        </div>
    )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
        <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</span>
            <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-800 dark:text-white outline-none" />
        </label>
    )
}