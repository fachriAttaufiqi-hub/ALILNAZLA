import React, { useState, useEffect, useCallback } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface PinLockModalProps {
  onSuccess: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('app_security_pin') || localStorage.getItem('keluargafin_passcode');
    if (stored) {
      setSavedPin(stored);
    }
  }, []);

  const handleKeyPress = useCallback((num: string) => {
    setPin(prev => {
      if (prev.length < 6) {
        setErrorMsg('');
        return prev + num;
      }
      return prev;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (pin.length < 4) {
      setErrorMsg('PIN minimal harus 4 digit!');
      return;
    }

    // Jika belum pernah buat PIN
    if (!savedPin) {
      if (!isConfirming) {
        setTempPin(pin);
        setPin('');
        setIsConfirming(true);
      } else {
        if (pin === tempPin) {
          localStorage.setItem('app_security_pin', pin);
          localStorage.setItem('keluargafin_passcode', pin);
          onSuccess();
        } else {
          setErrorMsg('Konfirmasi PIN tidak cocok!');
          setPin('');
        }
      }
      return;
    }

    // Jika sudah ada PIN, verifikasi (mendukung PIN tersimpan atau master default 1234)
    if (pin === savedPin || pin === '1234') {
      onSuccess();
    } else {
      setErrorMsg('PIN salah! Silakan coba lagi.');
      setPin('');
    }
  }, [pin, savedPin, isConfirming, tempPin, onSuccess]);

  // Keyboard support for desktop / laptop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleDelete, handleSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-slate-800 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-7 text-center border border-amber-200/80 animate-in fade-in duration-200">
        <div className="inline-flex p-3.5 rounded-2xl bg-orange-50 text-orange-600 mb-4 border border-orange-200">
          {savedPin ? <Lock className="w-8 h-8 text-orange-600" /> : <KeyRound className="w-8 h-8 text-orange-600" />}
        </div>

        <h2 className="text-xl font-extrabold text-blue-950 tracking-tight">
          {!savedPin 
            ? (isConfirming ? 'Konfirmasi PIN Baru' : 'Buat PIN Keamanan') 
            : 'Masukkan PIN Keamanan'}
        </h2>
        <p className="text-xs text-slate-500 mt-1.5 mb-6 font-medium">
          {!savedPin 
            ? (isConfirming ? 'Ulangi PIN yang sama untuk konfirmasi' : 'Atur PIN 4-6 digit untuk melindungi data keuangan Anda') 
            : 'Aplikasi terkunci, masukkan PIN Anda untuk mengakses'}
        </p>

        {/* Indicator Dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                idx < pin.length
                  ? 'bg-orange-600 border-orange-600 scale-110 shadow-xs'
                  : 'border-slate-300 bg-slate-50'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 mb-4 bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl font-bold animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-3 text-lg font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 active:bg-orange-600 active:text-white rounded-2xl transition-all cursor-pointer shadow-xs border border-slate-200/60"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors cursor-pointer"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 text-lg font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 active:bg-orange-600 active:text-white rounded-2xl transition-all cursor-pointer shadow-xs border border-slate-200/60"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="py-3 text-xs font-black text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 rounded-2xl shadow-md shadow-orange-950/20 transition-all cursor-pointer"
          >
            OK &rarr;
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium pt-2">
          {savedPin ? 'PIN default: 1234' : 'Dapat menggunakan angka pada keyboard atau tombol di atas'}
        </p>
      </div>
    </div>
  );
};
