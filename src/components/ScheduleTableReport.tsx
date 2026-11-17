import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileDown,
  Search,
  Calendar,
  Clock,
  HardHat,
  Phone,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Share2,
  CalendarCheck,
  AlertCircle,
  FileText,
  Plus,
  Eye,
  Database,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScheduleItem, InvoiceData } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';
import { ScheduleFormModal } from './ScheduleFormModal';

interface ScheduleTableReportProps {
  schedules: ScheduleItem[];
  title?: string;
  isHistory?: boolean;
  availableInvoices?: InvoiceData[];
  onAddNewSchedule?: () => void;
  onSaveSchedule?: (schedule: ScheduleItem) => void;
  onViewPreview?: (schedule: ScheduleItem) => void;
  onEdit?: (schedule: ScheduleItem) => void;
  onDelete: (id: string) => void;
  onShare: (schedule: ScheduleItem) => void;
  onToggleStatus: (id: string, status: 'AKTIF' | 'SELESAI') => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBackup?: () => void;
}

export const ScheduleTableReport: React.FC<ScheduleTableReportProps> = ({
  schedules,
  title = 'Laporan Tabel Jadwal Pemasangan & Bongkar Tenda',
  isHistory = false,
  availableInvoices = [],
  onAddNewSchedule,
  onSaveSchedule,
  onViewPreview,
  onEdit,
  onDelete,
  onShare,
  onToggleStatus,
  onShowToast,
  onOpenBackup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'tomorrow' | 'ongoing'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleItem | null>(null);

  // Now helpers
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Filtered schedules
  const filteredList = useMemo(() => {
    return schedules.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = (item.customerName || '').toLowerCase().includes(query);
        const matchAddress = (item.address || '').toLowerCase().includes(query);
        const matchPhone = (item.phone || '').includes(query);
        const matchOrder = (item.orderDetails || '').toLowerCase().includes(query);
        const matchPic = (item.picCrew || '').toLowerCase().includes(query);
        if (!matchName && !matchAddress && !matchPhone && !matchOrder && !matchPic) {
          return false;
        }
      }

      // Filter tabs
      if (!isHistory) {
        if (filterType === 'today') {
          return item.setupDate.slice(0, 10) === todayStr;
        }
        if (filterType === 'tomorrow') {
          return item.setupDate.slice(0, 10) === tomorrowStr;
        }
        if (filterType === 'ongoing') {
          const setup = new Date(item.setupDate);
          const teardown = new Date(item.teardownDate);
          return now >= setup && now <= teardown;
        }
      }

      return true;
    });
  }, [schedules, searchTerm, filterType, isHistory, todayStr, tomorrowStr]);

  const cleanPhoneForWa = (p: string) => {
    let clean = p.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  const getStatusBadge = (item: ScheduleItem) => {
    if (item.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Selesai Bongkar
        </span>
      );
    }

    const setup = new Date(item.setupDate);
    const teardown = new Date(item.teardownDate);
    const setupStr = item.setupDate.slice(0, 10);

    if (setupStr === todayStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
          <Clock className="w-3 h-3 text-rose-600" />
          PASANG HARI INI
        </span>
      );
    }

    if (setupStr === tomorrowStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Calendar className="w-3 h-3 text-amber-600" />
          Pasang Besok
        </span>
      );
    }

    if (now >= setup && now <= teardown) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <HardHat className="w-3 h-3 text-blue-600" />
          Sedang Terpasang
        </span>
      );
    }

    if (now > teardown) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
          <AlertCircle className="w-3 h-3 text-orange-600" />
          Lewat Waktu Bongkar
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CalendarCheck className="w-3 h-3 text-emerald-600" />
        Terjadwal
      </span>
    );
  };

  // Export to CSV (Excel format)
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      onShowToast('Tidak ada data jadwal untuk diekspor', 'error');
      return;
    }

    const headers = [
      'No',
      'Nama Tuan Hajat',
      'No HP',
      'Alamat Acara',
      'Estimasi Pasang',
      'Tanggal Acara',
      'Rincian Pesanan',
      'PIC Kru Lapangan',
      'Catatan Khusus',
      'Status',
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${(item.customerName || '').replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      `"${(item.address || '').replace(/"/g, '""')}"`,
      `"${formatDateTimeIndo(item.setupDate)}"`,
      `"${formatDateTimeIndo(item.teardownDate)}"`,
      `"${(item.orderDetails || '').replace(/"/g, '""').replace(/\n/g, ' | ')}"`,
      `"${(item.picCrew || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      item.status === 'SELESAI' ? 'SELESAI BONGKAR' : 'AKTIF',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Laporan_Jadwal_Gapura_Enterprise_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('File Excel/CSV berhasil diunduh!', 'success');
  };

  // Export to PDF Report (Landscape A4 Table)
  const handleExportPDF = () => {
    if (filteredList.length === 0) {
      onShowToast('Tidak ada data jadwal untuk diekspor ke PDF', 'error');
      return;
    }

    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner (Maroon #8B0000)
      doc.setFillColor(139, 0, 0);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('GAPURA ENTERPRISE', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(190, 242, 100); // Lime #bef264
      doc.text('WEDDING & EVENT SOLUTION • WA/TELP: 0821-1887-0862', 14, 17);

      // Report Title & Date
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title.toUpperCase(), 14, 33);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const printDateStr = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date());
      doc.text(`Waktu Cetak: ${printDateStr} | Total Data: ${filteredList.length} Agenda`, 14, 38);

      // Build Table Data
      const tableData = filteredList.map((item, idx) => [
        (idx + 1).toString(),
        `${item.customerName || '-'}\nTelp: ${item.phone || '-'}`,
        item.address || '-',
        formatDateTimeIndo(item.setupDate),
        formatDateTimeIndo(item.teardownDate),
        (item.orderDetails || '-').replace(/\n\n+/g, '\n'),
        `${item.picCrew || 'Kru Lapangan'}${item.notes ? `\nKet: ${item.notes}` : ''}`,
        item.status === 'SELESAI' ? 'SELESAI BONGKAR' : 'AKTIF',
      ]);

      autoTable(doc, {
        startY: 42,
        head: [
          [
            'No',
            'Tuan Hajat & Kontak',
            'Alamat Acara',
            'Estimasi Pasang',
            'Tanggal Acara',
            'Rincian Pesanan Tenda & Alat',
            'PIC Kru / Catatan',
            'Status',
          ],
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [139, 0, 0],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          valign: 'top',
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 32 },
          4: { cellWidth: 32 },
          5: { cellWidth: 62 },
          6: { cellWidth: 40 },
          7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14, bottom: 20 },
        didDrawPage: (data: any) => {
          // Footer
          const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
          const pageCurrent = data.pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Gapura Enterprise • Halaman ${pageCurrent} dari ${pageCount}`,
            14,
            202
          );
          doc.text(
            `Dokumen ini resmi dihasilkan dari Aplikasi Gapura Enterprise`,
            297 - 14,
            202,
            { align: 'right' }
          );
        },
      });

      doc.save(`Laporan_Tabel_Jadwal_Gapura_${new Date().toISOString().slice(0, 10)}.pdf`);
      onShowToast('PDF Laporan Tabel Jadwal berhasil diunduh!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal membuat PDF tabel laporan', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header Bar with Action & Filters */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#8B0000]/10 text-[#8B0000]">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Format tabel rekap lengkap untuk briefing kru lapangan, arsip cetak, dan pembagian tugas.
          </p>
        </div>

        {/* Action Export & Add Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isHistory && (
            <button
              id="btn-table-add-data"
              type="button"
              onClick={() => {
                setEditingScheduleItem(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#8B0000] hover:bg-[#700000] active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Tambah data agenda baru langsung ke tabel laporan"
            >
              <Plus className="w-4 h-4 text-[#bef264]" />
              <span>+ Tambah Data Jadwal</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            title="Cetak langsung lewat printer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak / Print</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Download dokumen tabel format PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-600" />
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            title="Download file Excel/CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Excel (CSV)</span>
          </button>

          {onOpenBackup && (
            <button
              id="btn-backup-schedule-table"
              type="button"
              onClick={onOpenBackup}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Cadangkan dan pulihkan data jadwal tenda"
            >
              <Database className="w-3.5 h-3.5 text-amber-700" />
              <span>Backup Data Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama tuan hajat, alamat, no hp, barang pesanan, atau kru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-slate-50 focus:bg-white"
          />
        </div>

        {!isHistory && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({schedules.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'today'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Pasang Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setFilterType('tomorrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'tomorrow'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Pasang Besok
            </button>

            <button
              type="button"
              onClick={() => setFilterType('ongoing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'ongoing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Sedang Terpasang
            </button>
          </div>
        )}
      </div>

      {/* Main Table Responsive Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#8B0000] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3 min-w-[170px]">Tuan Hajat & Kontak</th>
                <th className="py-3 px-3 min-w-[160px]">Alamat Acara</th>
                <th className="py-3 px-3 min-w-[140px]">Estimasi Pasang</th>
                <th className="py-3 px-3 min-w-[140px]">Tanggal Acara</th>
                <th className="py-3 px-3 min-w-[200px]">Rincian Pesanan Tenda & Alat</th>
                <th className="py-3 px-3 min-w-[130px]">PIC & Catatan</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Status</th>
                <th className="py-3 px-3 text-center min-w-[120px] print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length > 0 ? (
                filteredList.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-amber-50/40 transition-colors group"
                  >
                    {/* No */}
                    <td className="py-3 px-3 text-center font-bold text-slate-400 group-hover:text-slate-800">
                      {index + 1}
                    </td>

                    {/* Tuan Hajat & Kontak */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.customerName || '-'}
                      </div>
                      {item.phone && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <a
                            href={`https://wa.me/${cleanPhoneForWa(item.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition"
                            title="Buka Chat WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{item.phone}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        </div>
                      )}
                    </td>

                    {/* Alamat Acara */}
                    <td className="py-3 px-3">
                      <div className="flex items-start gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2" title={item.address}>
                          {item.address || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Waktu Pasang */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{formatDateTimeIndo(item.setupDate)}</span>
                      </div>
                    </td>

                    {/* Waktu Bongkar */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <HardHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{formatDateTimeIndo(item.teardownDate)}</span>
                      </div>
                    </td>

                    {/* Rincian Pesanan */}
                    <td className="py-3 px-3">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 max-h-24 overflow-y-auto text-[11px] text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                        {item.orderDetails || '-'}
                      </div>
                    </td>

                    {/* PIC & Catatan */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">
                        {item.picCrew || <span className="text-slate-400 italic">Belum ada PIC</span>}
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-amber-800 mt-1 italic line-clamp-2" title={item.notes}>
                          ⚠️ {item.notes}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(item)}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {onViewPreview && (
                          <button
                            type="button"
                            onClick={() => onViewPreview(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-800 bg-amber-50 hover:bg-[#8B0000] hover:text-white rounded-lg transition border border-amber-300 hover:border-[#8B0000] shadow-2xs cursor-pointer group"
                            title="Buka Lembar Kerja di Live Preview Kertas (Real-Time)"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#8B0000] group-hover:text-white" />
                            <span className="hidden sm:inline">Kertas</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onShare(item)}
                          className="p-1.5 text-slate-600 hover:text-[#8B0000] hover:bg-slate-100 rounded-lg transition"
                          title="Bagikan via Foto / PDF / WhatsApp"
                        >
                          <Share2 className="w-4 h-4 text-emerald-600" />
                        </button>

                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Data Jadwal"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(
                              item.id,
                              item.status === 'AKTIF' ? 'SELESAI' : 'AKTIF'
                            )
                          }
                          className={`p-1.5 rounded-lg transition ${
                            item.status === 'AKTIF'
                              ? 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                          title={
                            item.status === 'AKTIF'
                              ? 'Tandai Selesai Bongkar'
                              : 'Kembalikan ke Jadwal Aktif'
                          }
                        >
                          {item.status === 'AKTIF' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada jadwal ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchTerm ? 'Coba ubah kata kunci pencarian Anda' : 'Belum ada agenda pasang/bongkar terdaftar'}
                    </p>
                    {!isHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingScheduleItem(null);
                          setIsAddModalOpen(true);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-xl transition shadow"
                      >
                        <Plus className="w-4 h-4 text-[#bef264]" />
                        <span>+ Tambah Data ke Tabel Laporan</span>
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Strip */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <strong>{filteredList.length}</strong> dari <strong>{schedules.length}</strong> jadwal
            </span>
            {searchTerm && (
              <span className="text-[11px] text-[#8B0000] font-semibold">
                (Hasil pencarian: "{searchTerm}")
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 italic">
            * Klik nomor telepon untuk langsung chat WhatsApp ke Tuan Hajat
          </div>
        </div>
      </div>

      {/* PRINT-ONLY DEDICATED TEMPLATE */}
      <div id="schedule-table-report-print" className="hidden print:block p-4 bg-white text-black">
        {/* Kop Surat Gapura */}
        <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider font-serif">
              GAPURA ENTERPRISE
            </h1>
            <p className="text-xs font-semibold text-slate-800">
              WEDDING & EVENT SOLUTION • SEWA TENDA & ALAT PESTA
            </p>
            <p className="text-[11px] text-slate-600">
              WhatsApp / Telp: 0821-1887-0862 • Instagram: @gapuraenterprise
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold uppercase">{title}</h2>
            <p className="text-[11px] text-slate-500">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </p>
          </div>
        </div>

        {/* Printable Table */}
        <table className="w-full text-[10px] border border-black border-collapse">
          <thead>
            <tr className="bg-slate-200 text-black font-bold">
              <th className="border border-black p-1.5 text-center w-8">No</th>
              <th className="border border-black p-1.5">Tuan Hajat & Kontak</th>
              <th className="border border-black p-1.5">Alamat Acara</th>
              <th className="border border-black p-1.5">Estimasi Pasang</th>
              <th className="border border-black p-1.5">Tanggal Acara</th>
              <th className="border border-black p-1.5">Rincian Pesanan</th>
              <th className="border border-black p-1.5">PIC / Catatan</th>
              <th className="border border-black p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                <td className="border border-black p-1 font-bold">
                  {item.customerName}
                  <br />
                  <span className="font-normal">{item.phone}</span>
                </td>
                <td className="border border-black p-1">{item.address}</td>
                <td className="border border-black p-1">{formatDateTimeIndo(item.setupDate)}</td>
                <td className="border border-black p-1">{formatDateTimeIndo(item.teardownDate)}</td>
                <td className="border border-black p-1 whitespace-pre-line">{item.orderDetails}</td>
                <td className="border border-black p-1">
                  {item.picCrew || '-'}
                  {item.notes ? ` (Ket: ${item.notes})` : ''}
                </td>
                <td className="border border-black p-1 text-center font-bold">
                  {item.status === 'SELESAI' ? 'SELESAI' : 'AKTIF'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures for Briefing / Field Crew */}
        <div className="mt-8 flex justify-between text-xs text-center">
          <div>
            <p className="font-medium text-slate-700">Koordinator Lapangan / Kru</p>
            <div className="h-14"></div>
            <p className="border-t border-black font-bold px-4">( .............................. )</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Pengelola Gapura Enterprise</p>
            <div className="h-14"></div>
            <p className="border-t border-black font-bold px-4">( Hendra / Admin )</p>
          </div>
        </div>
      </div>

      {/* Form Modal for Adding Data to Report Table & Real-Time Sync */}
      {isAddModalOpen && (
        <ScheduleFormModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingScheduleItem(null);
          }}
          onSave={(newSched) => {
            if (onSaveSchedule) {
              onSaveSchedule(newSched);
            }
          }}
          onSaveAndPreview={(newSched) => {
            if (onSaveSchedule) {
              onSaveSchedule(newSched);
            }
            if (onViewPreview) {
              onViewPreview(newSched);
            }
          }}
          initialData={editingScheduleItem}
          availableInvoices={availableInvoices || []}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
