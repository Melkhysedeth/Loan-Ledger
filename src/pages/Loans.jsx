import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../db/supabase";
import { formatCOP } from "../utils/format";
import { calcNextPaymentDate, classifyLoan } from "../utils/loanCalc";
import {
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  CreditCard,
  Calendar,
  Plus,
} from "lucide-react";
import useLongPress from "../hooks/useLongPress";
import ContextMenu from "../components/ContextMenu";
import ConfirmModal from "../components/ConfirmModal";

const STATUS_CONFIG = {
  active: {
    label: "Al día",
    color:
      "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400",
    dot: "bg-green-500",
    Icon: CheckCircle,
  },
  frozen: {
    label: "Congelado",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
    Icon: Clock,
  },
  overdue: {
    label: "En mora",
    color: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
    Icon: AlertCircle,
  },
  paid: {
    label: "Pagado",
    color: "text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400",
    dot: "bg-gray-400",
    Icon: CheckCircle,
  },
  agreement: {
    label: "Acuerdo",
    color:
      "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
    Icon: AlertCircle,
  },
};

const FILTERS = ["active", "overdue", "frozen", "paid", "agreement"];

export default function Loans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoans();
  }, []);

  async function loadLoans() {
    setLoading(true);
    const [{ data: allLoans }, { data: allClients }, { data: allPayments }] =
      await Promise.all([
        supabase
          .from("loans")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("*"),
        supabase.from("payments").select("*"),
      ]);

    const loansList = allLoans || [];
    const paymentsList = allPayments || [];

    // FIX: detectar préstamos que pasan de 'active' a 'overdue' (vencidos)
    const toMarkOverdue = loansList.filter((loan) => {
      if (loan.status !== "active") return false;
      const paymentsMade = paymentsList.filter(
        (p) => p.loan_id === loan.id,
      ).length;
      const classification = classifyLoan(
        loan.first_payment_date,
        loan.frequency,
        paymentsMade,
      );
      return classification === "overdue";
    });

    // FIX: detectar préstamos marcados como 'overdue' que YA SE PUSIERON AL DÍA
    // (el cliente pagó y la clasificación actual ya no es 'overdue').
    // Sin esto, el status quedaba pegado en 'overdue' para siempre.
    const toMarkActive = loansList.filter((loan) => {
      if (loan.status !== "overdue") return false;
      const paymentsMade = paymentsList.filter(
        (p) => p.loan_id === loan.id,
      ).length;
      const classification = classifyLoan(
        loan.first_payment_date,
        loan.frequency,
        paymentsMade,
      );
      return classification !== "overdue";
    });

    // FIX: detectar préstamos cuyo capital pendiente ya llegó a 0 (o menos)
    // pero el status en BD nunca se actualizó a 'paid' (pagos viejos registrados
    // antes de este fix, o préstamos que llegaron a 0 sin pasar por Liquidar).
    const toMarkPaid = loansList.filter((loan) => {
      if (!["active", "overdue", "agreement"].includes(loan.status))
        return false;
      const capitalPaid = paymentsList
        .filter((p) => p.loan_id === loan.id)
        .reduce((s, p) => s + (p.capital_paid || 0), 0);
      return loan.amount - capitalPaid <= 0;
    });

    const needsUpdate =
      toMarkOverdue.length > 0 ||
      toMarkActive.length > 0 ||
      toMarkPaid.length > 0;

    if (needsUpdate) {
      await Promise.all([
        ...toMarkOverdue.map((loan) =>
          supabase
            .from("loans")
            .update({ status: "overdue" })
            .eq("id", loan.id),
        ),
        ...toMarkActive.map((loan) =>
          supabase.from("loans").update({ status: "active" }).eq("id", loan.id),
        ),
        ...toMarkPaid.map((loan) =>
          supabase.from("loans").update({ status: "paid" }).eq("id", loan.id),
        ),
      ]);

      // Recargar con los status actualizados
      const { data: updatedLoans } = await supabase
        .from("loans")
        .select("*")
        .order("created_at", { ascending: false });
      const enriched = (updatedLoans || []).map((loan) => ({
        ...loan,
        client: (allClients || []).find((c) => c.id === loan.client_id),
      }));
      setLoans(enriched);
      setPayments(paymentsList);
      setLoading(false);
      return;
    }

    const enriched = loansList.map((loan) => ({
      ...loan,
      client: (allClients || []).find((c) => c.id === loan.client_id),
    }));

    setLoans(enriched);
    setPayments(paymentsList);
    setLoading(false);
  }

  function handleEditLoan(loan) {
    navigate("/new-loan", { state: { editLoan: loan } });
  }

  async function handleDeleteLoan(loanId) {
    await supabase.from("loans").delete().eq("id", loanId);
    await loadLoans();
  }

  // Métricas del header
  const activeLoans = loans.filter((l) =>
    ["active", "overdue", "frozen", "agreement"].includes(l.status),
  );
  const totalLent = activeLoans.reduce((s, l) => s + (l.amount || 0), 0);
  const totalPending = activeLoans.reduce((s, l) => {
    const paid = payments
      .filter((p) => p.loan_id === l.id)
      .reduce((a, p) => a + (p.capital_paid || 0), 0);
    return s + (l.amount - paid);
  }, 0);
  const overdueCount = loans.filter((l) => l.status === "overdue").length;

  const filtered = loans.filter((l) => {
    const matchStatus = l.status === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      l.client?.name?.toLowerCase().includes(q) ||
      l.client?.cedula?.includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard size={22} className="text-blue-400" /> Préstamos
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Gestiona y consulta todos tus préstamos
            </p>
          </div>
          <button
            onClick={() => navigate("/new-loan")}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow active:scale-95 transition flex items-center gap-1"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none placeholder-gray-400"
            placeholder="Buscar cliente o cédula..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Total prestado</p>
            <p className="text-xs font-bold text-blue-500">
              {formatCOP(totalLent)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Saldo pendiente</p>
            <p className="text-xs font-bold text-amber-500">
              {formatCOP(totalPending)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Activos</p>
            <p className="text-xs font-bold text-green-500">
              {activeLoans.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">En mora</p>
            <p className="text-xs font-bold text-red-500">{overdueCount}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => {
          const cfg = STATUS_CONFIG[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition flex items-center gap-1.5
                                ${filter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${filter === f ? "bg-white" : cfg.dot}`}
              />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="px-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 mt-16 text-sm">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-16">
            <p>
              No hay préstamos {STATUS_CONFIG[filter]?.label.toLowerCase()}s
            </p>
          </div>
        ) : (
          filtered.map((loan, i) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              index={i + 1}
              payments={payments.filter((p) => p.loan_id === loan.id)}
              onPress={() => navigate(`/loans/${loan.id}`)}
              onEdit={handleEditLoan}
              onDeleted={handleDeleteLoan}
              even={i % 2 === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LoanCard({ loan, index, payments, onPress, onEdit, onDeleted, even }) {
  const cfg = STATUS_CONFIG[loan.status] || STATUS_CONFIG.active;
  const { Icon } = cfg;
  const name = loan.client?.name || "Cliente";
  const phone = loan.client?.phone || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const longPress = useLongPress((rect) => {
    setAnchorRect(rect);
    setMenuOpen(true);
  }, 500);

  function handleEdit() {
    setMenuOpen(false);
    onEdit(loan);
  }

  function handleDeleteRequest() {
    setMenuOpen(false);
    if (paymentsMade > 0) {
      setBlockedOpen(true);
    } else {
      setConfirmOpen(true);
    }
  }

  async function handleConfirmDelete() {
    await onDeleted(loan.id);
    setConfirmOpen(false);
  }

  const paymentsMade = payments.length;
  const capitalPaid = payments.reduce((s, p) => s + (p.capital_paid || 0), 0);
  const pending = loan.amount - capitalPaid;

  const nextPayment = calcNextPaymentDate(
    loan.first_payment_date,
    loan.frequency,
    paymentsMade,
  );
  const classification = classifyLoan(
    loan.first_payment_date,
    loan.frequency,
    paymentsMade,
  );

  // Etiqueta de fecha según estado
  const isOverdue = loan.status === "overdue" || classification === "overdue";
  const isPaid = loan.status === "paid";

  // FIX: la fecha de "Pagado el" debe ser la del último pago real (sea por
  // Registrar pago o por Liquidar), no `loan.updated_at` (que cambia por
  // cualquier edición del préstamo, no solo por pagos).
  const lastPaymentDate =
    payments.length > 0
      ? payments.reduce(
        (latest, p) => (!latest || p.date > latest ? p.date : latest),
        null,
      )
      : null;

  const dateLabel = isPaid ? 'Pagado el' : isOverdue ? 'Vencido desde' : 'Próximo pago'
  const dateValue = isPaid
    ? (lastPaymentDate ? new Date(lastPaymentDate + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
    : nextPayment
      ? nextPayment.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—'

  const dateColor = isPaid ? 'text-gray-400' : isOverdue ? 'text-red-500' : 'text-blue-500'

  return (
    <>
      <button
        onClick={onPress}
        {...longPress}
        className={`w-full ${even ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-800/60"} rounded-2xl shadow-md p-4 text-left active:scale-[0.98] transition`}
      >
        {/* Fila superior: código + estado */}
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-blue-500">
            #{String(index).padStart(4, "0")}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        {/* Nombre y teléfono + fecha */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              {name}
            </p>
            {phone && <p className="text-xs text-gray-400">{phone}</p>}
          </div>
          <div className="text-right shrink-0 ml-2">
            <p className="text-[10px] text-gray-400">{dateLabel}</p>
            <p
              className={`text-xs font-semibold flex items-center gap-1 justify-end ${dateColor}`}
            >
              <Calendar size={10} /> {dateValue}
            </p>
          </div>
        </div>

        {/* Métricas: monto, pendiente, cuotas */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-gray-400">Monto</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
              {formatCOP(loan.amount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Pendiente</p>
            <p
              className={`text-xs font-bold ${isPaid ? "text-gray-400" : "text-amber-500"}`}
            >
              {formatCOP(pending)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Cuotas</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
              {loan.num_payments
                ? `${paymentsMade} / ${loan.num_payments}`
                : `${paymentsMade} pagos`}
            </p>
          </div>
        </div>
      </button>

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
        message="Esta acción eliminará el préstamo de forma permanente. No se puede deshacer."
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmOpen(false)}
      />
      <ConfirmModal
        open={blockedOpen}
        mode="blocked"
        message="Este préstamo ya tiene pagos registrados. Si necesitas detenerlo, usa la opción Cancelar dentro del préstamo en vez de eliminarlo."
        onClose={() => setBlockedOpen(false)}
      />
    </>
  );
}
