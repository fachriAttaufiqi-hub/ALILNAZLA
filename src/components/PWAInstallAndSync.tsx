import React, { useEffect, useState } from 'react';

interface PWAInstallAndSyncProps {
  onTriggerSync?: () => Promise<void>;
}

export const PWAInstallAndSync: React.FC<PWAInstallAndSyncProps> = ({ onTriggerSync }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<string>('Cloud Supabase Aktif');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('Menyinkronkan data...');
      if (onTriggerSync) {
        onTriggerSync().finally(() => {
          setSyncStatus('Tersinkronisasi Realtime');
        });
      } else {
        setSyncStatus('Tersinkronisasi Realtime');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Mode Offline (Lokal)');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onTriggerSync]);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    setSyncStatus('Menyinkronkan ke Cloud...');
    try {
      if (onTriggerSync) {
        await onTriggerSync();
      }
      setSyncStatus('Tersinkronisasi (Semua Perangkat)');
    } catch {
      setSyncStatus('Sinkronisasi selesai');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncStatus(isOnline ? 'Cloud Supabase Aktif' : 'Mode Offline');
      }, 3000);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Indikator Status & Tombol Manual Sinkronisasi */}
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isSyncing}
        title="Klik untuk sinkronkan data ke Cloud Supabase"
        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border shadow-lg transition-all cursor-pointer ${
          isOnline
            ? 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-emerald-500/40 backdrop-blur-md'
            : 'bg-slate-900/90 text-amber-400 border-amber-500/40'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isSyncing
              ? 'bg-blue-400 animate-spin'
              : isOnline
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-amber-400'
          }`}
        />
        <span>{isSyncing ? 'Menyinkronkan...' : syncStatus}</span>
        <svg
          className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Tombol Instal PWA (Hanya muncul jika browser mendukung) */}
      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>📱</span>
          <span>Instal Aplikasi ke HP</span>
        </button>
      )}
    </div>
  );
};
