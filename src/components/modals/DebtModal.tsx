import React, { useState, useEffect } from 'react';
import { X, CreditCard, Clock, User, DollarSign } from 'lucide-react';
import { Debt, DebtType } from '../../types/index.ts';
import { formatRupiah } from '../../utils/format.ts';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Debt, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>, editId?: number) => Promise<void>;
  initialType?: DebtType;
  editingDebt?: Debt | null;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialType = 'debt',
  editingDebt = null,
}) => {
  const [type, setType] = useState<DebtType>(initialType);
  const [person, setPerson] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingDebt) {
      setType(editingDebt.type);
      setPerson(editingDebt.person);
      setTotalAmount(editingDebt.totalAmount);
      setPaidAmount(editingDebt.paidAmount);
      setDueDate(editingDebt.dueDate || '');
      setNotes(editingDebt.notes || '');
    } else {
      setType(initialType);
      setPerson('');
      setTotalAmount('');
      setPaidAmount('0');
      setDueDate('');
      setNotes('');
    }
  }, [editingDebt, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
      alert('Pihak terkait dan nominal total wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const totNum = parseFloat(totalAmount);
      const paidNum = parseFloat(paidAmount || '0');
      const status = paidNum >= totNum ? 'paid_off' : 'active';

      await onSave(
        {
          type,
          person,
          totalAmount,
          paidAmount: paidAmount || '0',
          dueDate: dueDate || null,
          status,
          notes,
        },
        editingDebt ? editingDebt.id : undefined
      );
      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan data: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden text-blue-950">
        
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <h2 className="text-base font-extrabold text-blue-950">
            {editingDebt ? 'Ubah Catatan Hutang/Piutang' : 'Catat Hutang / Piutang Baru'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-blue-950 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-2xl border border-amber-200">
            <button
              type="button"
              onClick={() => setType('debt')}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                type === 'debt'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-rose-700'
              }`}
            >
              Hutang Kita (Kewajiban)
            </button>
            <button
              type="button"
              onClick={() => setType('receivable')}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                type === 'receivable'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-emerald-800'
              }`}
            >
              Piutang (Hak Kita)
            </button>
          </div>

          {/* Person Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">
              {type === 'debt' ? 'Pihak yang Dipinjami / Kreditor *' : 'Pihak Peminjam / Debitur *'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Contoh: BCA Finance, Rudi Pratama, Warung Sebelah"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Total Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Total Nominal Pokok (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="1"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-sm font-bold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
            {totalAmount && parseFloat(totalAmount) > 0 && (
              <p className="text-[11px] text-emerald-800 font-extrabold">
                {formatRupiah(totalAmount)}
              </p>
            )}
          </div>

          {/* Paid Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Sudah Dibayar / Dicicil Saat Ini (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Batas Waktu / Jatuh Tempo (Opsional)</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Catatan / Rincian Cicilan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Cicilan motor 35x, sisa 10 bulan lagi"
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
              {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
