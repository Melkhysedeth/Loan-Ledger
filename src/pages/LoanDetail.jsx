import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DollarSign, Snowflake, CheckCircle, AlertCircle, Pencil, Handshake,
  Calendar, Percent, RefreshCw, CreditCard, Ban,
} from "lucide-react";
import { supabase } from "../db/supabase";
import PaymentDetailModal from "../components/PaymentDetailModal";
import PageHero, { HeroOverlap } from "../components/ui/PageHero";
import Avatar from "../components/ui/Avatar";
import Banner from "../components/ui/Banner";
import StatusBadge from "../components/ui/StatusBadge";
import { CARD, StatCard, DetailCell } from "../components/ui/Cards";
import PaymentHistory from "../components/loan/PaymentHistory";
import {
  InterestModal, FreezeModal, SettleModal, AgreementModal, CancelModal, VoidPaymentModal,
} from "../components/loan/LoanModals";
import { formatCOP, formatDate } from "../utils/format";
import {
  activePayments as getActivePayments, installmentsMade, interestPaidOf, loanCapitalPaid,
} from "../utils/loanMetrics";
import {
  calcVariableInterest, calcNextPaymentDate, classifyLoan, calcMora, calcInterestCarryover,
} from "../utils/loanCalc";

const NO_MORA = { inMora: false, diasMora: 0, mesesEnMora: 0, valorInteresesDebe: 0 };
const NO_CARRYOVER = { carryover: 0, nextExpectedInterest: 0 };

