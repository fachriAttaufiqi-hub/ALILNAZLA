import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Wallet, 
  AlertCircle,
  Delete,
  Settings,
  X
} from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LOCK_STORAGE_KEY = 'keluargafin_passcode';
export const UNLOCKED_SESSION_KEY = 'keluargafin_is_unlocked';
export const REMEMBER_DEVICE_KEY = 'keluargafin_remember_unlocked';

export const getStoredPasscode = (): string => {
  if (typeof window === 'undefined') return '1234';
  return localStorage.getItem(LOCK_STORAGE_KEY) || '1234';
};

export const setStoredPasscode = (newPass: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCK_STORAGE_KEY, newPass);
};

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // States for change passcode modal
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  const handleAttemptUnlock = (inputToTest?: string) => {
    const code = inputToTest !== undefined ? inputToTest : passcode;
    const currentActual = getStoredPasscode();

    if (code === currentActual) {
      setErrorMsg(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
        if (rememberDevice) {
          localStorage.setItem(REMEMBER_DEVICE_KEY, 'true');
        } else {
          localStorage.removeItem(REMEMBER_DEVICE_KEY);
        }
      }
      onUnlock();
    } else {
      setErrorMsg('Kata sandi salah! Silakan coba lagi.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPasscode('');
    }
  };

  const handleKeyPress = (char: string) => {
    if (passcode.length < 12) {
      const next = passcode + char;
      setPasscode(next);
      setErrorMsg(null);
    }
  };

  const handleDeleteChar = () => {
    setPasscode(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPasscode('');
    setErrorMsg(null);
  };

  const handleChangePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);

    const currentActual = getStoredPasscode();
    if (oldPassInput !== currentActual) {
      setChangeError('Kata sandi lama tidak sesuai.');
      return;
    }

    if (!newPassInput || newPassInput.length < 4) {
      setChangeError('Kata sandi baru minimal 4 karakter / angka.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setChangeError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setStoredPasscode(newPassInput);
    setChangeSuccess('Kata sandi berhasil diperbarui! Silakan gunakan sandi baru untuk masuk.');
    setOldPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setTimeout(() => {
      setIsChangingPass(false);
      setChangeSuccess(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white select-none">
      <div className={`w-full max-w-sm bg-slate-900/90 backdrop-blur-xl border border-amber-300/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-center transition-all ${
        isShaking ? 'animate-shake translate-x-2' : ''
      }`}>
        
        {/* Header & Logo */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 shadow-lg shadow-orange-500/20">
            <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center text-orange-400">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>KeluargaFin</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Aman
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Aplikasi Keuangan Terkunci &bull; Masukkan Kunci Sandi
            </p>
          </div>
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAttemptUnlock();
              }}
              placeholder="Masukkan PIN / Sandi"
              autoFocus
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-orange-500 rounded-2xl text-center text-lg font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg ? (
            <p className="text-xs text-rose-400 font-semibold flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 font-medium">
              Kunci sandi bawaan default: <strong className="text-amber-300">1234</strong>
            </p>
          )}
        </div>

        {/* Numeric keypad (Optimal for Mobile / Handphone & Tablet) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-orange-600 active:text-white border border-slate-700/60 text-lg font-bold text-slate-100 transition-all cursor-pointer shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs font-bold text-slate-400 border border-slate-800 transition-all cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-orange-600 active:text-white border border-slate-700/60 text-lg font-bold text-slate-100 transition-all cursor-pointer shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDeleteChar}
            className="py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 border border-slate-800 flex items-center justify-center transition-all cursor-pointer"
            title="Hapus satu angka"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Remember device checkbox & Primary Unlock button */}
        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
            />
            <span>Ingat di perangkat ini</span>
          </label>

          <button
            type="button"
            onClick={() => handleAttemptUnlock()}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Buka Kunci Aplikasi</span>
          </button>
        </div>

        {/* Change Passcode footer link */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Privasi Terjaga
          </span>
          <button
            type="button"
            onClick={() => setIsChangingPass(true)}
            className="text-orange-400 hover:text-orange-300 transition-colors cursor-pointer font-bold"
          >
            Ganti Kata Sandi
          </button>
        </div>

      </div>

      {/* Modal Ubah Kata Sandi */}
      {isChangingPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-orange-400" />
                <span>Ubah Kunci Sandi</span>
              </h3>
              <button
                onClick={() => setIsChangingPass(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changeError && (
              <div className="p-2.5 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium">
                {changeError}
              </div>
            )}
            {changeSuccess && (
              <div className="p-2.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl font-medium">
                {changeSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Kata Sandi Lama</label>
                <input
                  type="password"
                  required
                  value={oldPassInput}
                  onChange={(e) => setOldPassInput(e.target.value)}
                  placeholder="Sandi lama (default: 1234)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Ulangi Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Ketik ulang sandi baru"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPass(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
