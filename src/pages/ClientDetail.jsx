import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { formatCOP, formatDate } from '../utils/format'
import { calcRanking, RANKING_LABELS } from '../utils/ranking'
import { activePayments, totalPaidOf, loanCapitalPaid, groupBy } from '../utils/loanMetrics'
import { buildWhatsAppLink } from '../utils/whatsapp'
import { mensajeRecordatorio } from '../utils/whatsappMessages'
import {
  Pencil, Plus, CreditCard, CheckCircle, Phone, MapPin, User, MessageCircle,
} from 'lucide-react'
import { SkeletonStats, SkeletonList, SkeletonCard } from '../components/SkeletonLoader'
import PageHero, { HeroButton, HeroOverlap } from '../components/ui/PageHero'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import { CARD, StatCard, SectionCard, InfoRow, EmptyState } from '../components/ui/Cards'

const TABS = ['Información', 'Préstamos', 'Pagos']

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: c }, { data: l }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('loans').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ])
      const loanIds = (l || []).map(loan => loan.id)
      const { data: p } = loanIds.length
        ? await supabase.from('payments').select('*').in('loan_id', loanIds).order('date', { ascending: false })
        : { data: [] }
      if (cancelled) return
      setClient(c)
      setLoans(l || [])
      setPayments(p || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const stats = useMemo(() => {
    const valid = activePayments(payments)
    const byLoan = groupBy(valid, 'loan_id')
    const activeLoans = loans.filter(l => l.status !== 'paid' && l.status !== 'unified' && l.status !== 'cancelled')
    const paidLoans = loans.filter(l => l.status === 'paid')
    const totalPrestado = activeLoans.reduce((s, l) => s + (l.amount || 0), 0)
    const capitalPagado = activeLoans.reduce((s, l) => s + loanCapitalPaid(l, byLoan.get(l.id) || []), 0)
    return {
      valid,
      activeLoans,
      paidLoans,
      totalPrestado,
      totalCollected: totalPaidOf(valid),
      totalPending: totalPrestado - capitalPagado,
    }
  }, [loans, payments])

  if (loading) return (
    <div className="px-4 pt-6 space-y-4 min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-40 rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
      <SkeletonCard lines={4} />
      <SkeletonStats />
      <SkeletonList rows={3} />
    </div>
  )

  if (!client) return (
    <div className="p-6 text-center text-gray-400 mt-20 min-h-screen bg-gray-50 dark:bg-gray-950">
      Cliente no encontrado
    </div>
  )

  const { valid, activeLoans, paidLoans, totalPrestado, totalCollected, totalPending } = stats
  const ranking = client.ranking_override || calcRanking(valid, loans)
  const rl = RANKING_LABELS[ranking] || RANKING_LABELS.nuevo
  const lastLoan = loans[0]

  function enviarRecordatorio() {
    const link = buildWhatsAppLink(client.phone, mensajeRecordatorio({ client }))
    if (!link) { alert('Este cliente no tiene teléfono registrado'); return }
    window.open(link, '_blank')
  }

  return (
    <div className="pb-10 min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHero
        title="Detalle del cliente"
        onBack={() => navigate(-1)}
        actions={
          <HeroButton onClick={() => navigate(`/clients/${id}`)} label="Editar cliente">
            <Pencil size={15} />
          </HeroButton>
        }
      >
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size="lg" onHero />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight truncate">{client.name}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${rl.color}`}>
              <rl.Icon size={11} /> {rl.label}
            </span>
            <div className="mt-2 space-y-1 text-white/80 text-sm">
              {client.phone && <p className="flex items-center gap-1.5"><Phone size={13} />{client.phone}</p>}
              {client.cedula && <p className="flex items-center gap-1.5"><User size={13} />CC {client.cedula}</p>}
              {client.address && <p className="flex items-center gap-1.5 text-xs text-white/70"><MapPin size={12} /><span className="truncate">{client.address}</span></p>}
            </div>
          </div>
        </div>
      </PageHero>

      {/* ── Stats (las dos primeras se montan sobre la curva) ── */}
      <HeroOverlap>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Saldo pendiente" value={formatCOP(totalPending)} accent="text-amber-600 dark:text-amber-400"
            sub={`${activeLoans.length} préstamo${activeLoans.length !== 1 ? 's' : ''} activo${activeLoans.length !== 1 ? 's' : ''}`} />
          <StatCard label="Total cobrado" value={formatCOP(totalCollected)} accent="text-green-600 dark:text-green-400"
            sub={`${valid.length} pagos`} />
        </div>
      </HeroOverlap>

      <div className="grid grid-cols-2 gap-3 mx-4 mt-3 mb-4">
        <StatCard label="Prestado activo" value={formatCOP(totalPrestado)} />
        <StatCard label="Préstamos" value={loans.length} accent="text-blue-600 dark:text-blue-400"
          sub={paidLoans.length > 0 ? `${paidLoans.length} liquidados` : 'Ninguno liquidado'} />
      </div>

      {/* ── Tabs ── */}
      <div className="mx-4 mb-4">
        <div className="flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {TABS.map((t, i) => {
            const count = i === 1 ? loans.length : i === 2 ? valid.length : 0
            return (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === i
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 active:bg-gray-300 dark:active:bg-gray-700'}`}
              >
                {t}
                {count > 0 && (
                  <span className={`ml-1 text-xs ${tab === i ? 'text-blue-200' : 'text-gray-400 dark:text-gray-600'}`}>
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
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
              <InfoRow label="Fecha" value={formatDate(lastLoan.start_date || lastLoan.created_at)} />
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
            <div className={`${CARD} overflow-hidden divide-y divide-gray-100 dark:divide-gray-700`}>
              {loans.map(loan => (
                <button
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 dark:active:bg-gray-700 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <CreditCard size={15} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCOP(loan.amount)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDate(loan.start_date || loan.created_at)} · {loan.frequency} · {loan.interest_rate}%
                    </p>
                  </div>
                  <StatusBadge status={loan.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Pagos ── */}
      {tab === 2 && (
        <div className="mx-4">
          {valid.length === 0 ? <EmptyState text="Sin pagos registrados" /> : (
            <div className={`${CARD} overflow-hidden divide-y divide-gray-100 dark:divide-gray-700`}>
              {valid.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                    <CheckCircle size={15} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCOP(p.total_paid)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(p.date || p.created_at)}</p>
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
        {activeLoans.length >= 2 && (
          <button
            onClick={() => navigate(`/clients/${id}/unify-loans`)}
            className="col-span-2 bg-purple-600 rounded-2xl py-3 flex items-center justify-center gap-2 text-white text-sm font-medium active:scale-95 transition"
          >
            <CreditCard size={16} /> Unificar préstamos activos
          </button>
        )}
        <button
          onClick={enviarRecordatorio}
          className="col-span-2 bg-green-500 rounded-2xl py-3 flex items-center justify-center gap-2 text-white text-sm font-medium active:scale-95 transition"
        >
          <MessageCircle size={16} /> Enviar recordatorio por WhatsApp
        </button>
      </div>
    </div>
  )
}
