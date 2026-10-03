import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import { users, transactions, debts, savings, monthlyReports, debtLedgerEntries, businessTransactions } from './src/db/schema.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { supabase, isSupabaseApiKeyConfigured, checkSupabaseTablesExist, syncToSupabase, cleanSupabaseUrl } from './src/lib/supabase.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Public health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Shared Supabase Configuration for Multi-Device Household Sync
  let sharedSupabaseUrl = cleanSupabaseUrl;
  let sharedSupabaseKey = cleanSupabaseKey;

  app.get('/api/sync/config', (req, res) => {
    res.json({
      url: sharedSupabaseUrl,
      key: sharedSupabaseKey,
      configured: Boolean(sharedSupabaseUrl && sharedSupabaseKey),
    });
  });

  app.post('/api/sync/config', (req, res) => {
    const { url, key } = req.body || {};
    if (url && key) {
      sharedSupabaseUrl = String(url).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
      sharedSupabaseKey = String(key).trim();
      saveSupabaseConfig(sharedSupabaseUrl, sharedSupabaseKey);
      return res.json({ 
        success: true, 
        message: 'Kredensial database keluarga berhasil diselaraskan di server',
        url: sharedSupabaseUrl, 
        configured: true 
      });
    }
    res.status(400).json({ error: 'URL dan Key Supabase wajib diisi' });
  });

  // Database connection check (Supabase API Key / PostgreSQL / Cloud SQL)
  app.get('/api/database/status', async (req, res) => {
    // 1. Check Supabase API Key & URL first
    if (isSupabaseApiKeyConfigured && supabase) {
      const tableCheck = await checkSupabaseTablesExist();
      return res.json({
        connected: true,
        type: 'Supabase REST API (API Key)',
        database: 'Supabase Project',
        host: cleanSupabaseUrl,
        projectRef: tableCheck.projectRef,
        tablesExist: tableCheck.tablesExist,
        sqlEditorUrl: tableCheck.projectRef ? `https://supabase.com/dashboard/project/${tableCheck.projectRef}/sql/new` : '',
        tableEditorUrl: tableCheck.projectRef ? `https://supabase.com/dashboard/project/${tableCheck.projectRef}/editor` : '',
        error: tableCheck.error,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Check Postgres Pool (DATABASE_URL / SQL_HOST)
    try {
      const connStr = process.env.DATABASE_URL || '';
      const host = process.env.SQL_HOST || '';
      const isSupabase = connStr.includes('supabase') || host.includes('supabase');

      const result = await db.execute(sql`SELECT NOW() as now, current_database() as db_name, version() as version`);
      const row = (result as any).rows?.[0] || {};
      res.json({
        connected: true,
        type: isSupabase ? 'Supabase PostgreSQL' : (host ? 'PostgreSQL / Cloud SQL' : 'PostgreSQL'),
        database: row.db_name || process.env.SQL_DB_NAME || 'postgres',
        host: host || (connStr ? 'Supabase Pooler / URI' : 'Default'),
        timestamp: row.now || new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(200).json({
        connected: false,
        type: isSupabaseApiKeyConfigured ? 'Supabase REST' : 'PostgreSQL / Supabase',
        error: err.message || 'Koneksi database belum aktif',
      });
    }
  });

  // Manual sync existing data to Supabase
  app.post('/api/supabase/sync-all', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      if (!supabase) {
        return res.status(400).json({ success: false, error: 'Kredensial Supabase (API Key / URL) belum dikonfigurasi.' });
      }

      const tableCheck = await checkSupabaseTablesExist();
      if (!tableCheck.tablesExist) {
        return res.status(400).json({
          success: false,
          error: 'Tabel "transactions" belum dibuat di Supabase. Buka menu SQL Editor di Supabase lalu jalankan skrip SQL terlebih dahulu.',
          sqlEditorUrl: `https://supabase.com/dashboard/project/${tableCheck.projectRef}/sql/new`
        });
      }

      // 1. Transactions
      const txs = await db.select().from(transactions).where(eq(transactions.userUid, uid));
      if (txs.length > 0) {
        const payload = txs.map(t => ({
          user_uid: t.userUid,
          type: t.type,
          category: t.category,
          amount: t.amount,
          date: t.date,
          wallet: t.wallet,
          notes: t.notes || '',
        }));
        await supabase.from('transactions').upsert(payload);
      }

      // 2. Debts
      const dbts = await db.select().from(debts).where(eq(debts.userUid, uid));
      if (dbts.length > 0) {
        const payload = dbts.map(d => ({
          user_uid: d.userUid,
          type: d.type,
          person: d.person,
          total_amount: d.totalAmount,
          paid_amount: d.paidAmount,
          due_date: d.dueDate,
          status: d.status,
          notes: d.notes || '',
        }));
        await supabase.from('debts').upsert(payload);
      }

      // 3. Savings
      const savs = await db.select().from(savings).where(eq(savings.userUid, uid));
      if (savs.length > 0) {
        const payload = savs.map(s => ({
          user_uid: s.userUid,
          name: s.name,
          target_amount: s.targetAmount,
          current_amount: s.currentAmount,
          target_date: s.targetDate,
          category: s.category,
          color: s.color,
          notes: s.notes || '',
        }));
        await supabase.from('savings').upsert(payload);
      }

      // 4. Business Transactions
      const btxs = await db.select().from(businessTransactions).where(eq(businessTransactions.userUid, uid));
      if (btxs.length > 0) {
        const payload = btxs.map(b => ({
          user_uid: b.userUid,
          type: b.type,
          category: b.category,
          amount: b.amount,
          date: b.date,
          wallet: b.wallet,
          customer_or_vendor: b.customerOrVendor || '',
          invoice_number: b.invoiceNumber || '',
          notes: b.notes || '',
        }));
        await supabase.from('business_transactions').upsert(payload);
      }

      res.json({
        success: true,
        message: `Berhasil menyinkronkan data ke Supabase (${txs.length} transaksi, ${dbts.length} hutang, ${savs.length} tabungan, ${btxs.length} transaksi usaha).`,
        tableEditorUrl: `https://supabase.com/dashboard/project/${tableCheck.projectRef}/editor`,
      });
    } catch (err: any) {
      console.error('Error syncing data to Supabase:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menyinkronkan data ke Supabase' });
    }
  });

  // SHARED FAMILY HOUSEHOLD SCOPE (Pembukuan Bersama Suami - Istri)
  const SHARED_FAMILY_UID = 'keluarga_utama';

  // --- USER PROFILE & BUDGET ---
  app.get('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const familyUser = await db.select().from(users).where(eq(users.uid, SHARED_FAMILY_UID)).limit(1);
      const userList = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

      const budget = familyUser[0]?.monthlyBudget || userList[0]?.monthlyBudget || '15000000';
      const user = {
        uid,
        email: req.user!.email || userList[0]?.email || 'keluarga@home.local',
        displayName: req.user!.name || userList[0]?.displayName || 'Keluarga Fin',
        monthlyBudget: budget,
      };
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Gagal memuat profil pengguna' });
    }
  });

  app.put('/api/user/budget', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { monthlyBudget } = req.body;
      const budgetValue = String(Math.max(0, parseFloat(monthlyBudget) || 0));

      await db.insert(users)
        .values({
          uid: SHARED_FAMILY_UID,
          email: 'keluarga@home.local',
          displayName: 'Keluarga Utama',
          monthlyBudget: budgetValue,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { monthlyBudget: budgetValue },
        });

      if (uid !== SHARED_FAMILY_UID) {
        await db.update(users)
          .set({ monthlyBudget: budgetValue })
          .where(eq(users.uid, uid));
      }

      syncToSupabase('users', {
        uid: SHARED_FAMILY_UID,
        email: req.user!.email || 'keluarga@home.local',
        display_name: 'Keluarga Utama',
        monthly_budget: budgetValue,
      });

      res.json({ success: true, monthlyBudget: budgetValue });
    } catch (error) {
      console.error('Error updating budget:', error);
      res.status(500).json({ error: 'Gagal memperbarui anggaran bulanan' });
    }
  });

  // --- DASHBOARD SUMMARY (Shared Family Household: Suami & Istri) ---
  app.get('/api/dashboard/summary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Get shared family budget
      const familyUser = await db.select().from(users).where(eq(users.uid, SHARED_FAMILY_UID)).limit(1);
      const budget = parseFloat(familyUser[0]?.monthlyBudget || '15000000');

      // Get all transactions for current month (all members)
      const startOfMonth = `${currentPeriod}-01`;
      const endOfMonth = `${currentPeriod}-31`;

      const monthTxList = await db.select().from(transactions)
        .where(
          and(
            gte(transactions.date, startOfMonth),
            lte(transactions.date, endOfMonth)
          )
        );

      let totalIncome = 0;
      let totalExpense = 0;
      monthTxList.forEach(tx => {
        const val = parseFloat(tx.amount);
        if (tx.type === 'income') totalIncome += val;
        else if (tx.type === 'expense') totalExpense += val;
      });

      // Savings totals (all family savings)
      const savingsList = await db.select().from(savings);
      const totalSavingsAccumulated = savingsList.reduce((acc, s) => acc + parseFloat(s.currentAmount), 0);
      const totalSavingsTarget = savingsList.reduce((acc, s) => acc + parseFloat(s.targetAmount), 0);

      // Debts totals (all family debts)
      const debtsList = await db.select().from(debts);
      let totalDebtRemaining = 0;
      let totalReceivableRemaining = 0;
      debtsList.forEach(d => {
        if (d.status === 'active') {
          const rem = Math.max(0, parseFloat(d.totalAmount) - parseFloat(d.paidAmount));
          if (d.type === 'debt') totalDebtRemaining += rem;
          else if (d.type === 'receivable') totalReceivableRemaining += rem;
        }
      });

      // Recent 5 transactions (shared family)
      const recentTransactions = await db.select().from(transactions)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(5);

      res.json({
        period: currentPeriod,
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense,
        monthlyBudget: budget,
        budgetUsedPercent: budget > 0 ? Math.min(100, Math.round((totalExpense / budget) * 100)) : 0,
        totalSavingsAccumulated,
        totalSavingsTarget,
        totalDebtRemaining,
        totalReceivableRemaining,
        recentTransactions,
      });
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({ error: 'Gagal memuat ringkasan dashboard' });
    }
  });

  // --- TRANSACTIONS CRUD (Shared Family Household: Suami & Istri) ---
  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { period, type, category, limit } = req.query;

      // Ambil seluruh transaksi keluarga
      const conditions: any[] = [];

      if (period && typeof period === 'string') {
        conditions.push(gte(transactions.date, `${period}-01`));
        conditions.push(lte(transactions.date, `${period}-31`));
      }

      if (type && (type === 'income' || type === 'expense')) {
        conditions.push(eq(transactions.type, type));
      }

      if (category && typeof category === 'string' && category !== 'Semua') {
        conditions.push(eq(transactions.category, category));
      }

      const queryLimit = limit ? parseInt(limit as string, 10) : 300;

      const list = await db.select().from(transactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(queryLimit);

      res.json(list);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Gagal memuat daftar transaksi' });
    }
  });

  app.post('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { type, category, amount, date, wallet, notes } = req.body;

      if (!type || !category || !amount || !date) {
        return res.status(400).json({ error: 'Field type, category, amount, dan date wajib diisi' });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Nominal transaksi harus lebih dari 0' });
      }

      const inserted = await db.insert(transactions)
        .values({
          userUid: SHARED_FAMILY_UID,
          type,
          category,
          amount: String(numAmount),
          date,
          wallet: wallet || 'Tunai',
          notes: notes || '',
        })
        .returning();

      syncToSupabase('transactions', {
        user_uid: SHARED_FAMILY_UID,
        type,
        category,
        amount: String(numAmount),
        date,
        wallet: wallet || 'Tunai',
        notes: notes || '',
      });

      res.status(201).json(inserted[0]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ error: 'Gagal menyimpan transaksi' });
    }
  });

  app.put('/api/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const txId = parseInt(req.params.id, 10);
      const { type, category, amount, date, wallet, notes } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Nominal transaksi tidak valid' });
      }

      const updated = await db.update(transactions)
        .set({
          type,
          category,
          amount: String(numAmount),
          date,
          wallet: wallet || 'Tunai',
          notes: notes !== undefined ? notes : undefined,
        })
        .where(eq(transactions.id, txId))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: 'Gagal memperbarui transaksi' });
    }
  });

  app.delete('/api/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const txId = parseInt(req.params.id, 10);

      const deleted = await db.delete(transactions)
        .where(eq(transactions.id, txId))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
      }

      res.json({ success: true, message: 'Transaksi berhasil dihapus' });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Gagal menghapus transaksi' });
    }
  // --- DEBTS & RECEIVABLES CRUD (Shared Family Household) ---
  app.get('/api/debts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await db.select().from(debts)
        .orderBy(desc(debts.createdAt));

      res.json(list);
    } catch (error) {
      console.error('Error fetching debts:', error);
      res.status(500).json({ error: 'Gagal memuat daftar hutang/piutang' });
    }
  });

  app.post('/api/debts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { type, person, totalAmount, paidAmount, dueDate, notes } = req.body;

      if (!type || !person || !totalAmount) {
        return res.status(400).json({ error: 'Tipe, pihak terkait, dan nominal wajib diisi' });
      }

      const totalNum = parseFloat(totalAmount);
      const paidNum = parseFloat(paidAmount || '0');
      const status = paidNum >= totalNum ? 'paid_off' : 'active';

      const inserted = await db.insert(debts)
        .values({
          userUid: SHARED_FAMILY_UID,
          type,
          person,
          totalAmount: String(totalNum),
          paidAmount: String(paidNum),
          dueDate: dueDate || null,
          status,
          notes: notes || '',
        })
        .returning();

      syncToSupabase('debts', {
        user_uid: SHARED_FAMILY_UID,
        type,
        person,
        total_amount: String(totalNum),
        paid_amount: String(paidNum),
        due_date: dueDate || null,
        status,
        notes: notes || '',
      });

      // Automatically initialize Buku Pembantu entry
      try {
        const remainingInit = Math.max(0, totalNum - paidNum);
        await db.insert(debtLedgerEntries).values({
          debtId: inserted[0].id,
          userUid: SHARED_FAMILY_UID,
          date: new Date().toISOString().split('T')[0],
          type: 'initial',
          amount: String(totalNum),
          balanceAfter: String(remainingInit),
          wallet: 'Kas/Rekening',
          notes: notes || `Pembukaan Buku Pembantu ${type === 'debt' ? 'Hutang' : 'Piutang'} untuk ${person}`,
        });

        if (paidNum > 0) {
          await db.insert(debtLedgerEntries).values({
            debtId: inserted[0].id,
            userUid: SHARED_FAMILY_UID,
            date: new Date().toISOString().split('T')[0],
            type: 'installment_payment',
            amount: String(paidNum),
            balanceAfter: String(remainingInit),
            wallet: 'Kas/Rekening',
            notes: 'Pembayaran cicilan awal / DP',
          });
        }
      } catch (ledgerErr) {
        console.error('Error inserting initial ledger entry:', ledgerErr);
      }

      res.status(201).json(inserted[0]);
    } catch (error) {
      console.error('Error creating debt:', error);
      res.status(500).json({ error: 'Gagal menyimpan data hutang/piutang' });
    }
  });

  // --- BUKU PEMBANTU HUTANG & PIUTANG (SUBSIDIARY LEDGER) ---
  app.get('/api/debts/:id/ledger', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtId = parseInt(req.params.id, 10);

      const debtCheck = await db.select().from(debts)
        .where(eq(debts.id, debtId))
        .limit(1);

      if (!debtCheck.length) {
        return res.status(404).json({ error: 'Data Buku Pembantu tidak ditemukan' });
      }

      const entries = await db.select().from(debtLedgerEntries)
        .where(eq(debtLedgerEntries.debtId, debtId))
        .orderBy(asc(debtLedgerEntries.date), asc(debtLedgerEntries.id));

      res.json({
        debt: debtCheck[0],
        entries,
      });
    } catch (error) {
      console.error('Error fetching debt ledger:', error);
      res.status(500).json({ error: 'Gagal memuat buku pembantu' });
    }
  });

  app.post('/api/debts/:id/ledger', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtId = parseInt(req.params.id, 10);
      const { date, type, amount, wallet, notes, recordTransaction } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Nominal mutasi harus lebih dari 0' });
      }

      const debtCheck = await db.select().from(debts)
        .where(eq(debts.id, debtId))
        .limit(1);

      if (!debtCheck.length) {
        return res.status(404).json({ error: 'Data hutang tidak ditemukan' });
      }

      const current = debtCheck[0];
      let newTotal = parseFloat(current.totalAmount);
      let newPaid = parseFloat(current.paidAmount);

      if (type === 'borrow_addition') {
        newTotal += numAmount;
      } else {
        newPaid += numAmount;
      }

      const remaining = Math.max(0, newTotal - newPaid);
      const newStatus = newPaid >= newTotal ? 'paid_off' : 'active';

      await db.update(debts)
        .set({
          totalAmount: String(newTotal),
          paidAmount: String(newPaid),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(debts.id, debtId));

      const entry = await db.insert(debtLedgerEntries).values({
        debtId,
        userUid: SHARED_FAMILY_UID,
        date: date || new Date().toISOString().split('T')[0],
        type: type || 'installment_payment',
        amount: String(numAmount),
        balanceAfter: String(remaining),
        wallet: wallet || 'Tunai',
        notes: notes || '',
      }).returning();

      if (recordTransaction) {
        const isDebt = current.type === 'debt';
        let txType = 'expense';
        let txCat = 'Pembayaran Hutang';

        if (type === 'borrow_addition') {
          txType = isDebt ? 'income' : 'expense';
          txCat = isDebt ? 'Penerimaan Pinjaman' : 'Pemberian Pinjaman';
        } else {
          txType = isDebt ? 'expense' : 'income';
          txCat = isDebt ? 'Pembayaran Hutang' : 'Penerimaan Piutang';
        }

        await db.insert(transactions).values({
          userUid: SHARED_FAMILY_UID,
          type: txType,
          category: txCat,
          amount: String(numAmount),
          date: date || new Date().toISOString().split('T')[0],
          wallet: wallet || 'Tunai',
          notes: notes || `Mutasi Buku Pembantu ${current.person}`,
        });
      }

      res.status(201).json(entry[0]);
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      res.status(500).json({ error: 'Gagal menambahkan mutasi ke buku pembantu' });
    }
  });

  app.put('/api/debts/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtId = parseInt(req.params.id, 10);
      const { type, person, totalAmount, paidAmount, dueDate, status, notes } = req.body;

      const totalNum = parseFloat(totalAmount);
      const paidNum = parseFloat(paidAmount || '0');
      const computedStatus = status || (paidNum >= totalNum ? 'paid_off' : 'active');

      const updated = await db.update(debts)
        .set({
          type,
          person,
          totalAmount: String(totalNum),
          paidAmount: String(paidNum),
          dueDate: dueDate || null,
          status: computedStatus,
          notes: notes || '',
          updatedAt: new Date(),
        })
        .where(eq(debts.id, debtId))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: 'Data hutang/piutang tidak ditemukan' });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating debt:', error);
      res.status(500).json({ error: 'Gagal memperbarui hutang/piutang' });
    }
  });

  // Record payment for debt or receivable (Shared Family)
  app.post('/api/debts/:id/pay', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtId = parseInt(req.params.id, 10);
      const { paymentAmount, date, wallet, recordTransaction, notes } = req.body;

      const payVal = parseFloat(paymentAmount);
      if (isNaN(payVal) || payVal <= 0) {
        return res.status(400).json({ error: 'Nominal pembayaran harus lebih dari 0' });
      }

      const existingList = await db.select().from(debts)
        .where(eq(debts.id, debtId))
        .limit(1);

      if (!existingList.length) {
        return res.status(404).json({ error: 'Data hutang/piutang tidak ditemukan' });
      }

      const current = existingList[0];
      const newPaid = parseFloat(current.paidAmount) + payVal;
      const newStatus = newPaid >= parseFloat(current.totalAmount) ? 'paid_off' : 'active';

      const updated = await db.update(debts)
        .set({
          paidAmount: String(newPaid),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(debts.id, debtId))
        .returning();

      // Record in Buku Pembantu (debtLedgerEntries)
      try {
        const remainingAfter = Math.max(0, parseFloat(current.totalAmount) - newPaid);
        await db.insert(debtLedgerEntries).values({
          debtId: current.id,
          userUid: SHARED_FAMILY_UID,
          date: date || new Date().toISOString().split('T')[0],
          type: 'installment_payment',
          amount: String(payVal),
          balanceAfter: String(remainingAfter),
          wallet: wallet || 'Tunai',
          notes: notes || `Pembayaran cicilan / pelunasan ke ${current.person}`,
        });
      } catch (errLedger) {
        console.error('Error logging to debt ledger:', errLedger);
      }

      // Optionally record financial transaction
      if (recordTransaction) {
        const txType = current.type === 'debt' ? 'expense' : 'income';
        const txCategory = current.type === 'debt' ? 'Pembayaran Hutang' : 'Penerimaan Piutang';
        await db.insert(transactions).values({
          userUid: SHARED_FAMILY_UID,
          type: txType,
          category: txCat,
          amount: String(payVal),
          date: date || new Date().toISOString().split('T')[0],
          wallet: wallet || 'Tunai',
          notes: notes || `Cicilan/Pelunasan ${current.type === 'debt' ? 'Hutang ke' : 'Piutang dari'} ${current.person}`,
        });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Error paying debt:', error);
      res.status(500).json({ error: 'Gagal memproses pembayaran' });
    }
  });

  // --- USAHA SAMPINGAN & HOBI (Shared Family Household) ---
  app.get('/api/business/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { period, type, category } = req.query;

      const conditions: any[] = [];

      if (period && typeof period === 'string') {
        conditions.push(gte(businessTransactions.date, `${period}-01`));
        conditions.push(lte(businessTransactions.date, `${period}-31`));
      }

      if (type && (type === 'income' || type === 'expense')) {
        conditions.push(eq(businessTransactions.type, type));
      }

      if (category && typeof category === 'string' && category !== 'Semua') {
        conditions.push(eq(businessTransactions.category, category));
      }

      const list = await db.select().from(businessTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(businessTransactions.date), desc(businessTransactions.id));

      res.json(list);
    } catch (error) {
      console.error('Error fetching business transactions:', error);
      res.status(500).json({ error: 'Gagal memuat transaksi usaha sampingan' });
    }
  });

  app.post('/api/business/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { type, category, amount, date, wallet, customerOrVendor, invoiceNumber, notes } = req.body;

      if (!type || !category || !amount || !date) {
        return res.status(400).json({ error: 'Field tipe, kategori, nominal, dan tanggal wajib diisi' });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Nominal transaksi usaha harus lebih dari 0' });
      }

      const inserted = await db.insert(businessTransactions).values({
        userUid: SHARED_FAMILY_UID,
        type,
        category,
        amount: String(numAmount),
        date,
        wallet: wallet || 'Kas Usaha',
        customerOrVendor: customerOrVendor || '',
        invoiceNumber: invoiceNumber || '',
        notes: notes || '',
      }).returning();

      syncToSupabase('business_transactions', {
        user_uid: SHARED_FAMILY_UID,
        type,
        category,
        amount: String(numAmount),
        date,
        wallet: wallet || 'Kas Usaha',
        customer_or_vendor: customerOrVendor || '',
        invoice_number: invoiceNumber || '',
        notes: notes || '',
      });

      res.status(201).json(inserted[0]);
    } catch (error) {
      console.error('Error creating business transaction:', error);
      res.status(500).json({ error: 'Gagal menyimpan transaksi usaha sampingan' });
    }
  });

  app.put('/api/business/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const txId = parseInt(req.params.id, 10);
      const { type, category, amount, date, wallet, customerOrVendor, invoiceNumber, notes } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Nominal tidak valid' });
      }

      const updated = await db.update(businessTransactions)
        .set({
          type,
          category,
          amount: String(numAmount),
          date,
          wallet: wallet || 'Kas Usaha',
          customerOrVendor: customerOrVendor || '',
          invoiceNumber: invoiceNumber || '',
          notes: notes || '',
        })
        .where(eq(businessTransactions.id, txId))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: 'Transaksi usaha tidak ditemukan' });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating business transaction:', error);
      res.status(500).json({ error: 'Gagal memperbarui transaksi usaha' });
    }
  });

  app.delete('/api/business/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const txId = parseInt(req.params.id, 10);

      const deleted = await db.delete(businessTransactions)
        .where(eq(businessTransactions.id, txId))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
      }

      res.json({ success: true, message: 'Transaksi usaha berhasil dihapus' });
    } catch (error) {
      console.error('Error deleting business transaction:', error);
      res.status(500).json({ error: 'Gagal menghapus transaksi usaha' });
    }
  });

  app.get('/api/business/summary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const period = typeof req.query.period === 'string' && req.query.period 
        ? req.query.period 
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      const txList = await db.select().from(businessTransactions)
        .where(
          and(
            gte(businessTransactions.date, `${period}-01`),
            lte(businessTransactions.date, `${period}-31`)
          )
        )
        .orderBy(desc(businessTransactions.date));

      let totalRevenue = 0;
      let totalExpense = 0;
      const categoryMap: Record<string, { total: number; count: number; type: string }> = {};

      txList.forEach(t => {
        const val = parseFloat(t.amount);
        if (t.type === 'income') {
          totalRevenue += val;
        } else {
          totalExpense += val;
        }

        if (!categoryMap[t.category]) {
          categoryMap[t.category] = { total: 0, count: 0, type: t.type };
        }
        categoryMap[t.category].total += val;
        categoryMap[t.category].count += 1;
      });

      const netProfit = totalRevenue - totalExpense;
      const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

      const breakdowns = Object.entries(categoryMap).map(([category, d]) => ({
        category,
        type: d.type,
        amount: d.total,
        count: d.count,
        percentage: d.type === 'income' 
          ? (totalRevenue > 0 ? Math.round((d.total / totalRevenue) * 1000) / 10 : 0)
          : (totalExpense > 0 ? Math.round((d.total / totalExpense) * 1000) / 10 : 0),
      })).sort((a, b) => b.amount - a.amount);

      res.json({
        period,
        totalRevenue,
        totalExpense,
        netProfit,
        profitMargin,
        transactionCount: txList.length,
        breakdowns,
        recentTransactions: txList.slice(0, 10),
      });
    } catch (error) {
      console.error('Error fetching business summary:', error);
      res.status(500).json({ error: 'Gagal memuat ringkasan usaha' });
    }
  });

  // Transfer profit from business to household wallet (Prive)
  app.post('/api/business/transfer-prive', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount, date, businessWallet, householdWallet, notes } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Nominal transfer prive harus lebih dari 0' });
      }

      const txDate = date || new Date().toISOString().split('T')[0];

      // 1. Record in business transactions as Prive (Expense in business)
      await db.insert(businessTransactions).values({
        userUid: SHARED_FAMILY_UID,
        type: 'expense',
        category: 'Prive / Setor ke Rumah Tangga',
        amount: String(numAmount),
        date: txDate,
        wallet: businessWallet || 'Kas Usaha',
        notes: notes || 'Penyaluran laba usaha ke keuangan keluarga',
      });

      // 2. Record in household transactions as Income
      await db.insert(transactions).values({
        userUid: SHARED_FAMILY_UID,
        type: 'income',
        category: 'Usaha Sampingan',
        amount: String(numAmount),
        date: txDate,
        wallet: householdWallet || 'BCA',
        notes: notes || 'Hasil transfer laba/prive usaha sampingan',
      });

      res.json({ success: true, message: 'Transfer laba ke rumah tangga berhasil dicatat di kedua pembukuan' });
    } catch (error) {
      console.error('Error processing prive transfer:', error);
      res.status(500).json({ error: 'Gagal memproses transfer prive' });
    }
  });

  app.delete('/api/debts/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtId = parseInt(req.params.id, 10);

      const deleted = await db.delete(debts)
        .where(eq(debts.id, debtId))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: 'Data tidak ditemukan' });
      }

      res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (error) {
      console.error('Error deleting debt:', error);
      res.status(500).json({ error: 'Gagal menghapus data hutang/piutang' });
    }
  });
      console.error('Error deleting debt:', error);
      res.status(500).json({ error: 'Gagal menghapus data hutang/piutang' });
    }
  });

  // --- SAVINGS & GOALS CRUD ---
  app.get('/api/savings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const list = await db.select().from(savings)
        .where(eq(savings.userUid, uid))
        .orderBy(desc(savings.createdAt));

      res.json(list);
    } catch (error) {
      console.error('Error fetching savings:', error);
      res.status(500).json({ error: 'Gagal memuat daftar pos tabungan' });
    }
  });

  app.post('/api/savings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { name, targetAmount, currentAmount, targetDate, category, color, notes } = req.body;

      if (!name || !targetAmount) {
        return res.status(400).json({ error: 'Nama pos dan target tabungan wajib diisi' });
      }

      const targetNum = parseFloat(targetAmount);
      const currNum = parseFloat(currentAmount || '0');

      const inserted = await db.insert(savings)
        .values({
          userUid: uid,
          name,
          targetAmount: String(targetNum),
          currentAmount: String(currNum),
          targetDate: targetDate || null,
          category: category || 'Umum',
          color: color || '#10b981',
          notes: notes || '',
        })
        .returning();

      syncToSupabase('savings', {
        user_uid: uid,
        name,
        target_amount: String(targetNum),
        current_amount: String(currNum),
        target_date: targetDate || null,
        category: category || 'Umum',
        color: color || '#10b981',
        notes: notes || '',
      });

      res.status(201).json(inserted[0]);
    } catch (error) {
      console.error('Error creating savings:', error);
      res.status(500).json({ error: 'Gagal membuat pos tabungan' });
    }
  });

  app.put('/api/savings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const savingId = parseInt(req.params.id, 10);
      const { name, targetAmount, currentAmount, targetDate, category, color, notes } = req.body;

      const updated = await db.update(savings)
        .set({
          name,
          targetAmount: String(parseFloat(targetAmount)),
          currentAmount: String(parseFloat(currentAmount || '0')),
          targetDate: targetDate || null,
          category: category || 'Umum',
          color: color || '#10b981',
          notes: notes || '',
          updatedAt: new Date(),
        })
        .where(and(eq(savings.id, savingId), eq(savings.userUid, uid)))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: 'Pos tabungan tidak ditemukan' });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating savings:', error);
      res.status(500).json({ error: 'Gagal memperbarui pos tabungan' });
    }
  });

  // Adjust savings amount (Deposit / Withdraw)
  app.post('/api/savings/:id/adjust', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const savingId = parseInt(req.params.id, 10);
      const { actionType, amount, date, wallet, recordTransaction, notes } = req.body;

      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ error: 'Nominal harus lebih dari 0' });
      }

      const existingList = await db.select().from(savings)
        .where(and(eq(savings.id, savingId), eq(savings.userUid, uid)))
        .limit(1);

      if (!existingList.length) {
        return res.status(404).json({ error: 'Pos tabungan tidak ditemukan' });
      }

      const cur = existingList[0];
      const curAmount = parseFloat(cur.currentAmount);
      let newAmount = actionType === 'withdraw' ? Math.max(0, curAmount - val) : curAmount + val;

      const updated = await db.update(savings)
        .set({
          currentAmount: String(newAmount),
          updatedAt: new Date(),
        })
        .where(eq(savings.id, savingId))
        .returning();

      // Optionally record transaction
      if (recordTransaction) {
        if (actionType === 'withdraw') {
          // Money pulled into wallet is an income or transfer
          await db.insert(transactions).values({
            userUid: uid,
            type: 'income',
            category: 'Pencairan Tabungan',
            amount: String(val),
            date: date || new Date().toISOString().split('T')[0],
            wallet: wallet || 'Tunai',
            notes: notes || `Pencairan dana dari ${cur.name}`,
          });
        } else {
          // Deposit into savings is categorized as an expense from wallet to savings
          await db.insert(transactions).values({
            userUid: uid,
            type: 'expense',
            category: 'Alokasi Tabungan',
            amount: String(val),
            date: date || new Date().toISOString().split('T')[0],
            wallet: wallet || 'Tunai',
            notes: notes || `Setoran ke ${cur.name}`,
          });
        }
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Error adjusting savings:', error);
      res.status(500).json({ error: 'Gagal menyesuaikan saldo tabungan' });
    }
  });

  app.delete('/api/savings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const savingId = parseInt(req.params.id, 10);

      const deleted = await db.delete(savings)
        .where(and(eq(savings.id, savingId), eq(savings.userUid, uid)))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: 'Pos tabungan tidak ditemukan' });
      }

      res.json({ success: true, message: 'Pos tabungan berhasil dihapus' });
    } catch (error) {
      console.error('Error deleting savings:', error);
      res.status(500).json({ error: 'Gagal menghapus pos tabungan' });
    }
  });

  // --- AUTOMATED MONTHLY REPORTS (TAMPIL & TERSIMPAN) ---
  app.get('/api/reports/monthly', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const now = new Date();
      const period = (typeof req.query.period === 'string' && req.query.period)
        ? req.query.period
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Query transactions in this month
      const startOfMonth = `${period}-01`;
      const endOfMonth = `${period}-31`;

      const txList = await db.select().from(transactions)
        .where(
          and(
            eq(transactions.userUid, uid),
            gte(transactions.date, startOfMonth),
            lte(transactions.date, endOfMonth)
          )
        )
        .orderBy(desc(transactions.date));

      let totalIncome = 0;
      let totalExpense = 0;
      let savingsDeposited = 0;
      let debtPaid = 0;

      const categoryExpenses: Record<string, { total: number; count: number }> = {};
      const categoryIncomes: Record<string, { total: number; count: number }> = {};
      const dailyMap: Record<string, { income: number; expense: number }> = {};

      txList.forEach(t => {
        const amt = parseFloat(t.amount);
        const dayStr = t.date;

        if (!dailyMap[dayStr]) {
          dailyMap[dayStr] = { income: 0, expense: 0 };
        }

        if (t.type === 'income') {
          totalIncome += amt;
          dailyMap[dayStr].income += amt;
          if (!categoryIncomes[t.category]) categoryIncomes[t.category] = { total: 0, count: 0 };
          categoryIncomes[t.category].total += amt;
          categoryIncomes[t.category].count += 1;
        } else {
          totalExpense += amt;
          dailyMap[dayStr].expense += amt;
          if (!categoryExpenses[t.category]) categoryExpenses[t.category] = { total: 0, count: 0 };
          categoryExpenses[t.category].total += amt;
          categoryExpenses[t.category].count += 1;

          if (t.category.toLowerCase().includes('tabungan')) {
            savingsDeposited += amt;
          }
          if (t.category.toLowerCase().includes('hutang') || t.category.toLowerCase().includes('cicilan')) {
            debtPaid += amt;
          }
        }
      });

      const netCashflow = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0
        ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10))
        : 0;

      // Find top expense category
      let topCategory = '-';
      let maxCatAmount = 0;
      Object.entries(categoryExpenses).forEach(([cat, data]) => {
        if (data.total > maxCatAmount) {
          maxCatAmount = data.total;
          topCategory = cat;
        }
      });

      // Determine financial health status and practical evaluation
      let statusSummary = 'Sehat';
      let evaluationNotes = '';

      if (totalIncome === 0 && totalExpense === 0) {
        statusSummary = 'Belum Ada Transaksi';
        evaluationNotes = 'Mulai catat transaksi pengeluaran dan pemasukan Anda bulan ini untuk menghasilkan analisis keuangan.';
      } else if (netCashflow < 0) {
        statusSummary = 'Defisit';
        evaluationNotes = `Arus kas bulan ini minus Rp ${Math.abs(netCashflow).toLocaleString('id-ID')}. Kategori pengeluaran terbesar adalah "${topCategory}" (${Math.round((maxCatAmount / (totalExpense || 1)) * 100)}% dari total pengeluaran). Disarankan untuk meninjau pengeluaran sekunder.`;
      } else if (savingsRate >= 30) {
        statusSummary = 'Sangat Sehat';
        evaluationNotes = `Luar biasa! Rasio tabungan Anda mencapai ${savingsRate}%. Arus kas surplus Rp ${netCashflow.toLocaleString('id-ID')}. Anda memiliki bantalan finansial yang sangat kuat.`;
      } else if (savingsRate >= 15) {
        statusSummary = 'Sehat';
        evaluationNotes = `Kondisi keuangan rumah tangga sehat dengan rasio tabungan ${savingsRate}%. Pengeluaran terkendali dengan surplus Rp ${netCashflow.toLocaleString('id-ID')}.`;
      } else {
        statusSummary = 'Waspada';
        evaluationNotes = `Surplus arus kas tipis (Rp ${netCashflow.toLocaleString('id-ID')}, rasio tabungan ${savingsRate}%). Pertimbangkan menambah pos pendapatan atau memangkas belanja konsumtif.`;
      }

      // Auto-save / upsert report into monthly_reports table so it's stored permanently!
      const existingReport = await db.select().from(monthlyReports)
        .where(and(eq(monthlyReports.userUid, uid), eq(monthlyReports.period, period)))
        .limit(1);

      let savedRecord;
      if (existingReport.length > 0) {
        const resUp = await db.update(monthlyReports)
          .set({
            totalIncome: String(totalIncome),
            totalExpense: String(totalExpense),
            netCashflow: String(netCashflow),
            savingsDeposited: String(savingsDeposited),
            debtPaid: String(debtPaid),
            savingsRate: String(savingsRate),
            topExpenseCategory: topCategory,
            statusSummary,
            evaluationNotes,
            updatedAt: new Date(),
          })
          .where(eq(monthlyReports.id, existingReport[0].id))
          .returning();
        savedRecord = resUp[0];
      } else {
        const resIn = await db.insert(monthlyReports)
          .values({
            userUid: uid,
            period,
            totalIncome: String(totalIncome),
            totalExpense: String(totalExpense),
            netCashflow: String(netCashflow),
            savingsDeposited: String(savingsDeposited),
            debtPaid: String(debtPaid),
            savingsRate: String(savingsRate),
            topExpenseCategory: topCategory,
            statusSummary,
            evaluationNotes,
          })
          .returning();
        savedRecord = resIn[0];
      }

      // Prepare breakdown arrays
      const expenseBreakdown = Object.entries(categoryExpenses).map(([name, data]) => ({
        category: name,
        amount: data.total,
        count: data.count,
        percentage: totalExpense > 0 ? Math.round((data.total / totalExpense) * 1000) / 10 : 0,
      })).sort((a, b) => b.amount - a.amount);

      const incomeBreakdown = Object.entries(categoryIncomes).map(([name, data]) => ({
        category: name,
        amount: data.total,
        count: data.count,
        percentage: totalIncome > 0 ? Math.round((data.total / totalIncome) * 1000) / 10 : 0,
      })).sort((a, b) => b.amount - a.amount);

      const dailyFlow = Object.entries(dailyMap).map(([date, d]) => ({
        date,
        income: d.income,
        expense: d.expense,
        net: d.income - d.expense,
      })).sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        report: savedRecord,
        period,
        metrics: {
          totalIncome,
          totalExpense,
          netCashflow,
          savingsDeposited,
          debtPaid,
          savingsRate,
          topCategory,
          statusSummary,
          evaluationNotes,
        },
        expenseBreakdown,
        incomeBreakdown,
        dailyFlow,
        transactionCount: txList.length,
      });
    } catch (error) {
      console.error('Error generating monthly report:', error);
      res.status(500).json({ error: 'Gagal membuat laporan bulanan' });
    }
  });

  // History of stored monthly reports
  app.get('/api/reports/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const history = await db.select().from(monthlyReports)
        .where(eq(monthlyReports.userUid, uid))
        .orderBy(desc(monthlyReports.period));

      res.json(history);
    } catch (error) {
      console.error('Error fetching reports history:', error);
      res.status(500).json({ error: 'Gagal memuat riwayat laporan' });
    }
  });

  // Seed sample data for the user
  app.post('/api/seed', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;

      // Check if user already has transactions
      const existing = await db.select().from(transactions).where(eq(transactions.userUid, uid)).limit(1);
      if (existing.length > 0) {
        return res.json({ message: 'Data sudah ada, lewati penyiapan contoh.' });
      }

      // 1. Initial user budget
      await db.update(users).set({ monthlyBudget: '15000000' }).where(eq(users.uid, uid));

      // 2. Transactions
      const sampleTxs = [
        { type: 'income', category: 'Gaji Bulanan', amount: '18500000', date: `${prefix}-01`, wallet: 'BCA', notes: 'Gaji pokok bulanan' },
        { type: 'income', category: 'Usaha Sampingan', amount: '3500000', date: `${prefix}-05`, wallet: 'Mandiri', notes: 'Hasil freelance & toko online' },
        { type: 'expense', category: 'Belanja Bulanan', amount: '3200000', date: `${prefix}-02`, wallet: 'BCA', notes: 'Sembako, pasar, dan kebutuhan rumah' },
        { type: 'expense', category: 'Tagihan & Utilitas', amount: '850000', date: `${prefix}-03`, wallet: 'BCA', notes: 'Listrik PLN 2200VA + PDAM' },
        { type: 'expense', category: 'Tagihan & Utilitas', amount: '450000', date: `${prefix}-04`, wallet: 'BCA', notes: 'Internet Fiber Home Wi-Fi' },
        { type: 'expense', category: 'Pendidikan', amount: '1800000', date: `${prefix}-06`, wallet: 'Mandiri', notes: 'SPP & les anak' },
        { type: 'expense', category: 'Transportasi', amount: '750000', date: `${prefix}-08`, wallet: 'E-Wallet', notes: 'Bensin & e-Toll' },
        { type: 'expense', category: 'Makanan & Kuliner', amount: '1200000', date: `${prefix}-10`, wallet: 'E-Wallet', notes: 'Makan keluarga akhir pekan' },
        { type: 'expense', category: 'Kesehatan', amount: '400000', date: `${prefix}-12`, wallet: 'Tunai', notes: 'Vitamin & suplemen keluarga' },
        { type: 'expense', category: 'Alokasi Tabungan', amount: '3000000', date: `${prefix}-05`, wallet: 'BCA', notes: 'Alokasi Dana Darurat' },
        { type: 'expense', category: 'Pembayaran Hutang', amount: '1250000', date: `${prefix}-07`, wallet: 'BCA', notes: 'Cicilan motor bulan ini' },
      ];

      for (const tx of sampleTxs) {
        await db.insert(transactions).values({
          userUid: uid,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          date: tx.date,
          wallet: tx.wallet,
          notes: tx.notes,
        });
      }

      // 3. Debts & Receivables
      const debt1 = await db.insert(debts).values({
        userUid: uid,
        type: 'debt',
        person: 'BCA Finance (Cicilan Motor)',
        totalAmount: '25000000',
        paidAmount: '12500000',
        dueDate: `${prefix}-15`,
        status: 'active',
        notes: 'Sisa 10 bulan cicilan motor Honda Vario 160',
      }).returning();

      await db.insert(debtLedgerEntries).values([
        {
          debtId: debt1[0].id,
          userUid: uid,
          date: `${prefix}-01`,
          type: 'initial',
          amount: '25000000',
          balanceAfter: '25000000',
          wallet: 'BCA',
          notes: 'Saldo pokok awal pembiayaan kredit motor',
        },
        {
          debtId: debt1[0].id,
          userUid: uid,
          date: `${prefix}-07`,
          type: 'installment_payment',
          amount: '12500000',
          balanceAfter: '12500000',
          wallet: 'BCA',
          notes: 'Akumulasi angsuran berjalan yang sudah disetor',
        },
      ]);

      const debt2 = await db.insert(debts).values({
        userUid: uid,
        type: 'receivable',
        person: 'Rudi Pratama (Rekan Kerja)',
        totalAmount: '2000000',
        paidAmount: '500000',
        dueDate: `${prefix}-25`,
        status: 'active',
        notes: 'Pinjaman talangan service laptop',
      }).returning();

      await db.insert(debtLedgerEntries).values([
        {
          debtId: debt2[0].id,
          userUid: uid,
          date: `${prefix}-02`,
          type: 'initial',
          amount: '2000000',
          balanceAfter: '2000000',
          wallet: 'Tunai',
          notes: 'Pemberian pinjaman talangan perbaikan laptop',
        },
        {
          debtId: debt2[0].id,
          userUid: uid,
          date: `${prefix}-10`,
          type: 'installment_payment',
          amount: '500000',
          balanceAfter: '1500000',
          wallet: 'BCA',
          notes: 'Cicilan transfer tahap pertama via BCA',
        },
      ]);

      // 4. Sample Usaha Sampingan Transactions
      await db.insert(businessTransactions).values([
        {
          userUid: uid,
          type: 'income',
          category: 'Penjualan Produk Online',
          amount: '5800000',
          date: `${prefix}-03`,
          wallet: 'Kas Toko Online',
          customerOrVendor: 'Pelanggan Shopee & Tokopedia',
          invoiceNumber: 'INV-2026-001',
          notes: 'Pesanan paket produk busana & herbal 24 transaksi',
        },
        {
          userUid: uid,
          type: 'income',
          category: 'Jasa Desain & Konsultasi',
          amount: '3200000',
          date: `${prefix}-08`,
          wallet: 'Rekening Usaha',
          customerOrVendor: 'Klien CV Maju Makmur',
          invoiceNumber: 'INV-2026-002',
          notes: 'Jasa branding & desain kemasan produk',
        },
        {
          userUid: uid,
          type: 'expense',
          category: 'HPP & Bahan Baku',
          amount: '3100000',
          date: `${prefix}-04`,
          wallet: 'Kas Toko Online',
          customerOrVendor: 'Supplier Grosir Solo',
          notes: 'Restock bahan baku & stok kemasan karton',
        },
        {
          userUid: uid,
          type: 'expense',
          category: 'Biaya Pengiriman & Packing',
          amount: '450000',
          date: `${prefix}-06`,
          wallet: 'Kas Usaha',
          customerOrVendor: 'J&T & SiCepat Express',
          notes: 'Biaya bubble wrap, dus packing, & selisih ongkir',
        },
        {
          userUid: uid,
          type: 'expense',
          category: 'Pemasaran & Iklan',
          amount: '600000',
          date: `${prefix}-07`,
          wallet: 'Kartu Kredit Usaha',
          customerOrVendor: 'Meta Ads & TikTok Ads',
          notes: 'Iklan promosi produk awal bulan',
        },
        {
          userUid: uid,
          type: 'expense',
          category: 'Prive / Setor ke Rumah Tangga',
          amount: '3500000',
          date: `${prefix}-09`,
          wallet: 'Rekening Usaha',
          notes: 'Transfer sebagian laba bersih usaha ke belanja keluarga',
        },
      ]);

      // 5. Savings
      await db.insert(savings).values({
        userUid: uid,
        name: 'Dana Darurat (6 Bulan Pengeluaran)',
        targetAmount: '60000000',
        currentAmount: '24000000',
        targetDate: `${year + 1}-12-31`,
        category: 'Dana Darurat',
        color: '#10b981',
        notes: 'Disimpan di Reksadana Pasar Uang / Deposito',
      });

      await db.insert(savings).values({
        userUid: uid,
        name: 'Tabungan Qurban & Idul Fitri',
        targetAmount: '12000000',
        currentAmount: '7500000',
        targetDate: `${year + 1}-06-01`,
        category: 'Ibadah',
        color: '#3b82f6',
        notes: 'Target 1 ekor sapi patungan / kambing super',
      });

      await db.insert(savings).values({
        userUid: uid,
        name: 'Liburan Keluarga Akhir Tahun',
        targetAmount: '10000000',
        currentAmount: '4500000',
        targetDate: `${year}-12-20`,
        category: 'Liburan',
        color: '#f59e0b',
        notes: 'Trip keluarga ke Yogyakarta & Malang',
      });

      res.json({ success: true, message: 'Data contoh berhasil dimuat' });
    } catch (error) {
      console.error('Error seeding data:', error);
      res.status(500).json({ error: 'Gagal menyiapkan data contoh' });
    }
  });

  // Mount Vite or static server
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
