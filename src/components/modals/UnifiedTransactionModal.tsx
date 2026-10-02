import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Briefcase, 
  PiggyBank, 
  Calendar, 
  Wallet, 
  Plus, 
  CheckCircle2, 
  Receipt,
  FileSpreadsheet,
  Building,
  User
} from 'lucide-react';
import { 
  Transaction, 
  Debt, 
  Saving, 
  DebtType,
  BusinessTransaction 
} from '../../types/index.ts';
import { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  WALLET_OPTIONS, 
  BUSINESS_INCOME_CATEGORIES,
  BUSINESS_EXPENSE_CATEGORIES,
  BUSINESS_WALLET_OPTIONS,
  formatRupiah 
} from '../../utils/format.ts';

export type UnifiedEntryType = 'expense_rt' | 'income_rt' | 'debt_ledger' | 'business' | 'savings';

interface UnifiedTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: UnifiedEntryType;
  existingDebts: Debt[];
  existingSavings: Saving[];
  onSaveHouseholdTx: (data: Omit<Transaction, 'id' | 'userUid' | 'createdAt'>) => Promise<void>;
  onSaveNewDebt: (data: Omit<Debt, 'id' | 'userUid' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddDebtLedgerMutation: (debtId: number, payload: {
    type: 'borrow_addition' | 'installment_payment' | 'settlement';
    amount: number;
    date?: string;
    wallet?: string;
    notes?: string;
    recordTransaction?: boolean;
  }) => Promise<void>;
  onSaveBusinessTx: (data: Omit<BusinessTransaction, 'id' | 'userUid' | 'createdAt'>) => Promise<void>;
  onAdjustSaving: (savingId: number, payload: {
    actionType: 'deposit' | 'withdraw';
    amount: number;
    date?: string;
    wallet?: string;
    recordTransaction?: boolean;
    notes?: string;
  }) => Promise<void>;
  onCreatedNewDebtSubpage?: (debtId?: number) => void;
}

