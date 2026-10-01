import React from 'react';
import { 
  ShieldCheck, 
  LogIn, 
  Wallet, 
  Database, 
  PieChart, 
  CreditCard, 
  PiggyBank, 
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  onContinueDemo: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onContinueDemo }) => {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-amber-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 mx-auto flex items-center justify-center shadow-xl shadow-orange-600/20 text-white">
            <Wallet className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold">
            <Database className="w-3.5 h-3.5 text-orange-600" />
            <span>Didukung Basis Data Cloud SQL Relasional</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">
            KeluargaFin
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
            Aplikasi pengelolaan arus kas, hutang, piutang, dan pos tabungan rumah tangga dengan laporan keuangan bulanan otomatis dan data terenkripsi.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <PieChart className="w-4 h-4 text-orange-600" />
              <span>Arus Kas & Laporan</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug font-medium">
              Kalkulasi surplus/defisit dan rasio tabungan otomatis tersimpan.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <CreditCard className="w-4 h-4 text-orange-600" />
              <span>Hutang & Piutang</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug font-medium">
              Pantau jatuh tempo dan pelunasan cicilan keluarga terstruktur.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <PiggyBank className="w-4 h-4 text-orange-600" />
              <span>Pos Tabungan</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug font-medium">
              Alokasikan dana darurat, kurban, pendidikan, dan liburan.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <Lock className="w-4 h-4 text-orange-600" />
              <span>Privasi Terjamin</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug font-medium">
              Setiap data keuangan diisolasi aman per ID pengguna unik.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm shadow-xl active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
          </button>

          <button
            onClick={onContinueDemo}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-amber-50 hover:bg-amber-100 text-blue-950 font-bold text-xs border border-amber-300 transition-all cursor-pointer"
          >
            <span>Lanjutkan Akses Langsung Tanpa Login</span>
            <ArrowRight className="w-4 h-4 text-orange-600" />
          </button>
        </div>

      </div>
    </div>
  );
};
