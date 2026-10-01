import { 
  Transaction, 
  Debt, 
  Saving, 
  MonthlyReportResponse, 
  MonthlyReportRecord, 
  DashboardSummary, 
  UserProfile,
  DebtWithLedger,
  DebtLedgerEntry,
  BusinessTransaction,
  BusinessSummary
} from '../types/index.ts';
import { supabase, isSupabaseApiKeyConfigured } from './supabase.ts';

// Local storage keys for offline & Netlify static hosting persistence
const STORAGE_KEYS = {
  BUDGET: 'keluargafin_budget',
  TRANSACTIONS: 'keluargafin_transactions',
  DEBTS: 'keluargafin_debts',
  DEBT_LEDGER: 'keluargafin_debt_ledger_entries',
  SAVINGS: 'keluargafin_savings',
  BUSINESS: 'keluargafin_business_transactions',
  REPORTS: 'keluargafin_monthly_reports',
};

// Safe LocalStorage helpers
const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key: string, data: any) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

// Seed initial demo data for new users
const getInitialTransactions = (): Transaction[] => {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  return [
    { id: 1, userUid: 'keluarga_utama', type: 'income', category: 'Gaji Bulanan', amount: '18500000', date: `${currentPeriod}-01`, wallet: 'BCA', notes: 'Gaji pokok bulanan keluarga' },
    { id: 2, userUid: 'keluarga_utama', type: 'income', category: 'Usaha Sampingan', amount: '3500000', date: `${currentPeriod}-05`, wallet: 'Mandiri', notes: 'Toko online & freelance' },
    { id: 3, userUid: 'keluarga_utama', type: 'expense', category: 'Belanja Bulanan', amount: '3200000', date: `${currentPeriod}-02`, wallet: 'BCA', notes: 'Sembako, bahan masakan dapur, perlengkapan' },
    { id: 4, userUid: 'keluarga_utama', type: 'expense', category: 'Tagihan & Utilitas', amount: '850000', date: `${currentPeriod}-03`, wallet: 'BCA', notes: 'Listrik PLN 2200VA & PDAM' },
    { id: 5, userUid: 'keluarga_utama', type: 'expense', category: 'Tagihan & Utilitas', amount: '450000', date: `${currentPeriod}-04`, wallet: 'BCA', notes: 'Paket Internet Fiber 50 Mbps' },
    { id: 6, userUid: 'keluarga_utama', type: 'expense', category: 'Pendidikan', amount: '1800000', date: `${currentPeriod}-06`, wallet: 'Mandiri', notes: 'SPP Sekolah & Bimbel anak' },
    { id: 7, userUid: 'keluarga_utama', type: 'expense', category: 'Transportasi', amount: '750000', date: `${currentPeriod}-08`, wallet: 'E-Wallet', notes: 'BBM Pertamax & saldo e-Toll' },
    { id: 8, userUid: 'keluarga_utama', type: 'expense', category: 'Makanan & Kuliner', amount: '1200000', date: `${currentPeriod}-10`, wallet: 'E-Wallet', notes: 'Makan keluarga akhir pekan' },
    { id: 9, userUid: 'keluarga_utama', type: 'expense', category: 'Kesehatan', amount: '400000', date: `${currentPeriod}-12`, wallet: 'Tunai', notes: 'Vitamin & obat flu keluarga' },
    { id: 10, userUid: 'keluarga_utama', type: 'expense', category: 'Alokasi Tabungan', amount: '3000000', date: `${currentPeriod}-05`, wallet: 'BCA', notes: 'Setor Dana Darurat' },
    { id: 11, userUid: 'keluarga_utama', type: 'expense', category: 'Pembayaran Hutang', amount: '1250000', date: `${currentPeriod}-07`, wallet: 'BCA', notes: 'Cicilan motor bulan ini' },
  ];
};

const getInitialDebts = (): Debt[] => {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  return [
    {
      id: 1,
      userUid: 'keluarga_utama',
      type: 'debt',
      person: 'BCA Finance (Cicilan Motor)',
      totalAmount: '25000000',
      paidAmount: '12500000',
      dueDate: `${currentPeriod}-15`,
      status: 'active',
      notes: 'Cicilan motor Vario 160 sisa 10 bulan',
    },
    {
      id: 2,
      userUid: 'keluarga_utama',
      type: 'receivable',
      person: 'Rudi Pratama (Rekan Kerja)',
      totalAmount: '2000000',
      paidAmount: '500000',
      dueDate: `${currentPeriod}-25`,
      status: 'active',
      notes: 'Talangan service laptop',
    },
  ];
};

