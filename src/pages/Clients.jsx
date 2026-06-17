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
  Users, UserPlus, Search, SlidersHorizontal, ChevronRight, Plus,
} from 'lucide-react'

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
          .reduce((s, p) => s + Number(p.capital_paid || 0), 0)
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
    navigate('/clients/new', { state: { editClient: client } })
  }

  async function handleDeleteClient(clientId) {
    await supabase.from('clients').delete().eq('id', clientId)
    await loadClients()
  }

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.cedula && c.cedula.includes(search))

    if (!matchesSearch) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'soon') return c.clientStatus === 'soon' || c.clientStatus === 'today'
    return c.clientStatus === statusFilter
  })

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users size={22} className="text-blue-500" /> Clientes
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Gestiona y consulta tus clientes</p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition"
        >
          <UserPlus size={16} /> Nuevo
        </button>
      </div>

      {/* Buscador */}
      <div className="flex gap-2 mt-4 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 flex items-center justify-center text-gray-400">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1 scrollbar-hide">
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition
                ${active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
            >
              {f.icon ? <f.icon size={14} /> : <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
              {f.label}
            </button>
          )
        })}
      </div>

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
        {filtered.map(client => (
          <ClientCard
            key={client.id}
            client={client}
            onRefresh={loadClients}
            onPress={() => navigate(`/clients/${client.id}/detail`)}
            onEdit={handleEditClient}
            onDeleted={handleDeleteClient}
          />
        ))}
      </div>
    </div>
  )
}

function ClientCard({ client, onRefresh, onPress, onEdit, onDeleted }) {
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 active:scale-95 transition" {...longPress}>
        <div className="flex justify-between items-start mb-2" onClick={onPress}>
          <div>
            <p className="font-bold text-gray-800 dark:text-gray-100">{client.name}</p>
            <p className="text-xs text-gray-400">{client.phone} {client.cedula ? `· ${client.cedula}` : ''}</p>
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