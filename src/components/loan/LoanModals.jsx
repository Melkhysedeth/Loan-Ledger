import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../db/supabase";
import { METHODS } from "../../constants/paymentMethods";
import { formatCOP } from "../../utils/format";

function ModalWrapper({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h2>
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
export function InterestModal({ loan, remaining, onClose, onDone }) {
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
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("loans")
      .update({
        interest_rate: parsedRate,
        interest_amount: isVariable ? 0 : previewInterest,
        interest_effective_date: today,
      })
      .eq("id", loan.id);
    onDone();
  }

  return (
    <ModalWrapper title="Modificar interés" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
          Tipo actual:{" "}
          <span
            className={`font-semibold ${isVariable ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}`}
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
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {parsedRate > 0 && (
          <p className="text-sm text-gray-400">
            {isVariable ? (
              <>
                Próximo interés sobre saldo{" "}
                <span className="text-gray-900 dark:text-white">({formatCOP(remaining)})</span>:{" "}
                <span className="text-gray-900 dark:text-white font-semibold">
                  {formatCOP(previewInterest)}
                </span>
              </>
            ) : (
              <>
                Interés fijo por cuota:{" "}
                <span className="text-gray-900 dark:text-white font-semibold">
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
export function FreezeModal({ loan, remaining, onClose, onDone }) {
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
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("loans")
      .update({
        status: "active",
        first_payment_date: firstPaymentDate,
        interest_rate: parsedRate,
        interest_type: interestType,
        interest_amount: interestType === "variable" ? 0 : previewInterest,
        frequency,
        interest_effective_date: today,
      })
      .eq("id", loan.id);
    onDone();
  }

  if (isFrozen) {
    return (
      <ModalWrapper title="Descongelar préstamo" onClose={onClose}>
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            Capital pendiente:{" "}
            <span className="font-bold text-gray-900 dark:text-white">{formatCOP(remaining)}</span>{" "}
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
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Tipo de interés
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setInterestType("fixed")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${interestType === "fixed"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
              >
                Fijo
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                  Sobre monto original
                </span>
              </button>
              <button
                onClick={() => setInterestType("variable")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${interestType === "variable"
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
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
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {parsedRate > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Interés por cuota:{" "}
                <span className="text-gray-900 dark:text-white font-semibold">
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
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
export function SettleModal({
  loan,
  remaining,
  nextExpectedInterest = 0,
  onClose,
  onDone,
}) {
  const [saving, setSaving] = useState(false);
  const [capitalInput, setCapitalInput] = useState(String(remaining));
  const [interestInput, setInterestInput] = useState(
    String(nextExpectedInterest),
  );
  const [methodAmounts, setMethodAmounts] = useState({ efectivo: '', nequi: '', breb: '' });

  const capitalToPay = parseFloat(capitalInput) || 0;
  const interestToPay = parseFloat(interestInput) || 0;
  const total = capitalToPay + interestToPay;

  const sumMethods = Object.values(methodAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const methodsMatch = sumMethods === total;

  async function handleSave() {
    if (total > 0 && !methodsMatch) {
      alert('Los métodos de pago no suman el total a liquidar.');
      return;
    }

    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    if (total > 0) {
      const activeMethods = Object.entries(methodAmounts)
        .map(([m, v]) => [m, parseFloat(v) || 0])
        .filter(([, v]) => v > 0);
      const isSingle = activeMethods.length === 1;

      await supabase.from("payments").insert({
        loan_id: loan.id,
        date: today,
        total_paid: total,
        interest_paid: interestToPay,
        capital_paid: capitalToPay,
        late: false,
        notes: "Liquidación del préstamo",
        payment_method: isSingle ? activeMethods[0][0] : null,
        method_breakdown: isSingle ? null : Object.fromEntries(activeMethods),
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
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            Capital pendiente:{" "}
            <span className="font-bold text-gray-900 dark:text-white">{formatCOP(remaining)}</span>
          </p>
          <p>
            Interés esperado del período:{" "}
            <span className="font-bold text-gray-900 dark:text-white">
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
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">¿Por qué método(s) se recibe?</label>
          <div className="space-y-2">
            {METHODS.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                  {m.icon}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300 w-16 shrink-0">{m.label}</span>
                <input
                  type="number"
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="0"
                  value={methodAmounts[m.id]}
                  onChange={(e) => setMethodAmounts({ ...methodAmounts, [m.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {sumMethods > 0 && (
            <p className={`text-xs mt-2 text-right ${methodsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {methodsMatch ? 'Cuadra con el total ✓' : `Diferencia: ${formatCOP(Math.abs(total - sumMethods))}`}
            </p>
          )}
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-xl p-3 text-xs text-green-700 dark:text-green-300">
          <p>
            Total a recibir:{" "}
            <span className="font-bold text-gray-900 dark:text-white">{formatCOP(total)}</span>
          </p>
        </div>

        {capitalToPay < remaining && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            El capital ingresado no cubre todo lo pendiente. El préstamo seguirá
            activo con saldo de {formatCOP(remaining - capitalToPay)}.
          </p>
        )}

        <p className="text-gray-400 text-sm">
          {capitalToPay >= remaining ? (
            <>
              Esta acción marcará el préstamo como{" "}
              <span className="text-green-600 dark:text-green-400 font-semibold">Liquidado</span>.
            </>
          ) : (
            "Esto registrará un abono parcial sin cerrar el préstamo."
          )}
        </p>

        <button
          onClick={handleSave}
          disabled={saving || (total > 0 && !methodsMatch)}
          className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : `Confirmar · ${formatCOP(total)}`}
        </button>
      </div>
    </ModalWrapper>
  );
}

export function AgreementModal({ loan, onClose, onDone }) {
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
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
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
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
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
export function CancelModal({ loan, remaining, onClose, onDone }) {
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
          El capital pendiente de{" "}
          <span className="font-bold text-gray-900 dark:text-white">{formatCOP(remaining)}</span>{" "}
          volverá al saldo disponible del negocio al cancelar.
          {remaining < loan.amount && (
            <p className="mt-1 text-red-600/70 dark:text-red-300/60">
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
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
          />
          {!note.trim() && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
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

export function VoidPaymentModal({ payment, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!reason.trim()) return
    setSaving(true)
    await onConfirm(reason.trim())
    setSaving(false)
  }

  return (
    <ModalWrapper title="Anular pago" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
          Este pago de <span className="font-bold text-gray-900 dark:text-white">{formatCOP(payment.total_paid)}</span> del{' '}
          {new Date(payment.date + 'T12:00:00').toLocaleDateString('es-CO')} quedará marcado como anulado.
          El capital vuelve al saldo pendiente y el interés deja de contar como ganancia.
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Motivo de anulación *</label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: Valor errado, abonado a crédito incorrecto, pago doble..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
          />
          {!reason.trim() && <p className="text-xs text-red-600 dark:text-red-400 mt-1">El motivo es obligatorio</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !reason.trim()}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded-2xl active:scale-95 transition disabled:opacity-50"
        >
          {saving ? 'Anulando...' : 'Confirmar anulación'}
        </button>
      </div>
    </ModalWrapper>
  )
}
