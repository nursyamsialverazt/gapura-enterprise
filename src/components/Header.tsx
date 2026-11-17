import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  History,
  Wifi,
  WifiOff,
  FileSpreadsheet,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Database,
  Smartphone,
  Download,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { GapuraLogo } from './Logo';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onReset: () => void;
  historyCount: number;
  payrollHistoryCount?: number;
  activeScheduleCount?: number;
  scheduleHistoryCount?: number;
  onOpenBackup?: () => void;
  onOpenInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  historyCount,
  payrollHistoryCount = 0,
  activeScheduleCount = 0,
  scheduleHistoryCount = 0,
  onOpenBackup,
  onOpenInstall,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    /* Red header completely hidden on mobile (hidden lg:block). On desktop, clean modern white navbar without red background */
    <header className="hidden lg:block bg-white text-slate-800 border-b border-slate-200 shadow-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              <GapuraLogo size="sm" variant="icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider uppercase leading-none font-serif text-slate-900">
                  GAPURA ENTERPRISE
                </h1>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  WEDDING & EVENT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">
                wedding dream solution • 0821-1887-0862
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs + Status */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
              <button
                id="tab-btn-create-desktop"
                type="button"
                onClick={() => onTabChange('create')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Buat Nota</span>
              </button>

              <button
                id="tab-btn-schedule-desktop"
                type="button"
                onClick={() => onTabChange('schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal ({activeScheduleCount})</span>
              </button>

              <button
                id="tab-btn-schedule-history-desktop"
                type="button"
                onClick={() => onTabChange('schedule-history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'schedule-history'
                    ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Jadwal per Bulan</span>
              </button>

              <button
                id="tab-btn-payroll-desktop"
                type="button"
                onClick={() => onTabChange('payroll')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'payroll'
                    ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Penggajian</span>
              </button>

              <button
                id="tab-btn-payroll-history-desktop"
                type="button"
                onClick={() => onTabChange('payroll-history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'payroll-history'
                    ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riw. Gaji ({payrollHistoryCount})</span>
              </button>

              <button
                id="tab-btn-history-desktop"
                type="button"
                onClick={() => onTabChange('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riw. Nota ({historyCount})</span>
              </button>

              {onOpenBackup && (
                <button
                  id="tab-btn-backup-desktop"
                  type="button"
                  onClick={onOpenBackup}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer"
                  title="Cadangkan & Pulihkan Seluruh Data Aplikasi"
                >
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  <span>Backup Data</span>
                </button>
              )}

              {onOpenInstall && (
                <button
                  id="tab-btn-install-desktop"
                  type="button"
                  onClick={onOpenInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#8B0000] hover:bg-[#700000] text-white shadow-xs transition cursor-pointer"
                  title="Pasang aplikasi ke laptop / HP Android (PWA/APK)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Install App (APK)</span>
                </button>
              )}
            </div>

            {/* Offline Status Badge (Clickable for offline & install details) */}
            <button
              type="button"
              onClick={onOpenInstall}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition border cursor-pointer hover:opacity-90 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
              }`}
              title={isOnline ? 'Online (Klik untuk info offline & install)' : 'Mode Offline Aktif (Klik untuk info)'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