const shortId = (id) => String(id).slice(-4).padStart(4, "0");
const DATE_SHORT = { day: "numeric", month: "short", year: "numeric" };

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [modal, setModal] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  async function load() {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from("loans").select("*").eq("id", id).single(),
      supabase.from("payments").select("*").eq("loan_id", id).order("date", { ascending: false }),
    ]);
    if (!l) return;
    const { data: c } = await supabase.from("clients").select("*").eq("id", l.client_id).single();
    setLoan(l);
    setClient(c);
    setPayments(p || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleVoidPayment(paymentId, reason) {
    await supabase.from("payments").update({ voided: true, void_reason: reason }).eq("id", paymentId);

    // Si estaba liquidado y al anular vuelve a haber capital pendiente, se reactiva.
    const { data: fresh } = await supabase.from("payments").select("*").eq("loan_id", id);
    const remainingAfter = loan.amount - loanCapitalPaid(loan, getActivePayments(fresh || []));
    if (loan.status === "paid" && remainingAfter > 0) {
      await supabase.from("loans").update({ status: "active" }).eq("id", loan.id);
    }
    load();
  }

  if (!loan)
    return <div className="p-6 text-center text-gray-400 mt-20 min-h-screen bg-gray-50 dark:bg-gray-950">Cargando...</div>;

  // Los pagos anulados no cuentan para ningún cálculo, pero siguen en `payments`
  // para mostrarse en el historial con su motivo.
  const valid = getActivePayments(payments);
  const totalPaid = loanCapitalPaid(loan, valid);
  const totalInterestPaid = interestPaidOf(valid);
  const remaining = loan.amount - totalPaid;
  const paymentsMade = installmentsMade(valid);

  const isFrozen = loan.status === "frozen";
  const isPaid = loan.status === "paid";
  const isCancelled = loan.status === "cancelled";
  const isAgreement = loan.status === "agreement";
  const isInactive = isPaid || isCancelled || isFrozen;
  const isVariable = loan.interest_type === "variable";

  const nextPayment = !isInactive ? calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade) : null;
  const classification = !isInactive ? classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade) : "ok";
  const isOverdue = !isInactive && (classification === "overdue" || loan.status === "overdue");
  const mora = !isInactive ? calcMora(loan, paymentsMade, totalPaid) : NO_MORA;
  const { carryover, nextExpectedInterest } = !isInactive ? calcInterestCarryover(loan, valid) : NO_CARRYOVER;

  const nextInterest = isVariable
    ? calcVariableInterest(loan.amount, totalPaid, loan.interest_rate, loan.frequency)
    : loan.interest_amount || 0;

  // Con 0 cuotas pagadas la próxima fecha es la del primer pago (con mediodía fijo por zona horaria).
  const proximaFecha = isInactive
    ? null
    : paymentsMade === 0
      ? loan.first_payment_date ? new Date(loan.first_payment_date + "T12:00:00") : null
      : nextPayment;
  const proximaFechaTxt = proximaFecha ? proximaFecha.toLocaleDateString("es-CO", DATE_SHORT) : "—";

  const interestTone = isVariable ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400";
  const carryTone = carryover > 0 ? "amber" : "green";

  return (
    <div className="pb-32 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <PageHero
        title={`Préstamo #${shortId(id)}`}
        subtitle={`Otorgado el ${formatDate(loan.start_date, DATE_SHORT)}`}
        onBack={() => navigate(-1)}
        actions={<StatusBadge status={loan.status} withDot />}
      >
        <button
          onClick={() => client && navigate(`/clients/${client.id}/detail`)}
          className="w-full flex items-center gap-3 text-left active:opacity-80 transition"
        >
          <Avatar name={client?.name || "?"} onHero />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{client?.name || "—"}</p>
            {client?.phone && <p className="text-white/70 text-xs">{client.phone}</p>}
          </div>
          {!isInactive && proximaFecha && (
            <div className="text-right shrink-0">
              <p className="text-white/70 text-[10px]">{isOverdue ? "Vencido desde" : "Próximo pago"}</p>
              <p className={`text-xs font-semibold flex items-center gap-1 justify-end mt-0.5 ${isOverdue ? "text-red-200" : "text-white"}`}>
                <Calendar size={10} /> {proximaFechaTxt}
              </p>
            </div>
          )}
        </button>
      </PageHero>

      {/* Las dos primeras cifras se montan sobre la curva del hero */}
      <HeroOverlap>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Capital pendiente"
            value={formatCOP(remaining)}
            accent={isPaid || isCancelled ? "text-gray-400" : "text-amber-600 dark:text-amber-400"}
            sub={`de ${formatCOP(loan.amount)}`}
          />
          <StatCard
            label={isVariable ? "Próximo interés (variable)" : "Próximo interés"}
            value={!isInactive ? formatCOP(nextInterest) : "—"}
            accent={interestTone}
            sub={!isInactive ? proximaFechaTxt : "—"}
          />
        </div>
      </HeroOverlap>

      <div className="grid grid-cols-2 gap-3 mx-4 mt-3 mb-3">
        <StatCard label="Capital pagado" value={formatCOP(totalPaid)} accent="text-green-600 dark:text-green-400" sub={`${paymentsMade} cuota${paymentsMade !== 1 ? "s" : ""}`} />
        <StatCard label="Intereses cobrados" value={formatCOP(totalInterestPaid)} accent="text-green-600 dark:text-green-400" sub="total histórico" />
      </div>

      <div className="mx-4 space-y-3">
        {isFrozen && (
          <Banner tone="blue" Icon={Snowflake} title="Préstamo congelado">
            <p>Sin intereses · Capital pendiente: <span className="font-bold">{formatCOP(remaining)}</span></p>
            <p>Al descongelar se pactarán nuevas condiciones</p>
          </Banner>
        )}
        {isCancelled && (
          <Banner tone="red" Icon={Ban} title="Préstamo cancelado">
            {loan.cancellation_note && <p>{loan.cancellation_note}</p>}
          </Banner>
        )}
        {isAgreement && (
          <Banner tone="amber" Icon={AlertCircle} title="Acuerdo especial activo">
            <p>Sin intereses · Solo abono a capital</p>
            {loan.agreement_note && <p>{loan.agreement_note}</p>}
          </Banner>
        )}

        {mora.inMora && (
          <div className="border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-500 dark:text-red-400">Préstamo en mora</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MoraBox label="Días en mora" value={mora.diasMora} unit="días" />
              <MoraBox label="Intereses vencidos" value={mora.mesesEnMora % 1 === 0 ? mora.mesesEnMora : mora.mesesEnMora.toFixed(1)} unit="meses" />
              <MoraBox label="Valor que debe" value={formatCOP(mora.valorInteresesDebe)} unit="en intereses" small />
            </div>
          </div>
        )}

        {carryover !== 0 && !isInactive && (
          <Banner tone={carryTone} title={carryover > 0 ? "Saldo de interés pendiente" : "Saldo de interés a favor"}>
            <p className="text-lg font-bold">{formatCOP(Math.abs(carryover))}</p>
            <p>
              {carryover > 0 ? "Se sumará al" : "Se descontará del"} interés del próximo pago (total esperado: {formatCOP(nextExpectedInterest)})
            </p>
          </Banner>
        )}

        {/* Detalles del préstamo */}
        <div className={`${CARD} p-4`}>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Detalles del préstamo</p>
          <div className="grid grid-cols-2 gap-3">
            <DetailCell Icon={DollarSign} label="Monto" value={formatCOP(loan.amount)} />
            <DetailCell Icon={Percent} label="Tasa de interés" value={`${loan.interest_rate}%`} />
            <DetailCell Icon={CreditCard} label="Tipo de interés" value={isVariable ? "Variable (sobre saldo)" : "Fijo"} valueColor={interestTone} />
            <DetailCell Icon={RefreshCw} label="Frecuencia" value={loan.frequency} />
            <DetailCell Icon={Calendar} label="Cuotas pagadas" value={`${paymentsMade}`} />
          </div>
          {!isVariable && (
            <p className="text-[11px] text-gray-400 mt-3">Interés fijo por cuota: {formatCOP(loan.interest_amount)}</p>
          )}
          {isVariable && !isInactive && (
            <p className="text-[11px] text-gray-400 mt-3">
              {loan.interest_rate}% sobre {formatCOP(remaining)} de saldo
            </p>
          )}
          {loan.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">Notas</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{loan.notes}</p>
            </div>
          )}
        </div>

        <PaymentHistory payments={payments} onSelect={setSelectedPayment} onVoid={setVoidTarget} />

        {/* Acciones — solo si no está liquidado ni cancelado */}
        {!isPaid && !isCancelled && (
          <div className="space-y-2">
            {!isFrozen && (
              <button
                onClick={() => navigate(`/loans/${id}/pay`)}
                className="w-full bg-blue-600 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-white text-sm font-semibold active:scale-95 transition"
              >
                <DollarSign size={16} /> Registrar pago
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn Icon={Pencil} label="Editar interés" color="bg-gray-700" onClick={() => setModal("interest")} />
              {!isFrozen && !isAgreement && (
                <ActionBtn Icon={Handshake} label="Acuerdo" color="bg-amber-600" onClick={() => setModal("agreement")} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ActionBtn Icon={Snowflake} label={isFrozen ? "Descongelar" : "Congelar"} color="bg-blue-700" onClick={() => setModal("freeze")} />
              <ActionBtn Icon={CheckCircle} label="Liquidar" color="bg-green-700" onClick={() => setModal("settle")} />
              <ActionBtn Icon={Ban} label="Cancelar" color="bg-red-700" onClick={() => setModal("cancel")} />
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal === "interest" && <InterestModal loan={loan} remaining={remaining} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "freeze" && <FreezeModal loan={loan} remaining={remaining} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "settle" && <SettleModal loan={loan} remaining={remaining} nextExpectedInterest={nextExpectedInterest} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "agreement" && <AgreementModal loan={loan} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "cancel" && <CancelModal loan={loan} remaining={remaining} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}

      {voidTarget && (
        <VoidPaymentModal
          payment={voidTarget}
          onClose={() => setVoidTarget(null)}
          onConfirm={async (reason) => {
            await handleVoidPayment(voidTarget.id, reason);
            setVoidTarget(null);
          }}
        />
      )}

      {selectedPayment && <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  );
}

function MoraBox({ label, value, unit, small = false }) {
  return (
    <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className={`${small ? "text-base" : "text-lg"} font-bold text-red-500 dark:text-red-400`}>{value}</p>
      <p className="text-[10px] text-gray-400">{unit}</p>
    </div>
  );
}

function ActionBtn({ Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-2xl p-3 flex items-center justify-center gap-2 text-white text-xs font-medium active:scale-95 transition`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
