import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
  FileText,
  Clock,
  Share2,
  RefreshCw,
  Info,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InvoiceData, PayrollData, ScheduleItem } from '../types';
import {
  exportAllDataAsObject,
  restoreBackupData,
  getLastBackupTime,
} from '../utils/storage';
import { formatDateTimeIndo } from '../utils/formatters';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceData[];
  schedules: ScheduleItem[];
  payrolls: PayrollData[];
  defaultCategory?: 'all' | 'invoices' | 'schedules' | 'payrolls';
  onDataRestored?: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  invoices,
  schedules,
  payrolls,
  defaultCategory = 'all',
  onDataRestored,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'info'>('backup');
  const [selectedFormat, setSelectedFormat] = useState<'both' | 'excel' | 'json'>('both');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [copied, setCopied] = useState(false);
  const [parsedRestoreFile, setParsedRestoreFile] = useState<{
    fileName: string;
    data: any;
    invCount: number;
    schCount: number;
    payCount: number;
    backupDate?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when modal opened
  React.useEffect(() => {
    if (isOpen) {
      setParsedRestoreFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lastBackupStr = getLastBackupTime();

  // Helper date stamp for filenames
  const getLocalDateStamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Helper trigger browser file download for text/json
  const triggerDownload = (content: string, filename: string, mimeType: string = 'application/json') => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // ==========================================
  // 1. EXCEL EXPORT FUNCTIONS (.xlsx)
  // ==========================================

  // Export Full Excel Workbook containing all sheets (Invoices, Schedules, Payrolls)
  const handleExportExcelAll = () => {
    const wb = XLSX.utils.book_new();
    const dateStamp = getLocalDateStamp();

    // Sheet 1: Nota Pemesanan
    const invoiceRows = invoices.map((inv, idx) => {
      const gross = inv.items.reduce((sum, item) => sum + (item.quantity * item.price || 0), 0);
      const dp = inv.downPayment || 0;
      const sisa = gross - dp;
      const itemsListStr = inv.items.map((it) => `${it.name} (${it.quantity}x @Rp ${it.price.toLocaleString('id-ID')})`).join('; ');
      const status = inv.paymentStatus === 'LUNAS' || sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';
      return {
        'No': idx + 1,
        'No Nota': inv.invoiceNumber || '-',
        'Nama Tuan Hajat': inv.customerName || '-',
        'Alamat Acara': inv.address || '-',
        'Tanggal Acara': inv.eventDate || '-',
        'Daftar Barang & Rincian Pesanan': itemsListStr || '-',
        'Total Biaya (Rp)': gross,
        'Uang Muka / DP (Rp)': dp,
        'Sisa Pembayaran (Rp)': sisa,
        'Status Pembayaran': status,
        'Waktu Pembuatan': inv.createdAt ? new Date(inv.createdAt).toLocaleString('id-ID') : '-',
      };
    });
    const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows.length > 0 ? invoiceRows : [{ Catatan: 'Belum ada data transaksi nota' }]);
    XLSX.utils.book_append_sheet(wb, wsInvoices, 'Nota Pemesanan');

    // Sheet 2: Jadwal Pasang & Bongkar Tenda
    const scheduleRows = schedules.map((sch, idx) => ({
      'No': idx + 1,
      'Nama Tuan Hajat': sch.customerName || '-',
      'No Telepon / WA': sch.phone || '-',
      'Alamat Acara': sch.address || '-',
      'Estimasi Pasang': sch.setupDate ? new Date(sch.setupDate).toLocaleString('id-ID') : '-',
      'Tanggal Acara': sch.teardownDate ? new Date(sch.teardownDate).toLocaleString('id-ID') : '-',
      'Rincian Pesanan Tenda & Alat': (sch.orderDetails || '-').replace(/\n/g, ' | '),
      'PIC Kru Lapangan': sch.picCrew || '-',
      'Catatan Khusus': sch.notes || '-',
      'Status': sch.status === 'SELESAI' ? 'SELESAI BONGKAR' : 'AKTIF',
    }));
    const wsSchedules = XLSX.utils.json_to_sheet(scheduleRows.length > 0 ? scheduleRows : [{ Catatan: 'Belum ada data jadwal tenda' }]);
    XLSX.utils.book_append_sheet(wb, wsSchedules, 'Jadwal Pasang Bongkar');

    // Sheet 3: Rekap Penggajian Kru
    const payrollRows: any[] = [];
    let pNum = 1;
    payrolls.forEach((pay) => {
      pay.rows.forEach((row) => {
        const gross = pay.columns.filter((c) => !c.name.toLowerCase().includes('kasbon') && !c.name.toLowerCase().includes('potongan')).reduce((s, c) => s + (row.amounts[c.id] || 0), 0);
        const kasbon = pay.columns.filter((c) => c.name.toLowerCase().includes('kasbon') || c.name.toLowerCase().includes('potongan')).reduce((s, c) => s + (row.amounts[c.id] || 0), 0);
        const net = gross - kasbon;
        payrollRows.push({
          'No': pNum++,
          'No Rekap': pay.payrollNumber || '-',
          'Judul Tabel': pay.title || 'Rekap Gaji Kru',
          'Tanggal': pay.date || '-',
          'Nama Kru / Pekerja': row.employeeName || '-',
          'Total Upah Kotor (Rp)': gross,
          'Kasbon / Potongan (Rp)': kasbon,
          'Gaji Bersih Diterima (Rp)': net,
        });
      });
    });
    const wsPayrolls = XLSX.utils.json_to_sheet(payrollRows.length > 0 ? payrollRows : [{ Catatan: 'Belum ada data rekap gaji kru' }]);
    XLSX.utils.book_append_sheet(wb, wsPayrolls, 'Rekap Penggajian Kru');

    const filename = `Data_Lengkap_Gapura_Enterprise_${dateStamp}.xlsx`;
    XLSX.writeFile(wb, filename);
    onShowToast(`File Excel (.xlsx) "${filename}" berhasil diunduh!`, 'success');
  };

  // Export Excel (.xlsx) for Specific Category
  const handleExportExcelCategory = (cat: 'invoices' | 'schedules' | 'payrolls') => {
    const wb = XLSX.utils.book_new();
    const dateStamp = getLocalDateStamp();
    let filename = '';

    if (cat === 'invoices') {
      const rows = invoices.map((inv, idx) => {
        const gross = inv.items.reduce((sum, item) => sum + (item.quantity * item.price || 0), 0);
        const dp = inv.downPayment || 0;
        const sisa = gross - dp;
        const itemsListStr = inv.items.map((it) => `${it.name} (${it.quantity}x @Rp ${it.price.toLocaleString('id-ID')})`).join('; ');
        const status = inv.paymentStatus === 'LUNAS' || sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';
        return {
          'No': idx + 1,
          'No Nota': inv.invoiceNumber || '-',
          'Nama Tuan Hajat': inv.customerName || '-',
          'Alamat Acara': inv.address || '-',
          'Tanggal Acara': inv.eventDate || '-',
          'Daftar Barang & Rincian Pesanan': itemsListStr || '-',
          'Total Biaya (Rp)': gross,
          'Uang Muka / DP (Rp)': dp,
          'Sisa Pembayaran (Rp)': sisa,
          'Status Pembayaran': status,
          'Waktu Pembuatan': inv.createdAt ? new Date(inv.createdAt).toLocaleString('id-ID') : '-',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Catatan: 'Belum ada data nota' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Nota Pemesanan');
      filename = `Data_Nota_Gapura_${dateStamp}.xlsx`;
    } else if (cat === 'schedules') {
      const rows = schedules.map((sch, idx) => ({
        'No': idx + 1,
        'Nama Tuan Hajat': sch.customerName || '-',
        'No Telepon / WA': sch.phone || '-',
        'Alamat Acara': sch.address || '-',
        'Estimasi Pasang': sch.setupDate ? new Date(sch.setupDate).toLocaleString('id-ID') : '-',
        'Tanggal Acara': sch.teardownDate ? new Date(sch.teardownDate).toLocaleString('id-ID') : '-',
        'Rincian Pesanan Tenda & Alat': (sch.orderDetails || '-').replace(/\n/g, ' | '),
        'PIC Kru Lapangan': sch.picCrew || '-',
        'Catatan Khusus': sch.notes || '-',
        'Status': sch.status === 'SELESAI' ? 'SELESAI BONGKAR' : 'AKTIF',
      }));
      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Catatan: 'Belum ada data jadwal tenda' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Tenda');
      filename = `Data_Jadwal_Tenda_Gapura_${dateStamp}.xlsx`;
    } else {
      const payrollRows: any[] = [];
      let pNum = 1;
      payrolls.forEach((pay) => {
        pay.rows.forEach((row) => {
          const gross = pay.columns.filter((c) => !c.name.toLowerCase().includes('kasbon') && !c.name.toLowerCase().includes('potongan')).reduce((s, c) => s + (row.amounts[c.id] || 0), 0);
          const kasbon = pay.columns.filter((c) => c.name.toLowerCase().includes('kasbon') || c.name.toLowerCase().includes('potongan')).reduce((s, c) => s + (row.amounts[c.id] || 0), 0);
          const net = gross - kasbon;
          payrollRows.push({
            'No': pNum++,
            'No Rekap': pay.payrollNumber || '-',
            'Judul Tabel': pay.title || 'Rekap Gaji Kru',
            'Tanggal': pay.date || '-',
            'Nama Kru / Pekerja': row.employeeName || '-',
            'Total Upah Kotor (Rp)': gross,
            'Kasbon / Potongan (Rp)': kasbon,
            'Gaji Bersih Diterima (Rp)': net,
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(payrollRows.length > 0 ? payrollRows : [{ Catatan: 'Belum ada data gaji kru' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Gaji Kru');
      filename = `Data_Gaji_Kru_Gapura_${dateStamp}.xlsx`;
    }

    XLSX.writeFile(wb, filename);
    onShowToast(`File Excel (.xlsx) "${filename}" berhasil diunduh!`, 'success');
  };

  // ==========================================
  // 2. SYSTEM BACKUP FUNCTIONS (.json)
  // ==========================================

  // Export Full System JSON (Lossless with signatures & relations)
  const handleExportJsonAll = () => {
    const payload = exportAllDataAsObject();
    const jsonStr = JSON.stringify(payload, null, 2);
    const filename = `Backup_Sistem_Gapura_Enterprise_${getLocalDateStamp()}.json`;
    triggerDownload(jsonStr, filename);
    onShowToast(`File cadangan sistem (${filename}) berhasil diunduh!`, 'success');
  };

  // Export Specific Category JSON
  const handleExportJsonCategory = (cat: 'invoices' | 'schedules' | 'payrolls') => {
    const dateStamp = getLocalDateStamp();
    let dataToExport: any;
    let filename = '';

    if (cat === 'invoices') {
      dataToExport = {
        version: '2.0',
        appName: 'Gapura Enterprise',
        category: 'invoices',
        backupDate: new Date().toISOString(),
        invoices,
      };
      filename = `Backup_Data_Nota_Gapura_${dateStamp}.json`;
    } else if (cat === 'schedules') {
      dataToExport = {
        version: '2.0',
        appName: 'Gapura Enterprise',
        category: 'schedules',
        backupDate: new Date().toISOString(),
        schedules,
      };
      filename = `Backup_Data_Jadwal_Gapura_${dateStamp}.json`;
    } else {
      dataToExport = {
        version: '2.0',
        appName: 'Gapura Enterprise',
        category: 'payrolls',
        backupDate: new Date().toISOString(),
        payrolls,
      };
      filename = `Backup_Data_Gaji_Gapura_${dateStamp}.json`;
    }

    triggerDownload(JSON.stringify(dataToExport, null, 2), filename);
    onShowToast(`File cadangan ${cat} (${filename}) berhasil diunduh!`, 'success');
  };

  // Copy text payload to clipboard
  const handleCopyClipboard = async () => {
    const payload = exportAllDataAsObject();
    const jsonStr = JSON.stringify(payload);
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      onShowToast('Teks data cadangan berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      onShowToast('Gagal menyalin ke clipboard', 'error');
    }
  };

  // Send Summary via WhatsApp
  const handleShareWhatsApp = () => {
    const activeSched = schedules.filter((s) => s.status === 'AKTIF').length;
    const completedSched = schedules.filter((s) => s.status === 'SELESAI').length;
    const nowStr = new Date().toLocaleString('id-ID');

    const text =
      `*LAPORAN & RINGKASAN DATA GAPURA ENTERPRISE*\n` +
      `=====================================\n` +
      `📅 *Waktu:* ${nowStr}\n\n` +
      `📊 *STATISTIK DATA TERSIMPAN:*\n` +
      `• *Nota Pemesanan:* ${invoices.length} transaksi\n` +
      `• *Jadwal Aktif:* ${activeSched} acara\n` +
      `• *Jadwal Selesai:* ${completedSched} acara\n` +
      `• *Rekap Penggajian:* ${payrolls.length} tabel gaji\n\n` +
      `=====================================\n` +
      `_Status: Data tersimpan aman di database lokal aplikasi._\n` +
      `_Tersedia format Excel (.xlsx) untuk dibuka di komputer/HP dan format Sistem (.json) untuk restore._`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // ==========================================
  // 3. RESTORE HANDLING
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      onShowToast(
        'Perhatian: File .xlsx adalah untuk dibaca di Microsoft Excel / WPS Office. Untuk memulihkan data ke aplikasi secara utuh beserta tanda tangan digital, silakan pilih file cadangan (.json).',
        'info'
      );
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let invCount = 0;
        let schCount = 0;
        let payCount = 0;
        let backupDate = parsed.backupDate;

        if (Array.isArray(parsed.invoices)) invCount = parsed.invoices.length;
        if (Array.isArray(parsed.schedules)) schCount = parsed.schedules.length;
        if (Array.isArray(parsed.payrolls)) payCount = parsed.payrolls.length;

        // Support array-only payloads
        if (Array.isArray(parsed) && parsed.length > 0) {
          if ('invoiceNumber' in parsed[0]) invCount = parsed.length;
          else if ('payrollNumber' in parsed[0]) payCount = parsed.length;
          else if ('setupDate' in parsed[0]) schCount = parsed.length;
        }

        if (invCount === 0 && schCount === 0 && payCount === 0) {
          onShowToast('File cadangan tidak berisi data Nota, Jadwal, atau Gaji yang valid.', 'error');
          setParsedRestoreFile(null);
          return;
        }

        setParsedRestoreFile({
          fileName: file.name,
          data: parsed,
          invCount,
          schCount,
          payCount,
          backupDate,
        });

        onShowToast(`File ${file.name} terbaca! Silakan klik 'Pulihkan Data Sekarang'.`, 'info');
      } catch (err) {
        console.error('Error parsing JSON backup:', err);
        onShowToast('File tidak valid atau bukan JSON cadangan sistem resmi. Pilih file .json hasil cadangan.', 'error');
        setParsedRestoreFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!parsedRestoreFile) {
      onShowToast('Pilih file cadangan terlebih dahulu', 'error');
      return;
    }

    if (restoreMode === 'replace') {
      const confirmText =
        'PERINGATAN: Mode Timpa Semua akan MENGHAPUS data saat ini dan menggantikannya dengan isi file cadangan. Lanjutkan?';
      if (!window.confirm(confirmText)) return;
    }

    const result = restoreBackupData(parsedRestoreFile.data, restoreMode);

    if (result.success) {
      onShowToast(
        `Data berhasil dipulihkan! (${result.counts.invoices} nota, ${result.counts.schedules} jadwal, ${result.counts.payrolls} gaji)`,
        'success'
      );
      if (onDataRestored) onDataRestored();
      setParsedRestoreFile(null);
      onClose();
    } else {
      onShowToast(result.message || 'Gagal memulihkan data', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="backup-data-modal"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#8B0000] via-[#9e1010] to-[#700000] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5 text-[#bef264]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide font-serif text-white">
                  Cadangkan & Pulihkan Data
                </h3>
                <span className="bg-[#bef264] text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Excel & Sistem
                </span>
              </div>
              <p className="text-xs text-[#bef264] font-medium">
                Pilih format <strong>Excel (.xlsx)</strong> untuk dibuka di HP/komputer atau <strong>JSON (.json)</strong> untuk restore.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-[#8B0000] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Download className="w-4 h-4 text-[#8B0000]" />
            <span>1. Cadangkan (Backup)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>2. Pulihkan (Restore)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Info & Bantuan</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-800 text-xs">
          {activeTab === 'backup' ? (
            <div className="space-y-4">
              {/* EXPLANATION BANNER: EXCEL VS JSON */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                  <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Panduan Pilihan Format Cadangan:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                    <strong className="text-emerald-800 flex items-center gap-1 mb-0.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Format Microsoft Excel (.xlsx):
                    </strong>
                    <span className="text-slate-600">
                      Bisa langsung dibuka di HP (WPS Office, Microsoft Excel, Google Sheets) atau laptop. Sangat rapi dalam bentuk tabel untuk dicetak, dibaca, dan dilaporkan.
                    </span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                    <strong className="text-amber-900 flex items-center gap-1 mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      Format Cadangan Sistem (.json):
                    </strong>
                    <span className="text-slate-600">
                      Menyimpan 100% data mentah termasuk tanda tangan digital pelanggan/pemilik. Khusus dipakai pada tab <strong>Pulihkan (Restore)</strong> untuk memindahkan data ke HP baru/browser baru.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: CADANGKAN SEMUA DATA LENGKAP */}
              <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">
                          Cadangkan Semua Data Lengkap
                        </h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                          Tersedia Excel (.xlsx) & Sistem (.json)
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Mencakup <strong>{invoices.length} Nota</strong>,{' '}
                        <strong>{schedules.length} Jadwal Tenda</strong>, dan{' '}
                        <strong>{payrolls.length} Rekap Gaji</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Button 1: Download Excel (.xlsx) */}
                  <button
                    id="btn-download-full-excel"
                    type="button"
                    onClick={handleExportExcelAll}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                    title="Unduh seluruh data dalam format Microsoft Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download File Excel (.xlsx)</span>
                  </button>

                  {/* Button 2: Download System JSON (.json) */}
                  <button
                    id="btn-download-full-json"
                    type="button"
                    onClick={handleExportJsonAll}
                    className="py-3 px-4 bg-[#8B0000] hover:bg-[#700000] active:scale-98 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                    title="Unduh format cadangan sistem resmi untuk pemulihan (restore)"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#bef264]" />
                    <span>Download Cadangan Sistem (.json)</span>
                  </button>
                </div>

                {/* Auxiliary Share Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                    title="Salin isi data teks untuk dicadangkan ke Catatan HP"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{copied ? 'Teks Tersalin!' : 'Salin Teks Cadangan'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-300 transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                    title="Kirim ringkasan data ke chat WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Bagikan Ringkasan ke WA</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: CADANGKAN PER MENU SPESIFIK */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cadangkan Berdasarkan Menu Spesifik:</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Pilih format sesuai kebutuhan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category 1: Nota */}
                  <div className="bg-slate-50 hover:bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-[#8B0000]" />
                        <span className="font-bold text-slate-900 text-xs">Menu Nota Pemesanan</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Total {invoices.length} transaksi nota pemesanan tersimpan
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportExcelCategory('invoices')}
                        className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        title="Unduh Nota dalam format Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Unduh Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportJsonCategory('invoices')}
                        className="w-full py-1.5 px-2 bg-white hover:bg-red-50 text-[#8B0000] border border-red-200 font-bold rounded-lg transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        title="Unduh Nota format sistem (.json) untuk restore"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#8B0000]" />
                        <span>Cadangan Sistem (.json)</span>
                      </button>
                    </div>
                  </div>

                  {/* Category 2: Jadwal */}
                  <div className="bg-slate-50 hover:bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-slate-900 text-xs">Menu Jadwal Tenda</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Total {schedules.length} jadwal pasang & bongkar tenda
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportExcelCategory('schedules')}
                        className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        title="Unduh Jadwal dalam format Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Unduh Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportJsonCategory('schedules')}
                        className="w-full py-1.5 px-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-lg transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        title="Unduh Jadwal format sistem (.json) untuk restore"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cadangan Sistem (.json)</span>
                      </button>
                    </div>
                  </div>

                  {/* Category 3: Gaji */}
                  <div className="bg-slate-50 hover:bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-slate-900 text-xs">Menu Penggajian Kru</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Total {payrolls.length} rekap upah & gaji kru tersimpan
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportExcelCategory('payrolls')}
                        className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        title="Unduh Gaji dalam format Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Unduh Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportJsonCategory('payrolls')}
                        className="w-full py-1.5 px-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        title="Unduh Gaji format sistem (.json) untuk restore"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                        <span>Cadangan Sistem (.json)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-start gap-2 text-blue-900">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span>Cadangan terakhir: </span>
                  <strong>{lastBackupStr ? formatDateTimeIndo(lastBackupStr) : 'Belum pernah dicadangkan'}</strong>.
                  <span className="block text-[11px] text-blue-700 mt-0.5">
                    Gunakan file <strong>.xlsx</strong> untuk dibaca di Excel/WPS HP, dan simpan file <strong>.json</strong> sebagai arsip aman jika Anda ingin memulihkan data saat ganti perangkat.
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'restore' ? (
            <div className="space-y-4">
              {/* FILE UPLOAD BOX */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl text-center cursor-pointer transition space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {parsedRestoreFile ? parsedRestoreFile.fileName : 'Pilih File Cadangan Sistem (.json)'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Klik di sini untuk memilih file backup cadangan resmi Gapura Enterprise (.json)
                  </p>
                  <span className="inline-block mt-1 bg-amber-100 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-200">
                    Catatan: Pemulihan utuh sistem menggunakan file .json
                  </span>
                </div>
              </div>

              {/* DETECTED PAYLOAD SUMMARY */}
              {parsedRestoreFile && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      File Cadangan Terverifikasi:
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                      {parsedRestoreFile.fileName}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Nota</span>
                      <strong className="text-sm font-bold text-slate-900">
                        {parsedRestoreFile.invCount}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Jadwal</span>
                      <strong className="text-sm font-bold text-slate-900">
                        {parsedRestoreFile.schCount}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Gaji</span>
                      <strong className="text-sm font-bold text-slate-900">
                        {parsedRestoreFile.payCount}
                      </strong>
                    </div>
                  </div>

                  {/* Mode options */}
                  <div className="pt-2 border-t border-emerald-200 space-y-2">
                    <span className="font-bold text-slate-800 text-xs block">
                      Pilih Metode Pemulihan:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition ${
                          restoreMode === 'merge'
                            ? 'bg-white border-emerald-500 ring-2 ring-emerald-200'
                            : 'bg-white/60 border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restore-mode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <strong className="text-slate-900 block text-xs">
                            Gabungkan Data (Merge)
                          </strong>
                          <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                            Menambahkan data tanpa menghapus data yang sudah ada (aman).
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition ${
                          restoreMode === 'replace'
                            ? 'bg-white border-rose-500 ring-2 ring-rose-200'
                            : 'bg-white/60 border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restore-mode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-rose-600"
                        />
                        <div>
                          <strong className="text-rose-900 block text-xs">
                            Timpa Semua (Replace)
                          </strong>
                          <span className="text-[10px] text-rose-700 leading-tight block mt-0.5">
                            Mengganti seluruh data lokal dengan data dari file cadangan.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Pulihkan Data Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Nota</span>
                  <span className="text-xl font-bold text-slate-900">{invoices.length}</span>
                  <span className="text-[10px] text-slate-400 block">Transaksi</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal Aktif</span>
                  <span className="text-xl font-bold text-amber-700">
                    {schedules.filter((s) => s.status === 'AKTIF').length}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Pesta</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal Selesai</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {schedules.filter((s) => s.status === 'SELESAI').length}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Dibongkar</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Rekap Gaji</span>
                  <span className="text-xl font-bold text-blue-700">{payrolls.length}</span>
                  <span className="text-[10px] text-slate-400 block">Tabel</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Mengapa Ada Dua Format (.xlsx dan .json)?
                </h4>
                <div className="space-y-2 text-slate-600 leading-relaxed text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <strong className="text-emerald-800 block mb-0.5">1. Microsoft Excel (.xlsx)</strong>
                    Format spreadsheet standar dunia yang dapat langsung Anda buka di aplikasi Microsoft Excel di komputer atau WPS Office / Google Sheets di HP Android dan iPhone. Anda bisa melihat baris data rapi, menghitung angka, atau mencetaknya.
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <strong className="text-amber-900 block mb-0.5">2. Cadangan Sistem (.json)</strong>
                    Format kode sistem internal yang menyimpan struktur komplit database aplikasi (termasuk tanda tangan digital pelanggan / pemilik). Format ini tidak ditujukan untuk dibaca biasa, melainkan untuk dipulihkan kembali (Restore) ke aplikasi secara otomatis jika Anda berpindah HP atau browser.
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  💡 <strong>Saran Terbaik:</strong> Unduh file <strong>Excel (.xlsx)</strong> untuk arsip dan pembukuan Anda, dan unduh file <strong>.json</strong> untuk disimpan di Google Drive/WhatsApp sebagai cadangan pemulihan sistem jika ganti perangkat.
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>Mode Offline + Sinkronisasi Cloud Google</span>
                  </div>
                  <p>
                    Aplikasi dapat bekerja offline di lapangan. Jika Anda masuk dengan akun Google di bagian atas aplikasi, seluruh Nota, Jadwal, dan Gaji tersimpan otomatis di Cloud Firebase sehingga tetap aman meski riwayat Safari iPhone atau browser dihapus.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {lastBackupStr ? (
              <span>Terakhir backup: {formatDateTimeIndo(lastBackupStr)}</span>
            ) : (
              <span className="text-amber-700 font-medium">Belum ada file cadangan</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
