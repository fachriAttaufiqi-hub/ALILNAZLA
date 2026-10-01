import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, numeric, integer } from 'drizzle-orm/pg-core';

// Users table linked with Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  monthlyBudget: numeric('monthly_budget', { precision: 14, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Transactions: Incomes & Expenses (Penerimaan & Pengeluaran)
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  type: text('type').notNull(), // 'income' | 'expense'
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  wallet: text('wallet').notNull().default('Tunai'), // e.g. Tunai, BCA, Mandiri, E-Wallet
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Debts and Receivables (Hutang & Piutang)
export const debts = pgTable('debts', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  type: text('type').notNull(), // 'debt' (Hutang kita) | 'receivable' (Piutang)
  person: text('person').notNull(), // Nama orang / pihak / institusi (Nama Akun Buku Pembantu)
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  dueDate: text('due_date'), // YYYY-MM-DD
  status: text('status').notNull().default('active'), // 'active' | 'paid_off'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Buku Pembantu Hutang & Piutang (Subsidiary Ledger Entries)
export const debtLedgerEntries = pgTable('debt_ledger_entries', {
  id: serial('id').primaryKey(),
  debtId: integer('debt_id').notNull(),
  userUid: text('user_uid').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  type: text('type').notNull(), // 'initial' | 'borrow_addition' | 'installment_payment' | 'settlement'
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 14, scale: 2 }).notNull(),
  wallet: text('wallet').default('Tunai'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Usaha Sampingan Transactions (Catatan Keuangan Khusus Bisnis/Freelance)
export const businessTransactions = pgTable('business_transactions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  type: text('type').notNull(), // 'income' (Pendapatan/Omzet) | 'expense' (Biaya/HPP)
  category: text('category').notNull(), // e.g. Penjualan Produk, Jasa/Freelance, HPP Bahan Baku, Operasional, Pemasaran, Prive/Gaji
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  wallet: text('wallet').notNull().default('Kas Usaha'),
  customerOrVendor: text('customer_or_vendor'),
  invoiceNumber: text('invoice_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Savings & Financial Goals (Pos Tabungan & Target Keuangan)
export const savings = pgTable('savings', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(), // e.g. Dana Darurat, Qurban, Pendidikan Anak, Liburan
  targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  targetDate: text('target_date'), // YYYY-MM-DD
  category: text('category').default('Umum'),
  color: text('color').default('#10b981'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Stored Monthly Reports (Laporan Keuangan Bulanan Otomatis Tersimpan)
export const monthlyReports = pgTable('monthly_reports', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  period: text('period').notNull(), // e.g. '2026-09'
  totalIncome: numeric('total_income', { precision: 14, scale: 2 }).notNull(),
  totalExpense: numeric('total_expense', { precision: 14, scale: 2 }).notNull(),
  netCashflow: numeric('net_cashflow', { precision: 14, scale: 2 }).notNull(),
  savingsDeposited: numeric('savings_deposited', { precision: 14, scale: 2 }).default('0').notNull(),
  debtPaid: numeric('debt_paid', { precision: 14, scale: 2 }).default('0').notNull(),
  savingsRate: numeric('savings_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  topExpenseCategory: text('top_expense_category'),
  statusSummary: text('status_summary'), // 'Sehat' | 'Stabil' | 'Waspada' | 'Defisit'
  evaluationNotes: text('evaluation_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  debts: many(debts),
  savings: many(savings),
  reports: many(monthlyReports),
}));
