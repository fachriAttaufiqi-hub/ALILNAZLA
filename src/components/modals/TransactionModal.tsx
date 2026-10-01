import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Calendar, Tag, CreditCard, DollarSign } from 'lucide-react';
import { Transaction, TransactionType } from '../../types/index.ts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, WALLET_OPTIONS, formatRupiah } from '../../utils/format.ts';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id' | 'userUid' | 'createdAt'>, editId?: number) => Promise<void>;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialType = 'expense',
  editingTransaction = null,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [wallet, setWallet] = useState(WALLET_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setAmount(editingTransaction.amount);
      setDate(editingTransaction.date);
      setWallet(editingTransaction.wallet || WALLET_OPTIONS[0]);
      setNotes(editingTransaction.notes || '');
    } else {
      setType(initialType);
      setCategory(initialType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setWallet(WALLET_OPTIONS[0]);
      setNotes('');
    }
  }, [editingTransaction, initialType, isOpen]);

  if (!isOpen) return null;

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    setLoading(true);
    try {
      await onSave(
        {
          type,
          category: category || categories[0],
          amount,
          date,
          wallet,
          notes,
        },
        editingTransaction ? editingTransaction.id : undefined
      );
      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden text-blue-950">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <h2 className="text-base font-extrabold text-blue-950">
            {editingTransaction ? 'Ubah Catatan Transaksi' : 'Catat Transaksi Baru'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-blue-950 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-2xl border border-amber-200">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (!editingTransaction) setCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-rose-700'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (!editingTransaction) setCategory(INCOME_CATEGORIES[0]);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-emerald-800'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Penerimaan</span>
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Nominal (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 bg-amber-50/50 border border-slate-300 rounded-xl text-base font-extrabold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p className="text-[11px] text-emerald-800 font-extrabold">
                {formatRupiah(amount)}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Kategori *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-blue-950 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Wallet */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Tanggal *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Kas / Rekening</label>
              <select
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                {WALLET_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">Catatan Tambahan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Belanja mingguan di pasar"
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
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
