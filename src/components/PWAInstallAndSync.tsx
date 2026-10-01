import React, { useEffect, useState } from 'react';

export const PWAInstallAndSync: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<string>('Tersinkronisasi');

  useEffect(() => {
    // 1. Tangkap Event PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Listener Status Jaringan (Online / Offline)
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('Menyinkronkan data...');
      
      // Jalankan fungsi sinkronisasi data dari Local Storage ke Cloud / Server jika ada
      syncDataWithServer().then(() => {
        setSyncStatus('Tersinkronisasi');
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Mode Offline (Data tersimpan lokal)');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fungsi simulasi sinkronisasi data
  const syncDataWithServer = async () => {
    // Tempatkan logika pemanggilan API untuk mengirim data lokal ke database/server di sini
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Indikator Status Sinkronisasi */}
      <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border ${
        isOnline ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-amber-950/80 text-amber-300 border-amber-800'
      }`}>
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        {syncStatus}
      </div>

      {/* Tombol Instal PWA (Hanya muncul jika browser mendukung) */}
      {deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-lg transition-all"
        >
          📱 Instal Aplikasi ke HP
        </button>
      )}
    </div>
  );
};
