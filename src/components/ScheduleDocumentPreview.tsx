import React, { forwardRef, useMemo } from 'react';
import { ScheduleItem } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';

interface ScheduleDocumentPreviewProps {
  schedule: ScheduleItem;
}

export const ScheduleDocumentPreview = forwardRef<HTMLDivElement, ScheduleDocumentPreviewProps>(
  ({ schedule }, ref) => {
    // Parse order items line by line into structured table rows
    const orderItemsList = useMemo(() => {
      if (!schedule?.orderDetails) return [];
      return schedule.orderDetails
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    }, [schedule?.orderDetails]);

    const spkNumber = schedule.sourceInvoiceNumber
      ? `SPK-${schedule.sourceInvoiceNumber}`
      : `SPK-GAPURA-${schedule.id ? schedule.id.slice(-6).toUpperCase() : 'BARU'}`;

    return (
      <div
        id="schedule-paper"
        ref={ref}
        style={{
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          color: '#000000',
          border: '4px solid #8b0000',
          boxSizing: 'border-box',
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}
        className="schedule-document-paper select-none leading-tight p-2.5 sm:p-5"
      >
        {/* DOCUMENT TITLE & SPK HEADER */}
        <div className="border-b-2 border-black pb-2 mb-2.5 text-center">
          <div className="text-[10px] sm:text-xs text-slate-700 font-mono mb-1 font-bold">
            NOMOR SPK: <strong>{spkNumber}</strong>
          </div>

          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#8B0000] leading-snug">
            SURAT PERINTAH KERJA (SPK) & JADWAL PASANG BONGKAR TENDA
          </h2>
          <p className="text-[8.5px] sm:text-[9.5px] text-slate-500 italic mt-0.5">
            Lembar resmi instruksi kerja lapangan kru tenda & peralatan pesta
          </p>
        </div>

        {/* TABEL 1: DATA ACARA & PELAKSANAAN (Format Tabel Word Bergaris Rapi) */}
        <div className="mb-2.5">
          <div className="text-[10px] sm:text-[10.5px] font-bold uppercase text-slate-900 mb-1 flex items-center justify-between">
            <span>I. DATA PEMESAN & PELAKSANAAN:</span>
          </div>
          <table className="w-full text-[10px] sm:text-[11px] border-collapse border border-black table-fixed">
            <tbody>
              <tr>
                <td className="w-[100px] sm:w-36 border border-black bg-slate-100 p-1.5 sm:p-2 font-bold text-slate-900 align-middle">
                  Nama Tuan Hajat
                </td>
                <td className="border border-black p-1.5 sm:p-2 font-bold text-slate-950 text-xs sm:text-sm align-middle break-words">
                  {schedule.customerName || (
                    <span className="text-slate-400 italic font-normal">Belum diisi</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-slate-100 p-1.5 sm:p-2 font-bold text-slate-900 align-middle">
                  No. Telepon / WA
                </td>
                <td className="border border-black p-1.5 sm:p-2 font-mono font-semibold text-slate-900 align-middle break-words">
                  {schedule.phone || (
                    <span className="text-slate-400 italic font-normal font-sans">-</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-slate-100 p-1.5 sm:p-2 font-bold text-slate-900 align-top">
                  Alamat Acara / Lokasi
                </td>
                <td className="border border-black p-1.5 sm:p-2 text-slate-800 leading-snug align-top break-words">
                  {schedule.address || (
                    <span className="text-slate-400 italic">
                      Alamat lengkap lokasi pemasangan tenda belum diisi
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-slate-100 p-1.5 sm:p-2 font-bold text-slate-900 align-middle">
                  Estimasi Pasang
                </td>
                <td className="border border-black p-1.5 sm:p-2 font-bold text-[#8B0000] align-middle break-words">
                  {schedule.setupDate ? (
                    formatDateTimeIndo(schedule.setupDate)
                  ) : (
                    <span className="text-slate-400 italic font-normal">Belum ditentukan</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-slate-100 p-1.5 sm:p-2 font-bold text-slate-900 align-middle">
                  Tanggal Acara
                </td>
                <td className="border border-black p-1.5 sm:p-2 font-bold text-[#8B0000] align-middle break-words">
                  {schedule.teardownDate ? (
                    formatDateTimeIndo(schedule.teardownDate)
                  ) : (
                    <span className="text-slate-400 italic font-normal">Belum ditentukan</span>
                  )}
                </td>
              </tr>
              {schedule.picCrew && (
                <tr>
                  <td className="border border-black bg-slate-100 p-1.5 sm:p-2 font-bold text-slate-900 align-middle">
                    Kru yang Kerja / PIC
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 font-bold text-slate-900 align-middle break-words">
                    {schedule.picCrew}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TABEL 2: RINCIAN PESANAN TENDA & PERALATAN */}
        <div className="mb-2.5">
          <div className="text-[10px] sm:text-[10.5px] font-bold uppercase text-slate-900 mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
            <span>II. RINCIAN PESANAN TENDA & PERALATAN:</span>
            <span className="text-[8.5px] sm:text-[9px] font-normal text-slate-500 italic">
              *Wajib diperiksa saat muat & pasang di lokasi
            </span>
          </div>

          <table className="w-full text-[10px] sm:text-[11px] border-collapse border border-black table-fixed">
            <thead>
              <tr className="bg-slate-200 text-black font-bold">
                <th className="border border-black p-1 text-center w-7 sm:w-9 text-[10px] sm:text-[11px]">No</th>
                <th className="border border-black p-1 sm:p-1.5 text-left text-[10px] sm:text-[11px]">Uraian Peralatan / Tenda</th>
                <th className="border border-black p-1 text-center w-20 sm:w-28 text-[9px] sm:text-[10px]">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {orderItemsList.length > 0 ? (
                orderItemsList.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                    <td className="border border-black p-1 text-center font-bold text-[10px] sm:text-[11px]">{idx + 1}</td>
                    <td className="border border-black p-1 sm:p-1.5 font-medium text-[10px] sm:text-[11px] break-words">{item}</td>
                    <td className="border border-black p-1 text-center text-[8.5px] sm:text-[10px] text-slate-700">
                      Sesuai Pesanan
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="border border-black p-2.5 text-center text-slate-400 italic text-[10px] sm:text-xs">
                    Belum ada rincian peralatan tenda yang dimasukkan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TABEL 3: CATATAN KHUSUS LAPANGAN (JIKA ADA) */}
        {schedule.notes && (
          <div className="mb-2">
            <div className="text-[10px] sm:text-[10.5px] font-bold uppercase text-slate-900 mb-1">
              III. CATATAN KHUSUS & KETENTUAN LAPANGAN:
            </div>
            <div className="border border-black bg-slate-50 p-1.5 sm:p-2 text-[10px] sm:text-[10.5px] text-slate-800 leading-snug break-words">
              <strong>Catatan Lapangan:</strong> {schedule.notes}
            </div>
          </div>
        )}
      </div>
    );
  }
);
ScheduleDocumentPreview.displayName = 'ScheduleDocumentPreview';
