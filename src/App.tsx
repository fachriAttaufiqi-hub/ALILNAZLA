/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ApiClient } from './lib/api';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { DebtsView } from './components/DebtsView';
import { DebtLedgerView } from './components/DebtLedgerView';
import { BusinessView } from './components/BusinessView';
import { SavingsView } from './components/SavingsView';
import { ReportsView } from './components/ReportsView';

// Modals
import { UnifiedTransactionModal, UnifiedEntryType } from './components/modals/UnifiedTransactionModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { DebtModal } from './components/modals/DebtModal';
import { PayDebtModal } from './components/modals/PayDebtModal';
import { SavingModal } from './components/modals/SavingModal';
import { AdjustSavingModal } from './components/modals/AdjustSavingModal';
import { BudgetModal } from './components/modals/BudgetModal';
import { SupabaseModal } from './components/modals/SupabaseModal';
import { PinLockModal } from './components/PinLockModal';
import { PWAInstallAndSync } from './components/PWAInstallAndSync';
import { UNLOCKED_SESSION_KEY, REMEMBER_DEVICE_KEY } from './components/LockScreen';

import { 
  Transaction, 
  Debt, 
  Saving, 
  MonthlyReportResponse, 
  MonthlyReportRecord, 
  DashboardSummary, 
  TransactionType, 
  DebtType,
  BusinessTransaction
} from './types';

