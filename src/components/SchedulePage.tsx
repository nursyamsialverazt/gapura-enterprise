import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  Table,
  Eye,
  Plus,
  FileText,
  User,
  MapPin,
  Clock,
  Sparkles,
  Phone,
  HardHat,
  Trash2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Database,
  Edit3,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Settings2,
  RotateCcw,
  Users,
} from 'lucide-react';
import { ScheduleItem, InvoiceData } from '../types';
import { getCrewListFromPayroll } from '../utils/storage';
import { ScheduleDocumentPreview } from './ScheduleDocumentPreview';
import { ScheduleActionButtons } from './ScheduleActionButtons';
import { ScheduleTableReport } from './ScheduleTableReport';
import { ScheduleShareModal } from './ScheduleShareModal';

interface SchedulePageProps {
  schedules: ScheduleItem[];
  availableInvoices: InvoiceData[];
  onSaveSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateStatus: (id: string, status: 'AKTIF' | 'SELESAI') => void;
  onNavigateToHistory: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBackup?: () => void;
}

const getDefaultDateTime = (daysAhead: number, hours: number, minutes: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, minutes, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DEFAULT_SCHEDULE_PRESETS: string[] = [
  'Panggung Hiburan 6x4',
  'Panggung Pelaminan 2x6',
  'Panggung Pelaminan 3x6',
  'Set Parasmanan',
  'Tenda Plafon VIP',
  'Kursi Futura + Cover (100 pcs)',
  'Meja Prasmanan Bulat (Set)',
  'Kipas Blower Air Kabut',
  'Sound System Standard 5000W',
  'Lampu Hias & Sorot Panggung',
  'Kain Rempel / Dinding Tenda',
];

const SCHEDULE_PRESET_STORAGE_KEY = 'gapura_schedule_presets_v1';

const createInitialSchedule = (): ScheduleItem => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  customerName: '',
  address: '',
  phone: '',
  orderDetails: '• Tenda Plafon VIP (4 x 10 m)\n• Panggung Pelaminan Lengkap\n• Kursi Futura + Cover (100 Pcs)\n• Meja Prasmanan + Skirting (4 Set)\n• Kipas Blower Air (2 Unit)\n• Sound System Standard',
  setupDate: getDefaultDateTime(1, 8, 30),
  teardownDate: getDefaultDateTime(3, 9, 0),
  picCrew: '',
  notes: 'Harap perhatikan kabel listrik PLN dan koordinasi akses jalan dengan ketua RT setempat.',
  status: 'AKTIF',
  createdAt: new Date().toISOString(),
});