const getInitialDebtLedger = (): DebtLedgerEntry[] => {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  return [
    {
      id: 1,
      debtId: 1,
      userUid: 'keluarga_utama',
      date: `${currentPeriod}-01`,
      type: 'initial',
      amount: '25000000',
      balanceAfter: '12500000',
      wallet: 'Kas/Rekening',
      notes: 'Pembukaan Buku Pembantu Hutang BCA Finance',
    },
    {
      id: 2,
      debtId: 1,
      userUid: 'keluarga_utama',
      date: `${currentPeriod}-07`,
      type: 'installment_payment',
      amount: '1250000',
      balanceAfter: '12500000',
      wallet: 'BCA',
      notes: 'Pembayaran angsuran motor ke-25',
    },
    {
      id: 3,
      debtId: 2,
      userUid: 'keluarga_utama',
      date: `${currentPeriod}-01`,
      type: 'initial',
      amount: '2000000',
      balanceAfter: '1500000',
      wallet: 'Kas/Rekening',
      notes: 'Pembukaan Buku Pembantu Piutang Rudi Pratama',
    },
    {
      id: 4,
      debtId: 2,
      userUid: 'keluarga_utama',
      date: `${currentPeriod}-10`,
      type: 'installment_payment',
      amount: '500000',
      balanceAfter: '1500000',
      wallet: 'Mandiri',
      notes: 'Cicilan talangan pertama',
    }
  ];
};

const getInitialSavings = (): Saving[] => {
  return [
    {
      id: 1,
      userUid: 'keluarga_utama',
      name: 'Dana Darurat (6 Bulan Pengeluaran)',
      targetAmount: '60000000',
      currentAmount: '24000000',
      targetDate: '2027-12-31',
      category: 'Dana Darurat',
      color: '#10b981',
      notes: 'Disimpan di Reksadana Pasar Uang / Deposito',
    },
    {
      id: 2,
      userUid: 'keluarga_utama',
      name: 'Tabungan Qurban & Idul Fitri',
      targetAmount: '12000000',
      currentAmount: '7500000',
      targetDate: '2027-06-01',
      category: 'Ibadah',
      color: '#3b82f6',
      notes: 'Target 1 ekor sapi patungan',
    },
    {
      id: 3,
      userUid: 'keluarga_utama',
      name: 'Liburan Keluarga Akhir Tahun',
      targetAmount: '10000000',
      currentAmount: '4500000',
      targetDate: '2026-12-20',
      category: 'Liburan',
      color: '#f59e0b',
      notes: 'Trip keluarga ke Yogyakarta',
    },
  ];
};

const getInitialBusiness = (): BusinessTransaction[] => {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  return [
    {
      id: 1,
      userUid: 'keluarga_utama',
      type: 'income',
      category: 'Penjualan Produk',
      amount: '4500000',
      date: `${currentPeriod}-03`,
      wallet: 'Kas Usaha',
      customerOrVendor: 'Ibu Ratna & Rekan',
      invoiceNumber: 'INV-2026-001',
      notes: 'Penjualan paket hampers keluarga',
    },
    {
      id: 2,
      userUid: 'keluarga_utama',
      type: 'expense',
      category: 'HPP / Bahan Baku',
      amount: '1800000',
      date: `${currentPeriod}-04`,
      wallet: 'Kas Usaha',
      customerOrVendor: 'Toko Bahan Kue Berkah',
      notes: 'Bahan baku produksi awal bulan',
    },
    {
      id: 3,
      userUid: 'keluarga_utama',
      type: 'expense',
      category: 'Operasional Usaha',
      amount: '350000',
      date: `${currentPeriod}-06`,
      wallet: 'Kas Usaha',
      notes: 'Packaging & kurir pengiriman',
    }
  ];
};

// Persistent in-memory + LocalStorage cache
const localCache = {
  budget: loadFromStorage<string>(STORAGE_KEYS.BUDGET, '15000000'),
  transactions: loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, getInitialTransactions()),
  debts: loadFromStorage<Debt[]>(STORAGE_KEYS.DEBTS, getInitialDebts()),
  debtLedger: loadFromStorage<DebtLedgerEntry[]>(STORAGE_KEYS.DEBT_LEDGER, getInitialDebtLedger()),
  savings: loadFromStorage<Saving[]>(STORAGE_KEYS.SAVINGS, getInitialSavings()),
  business: loadFromStorage<BusinessTransaction[]>(STORAGE_KEYS.BUSINESS, getInitialBusiness()),
  reportsHistory: loadFromStorage<MonthlyReportRecord[]>(STORAGE_KEYS.REPORTS, []),
};

export class ApiClient {
  private getToken: () => Promise<string | null>;
  private isDemo: boolean;

