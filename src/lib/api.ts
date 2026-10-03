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
  PENDING_SYNC: 'keluargafin_pending_sync_queue',
};

// Pending sync item definition for resilient two-way device sync
export interface PendingSyncItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

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

// Pending queue helpers
export const getPendingQueue = (): PendingSyncItem[] => {
  return loadFromStorage<PendingSyncItem[]>(STORAGE_KEYS.PENDING_SYNC, []);
};

export const addToPendingQueue = (table: string, action: 'insert' | 'update' | 'delete', data: any) => {
  const queue = getPendingQueue();
  queue.push({
    id: `${table}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    table,
    action,
    data,
    timestamp: Date.now(),
  });
  saveToStorage(STORAGE_KEYS.PENDING_SYNC, queue);
};

export const removeFromPendingQueue = (id: string) => {
  const queue = getPendingQueue().filter(item => item.id !== id);
  saveToStorage(STORAGE_KEYS.PENDING_SYNC, queue);
};

// Automatic retry flusher for pending offline/failed sync queue
export const syncPendingQueue = async (): Promise<{ synced: number; remaining: number }> => {
  if (!supabase) return { synced: 0, remaining: getPendingQueue().length };
  const queue = getPendingQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  let syncedCount = 0;
  for (const item of [...queue]) {
    try {
      if (item.action === 'insert') {
        const { error } = await supabase.from(item.table).insert([item.data]);
        if (!error) {
          removeFromPendingQueue(item.id);
          syncedCount++;
        }
      } else if (item.action === 'update') {
        const { id, ...rest } = item.data;
        if (id) {
          const { error } = await supabase.from(item.table).update(rest).eq('id', id);
          if (!error) {
            removeFromPendingQueue(item.id);
            syncedCount++;
          }
        }
      } else if (item.action === 'delete') {
        if (item.data?.id) {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (!error) {
            removeFromPendingQueue(item.id);
            syncedCount++;
          }
        }
      }
    } catch (e) {
      console.warn(`Sync pending queue item failed for ${item.table}:`, e);
    }
  }

  return { synced: syncedCount, remaining: getPendingQueue().length };
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

// Snapshot helper for 0ms initial UI render
export const getCachedHouseholdSnapshot = () => ({
  budget: localCache.budget,
  transactions: localCache.transactions,
  debts: localCache.debts,
  savings: localCache.savings,
  business: localCache.business,
});

// Fast in-memory summary computation without redundant network calls
export const computeDashboardSummary = (period: string): DashboardSummary => {
  const curTx = localCache.transactions.filter(t => t.date.startsWith(period));
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
    period,
    totalIncome: inc,
    totalExpense: exp,
    netCashflow: inc - exp,
    monthlyBudget: bgt,
    budgetUsedPercent: bgt > 0 ? Math.min(100, Math.round((exp / bgt) * 100)) : 0,
    totalSavingsAccumulated: totSav,
    totalSavingsTarget: totSavTar,
    totalDebtRemaining: totDebt,
    totalReceivableRemaining: totRec,
    recentTransactions: [...localCache.transactions].slice(0, 5),
  };
};

let isBackendAvailable = true;

export class ApiClient {
  private getToken: () => Promise<string | null>;
  private isDemo: boolean;

  constructor(getToken: () => Promise<string | null>, isDemo: boolean = false) {
    this.getToken = getToken;
    this.isDemo = isDemo;
  }

  // Universal request with automatic fallback to Direct Supabase or LocalStorage
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isStaticHost = typeof window !== 'undefined' && 
      (window.location.hostname.includes('netlify.app') || 
       window.location.hostname.includes('github.io') || 
       !window.location.port.includes('3000'));

    // Try Express backend if running and not definitively static
    if (!isStaticHost && isBackendAvailable) {
      try {
        const token = await this.getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers as Record<string, string>),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

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
        // Backend not responsive, fallback directly
        isBackendAvailable = false;
      }
    }

    // Direct Supabase & LocalStorage client fallback
    return this.handleFallbackRequest<T>(endpoint, options);
  }

  // Fallback handler: Works directly with Supabase Cloud & LocalStorage for multi-device sync
  private async handleFallbackRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    const method = options.method || 'GET';
    const url = new URL(endpoint, 'http://localhost');
    const pathname = url.pathname;

    // 1. User Profile
    if (pathname === '/api/user/profile') {
      if (supabase) {
        try {
          const { data } = await supabase.from('users').select('monthly_budget').eq('uid', 'keluarga_utama').maybeSingle();
          if (data && data.monthly_budget) {
            localCache.budget = String(data.monthly_budget);
            saveToStorage(STORAGE_KEYS.BUDGET, localCache.budget);
          }
        } catch {}
      }
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

      if (supabase) {
        try {
          await supabase.from('users').upsert({
            uid: 'keluarga_utama',
            email: 'keluarga@keluargafin.id',
            display_name: 'Keluarga Utama',
            monthly_budget: String(body.monthlyBudget),
          }, { onConflict: 'uid' });
        } catch (e: any) {
          console.warn('Supabase upsert user budget:', e?.message);
        }
      }
      return { success: true, monthlyBudget: localCache.budget } as T;
    }

    // 3. Dashboard Summary (Fast in-memory computation from localCache)
    if (pathname === '/api/dashboard/summary') {
      const currentPeriod = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);
      return computeDashboardSummary(currentPeriod) as T;
    }

    // 4. Transactions CRUD
    if (pathname === '/api/transactions') {
      if (method === 'GET') {
        const period = url.searchParams.get('period');
        const type = url.searchParams.get('type');
        const cat = url.searchParams.get('category');

        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('transactions')
              .select('*')
              .order('date', { ascending: false });

            if (!error && data !== null) {
              const cloudTxs = data.map((row: any) => ({
                id: row.id,
                userUid: row.user_uid || 'keluarga_utama',
                type: row.type,
                category: row.category,
                amount: String(row.amount),
                date: row.date,
                wallet: row.wallet || 'Tunai',
                notes: row.notes || '',
                createdAt: row.created_at,
              }));

              // Preserve any locally created items that haven't reached cloud yet (temporary timestamp IDs)
              const seenMap = new Map<number, Transaction>();
              cloudTxs.forEach((t: Transaction) => seenMap.set(t.id, t));

              localCache.transactions.forEach((t: Transaction) => {
                if (t.id > 100000000000 && !seenMap.has(t.id)) {
                  seenMap.set(t.id, t);
                }
              });

              localCache.transactions = Array.from(seenMap.values());
              saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
            }
          } catch (e: any) {
            console.warn('Supabase get transactions error:', e?.message);
          }
        }

        let res = [...localCache.transactions];
        if (period) res = res.filter(t => t.date.startsWith(period));
        if (type && type !== 'Semua' && type !== 'all') res = res.filter(t => t.type === type);
        if (cat && cat !== 'Semua' && cat !== 'all') res = res.filter(t => t.category === cat);
        res.sort((a, b) => b.date.localeCompare(a.date));
        return res as T;
      }

      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        let newTx: Transaction = {
          id: Date.now(),
          userUid: 'keluarga_utama',
          type: body.type,
          category: body.category,
          amount: String(body.amount),
          date: body.date,
          wallet: body.wallet || 'Tunai',
          notes: body.notes || '',
        };

        const dbPayload = {
          user_uid: 'keluarga_utama',
          type: newTx.type,
          category: newTx.category,
          amount: newTx.amount,
          date: newTx.date,
          wallet: newTx.wallet,
          notes: newTx.notes,
        };

        let savedToCloud = false;
        if (supabase) {
          try {
            const { data, error } = await supabase.from('transactions').insert([dbPayload]).select();

            if (!error && data && data.length > 0) {
              newTx.id = data[0].id;
              newTx.createdAt = data[0].created_at;
              savedToCloud = true;
            } else if (error) {
              console.warn('Supabase direct insert transaction:', error.message);
            }
          } catch (e: any) {
            console.warn('Supabase direct insert transaction catch:', e?.message);
          }
        }

        if (!savedToCloud) {
          addToPendingQueue('transactions', 'insert', dbPayload);
        }

        localCache.transactions.unshift(newTx);
        saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        return newTx as T;
      }
    }

    if (pathname.startsWith('/api/transactions/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);

      const updatePayload = {
        type: body.type,
        category: body.category,
        amount: body.amount !== undefined ? String(body.amount) : undefined,
        date: body.date,
        wallet: body.wallet,
        notes: body.notes,
      };

      let updatedInCloud = false;
      if (supabase) {
        try {
          const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id);
          if (!error) updatedInCloud = true;
          else console.warn('Supabase update transaction error:', error.message);
        } catch (e: any) {
          console.warn('Supabase update transaction catch:', e?.message);
        }
      }

      if (!updatedInCloud && id < 100000000000) {
        addToPendingQueue('transactions', 'update', { id, ...updatePayload });
      }

      const idx = localCache.transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        localCache.transactions[idx] = { ...localCache.transactions[idx], ...body };
        saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        return localCache.transactions[idx] as T;
      }
    }

    if (pathname.startsWith('/api/transactions/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);

      let deletedInCloud = false;
      if (supabase) {
        try {
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (!error) deletedInCloud = true;
          else console.warn('Supabase delete transaction error:', error.message);
        } catch (e: any) {
          console.warn('Supabase delete transaction catch:', e?.message);
        }
      }

      if (!deletedInCloud && id < 100000000000) {
        addToPendingQueue('transactions', 'delete', { id });
      }

      localCache.transactions = localCache.transactions.filter(t => t.id !== id);
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
      return { success: true } as T;
    }

    // 5. Debts & Receivables CRUD
    if (pathname === '/api/debts') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data, error } = await supabase.from('debts').select('*').order('id', { ascending: false });
            if (!error && data !== null) {
              const cloudDebts = data.map((row: any) => ({
                id: row.id,
                userUid: row.user_uid || 'keluarga_utama',
                type: row.type,
                person: row.person,
                totalAmount: String(row.total_amount),
                paidAmount: String(row.paid_amount || '0'),
                dueDate: row.due_date || null,
                status: row.status || 'active',
                notes: row.notes || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at,
              }));

              const seenMap = new Map<number, Debt>();
              cloudDebts.forEach((d: Debt) => seenMap.set(d.id, d));
              localCache.debts.forEach((d: Debt) => {
                if (d.id > 100000000000 && !seenMap.has(d.id)) {
                  seenMap.set(d.id, d);
                }
              });

              localCache.debts = Array.from(seenMap.values());
              saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);
            }
          } catch (e: any) {
            console.warn('Supabase fetch debts error:', e?.message);
          }
        }
        return [...localCache.debts] as T;
      }

      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        let newDebt: Debt = {
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

        const dbDebtPayload = {
          user_uid: 'keluarga_utama',
          type: newDebt.type,
          person: newDebt.person,
          total_amount: newDebt.totalAmount,
          paid_amount: newDebt.paidAmount,
          due_date: newDebt.dueDate,
          status: newDebt.status,
          notes: newDebt.notes,
        };

        let savedToCloud = false;
        if (supabase) {
          try {
            const { data, error } = await supabase.from('debts').insert([dbDebtPayload]).select();

            if (!error && data && data.length > 0) {
              newDebt.id = data[0].id;
              newDebt.createdAt = data[0].created_at;
              newDebt.updatedAt = data[0].updated_at;
              savedToCloud = true;
            } else if (error) {
              console.warn('Supabase insert debt error:', error.message);
            }
          } catch (e: any) {
            console.warn('Supabase insert debt catch:', e?.message);
          }
        }

        if (!savedToCloud) {
          addToPendingQueue('debts', 'insert', dbDebtPayload);
        }

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

        const dbLedgerPayload = {
          debt_id: newDebt.id,
          user_uid: 'keluarga_utama',
          date: initEntry.date,
          type: initEntry.type,
          amount: initEntry.amount,
          balance_after: initEntry.balanceAfter,
          wallet: initEntry.wallet,
          notes: initEntry.notes,
        };

        let ledgerSavedToCloud = false;
        if (supabase) {
          try {
            const { data, error } = await supabase.from('debt_ledger_entries').insert([dbLedgerPayload]).select();
            if (!error && data && data.length > 0) {
              initEntry.id = data[0].id;
              initEntry.createdAt = data[0].created_at;
              ledgerSavedToCloud = true;
            }
          } catch (e: any) {
            console.warn('Supabase insert initial ledger error:', e?.message);
          }
        }

        if (!ledgerSavedToCloud) {
          addToPendingQueue('debt_ledger_entries', 'insert', dbLedgerPayload);
        }

        localCache.debtLedger.push(initEntry);
        saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);

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

        if (supabase) {
          try {
            const { data } = await supabase
              .from('debt_ledger_entries')
              .select('*')
              .eq('debt_id', debtId)
              .order('date', { ascending: true });

            if (data && data.length > 0) {
              const mappedEntries = data.map((row: any) => ({
                id: row.id,
                debtId: row.debt_id,
                userUid: row.user_uid || 'keluarga_utama',
                date: row.date,
                type: row.type,
                amount: String(row.amount),
                balanceAfter: String(row.balance_after),
                wallet: row.wallet || 'Tunai',
                notes: row.notes || '',
                createdAt: row.created_at,
              }));
              localCache.debtLedger = [
                ...localCache.debtLedger.filter(e => e.debtId !== debtId),
                ...mappedEntries,
              ];
              saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);
            }
          } catch (e: any) {
            console.warn('Supabase fetch ledger error:', e?.message);
          }
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

        if (supabase) {
          try {
            await supabase.from('debts').update({
              total_amount: debt.totalAmount,
              paid_amount: debt.paidAmount,
              status: debt.status,
            }).eq('id', debtId);
          } catch (e: any) {
            console.warn('Supabase update debt ledger amount error:', e?.message);
          }
        }

        let newEntry: DebtLedgerEntry = {
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

        if (supabase) {
          try {
            const { data } = await supabase.from('debt_ledger_entries').insert([{
              debt_id: debtId,
              user_uid: 'keluarga_utama',
              date: newEntry.date,
              type: newEntry.type,
              amount: newEntry.amount,
              balance_after: newEntry.balanceAfter,
              wallet: newEntry.wallet,
              notes: newEntry.notes,
            }]).select().single();

            if (data) {
              newEntry.id = data.id;
              newEntry.createdAt = data.created_at;
            }
          } catch (e: any) {
            console.warn('Supabase insert ledger entry error:', e?.message);
          }
        }

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

          if (supabase) {
            try {
              supabase.from('transactions').insert([{
                user_uid: 'keluarga_utama',
                type: tx.type,
                category: tx.category,
                amount: tx.amount,
                date: tx.date,
                wallet: tx.wallet,
                notes: tx.notes,
              }]);
            } catch {}
          }

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

        if (supabase) {
          try {
            await supabase.from('debts').update({
              paid_amount: d.paidAmount,
              status: d.status,
            }).eq('id', debtId);
          } catch (e: any) {
            console.warn('Supabase pay debt update error:', e?.message);
          }
        }

        // Record Buku Pembantu entry
        const remaining = Math.max(0, parseFloat(d.totalAmount) - newPaid);
        const lEntry: DebtLedgerEntry = {
          id: Date.now(),
          debtId: d.id,
          userUid: 'keluarga_utama',
          date: body.date || new Date().toISOString().split('T')[0],
          type: 'installment_payment',
          amount: String(body.paymentAmount),
          balanceAfter: String(remaining),
          wallet: body.wallet || 'Tunai',
          notes: body.notes || `Pembayaran cicilan / pelunasan ${d.person}`,
        };

        if (supabase) {
          try {
            await supabase.from('debt_ledger_entries').insert([{
              debt_id: d.id,
              user_uid: 'keluarga_utama',
              date: lEntry.date,
              type: lEntry.type,
              amount: lEntry.amount,
              balance_after: lEntry.balanceAfter,
              wallet: lEntry.wallet,
              notes: lEntry.notes,
            }]);
          } catch (e: any) {
            console.warn('Supabase insert pay debt ledger error:', e?.message);
          }
        }

        localCache.debtLedger.push(lEntry);
        saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);

        if (body.recordTransaction) {
          const tRecord: Transaction = {
            id: Date.now() + 1,
            userUid: 'keluarga_utama',
            type: d.type === 'debt' ? 'expense' : 'income',
            category: d.type === 'debt' ? 'Pembayaran Hutang' : 'Penerimaan Piutang',
            amount: String(body.paymentAmount),
            date: body.date || new Date().toISOString().slice(0, 10),
            wallet: body.wallet || 'Tunai',
            notes: body.notes || `Cicilan/Pelunasan ${d.person}`,
          };

          if (supabase) {
            try {
              supabase.from('transactions').insert([{
                user_uid: 'keluarga_utama',
                type: tRecord.type,
                category: tRecord.category,
                amount: tRecord.amount,
                date: tRecord.date,
                wallet: tRecord.wallet,
                notes: tRecord.notes,
              }]);
            } catch {}
          }

          localCache.transactions.unshift(tRecord);
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        }
        return d as T;
      }
    }

    if (pathname.startsWith('/api/debts/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);

      if (supabase) {
        try {
          await supabase.from('debts').update({
            person: body.person,
            total_amount: body.totalAmount !== undefined ? String(body.totalAmount) : undefined,
            paid_amount: body.paidAmount !== undefined ? String(body.paidAmount) : undefined,
            due_date: body.dueDate,
            status: body.status,
            notes: body.notes,
          }).eq('id', id);
        } catch (e: any) {
          console.warn('Supabase update debt error:', e?.message);
        }
      }

      const idx = localCache.debts.findIndex(d => d.id === id);
      if (idx !== -1) {
        localCache.debts[idx] = { ...localCache.debts[idx], ...body };
        saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);
        return localCache.debts[idx] as T;
      }
    }

    if (pathname.startsWith('/api/debts/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);

      if (supabase) {
        try {
          await Promise.all([
            supabase.from('debts').delete().eq('id', id),
            supabase.from('debt_ledger_entries').delete().eq('debt_id', id),
          ]);
        } catch (e: any) {
          console.warn('Supabase delete debt error:', e?.message);
        }
      }

      localCache.debts = localCache.debts.filter(d => d.id !== id);
      localCache.debtLedger = localCache.debtLedger.filter(e => e.debtId !== id);
      saveToStorage(STORAGE_KEYS.DEBTS, localCache.debts);
      saveToStorage(STORAGE_KEYS.DEBT_LEDGER, localCache.debtLedger);
      return { success: true } as T;
    }

    // 6. Savings CRUD
    if (pathname === '/api/savings') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data, error } = await supabase.from('savings').select('*').order('id', { ascending: false });
            if (!error && data !== null) {
              const cloudSavings = data.map((row: any) => ({
                id: row.id,
                userUid: row.user_uid || 'keluarga_utama',
                name: row.name,
                targetAmount: String(row.target_amount),
                currentAmount: String(row.current_amount || '0'),
                targetDate: row.target_date || null,
                category: row.category || 'Umum',
                color: row.color || '#10b981',
                notes: row.notes || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at,
              }));

              const seenMap = new Map<number, Saving>();
              cloudSavings.forEach((s: Saving) => seenMap.set(s.id, s));
              localCache.savings.forEach((s: Saving) => {
                if (s.id > 100000000000 && !seenMap.has(s.id)) {
                  seenMap.set(s.id, s);
                }
              });

              localCache.savings = Array.from(seenMap.values());
              saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
            }
          } catch (e: any) {
            console.warn('Supabase fetch savings error:', e?.message);
          }
        }
        return [...localCache.savings] as T;
      }

      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        let newS: Saving = {
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

        const dbSavingPayload = {
          user_uid: 'keluarga_utama',
          name: newS.name,
          target_amount: newS.targetAmount,
          current_amount: newS.currentAmount,
          target_date: newS.targetDate,
          category: newS.category,
          color: newS.color,
          notes: newS.notes,
        };

        let savedToCloud = false;
        if (supabase) {
          try {
            const { data, error } = await supabase.from('savings').insert([dbSavingPayload]).select();

            if (!error && data && data.length > 0) {
              newS.id = data[0].id;
              newS.createdAt = data[0].created_at;
              newS.updatedAt = data[0].updated_at;
              savedToCloud = true;
            } else if (error) {
              console.warn('Supabase insert saving error:', error.message);
            }
          } catch (e: any) {
            console.warn('Supabase insert saving catch:', e?.message);
          }
        }

        if (!savedToCloud) {
          addToPendingQueue('savings', 'insert', dbSavingPayload);
        }

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

        if (supabase) {
          try {
            await supabase.from('savings').update({
              current_amount: s.currentAmount,
            }).eq('id', savingId);
          } catch (e: any) {
            console.warn('Supabase adjust saving error:', e?.message);
          }
        }

        if (body.recordTransaction) {
          const tSav: Transaction = {
            id: Date.now(),
            userUid: 'keluarga_utama',
            type: body.actionType === 'withdraw' ? 'income' : 'expense',
            category: body.actionType === 'withdraw' ? 'Pencairan Tabungan' : 'Alokasi Tabungan',
            amount: String(amt),
            date: body.date || new Date().toISOString().slice(0, 10),
            wallet: body.wallet || 'Tunai',
            notes: body.notes || `Penyesuaian dana pos ${s.name}`,
          };

          if (supabase) {
            try {
              supabase.from('transactions').insert([{
                user_uid: 'keluarga_utama',
                type: tSav.type,
                category: tSav.category,
                amount: tSav.amount,
                date: tSav.date,
                wallet: tSav.wallet,
                notes: tSav.notes,
              }]);
            } catch {}
          }

          localCache.transactions.unshift(tSav);
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, localCache.transactions);
        }
        return s as T;
      }
    }

    if (pathname.startsWith('/api/savings/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);

      if (supabase) {
        try {
          await supabase.from('savings').update({
            name: body.name,
            target_amount: body.targetAmount !== undefined ? String(body.targetAmount) : undefined,
            current_amount: body.currentAmount !== undefined ? String(body.currentAmount) : undefined,
            target_date: body.targetDate,
            category: body.category,
            color: body.color,
            notes: body.notes,
          }).eq('id', id);
        } catch (e: any) {
          console.warn('Supabase update saving error:', e?.message);
        }
      }

      const idx = localCache.savings.findIndex(s => s.id === id);
      if (idx !== -1) {
        localCache.savings[idx] = { ...localCache.savings[idx], ...body };
        saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
        return localCache.savings[idx] as T;
      }
    }

    if (pathname.startsWith('/api/savings/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);

      if (supabase) {
        try {
          await supabase.from('savings').delete().eq('id', id);
        } catch (e: any) {
          console.warn('Supabase delete saving error:', e?.message);
        }
      }

      localCache.savings = localCache.savings.filter(s => s.id !== id);
      saveToStorage(STORAGE_KEYS.SAVINGS, localCache.savings);
      return { success: true } as T;
    }

    // 7. Business Transactions & Summary
    if (pathname === '/api/business/transactions') {
      if (method === 'GET') {
        const period = url.searchParams.get('period');

        if (supabase) {
          try {
            const { data, error } = await supabase.from('business_transactions').select('*').order('date', { ascending: false });
            if (!error && data !== null) {
              const cloudBiz = data.map((row: any) => ({
                id: row.id,
                userUid: row.user_uid || 'keluarga_utama',
                type: row.type,
                category: row.category,
                amount: String(row.amount),
                date: row.date,
                wallet: row.wallet || 'Kas Usaha',
                customerOrVendor: row.customer_or_vendor || '',
                invoiceNumber: row.invoice_number || '',
                notes: row.notes || '',
                createdAt: row.created_at,
              }));

              const seenMap = new Map<number, BusinessTransaction>();
              cloudBiz.forEach((b: BusinessTransaction) => seenMap.set(b.id, b));
              localCache.business.forEach((b: BusinessTransaction) => {
                if (b.id > 100000000000 && !seenMap.has(b.id)) {
                  seenMap.set(b.id, b);
                }
              });

              localCache.business = Array.from(seenMap.values());
              saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
            }
          } catch (e: any) {
            console.warn('Supabase fetch business error:', e?.message);
          }
        }

        let res = [...localCache.business];
        if (period) res = res.filter(t => t.date.startsWith(period));
        res.sort((a, b) => b.date.localeCompare(a.date));
        return res as T;
      }

      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        let newBiz: BusinessTransaction = {
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

        const dbBizPayload = {
          user_uid: 'keluarga_utama',
          type: newBiz.type,
          category: newBiz.category,
          amount: newBiz.amount,
          date: newBiz.date,
          wallet: newBiz.wallet,
          customer_or_vendor: newBiz.customerOrVendor,
          invoice_number: newBiz.invoiceNumber,
          notes: newBiz.notes,
        };

        let savedToCloud = false;
        if (supabase) {
          try {
            const { data, error } = await supabase.from('business_transactions').insert([dbBizPayload]).select();

            if (!error && data && data.length > 0) {
              newBiz.id = data[0].id;
              newBiz.createdAt = data[0].created_at;
              savedToCloud = true;
            } else if (error) {
              console.warn('Supabase insert business error:', error.message);
            }
          } catch (e: any) {
            console.warn('Supabase insert business catch:', e?.message);
          }
        }

        if (!savedToCloud) {
          addToPendingQueue('business_transactions', 'insert', dbBizPayload);
        }

        localCache.business.unshift(newBiz);
        saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
        return newBiz as T;
      }
    }

    if (pathname.startsWith('/api/business/transactions/') && method === 'PUT') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);
      const body = JSON.parse(options.body as string);

      if (supabase) {
        try {
          await supabase.from('business_transactions').update({
            type: body.type,
            category: body.category,
            amount: body.amount !== undefined ? String(body.amount) : undefined,
            date: body.date,
            wallet: body.wallet,
            customer_or_vendor: body.customerOrVendor,
            invoice_number: body.invoiceNumber,
            notes: body.notes,
          }).eq('id', id);
        } catch (e: any) {
          console.warn('Supabase update business error:', e?.message);
        }
      }

      const idx = localCache.business.findIndex(b => b.id === id);
      if (idx !== -1) {
        localCache.business[idx] = { ...localCache.business[idx], ...body };
        saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
        return localCache.business[idx] as T;
      }
    }

    if (pathname.startsWith('/api/business/transactions/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/').pop() || '0', 10);

      if (supabase) {
        try {
          await supabase.from('business_transactions').delete().eq('id', id);
        } catch (e: any) {
          console.warn('Supabase delete business error:', e?.message);
        }
      }

      localCache.business = localCache.business.filter(b => b.id !== id);
      saveToStorage(STORAGE_KEYS.BUSINESS, localCache.business);
      return { success: true } as T;
    }

    if (pathname === '/api/business/summary') {
      const period = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);
      const btx = localCache.business.filter(t => t.date.startsWith(period));

      let rev = 0;
      let exp = 0;
      let cogs = 0;
      let opex = 0;
      let prive = 0;
      const categoryMap: Record<string, { total: number; count: number; type: string }> = {};

      btx.forEach(t => {
        const val = parseFloat(t.amount || '0');
        if (t.type === 'income') {
          rev += val;
        } else {
          exp += val;
          const cat = t.category.toLowerCase();
          if (cat.includes('hpp') || cat.includes('bahan') || cat.includes('stok')) cogs += val;
          else if (cat.includes('prive') || cat.includes('keluarga')) prive += val;
          else opex += val;
        }

        if (!categoryMap[t.category]) {
          categoryMap[t.category] = { total: 0, count: 0, type: t.type };
        }
        categoryMap[t.category].total += val;
        categoryMap[t.category].count += 1;
      });

      const net = rev - exp;
      const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;

      const breakdowns = Object.entries(categoryMap).map(([category, d]) => ({
        category,
        type: d.type,
        amount: d.total,
        count: d.count,
        percentage: d.type === 'income' 
          ? (rev > 0 ? Math.round((d.total / rev) * 1000) / 10 : 0)
          : (exp > 0 ? Math.round((d.total / exp) * 1000) / 10 : 0),
      })).sort((a, b) => b.amount - a.amount);

      return {
        period,
        totalRevenue: rev,
        totalExpense: exp,
        netProfit: net,
        profitMargin: margin,
        transactionCount: btx.length,
        breakdowns,
        recentTransactions: btx.slice(0, 10),
        // backward compatibility fields
        revenue: rev,
        cogs,
        grossProfit: rev - cogs,
        operatingExpenses: opex,
        priveTaken: prive,
        retainedEarnings: net - prive,
        marginPercent: margin,
      } as T;
    }

    if (pathname === '/api/business/transfer-prive' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      const amt = parseFloat(body.amount);
      const curDate = body.date || new Date().toISOString().slice(0, 10);

      const bizPayload = {
        user_uid: 'keluarga_utama',
        type: 'expense',
        category: 'Prive / Penyaluran ke Keluarga',
        amount: String(amt),
        date: curDate,
        wallet: body.businessWallet || 'Kas Usaha',
        notes: body.notes || 'Penyaluran laba usaha ke rekening rumah tangga',
      };

      const hhPayload = {
        user_uid: 'keluarga_utama',
        type: 'income',
        category: 'Usaha Sampingan',
        amount: String(amt),
        date: curDate,
        wallet: body.householdWallet || 'BCA',
        notes: body.notes || 'Terima bagi hasil/prive dari usaha sampingan',
      };

      if (supabase) {
        try {
          supabase.from('business_transactions').insert([bizPayload]);
          supabase.from('transactions').insert([hhPayload]);
        } catch (e) {
          addToPendingQueue('business_transactions', 'insert', bizPayload);
          addToPendingQueue('transactions', 'insert', hhPayload);
        }
      } else {
        addToPendingQueue('business_transactions', 'insert', bizPayload);
        addToPendingQueue('transactions', 'insert', hhPayload);
      }

      // Business expense in localCache
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

      // Household income in localCache
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

  getDashboardSummary(period?: string) {
    const q = period ? `?period=${period}` : '';
    return this.request<DashboardSummary>(`/api/dashboard/summary${q}`);
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

  async syncAllLocalToCloud(): Promise<{ success: boolean; message: string; count: number }> {
    if (!supabase) {
      return { success: false, message: 'Koneksi Supabase Cloud belum aktif', count: 0 };
    }

    try {
      let count = 0;

      // 1. Transactions sync
      if (localCache.transactions.length > 0) {
        const { data: existingTx } = await supabase.from('transactions').select('id, date, amount');
        const existingSet = new Set((existingTx || []).map((t: any) => `${t.date}-${t.amount}`));

        const toPush = localCache.transactions
          .filter(t => !existingSet.has(`${t.date}-${t.amount}`))
          .map(t => ({
            user_uid: 'keluarga_utama',
            type: t.type,
            category: t.category,
            amount: t.amount,
            date: t.date,
            wallet: t.wallet || 'Tunai',
            notes: t.notes || '',
          }));

        if (toPush.length > 0) {
          const { error } = await supabase.from('transactions').insert(toPush);
          if (!error) count += toPush.length;
        }
      }

      // 2. Debts sync
      if (localCache.debts.length > 0) {
        const { data: existingDebts } = await supabase.from('debts').select('person, total_amount');
        const existingSet = new Set((existingDebts || []).map((d: any) => `${d.person}-${d.total_amount}`));

        const toPush = localCache.debts
          .filter(d => !existingSet.has(`${d.person}-${d.totalAmount}`))
          .map(d => ({
            user_uid: 'keluarga_utama',
            type: d.type,
            person: d.person,
            total_amount: d.totalAmount,
            paid_amount: d.paidAmount,
            due_date: d.dueDate,
            status: d.status,
            notes: d.notes,
          }));

        if (toPush.length > 0) {
          const { error } = await supabase.from('debts').insert(toPush);
          if (!error) count += toPush.length;
        }
      }

      // 3. Savings sync
      if (localCache.savings.length > 0) {
        const { data: existingSavings } = await supabase.from('savings').select('name, target_amount');
        const existingSet = new Set((existingSavings || []).map((s: any) => `${s.name}-${s.target_amount}`));

        const toPush = localCache.savings
          .filter(s => !existingSet.has(`${s.name}-${s.targetAmount}`))
          .map(s => ({
            user_uid: 'keluarga_utama',
            name: s.name,
            target_amount: s.targetAmount,
            current_amount: s.currentAmount,
            target_date: s.targetDate,
            category: s.category,
            color: s.color,
            notes: s.notes,
          }));

        if (toPush.length > 0) {
          const { error } = await supabase.from('savings').insert(toPush);
          if (!error) count += toPush.length;
        }
      }

      // 4. Budget sync
      await supabase.from('users').upsert({
        uid: 'keluarga_utama',
        email: 'keluarga@keluargafin.id',
        display_name: 'Keluarga Utama',
        monthly_budget: String(localCache.budget),
      }, { onConflict: 'uid' });

      // Refresh local cache from Supabase
      await this.getTransactions();
      await this.getDebts();
      await this.getSavings();

      return {
        success: true,
        message: 'Data berhasil disinkronkan ke Cloud Supabase!',
        count,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal sinkronisasi data',
        count: 0,
      };
    }
  }

  async syncPendingQueue(): Promise<{ synced: number; remaining: number }> {
    return await syncPendingQueue();
  }

  getPendingQueueCount(): number {
    return getPendingQueue().length;
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
