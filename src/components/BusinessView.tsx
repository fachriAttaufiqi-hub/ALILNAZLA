import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building, 
  Receipt, 
  FileText, 
  PieChart, 
  Trash2, 
  Edit3, 
  Search, 
  CheckCircle2, 
  Wallet,
  Sparkles,
  RefreshCw,
  SendHorizontal
} from 'lucide-react';
import { BusinessTransaction, BusinessSummary } from '../types/index.ts';
import { ApiClient } from '../lib/api.ts';
import { 
  formatRupiah, 
  formatDateIndo, 
  formatMonthIndo, 
  BUSINESS_INCOME_CATEGORIES, 
  BUSINESS_EXPENSE_CATEGORIES, 
  BUSINESS_WALLET_OPTIONS, 
  WALLET_OPTIONS 
} from '../utils/format.ts';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal.tsx';

interface BusinessViewProps {
  currentPeriod: string;
  onPeriodChange: (period: string) => void;
  api: ApiClient;
  onRefreshHouseholdData: () => Promise<void>;
}

export const BusinessView: React.FC<BusinessViewProps> = ({
  currentPeriod,
  onPeriodChange,
  api,
  onRefreshHouseholdData,
}) => {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('income');
  const [editingTx, setEditingTx] = useState<BusinessTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<BusinessTransaction | null>(null);

  // Form states for business transaction modal
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState(BUSINESS_INCOME_CATEGORIES[0]);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formWallet, setFormWallet] = useState(BUSINESS_WALLET_OPTIONS[0]);
  const [formCustomer, setFormCustomer] = useState('');
  const [formInvoice, setFormInvoice] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);

  // Modal: Transfer Prive (Laba Usaha ke Rumah Tangga)
  const [isPriveModalOpen, setIsPriveModalOpen] = useState(false);
  const [priveAmount, setPriveAmount] = useState('');
  const [priveBusinessWallet, setPriveBusinessWallet] = useState(BUSINESS_WALLET_OPTIONS[0]);
  const [priveHouseholdWallet, setPriveHouseholdWallet] = useState(WALLET_OPTIONS[1]); // BCA
  const [priveNotes, setPriveNotes] = useState('Penyaluran laba usaha bulan ini untuk belanja rumah tangga');
  const [submittingPrive, setSubmittingPrive] = useState(false);

  // Fetch Business Data
  const fetchBusinessData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        api.getBusinessSummary(currentPeriod),
        api.getBusinessTransactions({ period: currentPeriod }),
      ]);
      setSummary(sumRes);
      setTransactions(txRes);
    } catch (err) {
      console.error('Failed to load business data:', err);
    } finally {
      setLoading(false);
    }
  }, [api, currentPeriod]);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  // Open modal helper
  const handleOpenAddTx = (type: 'income' | 'expense') => {
    setTxModalType(type);
    setEditingTx(null);
    setFormAmount('');
    setFormCategory(type === 'income' ? BUSINESS_INCOME_CATEGORIES[0] : BUSINESS_EXPENSE_CATEGORIES[0]);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormWallet(BUSINESS_WALLET_OPTIONS[0]);
    setFormCustomer('');
    setFormInvoice('');
    setFormNotes('');
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: BusinessTransaction) => {
    setEditingTx(tx);
    setTxModalType(tx.type);
    setFormAmount(tx.amount);
    setFormCategory(tx.category);
    setFormDate(tx.date);
    setFormWallet(tx.wallet || BUSINESS_WALLET_OPTIONS[0]);
    setFormCustomer(tx.customerOrVendor || '');
    setFormInvoice(tx.invoiceNumber || '');
    setFormNotes(tx.notes || '');
    setIsTxModalOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(formAmount);
    if (isNaN(val) || val <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    setSubmittingTx(true);
    try {
      const payload = {
        type: txModalType,
        category: formCategory,
        amount: String(val),
        date: formDate,
        wallet: formWallet,
        customerOrVendor: formCustomer.trim() || undefined,
        invoiceNumber: formInvoice.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingTx) {
        await api.updateBusinessTransaction(editingTx.id, payload);
      } else {
        await api.createBusinessTransaction(payload);
      }

      setIsTxModalOpen(false);
      await fetchBusinessData();
    } catch (err: any) {
      alert('Gagal menyimpan transaksi usaha: ' + (err.message || 'Error'));
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleDeleteTx = (tx: BusinessTransaction) => {
    setDeletingTx(tx);
  };

  const confirmDeleteTx = async () => {
    if (!deletingTx) return;
    try {
      await api.deleteBusinessTransaction(deletingTx.id);
      await fetchBusinessData();
    } catch (err: any) {
      console.error('Gagal menghapus:', err);
    }
  };

  const handleTransferPrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(priveAmount);
    if (isNaN(val) || val <= 0) {
      alert('Nominal transfer harus lebih dari 0');
      return;
    }

    setSubmittingPrive(true);
    try {
      await api.transferBusinessPrive({
        amount: val,
        date: new Date().toISOString().slice(0, 10),
        businessWallet: priveBusinessWallet,
        householdWallet: priveHouseholdWallet,
        notes: priveNotes,
      });

      setIsPriveModalOpen(false);
      setPriveAmount('');
      await fetchBusinessData();
      await onRefreshHouseholdData();
      alert(`Berhasil mentransfer ${formatRupiah(val)} ke Kas Rumah Tangga!`);
    } catch (err: any) {
      alert('Gagal transfer prive: ' + (err.message || 'Error'));
    } finally {
      setSubmittingPrive(false);
    }
  };

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchCust = t.customerOrVendor?.toLowerCase().includes(q);
        const matchInv = t.invoiceNumber?.toLowerCase().includes(q);
        return matchNotes || matchCat || matchCust || matchInv;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  const totalRevenue = summary?.totalRevenue || 0;
  const totalExpense = summary?.totalExpense || 0;
  const netProfit = summary?.netProfit || 0;
  const profitMargin = summary?.profitMargin || 0;
  const isProfitable = netProfit >= 0;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 uppercase tracking-wider">
              Buku Keuangan Mandiri
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Periode: <strong className="text-blue-950 font-bold">{formatMonthIndo(currentPeriod)}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-black text-blue-950 tracking-tight mt-1 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-orange-600" />
            <span>Keuangan Sampingan & Hobi</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Kelola omset jualan, karya hobi, proyek freelance & belanja perlengkapan hobi secara mandiri terpisah dari kas keluarga
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => handleOpenAddTx('income')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Pemasukan Sampingan</span>
          </button>

          <button
            onClick={() => handleOpenAddTx('expense')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>+ Biaya Hobi / Beban</span>
          </button>

          <button
            onClick={() => setIsPriveModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-extrabold transition-all shadow-md shadow-orange-950/20 cursor-pointer"
            title="Kirim saldo sampingan/hobi ke rekening rumah tangga"
          >
            <SendHorizontal className="w-4 h-4" />
            <span>Tarik Saldo ke Kas Keluarga</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Omset / Pemasukan Sampingan */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pemasukan Sampingan/Hobi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {formatRupiah(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Freelance, karya hobi, jualan & jasa
          </p>
        </div>

        {/* Biaya & Perlengkapan Hobi */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pengeluaran & Alat Hobi</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatRupiah(totalExpense)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Bahan, perkakas hobi, stok & kurir
          </p>
        </div>

        {/* Laba Bersih / Surplus Sampingan */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Surplus Bersih Hobi</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isProfitable ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${isProfitable ? 'text-orange-700' : 'text-rose-700'}`}>
            {formatRupiah(netProfit)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {isProfitable ? `Surplus dana sampingan ${profitMargin}% margin` : 'Defisit dana hobi/sampingan'}
          </p>
        </div>

        {/* Margin & Efisiensi */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Margin Efisiensi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950">
            {profitMargin}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Dari {transactions.length} mutasi sampingan & hobi
          </p>
        </div>

      </div>

      {/* Visual Breakdown of Business Categories */}
      {summary && (summary.breakdowns || []).length > 0 && (
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-orange-600" />
            <span>Rincian Pos Pemasukan & Pengeluaran Sampingan/Hobi</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Breakdowns */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Sumber Pemasukan</span>
              {(summary.breakdowns || []).filter(b => b.type === 'income').length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada pemasukan sampingan di periode ini.</p>
              ) : (
                (summary.breakdowns || []).filter(b => b.type === 'income').map(item => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-semibold">{item.category}</span>
                      <span className="text-emerald-800 font-extrabold">{formatRupiah(item.amount)} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, item.percentage)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Expense Breakdowns */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Pos Pengeluaran & Biaya Hobi</span>
              {(summary.breakdowns || []).filter(b => b.type === 'expense').length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada beban belanja hobi di periode ini.</p>
              ) : (
                (summary.breakdowns || []).filter(b => b.type === 'expense').map(item => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-semibold">{item.category}</span>
                      <span className="text-rose-700 font-extrabold">{formatRupiah(item.amount)} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                      <div className="h-full bg-rose-600 rounded-full" style={{ width: `${Math.min(100, item.percentage)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-amber-200/80 shadow-sm">
        
        {/* Type Switcher */}
        <div className="flex items-center gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-amber-200 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-blue-950'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Biaya Hobi
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari invoice, pembeli, hobi, catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-amber-50/50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-blue-950 placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
        </div>

      </div>

      {/* Business Transactions Table */}
      <div className="rounded-2xl bg-white border border-amber-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-amber-200/80 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-extrabold text-blue-950">
              Buku Mutasi Sampingan & Hobi ({filteredTransactions.length} Mutasi)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tersimpan di Cloud PostgreSQL (Pembukuan Terpisah)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
            Memuat catatan transaksi sampingan & hobi...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-blue-950">Belum ada transaksi sampingan/hobi yang dicatat pada filter ini.</p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol "+ Pemasukan Sampingan" atau "+ Biaya Hobi / Beban" di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/70 text-slate-700 font-bold border-b border-amber-200/80">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Tipe & Kategori</th>
                  <th className="py-3 px-4">Pelanggan / Klien / Toko</th>
                  <th className="py-3 px-4">No. Invoice / Resi</th>
                  <th className="py-3 px-4">Rekening / Kas</th>
                  <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-slate-800">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const val = parseFloat(tx.amount);

                  return (
                    <tr key={tx.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-blue-950">
                        {formatDateIndo(tx.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isIncome ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {isIncome ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                            {isIncome ? 'Masuk' : 'Biaya Hobi'}
                          </span>
                          <span className="font-extrabold text-blue-950">{tx.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {tx.customerOrVendor || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {tx.invoiceNumber || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {tx.wallet || 'Kas Sampingan'}
                      </td>
                      <td className={`py-3 px-4 text-right whitespace-nowrap font-black ${
                        isIncome ? 'text-emerald-800' : 'text-rose-700'
                      }`}>
                        {isIncome ? '+' : '-'}{formatRupiah(val)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate font-medium">
                        {tx.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditTx(tx)}
                            className="p-1.5 text-slate-400 hover:text-blue-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="Ubah transaksi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah / Ubah Transaksi Sampingan & Hobi */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-amber-200/80 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-blue-950">
                  {editingTx ? 'Ubah Catatan Sampingan/Hobi' : (txModalType === 'income' ? 'Catat Pemasukan Sampingan & Hobi' : 'Catat Pengeluaran / Biaya Hobi')}
                </h3>
                <p className="text-xs text-slate-600 font-medium">Keuangan Sampingan, Freelance & Hobi</p>
              </div>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-blue-950 hover:bg-amber-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-3.5">
              {/* Type Switcher if creating new */}
              {!editingTx && (
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-amber-100/70 border border-amber-200">
                  <button
                    type="button"
                    onClick={() => {
                      setTxModalType('income');
                      setFormCategory(BUSINESS_INCOME_CATEGORIES[0]);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      txModalType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Pemasukan Sampingan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxModalType('expense');
                      setFormCategory(BUSINESS_EXPENSE_CATEGORIES[0]);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      txModalType === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Biaya & Belanja Hobi
                  </button>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Nominal Transaksi (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Contoh: 750000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-blue-950 text-sm font-bold focus:outline-none focus:border-orange-500"
                />
                {formAmount && (
                  <p className="text-[11px] text-emerald-800 font-extrabold mt-1">
                    {formatRupiah(formAmount)}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Kategori Sampingan & Hobi *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500"
                >
                  {(txModalType === 'income' ? BUSINESS_INCOME_CATEGORIES : BUSINESS_EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Date & Wallet */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Rekening / Kas Sampingan
                  </label>
                  <select
                    value={formWallet}
                    onChange={(e) => setFormWallet(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  >
                    {BUSINESS_WALLET_OPTIONS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer / Vendor & Invoice Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Pelanggan / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="Nama klien / supplier"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    No. Invoice / Resi / Nota
                  </label>
                  <input
                    type="text"
                    placeholder="INV-001 / Resi"
                    value={formInvoice}
                    onChange={(e) => setFormInvoice(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Catatan Transaksi
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan barang atau jasa..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-orange-950/20"
                >
                  {submittingTx ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Prive (Laba Usaha ke Kas Rumah Tangga) */}
      {isPriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-amber-200/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
                  <SendHorizontal className="w-4 h-4 text-orange-600" />
                  <span>Transfer Prive ke Kas Rumah Tangga</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">Penyaluran keuntungan bisnis untuk kebutuhan keluarga</p>
              </div>
              <button
                onClick={() => setIsPriveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-blue-950 hover:bg-amber-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferPrive} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-slate-700 leading-relaxed font-medium">
                Fitur ini akan mencatat <strong className="text-blue-950">Beban Prive</strong> di pembukuan usaha dan secara otomatis mencatat <strong className="text-blue-950">Pemasukan Usaha Sampingan</strong> di laporan kas keluarga Anda.
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Nominal Laba yang Disalurkan (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Contoh: 2000000"
                  value={priveAmount}
                  onChange={(e) => setPriveAmount(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-blue-950 text-sm font-bold focus:outline-none focus:border-orange-500"
                />
                {priveAmount && (
                  <p className="text-[11px] text-emerald-800 font-extrabold mt-1">
                    {formatRupiah(priveAmount)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Dari Kas Usaha
                  </label>
                  <select
                    value={priveBusinessWallet}
                    onChange={(e) => setPriveBusinessWallet(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  >
                    {BUSINESS_WALLET_OPTIONS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Masuk ke Rekening Keluarga
                  </label>
                  <select
                    value={priveHouseholdWallet}
                    onChange={(e) => setPriveHouseholdWallet(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  >
                    {WALLET_OPTIONS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Catatan Penyaluran
                </label>
                <input
                  type="text"
                  value={priveNotes}
                  onChange={(e) => setPriveNotes(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPriveModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPrive}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-orange-950/20"
                >
                  {submittingPrive ? 'Memproses...' : 'Kirim ke Kas Keluarga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        onConfirm={confirmDeleteTx}
        title="Hapus Transaksi Sampingan / Hobi"
        itemName={deletingTx?.category}
        itemDetail={deletingTx ? `${deletingTx.type === 'income' ? 'Pemasukan Sampingan' : 'Biaya Hobi'}: ${formatRupiah(deletingTx.amount)} (${deletingTx.wallet || 'Kas Sampingan'})` : undefined}
      />

    </div>
  );
};
