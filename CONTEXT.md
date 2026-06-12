# Loan Ledger — Contexto del Proyecto

## Stack
- Vite + React + Tailwind CSS v3
- Dexie.js (IndexedDB local)
- Recharts (gráficas)
- react-router-dom

## Modelo de negocio
- Préstamos en COP
- Interés FIJO sobre capital inicial (no recalcula según saldo)
- Pago periódico: mensual o quincenal
- Cada pago = interés obligatorio + capital opcional (el cliente decide)
- Ranking de clientes: Excelente / Bueno / Regular / Moroso (auto + override manual)

## Estructura de carpetas
src/
├── components/
├── pages/
│   ├── Dashboard.jsx        (pendiente - Fase 4)
│   ├── Clients.jsx          (✅ completo)
│   ├── NewClient.jsx        (✅ completo)
│   ├── NewLoan.jsx          (en progreso - Fase 2)
│   └── ClientDetail.jsx     (pendiente - Fase 3)
├── db/
│   └── db.js                (✅ completo)
├── hooks/
├── utils/
│   ├── format.js            (✅ completo)
│   ├── loanCalc.js          (✅ completo)
│   └── ranking.js           (✅ completo)

## Modelo de datos (Dexie)
- clients: ++id, name, phone, cedula, address, notes, createdAt, status, rankingOverride
- loans: ++id, clientId, amount, interestRate, interestAmount, frequency, startDate, numPayments, dueDate, status, notes, createdAt
- payments: ++id, loanId, date, totalPaid, interestPaid, capitalPaid, notes, late (bool)

## Rutas
- /              → Dashboard
- /clients       → Lista de clientes
- /clients/new   → Crear cliente
- /clients/:id   → Editar cliente
- /new-loan      → Nuevo préstamo (buscar/seleccionar cliente + form préstamo)

## Fases
- Fase 1 ✅ Estructura base + navegación + DB
- Fase 2 🔄 CRUD clientes ✅ + NewLoan rediseñado (pendiente)
- Fase 3 ⏳ Registro de pagos + detalle de préstamo
- Fase 4 ⏳ Dashboard + gráficas
- Fase 5 ⏳ Mora + alertas + ranking automático
- Fase 6 ⏳ Conectar Supabase

## Pendiente inmediato
- Rediseñar NewLoan.jsx: buscar cliente existente o crear uno nuevo inline, luego form del préstamo
- Crear ClientDetail.jsx: historial de préstamos, pagos, ranking, notas