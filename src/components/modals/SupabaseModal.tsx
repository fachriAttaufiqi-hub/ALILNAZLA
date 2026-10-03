import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  KeyRound, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  ShieldCheck,
  Server,
  UploadCloud,
  ArrowRight,
  Save,
  Trash2,
  Lock,
  Globe,
  Users,
  Heart,
  Share2,
  Smartphone,
  Send,
  Zap
} from 'lucide-react';
import { ApiClient } from '../../lib/api.ts';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  checkSupabaseTablesExist,
  getSupabaseProjectRef,
  createSpousePairingLink,
  createWhatsAppShareLink
} from '../../lib/supabase.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  api: ApiClient;
  initialTab?: 'connect' | 'spouse_sync' | 'rls_fix' | 'sql' | 'guide';
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  api,
  initialTab = 'spouse_sync',
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    type: string;
    database?: string;
    host?: string;
    projectRef?: string;
    tablesExist?: boolean;
    sqlEditorUrl?: string;
    tableEditorUrl?: string;
    error?: string;
    rlsWarning?: boolean;
    timestamp?: string;
  } | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'connect' | 'spouse_sync' | 'rls_fix' | 'sql' | 'guide'>(initialTab);

  // Input states for direct configuration
  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      const cfg = getSupabaseConfig();
      setInputUrl(cfg.url);
      setInputKey(cfg.key);
      testConnection();
      try {
        setPendingCount(api.getPendingQueueCount());
      } catch {}
    }
  }, [isOpen, initialTab, api]);

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const status = await api.getDatabaseStatus();
      setDbStatus(status);
      setPendingCount(api.getPendingQueueCount());
    } catch (err: any) {
      setDbStatus({
        connected: false,
        type: 'Supabase / PostgreSQL',
        error: err.message || 'Gagal menghubungi server',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      saveSupabaseConfig(inputUrl, inputKey);
      setSaveStatus('Kredensial Supabase berhasil disimpan di browser & siap digunakan!');
      await testConnection();
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: any) {
      setSaveStatus('Gagal menyimpan: ' + err.message);
    }
  };

  const handleSaveToServer = async () => {
    if (!inputUrl || !inputKey) {
      alert('Isi URL dan Anon Key terlebih dahulu sebelum menyimpan ke server keluarga.');
      return;
    }
    setIsSavingServer(true);
    setSaveStatus(null);
    try {
      saveSupabaseConfig(inputUrl, inputKey);
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl, key: inputKey }),
      });
      if (res.ok) {
        setSaveStatus('✅ Berhasil disimpan ke Server Keluarga! Seluruh perangkat baru yang membuka link aplikasi akan otomatis terhubung ke database ini.');
      } else {
        setSaveStatus('Tersimpan di browser lokal perangkat ini.');
      }
      await testConnection();
    } catch {
      setSaveStatus('Tersimpan di browser lokal perangkat ini.');
    } finally {
      setIsSavingServer(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setInputUrl('');
    setInputKey('');
    setSaveStatus('Kredensial Supabase telah dihapus. Aplikasi kembali ke mode penyimpanan lokal offline.');
    testConnection();
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      // 1. Flush local unsynced pending queue first
      const queueRes = await api.syncPendingQueue();
      // 2. Sync all local records to Supabase
      const syncRes = await api.syncAllLocalToCloud();
      setPendingCount(api.getPendingQueueCount());

      if (syncRes.success) {
        setSyncMessage({ 
          success: true, 
          text: `Sinkronisasi berhasil! ${queueRes.synced} antrean terkirim. ${syncRes.count} data tersinkronisasi ke cloud.` 
        });
      } else {
        setSyncMessage({ success: false, text: syncRes.message || 'Gagal sinkronisasi data' });
      }
      testConnection();
    } catch (err: any) {
      setSyncMessage({ success: false, text: err.message || 'Terjadi kesalahan saat sinkronisasi' });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2500);
  };

  // SQL RLS Fix & Realtime Activation
  const rlsFixSql = `-- ========================================================
-- SOLUSI: AGAR INPUT MASUK, TERHAPUS & REALTIME SINKRON DI SEMUA HP/LAPTOP
-- Salin & Jalankan di Supabase -> SQL Editor -> Run
-- ========================================================

ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS debt_ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS business_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS monthly_reports DISABLE ROW LEVEL SECURITY;

-- Aktifkan Realtime Replication untuk seluruh tabel
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions, debts, debt_ledger_entries, business_transactions, savings, users;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

  // SQL DDL Schema Script for Supabase
  const sqlDdlSchema = `-- ========================================================
