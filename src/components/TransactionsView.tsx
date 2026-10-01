import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  Wallet,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, TransactionType } from '../types/index.ts';
import { formatRupiah, formatDateIndo, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/format.ts';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal.tsx';

interface TransactionsViewProps {
  transactions: Transaction[];
  loading: boolean;
  onOpenNewTx: (type?: TransactionType) => void;
  onEditTx: (tx: Transaction) => void;
  onDeleteTx: (id: number) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  loading,
  onOpenNewTx,
  onEditTx,
  onDeleteTx,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const categories = useMemo(() => {
    if (selectedType === 'income') return INCOME_CATEGORIES;
    if (selectedType === 'expense') return EXPENSE_CATEGORIES;
    return Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));
  }, [selectedType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type match
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      // Category match
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inCat = tx.category.toLowerCase().includes(term);
        const inNotes = (tx.notes || '').toLowerCase().includes(term);
        const inWallet = (tx.wallet || '').toLowerCase().includes(term);
        if (!inCat && !inNotes && !inWallet) return false;
      }
      return true;
    });
  }, [transactions, selectedType, selectedCategory, searchTerm]);

  // Totals for filtered list
  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach(t => {
      const v = parseFloat(t.amount);
      if (t.type === 'income') inc += v;
      else exp += v;
    });
    return { income: inc, expense: exp, net: inc - exp };
  }, [filteredTransactions]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor');
      return;
    }

    const headers = ['Tanggal', 'Tipe', 'Kategori', 'Nominal (Rp)', 'Metode/Rekening', 'Catatan'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      `"${t.category}"`,
      t.amount,
      `"${t.wallet || 'Tunai'}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transaksi_keuangan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-950 tracking-tight">
            Catatan Transaksi Keuangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Riwayat seluruh penerimaan dan pengeluaran kas rumah tangga
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 text-xs font-bold border border-amber-200 transition-colors cursor-pointer shadow-sm"
            title="Unduh file CSV Excel"
          >
            <Download className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          <button
            onClick={() => onOpenNewTx('expense')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-900/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari transaksi, kategori, atau catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs sm:text-sm text-blue-950 placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Type Toggle */}
          <div className="sm:col-span-3 flex rounded-xl bg-amber-100/70 p-1 border border-amber-200">
            <button
              onClick={() => { setSelectedType('all'); setSelectedCategory('all'); }}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedType === 'all' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => { setSelectedType('income'); setSelectedCategory('all'); }}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setSelectedType('expense'); setSelectedCategory('all'); }}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedType === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Keluar
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs sm:text-sm text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Filtered Totals Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-100 text-xs font-medium">
          <div className="text-slate-600">
            Menampilkan <strong className="text-blue-950 font-extrabold">{filteredTransactions.length}</strong> transaksi
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">Total Masuk: </span>
              <span className="font-extrabold text-emerald-700">{formatRupiah(totals.income)}</span>
            </div>
            <div>
              <span className="text-slate-500">Total Keluar: </span>
              <span className="font-extrabold text-rose-700">{formatRupiah(totals.expense)}</span>
            </div>
            <div>
              <span className="text-slate-500">Selisih: </span>
              <span className={`font-extrabold ${totals.net >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                {formatRupiah(totals.net)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl bg-white border border-amber-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse text-xs">
            Memuat daftar transaksi...
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="divide-y divide-amber-100">
            {filteredTransactions.map((tx) => {
              const isInc = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border ${
                      isInc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isInc ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-blue-950">{tx.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isInc ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isInc ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                        <span className="text-slate-600">{formatDateIndo(tx.date)}</span>
                        <span>•</span>
                        <span className="text-slate-700 font-semibold">{tx.wallet}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 italic max-w-xs truncate">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className={`text-base font-black ${isInc ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {isInc ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTx(tx)}
                        className="p-1.5 text-slate-400 hover:text-blue-950 hover:bg-amber-100/70 rounded-lg transition-colors cursor-pointer"
                        title="Ubah transaksi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTx(tx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-blue-950">Tidak ada transaksi yang cocok.</p>
            <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau ubah filter kategori.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Delete */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        onConfirm={() => {
          if (deletingTx) {
            onDeleteTx(deletingTx.id);
          }
        }}
        title="Hapus Transaksi Keuangan"
        itemName={deletingTx?.category}
        itemDetail={deletingTx ? `${deletingTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}: ${formatRupiah(deletingTx.amount)} (${deletingTx.wallet || 'Tunai'})` : undefined}
      />

    </div>
  );
};
