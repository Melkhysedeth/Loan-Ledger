import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../db/supabase";
import { formatCOP } from "../utils/format";
import {
  calcVariableInterest,
  calcTotalLoan,
  calcNextPaymentDate,
  classifyLoan,
  calcMora,
  calcInterestCarryover,
} from "../utils/loanCalc";
import {
  ChevronLeft,
  DollarSign,
  Snowflake,
  CheckCircle,
  AlertCircle,
  Pencil,
  X,
  Handshake,
  Calendar,
  Percent,
  RefreshCw,
  CreditCard,
  Ban,
} from "lucide-react";

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from("loans").select("*").eq("id", id).single(),
      supabase
        .from("payments")
        .select("*")
        .eq("loan_id", id)
        .order("date", { ascending: false }),
    ]);
    if (!l) return;
    const { data: c } = await supabase
      .from("clients")
      .select("*")
      .eq("id", l.client_id)
      .single();
    setLoan(l);
    setClient(c);
    setPayments(p || []);
  }

  if (!loan)
    return (
      <div className="p-6 text-center text-gray-400 mt-20">Cargando...</div>
    );

  const totalPaid = payments.reduce((s, p) => s + (p.capital_paid || 0), 0);
  const totalInterestPaid = payments.reduce(
    (s, p) => s + (p.interest_paid || 0),
    0,
  );
  const remaining = loan.amount - totalPaid;
  const paymentsMade = payments.length;

  const isFrozen = loan.status === "frozen";
  const isPaid = loan.status === "paid";
  const isCancelled = loan.status === "cancelled";
  const isAgreement = loan.status === "agreement";
  const isInactive = isPaid || isCancelled || isFrozen;

  const nextPayment = !isInactive
    ? calcNextPaymentDate(loan.first_payment_date, loan.frequency, paymentsMade)
    : null;
  const classification = !isInactive
    ? classifyLoan(loan.first_payment_date, loan.frequency, paymentsMade)
    : "ok";
  const isOverdue =
    !isInactive && (classification === "overdue" || loan.status === "overdue");

  const mora = !isInactive
    ? calcMora(loan, paymentsMade, totalPaid)
    : { inMora: false, diasMora: 0, mesesEnMora: 0, valorInteresesDebe: 0 };

  const { carryover, nextExpectedInterest } = !isInactive
    ? calcInterestCarryover(loan, payments)
    : { carryover: 0, nextExpectedInterest: 0 };

  const isVariable = loan.interest_type === "variable";
  const nextInterest = isVariable
    ? calcVariableInterest(
        loan.amount,
        totalPaid,
        loan.interest_rate,
        loan.frequency,
      )
    : loan.interest_amount || 0;
  const preview =
    !isVariable && loan.num_payments
      ? calcTotalLoan(loan.amount, loan.interest_rate, loan.num_payments)
      : null;

  const initials = (client?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const STATUS = {
    active: {
      label: "Activo",
      color: "text-green-400 bg-green-900/30",
      dot: "bg-green-400",
    },
    frozen: {
      label: "Congelado",
      color: "text-blue-400 bg-blue-900/30",
      dot: "bg-blue-400",
    },
    overdue: {
      label: "En mora",
      color: "text-red-400 bg-red-900/30",
      dot: "bg-red-400",
    },
    paid: {
      label: "Liquidado",
      color: "text-gray-400 bg-gray-700",
      dot: "bg-gray-400",
    },
    agreement: {
      label: "Acuerdo especial",
      color: "text-amber-400 bg-amber-900/30",
      dot: "bg-amber-400",
    },
    cancelled: {
      label: "Cancelado",
      color: "text-red-300 bg-red-900/20",
      dot: "bg-red-300",
    },
  };
  const status = STATUS[loan.status] || STATUS.active;

  const proximaFecha =
    paymentsMade === 0
      ? loan.first_payment_date
        ? new Date(loan.first_payment_date + "T12:00:00")
        : null
      : nextPayment;

  return (
    <div className="pb-32 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-400">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              Préstamo #{String(id).slice(-4).padStart(4, "0")}
            </h1>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${status.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{" "}
              {status.label}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Otorgado el{" "}
            {loan.start_date
              ? new Date(loan.start_date + "T12:00:00").toLocaleDateString(
                  "es-CO",
                  { day: "numeric", month: "short", year: "numeric" },
                )
              : "—"}
          </p>
        </div>
      </div>

      {/* Banner congelado */}
      {isFrozen && (
        <div className="mx-4 mb-3 bg-blue-900/20 border border-blue-700/40 rounded-2xl px-4 py-3 flex gap-3 items-start">
          <Snowflake size={16} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-400">
              Préstamo congelado
            </p>
            <p className="text-xs text-blue-300/70 mt-0.5">
              Sin intereses · Capital pendiente:{" "}
              <span className="font-bold">{formatCOP(remaining)}</span>
            </p>
            <p className="text-xs text-blue-300/50 mt-0.5">
              Al descongelar se pactarán nuevas condiciones
            </p>
          </div>
        </div>
      )}

      {/* Banner cancelado */}
      {isCancelled && (
        <div className="mx-4 mb-3 bg-red-900/20 border border-red-700/40 rounded-2xl px-4 py-3 flex gap-3 items-start">
          <Ban size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              Préstamo cancelado
            </p>
            {loan.cancellation_note && (
              <p className="text-xs text-red-300/70 mt-0.5">
                {loan.cancellation_note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Banner acuerdo especial */}
      {isAgreement && (
        <div className="mx-4 mb-3 bg-amber-900/30 border border-amber-700/40 rounded-2xl px-4 py-3 flex gap-3 items-start">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              Acuerdo especial activo
            </p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Sin intereses · Solo abono a capital
            </p>
            {loan.agreement_note && (
              <p className="text-xs text-gray-400 mt-1">
                {loan.agreement_note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tarjeta cliente */}
      <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold text-base flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 dark:text-gray-100">
              {client?.name || "—"}
            </p>
            {client?.phone && (
              <p className="text-xs text-gray-400">{client.phone}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            {isFrozen && (
              <>
                <p className="text-[10px] text-gray-400">Capital pendiente</p>
                <p className="text-xs font-semibold text-blue-400">
                  {formatCOP(remaining)}
                </p>
              </>
            )}
            {isPaid && (
              <p className="text-xs font-semibold text-gray-400">Liquidado</p>
            )}
            {isCancelled && (
              <p className="text-xs font-semibold text-red-400">Cancelado</p>
            )}
            {!isInactive && nextPayment && (
              <>
                <p className="text-[10px] text-gray-400">
                  {isOverdue ? "Vencido desde" : "Próximo pago"}
                </p>
                <p
                  className={`text-xs font-semibold flex items-center gap-1 justify-end mt-0.5 ${isOverdue ? "text-red-500" : "text-blue-500"}`}
                >
                  <Calendar size={10} />
                  {proximaFecha?.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Monto</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
              {formatCOP(loan.amount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Total a pagar</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
              {preview ? formatCOP(preview.totalToPay) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Pendiente</p>
            <p
              className={`text-xs font-bold ${isPaid || isCancelled ? "text-gray-400" : "text-amber-500"}`}
            >
              {formatCOP(remaining)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Cuotas</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
              {loan.num_payments
                ? `${paymentsMade} / ${loan.num_payments}`
                : `${paymentsMade}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta mora */}
      {mora.inMora && (
        <div className="mx-4 border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-sm font-bold text-red-500 dark:text-red-400">
              Préstamo en mora
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-1">Días en mora</p>
              <p className="text-lg font-bold text-red-500 dark:text-red-400">
                {mora.diasMora}
              </p>
              <p className="text-[10px] text-gray-400">días</p>
            </div>
            <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-1">
                Intereses vencidos
              </p>
              <p className="text-lg font-bold text-red-500 dark:text-red-400">
                {mora.mesesEnMora % 1 === 0
                  ? mora.mesesEnMora
                  : mora.mesesEnMora.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-400">meses</p>
            </div>
            <div className="border border-red-100 dark:border-red-900/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-1">Valor que debe</p>
              <p className="text-base font-bold text-red-500 dark:text-red-400">
                {formatCOP(mora.valorInteresesDebe)}
              </p>
              <p className="text-[10px] text-gray-400">en intereses</p>
            </div>
          </div>
        </div>
      )}

      {carryover !== 0 && !isInactive && (
        <div
          className={`mx-4 rounded-2xl p-4 mb-3 shadow-sm border ${
            carryover > 0
              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40"
          }`}
        >
          <p
            className={`text-sm font-bold mb-1 ${carryover > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
          >
            {carryover > 0
              ? "Saldo de interés pendiente"
              : "Saldo de interés a favor"}
          </p>
          <p
            className={`text-lg font-bold ${carryover > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
          >
            {formatCOP(Math.abs(carryover))}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {carryover > 0
              ? `Se sumará al interés del próximo pago (total esperado: ${formatCOP(nextExpectedInterest)})`
              : `Se descontará del interés del próximo pago (total esperado: ${formatCOP(nextExpectedInterest)})`}
          </p>
        </div>
      )}

      {/* Detalles del préstamo */}
      <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
          Detalles del préstamo
        </p>
        <div className="grid grid-cols-2 gap-3">
          <DetailCell
            Icon={Percent}
            label="Tasa de interés"
            value={`${loan.interest_rate}%`}
          />
          <DetailCell
            Icon={Calendar}
            label="Fecha inicio"
            value={
              loan.start_date
                ? new Date(loan.start_date + "T12:00:00").toLocaleDateString(
                    "es-CO",
                    { day: "numeric", month: "short", year: "numeric" },
                  )
                : "—"
            }
          />
          <DetailCell
            Icon={RefreshCw}
            label="Frecuencia"
            value={loan.frequency}
          />
          <DetailCell
            Icon={Calendar}
            label="Próximo pago"
            value={(() => {
              if (isFrozen || isPaid || isCancelled) return "—";
              const fecha =
                paymentsMade === 0
                  ? loan.first_payment_date
                    ? new Date(loan.first_payment_date + "T12:00:00")
                    : null
                  : nextPayment;
              return fecha
                ? fecha.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
            })()}
            valueColor={
              isOverdue ? "text-red-500" : "text-gray-800 dark:text-gray-100"
            }
          />
          <DetailCell
            Icon={CreditCard}
            label="Tipo de interés"
            value={isVariable ? "Variable (sobre saldo)" : "Fijo"}
            valueColor={isVariable ? "text-purple-500" : "text-blue-500"}
          />
          <DetailCell
            Icon={DollarSign}
            label="Intereses cobrados"
            value={formatCOP(totalInterestPaid)}
            valueColor="text-green-500"
          />
        </div>
        {loan.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">Notas</p>
            <p className="text-sm text-gray-300 mt-0.5">{loan.notes}</p>
          </div>
        )}
      </div>

      {/* Resumen de pagos — solo si no está congelado/cancelado */}
      {!isFrozen && !isCancelled && (
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
            Resumen de pagos
          </p>
          <div
            className={`rounded-xl p-3 mb-3 flex items-center gap-2 ${
              isVariable
                ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40"
                : "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40"
            }`}
          >
            <Percent
              size={14}
              className={isVariable ? "text-purple-500" : "text-blue-500"}
            />
            <div>
              <p
                className={`text-xs font-semibold ${isVariable ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}`}
              >
                {isVariable ? "Interés variable sobre saldo" : "Interés fijo"}
              </p>
              <p className="text-[10px] text-gray-400">
                {isVariable
                  ? `Próximo interés: ${formatCOP(nextInterest)} (${loan.interest_rate}% sobre ${formatCOP(remaining)})`
                  : `Interés fijo por cuota: ${formatCOP(loan.interest_amount)}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryBox
              label="Capital pagado"
              value={formatCOP(totalPaid)}
              sub={`${paymentsMade} cuotas`}
              color="text-green-500"
              bg="bg-green-50 dark:bg-green-900/20"
            />
            <SummaryBox
              label="Capital pendiente"
              value={formatCOP(remaining)}
              sub={
                loan.num_payments && !isVariable
                  ? `${loan.num_payments - paymentsMade} cuotas`
                  : "—"
              }
              color="text-amber-500"
              bg="bg-amber-50 dark:bg-amber-900/20"
            />
            <SummaryBox
              label="Próximo interés"
              value={!isPaid && nextPayment ? formatCOP(nextInterest) : "—"}
              sub={
                nextPayment && !isPaid
                  ? nextPayment.toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"
              }
              color={isVariable ? "text-purple-500" : "text-blue-500"}
              bg={
                isVariable
                  ? "bg-purple-50 dark:bg-purple-900/20"
                  : "bg-blue-50 dark:bg-blue-900/20"
              }
            />
            <SummaryBox
              label="Intereses cobrados"
              value={formatCOP(totalInterestPaid)}
              sub="total histórico"
              color="text-green-500"
              bg="bg-green-50 dark:bg-green-900/20"
            />
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-3 shadow-sm">
        <p className="font-bold text-gray-800 dark:text-gray-100 px-4 pt-4 pb-2 text-sm">
          Historial de pagos
        </p>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500 px-4 pb-4">
            Sin pagos registrados aún
          </p>
        ) : (
          payments.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < payments.length - 1 ? "border-b border-gray-100 dark:border-gray-700" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <CheckCircle size={14} className="text-green-500" />
              </div>
              <div className="flex-1">
                {p.notes && (
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">
                    {p.notes}
                  </p>
                )}
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {formatCOP(p.total_paid)}
                </p>
                <p className="text-xs text-gray-400">
                  Capital: {formatCOP(p.capital_paid)} · Interés:{" "}
                  {formatCOP(p.interest_paid)}
                </p>
                {p.payment_method && (
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {p.payment_method === "breb" ? "Bre-B" : p.payment_method}
                    {p.reference ? ` · Ref: ${p.reference}` : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {new Date(p.date + "T12:00:00").toLocaleDateString("es-CO")}
                </p>
                {p.late && (
                  <span className="text-[10px] text-red-400">Tardío</span>
                )}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                Pagado
              </span>
            </div>
          ))
        )}
      </div>

      {/* Acciones — solo si no está liquidado ni cancelado */}
      {!isPaid && !isCancelled && (
        <>
          <div className="mx-4 grid grid-cols-3 gap-2 mb-2">
            {!isFrozen && (
              <ActionBtn
                Icon={DollarSign}
                label="Registrar pago"
                color="bg-blue-600"
                onClick={() => navigate(`/loans/${id}/pay`)}
              />
            )}
            <ActionBtn
              Icon={Pencil}
              label="Editar interés"
              color="bg-gray-700"
              onClick={() => setModal("interest")}
            />
            {!isFrozen && !isAgreement && (
              <ActionBtn
                Icon={Handshake}
                label="Acuerdo"
                color="bg-amber-700/80"
                onClick={() => setModal("agreement")}
              />
            )}
          </div>
          <div className="mx-4 grid grid-cols-3 gap-2 mb-2">
            <ActionBtn
              Icon={Snowflake}
              label={isFrozen ? "Descongelar" : "Congelar"}
              color="bg-blue-700/80"
              onClick={() => setModal("freeze")}
            />
            <ActionBtn
              Icon={CheckCircle}
              label="Liquidar"
              color="bg-green-700/80"
              onClick={() => setModal("settle")}
            />
            <ActionBtn
              Icon={Ban}
              label="Cancelar"
              color="bg-red-700/80"
              onClick={() => setModal("cancel")}
            />
          </div>
        </>
      )}

      {/* Modales */}
      {modal === "interest" && (
        <InterestModal
          loan={loan}
          remaining={remaining}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal === "freeze" && (
        <FreezeModal
          loan={loan}
          remaining={remaining}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal === "settle" && (
        <SettleModal
          loan={loan}
          remaining={remaining}
          carryover={carryover}
          nextExpectedInterest={nextExpectedInterest}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal === "agreement" && (
        <AgreementModal
          loan={loan}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal === "cancel" && (
        <CancelModal
          loan={loan}
          remaining={remaining}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ── Sub-componentes UI ────────────────────────────────────────

function DetailCell({
  Icon,
  label,
  value,
  valueColor = "text-gray-800 dark:text-gray-100",
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-blue-500" />
      </div>
      <div>
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className={`text-xs font-semibold capitalize ${valueColor}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, sub, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
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

function ModalWrapper({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-white text-lg">{title}</h2>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Modales ───────────────────────────────────────────────────

// FIX: recibe `remaining` para calcular interés variable correctamente al editar
function InterestModal({ loan, remaining, onClose, onDone }) {
  const [rate, setRate] = useState(String(loan.interest_rate));
  const [saving, setSaving] = useState(false);

  const isVariable = loan.interest_type === "variable";
  const parsedRate = parseFloat(rate) || 0;

  // FIX: fijo → sobre loan.amount | variable → sobre remaining (saldo pendiente)
  const previewInterest = isVariable
    ? Math.round((remaining * parsedRate) / 100)
    : Math.round((loan.amount * parsedRate) / 100);

  async function handleSave() {
    if (!parsedRate) return;
    setSaving(true);
    await supabase
      .from("loans")
      .update({
        interest_rate: parsedRate,
        interest_amount: isVariable ? 0 : previewInterest,
      })
      .eq("id", loan.id);
    onDone();
  }

  return (
    <ModalWrapper title="Modificar interés" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400">
          Tipo actual:{" "}
          <span
            className={`font-semibold ${isVariable ? "text-purple-400" : "text-blue-400"}`}
          >
            {isVariable
              ? "Variable (sobre saldo)"
              : "Fijo (sobre monto original)"}
          </span>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Nueva tasa (%)
          </label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {parsedRate > 0 && (
          <p className="text-sm text-gray-400">
            {isVariable ? (
              <>
                Próximo interés sobre saldo{" "}
                <span className="text-white">({formatCOP(remaining)})</span>:{" "}
                <span className="text-white font-semibold">
                  {formatCOP(previewInterest)}
                </span>
              </>
            ) : (
              <>
                Interés fijo por cuota:{" "}
                <span className="text-white font-semibold">
                  {formatCOP(previewInterest)}
                </span>
              </>
            )}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !parsedRate}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambio"}
        </button>
      </div>
    </ModalWrapper>
  );
}

// FIX: al descongelar se elige tipo de interés (fijo o variable) y se recalcula correctamente
function FreezeModal({ loan, remaining, onClose, onDone }) {
  const isFrozen = loan.status === "frozen";
  const [saving, setSaving] = useState(false);

  // Campos para descongelar
  const [firstPaymentDate, setFirstPaymentDate] = useState("");
  const [rate, setRate] = useState(String(loan.interest_rate));
  const [frequency, setFrequency] = useState(loan.frequency);
  const [interestType, setInterestType] = useState(
    loan.interest_type || "fixed",
  );

  const parsedRate = parseFloat(rate) || 0;

  // FIX: fijo → sobre loan.amount | variable → sobre remaining
  const previewInterest =
    interestType === "variable"
      ? Math.round((remaining * parsedRate) / 100)
      : Math.round((loan.amount * parsedRate) / 100);

  async function handleFreeze() {
    setSaving(true);
    await supabase.from("loans").update({ status: "frozen" }).eq("id", loan.id);
    onDone();
  }

  async function handleUnfreeze() {
    if (!firstPaymentDate || !parsedRate) return;
    setSaving(true);
    await supabase
      .from("loans")
      .update({
        status: "active",
        first_payment_date: firstPaymentDate,
        interest_rate: parsedRate,
        interest_type: interestType,
        // FIX: si es variable guardamos 0 porque se calcula dinámicamente sobre el saldo
        interest_amount: interestType === "variable" ? 0 : previewInterest,
        frequency,
      })
      .eq("id", loan.id);
    onDone();
  }

  if (isFrozen) {
    return (
      <ModalWrapper title="Descongelar préstamo" onClose={onClose}>
        <div className="space-y-3">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-3 text-xs text-blue-300">
            Capital pendiente:{" "}
            <span className="font-bold text-white">{formatCOP(remaining)}</span>{" "}
            · Pacta las nuevas condiciones para reactivar.
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Nueva fecha de primer pago *
            </label>
            <input
              type="date"
              value={firstPaymentDate}
              onChange={(e) => setFirstPaymentDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Tipo de interés
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setInterestType("fixed")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  interestType === "fixed"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                Fijo
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                  Sobre monto original
                </span>
              </button>
              <button
                onClick={() => setInterestType("variable")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  interestType === "variable"
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                Variable
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                  Sobre saldo pendiente
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Tasa de interés (%)
            </label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {parsedRate > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Interés por cuota:{" "}
                <span className="text-white font-semibold">
                  {formatCOP(previewInterest)}
                </span>
                <span className="ml-1 opacity-60">
                  (
                  {interestType === "variable"
                    ? `${parsedRate}% sobre ${formatCOP(remaining)}`
                    : `${parsedRate}% sobre ${formatCOP(loan.amount)}`}
                  )
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Frecuencia
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
            </select>
          </div>

          <button
            onClick={handleUnfreeze}
            disabled={saving || !firstPaymentDate || !parsedRate}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Descongelar y activar"}
          </button>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper title="Congelar préstamo" onClose={onClose}>
      <p className="text-gray-400 text-sm mb-4">
        El préstamo quedará congelado. No se generarán intereses ni se mostrará
        mora hasta descongelarlo.
      </p>
      <button
        onClick={handleFreeze}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Congelar préstamo"}
      </button>
    </ModalWrapper>
  );
}

// FIX: valida que remaining > 0 antes de permitir liquidar
function SettleModal({
  loan,
  remaining,
  carryover = 0,
  nextExpectedInterest = 0,
  onClose,
  onDone,
}) {
  const [saving, setSaving] = useState(false);
  const [capitalInput, setCapitalInput] = useState(String(remaining));
  const [interestInput, setInterestInput] = useState(
    String(nextExpectedInterest),
  );

  const capitalToPay = parseFloat(capitalInput) || 0;
  const interestToPay = parseFloat(interestInput) || 0;
  const total = capitalToPay + interestToPay;

  async function handleSave() {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    if (total > 0) {
      await supabase.from("payments").insert({
        loan_id: loan.id,
        date: today,
        total_paid: total,
        interest_paid: interestToPay,
        capital_paid: capitalToPay,
        late: false,
        notes: "Liquidación del préstamo",
        payment_method: "efectivo",
      });
    }

    // FIX: el préstamo solo pasa a 'paid' si el capital pagado cubre lo pendiente.
    // Si es liquidación parcial (capitalToPay < remaining), queda activo con el saldo restante.
    const newRemaining = remaining - capitalToPay;
    await supabase
      .from("loans")
      .update({
        status: newRemaining <= 0 ? "paid" : loan.status,
      })
      .eq("id", loan.id);

    onDone();
  }

  return (
    <ModalWrapper title="Liquidar préstamo" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
          <p>
            Capital pendiente:{" "}
            <span className="font-bold text-white">{formatCOP(remaining)}</span>
          </p>
          <p>
            Interés esperado del período:{" "}
            <span className="font-bold text-white">
              {formatCOP(nextExpectedInterest)}
            </span>
          </p>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Capital a pagar
          </label>
          <input
            type="number"
            value={capitalInput}
            onChange={(e) => setCapitalInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Interés a pagar
          </label>
          <input
            type="number"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-3 text-xs text-green-300">
          <p>
            Total a recibir:{" "}
            <span className="font-bold text-white">{formatCOP(total)}</span>
          </p>
        </div>

        {capitalToPay < remaining && (
          <p className="text-xs text-amber-400">
            El capital ingresado no cubre todo lo pendiente. El préstamo seguirá
            activo con saldo de {formatCOP(remaining - capitalToPay)}.
          </p>
        )}

        <p className="text-gray-400 text-sm">
          {capitalToPay >= remaining ? (
            <>
              Esta acción marcará el préstamo como{" "}
              <span className="text-green-400 font-semibold">Liquidado</span>.
            </>
          ) : (
            "Esto registrará un abono parcial sin cerrar el préstamo."
          )}
        </p>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : `Confirmar · ${formatCOP(total)}`}
        </button>
      </div>
    </ModalWrapper>
  );
}

function AgreementModal({ loan, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("loans")
      .update({
        status: "agreement",
        interest_rate: 0,
        interest_amount: 0,
        agreement_date: new Date().toISOString().split("T")[0],
        agreement_note: note,
      })
      .eq("id", loan.id);
    onDone();
  }

  return (
    <ModalWrapper title="Acuerdo especial" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 text-xs text-amber-300">
          El préstamo pasará a <strong>sin intereses</strong>. Solo se
          registrarán abonos a capital.
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Nota del acuerdo (opcional)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Acuerdo verbal junio 2026, paga cuando pueda..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Activar acuerdo"}
        </button>
      </div>
    </ModalWrapper>
  );
}

// FIX: recibe `remaining` para mostrar cuánto retorna al cancelar
function CancelModal({ loan, remaining, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!note.trim()) return;
    setSaving(true);
    await supabase
      .from("loans")
      .update({
        status: "cancelled",
        cancellation_note: note.trim(),
      })
      .eq("id", loan.id);
    onDone();
  }

  return (
    <ModalWrapper title="Cancelar préstamo" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3 text-xs text-red-300">
          El capital pendiente de{" "}
          <span className="font-bold text-white">{formatCOP(remaining)}</span>{" "}
          volverá al saldo disponible del negocio al cancelar.
          {remaining < loan.amount && (
            <p className="mt-1 text-red-300/60">
              Los pagos ya realizados ({formatCOP(loan.amount - remaining)})
              quedan en el historial.
            </p>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Motivo de cancelación *
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Préstamo creado por error, nunca se desembolsó..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
          />
          {!note.trim() && (
            <p className="text-xs text-red-400 mt-1">
              El motivo es obligatorio
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !note.trim()}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
        >
          {saving ? "Cancelando..." : "Confirmar cancelación"}
        </button>
      </div>
    </ModalWrapper>
  );
}
