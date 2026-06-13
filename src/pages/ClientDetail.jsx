import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP } from '../utils/format'
import { calcRanking, RANKING_LABELS } from '../utils/ranking'
import {
  ChevronLeft, Pencil, Plus, CreditCard,
  CheckCircle, Clock, Phone, MapPin, User, MessageCircle
} from 'lucide-react'
import { SkeletonStats, SkeletonList, SkeletonCard } from '../components/SkeletonLoader'

const STATUS = {
  active: { label: 'Activo', color: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30', Icon: CheckCircle },
  frozen: { label: 'Congelado', color: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30', Icon: Clock },
  overdue: { label: 'En mora', color: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30', Icon: Clock },
  paid: { label: 'Liquidado', color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700', Icon: CheckCircle },
  agreement: { label: 'Acuerdo especial', color: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30', Icon: Clock },
}

const TABS = ['Información', 'Préstamos', 'Pagos']

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: c }, { data: l }, { data: allPayments }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('loans').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').in(
        'loan_id',
        (await supabase.from('loans').select('id').eq('client_id', id)).data?.map(l => l.id) || []
      ),
    ])
    setClient(c)
    setLoans(l || [])
    setPayments(allPayments || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="px-4 pt-6 space-y-4 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
      <SkeletonCard lines={4} />
      <SkeletonStats />
      <SkeletonList rows={3} />
    </div>
  )

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'frozen')
  const paidLoans = loans.filter(l => l.status === 'paid')
  const totalPending = activeLoans.reduce((s, l) => s + (l.amount || 0), 0)
  const totalCollected = payments.reduce((s, p) => s + (p.total_paid || 0), 0)
  const ranking = client.ranking_override || calcRanking(payments, loans)
  const rl = RANKING_LABELS[ranking] || RANKING_LABELS.nuevo
  const lastLoan = loans[0]
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  function enviarRecordatorio(client) {
    if (!client?.phone) { alert('Este cliente no tiene teléfono registrado'); return }
    const phone = client.phone.replace(/\D/g, '')
    const fullPhone = phone.startsWith('57') && phone.length === 12 ? phone : `57${phone}`
    const mensaje = `Hola ${client.name}, te recordamos que tienes un pago pendiente. Por favor contáctanos para coordinar. 🙏`
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  return (
    <div className="pb-10 min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent active:scale-95 transition"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">Detalle del cliente</h1>
        <button
          onClick={() => navigate(`/clients/${id}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent active:scale-95 transition"
        >
          <Pencil size={15} />
        </button>
      </div>

      {/* ── Perfil ── */}
      <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold text-xl flex items-center justify-center shrink-0 border-2 border-blue-200 dark:border-blue-700/40">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 dark:text-white font-bold text-lg leading-tight truncate">{client.name}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${rl.color}`}>
              {rl.emoji} {rl.label}
            </span>
            <div className="mt-2 space-y-1">
              {client.phone && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm">
                  <Phone size={13} /><span>{client.phone}</span>
                </div>
              )}
              {client.cedula && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm">
                  <User size={13} /><span>CC {client.cedula}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs">
                  <MapPin size={12} /><span className="truncate">{client.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 mx-4 mb-4">
        <StatCard label="Total prestado" value={formatCOP(totalPending)} accent="text-gray-900 dark:text-white" />
        <StatCard label="Total cobrado" value={formatCOP(totalCollected)} accent="text-green-600 dark:text-green-400" sub={`${payments.length} pagos`} />
        <StatCard label="Saldo pendiente" value={formatCOP(totalPending)} accent="text-amber-600 dark:text-amber-400" sub={`${activeLoans.length} préstamo${activeLoans.length !== 1 ? 's' : ''}`} />
        <StatCard label="Préstamos" value={loans.length} accent="text-blue-600 dark:text-blue-400" sub={paidLoans.length > 0 ? `${paidLoans.length} liquidados` : 'Activo'} />
      </div>

      {/* ── Tabs ── */}
      <div className="mx-4 mb-4">
        <div className="flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === i
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 dark:text-gray-400 active:bg-gray-300 dark:active:bg-gray-700'
                }`}
            >
              {t}
              {i === 1 && loans.length > 0 && (
                <span className={`ml-1 text-xs ${tab === 1 ? 'text-blue-200' : 'text-gray-400 dark:text-gray-600'}`}>
                  ({loans.length})
                </span>
              )}
              {i === 2 && payments.length > 0 && (
                <span className={`ml-1 text-xs ${tab === 2 ? 'text-blue-200' : 'text-gray-400 dark:text-gray-600'}`}>
                  ({payments.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 0: Información ── */}
      {tab === 0 && (
        <div className="mx-4 space-y-3">
          <SectionCard title="Información personal" Icon={User}>
            {client.cedula && <InfoRow label="Cédula" value={`CC ${client.cedula}`} />}
            {client.phone && <InfoRow label="Teléfono" value={client.phone} />}
            {client.address && <InfoRow label="Dirección" value={client.address} />}
            {!client.cedula && !client.phone && !client.address && (
              <p className="text-sm text-gray-400 py-1">Sin información adicional</p>
            )}
          </SectionCard>

          {lastLoan && (
            <SectionCard title="Último préstamo" Icon={CreditCard}>
              <InfoRow label="Monto" value={formatCOP(lastLoan.amount)} />
              <InfoRow label="Interés" value={`${lastLoan.interest_rate}%`} />
              <InfoRow label="Frecuencia" value={lastLoan.frequency} />
              <InfoRow label="Fecha" value={new Date(lastLoan.created_at).toLocaleDateString('es-CO')} />
              <div className="pt-2">
                <button
                  onClick={() => navigate(`/loans/${lastLoan.id}`)}
                  className="w-full py-2.5 rounded-xl border border-blue-500 dark:border-blue-600/50 text-blue-600 dark:text-blue-400 text-sm font-medium active:bg-blue-50 dark:active:bg-blue-900/20 transition"
                >
                  Ver préstamo →
                </button>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Tab 1: Préstamos ── */}
      {tab === 1 && (
        <div className="mx-4">
          {loans.length === 0 ? <EmptyState text="Sin préstamos registrados" /> : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent">
              {loans.map((loan, i) => {
                const cfg = STATUS[loan.status] || STATUS.active
                return (
                  <button
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 dark:active:bg-gray-700 transition ${i < loans.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                      }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <CreditCard size={15} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCOP(loan.amount)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(loan.created_at).toLocaleDateString('es-CO')} · {loan.frequency} · {loan.interest_rate}%
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Pagos ── */}
      {tab === 2 && (
        <div className="mx-4">
          {payments.length === 0 ? <EmptyState text="Sin pagos registrados" /> : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent">
              {payments.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < payments.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                    }`}
                >
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                    <CheckCircle size={15} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCOP(p.total_paid)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {p.payment_date
                        ? new Date(p.payment_date).toLocaleDateString('es-CO')
                        : new Date(p.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">Pagado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Acciones ── */}
      <div className="mx-4 grid grid-cols-2 gap-3 mt-5">
        <button
          onClick={() => navigate(`/new-loan?clientId=${id}`)}
          className="bg-blue-600 rounded-2xl py-3 flex items-center justify-center gap-2 text-white text-sm font-medium active:scale-95 transition"
        >
          <Plus size={16} /> Nuevo préstamo
        </button>
        <button
          onClick={() => navigate(`/clients/${id}`)}
          className="bg-gray-200 dark:bg-gray-700 rounded-2xl py-3 flex items-center justify-center gap-2 text-gray-700 dark:text-white text-sm font-medium active:scale-95 transition"
        >
          <Pencil size={15} /> Editar cliente
        </button>
        <button
          onClick={() => enviarRecordatorio(client)}
          className="col-span-2 bg-green-500 rounded-2xl py-3 flex items-center justify-center gap-2 text-white text-sm font-medium active:scale-95 transition"
        >
          <MessageCircle size={16} /> Enviar recordatorio por WhatsApp
        </button>
      </div>
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────

function StatCard({ label, value, accent, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent">
      <p className="text-xs text-gray-400 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Icon size={14} className="text-gray-500 dark:text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start text-sm py-0.5">
      <span className="text-gray-400 dark:text-gray-400 shrink-0 mr-3">{label}</span>
      <span className="text-gray-800 dark:text-gray-100 font-medium capitalize text-right">{value}</span>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-8 text-center shadow-sm dark:shadow-none border border-gray-100 dark:border-transparent">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}