export const UnifiedTransactionModal: React.FC<UnifiedTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense_rt',
  existingDebts,
  existingSavings,
  onSaveHouseholdTx,
  onSaveNewDebt,
  onAddDebtLedgerMutation,
  onSaveBusinessTx,
  onAdjustSaving,
  onCreatedNewDebtSubpage,
}) => {
  const [activeTab, setActiveTab] = useState<UnifiedEntryType>(initialType);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Household fields
  const [hhCategory, setHhCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [hhWallet, setHhWallet] = useState(WALLET_OPTIONS[0]);

  // Debt & Buku Pembantu fields
  const [debtSubMode, setDebtSubMode] = useState<'existing_ledger' | 'new_ledger'>('existing_ledger');
  const [selectedDebtId, setSelectedDebtId] = useState<number>(existingDebts[0]?.id || 0);
  const [ledgerMutationType, setLedgerMutationType] = useState<'installment_payment' | 'borrow_addition'>('installment_payment');
  const [newDebtType, setNewDebtType] = useState<DebtType>('debt');
  const [newDebtPerson, setNewDebtPerson] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');
  const [newDebtPaidAmount, setNewDebtPaidAmount] = useState('0');
  const [recordDebtCashflow, setRecordDebtCashflow] = useState(true);

  // Business fields
  const [bizType, setBizType] = useState<'income' | 'expense'>('income');
  const [bizCategory, setBizCategory] = useState(BUSINESS_INCOME_CATEGORIES[0]);
  const [bizWallet, setBizWallet] = useState(BUSINESS_WALLET_OPTIONS[0]);
  const [customerOrVendor, setCustomerOrVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Savings fields
  const [selectedSavingId, setSelectedSavingId] = useState<number>(existingSavings[0]?.id || 0);
  const [savingAction, setSavingAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [recordSavingCashflow, setRecordSavingCashflow] = useState(true);

  useEffect(() => {
    setActiveTab(initialType);
    if (initialType === 'income_rt') {
      setHhCategory(INCOME_CATEGORIES[0]);
    } else if (initialType === 'expense_rt') {
      setHhCategory(EXPENSE_CATEGORIES[0]);
    }
  }, [initialType, isOpen]);

  useEffect(() => {
    if (existingDebts.length > 0 && !selectedDebtId) {
      setSelectedDebtId(existingDebts[0].id);
    }
    if (existingDebts.length === 0) {
      setDebtSubMode('new_ledger');
    }
  }, [existingDebts, selectedDebtId]);

  useEffect(() => {
    if (existingSavings.length > 0 && !selectedSavingId) {
      setSelectedSavingId(existingSavings[0].id);
    }
  }, [existingSavings, selectedSavingId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'expense_rt' || activeTab === 'income_rt') {
        const type = activeTab === 'income_rt' ? 'income' : 'expense';
        await onSaveHouseholdTx({
          type,
          category: hhCategory,
          amount: String(val),
          date,
          wallet: hhWallet,
          notes,
        });
      } else if (activeTab === 'debt_ledger') {
        if (debtSubMode === 'new_ledger') {
          if (!newDebtPerson.trim()) {
            alert('Nama pihak / kreditor wajib diisi');
            setLoading(false);
            return;
          }
          await onSaveNewDebt({
            type: newDebtType,
            person: newDebtPerson.trim(),
            totalAmount: String(val),
            paidAmount: newDebtPaidAmount || '0',
            dueDate: newDebtDueDate || null,
            status: parseFloat(newDebtPaidAmount || '0') >= val ? 'paid_off' : 'active',
            notes,
          });
          if (onCreatedNewDebtSubpage) onCreatedNewDebtSubpage();
        } else {
          if (!selectedDebtId) {
            alert('Pilih buku pembantu tujuan');
            setLoading(false);
            return;
          }
          await onAddDebtLedgerMutation(selectedDebtId, {
            type: ledgerMutationType,
            amount: val,
            date,
            wallet: hhWallet,
            notes,
            recordTransaction: recordDebtCashflow,
          });
        }
      } else if (activeTab === 'business') {
        await onSaveBusinessTx({
          type: bizType,
          category: bizCategory,
          amount: String(val),
          date,
          wallet: bizWallet,
          customerOrVendor: customerOrVendor || undefined,
          invoiceNumber: invoiceNumber || undefined,
          notes,
        });
      } else if (activeTab === 'savings') {
        if (!selectedSavingId) {
          alert('Pilih pos tabungan yang dituju');
          setLoading(false);
          return;
        }
        await onAdjustSaving(selectedSavingId, {
          actionType: savingAction,
          amount: val,
          date,
          wallet: hhWallet,
          recordTransaction: recordSavingCashflow,
          notes,
        });
      }

      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const selectedDebtObj = existingDebts.find(d => d.id === selectedDebtId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-blue-950/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-amber-200 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-blue-950">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-amber-100 shrink-0 bg-amber-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse" />
              <h2 className="text-base font-black text-blue-950 tracking-tight">
                Pusat Pencatatan Terpadu (1 UI)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Input semua pos keuangan: Rumah Tangga, Buku Pembantu Hutang, Tabungan, & Usaha
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-blue-950 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Segment Master Tab Switcher */}
        <div className="p-3 bg-amber-50/70 border-b border-amber-200/80 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            
            <button
              type="button"
              onClick={() => {
                setActiveTab('expense_rt');
                setHhCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'expense_rt'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-rose-700 hover:bg-white/80'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pengeluaran RT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('income_rt');
                setHhCategory(INCOME_CATEGORIES[0]);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'income_rt'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-emerald-800 hover:bg-white/80'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Penerimaan RT</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('debt_ledger')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'debt_ledger'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-orange-800 hover:bg-white/80'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Buku Pembantu Hutang</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-amber-800 hover:bg-white/80'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Sampingan & Hobi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('savings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'savings'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-700 hover:text-blue-900 hover:bg-white/80'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Pos Tabungan</span>
            </button>

          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950">
              {activeTab === 'debt_ledger' && debtSubMode === 'new_ledger'
                ? 'Nominal Total Pinjaman / Piutang (Rp)'
                : 'Nominal Transaksi (Rp)'}
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
                className="w-full pl-11 pr-4 py-2.5 bg-amber-50/50 border border-slate-300 rounded-xl text-base font-extrabold text-blue-950 focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p className="text-[11px] text-emerald-800 font-extrabold">
                Terbaca: {formatRupiah(amount)}
              </p>
            )}
          </div>

          {/* TAB 1 & 2: RUMAH TANGGA (Expense / Income) */}
          {(activeTab === 'expense_rt' || activeTab === 'income_rt') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Kategori</label>
                  <select
                    value={hhCategory}
                    onChange={(e) => setHhCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {(activeTab === 'income_rt' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Sumber / Rekening</label>
                  <select
                    value={hhWallet}
                    onChange={(e) => setHhWallet(e.target.value)}
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
            </>
          )}

          {/* TAB 3: BUKU PEMBANTU HUTANG & PIUTANG */}
          {activeTab === 'debt_ledger' && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between text-xs font-bold text-orange-900 mb-1">
                <span>Opsi Catatan Buku Pembantu:</span>
              </div>

              {/* Sub-mode selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-xl border border-amber-200">
                <button
                  type="button"
                  onClick={() => setDebtSubMode('existing_ledger')}
                  disabled={existingDebts.length === 0}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                    debtSubMode === 'existing_ledger' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-700 hover:text-blue-950'
                  }`}
                >
                  Mutasi Buku Pembantu Ada
                </button>
                <button
                  type="button"
                  onClick={() => setDebtSubMode('new_ledger')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    debtSubMode === 'new_ledger' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-700 hover:text-blue-950'
                  }`}
                >
                  + Buat Buku Pembantu Baru
                </button>
              </div>

              {debtSubMode === 'existing_ledger' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-blue-950">Pilih Buku Pembantu Kreditor / Debitur</label>
                    <select
                      value={selectedDebtId}
                      onChange={(e) => setSelectedDebtId(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {existingDebts.map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.type === 'debt' ? 'Hutang' : 'Piutang'}] {d.person} - Sisa: {formatRupiah(Math.max(0, parseFloat(d.totalAmount) - parseFloat(d.paidAmount)))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-950">Jenis Mutasi Buku</label>
                      <select
                        value={ledgerMutationType}
                        onChange={(e) => setLedgerMutationType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="installment_payment">Pembayaran Cicilan (Mengurangi Sisa)</option>
                        <option value="borrow_addition">Penambahan Pokok Hutang/Pinjaman</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-950">Rekening Kas</label>
                      <select
                        value={hhWallet}
                        onChange={(e) => setHhWallet(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        {WALLET_OPTIONS.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedDebtObj && (
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs text-slate-700 flex justify-between font-medium">
                      <span>Sisa Saldo Buku Saat Ini:</span>
                      <strong className={selectedDebtObj.type === 'debt' ? 'text-rose-700 font-bold' : 'text-emerald-800 font-bold'}>
                        {formatRupiah(Math.max(0, parseFloat(selectedDebtObj.totalAmount) - parseFloat(selectedDebtObj.paidAmount)))}
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="recMutCash"
                      checked={recordDebtCashflow}
                      onChange={(e) => setRecordDebtCashflow(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="recMutCash" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Sinkronkan ke mutasi kas bulanan ({ledgerMutationType === 'installment_payment' ? 'Pengeluaran/Pemasukan' : 'Tidak masuk arus kas'})
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewDebtType('debt')}
                      className={`py-1.5 rounded-lg text-xs font-bold ${
                        newDebtType === 'debt' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700'
                      }`}
                    >
                      Hutang Kita (Kewajiban)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDebtType('receivable')}
                      className={`py-1.5 rounded-lg text-xs font-bold ${
                        newDebtType === 'receivable' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700'
                      }`}
                    >
                      Piutang (Hak Kita)
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-blue-950">Nama Pihak / Debitur / Kreditor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BCA Finance, Pak Joko, Rudi"
                      value={newDebtPerson}
                      onChange={(e) => setNewDebtPerson(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-950">Sudah Dicicil di Awal (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={newDebtPaidAmount}
                        onChange={(e) => setNewDebtPaidAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 focus:outline-none focus:border-orange-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-950">Jatuh Tempo (Opsional)</label>
                      <input
                        type="date"
                        value={newDebtDueDate}
                        onChange={(e) => setNewDebtDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 focus:outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAMPINGAN & HOBI */}
          {activeTab === 'business' && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setBizType('income');
                    setBizCategory(BUSINESS_INCOME_CATEGORIES[0]);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    bizType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  Pemasukan Sampingan / Hobi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBizType('expense');
                    setBizCategory(BUSINESS_EXPENSE_CATEGORIES[0]);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    bizType === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  Pengeluaran / Biaya Hobi
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Kategori Sampingan & Hobi</label>
                  <select
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {(bizType === 'income' ? BUSINESS_INCOME_CATEGORIES : BUSINESS_EXPENSE_CATEGORIES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Rekening Kas Sampingan/Hobi</label>
                  <select
                    value={bizWallet}
                    onChange={(e) => setBizWallet(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {BUSINESS_WALLET_OPTIONS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Pelanggan / Klien / Toko</label>
                  <input
                    type="text"
                    placeholder="Nama klien, pembeli, toko hobi"
                    value={customerOrVendor}
                    onChange={(e) => setCustomerOrVendor(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">No. Invoice / Resi</label>
                  <input
                    type="text"
                    placeholder="INV-001 / Nota"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POS TABUNGAN */}
          {activeTab === 'savings' && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSavingAction('deposit')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    savingAction === 'deposit' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  Setor ke Tabungan
                </button>
                <button
                  type="button"
                  onClick={() => setSavingAction('withdraw')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    savingAction === 'withdraw' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  Tarik Tabungan
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Pilih Pos Tabungan</label>
                  <select
                    value={selectedSavingId}
                    onChange={(e) => setSelectedSavingId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {existingSavings.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Terkumpul: {formatRupiah(s.currentAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-950">Rekening Kas</label>
                  <select
                    value={hhWallet}
                    onChange={(e) => setHhWallet(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-blue-950 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {WALLET_OPTIONS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recordSavCash"
                  checked={recordSavingCashflow}
                  onChange={(e) => setRecordSavingCashflow(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="recordSavCash" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Sinkronkan ke mutasi kas bulanan
                </label>
              </div>
            </div>
          )}

          {/* Date and Notes (Universal bottom fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950">Catatan / Keterangan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Rincian catatan transaksi..."
                className="w-full px-3.5 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs text-blue-950 font-medium focus:outline-none focus:border-orange-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-amber-100 flex items-center justify-end gap-2.5">
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
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md shadow-orange-950/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