-- SKRIP DATABASE KELUARGAFIN UNTUK SUPABASE (POSTGRESQL)
-- Salin & Jalankan di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ========================================================

-- 1. Tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    photo_url TEXT,
    monthly_budget NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Transaksi Rumah Tangga (Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' atau 'expense'
    category TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    wallet TEXT NOT NULL DEFAULT 'Tunai',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Hutang & Piutang (Induk Buku Pembantu)
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL,
    type TEXT NOT NULL, -- 'debt' (Hutang) atau 'receivable' (Piutang)
    person TEXT NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' atau 'paid_off'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Mutasi Buku Pembantu Hutang & Piutang
CREATE TABLE IF NOT EXISTS debt_ledger_entries (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER NOT NULL,
    user_uid TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL, -- 'initial', 'borrow_addition', 'installment_payment', 'settlement'
    amount NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    wallet TEXT DEFAULT 'Tunai',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Transaksi Usaha Sampingan (Pemisahan Omzet, HPP, Operasional)
CREATE TABLE IF NOT EXISTS business_transactions (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' atau 'expense'
    category TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    date TEXT NOT NULL,
    wallet TEXT NOT NULL DEFAULT 'Kas Usaha',
    customer_or_vendor TEXT,
    invoice_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel Pos Tabungan & Target Keuangan
CREATE TABLE IF NOT EXISTS savings (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC(14, 2) NOT NULL,
    current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    target_date TEXT,
    category TEXT DEFAULT 'Umum',
    color TEXT DEFAULT '#10b981',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Laporan Keuangan Bulanan
CREATE TABLE IF NOT EXISTS monthly_reports (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL,
    period TEXT NOT NULL, -- Format YYYY-MM
    total_income NUMERIC(14, 2) NOT NULL,
    total_expense NUMERIC(14, 2) NOT NULL,
    net_cashflow NUMERIC(14, 2) NOT NULL,
    savings_deposited NUMERIC(14, 2) NOT NULL DEFAULT 0,
    debt_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
    savings_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    top_expense_category TEXT,
    status_summary TEXT,
    evaluation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks performa query
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_uid, date);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_uid);
CREATE INDEX IF NOT EXISTS idx_debt_ledger_debt ON debt_ledger_entries(debt_id);
CREATE INDEX IF NOT EXISTS idx_business_user_date ON business_transactions(user_uid, date);
CREATE INDEX IF NOT EXISTS idx_savings_user ON savings(user_uid);
CREATE INDEX IF NOT EXISTS idx_reports_user_period ON monthly_reports(user_uid, period);

-- ========================================================
-- PENTING: NONAKTIFKAN ROW LEVEL SECURITY (RLS)
-- AGAR APLIKASI WEB & HANDPHONE DAPAT MEMASUKKAN DATA
-- ========================================================
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS debt_ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS business_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS monthly_reports DISABLE ROW LEVEL SECURITY;
`;

  const projectRef = dbStatus?.projectRef || getSupabaseProjectRef(inputUrl);
  const directSqlEditorUrl = projectRef 
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` 
    : 'https://supabase.com/dashboard';
  const directTableEditorUrl = projectRef 
    ? `https://supabase.com/dashboard/project/${projectRef}/editor` 
    : 'https://supabase.com/dashboard';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-amber-200/80 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-5 sm:p-6 text-white flex items-center justify-between shrink-0 shadow-sm border-b border-orange-300/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-sm text-white">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  Koneksi & Pengaturan Supabase
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white border border-emerald-300/40">
                  Online & Netlify Ready
                </span>
              </div>
              <p className="text-xs text-orange-50 font-medium">
                Hubungkan database cloud Supabase Anda agar data tersimpan online & dapat diakses dari mana saja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 px-5 py-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Status Koneksi:</span>
            {isTesting ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa status...
              </span>
            ) : dbStatus?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Terhubung & Siap Digunakan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                Mode Lokal / Belum Tersambung
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="flex items-center gap-1 text-[11px] font-bold text-orange-700 hover:text-orange-900 bg-white border border-amber-300/80 px-2.5 py-1 rounded-lg hover:bg-amber-100/50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              Cek Ulang
            </button>
          </div>
        </div>

        {/* RLS Warning / Alert Banner */}
        <div className="bg-rose-50 border-b border-rose-200 p-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-950 font-bold block text-xs">
                Tabel di Supabase Kosong atau Nilai Input Tidak Masuk?
              </strong>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Supabase secara default menyalakan <strong>Row-Level Security (RLS)</strong> yang memblokir penambahan data. Anda wajib menjalankan perintah <code>DISABLE ROW LEVEL SECURITY</code> di SQL Editor Supabase agar input langsung tersimpan!
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('rls_fix')}
            className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            Perbaiki RLS Sekarang &rarr;
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('spouse_sync')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'spouse_sync'
                ? 'border-orange-500 text-orange-700 bg-orange-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-600" />
            <span>1. 📱 Tautkan HP Suami & Istri</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-extrabold rounded-full">
              Sinkron
            </span>
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'connect'
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Sambungkan Supabase (URL & Key)
          </button>
          <button
            onClick={() => setActiveTab('rls_fix')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap text-rose-700 flex items-center gap-1.5 ${
              activeTab === 'rls_fix'
                ? 'border-rose-500 text-rose-800'
                : 'border-transparent text-rose-600 hover:text-rose-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            3. Solusi Data Kosong (RLS)
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            4. Skrip Tabel Lengkap
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            5. Panduan Netlify & PWA
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* TAB 0: TAUTKAN HP SUAMI & ISTRI */}
          {activeTab === 'spouse_sync' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Diagnosis box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200/90 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Mengapa Data Suami & Istri Sempat Tidak Sama?
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Aplikasi ini dirancang untuk pembukuan keluarga bersama. Ketidaksamaan data sebelumnya terjadi karena <strong>HP suami dan HP istri belum terhubung ke alamat Database Supabase yang sama</strong>, atau input di salah satu HP belum terkirim ke database karena pengaturan keamanan (RLS).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: 1-Click WhatsApp Invite / Link */}
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs">
                      1
                    </span>
                    <h5 className="font-extrabold text-sm text-slate-900">
                      Tautkan HP Pasangan dalam 1 Detik (1-Klik via WhatsApp)
                    </h5>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Paling Mudah & Otomatis
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Cukup kirim link sinkronisasi di bawah ini ke WhatsApp istri. Ketika istri membuka link tersebut di HP-nya, aplikasi akan <strong>secara otomatis menyambungkan database keluarga yang sama</strong> tanpa perlu salin kode apapun!
                </p>

                {/* Direct Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <a
                    href={createWhatsAppShareLink(inputUrl, inputKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer text-center"
                  >
                    <Send className="w-4 h-4" />
                    <span>📱 Kirim Link ke WhatsApp Istri</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const link = createSpousePairingLink(inputUrl, inputKey);
                      handleCopy(link, 'spouse_link');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedSection === 'spouse_link' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-extrabold">Link Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span>Salin Link Tautan</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Link Preview */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600 break-all font-mono">
                  <span className="truncate flex-1">
                    {createSpousePairingLink(inputUrl, inputKey)}
                  </span>
                </div>
              </div>

              {/* Step 2: Simpan & Terapkan ke Server Cloud */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-extrabold text-xs">
                      2
                    </span>
                    <h5 className="font-extrabold text-sm text-slate-900">
                      Selaraskan Database ke Server Keluarga
                    </h5>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Simpan kredensial ini ke server aplikasi, sehingga siapapun anggota keluarga yang membuka web aplikasi ini di masa depan langsung otomatis membaca database yang sama.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveToServer}
                    disabled={isSavingServer}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>{isSavingServer ? 'Menyimpan ke Server...' : 'Simpan & Terapkan ke Server'}</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Status Realtime & Antrean Sinkronisasi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs">
                      3
                    </span>
                    <h5 className="font-extrabold text-sm text-slate-900">
                      Pemeriksaan Status & Sinkronisasi Realtime
                    </h5>
                  </div>
                  {pendingCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                      {pendingCount} Data Menunggu Terkirim
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Database Cloud</span>
                    <p className="font-mono font-bold text-slate-900 truncate">
                      {projectRef ? `${projectRef}.supabase.co` : (cleanSupabaseUrl || 'Belum diatur')}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {dbStatus?.connected ? 'Terhubung Aktif' : 'Memeriksa...'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Antrean Sinkronisasi Lokal</span>
                    <p className="font-bold text-slate-900">
                      {pendingCount === 0 ? '0 Antrean (Semua data tersinkron)' : `${pendingCount} item menunggu sinyal`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Otomatis dikirim saat koneksi stabil
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sedang Menyinkronkan...' : '⚡ Sinkronkan Semua Data Sekarang (Paksa 2-Arah)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('rls_fix')}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Cek RLS Database</span>
                  </button>
                </div>

                {syncMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${syncMessage.success ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
                    {syncMessage.text}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* TAB 1: SAMBUNGKAN SUPABASE */}
          {activeTab === 'connect' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                <h4 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-600" />
                  Koneksi Langsung (Bisa Digunakan di Netlify & Handphone)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masukkan <strong>Project URL</strong> dan <strong>Anon Public Key</strong> dari dashboard Supabase Anda. Kredensial akan disimpan langsung di browser dan disinkronkan otomatis saat ada koneksi internet.
                </p>
              </div>

              {saveStatus && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold">
                  {saveStatus}
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                    <span>Supabase Project URL</span>
                    <span className="text-[10px] text-slate-400 font-normal">Contoh: https://xyz.supabase.co</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://[PROJECT-ID].supabase.co"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-slate-300 rounded-xl text-xs font-mono text-blue-950 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                    <span>Supabase Anon Public API Key</span>
                    <span className="text-[10px] text-slate-400 font-normal">Project Settings &gt; API &gt; anon public</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full px-3.5 py-2 bg-amber-50/50 border border-slate-300 rounded-xl text-xs font-mono text-blue-950 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  {inputUrl && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3.5 py-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                    >
                      Putuskan Koneksi
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-950/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan & Sambungkan</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Action buttons if connected */}
              {projectRef && (
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={directSqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                  >
                    <Terminal className="w-3.5 h-3.5 text-orange-400" />
                    <span>Buka SQL Editor di Supabase</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                  <a
                    href={directTableEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Buka Table Editor</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOLUSI RLS DATA KOSONG */}
          {activeTab === 'rls_fix' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
                <h4 className="text-sm font-black flex items-center gap-2 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Mengapa Data Anda Masih Kosong di Supabase?
                </h4>
                <p className="text-xs leading-relaxed text-rose-800">
                  Ketika Anda membuat tabel di Supabase, fitur <strong>Row Level Security (RLS)</strong> otomatis aktif. RLS akan memblokir setiap operasi <code>INSERT</code> dari aplikasi web kecuali diizinkan secara eksplisit.
                </p>
                <p className="text-xs leading-relaxed font-bold text-rose-900">
                  Solusinya sangat mudah: Jalankan skrip di bawah ini di SQL Editor Supabase Anda untuk menonaktifkan RLS!
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 text-slate-200">
                <div className="bg-slate-900/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-orange-400">
                    Skrip Nonaktifkan RLS (Copy-Paste ke Supabase)
                  </span>
                  <button
                    onClick={() => handleCopy(rlsFixSql, 'rls')}
                    className="flex items-center gap-1 text-[11px] font-bold bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSection === 'rls' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Skrip Ini</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed">
                  {rlsFixSql}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <a
                  href={directSqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-sm"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Jalankan di Supabase SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: SKRIP TABEL LENGKAP */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Skrip Pembuatan Seluruh Tabel & Nonaktifkan RLS
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mencakup <code>transactions</code>, <code>debts</code>, <code>debt_ledger_entries</code>, <code>savings</code>, <code>business_transactions</code>
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(sqlDdlSchema, 'full-sql')}
                  className="flex items-center gap-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {copiedSection === 'full-sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 text-slate-200">
                <pre className="p-4 text-[11px] font-mono text-emerald-300 max-h-96 overflow-y-auto leading-relaxed">
                  {sqlDdlSchema}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: PANDUAN NETLIFY & PWA */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <h5 className="font-extrabold text-blue-950 text-sm">Cara Upload ke Netlify:</h5>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-medium">
                  <li>Jalankan build dengan perintah <code>npm run build</code> untuk menghasilkan folder <code>dist</code>.</li>
                  <li>Di dashboard Netlify, drag & drop folder <code>dist</code> tersebut.</li>
                  <li>Aplikasi sudah dilengkapi file <code>_redirects</code> dan <code>manifest.webmanifest</code> sehingga routing SPA dan instalasi PWA di handphone langsung bekerja!</li>
                  <li>Di browser handphone atau desktop, klik <strong>"Koneksi Supabase"</strong> lalu masukkan URL & Anon Key sekali saja. Semua transaksi otomatis sinkron online!</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <h5 className="font-extrabold text-orange-950 text-sm">Cara Instal di Handphone (PWA):</h5>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-700 font-medium">
                  <li><strong>Android (Google Chrome):</strong> Buka link web, tap menu titik tiga di kanan atas &gt; pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
                  <li><strong>iPhone (Safari):</strong> Buka link web di Safari, tap tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) &gt; pilih <strong>"Add to Home Screen"</strong>.</li>
                  <li>Aplikasi akan muncul seperti aplikasi native di layar utama HP Anda dengan ikon dan performa cepat!</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Data tersimpan aman di browser &amp; disinkronkan ke Supabase Cloud
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
