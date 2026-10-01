import React, { useState } from 'react';
import { X, Target, Lightbulb } from 'lucide-react';
import { formatRupiah } from '../../utils/format.ts';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  onSaveBudget: (budget: number) => Promise<void>;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  onSaveBudget,
}) => {
  const [budgetInput, setBudgetInput] = useState(currentBudget ? String(currentBudget) : '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val < 0) {
      alert('Masukkan batas anggaran yang valid');
      return;
    }

    setLoading(true);
    try {
      await onSaveBudget(val);
      onClose();
    } catch (err: any) {
      alert('Gagal memperbarui anggaran: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden text-blue-950">
        
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-blue-950">Atur Target Anggaran Bulanan</h2>
              <p className="text-xs text-slate-600 font-medium">Batas pengeluaran operasional keluarga</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-blue-950 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">
              Batas Maksimal Pengeluaran per Bulan (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="50000"
                required
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Contoh: 15000000"
                className="w-full pl-11 pr-4 py-2.5 bg-amber-50/50 border border-slate-300 rounded-xl text-base font-bold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
            {budgetInput && parseFloat(budgetInput) > 0 && (
              <div className="text-[11px] text-emerald-800 font-extrabold">
                Terbaca: {formatRupiah(budgetInput)} per bulan
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-extrabold text-orange-800">
              <Lightbulb className="w-3.5 h-3.5 text-orange-600" />
              <span>Panduan Anggaran 50/30/20:</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Idealnya anggaran belanja operasional rutin (kebutuhan dapur, listrik, bensin, sekolah) tidak melebihi 50-60% dari total pemasukan bersih keluarga, agar 20-30% dapat dialokasikan ke pos tabungan dan pelunasan hutang.
            </p>
          </div>

          <div className="pt-3 border-t border-amber-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-orange-950/20 transition-all cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Simpan Anggaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
