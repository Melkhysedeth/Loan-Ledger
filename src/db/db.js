import Dexie from 'dexie';

export const db = new Dexie('LoanLedgerDB');

db.version(1).stores({
  clients: '++id, name, phone, cedula, address, notes, createdAt, status, rankingOverride',
  loans: '++id, clientId, amount, interestRate, interestAmount, frequency, startDate, numPayments, dueDate, status, notes, createdAt',
  payments: '++id, loanId, date, totalPaid, interestPaid, capitalPaid, notes',
});

db.version(2).stores({
  clients: '++id, name, phone, cedula, address, notes, createdAt, status, rankingOverride',
  loans: '++id, clientId, amount, interestRate, interestAmount, frequency, startDate, firstPaymentDate, numPayments, status, notes, createdAt',
  payments: '++id, loanId, date, totalPaid, interestPaid, capitalPaid, notes',
});

db.version(3).stores({
  clients: '++id, name, phone, cedula, address, notes, createdAt, status, rankingOverride',
  loans: '++id, clientId, amount, interestRate, interestAmount, frequency, startDate, firstPaymentDate, status, notes, createdAt',
  payments: '++id, loanId, date, totalPaid, interestPaid, capitalPaid, notes',
});

db.version(4).stores({
  clients: '++id, name, phone, cedula, address, notes, createdAt, status, rankingOverride',
  loans: '++id, clientId, amount, interestRate, interestAmount, frequency, startDate, firstPaymentDate, status, notes, createdAt, agreementDate, agreementNote',
  payments: '++id, loanId, date, totalPaid, interestPaid, capitalPaid, late, notes',
});