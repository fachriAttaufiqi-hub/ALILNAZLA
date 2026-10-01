import React, { useState, useEffect } from 'react';
import { X, PiggyBank, Target, Calendar } from 'lucide-react';
import { Saving } from '../../types/index.ts';
import { formatRupiah } from '../../utils/format.ts';

interface SavingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Saving, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>, editId?: number) => Promise<void>;
  editingSaving?: Saving | null;
}

const COLOR_PRESETS = [
  '#ea580c', // orange
  '#0d9488', // teal
  '#16a34a', // emerald
  '#2563eb', // blue
  '#d97706', // amber
  '#7c3aed', // purple
  '#e11d48', // rose
];

const CATEGORY_PRESETS = [
  'Dana Darurat',
  'Pendidikan Anak',
  'Ibadah & Qurban',
  'Rumah & Renovasi',
  'Kendaraan',
  'Liburan Keluarga',
  'Investasi Masa Depan',
  'Umum',
];

export const SavingModal: React.FC<SavingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSaving = null,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingSaving) {
      setName(editingSaving.name);
      setTargetAmount(editingSaving.targetAmount);
      setCurrentAmount(editingSaving.currentAmount);
      setTargetDate(editingSaving.targetDate || '');
      setCategory(editingSaving.category || CATEGORY_PRESETS[0]);
      setColor(editingSaving.color || COLOR_PRESETS[0]);
      setNotes(editingSaving.notes || '');
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setTargetDate('');
      setCategory(CATEGORY_PRESETS[0]);
      setColor(COLOR_PRESETS[0]);
      setNotes('');
    }
  }, [editingSaving, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      alert('Nama pos dan target tabungan harus diisi');
      return;
    }

    setLoading(true);
    try {
      await onSave(
        {
          name,
          targetAmount,
          currentAmount: currentAmount || '0',
          targetDate: targetDate || null,
          category,
          color,
          notes,
        },
        editingSaving ? editingSaving.id : undefined
      );
      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan pos tabungan: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden text-blue-950">
        
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <h2 className="text-base font-extrabold text-blue-950">
            {editingSaving ? 'Ubah Pos Tabungan' : 'Buat Pos Tabungan Baru'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-blue-950 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Nama Target / Pos Tabungan *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Dana Darurat 6 Bulan, Qurban 2027"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Target Nominal (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="1"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-sm font-bold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
            {targetAmount && parseFloat(targetAmount) > 0 && (
              <p className="text-[11px] text-emerald-800 font-extrabold">
                {formatRupiah(targetAmount)}
              </p>
            )}
          </div>

          {/* Current Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Saldo Awal yang Sudah Ada (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Target Tercapai</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Color Tag Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Warna Aksen</label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-orange-500' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Catatan Pos Tabungan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Disimpan di Reksadana Pasar Uang"
              className="w-full px-3.5 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-950/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Menyimpan...' : 'Simpan Pos Tabungan'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
