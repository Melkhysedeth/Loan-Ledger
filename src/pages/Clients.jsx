import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcRanking, RANKING_LABELS, RANKING_OPTIONS } from '../utils/ranking'
import { calcNextPaymentDate, classifyLoan } from '../utils/loanCalc'
import useLongPress from '../hooks/useLongPress'
import ContextMenu from '../components/ContextMenu'
import ConfirmModal from '../components/ConfirmModal'
import {
  Users, UserPlus, Search, SlidersHorizontal, ChevronRight, Plus, Bell
} from 'lucide-react'

const AVATAR_COLORS = ['#F9C6D9', '#C9B8E8', '#FFE2A8', '#A8E0DE', '#B9E4C9', '#F7B9A6', '#B8D0F0']

function getAvatarColor(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ── Filtros de estado de cliente ──────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'Todos', icon: Users },
  { key: 'ok', label: 'Al día', dot: 'bg-green-500' },
  { key: 'soon', label: 'Próximos a vencer', dot: 'bg-amber-500' },
  { key: 'overdue', label: 'En mora', dot: 'bg-red-500' },
]

const CLIENT_STATUS_LABELS = {
  ok: { label: 'Al día', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' },
  today: { label: 'Pago hoy', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
  soon: { label: 'Próximo a vencer', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
  overdue: { label: 'En mora', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' },
  none: { label: 'Sin préstamos', color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
}

// Severidad para elegir el "peor" estado entre los préstamos activos de un cliente
const SEVERITY = { ok: 0, today: 1, soon: 1, overdue: 2 }

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)

    // Traer clientes, préstamos y pagos del usuario autenticado (RLS filtra automáticamente)
    const [{ data: allClients }, { data: allLoans }, { data: allPayments }] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('loans').select('*'),
      supabase.from('payments').select('*'),
    ])

    const enriched = (allClients || []).map(client => {
      const loans = (allLoans || []).filter(l => l.client_id === client.id)
      const activeLoans = loans.filter(l => ['active', 'agreement', 'overdue', 'frozen'].includes(l.status))
      const payments = (allPayments || []).filter(p => loans.some(l => l.id === p.loan_id))

      const totalLoaned = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0)

      const totalPaid = activeLoans.reduce((sum, l) => {
        const paid = payments
          .filter(p => p.loan_id === l.id)
          .reduce((s, p) => s + Number(p.capital_paid || 0), 0)
        return sum + paid
      }, 0)

      const totalPending = activeLoans.reduce((sum, l) => {
        const paid = payments
          .filter(p => p.loan_id === l.id)
          .reduce((s, p) => s + Number(p.capital_paid || 0), 0) + Number(l.initial_capital_paid || 0)
        return sum + (Number(l.amount || 0) - paid)
      }, 0)

      // ── Próximo pago / vencido desde: el peor estado entre préstamos activos ──
      let worstStatus = activeLoans.length === 0 ? 'none' : 'ok'
      let nextDate = null

      for (const l of activeLoans) {
        const loanPayments = payments.filter(p => p.loan_id === l.id)
        const paymentsMade = loanPayments.length
        const next = calcNextPaymentDate(l.first_payment_date, l.frequency, paymentsMade)
        const cls = classifyLoan(l.first_payment_date, l.frequency, paymentsMade)

        if ((SEVERITY[cls] ?? 0) > (SEVERITY[worstStatus] ?? -1)) {
          worstStatus = cls
          nextDate = next
        } else if (worstStatus === cls && next) {
          // Si hay empate, mostrar la fecha más próxima/antigua
          if (!nextDate || next < nextDate) nextDate = next
        }
      }

      const ranking = client.ranking_override || calcRanking(payments, loans)

      return {
        ...client,
        loans,
        activeLoans,
        totalLoaned,
        totalPaid,
        totalPending,
        ranking,
        clientStatus: worstStatus,
        nextDate,
      }
    })

    setClients(enriched)
    setLoading(false)
  }

  function handleEditClient(client) {
    navigate(`/clients/${client.id}`)
  }

  async function handleDeleteClient(clientId) {
    await supabase.from('clients').delete().eq('id', clientId)
    await loadClients()
  }

  const filtered = clients.filter(c => {
    if (c.activeLoans.length === 0) return false

    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.cedula && c.cedula.includes(search))

    if (!matchesSearch) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'soon') return c.clientStatus === 'soon' || c.clientStatus === 'today'
    return c.clientStatus === statusFilter
  })

  return (
    <div className="p-4 pb-24 bg-[#f3f4f6]">
      {/* Hero magenta */}
      <div className="sticky top-0 z-20 overflow-hidden -mx-4 -mt-4 px-4 pt-6 pb-10 bg-[#eeaade]">
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

          <h1 className="text-2xl font-bold text-gray-900 mt-3">Clientes</h1>
          <p className="text-xs text-gray-800/70 mb-4">Gestiona y consulta tus clientes</p>

          {/* Métricas */}
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-800/70">Clientes con préstamo</p>
              <p className="text-xl font-bold text-gray-900">
                {clients.filter(c => c.activeLoans.length > 0).length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-800/70">Préstamos activos</p>
              <p className="text-xl font-bold text-gray-900">
                {clients.reduce((s, c) => s + c.activeLoans.length, 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-800/70">Cartera pendiente</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCOP(clients.reduce((s, c) => s + c.totalPending, 0))}
              </p>
            </div>
          </div>

          {/* Onda decorativa (solo línea, no borde) */}
          <svg className="w-full h-4 mt-3" viewBox="0 0 400 20" preserveAspectRatio="none">
            <path d="M0,10 Q50,20 100,10 T200,10 T300,10 T400,10" fill="none" stroke="rgba(255, 255, 255, 0.87)" strokeWidth="2" />
          </svg>

          {/* Buscador — sigue sobre el color */}
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="w-full border-none bg-white/45 rounded-full pl-9 pr-3 py-2 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/30"
                placeholder="Buscar por nombre o cédula..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="bg-white/45 rounded-xl px-3 flex items-center justify-center text-gray-700">
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Filtros de estado — siguen sobre el color */}
          <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-1 px-1 scrollbar-hide">
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition
                  ${active
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white/45 text-gray-700 border-transparent'}`}
                >
                  {f.icon ? <f.icon size={14} /> : <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Botón Nuevo cliente */}
          <button
            onClick={() => navigate('/clients/new')}
            className="w-full mt-3 mb-2 bg-gray-900 text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <UserPlus size={18} /> Nuevo cliente
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#f3f4f6] dark:bg-gray-900 rounded-t-[2rem] shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.25)] dark:shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.6)]" />
      </div>

      {/* Contenido blanco */}
      <div className="bg-[#f3f4f6] dark:bg-gray-900 rounded-t-[1.8rem] pt-4 -mx-4 px-4 relative z-10">

        {loading && <p className="text-center text-gray-400 mt-10">Cargando...</p>}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-400 mt-16">
            <Users size={40} className="mx-auto mb-2 opacity-40" />
            <p>No hay clientes aún</p>
            <button onClick={() => navigate('/clients/new')} className="mt-4 text-blue-500 font-semibold">
              Crear el primero
            </button>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((client, i) => (
            <ClientCard
              key={client.id}
              client={client}
              onRefresh={loadClients}
              onPress={() => navigate(`/clients/${client.id}/detail`)}
              onEdit={handleEditClient}
              onDeleted={handleDeleteClient}
              even={i % 2 === 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ClientCard({ client, onRefresh, onPress, onEdit, onDeleted, even }) {
  const ranking = RANKING_LABELS[client.ranking] || RANKING_LABELS.nuevo
  const status = CLIENT_STATUS_LABELS[client.clientStatus] || CLIENT_STATUS_LABELS.none
  const [editingRanking, setEditingRanking] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)

  const longPress = useLongPress((rect) => {
    setAnchorRect(rect)
    setMenuOpen(true)
  }, 500)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)

  function handleEdit() {
    setMenuOpen(false)
    onEdit(client)
  }

  function handleDeleteRequest() {
    setMenuOpen(false)
    if (client.loans.length > 0) {
      setBlockedOpen(true)
    } else {
      setConfirmOpen(true)
    }
  }

  async function handleConfirmDelete() {
    await onDeleted(client.id)
    setConfirmOpen(false)
  }

  async function handleRankingChange(value) {
    await supabase.from('clients').update({ ranking_override: value }).eq('id', client.id)
    setEditingRanking(false)
    onRefresh()
  }

  const isOverdue = client.clientStatus === 'overdue'

  return (
    <>
      <div className={`${even ? 'bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800/60'} rounded-2xl shadow-md p-4 active:scale-95 transition`} {...longPress}>
        <div className="flex justify-between items-start mb-2" onClick={onPress}>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-gray-900 shrink-0"
              style={{ backgroundColor: getAvatarColor(client.id) }}
            >
              {getInitials(client.name)}
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-100">{client.name}</p>
              <p className="text-xs text-gray-400">{client.phone} {client.cedula ? `· ${client.cedula}` : ''}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
            {client.clientStatus !== 'none' && (
              <span className={`w-1.5 h-1.5 rounded-full ${client.clientStatus === 'overdue' ? 'bg-red-500'
                : client.clientStatus === 'ok' ? 'bg-green-500'
                  : 'bg-amber-500'
                }`} />
            )}
            {status.label}
          </span>
        </div>

        <div className="flex justify-between text-sm mb-1" onClick={onPress}>
          <div>
            <p className="text-xs text-gray-400">Saldo pendiente</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{formatCOP(client.totalPending)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Préstamos activos</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{client.activeLoans.length}</p>
          </div>
        </div>

        {client.activeLoans.length > 0 && (
          <div className="flex justify-between items-end text-sm pt-3 mt-2 border-t border-gray-100 dark:border-gray-700" onClick={onPress}>
            <div>
              <p className="text-xs text-gray-400">Total prestado</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200">{formatCOP(client.totalLoaned)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="font-semibold text-green-600 dark:text-green-400">{formatCOP(client.totalPaid)}</p>
            </div>
            <div className="text-right flex items-center gap-1">
              <div>
                <p className="text-xs text-gray-400">{isOverdue ? 'Vencido desde' : 'Próximo pago'}</p>
                <p className={`font-semibold ${isOverdue ? 'text-red-500' : 'text-blue-500 dark:text-blue-400'}`}>
                  {client.nextDate ? client.nextDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          {editingRanking ? (
            <div className="flex gap-2 flex-wrap mt-1">
              {RANKING_OPTIONS.map(r => {
                const rl = RANKING_LABELS[r]
                return (
                  <button
                    key={r}
                    onClick={() => handleRankingChange(r)}
                    className={`text-xs px-2 py-1 rounded-full font-semibold border flex items-center gap-1 ${rl.color}`}
                  >
                    <rl.Icon size={12} /> {rl.label}
                  </button>
                )
              })}
              <button onClick={() => setEditingRanking(false)} className="text-xs text-gray-400 px-2 py-1">Cancelar</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${ranking.color}`}>
                <ranking.Icon size={12} /> {ranking.label}
              </span>
              <button onClick={() => setEditingRanking(true)} className="text-xs text-blue-500">
                Cambiar ranking
              </button>
            </div>
          )}
        </div>
      </div>

      <ContextMenu
        open={menuOpen}
        anchorRect={anchorRect}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onClose={() => setMenuOpen(false)}
      />
      <ConfirmModal
        open={confirmOpen}
        mode="confirm"
        message="Esta acción eliminará el cliente de forma permanente. No se puede deshacer."
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmOpen(false)}
      />
      <ConfirmModal
        open={blockedOpen}
        mode="blocked"
        message="Este cliente tiene préstamos registrados. Para eliminarlo, primero debes eliminar o resolver sus préstamos asociados."
        onClose={() => setBlockedOpen(false)}
      />
    </>
  )
}