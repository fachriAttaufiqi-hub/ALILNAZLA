import React, { useState } from 'react';
import { X, Receipt, CheckCircle2, ArrowRight } from 'lucide-react';
import { Debt } from '../../types/index.ts';
import { formatRupiah, WALLET_OPTIONS } from '../../utils/format.ts';

interface PayDebtModalProps {
  isOpen: boolean;
  debt: Debt | null;
  onClose: () => void;
  onPay: (debtId: number, payload: { paymentAmount: number; date?: string; wallet?: string; recordTransaction?: boolean; notes?: string }) => Promise<void>;
}

export const PayDebtModal: React.FC<PayDebtModalProps> = ({
  isOpen,
  debt,
  onClose,
  onPay,
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [wallet, setWallet] = useState(WALLET_OPTIONS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recordTransaction, setRecordTransaction] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !debt) return null;

  const isDebt = debt.type === 'debt';
  const total = parseFloat(debt.totalAmount);
  const paid = parseFloat(debt.paidAmount);
  const remaining = Math.max(0, total - paid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(paymentAmount);
    if (isNaN(val) || val <= 0) {
      alert('Nominal pembayaran harus lebih dari 0');
      return;
    }

    setLoading(true);
    try {
      await onPay(debt.id, {
        paymentAmount: val,
        date,
        wallet,
        recordTransaction,
        notes: notes || `Cicilan ${isDebt ? 'Hutang' : 'Piutang'} ${debt.person}`,
      });
      onClose();
    } catch (err: any) {
      alert('Gagal memproses pembayaran: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden text-blue-950">
        
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center border border-orange-200">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-blue-950">
                {isDebt ? 'Bayar Cicilan / Pelunasan' : 'Terima Pembayaran Piutang'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">{debt.person}</p>
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
          
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Total Tagihan:</span>
              <span className="font-extrabold text-blue-950">{formatRupiah(total)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Sudah Terbayar:</span>
              <span className="font-extrabold text-emerald-800">{formatRupiah(paid)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1.5 border-t border-amber-200 font-bold">
              <span>Sisa Tagihan:</span>
              <span className={isDebt ? 'text-rose-700 font-black text-sm' : 'text-emerald-800 font-black text-sm'}>
                {formatRupiah(remaining)}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950">Nominal Pembayaran (Rp) *</label>
              <button
                type="button"
                onClick={() => setPaymentAmount(String(remaining))}
                className="text-[11px] font-bold text-orange-600 hover:underline"
              >
                Lunasi Sisa ({formatRupiah(remaining)})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="1"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-sm font-bold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Date & Wallet */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Tanggal Bayar *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Rekening / Kas</label>
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
            <label className="text-xs font-bold text-blue-950">Catatan / Bukti Transfer</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Cicilan bulan ini via BCA"
              className="w-full px-3.5 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
            />
          </div>

          {/* Checkbox: Record into household cashflow */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={recordTransaction}
              onChange={(e) => setRecordTransaction(e.target.checked)}
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
            />
            <div className="text-xs">
              <span className="font-extrabold text-blue-950">
                Otomatis catat ke mutasi pengeluaran kas keluarga
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                {isDebt
                  ? 'Akan dicatat sebagai pengeluaran kategori "Pembayaran Hutang"'
                  : 'Akan dicatat sebagai pemasukan kategori "Penerimaan Piutang"'}
              </p>
            </div>
          </label>

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
              {loading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