export const SchedulePage: React.FC<SchedulePageProps> = ({
  schedules,
  availableInvoices,
  onSaveSchedule,
  onDeleteSchedule,
  onUpdateStatus,
  onNavigateToHistory,
  onShowToast,
  onOpenBackup,
}) => {
  // Navigation tabs within Schedule Page ('editor' for Live Paper Preview, 'table' for Table Report)
  const [activeView, setActiveView] = useState<'editor' | 'table'>('editor');

  // Currently loaded schedule in the 2-column live editor
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem>(createInitialSchedule);

  // Quick interactive item add states (Manual Item Input)
  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemQty, setQuickItemQty] = useState('1 unit');
  const [quickItemNote, setQuickItemNote] = useState('');
  const [itemInputMode, setItemInputMode] = useState<'interactive' | 'text'>('interactive');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemText, setEditingItemText] = useState<string>('');

  // Customizable Schedule Presets State
  const [schedulePresets, setSchedulePresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SCHEDULE_PRESET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading schedule presets from storage', e);
    }
    return DEFAULT_SCHEDULE_PRESETS;
  });

  const [showSchedulePresetManager, setShowSchedulePresetManager] = useState(false);
  const [editingSchedulePresetIdx, setEditingSchedulePresetIdx] = useState<number | null>(null);
  const [editingSchedulePresetText, setEditingSchedulePresetText] = useState('');
  const [newSchedulePresetText, setNewSchedulePresetText] = useState('');

  const saveSchedulePresetsToStorage = (updated: string[]) => {
    setSchedulePresets(updated);
    try {
      localStorage.setItem(SCHEDULE_PRESET_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving schedule presets', e);
    }
  };

  const handleAddSchedulePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedulePresetText.trim()) return;
    const updated = [...schedulePresets, newSchedulePresetText.trim()];
    saveSchedulePresetsToStorage(updated);
    setNewSchedulePresetText('');
    onShowToast(`Preset "${newSchedulePresetText.trim()}" berhasil ditambahkan!`, 'success');
  };

  const handleStartEditSchedulePreset = (idx: number, text: string) => {
    setEditingSchedulePresetIdx(idx);
    setEditingSchedulePresetText(text);
  };

  const handleSaveEditSchedulePreset = (index: number) => {
    if (!editingSchedulePresetText.trim()) return;
    const updated = schedulePresets.map((p, idx) => (idx === index ? editingSchedulePresetText.trim() : p));
    saveSchedulePresetsToStorage(updated);
    setEditingSchedulePresetIdx(null);
    onShowToast('Preset berhasil diperbarui!', 'success');
  };

  const handleDeleteSchedulePreset = (index: number) => {
    const updated = schedulePresets.filter((_, idx) => idx !== index);
    saveSchedulePresetsToStorage(updated);
    if (editingSchedulePresetIdx === index) setEditingSchedulePresetIdx(null);
  };

  const handleResetSchedulePresets = () => {
    if (window.confirm('Kembalikan seluruh daftar preset jadwal ke pengaturan standar?')) {
      saveSchedulePresetsToStorage(DEFAULT_SCHEDULE_PRESETS);
      setEditingSchedulePresetIdx(null);
      onShowToast('Preset jadwal dikembalikan ke standar!', 'info');
    }
  };

  // Sharing modal for table actions
  const [sharingSchedule, setSharingSchedule] = useState<ScheduleItem | null>(null);

  // Ref to the live schedule paper document
  const previewRef = useRef<HTMLDivElement>(null);
  const [isPreviewInView, setIsPreviewInView] = useState(false);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPreviewInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeView]);

  // Active schedules only
  const activeSchedules = useMemo(() => {
    return schedules.filter((s) => s.status === 'AKTIF');
  }, [schedules]);

  // List of crew members taken directly from Data Gaji (Payroll)
  const payrollCrewList = useMemo(() => {
    return getCrewListFromPayroll();
  }, []);

  const handleToggleCrew = (crewName: string) => {
    const current = (currentSchedule.picCrew || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    let updated: string[];
    if (current.includes(crewName)) {
      updated = current.filter((c) => c !== crewName);
    } else {
      updated = [...current, crewName];
    }

    setCurrentSchedule((prev) => ({
      ...prev,
      picCrew: updated.join(', '),
    }));
  };

  const handleSelectAllCrew = () => {
    setCurrentSchedule((prev) => ({
      ...prev,
      picCrew: payrollCrewList.join(', '),
    }));
  };

  const handleClearCrew = () => {
    setCurrentSchedule((prev) => ({
      ...prev,
      picCrew: '',
    }));
  };

  // Parse order items for interactive view
  const parsedItems = useMemo(() => {
    if (!currentSchedule.orderDetails) return [];
    return currentSchedule.orderDetails
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }, [currentSchedule.orderDetails]);

  // Handle switching to a new empty schedule
  const handleCreateNew = () => {
    setCurrentSchedule(createInitialSchedule());
    setActiveView('editor');
    onShowToast('Form jadwal baru siap diisi!', 'info');
  };

  // Handle editing / viewing an existing schedule (from table report)
  const handleViewOrEditFromTable = (schedule: ScheduleItem) => {
    setCurrentSchedule(schedule);
    setActiveView('editor');
    onShowToast(`Memuat data "${schedule.customerName || 'Pelanggan'}" ke Live Preview Kertas`, 'info');
  };

  // Handle auto-prefill from an existing invoice
  const handleSelectInvoice = (invoiceId: string) => {
    if (!invoiceId) return;
    const inv = availableInvoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!inv) return;

    let itemsFormatted = '';
    if (inv.items && inv.items.length > 0) {
      itemsFormatted = inv.items
        .filter((item) => item.name && item.name.trim())
        .map((item) => `• ${item.name} (${item.quantity}x)`)
        .join('\n');
    }

    setCurrentSchedule((prev) => ({
      ...prev,
      customerName: inv.customerName || prev.customerName,
      address: inv.address || prev.address,
      orderDetails: itemsFormatted || prev.orderDetails,
      sourceInvoiceId: inv.id || inv.invoiceNumber,
      sourceInvoiceNumber: inv.invoiceNumber,
    }));

    onShowToast(`Data dari Nota #${inv.invoiceNumber} berhasil disalin ke form jadwal!`, 'success');
  };

  // Quick append preset item to order details
  const handleAppendItem = (itemText: string) => {
    setCurrentSchedule((prev) => {
      const current = prev.orderDetails ? prev.orderDetails.trim() : '';
      const addition = `• ${itemText}`;
      const newDetails = current ? `${current}\n${addition}` : addition;
      return { ...prev, orderDetails: newDetails };
    });
  };

  // Add custom manual item row
  const handleAddCustomItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickItemName.trim()) {
      onShowToast('Tuliskan nama peralatan terlebih dahulu', 'error');
      return;
    }
    const qtyPart = quickItemQty.trim() ? ` (${quickItemQty.trim()})` : '';
    const notePart = quickItemNote.trim() ? ` - ${quickItemNote.trim()}` : '';
    const line = `• ${quickItemName.trim()}${qtyPart}${notePart}`;

    setCurrentSchedule((prev) => {
      const current = prev.orderDetails ? prev.orderDetails.trim() : '';
      const newDetails = current ? `${current}\n${line}` : line;
      return { ...prev, orderDetails: newDetails };
    });

    setQuickItemName('');
    setQuickItemNote('');
    onShowToast(`Item "${quickItemName}" ditambahkan ke lembar kertas!`, 'success');
  };

  // Remove specific item row
  const handleRemoveItem = (index: number) => {
    const lines = currentSchedule.orderDetails
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const updated = lines.filter((_, idx) => idx !== index).join('\n');
    setCurrentSchedule((prev) => ({ ...prev, orderDetails: updated }));
    if (editingItemIdx === index) setEditingItemIdx(null);
  };

  // Start editing specific item row
  const handleStartEditItem = (index: number, text: string) => {
    setEditingItemIdx(index);
    setEditingItemText(text.replace(/^[•\-\*]\s*/, ''));
  };

  // Save edited item row
  const handleSaveEditItem = (index: number) => {
    if (!editingItemText.trim()) return;
    const lines = currentSchedule.orderDetails
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const updatedLine = `• ${editingItemText.trim()}`;
    const updated = lines.map((l, idx) => (idx === index ? updatedLine : l)).join('\n');
    setCurrentSchedule((prev) => ({ ...prev, orderDetails: updated }));
    setEditingItemIdx(null);
    onShowToast('Item peralatan berhasil diubah!', 'success');
  };

  // Move item row up or down
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const lines = currentSchedule.orderDetails
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= lines.length) return;
    const temp = lines[index];
    lines[index] = lines[targetIdx];
    lines[targetIdx] = temp;
    setCurrentSchedule((prev) => ({ ...prev, orderDetails: lines.join('\n') }));
  };

  // Save current schedule
  const handleSaveCurrentSchedule = () => {
    if (!currentSchedule.customerName.trim()) {
      onShowToast('Mohon isi Nama Tuan Hajat terlebih dahulu', 'error');
      return;
    }
    if (!currentSchedule.setupDate || !currentSchedule.teardownDate) {
      onShowToast('Mohon tentukan Tanggal Pasang dan Bongkar', 'error');
      return;
    }

    onSaveSchedule(currentSchedule);
    onShowToast('Jadwal kerja berhasil disimpan ke database & tabel laporan!', 'success');
  };

  // Reset current schedule
  const handleResetCurrentSchedule = () => {
    if (window.confirm('Bersihkan form dan mulai jadwal baru?')) {
      setCurrentSchedule(createInitialSchedule());
      onShowToast('Form jadwal berhasil direset', 'info');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#8B0000]/10 text-[#8B0000]">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-serif">
              Jadwal Pemasangan & Bongkar Tenda
            </h2>
            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
              {activeSchedules.length} Agenda Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sistem tabel laporan terpadu yang saling terhubung secara real-time dengan live preview kertas dokumen cetak SPK resmi.
          </p>
        </div>

        {/* Top View Mode Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Editor vs Tabel Laporan */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="btn-view-editor"
              type="button"
              onClick={() => setActiveView('editor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeView === 'editor'
                  ? 'bg-[#8B0000] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor & Live Preview Kertas</span>
            </button>

            <button
              id="btn-view-table-report"
              type="button"
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeView === 'table'
                  ? 'bg-[#8B0000] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Laporan ({activeSchedules.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onNavigateToHistory}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            title="Buka Agenda Jadwal per Bulan"
          >
            <CalendarDays className="w-4 h-4 text-[#8B0000]" />
            <span>Jadwal per Bulan</span>
          </button>

          {onOpenBackup && (
            <button
              id="btn-backup-schedule"
              type="button"
              onClick={onOpenBackup}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Cadangkan dan pulihkan data jadwal tenda"
            >
              <Database className="w-3.5 h-3.5 text-amber-700" />
              <span>Backup Data Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: EDITOR 2-KOLOM (PERSIS SEPERTI NOTA DENGAN LIVE PREVIEW KERTAS) */}
      {activeView === 'editor' ? (
        <div className="space-y-4">
          {/* Real-time sync connection banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-emerald-900">
                Terhubung Real-Time ke Dokumen Cetak SPK
              </span>
              <span className="text-emerald-700 hidden sm:inline">
                • Setiap penambahan data di tabel atau form otomatis langsung memperbarui tampilan lembar kertas & laporan cetak.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('table')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-900 hover:underline"
            >
              <span>Buka Tabel Laporan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Toolbar: Import from Nota or Switch Saved Schedules */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Ambil dari Nota */}
              {availableInvoices && availableInvoices.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#8B0000] whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ambil dari Nota:
                  </span>
                  <select
                    id="select-prefill-invoice"
                    onChange={(e) => {
                      handleSelectInvoice(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#8B0000] text-slate-700 max-w-[200px]"
                  >
                    <option value="" disabled>
                      Pilih nota tersimpan...
                    </option>
                    {availableInvoices.map((inv) => (
                      <option key={inv.id || inv.invoiceNumber} value={inv.id || inv.invoiceNumber}>
                        {inv.invoiceNumber} - {inv.customerName || 'Tanpa Nama'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Buka Jadwal Aktif Lainnya Langsung dari Tabel Laporan */}
              {activeSchedules.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                    <Table className="w-3.5 h-3.5 text-blue-600" />
                    Pilih Data dari Tabel:
                  </span>
                  <select
                    id="select-active-schedule"
                    onChange={(e) => {
                      const found = activeSchedules.find((s) => s.id === e.target.value);
                      if (found) {
                        setCurrentSchedule(found);
                        onShowToast(`Beralih ke jadwal "${found.customerName}"`, 'info');
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#8B0000] text-slate-700 max-w-[210px] font-medium"
                  >
                    <option value="" disabled>
                      -- Pilih agenda di tabel --
                    </option>
                    {activeSchedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.customerName || 'Tanpa Nama'} ({s.setupDate ? s.setupDate.slice(5, 10) : '-'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              id="btn-create-new-schedule"
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-lg shadow-sm transition shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#bef264]" />
              <span>+ Buat Jadwal Baru</span>
            </button>
          </div>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & Inputs */}
            <div className="lg:col-span-6 space-y-4">
              {/* Bagian 1: Data Tuan Hajat / Pelanggan */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold tracking-wider text-[#8B0000] uppercase flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#8B0000]" />
                    <span>1. Data Tuan Hajat & Kontak</span>
                  </h3>
                  {currentSchedule.sourceInvoiceNumber && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded-full border border-slate-200">
                      Terkait Nota: #{currentSchedule.sourceInvoiceNumber}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Tuan Hajat / Pemesan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Bpk. H. Ahmad Fauzi / Bu Sri"
                        value={currentSchedule.customerName}
                        onChange={(e) =>
                          setCurrentSchedule((prev) => ({ ...prev, customerName: e.target.value }))
                        }
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>No. Telepon / WhatsApp</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 0821-XXXX-XXXX"
                        value={currentSchedule.phone || ''}
                        onChange={(e) =>
                          setCurrentSchedule((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alamat Lengkap Lokasi Pemasangan Tenda</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Jl. Merdeka No. 45 RT 03/RW 02, Sukamaju (Belakang Balai Desa)"
                      value={currentSchedule.address}
                      onChange={(e) =>
                        setCurrentSchedule((prev) => ({ ...prev, address: e.target.value }))
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-slate-50 focus:bg-white resize-none"
                    />
                  </div>

                  {/* Kru Yang Kerja - Terhubung ke Data Gaji */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
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
                          onClick={handleSelectAllCrew}
                          className="font-bold text-[#8B0000] hover:underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleClearCrew}
                          className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    {/* Quick Crew Chips from Data Gaji (Click to Toggle) */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/90 rounded-xl border border-slate-200">
                      {payrollCrewList.map((crew) => {
                        const isAssigned = (currentSchedule.picCrew || '')
                          .toLowerCase()
                          .includes(crew.toLowerCase());

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

                    {/* Text Field with Full Flexibility */}
                    <div className="relative">
                      <HardHat className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Kru bertugas (klik nama di atas atau ketik manual)..."
                        value={currentSchedule.picCrew || ''}
                        onChange={(e) =>
                          setCurrentSchedule((prev) => ({ ...prev, picCrew: e.target.value }))
                        }
                        className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-white font-medium text-slate-800"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Daftar nama otomatis diambil dari data gaji kru di menu Penggajian. Klik nama untuk menugaskan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Estimasi Pasang & Tanggal Acara */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold tracking-wider text-[#8B0000] uppercase flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#8B0000]" />
                    <span>2. Jadwal Waktu Kerja Lapangan</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-black text-amber-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>Estimasi Pasang <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="datetime-local"
                      value={currentSchedule.setupDate}
                      onChange={(e) =>
                        setCurrentSchedule((prev) => ({ ...prev, setupDate: e.target.value }))
                      }
                      className="w-full text-xs font-bold px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                    />
                    <p className="text-[10px] text-amber-700">Estimasi waktu tim mulai mendirikan tenda</p>
                  </div>

                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-black text-blue-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-700" />
                      <span>Tanggal Acara <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="datetime-local"
                      value={currentSchedule.teardownDate}
                      onChange={(e) =>
                        setCurrentSchedule((prev) => ({ ...prev, teardownDate: e.target.value }))
                      }
                      className="w-full text-xs font-bold px-2.5 py-1.5 border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                    <p className="text-[10px] text-blue-700">Waktu pelaksanaan hajat / acara pelanggan</p>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Rincian Pesanan / Peralatan (Otomatis & Manual Interaktif) */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <h3 className="text-xs font-bold tracking-wider text-[#8B0000] uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#8B0000]" />
                    <span>3. Rincian Pesanan & Peralatan Tenda</span>
                  </h3>
                  {/* Mode Selector Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setItemInputMode('interactive')}
                      className={`px-2 py-1 rounded font-bold transition ${
                        itemInputMode === 'interactive'
                          ? 'bg-white text-[#8B0000] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Input Baris Rapi
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemInputMode('text')}
                      className={`px-2 py-1 rounded font-bold transition ${
                        itemInputMode === 'text'
                          ? 'bg-white text-[#8B0000] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mode Teks Bebas
                    </button>
                  </div>
                </div>

                {/* Sub-section: Fast interactive item addition */}
                {itemInputMode === 'interactive' ? (
                  <div className="space-y-3">
                    {/* Input bar */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Tambah Item Manual ke Kertas:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          placeholder="Nama alat (cth: Tenda VIP 8x15m)"
                          value={quickItemName}
                          onChange={(e) => setQuickItemName(e.target.value)}
                          className="sm:col-span-6 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                        />
                        <input
                          type="text"
                          placeholder="Jumlah (cth: 2 unit)"
                          value={quickItemQty}
                          onChange={(e) => setQuickItemQty(e.target.value)}
                          className="sm:col-span-3 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomItem()}
                          className="sm:col-span-3 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#bef264]" />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Item List display with inline edit and delete */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {parsedItems.length > 0 ? (
                        parsedItems.map((item, idx) => {
                          const isEditing = editingItemIdx === idx;

                          if (isEditing) {
                            return (
                              <div
                                key={idx}
                                className="p-2 bg-amber-50/90 border border-amber-300 rounded-lg flex items-center gap-2 text-xs shadow-xs"
                              >
                                <span className="font-bold text-[#8B0000] text-xs shrink-0">
                                  {idx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={editingItemText}
                                  onChange={(e) => setEditingItemText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditItem(idx);
                                    if (e.key === 'Escape') setEditingItemIdx(null);
                                  }}
                                  autoFocus
                                  className="flex-1 px-2.5 py-1 text-xs border border-amber-400 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
                                  placeholder="Edit rincian item (cth: Meja Prasmanan + Skirting 6 Set)"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditItem(idx)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-2xs cursor-pointer"
                                    title="Simpan Perubahan"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemIdx(null)}
                                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              className="group flex items-center justify-between p-2 bg-slate-50/80 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-800 transition"
                            >
                              <div
                                className="flex items-center gap-1.5 truncate mr-2 flex-1 cursor-pointer"
                                onClick={() => handleStartEditItem(idx, item)}
                                title="Klik untuk mengedit item ini"
                              >
                                <strong className="text-[#8B0000] shrink-0">{idx + 1}.</strong>
                                <span className="font-medium truncate group-hover:text-[#8B0000] transition">
                                  {item}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveItem(idx, 'up')}
                                    className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-white transition cursor-pointer"
                                    title="Pindahkan ke atas"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {idx < parsedItems.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveItem(idx, 'down')}
                                    className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-white transition cursor-pointer"
                                    title="Pindahkan ke bawah"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditItem(idx, item)}
                                  className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-white transition cursor-pointer"
                                  title="Edit baris item ini"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-white transition cursor-pointer"
                                  title="Hapus baris ini dari dokumen kertas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">
                          Belum ada peralatan ditambahkan ke lembar kertas
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={6}
                      placeholder="Tuliskan rincian peralatan (satu per baris)&#10;Contoh:&#10;• Tenda Plafon VIP 4x12&#10;• Panggung Pelaminan 3x6&#10;• Kursi Futura 120 Pcs&#10;• Sound System Standard"
                      value={currentSchedule.orderDetails}
                      onChange={(e) =>
                        setCurrentSchedule((prev) => ({ ...prev, orderDetails: e.target.value }))
                      }
                      className="w-full font-mono text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-slate-50 focus:bg-white resize-y leading-relaxed"
                    />
                  </div>
                )}

                {/* Quick Preset Item Chips (Automatic Add & Edit) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Preset Cepat Peralatan (Klik untuk tambah & edit):</span>
                    </span>
                    <button
                      id="btn-manage-schedule-presets"
                      type="button"
                      onClick={() => setShowSchedulePresetManager(!showSchedulePresetManager)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                        showSchedulePresetManager
                          ? 'bg-[#8B0000] text-white border-[#8B0000]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title="Kelola, ubah nama, atau tambah preset peralatan baru"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>{showSchedulePresetManager ? 'Tutup Pengaturan' : 'Kelola / Edit Preset'}</span>
                    </button>
                  </div>

                  {/* Inline Manager: Kelola & Edit Preset Jadwal */}
                  {showSchedulePresetManager && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          <Edit3 className="w-3 h-3 text-[#8B0000]" />
                          Pengaturan Daftar Preset Jadwal
                        </span>
                        <button
                          type="button"
                          onClick={handleResetSchedulePresets}
                          className="text-[10px] text-slate-500 hover:text-red-700 flex items-center gap-1 transition"
                          title="Kembalikan semua preset ke pengaturan awal"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset ke Standar</span>
                        </button>
                      </div>

                      {/* Form Tambah Preset Jadwal Baru */}
                      <form onSubmit={handleAddSchedulePreset} className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Nama alat preset baru (cth: Panggung Rigging 8x10)"
                          value={newSchedulePresetText}
                          onChange={(e) => setNewSchedulePresetText(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-md transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#bef264]" />
                          <span>+ Tambah</span>
                        </button>
                      </form>

                      {/* List of Existing Schedule Presets with Edit & Delete */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {schedulePresets.map((preset, idx) => {
                          const isEditing = editingSchedulePresetIdx === idx;

                          if (isEditing) {
                            return (
                              <div
                                key={idx}
                                className="p-1.5 bg-amber-50 border border-amber-300 rounded-md flex items-center gap-1.5 text-xs"
                              >
                                <input
                                  type="text"
                                  value={editingSchedulePresetText}
                                  onChange={(e) => setEditingSchedulePresetText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditSchedulePreset(idx);
                                    if (e.key === 'Escape') setEditingSchedulePresetIdx(null);
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-0.5 bg-white border border-amber-300 rounded text-xs focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditSchedulePreset(idx)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition cursor-pointer"
                                  title="Simpan"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSchedulePresetIdx(null)}
                                  className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                                  title="Batal"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200 text-xs hover:border-slate-300 transition"
                            >
                              <span className="font-medium text-slate-800 truncate mr-2">
                                {preset}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSchedulePreset(idx, preset)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                  title="Edit preset ini"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSchedulePreset(idx)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Hapus preset ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {schedulePresets.map((item, idx) => (
                      <button
                        key={`${item}-${idx}`}
                        type="button"
                        onClick={() => handleAppendItem(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-[#8B0000] hover:text-white text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200 transition cursor-pointer active:scale-95 shadow-2xs"
                        title={`Klik untuk menambahkan "${item}" ke lembar kerja`}
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bagian 4: Catatan Khusus Lapangan */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold tracking-wider text-[#8B0000] uppercase">
                    4. Catatan Khusus & Akses Lokasi
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan Tambahan Lapangan / Akses Jalan
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Masuk gang kecil seberang masjid, koordinasi dengan Bpk RT Joko..."
                      value={currentSchedule.notes || ''}
                      onChange={(e) =>
                        setCurrentSchedule((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] bg-slate-50 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Paper Document Preview & Action Toolbar (Sticky) */}
            <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-20">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase">
                    <Eye className="w-4 h-4 text-[#8B0000]" />
                    <span>PREVIEW DOKUMEN CETAK SPK JADWAL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 font-bold">
                      Format: SPK Resmi Gapura
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Live Real-Time
                    </span>
                  </div>
                </div>

                {/* The Paper Preview (Word Grid Table) */}
                <div className="bg-slate-100 p-1 sm:p-4 rounded-xl overflow-x-auto flex justify-center border border-slate-200">
                  <ScheduleDocumentPreview ref={previewRef} schedule={currentSchedule} />
                </div>
              </div>

              {/* Action Toolbar directly underneath the paper preview */}
              <ScheduleActionButtons
                schedule={currentSchedule}
                previewRef={previewRef}
                onSaveSchedule={handleSaveCurrentSchedule}
                onClearForm={handleResetCurrentSchedule}
                onShowToast={onShowToast}
              />
            </div>
          </div>

          {/* Floating Action Button on Mobile: Jump to Live SPK Paper (Hides when preview is already in view) */}
          {!isPreviewInView && (
            <div className="lg:hidden fixed bottom-20 right-4 z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <button
                type="button"
                onClick={() => {
                  previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#8B0000] text-white rounded-full shadow-xl hover:bg-[#700000] active:scale-95 text-xs font-black border border-white/20 transition cursor-pointer"
                title="Gulir langsung ke lembar pratinjau kertas SPK"
              >
                <Eye className="w-4 h-4 text-[#bef264]" />
                <span>Lihat Kertas SPK</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: TABEL LAPORAN (WORD / SPREADSHEET TABLE REKAP) */
        <ScheduleTableReport
          schedules={activeSchedules}
          title="Laporan Tabel Jadwal Pemasangan & Bongkar Tenda"
          isHistory={false}
          availableInvoices={availableInvoices}
          onAddNewSchedule={handleCreateNew}
          onSaveSchedule={onSaveSchedule}
          onViewPreview={handleViewOrEditFromTable}
          onEdit={handleViewOrEditFromTable}
          onDelete={onDeleteSchedule}
          onShare={(s) => setSharingSchedule(s)}
          onToggleStatus={onUpdateStatus}
          onShowToast={onShowToast}
          onOpenBackup={onOpenBackup}
        />
      )}

      {/* Share Modal if triggered from the table */}
      <ScheduleShareModal
        isOpen={!!sharingSchedule}
        schedule={sharingSchedule}
        onClose={() => setSharingSchedule(null)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
