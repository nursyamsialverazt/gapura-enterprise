import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  HardHat,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Plus,
  Check,
  Eye,
  Users,
} from 'lucide-react';
import { ScheduleItem, InvoiceData } from '../types';
import { getCrewListFromPayroll } from '../utils/storage';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduleItem) => void;
  onSaveAndPreview?: (schedule: ScheduleItem) => void;
  initialData?: ScheduleItem | null;
  availableInvoices: InvoiceData[];
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const getDefaultDateTime = (daysAhead: number, hours: number, minutes: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, minutes, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndPreview,
  initialData,
  availableInvoices,
  onShowToast,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [setupDate, setSetupDate] = useState(getDefaultDateTime(1, 8, 30));
  const [teardownDate, setTeardownDate] = useState(getDefaultDateTime(3, 9, 0));
  const [picCrew, setPicCrew] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'AKTIF' | 'SELESAI'>('AKTIF');
  const [sourceInvoiceId, setSourceInvoiceId] = useState<string | undefined>(undefined);
  const [sourceInvoiceNumber, setSourceInvoiceNumber] = useState<string | undefined>(undefined);

  // List of crew from Data Gaji (Payroll)
  const payrollCrewList = React.useMemo(() => {
    return getCrewListFromPayroll();
  }, []);

  const handleToggleCrew = (crewName: string) => {
    const current = picCrew
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    let updated: string[];
    if (current.includes(crewName)) {
      updated = current.filter((c) => c !== crewName);
    } else {
      updated = [...current, crewName];
    }
    setPicCrew(updated.join(', '));
  };

  // Sync state with initialData if editing
  useEffect(() => {
    if (initialData) {
      setCustomerName(initialData.customerName || '');
      setAddress(initialData.address || '');
      setPhone(initialData.phone || '');
      setOrderDetails(initialData.orderDetails || '');
      setSetupDate(initialData.setupDate || getDefaultDateTime(1, 8, 30));
      setTeardownDate(initialData.teardownDate || getDefaultDateTime(3, 9, 0));
      setPicCrew(initialData.picCrew || '');
      setNotes(initialData.notes || '');
      setStatus(initialData.status || 'AKTIF');
      setSourceInvoiceId(initialData.sourceInvoiceId);
      setSourceInvoiceNumber(initialData.sourceInvoiceNumber);
    } else {
      // Reset to defaults
      setCustomerName('');
      setAddress('');
      setPhone('');
      setOrderDetails('• Tenda Plafon VIP\n• Panggung Pelaminan\n• Kursi Futura + Sarung\n• Sound System');
      setSetupDate(getDefaultDateTime(1, 8, 30));
      setTeardownDate(getDefaultDateTime(3, 9, 0));
      setPicCrew('');
      setNotes('');
      setStatus('AKTIF');
      setSourceInvoiceId(undefined);
      setSourceInvoiceNumber(undefined);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Handle auto-fill from existing invoice
  const handleSelectInvoice = (invoiceId: string) => {
    const inv = availableInvoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!inv) return;

    setCustomerName(inv.customerName || '');
    setAddress(inv.address || '');
    setSourceInvoiceId(inv.id || inv.invoiceNumber);
    setSourceInvoiceNumber(inv.invoiceNumber);

    // Format item list from invoice into structured text
    if (inv.items && inv.items.length > 0) {
      const itemsText = inv.items
        .filter((item) => item.name.trim())
        .map((item) => `• ${item.name} (${item.quantity} unit)`)
        .join('\n');
      setOrderDetails(itemsText || orderDetails);
    }

    // Attempt to set date if eventDate exists
    if (inv.eventDate) {
      try {
        const parts = inv.eventDate.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          // Event date is setup day or 1 day prior
          const evtDate = new Date(inv.eventDate);
          const setup = new Date(evtDate);
          setup.setDate(evtDate.getDate() - 1); // Pasang H-1
          setup.setHours(9, 0, 0, 0);

          const teardown = new Date(evtDate);
          teardown.setDate(evtDate.getDate() + 1); // Bongkar H+1
          teardown.setHours(9, 0, 0, 0);

          const pad = (n: number) => String(n).padStart(2, '0');
          setSetupDate(`${setup.getFullYear()}-${pad(setup.getMonth() + 1)}-${pad(setup.getDate())}T09:00`);
          setTeardownDate(`${teardown.getFullYear()}-${pad(teardown.getMonth() + 1)}-${pad(teardown.getDate())}T09:00`);
        }
      } catch (err) {
        console.error(err);
      }
    }

    onShowToast(`Data dari Nota #${inv.invoiceNumber} berhasil disalin!`, 'success');
  };

  const handleAppendItem = (text: string) => {
    setOrderDetails((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n• ${text}` : `• ${text}`;
    });
  };

  const handleSaveData = (andPreview: boolean = false) => {
    if (!customerName.trim()) {
      onShowToast('Harap isi Nama Tuan Hajat!', 'error');
      return;
    }
    if (!setupDate) {
      onShowToast('Harap tentukan Tanggal & Jam Pasang!', 'error');
      return;
    }
    if (!teardownDate) {
      onShowToast('Harap tentukan Tanggal & Jam Bongkar!', 'error');
      return;
    }

    const newSchedule: ScheduleItem = {
      id: initialData?.id || `schedule-${Date.now()}`,
      customerName: customerName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      orderDetails: orderDetails.trim(),
      setupDate,
      teardownDate,
      status,
      picCrew: picCrew.trim(),
      notes: notes.trim(),
      sourceInvoiceId,
      sourceInvoiceNumber,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      completedAt: status === 'SELESAI' ? (initialData?.completedAt || new Date().toISOString()) : undefined,
    };

    onSave(newSchedule);
    if (andPreview && onSaveAndPreview) {
      onSaveAndPreview(newSchedule);
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveData(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[95vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B0000] to-[#a81c1c] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-5 h-5 text-[#bef264]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {initialData ? 'Edit Jadwal Acara' : 'Tambah Jadwal Pasang & Bongkar'}
              </h2>
              <p className="text-xs text-white/80">
                Lengkapi rincian pesanan dan tanggal pelaksanaan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-800">
          {/* Quick Import from Nota */}
          {availableInvoices.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  Tarik Data dari Riwayat Nota:
                </span>
              </div>
              <select
                aria-label="Tarik Data dari Riwayat Nota"
                onChange={(e) => handleSelectInvoice(e.target.value)}
                defaultValue=""
                className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              >
                <option value="" disabled>
                  -- Pilih Nota Tersimpan --
                </option>
                {availableInvoices.map((inv) => (
                  <option key={inv.id || inv.invoiceNumber} value={inv.id || inv.invoiceNumber}>
                    {inv.invoiceNumber} - {inv.customerName || 'Tanpa Nama'} ({inv.eventDate || '-'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Tuan Hajat <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. H. Rahmat"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:outline-none bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No HP / WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="0812-XXXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:outline-none bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Lengkap Lokasi Acara <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                required
                rows={2}
                placeholder="Alamat acara, patokan gang, atau nama gedung"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Setup Date and Teardown Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Estimasi Pasang <span className="text-red-500">*</span></span>
              </label>
              <input
                type="datetime-local"
                required
                value={setupDate}
                onChange={(e) => setSetupDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
              />
            </div>

            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Tanggal Acara <span className="text-red-500">*</span></span>
              </label>
              <input
                type="datetime-local"
                required
                value={teardownDate}
                onChange={(e) => setTeardownDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* PIC / Field Coordinator - Data dari Gaji */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>Kru yang Kerja / Tim Lapangan</span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                  Data dari Gaji
                </span>
              </label>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPicCrew(payrollCrewList.join(', '))}
                  className="font-bold text-[#8B0000] hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setPicCrew('')}
                  className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* Quick Crew Chips from Data Gaji (Click to Toggle) */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/90 rounded-xl border border-slate-200">
              {payrollCrewList.map((crew) => {
                const isAssigned = picCrew.toLowerCase().includes(crew.toLowerCase());

                return (
                  <button
                    key={crew}
                    type="button"
                    onClick={() => handleToggleCrew(crew)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                      isAssigned
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    title={`Klik untuk ${isAssigned ? 'menghapus' : 'menugaskan'} ${crew}`}
                  >
                    {isAssigned ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <Plus className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{crew}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <HardHat className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Klik nama kru di atas atau ketik manual..."
                value={picCrew}
                onChange={(e) => setPicCrew(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:outline-none bg-white font-medium text-slate-800"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Nama kru diambil otomatis dari modul Penggajian / Data Gaji.
            </p>
          </div>

          {/* Order Details (Multi-line) with quick chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Rincian Pesanan / Peralatan Tenda & Pesta
              </label>
              <span className="text-[10px] text-slate-400">Gunakan baris baru atau titik</span>
            </div>

            {/* Quick helper tag chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Panggung Hiburan 6x4',
                'Panggung Pelaminan 2x6',
                'Panggung Pelaminan 3x6',
                'Set Parasmanan',
                'Tenda Plafon VIP',
                'Kursi Futura + Pita',
                'Sound System 5000W',
                'Kipas Blower Air',
                'Meja Prasmanan Bulat',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAppendItem(chip)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition border border-slate-200"
                >
                  <Plus className="w-3 h-3 text-[#8B0000]" />
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              placeholder="Contoh:&#10;• Tenda Plafon 8 x 12m (Merah Emas)&#10;• Panggung Pelaminan 6 x 3m&#10;• Kursi Futura 100 unit"
              value={orderDetails}
              onChange={(e) => setOrderDetails(e.target.value)}
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:outline-none bg-slate-50 focus:bg-white leading-relaxed"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Khusus Lapangan / Akses Jalan
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Akses mobil truk muat sampai depan rumah, koordinasi dengan keamanan setempat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-bold text-slate-700">Status Jadwal:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="schedule-status"
                checked={status === 'AKTIF'}
                onChange={() => setStatus('AKTIF')}
                className="text-[#8B0000] focus:ring-[#8B0000]"
              />
              <span className="text-xs font-semibold text-amber-700">Jadwal Aktif</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="schedule-status"
                checked={status === 'SELESAI'}
                onChange={() => setStatus('SELESAI')}
                className="text-[#8B0000] focus:ring-[#8B0000]"
              />
              <span className="text-xs font-semibold text-emerald-700">Selesai / Dibongkar</span>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSaveData(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Simpan ke Tabel
            </button>
            {onSaveAndPreview && (
              <button
                type="button"
                onClick={() => handleSaveData(true)}
                className="px-4 py-2 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-[#bef264]" />
                <span>Simpan & Buka di Live Preview</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
