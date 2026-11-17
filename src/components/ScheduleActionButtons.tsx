import React, { useState } from 'react';
import {
  Save,
  Download,
  FileText,
  Printer,
  Share2,
  RefreshCw,
  Loader2,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ScheduleItem } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';

interface ScheduleActionButtonsProps {
  schedule: ScheduleItem;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onSaveSchedule: () => void;
  onClearForm: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ScheduleActionButtons: React.FC<ScheduleActionButtonsProps> = ({
  schedule,
  previewRef,
  onSaveSchedule,
  onClearForm,
  onShowToast,
}) => {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPngLoading, setIsPngLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger file download helper
  const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
  };

  // 1. Download Photo PNG (Border adjusts to content, crisp high-res)
  const handleDownloadPng = async () => {
    if (!previewRef.current) return;
    setIsPngLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 60));

      const targetEl = previewRef.current;
      let dataUrl = '';
      try {
        dataUrl = await toPng(targetEl, {
          cacheBust: true,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          style: {
            width: '680px',
            maxWidth: '680px',
            margin: '0 auto',
          },
          skipFonts: true,
          fontEmbedCSS: '',
        });
      } catch (toPngErr) {
        console.warn('toPng failed, falling back to html2canvas:', toPngErr);
        const canvas = await html2canvas(targetEl, {
          backgroundColor: '#ffffff',
          scale: 2.2,
          useCORS: true,
          logging: false,
          windowWidth: 1200,
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const customerSlug = schedule.customerName
        ? schedule.customerName.replace(/[^a-zA-Z0-9]/g, '_')
        : 'Event';
      triggerDownload(dataUrl, `SPK_Jadwal_Gapura_${customerSlug}.png`);
      onShowToast('Foto lembar jadwal (PNG) berhasil diunduh!', 'success');
    } catch (err) {
      console.error('Error generating schedule PNG:', err);
      onShowToast('Gagal mengunduh foto lembar jadwal', 'error');
    } finally {
      setIsPngLoading(false);
    }
  };

  // 2. Download Document PDF (Border adjusts to content)
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsPdfLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 60));

      const targetEl = previewRef.current;
      let imgData = '';
      try {
        imgData = await toJpeg(targetEl, {
          quality: 0.95,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          style: {
            width: '680px',
            maxWidth: '680px',
            margin: '0 auto',
          },
          skipFonts: true,
          fontEmbedCSS: '',
        });
      } catch (toJpegErr) {
        console.warn('toJpeg failed, falling back to html2canvas:', toJpegErr);
        const canvas = await html2canvas(targetEl, {
          backgroundColor: '#ffffff',
          scale: 2.2,
          useCORS: true,
          logging: false,
          windowWidth: 1200,
        });
        imgData = canvas.toDataURL('image/jpeg', 0.95);
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 10;
      const printWidth = pageWidth - margin * 2;
      const printHeight = (imgProps.height * printWidth) / imgProps.width;

      pdf.addImage(
        imgData,
        'JPEG',
        margin,
        margin,
        printWidth,
        Math.min(printHeight, pageHeight - margin * 2)
      );

      const customerSlug = schedule.customerName
        ? schedule.customerName.replace(/[^a-zA-Z0-9]/g, '_')
        : 'Event';
      pdf.save(`SPK_Jadwal_Gapura_${customerSlug}.pdf`);
      onShowToast('Dokumen PDF jadwal berhasil diunduh!', 'success');
    } catch (err) {
      console.error('Error generating schedule PDF:', err);
      onShowToast('Gagal mengunduh file PDF', 'error');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // 3. Print
  const handlePrint = () => {
    window.print();
  };

  // 4. WhatsApp Sharing
  const getCleanPhone = (p: string) => {
    let clean = p.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  const getWhatsAppMessage = () => {
    return `*SURAT PERINTAH KERJA (SPK) & JADWAL KERJA LAPANGAN*
*GAPURA ENTERPRISE*
=============================================
*NO. SPK:* ${schedule.sourceInvoiceNumber ? `SPK-${schedule.sourceInvoiceNumber}` : `SPK-GAPURA-${schedule.id.slice(-6).toUpperCase()}`}

+-------------------------------------------+
| *DATA ACARA & PELAKSANAAN*
+-------------------------------------------+
• *Nama Tuan Hajat:* ${schedule.customerName || '-'}
• *Alamat Lokasi:* ${schedule.address || '-'}
• *Estimasi Pasang:* ${schedule.setupDate ? formatDateTimeIndo(schedule.setupDate) : '-'}
• *Tanggal Acara:* ${schedule.teardownDate ? formatDateTimeIndo(schedule.teardownDate) : '-'}
${schedule.picCrew ? `• *Kru yang Kerja:* ${schedule.picCrew}\n` : ''}

+-------------------------------------------+
| *RINCIAN PESANAN TENDA & PERALATAN*
+-------------------------------------------+
${schedule.orderDetails || '-'}

${schedule.notes ? `+-------------------------------------------+\n| *CATATAN LAPANGAN / AKSES JALAN*\n+-------------------------------------------+\n${schedule.notes}\n` : ''}=============================================
_Lembar Instruksi Resmi Kru Lapangan_`;
  };

  const handleCopyWhatsAppText = async () => {
    try {
      const text = getWhatsAppMessage();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onShowToast('Teks jadwal WhatsApp berhasil disalin!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
      onShowToast('Gagal menyalin teks ke clipboard', 'error');
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(getWhatsAppMessage());
    const cleanPhone = getCleanPhone(schedule.phone);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Primary Row: Simpan, Download Foto, Download PDF */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          id="btn-save-schedule"
          type="button"
          onClick={onSaveSchedule}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#8B0000] hover:bg-[#700000] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Save className="w-4 h-4 text-[#bef264]" />
          <span>Simpan Jadwal</span>
        </button>

        <button
          id="btn-download-schedule-png"
          type="button"
          onClick={handleDownloadPng}
          disabled={isPngLoading}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
        >
          {isPngLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Download className="w-4 h-4 text-[#bef264]" />
          )}
          <span>Download Foto</span>
        </button>

        <button
          id="btn-download-schedule-pdf"
          type="button"
          onClick={handleDownloadPdf}
          disabled={isPdfLoading}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition disabled:opacity-50"
        >
          {isPdfLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
          ) : (
            <FileText className="w-4 h-4 text-emerald-600" />
          )}
          <span>Download PDF</span>
        </button>
      </div>

      {/* Secondary Row: Cetak, Salin WA, Buka WA, Reset Form */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
            title="Cetak langsung lewat printer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            onClick={handleCopyWhatsAppText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition"
            title="Salin ringkasan pesan WA"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin WA'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
            title="Kirim pesan langsung ke WhatsApp"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Kirim WA</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClearForm}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition"
          title="Kosongkan form untuk buat jadwal baru"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Form</span>
        </button>
      </div>
    </div>
  );
};
