import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcRanking, RANKING_LABELS } from '../utils/ranking'
import { ChevronLeft, Pencil, Plus, CreditCard, CheckCircle, Clock } from 'lucide-react'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: c }, { data: l }, { data: allPayments }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('loans').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').in(
        'loan_id',
        // subconsulta: traer ids de loans de este cliente
        (await supabase.from('loans').select('id').eq('client_id', id)).data?.map(l => l.id) || []
      ),
    ])

    setClient(c)
    setLoans(l || [])
    setPayments(allPayments || [])
  }

  if (!client) return <div className="p-6 text-center text-gray-400 mt-20">Cargando...</div>

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'frozen')
  const paidLoans = loans.filter(l => l.status === 'paid')
  const totalPending = activeLoans.reduce((s, l) => s + (l.amount || 0), 0)
  const totalCollected = payments.reduce((s, p) => s + (p.total_paid || 0), 0)
  const ranking = client.ranking_override || calcRanking(payments, loans)
  const rl = RANKING_LABELS[ranking] || RANKING_LABELS.nuevo
  const lastLoan = loans[0]
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const STATUS = {
    active: { label: 'Activo', color: 'text-green-400 bg-green-900/30', Icon: CheckCircle },
    frozen: { label: 'Congelado', color: 'text-blue-400 bg-blue-900/30', Icon: Clock },
    overdue: { label: 'En mora', color: 'text-red-400 bg-red-900/30', Icon: Clock },
    paid: { label: 'Liquidado', color: 'text-gray-400 bg-gray-700', Icon: CheckCircle },
    agreement: { label: 'Acuerdo especial', color: 'text-amber-400 bg-amber-900/30', Icon: Clock },
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">Detalle del cliente</h1>
        <button onClick={() => navigate(`/clients/${id}`)} className="p-2 bg-gray-800 rounded-xl">
          <Pencil size={16} className="text-gray-300" />
        </button>
      </div>

      {/* Perfil */}
      <div className="mx-4 bg-gray-800 rounded-2xl p-5 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-900/50 text-blue-300 font-bold text-xl flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{client.name}</p>
          {client.phone && <p className="text-gray-400 text-sm">{client.phone}</p>}
          {client.cedula && <p className="text-gray-400 text-sm">CC {client.cedula}</p>}
          {client.address && <p className="text-gray-500 text-xs mt-1">{client.address}</p>}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${rl.color} shrink-0`}>
          {rl.emoji} {rl.label}
        </span>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 mx-4 mb-4">
        <StatCard label="Saldo pendiente" value={formatCOP(totalPending)} color="text-white" />
        <StatCard label="Total cobrado" value={formatCOP(totalCollected)} color="text-green-400" />
        <StatCard label="Préstamos activos" value={activeLoans.length} color="text-blue-400" />
        <StatCard label="Liquidados" value={paidLoans.length} color="text-gray-400" />
      </div>

      {/* Último préstamo */}
      {lastLoan && (
        <div className="mx-4 bg-gray-800 rounded-2xl p-4 mb-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Último préstamo</p>
          <InfoRow label="Monto" value={formatCOP(lastLoan.amount)} />
          <InfoRow label="Interés" value={`${lastLoan.interest_rate}%`} />
          <InfoRow label="Frecuencia" value={lastLoan.frequency} />
          <InfoRow label="Fecha" value={new Date(lastLoan.created_at).toLocaleDateString('es-CO')} />
        </div>
      )}

      {/* Acciones */}
      <div className="mx-4 grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => navigate(`/new-loan?clientId=${id}`)}
          className="bg-blue-600 rounded-2xl p-3 flex items-center gap-2 text-white text-sm font-medium active:scale-95 transition"
        >
          <Plus size={16} /> Nuevo préstamo
        </button>
        <button
          onClick={() => navigate(`/clients/${id}`)}
          className="bg-gray-700 rounded-2xl p-3 flex items-center gap-2 text-white text-sm font-medium active:scale-95 transition"
        >
          <Pencil size={16} /> Editar cliente
        </button>
      </div>

      {/* Lista de préstamos */}
      <div className="mx-4 bg-gray-800 rounded-2xl overflow-hidden">
        <p className="font-semibold text-gray-200 px-4 pt-4 pb-2">Historial de préstamos</p>
        {loans.length === 0 ? (
          <p className="text-sm text-gray-500 px-4 pb-4">Sin préstamos registrados</p>
        ) : (
          loans.map((loan, i) => {
            const cfg = STATUS[loan.status] || STATUS.active
            return (
              <button
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-700 transition ${i < loans.length - 1 ? 'border-b border-gray-700' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  <CreditCard size={14} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{formatCOP(loan.amount)}</p>
                  <p className="text-xs text-gray-500">{new Date(loan.created_at).toLocaleDateString('es-CO')} · {loan.frequency}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                  {cfg.label}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-100 font-medium capitalize">{value}</span>
    </div>
  )
}