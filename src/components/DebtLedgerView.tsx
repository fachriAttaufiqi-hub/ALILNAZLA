import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  Plus, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Receipt, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingDown,
  Building,
  User,
  Wallet
} from 'lucide-react';
import { Debt, DebtLedgerEntry, DebtWithLedger } from '../types/index.ts';
import { ApiClient } from '../lib/api.ts';
import { formatRupiah, formatDateIndo, WALLET_OPTIONS } from '../utils/format.ts';

interface DebtLedgerViewProps {
  debt: Debt;
  api: ApiClient;
  onBack: () => void;
  onRefreshParentDebts: () => Promise<void>;
}

export const DebtLedgerView: React.FC<DebtLedgerViewProps> = ({
  debt: initialDebt,
  api,
  onBack,
  onRefreshParentDebts,
}) => {
  const [debt, setDebt] = useState<Debt>(initialDebt);
  const [entries, setEntries] = useState<DebtLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick mutation modal state
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [mutationType, setMutationType] = useState<'installment_payment' | 'borrow_addition'>('installment_payment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [wallet, setWallet] = useState(WALLET_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [recordCashflow, setRecordCashflow] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch full subsidiary ledger
  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data: DebtWithLedger = await api.getDebtLedger(debt.id);
      setDebt(data.debt);
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to load debt ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [api, debt.id]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const totalAmount = parseFloat(debt.totalAmount);
  const paidAmount = parseFloat(debt.paidAmount);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const isPaidOff = debt.status === 'paid_off' || remainingAmount === 0;
  const isDebt = debt.type === 'debt';
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  const handleAddMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert('Nominal mutasi harus lebih dari 0');
      return;
    }

    setSubmitting(true);
    try {
      await api.addDebtLedgerEntry(debt.id, {
        type: mutationType,
        amount: val,
        date,
        wallet,
        notes: notes.trim() || undefined,
        recordTransaction: recordCashflow,
      });

      setIsMutationModalOpen(false);
      setAmount('');
      setNotes('');
      await fetchLedger();
      await onRefreshParentDebts();
    } catch (err: any) {
      alert('Gagal mencatat mutasi buku pembantu: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white border border-amber-200/80 text-blue-950 hover:bg-amber-50 hover:border-orange-400 transition-all cursor-pointer shadow-sm"
            title="Kembali ke Daftar Hutang & Piutang"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isDebt ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {isDebt ? 'Buku Pembantu Hutang' : 'Buku Pembantu Piutang'}
              </span>
              {isPaidOff ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Lunas
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Aktif
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight mt-0.5">
              {debt.person}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 border border-amber-200/80 text-xs font-bold transition-all cursor-pointer shadow-sm no-print"
          >
            <Printer className="w-4 h-4 text-orange-600" />
            <span>Cetak Kartu</span>
          </button>

          {!isPaidOff && (
            <button
              onClick={() => {
                setMutationType('installment_payment');
                setIsMutationModalOpen(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-900/20 transition-all cursor-pointer active:scale-95 no-print"
            >
              <Plus className="w-4 h-4" />
              <span>{isDebt ? '+ Bayar Cicilan' : '+ Terima Pembayaran'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setMutationType('borrow_addition');
              setIsMutationModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-800 text-xs font-bold border border-amber-200/80 transition-all cursor-pointer shadow-sm no-print"
          >
            <Plus className="w-4 h-4 text-orange-600" />
            <span>+ Tambah Pokok</span>
          </button>
        </div>
      </div>

      {/* Account Balance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Total Pokok Pinjaman */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Total Pokok {isDebt ? 'Hutang' : 'Piutang'}
          </span>
          <div className="text-xl font-black text-blue-950">
            {formatRupiah(totalAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Akumulasi nilai pokok komitmen
          </p>
        </div>

        {/* Sudah Dibayar / Dicicil */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Total Telah Dicicil
          </span>
          <div className="text-xl font-black text-emerald-800">
            {formatRupiah(paidAmount)}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
            {progressPercent}% telah terbayarkan
          </p>
        </div>

        {/* Sisa Saldo Kewajiban */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Sisa Saldo Kewajiban
          </span>
          <div className={`text-xl font-black ${isDebt ? 'text-rose-700' : 'text-emerald-800'}`}>
            {formatRupiah(remainingAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {isPaidOff ? 'Lunas tanpa tanggungan' : 'Menunggu pelunasan'}
          </p>
        </div>

        {/* Jatuh Tempo & Catatan */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Jatuh Tempo / Keterangan
          </span>
          <div className="text-sm font-extrabold text-blue-950 flex items-center gap-1.5 mt-0.5">
            <Clock className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{debt.dueDate ? formatDateIndo(debt.dueDate) : 'Fleksibel / Tanpa Tempo'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate font-medium">
            {debt.notes || 'Buku pembantu aktif'}
          </p>
        </div>

      </div>

      {/* Progress Bar */}
      <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-600">Progres Pelunasan Buku Pembantu</span>
          <span className="font-extrabold text-emerald-800">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-amber-100 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isPaidOff ? 'bg-emerald-600' : isDebt ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Subsidiary Ledger Table */}
      <div className="rounded-2xl bg-white border border-amber-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-amber-200/80 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-extrabold text-blue-950">
              Kartu Mutasi Buku Pembantu ({entries.length} Catatan)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Standar Akuntansi Buku Pembantu Pembayaran & Pinjaman
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
            Memuat catatan buku pembantu...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-blue-950">Belum ada mutasi pada buku pembantu ini.</p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol "+ Bayar Cicilan" atau "+ Tambah Pokok" di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/70 text-slate-700 font-bold border-b border-amber-200/80">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jenis Transaksi Mutasi</th>
                  <th className="py-3 px-4">Rekening / Kas</th>
                  <th className="py-3 px-4 text-right">Mutasi Tambah (Rp)</th>
                  <th className="py-3 px-4 text-right">Mutasi Bayar (Rp)</th>
                  <th className="py-3 px-4 text-right">Sisa Saldo Kewajiban</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-slate-800">
                {entries.map((entry, idx) => {
                  const isInitial = entry.type === 'initial';
                  const isAddition = entry.type === 'borrow_addition';
                  const isPayment = entry.type === 'installment_payment' || entry.type === 'settlement';
                  const numAmount = parseFloat(entry.amount);
                  const numBalance = parseFloat(entry.balanceAfter);

                  return (
                    <tr key={entry.id || idx} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-blue-950 whitespace-nowrap">
                        {formatDateIndo(entry.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isInitial && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            Saldo Awal Pokok
                          </span>
                        )}
                        {isAddition && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Tambahan Pokok
                          </span>
                        )}
                        {isPayment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Angsuran / Pembayaran
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {entry.wallet || 'Kas Utama'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap text-rose-700">
                        {isInitial || isAddition ? formatRupiah(numAmount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap text-emerald-800">
                        {isPayment ? formatRupiah(numAmount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black whitespace-nowrap text-blue-950">
                        {formatRupiah(numBalance)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate font-medium">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-amber-100/50 font-bold border-t border-amber-300 text-xs text-blue-950">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right text-slate-700 font-extrabold">
                    Posisi Akhir Buku Pembantu:
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700 font-black">
                    {formatRupiah(totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800 font-black">
                    {formatRupiah(paidAmount)}
                  </td>
                  <td className={`py-3 px-4 text-right font-black ${isDebt ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {formatRupiah(remainingAmount)}
                  </td>
                  <td className="py-3 px-4 text-emerald-800 font-extrabold">
                    {isPaidOff ? 'LUNAS' : 'BELUM LUNAS'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Mutasi Buku Pembantu */}
      {isMutationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-amber-200/80 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-blue-950">
                  {mutationType === 'installment_payment' 
                    ? (isDebt ? 'Catat Cicilan / Angsuran' : 'Catat Penerimaan Pembayaran')
                    : 'Tambah Pokok Pinjaman / Hutang'}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Buku Pembantu: <strong className="text-blue-950">{debt.person}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsMutationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-blue-950 hover:bg-amber-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMutation} className="space-y-4">
              {/* Mutation Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-amber-100/70 border border-amber-200">
                <button
                  type="button"
                  onClick={() => setMutationType('installment_payment')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    mutationType === 'installment_payment'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-emerald-800'
                  }`}
                >
                  {isDebt ? 'Bayar Cicilan' : 'Terima Pembayaran'}
                </button>
                <button
                  type="button"
                  onClick={() => setMutationType('borrow_addition')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    mutationType === 'borrow_addition'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-rose-800'
                  }`}
                >
                  Tambah Pokok
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Nominal Mutasi (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Contoh: 1500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-blue-950 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                />
                {amount && (
                  <p className="text-[11px] text-emerald-800 font-extrabold mt-1">
                    {formatRupiah(amount)}
                  </p>
                )}
              </div>

              {/* Date & Wallet */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Tanggal Mutasi *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Kas / Rekening
                  </label>
                  <select
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {WALLET_OPTIONS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Keterangan / Nomor Bukti
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Cicilan bulan ke-3 via transfer BCA"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-amber-50/50 border border-slate-300 rounded-xl px-3 py-2 text-blue-950 text-xs font-medium focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Checkbox: Record into household cashflow */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordCashflow}
                  onChange={(e) => setRecordCashflow(e.target.checked)}
                  className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-blue-950">
                    Otomatis catat ke arus kas keluarga
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    {mutationType === 'installment_payment'
                      ? (isDebt ? 'Masuk sebagai pengeluaran "Pembayaran Hutang"' : 'Masuk sebagai pemasukan "Penerimaan Piutang"')
                      : 'Hanya mencatat di kartu buku pembantu tanpa mempengaruhi kas pengeluaran'}
                  </p>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMutationModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-extrabold transition-all shadow-md shadow-orange-950/20"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan ke Buku Pembantu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
