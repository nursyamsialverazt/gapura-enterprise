import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Share2,
  CheckCircle2,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  HardHat,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';

interface ScheduleCardProps {
  schedule: ScheduleItem;
  onEdit: (schedule: ScheduleItem) => void;
  onDelete: (id: string) => void;
  onShare: (schedule: ScheduleItem) => void;
  onToggleStatus: (id: string, newStatus: 'AKTIF' | 'SELESAI') => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onShare,
  onToggleStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute countdown / urgency badge
  const getTimingBadge = () => {
    const now = new Date().getTime();
    const setupTime = new Date(schedule.setupDate).getTime();
    const teardownTime = new Date(schedule.teardownDate).getTime();

    if (schedule.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Selesai / Dibongkar
        </span>
      );
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffSetup = setupTime - now;
    const diffTeardown = teardownTime - now;

    if (now >= setupTime && now <= teardownTime) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          Sedang Berlangsung (Menunggu Bongkar)
        </span>
      );
    }

    if (diffSetup > 0 && diffSetup <= oneDayMs) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          Pasang Hari Ini / Kurang 24 Jam
        </span>
      );
    }

    if (diffSetup > oneDayMs && diffSetup <= 2 * oneDayMs) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          Pasang Besok
        </span>
      );
    }

    if (diffTeardown > 0 && diffTeardown <= oneDayMs && now > setupTime) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500 text-white shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          Jadwal Bongkar Hari Ini!
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
        <Calendar className="w-3.5 h-3.5 text-blue-600" />
        Jadwal Aktif
      </span>
    );
  };

  const getCleanPhone = (p: string) => {
    let clean = p.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
  };

  const cleanPhone = getCleanPhone(schedule.phone);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          {getTimingBadge()}
          {schedule.sourceInvoiceNumber && (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Nota: {schedule.sourceInvoiceNumber}
            </span>
          )}
        </div>

        {/* Customer Header */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
          {schedule.customerName || 'Tanpa Nama'}
        </h3>

        {/* Contact info */}
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#8B0000] shrink-0" />
            <span className="font-mono font-medium">{schedule.phone || '-'}</span>
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-0.5 text-[11px] ml-1"
              >
                Chat WA <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#8B0000] shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{schedule.address || '-'}</span>
          </div>
        </div>
      </div>

      {/* Date & Time Highlights */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-b border-slate-100 grid grid-cols-2 gap-3 text-xs">
        <div className="border-r border-slate-200 pr-2">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            Estimasi Pasang:
          </span>
          <span className="font-semibold text-slate-800 leading-snug">
            {formatDateTimeIndo(schedule.setupDate)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-amber-800 block">
            Tanggal Acara:
          </span>
          <span className="font-semibold text-slate-800 leading-snug">
            {formatDateTimeIndo(schedule.teardownDate)}
          </span>
        </div>
      </div>

      {/* PIC / Field Note Snippet */}
      {schedule.picCrew && (
        <div className="px-4 sm:px-5 py-2 bg-amber-50/40 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-700">
          <HardHat className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="truncate">
            <strong className="text-amber-900 font-medium">PIC:</strong> {schedule.picCrew}
          </span>
        </div>
      )}

      {/* Collapsible Order Details */}
      <div className="px-4 sm:px-5 py-2.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <span>Rincian Pesanan Peralatan</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2.5 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-line border border-slate-200 leading-relaxed animate-in fade-in duration-150">
            {schedule.orderDetails || 'Tidak ada rincian'}
            {schedule.notes && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] font-sans text-amber-900">
                <strong>Catatan Khusus:</strong> {schedule.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3 sm:px-5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {schedule.status === 'AKTIF' ? (
            <button
              type="button"
              onClick={() => onToggleStatus(schedule.id, 'SELESAI')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Tandai sudah selesai bongkar dan pindahkan ke Riwayat Jadwal"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#bef264]" />
              <span>Selesai Bongkar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStatus(schedule.id, 'AKTIF')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Kembalikan ke daftar jadwal aktif"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Jadikan Aktif</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onShare(schedule)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white rounded-xl text-xs font-bold transition shadow-sm"
            title="Bagikan foto kartu jadwal atau dokumen PDF"
          >
            <Share2 className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Bagikan</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(schedule)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Edit Jadwal"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(schedule.id)}
            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
            title="Hapus Jadwal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
