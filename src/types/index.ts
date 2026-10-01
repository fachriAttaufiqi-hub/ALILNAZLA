export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  userUid: string;
  type: TransactionType;
  category: string;
  amount: string;
  date: string;
  wallet: string;
  notes: string;
  createdAt?: string;
}

export type DebtType = 'debt' | 'receivable';
export type DebtStatus = 'active' | 'paid_off';

export interface Debt {
  id: number;
  userUid: string;
  type: DebtType;
  person: string;
  totalAmount: string;
  paidAmount: string;
  dueDate: string | null;
  status: DebtStatus;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DebtLedgerEntry {
  id: number;
  debtId: number;
  userUid: string;
  date: string;
  type: 'initial' | 'borrow_addition' | 'installment_payment' | 'settlement';
  amount: string;
  balanceAfter: string;
  wallet?: string;
  notes?: string;
  createdAt?: string;
}

export interface DebtWithLedger {
  debt: Debt;
  entries: DebtLedgerEntry[];
}

export interface BusinessTransaction {
  id: number;
  userUid: string;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  date: string;
  wallet: string;
  customerOrVendor?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface BusinessSummary {
  period: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  breakdowns: Array<{
    category: string;
    type: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  recentTransactions: BusinessTransaction[];
}

export interface Saving {
  id: number;
  userUid: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  category: string;
  color: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyReportRecord {
  id: number;
  userUid: string;
  period: string; // YYYY-MM
  totalIncome: string;
  totalExpense: string;
  netCashflow: string;
  savingsDeposited: string;
  debtPaid: string;
  savingsRate: string;
  topExpenseCategory: string | null;
  statusSummary: string | null;
  evaluationNotes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyReportResponse {
  report: MonthlyReportRecord;
  period: string;
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netCashflow: number;
    savingsDeposited: number;
    debtPaid: number;
    savingsRate: number;
    topCategory: string;
    statusSummary: string;
    evaluationNotes: string;
  };
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  incomeBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  dailyFlow: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
  }>;
  transactionCount: number;
}

export interface DashboardSummary {
  period: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  monthlyBudget: number;
  budgetUsedPercent: number;
  totalSavingsAccumulated: number;
  totalSavingsTarget: number;
  totalDebtRemaining: number;
  totalReceivableRemaining: number;
  recentTransactions: Transaction[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl?: string | null;
  monthlyBudget: string;
}
