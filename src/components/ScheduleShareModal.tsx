import React, { useRef, useState, useMemo } from 'react';
import {
  X,
  Download,
  FileText,
  Share2,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  HardHat,
  FileCheck,
  Printer,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ScheduleItem } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';
import { GapuraLogo } from './Logo';
import { ScheduleDocumentPreview } from './ScheduleDocumentPreview';

interface ScheduleShareModalProps {
  schedule: ScheduleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ScheduleShareModal: React.FC<ScheduleShareModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isPngLoading, setIsPngLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse order items line by line into structured table rows
  const orderItemsList = useMemo(() => {
    if (!schedule?.orderDetails) return [];
    return schedule.orderDetails
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [schedule?.orderDetails]);

  if (!isOpen || !schedule) return null;

  const getCleanPhone = (p: string) => {
    let clean = p.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  const getWhatsAppMessage = () => {
    return `*SURAT PERINTAH KERJA (SPK) & JADWAL PASANG BONGKAR TENDA*
*GAPURA ENTERPRISE (Wedding & Event Solution)*
=============================================
*NO. JADWAL:* ${schedule.sourceInvoiceNumber || `JDWL-${schedule.id.slice(-6).toUpperCase()}`}
*STATUS:* ${schedule.status === 'AKTIF' ? 'AKTIF (BELUM BONGKAR)' : 'SELESAI BONGKAR'}

+-------------------------------------------+
| *DATA ACARA & PELAKSANAAN*
+-------------------------------------------+
• *Nama Tuan Hajat:* ${schedule.customerName || '-'}
• *Alamat Lokasi:* ${schedule.address || '-'}
• *Estimasi Pasang:* ${formatDateTimeIndo(schedule.setupDate)}
• *Tanggal Acara:* ${formatDateTimeIndo(schedule.teardownDate)}
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
      onShowToast('Teks jadwal WhatsApp berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
      onShowToast('Gagal menyalin teks secara otomatis', 'error');
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

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsPngLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 60));

      const targetEl = cardRef.current;
      let dataUrl = '';
      try {
        dataUrl = await toPng(targetEl, {
          cacheBust: true,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
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
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const fileName = `Tabel_Jadwal_Gapura_${schedule.customerName.replace(/[^a-zA-Z0-9]/g, '_') || 'Event'}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1000);

      onShowToast('Foto tabel jadwal (PNG) berhasil diunduh!', 'success');
    } catch (error) {
      console.error('Error generating schedule image:', error);
      onShowToast('Gagal membuat gambar tabel jadwal', 'error');
    } finally {
      setIsPngLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsPdfLoading(true);
    const fileName = `Tabel_Jadwal_Gapura_${schedule.customerName.replace(/[^a-zA-Z0-9]/g, '_') || 'Event'}.pdf`;

    try {
      await new Promise((r) => setTimeout(r, 60));

      const targetEl = cardRef.current;
      let imgData = '';
      try {
        imgData = await toJpeg(targetEl, {
          quality: 0.95,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
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
      pdf.save(fileName);
      onShowToast('Dokumen PDF tabel jadwal berhasil diunduh!', 'success');
    } catch (error) {
      console.error('Error creating PDF:', error);
      onShowToast('Gagal membuat file PDF', 'error');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[96vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#8B0000] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 text-[#bef264]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                Bagikan Laporan Jadwal (Format Tabel Word)
              </h2>
              <p className="text-[11px] text-white/80">
                Format tabel resmi Word siap kirim via Foto PNG, Dokumen PDF, atau WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isPngLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              title="Unduh foto tabel format PNG"
            >
              {isPngLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#bef264]" />
              )}
              <span>Unduh Foto (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPdfLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              title="Unduh file dokumen PDF"
            >
              {isPdfLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition"
              title="Cetak langsung lewat printer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Cetak / Print</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition"
              title="Salin teks tabel untuk WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks WA'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              title="Buka chat WhatsApp"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka WA</span>
            </button>
          </div>
        </div>

        {/* Scrollable Preview Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-200/70 flex justify-center">
          <div className="w-full max-w-[680px]">
            <ScheduleDocumentPreview ref={cardRef} schedule={schedule} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600 hidden sm:inline">
            Status: <strong className="text-slate-900">{schedule.status}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
};
