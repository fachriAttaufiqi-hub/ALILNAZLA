import React, { useState } from 'react';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Wallet,
  PiggyBank
} from 'lucide-react';
import { Saving } from '../../types/index.ts';
import { formatRupiah, WALLET_OPTIONS } from '../../utils/format.ts';

interface AdjustSavingModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: Saving;
  actionType: 'deposit' | 'withdraw';
  onAdjust: (payload: {
    actionType: 'deposit' | 'withdraw';
    amount: number;
    date: string;
    wallet: string;
    recordTransaction: boolean;
    notes?: string;
  }) => Promise<void>;
}

export const AdjustSavingModal: React.FC<AdjustSavingModalProps> = ({
  isOpen,
  onClose,
  saving,
  actionType,
  onAdjust,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [wallet, setWallet] = useState(WALLET_OPTIONS[0]);
  const [recordTransaction, setRecordTransaction] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const current = parseFloat(saving.currentAmount);
  const target = parseFloat(saving.targetAmount);
  const isDeposit = actionType === 'deposit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    if (!isDeposit && val > current) {
      alert('Penarikan tidak boleh melebihi saldo tabungan saat ini (' + formatRupiah(current) + ')');
      return;
    }

    setLoading(true);
    try {
      await onAdjust({
        actionType,
        amount: val,
        date,
        wallet,
        recordTransaction,
        notes: notes || `${isDeposit ? 'Setoran tabungan' : 'Pencairan tabungan'} ${saving.name}`,
      });
      onClose();
    } catch (err: any) {
      alert('Gagal menyesuaikan tabungan: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden text-blue-950">
        
        <div className="flex items-center justify-between p-5 border-b border-amber-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isDeposit ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-orange-600 border-amber-200'
            }`}>
              {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-blue-950">
                {isDeposit ? 'Setor Dana Tabungan' : 'Tarik Dana Tabungan'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">{saving.name}</p>
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
          
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600 font-medium">Saldo Saat Ini: </span>
              <strong className="text-blue-950 text-sm block font-extrabold">{formatRupiah(current)}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-600 font-medium">Target Alokasi: </span>
              <strong className="text-emerald-800 text-sm block font-extrabold">{formatRupiah(target)}</strong>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">
              {isDeposit ? 'Nominal Setoran (Rp) *' : 'Nominal Penarikan (Rp) *'}
            </label>
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
                className="w-full pl-11 pr-4 py-2.5 bg-amber-50/50 border border-slate-300 rounded-xl text-base font-bold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="text-[11px] text-emerald-800 font-extrabold">
                Terbaca: {formatRupiah(amount)}
              </div>
            )}
          </div>

          {/* Date & Wallet */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Sumber Kas / Bank</label>
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
            <label className="text-xs font-bold text-blue-950">Catatan / Keterangan</label>
            <input
              type="text"
              placeholder={isDeposit ? "Contoh: Sisa THR, bonus lembur" : "Contoh: Pembayaran DP qurban"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
            />
          </div>

          {/* Checkbox: Record into household cashflow */}
          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={recordTransaction}
              onChange={(e) => setRecordTransaction(e.target.checked)}
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
            />
            <div className="text-xs">
              <span className="font-extrabold text-blue-950">
                Otomatis catat di arus kas keluarga
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                {isDeposit
                  ? 'Tercatat sebagai pengeluaran keluarga pos "Tabungan & Investasi"'
                  : 'Tercatat sebagai pemasukan keluarga pos "Pencairan Tabungan"'}
              </p>
            </div>
          </label>

          {/* Submit */}
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
              {loading ? 'Menyimpan...' : isDeposit ? 'Konfirmasi Setoran' : 'Konfirmasi Penarikan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