  constructor(getToken: () => Promise<string | null>, isDemo: boolean = false) {
    this.getToken = getToken;
    this.isDemo = isDemo;
  }

  // Universal request with automatic fallback to Direct Supabase or LocalStorage
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isNetlifyOrStatic = typeof window !== 'undefined' && 
      (window.location.hostname.includes('netlify.app') || window.location.port === '' || !window.location.port.includes('3000'));

    // Try Express backend if not definitely on static Netlify host
    if (!isNetlifyOrStatic) {
      try {
        const token = await this.getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers as Record<string, string>),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(endpoint, {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Fall through to Direct Supabase / LocalStorage fallback
      }
    }

    // Direct Supabase & LocalStorage client fallback
    return this.handleFallbackRequest<T>(endpoint, options);
  }

  // Fallback handler: Works 100% offline, on Netlify, or with direct Supabase client
  private async handleFallbackRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    const method = options.method || 'GET';
    const url = new URL(endpoint, 'http://localhost');
    const pathname = url.pathname;

    // 1. User Profile
    if (pathname === '/api/user/profile') {
      return {
        uid: 'keluarga_utama',
        email: 'keluarga@keluargafin.id',
        displayName: 'Keluarga Utama',
        monthlyBudget: localCache.budget,
      } as T;
    }

    // 2. Budget Update
    if (pathname === '/api/user/budget' && method === 'PUT') {
      const body = JSON.parse(options.body as string);
      localCache.budget = String(body.monthlyBudget);
      saveToStorage(STORAGE_KEYS.BUDGET, localCache.budget);
      return { success: true, monthlyBudget: localCache.budget } as T;
    }

    // 3. Dashboard Summary
    if (pathname === '/api/dashboard/summary') {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const curTx = localCache.transactions.filter(t => t.date.startsWith(currentPeriod));
      const inc = curTx.filter(t => t.type === 'income').reduce((a, b) => a + parseFloat(b.amount || '0'), 0);
      const exp = curTx.filter(t => t.type === 'expense').reduce((a, b) => a + parseFloat(b.amount || '0'), 0);
      const bgt = parseFloat(localCache.budget || '0');

      const totSav = localCache.savings.reduce((a, b) => a + parseFloat(b.currentAmount || '0'), 0);
      const totSavTar = localCache.savings.reduce((a, b) => a + parseFloat(b.targetAmount || '0'), 0);

      let totDebt = 0;
      let totRec = 0;
      localCache.debts.forEach(d => {
        if (d.status === 'active') {
          const rem = Math.max(0, parseFloat(d.totalAmount || '0') - parseFloat(d.paidAmount || '0'));
          if (d.type === 'debt') totDebt += rem;
          else totRec += rem;
        }
      });

      return {
        period: currentPeriod,
        totalIncome: inc,
        totalExpense: exp,
        netCashflow: inc - exp,
        monthlyBudget: bgt,
        budgetUsedPercent: bgt > 0 ? Math.min(100, Math.round((exp / bgt) * 100)) : 0,
        totalSavingsAccumulated: totSav,
        totalSavingsTarget: totSavTar,
        totalDebtRemaining: totDebt,
        totalReceivableRemaining: totRec,
        recentTransactions: [...localCache.transactions].reverse().slice(0, 5),
      } as T;
    }

    // 4. Transactions CRUD
    if (pathname === '/api/transactions') {
      if (method === 'GET') {
        const period = url.searchParams.get('period');
        const type = url.searchParams.get('type');
        const cat = url.searchParams.get('category');

        let res = [...localCache.transactions];
        if (period) res = res.filter(t => t.date.startsWith(period));
        if (type && type !== 'Semua' && type !== 'all') res = res.filter(t => t.type === type);
        if (cat && cat !== 'Semua' && cat !== 'all') res = res.filter(t => t.category === cat);
        res.sort((a, b) => b.date.localeCompare(a.date));
        return res as T;
      }
      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newTx: Transaction = {
          id: Date.now(),
          userUid: 'keluarga_utama',
          type: body.type,
          category: body.category,
          amount: String(body.amount),
          date: body.date,
          wallet: body.wallet || 'Tunai',
          notes: body.notes || '',
        };
        localCache.transactions.unshift(newTx);
        saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);

        // Sync directly to Supabase if configured
        if (supabase) {
          supabase.from('transactions').insert([{
            user_uid: 'keluarga_utama',
            type: newTx.type,
            category: newTx.category,
            amount: newTx.amount,
            date: newTx.date,
            wallet: newTx.wallet,
            notes: newTx.notes,
          }]).then(({ error }) => {
            if (error) console.warn('Supabase insert transaction:', error.message);
          });
        }

