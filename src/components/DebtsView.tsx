import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  BookOpen
} from 'lucide-react';
import { Debt, DebtType } from '../types/index.ts';
import { formatRupiah, formatDateIndo } from '../utils/format.ts';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal.tsx';

interface DebtsViewProps {
  debts: Debt[];
  loading: boolean;
  onOpenNewDebt: (type?: DebtType) => void;
  onOpenPayDebt: (debt: Debt) => void;
  onEditDebt: (debt: Debt) => void;
  onDeleteDebt: (id: number) => void;
  onSelectDebtLedger: (debt: Debt) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  loading,
  onOpenNewDebt,
  onOpenPayDebt,
  onEditDebt,
  onDeleteDebt,
  onSelectDebtLedger,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'debt' | 'receivable'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paid_off'>('active');
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);

  const filtered = useMemo(() => {
    return debts.filter((d) => {
      if (filterType !== 'all' && d.type !== filterType) return false;
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      return true;
    });
  }, [debts, filterType, filterStatus]);

  // Totals
  const stats = useMemo(() => {
    let activeDebtTotal = 0;
    let activeDebtRemaining = 0;
    let activeRecTotal = 0;
    let activeRecRemaining = 0;
    let paidOffCount = 0;

    debts.forEach((d) => {
      const tot = parseFloat(d.totalAmount);
      const paid = parseFloat(d.paidAmount);
      const rem = Math.max(0, tot - paid);

      if (d.status === 'paid_off') {
        paidOffCount++;
      }

      if (d.type === 'debt') {
        activeDebtTotal += tot;
        if (d.status === 'active') activeDebtRemaining += rem;
      } else {
        activeRecTotal += tot;
        if (d.status === 'active') activeRecRemaining += rem;
      }
    });

    return {
      activeDebtRemaining,
      activeRecRemaining,
      paidOffCount,
      totalCount: debts.length,
    };
  }, [debts]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-950 tracking-tight">
            Pencatatan Hutang & Piutang
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Kelola cicilan kewajiban keluarga serta pantau tagihan pinjaman pihak luar dengan buku pembantu otomatis
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onOpenNewDebt('debt')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>+ Catat Hutang</span>
          </button>
          <button
            onClick={() => onOpenNewDebt('receivable')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ Catat Piutang</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sisa Hutang Kita</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatRupiah(stats.activeDebtRemaining)}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kewajiban aktif yang harus dibayar
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sisa Piutang (Hak Kita)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {formatRupiah(stats.activeRecRemaining)}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Uang di luar yang menunggu pelunasan
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Telah Lunas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-orange-600 border border-amber-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950">
            {stats.paidOffCount} <span className="text-xs text-slate-500 font-semibold">dari {stats.totalCount} pos</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Riwayat kewajiban terselesaikan
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-amber-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-amber-200">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-blue-950'
            }`}
          >
            Semua ({debts.length})
          </button>
          <button
            onClick={() => setFilterType('debt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'debt' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Hutang Kita
          </button>
          <button
            onClick={() => setFilterType('receivable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'receivable' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Piutang Kita
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-amber-200">
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'active' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-orange-700'
            }`}
          >
            Aktif Belum Lunas
          </button>
          <button
            onClick={() => setFilterStatus('paid_off')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'paid_off' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Sudah Lunas
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-blue-950'
            }`}
          >
            Semua Status
          </button>
        </div>
      </div>

      {/* Debts Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-slate-500 animate-pulse text-xs">
            Memuat data hutang dan piutang...
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((item) => {
            const isDebt = item.type === 'debt';
            const total = parseFloat(item.totalAmount);
            const paid = parseFloat(item.paidAmount);
            const remaining = Math.max(0, total - paid);
            const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const isPaidOff = item.status === 'paid_off' || remaining === 0;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-amber-200/80 p-5 space-y-4 hover:border-orange-400/80 transition-all shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isDebt ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-blue-950 tracking-tight">{item.person}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDebt ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isDebt ? 'Hutang Kita' : 'Piutang'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                        {item.dueDate ? (
                          <span className="flex items-center gap-1 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                            Jatuh Tempo: {formatDateIndo(item.dueDate)}
                          </span>
                        ) : (
                          <span>Tidak ada tanggal tempo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPaidOff ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock className="w-3.5 h-3.5" /> Aktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Amount Numbers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600">
                      Terbayar: <strong className="text-blue-950 font-bold">{formatRupiah(paid)}</strong>
                    </span>
                    <span className="text-slate-600">
                      Total: <strong className="text-blue-950 font-bold">{formatRupiah(total)}</strong>
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPaidOff
                          ? 'bg-emerald-600'
                          : isDebt
                          ? 'bg-rose-600'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600">
                      Sisa: <strong className={isDebt ? 'text-rose-700 font-black' : 'text-emerald-800 font-black'}>{formatRupiah(remaining)}</strong>
                    </span>
                    <span className="text-slate-600 font-bold">{percent}% tercapai</span>
                  </div>
                </div>

                {/* Notes if any */}
                {item.notes && (
                  <p className="text-xs text-slate-700 italic bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                    {item.notes}
                  </p>
                )}

                {/* Action Footer */}
                <div className="pt-2 border-t border-amber-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditDebt(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      title="Ubah rincian"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingDebt(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus data"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDebtLedger(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
                      title="Lihat riwayat mutasi lengkap & buku pembantu"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                      <span>Buku Pembantu</span>
                    </button>

                    {!isPaidOff && (
                      <button
                        onClick={() => onOpenPayDebt(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-blue-950/20"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>{isDebt ? 'Bayar' : 'Terima'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 py-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-blue-950">Belum ada catatan hutang atau piutang pada filter ini.</p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol di atas untuk mencatat kewajiban baru.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingDebt)}
        onClose={() => setDeletingDebt(null)}
        onConfirm={() => {
          if (deletingDebt) {
            onDeleteDebt(deletingDebt.id);
          }
        }}
        title={`Hapus Catatan ${deletingDebt?.type === 'debt' ? 'Hutang' : 'Piutang'}`}
        itemName={deletingDebt?.person}
        itemDetail={deletingDebt ? `Total: ${formatRupiah(deletingDebt.totalAmount)} | Sisa: ${formatRupiah(Math.max(0, parseFloat(deletingDebt.totalAmount) - parseFloat(deletingDebt.paidAmount)))}` : undefined}
      />

    </div>
  );
};
