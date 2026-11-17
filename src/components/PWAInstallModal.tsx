import React from 'react';
import {
  X,
  Download,
  Smartphone,
  WifiOff,
  CheckCircle2,
  Share,
  PlusSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { GapuraLogo } from './Logo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        onShowToast('Aplikasi berhasil dipasang di perangkat Anda!', 'success');
        onClose();
      }
    } else {
      onShowToast('Gunakan menu browser (titik 3) -> "Tambahkan ke Layar Utama" / "Install"', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#8B0000] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-xl shadow-xs shrink-0">
              <GapuraLogo size="sm" variant="icon" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight font-serif">
                Install Aplikasi Gapura
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                Bekerja 100% Offline Tanpa Kuota Internet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Offline & PWA info */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
              <WifiOff className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Dapat Digunakan Sepenuhnya Offline</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Seluruh nota, jadwal kerja kru, dan gaji tetap bisa dibuat saat offline. Dengan login Google Cloud Sync, data Anda juga aman di cloud dan tidak hilang meski riwayat Safari/browser dihapus.
            </p>
          </div>

          {/* Keuntungan Install */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Fitur Aplikasi Terpasang:
            </span>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-700">
              <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#8B0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Layar Penuh (Standalone)</strong>: Bekerja seperti APK Android asli tanpa bilah browser.
                </span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#8B0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Akses Cepat 1 Ketukan</strong>: Ikon aplikasi Gapura Enterprise langsung muncul di beranda HP Anda.
                </span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#8B0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Tanpa Beban Kuota</strong>: Tidak perlu download ulang aset setiap kali membuka aplikasi.
                </span>
              </div>
            </div>
          </div>

          {/* Panduan Instalasi */}
          {isInstalled ? (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-1">
              <span className="text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Aplikasi Sudah Terpasang di Perangkat Ini
              </span>
              <p className="text-xs text-blue-700">
                Anda dapat mengaksesnya langsung dari ikon layar beranda HP / Laptop Anda.
              </p>
            </div>
          ) : isIOS ? (
            /* Panduan khusus iOS Safari */
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-amber-900 block">
                Cara Pasang di iPhone / iPad (Safari):
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-amber-900">
                <li className="flex items-center gap-1.5">
                  <span>1. Ketuk tombol <strong>Bagikan / Share</strong></span>
                  <Share className="w-3.5 h-3.5 text-amber-800 inline" />
                  <span>di bawah browser Safari.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong></span>
                  <PlusSquare className="w-3.5 h-3.5 text-amber-800 inline" />
                </li>
                <li>3. Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
            </div>
          ) : isInstallable ? (
            /* Tombol Install 1-Klik Langsung (Android / Chrome) */
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 bg-[#8B0000] hover:bg-[#700000] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-98"
            >
              <Download className="w-4 h-4 text-[#bef264]" />
              <span>Install Aplikasi Sekarang (1-Klik)</span>
            </button>
          ) : (
            /* Panduan Android Chrome umum */
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#8B0000]" />
                Cara Pasang di HP Android (Chrome):
              </span>
              <p className="text-slate-700 leading-relaxed">
                1. Ketuk ikon <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Chrome.<br />
                2. Pilih <strong>"Install aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.<br />
                3. Ketuk <strong>Install</strong>. Ikon aplikasi akan langsung terpasang di HP Anda.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