        return newTx as T;
      }
    }

    if (pathname.startsWith('/api/transactions/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);
      const idx = localCache.transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        localCache.transactions[idx] = { ...localCache.transactions[idx], ...body };
        saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        return localCache.transactions[idx] as T;
      }
    }

    if (pathname.startsWith('/api/transactions/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      localCache.transactions = localCache.transactions.filter(t => t.id !== id);
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
      return { success: true } as T;
    }

    // 5. Debts & Receivables CRUD
    if (pathname === '/api/debts') {
      if (method === 'GET') {
        return [...localCache.debts] as T;
      }
      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newDebt: Debt = {
          id: Date.now(),
          userUid: 'keluarga_utama',
          type: body.type,
          person: body.person,
          totalAmount: String(body.totalAmount),
          paidAmount: String(body.paidAmount || '0'),
          dueDate: body.dueDate || null,
          status: parseFloat(body.paidAmount || '0') >= parseFloat(body.totalAmount) ? 'paid_off' : 'active',
          notes: body.notes || '',
        };
        localCache.debts.unshift(newDebt);
        saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);

        // Automatically create initial Buku Pembantu entry
        const remainingInit = Math.max(0, parseFloat(newDebt.totalAmount) - parseFloat(newDebt.paidAmount));
        const initEntry: DebtLedgerEntry = {
          id: Date.now() + 1,
          debtId: newDebt.id,
          userUid: 'keluarga_utama',
          date: new Date().toISOString().split('T')[0],
          type: 'initial',
          amount: newDebt.totalAmount,
          balanceAfter: String(remainingInit),
          wallet: 'Kas/Rekening',
          notes: body.notes || `Pembukaan Buku Pembantu ${newDebt.type === 'debt' ? 'Hutang' : 'Piutang'} untuk ${newDebt.person}`,
        };
        localCache.debtLedger.push(initEntry);
        saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);

        // Sync to Supabase
        if (supabase) {
          supabase.from('debts').insert([{
            user_uid: 'keluarga_utama',
            type: newDebt.type,
            person: newDebt.person,
            total_amount: newDebt.totalAmount,
            paid_amount: newDebt.paidAmount,
            due_date: newDebt.dueDate,
            status: newDebt.status,
            notes: newDebt.notes,
          }]).then(({ error }) => {
            if (error) console.warn('Supabase insert debt error:', error.message);
          });
        }

        return newDebt as T;
      }
    }

    if (pathname.startsWith('/api/debts/') && pathname.endsWith('/ledger')) {
      const parts = pathname.split('/');
      const debtId = parseInt(parts[3], 10);

      if (method === 'GET') {
        const debt = localCache.debts.find(d => d.id === debtId);
        if (!debt) {
          throw new Error('Data hutang tidak ditemukan');
        }
        const entries = localCache.debtLedger.filter(e => e.debtId === debtId);
        entries.sort((a, b) => a.date.localeCompare(b.date));
        return { debt, entries } as T;
      }

      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        const debt = localCache.debts.find(d => d.id === debtId);
        if (!debt) {
          throw new Error('Data hutang tidak ditemukan');
        }

        const numAmount = parseFloat(body.amount);
        let newTotal = parseFloat(debt.totalAmount);
        let newPaid = parseFloat(debt.paidAmount);

        if (body.type === 'borrow_addition') {
          newTotal += numAmount;
        } else {
          newPaid += numAmount;
        }

        const remaining = Math.max(0, newTotal - newPaid);
        debt.totalAmount = String(newTotal);
        debt.paidAmount = String(newPaid);
        debt.status = newPaid >= newTotal ? 'paid_off' : 'active';
        saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);

        const newEntry: DebtLedgerEntry = {
          id: Date.now(),
          debtId,
          userUid: 'keluarga_utama',
          date: body.date || new Date().toISOString().split('T')[0],
          type: body.type || 'installment_payment',
          amount: String(numAmount),
          balanceAfter: String(remaining),
          wallet: body.wallet || 'Tunai',
          notes: body.notes || '',
        };
        localCache.debtLedger.push(newEntry);
        saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);

        // Record in household transactions if requested
        if (body.recordTransaction) {
          const isDebt = debt.type === 'debt';
          let txType: 'income' | 'expense' = 'expense';
          let txCat = isDebt ? 'Pembayaran Hutang' : 'Penerimaan Piutang';

          if (body.type === 'borrow_addition') {
            txType = isDebt ? 'income' : 'expense';
            txCat = isDebt ? 'Penerimaan Pinjaman' : 'Pemberian Pinjaman';
          }

          const tx: Transaction = {
            id: Date.now() + 2,
            userUid: 'keluarga_utama',
            type: txType,
            category: txCat,
            amount: String(numAmount),
            date: body.date || new Date().toISOString().split('T')[0],
            wallet: body.wallet || 'Tunai',
            notes: body.notes || `Mutasi Buku Pembantu: ${debt.person}`,
          };
          localCache.transactions.unshift(tx);
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        }

        return newEntry as T;
      }
    }

    if (pathname.includes('/pay') && method === 'POST') {
      const parts = pathname.split('/');
      const debtId = parseInt(parts[3], 10);
      const body = JSON.parse(options.body as string);
      const d = localCache.debts.find(item => item.id === debtId);
      if (d) {
        const newPaid = parseFloat(d.paidAmount) + parseFloat(body.paymentAmount);
        d.paidAmount = String(newPaid);
        if (newPaid >= parseFloat(d.totalAmount)) d.status = 'paid_off';
        saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);

        // Record Buku Pembantu entry
        const remaining = Math.max(0, parseFloat(d.totalAmount) - newPaid);
        localCache.debtLedger.push({
          id: Date.now(),
          debtId: d.id,
          userUid: 'keluarga_utama',
          date: body.date || new Date().toISOString().split('T')[0],
          type: 'installment_payment',
          amount: String(body.paymentAmount),
          balanceAfter: String(remaining),
          wallet: body.wallet || 'Tunai',
          notes: body.notes || `Pembayaran cicilan / pelunasan ${d.person}`,
        });
        saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);

        if (body.recordTransaction) {
          localCache.transactions.unshift({
            id: Date.now() + 1,
            userUid: 'keluarga_utama',
            type: d.type === 'debt' ? 'expense' : 'income',
            category: d.type === 'debt' ? 'Pembayaran Hutang' : 'Penerimaan Piutang',
            amount: String(body.paymentAmount),
            date: body.date || new Date().toISOString().slice(0, 10),
            wallet: body.wallet || 'Tunai',
            notes: body.notes || `Cicilan/Pelunasan ${d.person}`,
          });
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        }
        return d as T;
      }
    }

    if (pathname.startsWith('/api/debts/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);
      const idx = localCache.debts.findIndex(d => d.id === id);
      if (idx !== -1) {
        localCache.debts[idx] = { ...localCache.debts[idx], ...body };
        saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);
        return localCache.debts[idx] as T;
      }
    }

    if (pathname.startsWith('/api/debts/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      localCache.debts = localCache.debts.filter(d => d.id !== id);
      localCache.debtLedger = localCache.debtLedger.filter(e => e.debtId !== id);
      saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);
      saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);
      return { success: true } as T;
    }

    // 6. Savings CRUD
    if (pathname === '/api/savings') {
      if (method === 'GET') return [...localCache.savings] as T;
      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newS: Saving = {
          id: Date.now(),
          userUid: 'keluarga_utama',
          name: body.name,
          targetAmount: String(body.targetAmount),
          currentAmount: String(body.currentAmount || '0'),
          targetDate: body.targetDate || null,
          category: body.category || 'Umum',
          color: body.color || '#10b981',
          notes: body.notes || '',
        };
        localCache.savings.unshift(newS);
        saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
        return newS as T;
      }
    }

    if (pathname.includes('/adjust') && method === 'POST') {
      const parts = pathname.split('/');
      const savingId = parseInt(parts[3], 10);
      const body = JSON.parse(options.body as string);
      const s = localCache.savings.find(item => item.id === savingId);
      if (s) {
        const amt = parseFloat(body.amount);
        const cur = parseFloat(s.currentAmount);
        s.currentAmount = String(body.actionType === 'withdraw' ? Math.max(0, cur - amt) : cur + amt);
        saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);

        if (body.recordTransaction) {
          localCache.transactions.unshift({
            id: Date.now(),
            userUid: 'keluarga_utama',
            type: body.actionType === 'withdraw' ? 'income' : 'expense',
            category: body.actionType === 'withdraw' ? 'Pencairan Tabungan' : 'Alokasi Tabungan',
            amount: String(amt),
            date: body.date || new Date().toISOString().slice(0, 10),
            wallet: body.wallet || 'Tunai',
            notes: body.notes || `Penyesuaian dana pos ${s.name}`,
          });
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        }
        return s as T;
      }
    }

    if (pathname.startsWith('/api/savings/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);
      const idx = localCache.savings.findIndex(s => s.id === id);
      if (idx !== -1) {
        localCache.savings[idx] = { ...localCache.savings[idx], ...body };
        saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
        return localCache.savings[idx] as T;
      }
    }

    if (pathname.startsWith('/api/savings/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      localCache.savings = localCache.savings.filter(s => s.id !== id);
      saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
      return { success: true } as T;
    }

    // 7. Business Transactions & Summary
    if (pathname === '/api/business/transactions') {
      if (method === 'GET') {
        const period = url.searchParams.get('period');
        let res = [...localCache.business];
        if (period) res = res.filter(t => t.date.startsWith(period));
        res.sort((a, b) => b.date.localeCompare(a.date));
        return res as T;
      }
      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newBiz: BusinessTransaction = {
          id: Date.now(),
          userUid: 'keluarga_utama',
          type: body.type,
          category: body.category,
          amount: String(body.amount),
          date: body.date,
          wallet: body.wallet || 'Kas Usaha',
          customerOrVendor: body.customerOrVendor || '',
          invoiceNumber: body.invoiceNumber || '',
          notes: body.notes || '',
        };
        localCache.business.unshift(newBiz);
        saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
        return newBiz as T;
      }
    }

    if (pathname.startsWith('/api/business/transactions/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);
      const idx = localCache.business.findIndex(b => b.id === id);
      if (idx !== -1) {
        localCache.business[idx] = { ...localCache.business[idx], ...body };
        saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
        return localCache.business[idx] as T;
      }
    }

    if (pathname.startsWith('/api/business/transactions/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      localCache.business = localCache.business.filter(b => b.id !== id);
      saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
      return { success: true } as T;
    }

    if (pathname === '/api/business/summary') {
      const period = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);
      const btx = localCache.business.filter(t => t.date.startsWith(period));

      let rev = 0;
      let cogs = 0;
      let opex = 0;
      let prive = 0;

      btx.forEach(t => {
        const val = parseFloat(t.amount || '0');
        if (t.type === 'income') {
          rev += val;
        } else {
          const cat = t.category.toLowerCase();
          if (cat.includes('hpp') || cat.includes('bahan')) cogs += val;
          else if (cat.includes('prive') || cat.includes('gaji')) prive += val;
          else opex += val;
        }
      });

      const gross = rev - cogs;
      const net = gross - opex;

      return {
        period,
        revenue: rev,
        cogs,
        grossProfit: gross,
        operatingExpenses: opex,
        netProfit: net,
        priveTaken: prive,
        retainedEarnings: net - prive,
        marginPercent: rev > 0 ? Math.round((net / rev) * 100) : 0,
        transactionCount: btx.length,
      } as T;
    }

    if (pathname === '/api/business/transfer-prive' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      const amt = parseFloat(body.amount);
      const curDate = body.date || new Date().toISOString().slice(0, 10);

      // Business expense
      localCache.business.unshift({
        id: Date.now(),
        userUid: 'keluarga_utama',
        type: 'expense',
        category: 'Prive / Penyaluran ke Keluarga',
        amount: String(amt),
        date: curDate,
        wallet: body.businessWallet || 'Kas Usaha',
        notes: body.notes || 'Penyaluran laba usaha ke rekening rumah tangga',
      });
      saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);

      // Household income
      localCache.transactions.unshift({
        id: Date.now() + 1,
        userUid: 'keluarga_utama',
        type: 'income',
        category: 'Usaha Sampingan',
        amount: String(amt),
        date: curDate,
        wallet: body.householdWallet || 'BCA',
        notes: body.notes || 'Terima bagi hasil/prive dari usaha sampingan',
      });
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);

      return { success: true, message: 'Transfer prive berhasil' } as T;
    }

    // 8. Monthly Reports
    if (pathname === '/api/reports/monthly') {
      const period = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);
      const curTx = localCache.transactions.filter(t => t.date.startsWith(period));

      let inc = 0;
      let exp = 0;
      let sav = 0;
      let debtP = 0;
      const catExp: Record<string, { total: number; count: number }> = {};
      const catInc: Record<string, { total: number; count: number }> = {};
      const daily: Record<string, { income: number; expense: number }> = {};

      curTx.forEach(t => {
        const val = parseFloat(t.amount || '0');
        if (!daily[t.date]) daily[t.date] = { income: 0, expense: 0 };

        if (t.type === 'income') {
          inc += val;
          daily[t.date].income += val;
          if (!catInc[t.category]) catInc[t.category] = { total: 0, count: 0 };
          catInc[t.category].total += val;
          catInc[t.category].count += 1;
        } else {
          exp += val;
          daily[t.date].expense += val;
          if (!catExp[t.category]) catExp[t.category] = { total: 0, count: 0 };
          catExp[t.category].total += val;
          catExp[t.category].count += 1;

          if (t.category.toLowerCase().includes('tabungan')) sav += val;
          if (t.category.toLowerCase().includes('hutang') || t.category.toLowerCase().includes('cicilan')) debtP += val;
        }
      });

      const net = inc - exp;
      const rate = inc > 0 ? Math.max(0, Math.round(((inc - exp) / inc) * 1000) / 10) : 0;
      let topCat = '-';
      let maxV = 0;
      Object.entries(catExp).forEach(([c, d]) => {
        if (d.total > maxV) {
          maxV = d.total;
          topCat = c;
        }
      });

      let status = 'Sehat';
      let evalNotes = '';
      if (net < 0) {
        status = 'Defisit';
        evalNotes = `Arus kas bulan ini defisit Rp ${Math.abs(net).toLocaleString('id-ID')}. Pengeluaran terbesar pada "${topCat}".`;
      } else if (rate >= 25) {
        status = 'Sangat Sehat';
        evalNotes = `Finansial sangat sehat! Rasio tabungan ${rate}%, surplus Rp ${net.toLocaleString('id-ID')}.`;
      } else if (rate >= 10) {
        status = 'Sehat';
        evalNotes = `Arus kas positif dengan surplus Rp ${net.toLocaleString('id-ID')}. Keuangan keluarga terkendali.`;
      } else {
        status = 'Waspada';
        evalNotes = `Surplus tipis Rp ${net.toLocaleString('id-ID')} (${rate}%). Disarankan menjaga belanja sekunder.`;
      }

      const repRecord: MonthlyReportRecord = {
        id: Date.now(),
        userUid: 'keluarga_utama',
        period,
        totalIncome: String(inc),
        totalExpense: String(exp),
        netCashflow: String(net),
        savingsDeposited: String(sav),
        debtPaid: String(debtP),
        savingsRate: String(rate),
        topExpenseCategory: topCat,
        statusSummary: status,
        evaluationNotes: evalNotes,
      };

      return {
        report: repRecord,
        period,
        metrics: {
          totalIncome: inc,
          totalExpense: exp,
          netCashflow: net,
          savingsDeposited: sav,
          debtPaid: debtP,
          savingsRate: rate,
          topCategory: topCat,
          statusSummary: status,
          evaluationNotes: evalNotes,
        },
        expenseBreakdown: Object.entries(catExp).map(([category, d]) => ({
          category,
          amount: d.total,
          count: d.count,
          percentage: exp > 0 ? Math.round((d.total / exp) * 1000) / 10 : 0,
        })).sort((a, b) => b.amount - a.amount),
        incomeBreakdown: Object.entries(catInc).map(([category, d]) => ({
          category,
          amount: d.total,
          count: d.count,
          percentage: inc > 0 ? Math.round((d.total / inc) * 1000) / 10 : 0,
        })).sort((a, b) => b.amount - a.amount),
        dailyFlow: Object.entries(daily).map(([date, d]) => ({
          date,
          income: d.income,
          expense: d.expense,
          net: d.income - d.expense,
        })).sort((a, b) => a.date.localeCompare(b.date)),
        transactionCount: curTx.length,
      } as T;
    }

    if (pathname === '/api/reports/history') {
      return localCache.reportsHistory as T;
    }

    return {} as T;
  }

  // --- API CALL METHODS ---

  getProfile() {
    return this.request<UserProfile>('/api/user/profile');
  }

  updateBudget(monthlyBudget: number) {
    return this.request<{ success: boolean; monthlyBudget: string }>('/api/user/budget', {
      method: 'PUT',
      body: JSON.stringify({ monthlyBudget }),
    });
  }

  getDashboardSummary() {
    return this.request<DashboardSummary>('/api/dashboard/summary');
  }

  getTransactions(params?: { period?: string; type?: string; category?: string }) {
    const q = new URLSearchParams();
    if (params?.period) q.set('period', params.period);
    if (params?.type) q.set('type', params.type);
    if (params?.category) q.set('category', params.category);
    return this.request<Transaction[]>(`/api/transactions?${q.toString()}`);
  }

  createTransaction(data: Omit<Transaction, 'id' | 'userUid' | 'createdAt'>) {
    return this.request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateTransaction(id: number, data: Partial<Transaction>) {
    return this.request<Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteTransaction(id: number) {
    return this.request<{ success: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  getDebts() {
    return this.request<Debt[]>('/api/debts');
  }

  createDebt(data: Omit<Debt, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>) {
    return this.request<Debt>('/api/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateDebt(id: number, data: Partial<Debt>) {
    return this.request<Debt>(`/api/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  payDebt(id: number, payload: { paymentAmount: number; date?: string; wallet?: string; recordTransaction?: boolean; notes?: string }) {
    return this.request<Debt>(`/api/debts/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  deleteDebt(id: number) {
    return this.request<{ success: boolean }>(`/api/debts/${id}`, {
      method: 'DELETE',
    });
  }

  getSavings() {
    return this.request<Saving[]>('/api/savings');
  }

  createSaving(data: Omit<Saving, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>) {
    return this.request<Saving>('/api/savings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSaving(id: number, data: Partial<Saving>) {
    return this.request<Saving>(`/api/savings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  adjustSaving(id: number, payload: { actionType: 'deposit' | 'withdraw'; amount: number; date?: string; wallet?: string; recordTransaction?: boolean; notes?: string }) {
    return this.request<Saving>(`/api/savings/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  deleteSaving(id: number) {
    return this.request<{ success: boolean }>(`/api/savings/${id}`, {
      method: 'DELETE',
    });
  }

  // Debt Subsidiary Ledger (Buku Pembantu Hutang & Piutang)
  getDebtLedger(id: number) {
    return this.request<DebtWithLedger>(`/api/debts/${id}/ledger`);
  }

  addDebtLedgerEntry(id: number, payload: {
    date?: string;
    type: 'borrow_addition' | 'installment_payment' | 'settlement';
    amount: number;
    wallet?: string;
    notes?: string;
    recordTransaction?: boolean;
  }) {
    return this.request<DebtLedgerEntry>(`/api/debts/${id}/ledger`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Usaha Sampingan (Business Ledger & P&L)
  getBusinessTransactions(params?: { period?: string; type?: string; category?: string }) {
    const q = new URLSearchParams();
    if (params?.period) q.set('period', params.period);
    if (params?.type) q.set('type', params.type);
    if (params?.category) q.set('category', params.category);
    return this.request<BusinessTransaction[]>(`/api/business/transactions?${q.toString()}`);
  }

  createBusinessTransaction(data: Omit<BusinessTransaction, 'id' | 'userUid' | 'createdAt'>) {
    return this.request<BusinessTransaction>('/api/business/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateBusinessTransaction(id: number, data: Partial<BusinessTransaction>) {
    return this.request<BusinessTransaction>(`/api/business/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteBusinessTransaction(id: number) {
    return this.request<{ success: boolean }>(`/api/business/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  getBusinessSummary(period?: string) {
    const q = period ? `?period=${period}` : '';
    return this.request<BusinessSummary>(`/api/business/summary${q}`);
  }

  transferBusinessPrive(payload: {
    amount: number;
    date?: string;
    businessWallet?: string;
    householdWallet?: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; message: string }>('/api/business/transfer-prive', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getMonthlyReport(period?: string) {
    const q = period ? `?period=${period}` : '';
    return this.request<MonthlyReportResponse>(`/api/reports/monthly${q}`);
  }

  getReportsHistory() {
    return this.request<MonthlyReportRecord[]>('/api/reports/history');
  }

  async seedData(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) return await res.json();
    } catch {}

    // Reset local cache to initial data
    localCache.transactions = getInitialTransactions();
    localCache.debts = getInitialDebts();
    localCache.debtLedger = getInitialDebtLedger();
    localCache.savings = getInitialSavings();
    localCache.business = getInitialBusiness();
    localCache.budget = '15000000';

    saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
    saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);
    saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);
    saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
    saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
    saveToStorage(STORAGE_KEYS.BUDGET, localCache.budget);

    return { success: true, message: 'Data contoh keluarga berhasil dimuat' };
  }

  async getDatabaseStatus(): Promise<{
    connected: boolean;
    type: string;
    database?: string;
    host?: string;
    projectRef?: string;
    tablesExist?: boolean;
    sqlEditorUrl?: string;
    tableEditorUrl?: string;
    error?: string;
    timestamp?: string;
  }> {
    // 1. Try server endpoint first
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. Direct client Supabase check
    if (supabase) {
      const { checkSupabaseTablesExist, cleanSupabaseUrl } = await import('./supabase.ts');
      const check = await checkSupabaseTablesExist();
      return {
        connected: check.tablesExist,
        type: 'Supabase Direct Client',
        database: 'Supabase Cloud',
        host: cleanSupabaseUrl,
        projectRef: check.projectRef,
        tablesExist: check.tablesExist,
        sqlEditorUrl: check.projectRef ? `https://supabase.com/dashboard/project/${check.projectRef}/sql/new` : '',
        tableEditorUrl: check.projectRef ? `https://supabase.com/dashboard/project/${check.projectRef}/editor` : '',
        error: check.error,
        timestamp: new Date().toISOString(),
      };
    }

    return { 
      connected: true, 
      type: 'Penyimpanan Offline & Cloud Ready', 
      database: 'Browser LocalStorage / Offline', 
      timestamp: new Date().toISOString() 
    };
  }
}
