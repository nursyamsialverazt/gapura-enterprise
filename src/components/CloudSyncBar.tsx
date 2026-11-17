import React from 'react';
import { User } from 'firebase/auth';
import { Cloud, CloudOff, LogIn, LogOut, Loader2, ShieldCheck } from 'lucide-react';

interface CloudSyncBarProps {
  user: User | null;
  isAuthReady: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const CloudSyncBar: React.FC<CloudSyncBarProps> = ({
  user,
  isAuthReady,
  isSyncing,
  isOnline,
  onSignIn,
  onSignOut,
}) => {
  if (!isAuthReady) {
    return null;
  }

  if (user) {
    return (
      <div className="mb-3 bg-emerald-50/90 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          {isSyncing ? (
            <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
          ) : isOnline ? (
            <Cloud className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <CloudOff className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-emerald-950 truncate">
                {isSyncing
                  ? 'Menyinkronkan ke Cloud...'
                  : isOnline
                  ? 'Sinkronisasi Cloud Aktif'
                  : 'Mode Offline (Sinkron Otomatis Saat Online)'}
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 truncate max-w-[180px] sm:max-w-none">
                {user.email || user.displayName}
              </span>
            </div>
            <p className="text-[10px] text-emerald-800 hidden sm:block">
              Data Nota, Jadwal & Gaji tetap aman di akun Google meski riwayat Safari/browser dihapus.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer"
          title="Keluar dari akun Google Cloud"
        >
          <LogOut className="w-3 h-3" />
          <span>Keluar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 bg-amber-50/90 border border-amber-300 rounded-xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
      <div className="flex items-start sm:items-center gap-2 min-w-0">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
        <div className="min-w-0">
          <span className="font-bold text-amber-950 block">
            Simpan Data ke Cloud (Anti-Hilang Saat Hapus Data Safari)
          </span>
          <span className="text-[11px] text-amber-800 block leading-snug">
            Masuk dengan Google agar data Nota, Jadwal & Gaji aman tersimpan di cloud dan tetap bisa dipakai offline.
          </span>
        </div>
      </div>

      <button
        id="btn-google-cloud-signin"
        type="button"
        onClick={onSignIn}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0 cursor-pointer active:scale-95"
      >
        <LogIn className="w-3.5 h-3.5 text-[#bef264]" />
        <span>Masuk dengan Google</span>
      </button>
    </div>
  );
};
