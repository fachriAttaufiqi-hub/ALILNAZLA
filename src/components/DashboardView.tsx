import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  ChevronRight,
  Plus,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DashboardSummary, Transaction, Debt } from '../types/index.ts';
import { formatRupiah, formatDateIndo, formatMonthIndo } from '../utils/format.ts';
import { NavTab } from './Sidebar.tsx';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigateTab: (tab: NavTab) => void;
  onOpenQuickTx: (type: 'income' | 'expense') => void;
  onOpenBudgetModal: () => void;
  onOpenNewDebt: () => void;
  onOpenNewSaving: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  onNavigateTab,
  onOpenQuickTx,
  onOpenBudgetModal,
  onOpenNewDebt,
  onOpenNewSaving,
}) => {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-amber-100/60 border border-amber-200/60" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-amber-100/40 border border-amber-200/60" />
        <div className="h-64 rounded-2xl bg-amber-100/40 border border-amber-200/60" />
      </div>
    );
  }

  const income = summary?.totalIncome || 0;
  const expense = summary?.totalExpense || 0;
  const net = summary?.netCashflow || 0;
  const budget = summary?.monthlyBudget || 0;
  const budgetUsed = summary?.budgetUsedPercent || 0;
  const totalSavings = summary?.totalSavingsAccumulated || 0;
  const totalDebt = summary?.totalDebtRemaining || 0;
  const totalRec = summary?.totalReceivableRemaining || 0;

  const isSurplus = net >= 0;
  const budgetRemaining = Math.max(0, budget - expense);
  const isOverBudget = budget > 0 && expense > budget;

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome & Quick Action Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 border border-orange-700/40 p-6 md:p-8 shadow-lg shadow-orange-950/15 text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-bold mb-3 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Arus Kas Bulan {formatMonthIndo(summary?.period || '')}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              Ringkasan Keuangan Keluarga
            </h1>
            <p className="text-orange-100 text-sm mt-1 max-w-xl font-medium">
              Pantau arus kas, pos tabungan dana darurat, serta kelola buku pembantu hutang dan keuangan usaha secara terpadu.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => onOpenQuickTx('expense')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>+ Pengeluaran</span>
            </button>
            <button
              onClick={() => onOpenQuickTx('income')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>+ Pemasukan</span>
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-700/60 hover:bg-orange-700/80 text-white border border-orange-400/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <span>Lihat Laporan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Income */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 hover:border-emerald-500/50 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Pemasukan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950 tracking-tight">
            {formatRupiah(income)}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <span className="text-emerald-700 font-bold">Bulan berjalan</span>
            <span>• Semua rekening & kas</span>
          </div>
        </div>

        {/* Total Expense */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 hover:border-rose-500/50 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950 tracking-tight">
            {formatRupiah(expense)}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <span className="text-rose-700 font-bold">Realisasi belanja</span>
            <span>• Rutin & sekunder</span>
          </div>
        </div>

        {/* Net Cashflow (Surplus/Defisit) */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 hover:border-orange-500/50 hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Arus Kas Bersih</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isSurplus ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${isSurplus ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isSurplus ? `+${formatRupiah(net)}` : formatRupiah(net)}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <span className={isSurplus ? 'text-emerald-800 font-bold' : 'text-rose-800 font-bold'}>
              {isSurplus ? 'Surplus (Sisa Dana Bersih)' : 'Defisit (Perlu Penghematan)'}
            </span>
          </div>
        </div>

        {/* Tabungan & Aset */}
        <div 
          onClick={() => onNavigateTab('savings')}
          className="rounded-2xl bg-white border border-amber-200/80 p-5 hover:border-orange-500/50 hover:shadow-md transition-all shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tabungan Terkumpul</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 group-hover:scale-110 transition-transform">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950 tracking-tight">
            {formatRupiah(totalSavings)}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between font-medium">
            <span className="text-orange-700 font-bold">Pos target finansial</span>
            <ChevronRight className="w-4 h-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Row 2: Budgeting Progress & Debts/Receivables Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Budget Progress Bar */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
                <span>Anggaran Belanja Bulanan</span>
                {isOverBudget ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertCircle className="w-3 h-3 text-rose-600" /> Overbudget
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkendali
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Batas maksimal pengeluaran rumah tangga yang ditetapkan
              </p>
            </div>
            <button
              onClick={onOpenBudgetModal}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              {budget > 0 ? 'Ubah Batas' : 'Tetapkan Batas'}
            </button>
          </div>

          {budget > 0 ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between text-xs">
                <div>
                  <span className="text-slate-600">Realisasi Pengeluaran: </span>
                  <span className="font-extrabold text-blue-950">{formatRupiah(expense)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-600">Batas Anggaran: </span>
                  <span className="font-extrabold text-blue-950">{formatRupiah(budget)}</span>
                  <span className="ml-1 text-slate-500 font-semibold">({budgetUsed}%)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3.5 rounded-full bg-amber-100 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    budgetUsed > 90
                      ? 'bg-rose-600'
                      : budgetUsed > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, budgetUsed)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 font-medium">
                <span>
                  {isOverBudget 
                    ? `Melebihi anggaran sebesar ${formatRupiah(expense - budget)}`
                    : `Sisa anggaran yang aman dibelanjakan: `}
                  {!isOverBudget && <strong className="text-emerald-700 font-extrabold">{formatRupiah(budgetRemaining)}</strong>}
                </span>
                <span className="text-[11px] text-slate-500 font-bold">
                  {Math.max(0, Math.round(100 - budgetUsed))}% tersisa
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-dashed border-amber-300 text-center">
              <p className="text-xs text-slate-700 mb-2 font-medium">
                Anda belum menetapkan batas anggaran bulanan keluarga.
              </p>
              <button
                onClick={onOpenBudgetModal}
                className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-orange-900/10"
              >
                Tetapkan Anggaran Sekarang
              </button>
            </div>
          )}
        </div>

        {/* Debts & Receivables Widget */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span>Kewajiban & Tagihan</span>
              </h2>
              <button
                onClick={() => onNavigateTab('debts')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
              >
                Kelola
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-600 font-semibold">Hutang Kita (Sisa Kewajiban)</div>
                  <div className="text-lg font-black text-rose-700">{formatRupiah(totalDebt)}</div>
                </div>
                <button
                  onClick={onOpenNewDebt}
                  className="p-2 rounded-lg bg-rose-200/60 hover:bg-rose-200 text-rose-800 text-xs transition-colors cursor-pointer"
                  title="Tambah Catatan Hutang"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-600 font-semibold">Piutang (Hak Belum Tertagih)</div>
                  <div className="text-lg font-black text-emerald-800">{formatRupiah(totalRec)}</div>
                </div>
                <button
                  onClick={onOpenNewDebt}
                  className="p-2 rounded-lg bg-emerald-200/60 hover:bg-emerald-200 text-emerald-900 text-xs transition-colors cursor-pointer"
                  title="Tambah Catatan Piutang"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-100 text-[11px] text-slate-500 flex items-center gap-1.5 mt-4 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tersinkronisasi otomatis dengan Buku Pembantu Hutang.</span>
          </div>
        </div>

      </div>

      {/* Row 3: Recent Transactions */}
      <div className="rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-blue-950">Transaksi Terakhir</h2>
            <p className="text-xs text-slate-600 font-medium">Catatan mutasi pemasukan dan pengeluaran terbaru</p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
          >
            <span>Semua Transaksi</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary?.recentTransactions && summary.recentTransactions.length > 0 ? (
          <div className="divide-y divide-amber-100">
            {summary.recentTransactions.map((tx) => {
              const isInc = tx.type === 'income';
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4 hover:bg-amber-50/50 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isInc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isInc ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs md:text-sm font-extrabold text-blue-950">
                        {tx.category}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 font-medium">
                        <span>{formatDateIndo(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.wallet}</span>
                        {tx.notes && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline max-w-[200px] truncate text-slate-600">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`text-xs md:text-sm font-black text-right shrink-0 ${
                    isInc ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {isInc ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-xs font-medium">Belum ada transaksi yang tercatat bulan ini.</p>
            <button
              onClick={() => onOpenQuickTx('expense')}
              className="mt-3 px-3.5 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500 transition-colors cursor-pointer shadow-sm shadow-orange-900/10"
            >
              Catat Transaksi Pertama
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
