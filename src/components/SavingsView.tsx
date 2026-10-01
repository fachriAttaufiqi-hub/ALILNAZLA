import React, { useMemo, useState } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Target, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Sparkles, 
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { Saving } from '../types/index.ts';
import { formatRupiah, formatDateIndo } from '../utils/format.ts';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal.tsx';

interface SavingsViewProps {
  savings: Saving[];
  loading: boolean;
  onOpenNewSaving: () => void;
  onOpenAdjustSaving: (saving: Saving, actionType: 'deposit' | 'withdraw') => void;
  onEditSaving: (saving: Saving) => void;
  onDeleteSaving: (id: number) => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  savings,
  loading,
  onOpenNewSaving,
  onOpenAdjustSaving,
  onEditSaving,
  onDeleteSaving,
}) => {
  const [deletingSaving, setDeletingSaving] = useState<Saving | null>(null);
  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalAccumulated = 0;
    let completedCount = 0;

    savings.forEach((s) => {
      const cur = parseFloat(s.currentAmount);
      const tar = parseFloat(s.targetAmount);
      totalAccumulated += cur;
      totalTarget += tar;
      if (cur >= tar && tar > 0) {
        completedCount++;
      }
    });

    const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalAccumulated / totalTarget) * 100)) : 0;

    return {
      totalTarget,
      totalAccumulated,
      overallPercent,
      completedCount,
      totalCount: savings.length,
    };
  }, [savings]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-950 tracking-tight">
            Pos Tabungan & Target Finansial
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Alokasi pos dana darurat, qurban, pendidikan, dan impian masa depan keluarga
          </p>
        </div>

        <button
          onClick={onOpenNewSaving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-950/20 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Pos Tabungan</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Tabungan Terkumpul</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950">
            {formatRupiah(stats.totalAccumulated)}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Total saldo di seluruh pos simpanan
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Target Alokasi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950">
            {formatRupiah(stats.totalTarget)}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Akumulasi target seluruh impian
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-amber-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pencapaian Rata-Rata</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {stats.overallPercent}%
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {stats.completedCount} dari {stats.totalCount} pos telah terpenuhi
          </p>
        </div>
      </div>

      {/* Savings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 p-8 text-center text-slate-500 animate-pulse text-xs">
            Memuat daftar pos tabungan...
          </div>
        ) : savings.length > 0 ? (
          savings.map((item) => {
            const current = parseFloat(item.currentAmount);
            const target = parseFloat(item.targetAmount);
            const remaining = Math.max(0, target - current);
            const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const isCompleted = current >= target;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-amber-200/80 p-5 space-y-4 hover:border-orange-400/80 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  
                  {/* Card Title & Icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-amber-200/60"
                        style={{ backgroundColor: `${item.color || '#ea580c'}15`, color: item.color || '#ea580c' }}
                      >
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-blue-950 tracking-tight line-clamp-1">
                          {item.name}
                        </h2>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {item.category || 'Umum'}
                        </span>
                      </div>
                    </div>

                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tercapai
                      </span>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-medium">Saldo Terkumpul</div>
                    <div className="text-2xl font-black text-blue-950 tracking-tight">
                      {formatRupiah(current)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 font-medium">
                      <span>Target: {formatRupiah(target)}</span>
                      <span>Sisa: {formatRupiah(remaining)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: item.color || '#ea580c',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>{percent}% selesai</span>
                      {item.targetDate && (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Calendar className="w-3 h-3 text-orange-600" />
                          Target: {formatDateIndo(item.targetDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-slate-700 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 italic font-medium">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-amber-100 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditSaving(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      title="Ubah rincian"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingSaving(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus pos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenAdjustSaving(item, 'withdraw')}
                      disabled={current <= 0}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                      title="Tarik dana dari pos ini"
                    >
                      Tarik
                    </button>
                    <button
                      onClick={() => onOpenAdjustSaving(item, 'deposit')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-orange-950/20"
                      title="Setor dana ke pos ini"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Setor</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-3 py-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-blue-950">Belum ada pos tabungan atau target keuangan.</p>
            <p className="text-xs text-slate-500 mt-1">Buat pos tabungan baru untuk mulai menyisihkan dana darurat atau impian keluarga.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingSaving)}
        onClose={() => setDeletingSaving(null)}
        onConfirm={() => {
          if (deletingSaving) {
            onDeleteSaving(deletingSaving.id);
          }
        }}
        title="Hapus Pos Tabungan"
        itemName={deletingSaving?.name}
        itemDetail={deletingSaving ? `Saldo: ${formatRupiah(deletingSaving.currentAmount)} | Target: ${formatRupiah(deletingSaving.targetAmount)}` : undefined}
      />

    </div>
  );
};
