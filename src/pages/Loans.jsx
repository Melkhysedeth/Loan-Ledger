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
  Bell,
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
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  useEffect(() => {
    loadLoans();
  }, []);

  async function loadLoans() {
    setLoading(true);
    const [{ data: allLoans }, { data: allClients }, { data: allPayments }, { data: withdrawals }] =
      await Promise.all([
        supabase
          .from("loans")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("capital_withdrawals").select("amount, is_transfer"),
      ]);

    setTotalWithdrawn((withdrawals || []).filter(w => !w.is_transfer).reduce((s, w) => s + (w.amount || 0), 0));

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
  const totalLent = activeLoans.reduce((s, l) => s + (l.amount || 0), 0) - totalWithdrawn;
  const totalPending = activeLoans.reduce((s, l) => {
    const paid = payments
      .filter((p) => p.loan_id === l.id)
      .reduce((a, p) => a + (p.capital_paid || 0), 0) + (l.initial_capital_paid || 0);
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
    <div className="pb-24 bg-[#f3f4f6]">
      {/* Hero lila */}
      <div className="sticky top-0 z-20 pt-6 pb-10 px-4 bg-[#C9A8E8] border-t border-white/20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-[2rem]">
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

          <h1 className="text-2xl font-bold text-gray-900 mt-3">Préstamos</h1>
          <p className="text-xs text-gray-800/70 mb-4">Gestiona y consulta todos tus préstamos</p>

          {/* Métricas */}
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-800/70">Activos</p>
              <p className="text-xl font-bold text-gray-900">{activeLoans.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-800/70">En mora</p>
              <p className="text-xl font-bold text-gray-900">{overdueCount}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-800/70">Total prestado</p>
              <p className="text-xl font-bold text-gray-900">{formatCOP(totalLent)}</p>
            </div>
          </div>

          {/* Onda decorativa */}
          <svg className="w-full h-4 mt-3" viewBox="0 0 400 20" preserveAspectRatio="none">
            <path d="M0,10 Q50,20 100,10 T200,10 T300,10 T400,10" fill="none" stroke="rgba(255, 255, 255, 0.87)" strokeWidth="2" />
          </svg>

          {/* Buscador */}
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="w-full border-none bg-white/45 rounded-full pl-9 pr-3 py-2 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/30"
                placeholder="Buscar cliente o cédula..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-1 px-1 scrollbar-hide">
            {FILTERS.map((f) => {
              const cfg = STATUS_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition flex items-center gap-1.5
                    ${filter === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white/45 text-gray-700 border-transparent"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${filter === f ? "bg-white" : cfg.dot}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Botón Nuevo préstamo */}
          <button
            onClick={() => navigate("/new-loan")}
            className="w-full mt-3 mb-2 bg-gray-900 text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Plus size={18} /> Nuevo préstamo
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#f3f4f6] dark:bg-gray-900 rounded-t-[2rem] shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.25)] dark:shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.6)]" />
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
        className={`w-full ${even ? "bg-white dark:bg-gray-800" : "bg-white dark:bg-gray-800/60"} rounded-2xl shadow-md p-4 text-left active:scale-[0.98] transition`}
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