function MainApp() {
  const { user, loading: authLoading, getFreshToken } = useAuth();

  // Current selected month period: YYYY-MM
  const initialPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [currentPeriod, setCurrentPeriod] = useState(initialPeriod);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // App Lock Passcode state
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const isSessionUnlocked = sessionStorage.getItem(UNLOCKED_SESSION_KEY) === 'true';
    const isRemembered = localStorage.getItem(REMEMBER_DEVICE_KEY) === 'true';
    return isSessionUnlocked || isRemembered;
  });

  const handleLockApp = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
      localStorage.removeItem(REMEMBER_DEVICE_KEY);
    }
    setIsAppUnlocked(false);
  };

  // Selected Debt for Subsidiary Ledger sub-page view
  const [selectedDebtForLedger, setSelectedDebtForLedger] = useState<Debt | null>(null);

  // API Client instance
  const api = useMemo(() => {
    return new ApiClient(getFreshToken, false);
  }, [getFreshToken]);

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [reportData, setReportData] = useState<MonthlyReportResponse | null>(null);
  const [historyReports, setHistoryReports] = useState<MonthlyReportRecord[]>([]);

  const [loadingData, setLoadingData] = useState(false);

  // Unified Modal state
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [unifiedModalInitialType, setUnifiedModalInitialType] = useState<UnifiedEntryType>('expense_rt');

  // Specific edit modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtModalType, setDebtModalType] = useState<DebtType>('debt');
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const [isSavingModalOpen, setIsSavingModalOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);

  const [isAdjustSavingModalOpen, setIsAdjustSavingModalOpen] = useState(false);
  const [adjustingSaving, setAdjustingSaving] = useState<Saving | null>(null);
  const [savingActionType, setSavingActionType] = useState<'deposit' | 'withdraw'>('deposit');

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Fetch all core household data
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [sumRes, txRes, debtRes, savRes, repRes, histRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getTransactions({ period: currentPeriod }),
        api.getDebts(),
        api.getSavings(),
        api.getMonthlyReport(currentPeriod),
        api.getReportsHistory(),
      ]);

      setSummary(sumRes);
      setTransactions(txRes);
      setDebts(debtRes);
      setSavings(savRes);
      setReportData(repRes);
      setHistoryReports(histRes);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [api, currentPeriod]);

  // REALTIME SYNCRONIZATION SUPABASE
  useEffect(() => {
    fetchData();

    if (!supabase) return;

    // Berlangganan Realtime Postgres Changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchData]);

  // Unified Modal Open Handler
  const handleOpenUnifiedModal = (type: UnifiedEntryType = 'expense_rt') => {
    setUnifiedModalInitialType(type);
    setIsUnifiedModalOpen(true);
  };

  // Transaction Handlers
  const handleSaveTransaction = async (
    data: Omit<Transaction, 'id' | 'userUid' | 'createdAt'>,
    editId?: number
  ) => {
    if (editId) {
      await api.updateTransaction(editId, data);
    } else {
      await api.createTransaction(data);
    }
    await fetchData();
  };

  // Hapus Transaksi Langsung dari Supabase
  const handleDeleteTransaction = async (id: number) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn('Hapus via Supabase client gagal, mencoba via API:', error.message);
          await api.deleteTransaction(id);
        }
      } else {
        await api.deleteTransaction(id);
      }
    } catch (err) {
      await api.deleteTransaction(id);
    }
    await fetchData();
  };

  // Debt Handlers
  const handleSaveDebt = async (
    data: Omit<Debt, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>,
    editId?: number
  ) => {
    if (editId) {
      await api.updateDebt(editId, data);
    } else {
      const created = await api.createDebt(data);
      if (created && created.id) {
        setSelectedDebtForLedger(created);
        setCurrentTab('debts');
      }
    }
    await fetchData();
  };

  const handlePayDebt = async (
    debtId: number,
    payload: { paymentAmount: number; date?: string; wallet?: string; recordTransaction?: boolean; notes?: string }
  ) => {
    await api.payDebt(debtId, payload);
    await fetchData();
  };

  // Hapus Hutang Langsung dari Supabase
  const handleDeleteDebt = async (id: number) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('debts').delete().eq('id', id);
        if (error) {
          await api.deleteDebt(id);
        }
      } else {
        await api.deleteDebt(id);
      }
    } catch (err) {
      await api.deleteDebt(id);
    }

    if (selectedDebtForLedger?.id === id) {
      setSelectedDebtForLedger(null);
    }
    await fetchData();
  };

  // Debt Subsidiary Ledger mutation handler
  const handleAddDebtLedgerMutation = async (
    debtId: number,
    payload: {
      type: 'borrow_addition' | 'installment_payment' | 'settlement';
      amount: number;
      date?: string;
      wallet?: string;
      notes?: string;
      recordTransaction?: boolean;
    }
  ) => {
    await api.addDebtLedgerEntry(debtId, payload);
    await fetchData();
  };

  // Business Transaction Handler
  const handleSaveBusinessTx = async (
    data: Omit<BusinessTransaction, 'id' | 'userUid' | 'createdAt'>
  ) => {
    await api.createBusinessTransaction(data);
    await fetchData();
  };

  // Saving Handlers
  const handleSaveSaving = async (
    data: Omit<Saving, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>,
    editId?: number
  ) => {
    if (editId) {
      await api.updateSaving(editId, data);
    } else {
      await api.createSaving(data);
    }
    await fetchData();
  };

  const handleAdjustSaving = async (
    savingId: number,
    payload: { actionType: 'deposit' | 'withdraw'; amount: number; date?: string; wallet?: string; recordTransaction?: boolean; notes?: string }
  ) => {
    await api.adjustSaving(savingId, payload);
    await fetchData();
  };

  // Hapus Tabungan Langsung dari Supabase
  const handleDeleteSaving = async (id: number) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('savings').delete().eq('id', id);
        if (error) {
          await api.deleteSaving(id);
        }
      } else {
        await api.deleteSaving(id);
      }
    } catch (err) {
      await api.deleteSaving(id);
    }
    await fetchData();
  };

  // Budget Handler
  const handleSaveBudget = async (budget: number) => {
    await api.updateBudget(budget);
    await fetchData();
  };

  // Seed sample starter data
  const handleSeedData = async () => {
    try {
      await api.seedData();
      await fetchData();
    } catch (err: any) {
      console.warn('Gagal memuat data contoh:', err);
    }
  };

  if (!isAppUnlocked) {
    return <PinLockModal onSuccess={() => setIsAppUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#faf8f2] text-slate-900 flex flex-col">
      <Header
        currentPeriod={currentPeriod}
        onPeriodChange={setCurrentPeriod}
        onOpenQuickTx={() => handleOpenUnifiedModal('expense_rt')}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onLockApp={handleLockApp}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'debts') {
              setSelectedDebtForLedger(null);
            }
          }}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          onLockApp={handleLockApp}
          onSeedDemoData={transactions.length === 0 ? handleSeedData : undefined}
        />

        <main className="flex-1 p-4 lg:p-8 min-w-0">
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              loading={loadingData}
              onNavigateTab={setCurrentTab}
              onOpenQuickTx={(type) => {
                handleOpenUnifiedModal(type === 'income' ? 'income_rt' : 'expense_rt');
              }}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onOpenNewDebt={() => handleOpenUnifiedModal('debt_ledger')}
              onOpenNewSaving={() => handleOpenUnifiedModal('savings')}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              loading={loadingData}
              onOpenNewTx={(type) => {
                handleOpenUnifiedModal(type === 'income' ? 'income_rt' : 'expense_rt');
              }}
              onEditTx={(tx) => {
                setEditingTx(tx);
                setTxModalType(tx.type);
                setIsTxModalOpen(true);
              }}
              onDeleteTx={handleDeleteTransaction}
            />
          )}

          {currentTab === 'debts' && (
            selectedDebtForLedger ? (
              <DebtLedgerView
                debt={selectedDebtForLedger}
                api={api}
                onBack={() => setSelectedDebtForLedger(null)}
                onRefreshParentDebts={fetchData}
              />
            ) : (
              <DebtsView
                debts={debts}
                loading={loadingData}
                onOpenNewDebt={() => handleOpenUnifiedModal('debt_ledger')}
                onOpenPayDebt={(d) => {
                  setPayingDebt(d);
                  setIsPayDebtModalOpen(true);
                }}
                onEditDebt={(d) => {
                  setEditingDebt(d);
                  setDebtModalType(d.type);
                  setIsDebtModalOpen(true);
                }}
                onDeleteDebt={handleDeleteDebt}
                onSelectDebtLedger={(d) => setSelectedDebtForLedger(d)}
              />
            )
          )}

          {currentTab === 'business' && (
            <BusinessView
              currentPeriod={currentPeriod}
              onPeriodChange={setCurrentPeriod}
              api={api}
              onRefreshHouseholdData={fetchData}
            />
          )}

          {currentTab === 'savings' && (
            <SavingsView
              savings={savings}
              loading={loadingData}
              onOpenNewSaving={() => {
                setEditingSaving(null);
                setIsSavingModalOpen(true);
              }}
              onOpenAdjustSaving={(s, actionType) => {
                setAdjustingSaving(s);
                setSavingActionType(actionType);
                setIsAdjustSavingModalOpen(true);
              }}
              onEditSaving={(s) => {
                setEditingSaving(s);
                setIsSavingModalOpen(true);
              }}
              onDeleteSaving={handleDeleteSaving}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              currentPeriod={currentPeriod}
              onPeriodChange={setCurrentPeriod}
              reportData={reportData}
              historyReports={historyReports}
              loading={loadingData}
              onRefreshReport={fetchData}
            />
          )}
        </main>
      </div>

      <footer className="no-print border-t border-amber-200/80 bg-white/80 py-4 px-4 text-center text-xs text-slate-600">
        <p>KeluargaFin &bull; Sistem Pengelolaan Keuangan Rumah Tangga, Buku Pembantu Hutang & Usaha Sampingan &bull; Cloud SQL PostgreSQL Terpadu</p>
      </footer>

      <UnifiedTransactionModal
        isOpen={isUnifiedModalOpen}
        onClose={() => setIsUnifiedModalOpen(false)}
        initialType={unifiedModalInitialType}
        existingDebts={debts}
        existingSavings={savings}
        onSaveHouseholdTx={handleSaveTransaction}
        onSaveNewDebt={handleSaveDebt}
        onAddDebtLedgerMutation={handleAddDebtLedgerMutation}
        onSaveBusinessTx={handleSaveBusinessTx}
        onAdjustSaving={handleAdjustSaving}
        onCreatedNewDebtSubpage={() => {
          setCurrentTab('debts');
        }}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialType={txModalType}
        editingTransaction={editingTx}
      />

      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setEditingDebt(null);
        }}
        onSave={handleSaveDebt}
        initialType={debtModalType}
        editingDebt={editingDebt}
      />

      <PayDebtModal
        isOpen={isPayDebtModalOpen}
        debt={payingDebt}
        onClose={() => {
          setIsPayDebtModalOpen(false);
          setPayingDebt(null);
        }}
        onPay={handlePayDebt}
      />

      <SavingModal
        isOpen={isSavingModalOpen}
        onClose={() => {
          setIsSavingModalOpen(false);
          setEditingSaving(null);
        }}
        onSave={handleSaveSaving}
        editingSaving={editingSaving}
      />

      {adjustingSaving && (
        <AdjustSavingModal
          isOpen={isAdjustSavingModalOpen}
          saving={adjustingSaving}
          actionType={savingActionType}
          onClose={() => {
            setIsAdjustSavingModalOpen(false);
            setAdjustingSaving(null);
          }}
          onAdjust={async (payload) => {
            await handleAdjustSaving(adjustingSaving.id, payload);
          }}
        />
      )}

      <BudgetModal
        isOpen={isBudgetModalOpen}
        currentBudget={summary?.monthlyBudget || 0}
        onClose={() => setIsBudgetModalOpen(false)}
        onSaveBudget={handleSaveBudget}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        api={api}
      />

      <PWAInstallAndSync
        onTriggerSync={async () => {
          await api.syncAllLocalToCloud();
          await fetchData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
