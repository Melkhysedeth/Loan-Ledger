import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcRanking, RANKING_LABELS, RANKING_OPTIONS } from '../utils/ranking'

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
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
      const activeLoans = loans.filter(l => l.status === 'active')
      const payments = (allPayments || []).filter(p => loans.some(l => l.id === p.loan_id))

      const totalPending = activeLoans.reduce((sum, l) => {
        const paid = payments
          .filter(p => p.loan_id === l.id)
          .reduce((s, p) => s + (p.capital_paid || 0), 0)
        return sum + (l.amount - paid)
      }, 0)

      const ranking = client.ranking_override || calcRanking(payments, loans)

      return { ...client, loans, activeLoans, totalPending, ranking }
    })

    setClients(enriched)
    setLoading(false)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.cedula && c.cedula.includes(search))
  )

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Clientes</h1>
        <button
          onClick={() => navigate('/clients/new')}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow active:scale-95 transition"
        >
          + Nuevo
        </button>
      </div>

      <input
        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 mb-4 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Buscar por nombre o cédula..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading && <p className="text-center text-gray-400 mt-10">Cargando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center text-gray-400 mt-16">
          <p className="text-4xl mb-2">👥</p>
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
          />
        ))}
      </div>
    </div>
  )
}

function ClientCard({ client, onRefresh, onPress }) {
  const ranking = RANKING_LABELS[client.ranking] || RANKING_LABELS.nuevo
  const [editingRanking, setEditingRanking] = useState(false)

  async function handleRankingChange(value) {
    await supabase.from('clients').update({ ranking_override: value }).eq('id', client.id)
    setEditingRanking(false)
    onRefresh()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 active:scale-95 transition">
      <div className="flex justify-between items-start mb-2" onClick={onPress}>
        <div>
          <p className="font-bold text-gray-800 dark:text-gray-100">{client.name}</p>
          <p className="text-xs text-gray-400">{client.phone} {client.cedula ? `· ${client.cedula}` : ''}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ranking.color}`}>
          {ranking.emoji} {ranking.label}
        </span>
      </div>

      <div className="flex justify-between text-sm mb-3" onClick={onPress}>
        <div>
          <p className="text-xs text-gray-400">Saldo pendiente</p>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{formatCOP(client.totalPending)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Préstamos activos</p>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{client.activeLoans.length}</p>
        </div>
      </div>

      {editingRanking ? (
        <div className="flex gap-2 flex-wrap mt-1">
          {RANKING_OPTIONS.map(r => {
            const rl = RANKING_LABELS[r]
            return (
              <button
                key={r}
                onClick={() => handleRankingChange(r)}
                className={`text-xs px-2 py-1 rounded-full font-semibold border ${rl.color}`}
              >
                {rl.emoji} {rl.label}
              </button>
            )
          })}
          <button onClick={() => setEditingRanking(false)} className="text-xs text-gray-400 px-2 py-1">Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setEditingRanking(true)} className="text-xs text-blue-500 mt-1">
          Cambiar ranking
        </button>
      )}
    </div>
  )
}