import React from 'react';
import { 
  Wallet, 
  PlusCircle, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  Database,
  Lock,
  Smartphone,
  Heart,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatMonthIndo } from '../utils/format.ts';

interface HeaderProps {
  currentPeriod: string;
  onPeriodChange: (period: string) => void;
  onOpenQuickTx: (type?: 'income' | 'expense') => void;
  onOpenBudgetModal: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenSpouseSync?: () => void;
  onManualSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  onLockApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPeriod,
  onPeriodChange,
  onOpenQuickTx,
  onOpenBudgetModal,
  onOpenSupabaseModal,
  onOpenSpouseSync,
  onManualSync,
  isSyncing = false,
  onLockApp,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  // Generate last 12 months for selector
  const periods = React.useMemo(() => {
    const list: string[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push(`${y}-${m}`);
    }
    return list;
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[#ea7a38] via-[#ed8744] to-[#e47533] border-b border-orange-300/35 px-4 lg:px-8 py-3 shadow-sm shadow-orange-950/5 transition-all text-white">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3.5">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-xs text-white">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white drop-shadow-xs">
                  KeluargaFin
                </span>
                {onOpenSpouseSync ? (
                  <button
                    onClick={onOpenSpouseSync}
                    title="Tautkan aplikasi dengan HP istri/suami agar sinkron realtime"
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-white border border-emerald-300/50 shadow-xs transition-colors cursor-pointer"
                  >
                    <Heart className="w-2.5 h-2.5 text-white fill-white" />
                    Tautkan Pasangan
                  </button>
                ) : onOpenSupabaseModal ? (
                  <button
                    onClick={onOpenSupabaseModal}
                    title="Buka panduan & konfigurasi Supabase"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors cursor-pointer"
                  >
                    <Database className="w-2.5 h-2.5 text-amber-100" />
                    Supabase / SQL
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                    <Database className="w-2.5 h-2.5 text-amber-100" />
                    PostgreSQL
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-50/90 font-medium">Keuangan Rumah Tangga, Sampingan & Hobi</p>
            </div>
          </div>

          {/* Quick period dropdown on mobile */}
          <div className="sm:hidden flex items-center gap-1.5 bg-black/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-amber-100" />
            <select
              value={currentPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer"
            >
              {periods.map(p => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {formatMonthIndo(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          
          {/* Sync Now Button */}
          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sinkronkan data realtime dengan HP pasangan sekarang"
              className="flex items-center gap-1.5 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-300/40 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-200 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkron Pasangan'}</span>
            </button>
          )}

          {/* Supabase Quick Guide Button */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="hidden lg:flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/25 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-100" />
              <span>Database Supabase</span>
            </button>
          )}

          {/* Desktop Period Selector */}
          <div className="hidden sm:flex items-center gap-2 bg-black/10 hover:bg-black/15 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white transition-colors">
            <Calendar className="w-4 h-4 text-amber-100" />
            <span className="text-orange-100 text-xs font-medium">Periode:</span>
            <select
              value={currentPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
            >
              {periods.map(p => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {formatMonthIndo(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Lock App Button */}
          {onLockApp && (
            <button
              onClick={onLockApp}
              title="Kunci Aplikasi (Perlu Sandi untuk Membuka)"
              className="flex items-center gap-1.5 bg-black/15 hover:bg-black/25 border border-white/20 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">Kunci</span>
            </button>
          )}

          {/* Quick Add Button - 1 UI Terpadu */}
          <button
            onClick={() => onOpenQuickTx()}
            className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-orange-700 hover:text-orange-800 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-orange-600" />
            <span>+ Catat Apapun (1 UI)</span>
          </button>

          {/* Database & Profile Status (Non-blocking) */}
          {user ? (
            <div className="flex items-center gap-2 bg-black/10 border border-white/20 rounded-xl pl-2 pr-3 py-1.5 text-white">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-7 h-7 rounded-full border border-white/40 object-cover" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </div>
                <div className="text-[10px] text-amber-100 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-2.5 h-2.5" /> Akun Terhubung
                </div>
              </div>
              <button
                onClick={signOutUser}
                title="Keluar dari akun"
                className="ml-1 text-orange-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-black/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white">
              <div className="w-2 h-2 rounded-full bg-amber-200 animate-pulse" />
              <span className="hidden sm:inline font-semibold text-white">Buku Mandiri</span>
              <button
                onClick={signInWithGoogle}
                title="Hubungkan akun Google (Opsional)"
                className="text-[11px] text-amber-100 hover:text-white ml-1 font-medium underline transition-colors cursor-pointer"
              >
                Tautkan Akun
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
