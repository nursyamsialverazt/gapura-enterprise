import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  Printer,
  FileDown,
  Plus,
  Share2,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  HardHat,
  CalendarDays,
  FileText,
  RotateCcw,
  Sparkles,
  BookOpen,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Eye,
  Database,
  ArrowLeft,
  Filter,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ScheduleItem, InvoiceData } from '../types';
import { formatDateTimeIndo } from '../utils/formatters';
import { ScheduleFormModal } from './ScheduleFormModal';
import { ScheduleShareModal } from './ScheduleShareModal';
import { ScheduleDocumentPreview } from './ScheduleDocumentPreview';

interface MonthlySchedulePageProps {
  schedules: ScheduleItem[];
  availableInvoices?: InvoiceData[];
  onSaveSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onClearAllHistory?: () => void;
  onUpdateStatus: (id: string, status: 'AKTIF' | 'SELESAI') => void;
  onNavigateToActive: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBackup?: () => void;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Common National Holidays & Important Days in Indonesia by month (1-indexed month)
const INDONESIA_HOLIDAYS_MAP: Record<number, Array<{ day: number; label: string; isRed?: boolean }>> = {
  1: [{ day: 1, label: 'Tahun Baru Masehi', isRed: true }, { day: 3, label: 'Hari Amal Bhakti Kemenag' }],
  2: [{ day: 9, label: 'Hari Pers Nasional' }],
  3: [{ day: 8, label: 'Hari Perempuan Internasional' }],
  4: [{ day: 21, label: 'Hari Kartini' }],
  5: [
    { day: 1, label: 'Hari Buruh Internasional', isRed: true },
    { day: 2, label: 'Hari Pendidikan Nasional' },
    { day: 20, label: 'Hari Kebangkitan Nasional' },
  ],
  6: [{ day: 1, label: 'Hari Lahir Pancasila', isRed: true }, { day: 24, label: 'Hari Bidan Nasional' }],
  7: [{ day: 1, label: 'Hari Bhayangkara' }, { day: 23, label: 'Hari Anak Nasional' }],
  8: [
    { day: 12, label: 'Hari UMKM Nasional' },
    { day: 14, label: 'Hari Pramuka' },
    { day: 17, label: 'Proklamasi Kemerdekaan RI', isRed: true },
    { day: 25, label: 'Maulid Nabi Muhammad SAW', isRed: true },
  ],
  9: [{ day: 9, label: 'Hari Olahraga Nasional' }, { day: 24, label: 'Hari Tani Nasional' }],
  10: [
    { day: 1, label: 'Hari Kesaktian Pancasila' },
    { day: 2, label: 'Hari Batik Nasional' },
    { day: 5, label: 'Hari TNI' },
    { day: 28, label: 'Hari Sumpah Pemuda' },
  ],
  11: [
    { day: 10, label: 'Hari Pahlawan' },
    { day: 12, label: 'Hari Kesehatan Nasional' },
    { day: 25, label: 'Hari Guru Nasional' },
  ],
  12: [
    { day: 22, label: 'Hari Ibu' },
    { day: 25, label: 'Hari Raya Natal', isRed: true },
  ],
};

export const MonthlySchedulePage: React.FC<MonthlySchedulePageProps> = ({
  schedules,
  availableInvoices = [],
  onSaveSchedule,
  onDeleteSchedule,
  onClearAllHistory,
  onUpdateStatus,
  onNavigateToActive,
  onShowToast,
  onOpenBackup,
}) => {
  // Current view state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(today.getMonth()); // 0-indexed or 'all'
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar' | 'table'>('agenda');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'SELESAI'>('ALL');
  const [sortBy, setSortBy] = useState<'eventDate' | 'setupDate'>('eventDate');

  // Modals & previews
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [previewSchedule, setPreviewSchedule] = useState<ScheduleItem | null>(null);
  const [shareSchedule, setShareSchedule] = useState<ScheduleItem | null>(null);
  const [copiedMonth, setCopiedMonth] = useState(false);
  const [copiedDayId, setCopiedDayId] = useState<string | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      if (typeof selectedYear === 'number') {
        setSelectedYear((prev) => (prev as number) - 1);
      }
      return;
    }
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      if (typeof selectedYear === 'number') {
        setSelectedYear((prev) => (prev as number) - 1);
      }
    } else {
      setSelectedMonth((prev) => (prev as number) - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      if (typeof selectedYear === 'number') {
        setSelectedYear((prev) => (prev as number) + 1);
      }
      return;
    }
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      if (typeof selectedYear === 'number') {
        setSelectedYear((prev) => (prev as number) + 1);
      }
    } else {
      setSelectedMonth((prev) => (prev as number) + 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  const handleToggleAllMonths = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(today.getMonth());
    } else {
      setSelectedMonth('all');
    }
  };

  // Helper to extract date key YYYY-MM-DD
  const getDateKey = (dateStr?: string) => {
    if (!dateStr) return '';
    return dateStr.slice(0, 10);
  };

  // Filter schedules for the selected month & year (supports 'all' for month or year)
  const monthSchedules = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const isSpecificMonth = selectedMonth !== 'all' && selectedYear !== 'all';
    const monthPrefix = isSpecificMonth
      ? `${selectedYear}-${pad((selectedMonth as number) + 1)}`
      : null;
    const yearPrefix = selectedYear !== 'all' ? `${selectedYear}-` : null;

    return schedules.filter((s) => {
      const targetDate = sortBy === 'eventDate' ? s.teardownDate : s.setupDate;
      const targetPrefix = targetDate ? targetDate.slice(0, 7) : '';
      const fallbackPrefix = s.setupDate ? s.setupDate.slice(0, 7) : '';

      // Match month if a specific month is selected
      if (monthPrefix) {
        const inThisMonth = targetPrefix === monthPrefix || fallbackPrefix === monthPrefix;
        if (!inThisMonth) return false;
      } else if (yearPrefix) {
        // All months in a specific year
        const inThisYear =
          (targetDate && targetDate.startsWith(yearPrefix)) ||
          (s.setupDate && s.setupDate.startsWith(yearPrefix));
        if (!inThisYear) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (s.customerName || '').toLowerCase().includes(q);
        const matchAddress = (s.address || '').toLowerCase().includes(q);
        const matchPhone = (s.phone || '').includes(q);
        const matchOrder = (s.orderDetails || '').toLowerCase().includes(q);
        const matchPic = (s.picCrew || '').toLowerCase().includes(q);
        return matchName || matchAddress || matchPhone || matchOrder || matchPic;
      }

      return true;
    });
  }, [schedules, selectedYear, selectedMonth, sortBy, statusFilter, searchTerm]);

  // Group schedules by Date (YYYY-MM-DD)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ScheduleItem[]> = {};

    monthSchedules.forEach((item) => {
      // Group by event date (teardownDate) or setupDate
      const dateKey =
        getDateKey(sortBy === 'eventDate' ? item.teardownDate : item.setupDate) ||
        getDateKey(item.setupDate) ||
        'Tanpa Tanggal';

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    // Sort dates chronologically
    const sortedDateKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    return sortedDateKeys.map((dateKey) => ({
      dateKey,
      items: groups[dateKey],
    }));
  }, [monthSchedules, sortBy]);

  // Grouped by Month Sections (for 'all' months view)
  const monthSections = useMemo(() => {
    if (selectedMonth !== 'all') {
      const label = `${MONTH_NAMES_ID[selectedMonth as number]} ${selectedYear}`;
      return [
        {
          monthKey: `${selectedYear}-${selectedMonth}`,
          monthName: MONTH_NAMES_ID[selectedMonth as number],
          year: selectedYear,
          label,
          dateGroups: groupedByDate,
          totalEvents: monthSchedules.length,
        },
      ];
    }

    // Group dates into their respective month (YYYY-MM)
    const map: Record<string, typeof groupedByDate> = {};

    groupedByDate.forEach((dg) => {
      const ym = dg.dateKey !== 'Tanpa Tanggal' ? dg.dateKey.slice(0, 7) : 'Lainnya';
      if (!map[ym]) {
        map[ym] = [];
      }
      map[ym].push(dg);
    });

    const sortedYMs = Object.keys(map).sort((a, b) => a.localeCompare(b));

    return sortedYMs.map((ym) => {
      if (ym === 'Lainnya') {
        return {
          monthKey: ym,
          monthName: 'Tanggal Lainnya',
          year: '',
          label: 'Jadwal Tanpa Tanggal Pasti',
          dateGroups: map[ym],
          totalEvents: map[ym].reduce((s, g) => s + g.items.length, 0),
        };
      }
      const parts = ym.split('-');
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const mName = mIdx >= 0 && mIdx < 12 ? MONTH_NAMES_ID[mIdx] : ym;
      const label = `${mName} ${y}`;
      return {
        monthKey: ym,
        monthName: mName,
        year: y,
        label,
        dateGroups: map[ym],
        totalEvents: map[ym].reduce((s, g) => s + g.items.length, 0),
      };
    });
  }, [groupedByDate, selectedMonth, selectedYear, monthSchedules.length]);

  // Available month pills for jump links
  const availableMonthPills = useMemo(() => {
    return monthSections.map((sec) => ({
      key: sec.monthKey,
      label: sec.monthName,
      year: sec.year,
      count: sec.totalEvents,
    }));
  }, [monthSections]);

  // National Holidays for the selected month (only if specific month is chosen)
  const currentMonthHolidays = useMemo(() => {
    if (selectedMonth === 'all') return [];
    return INDONESIA_HOLIDAYS_MAP[(selectedMonth as number) + 1] || [];
  }, [selectedMonth]);

  // Calendar dates generation (grid view for single month)
  const calendarDays = useMemo(() => {
    if (selectedMonth === 'all' || selectedYear === 'all') return [];

    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const totalDays = lastDay.getDate();

    // Monday as start of week: Monday=0 ... Sunday=6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days = [];
    const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        dateKey: '',
        events: [] as ScheduleItem[],
      });
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${selectedYear}-${pad((selectedMonth as number) + 1)}-${pad(d)}`;
      const dayEvents = schedules.filter((s) => {
        const evDate = (sortBy === 'eventDate' ? s.teardownDate : s.setupDate) || s.setupDate;
        return evDate?.startsWith(dateKey);
      });
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateKey,
        events: dayEvents,
      });
    }

    return days;
  }, [selectedYear, selectedMonth, schedules, sortBy]);

  // Year overview 12-month cards for 'all' months calendar view
  const yearMonthsOverview = useMemo(() => {
    const y = typeof selectedYear === 'number' ? selectedYear : today.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');

    return MONTH_NAMES_ID.map((name, idx) => {
      const ymPrefix = `${y}-${pad(idx + 1)}`;
      const eventsInMonth = schedules.filter((s) => {
        const targetDate = sortBy === 'eventDate' ? s.teardownDate : s.setupDate;
        return (
          (targetDate && targetDate.startsWith(ymPrefix)) ||
          (s.setupDate && s.setupDate.startsWith(ymPrefix))
        );
      });
      return {
        monthIndex: idx,
        monthName: name,
        year: y,
        count: eventsInMonth.length,
        events: eventsInMonth,
      };
    });
  }, [selectedYear, schedules, sortBy, today]);

  // Format single date header (e.g. "16 Agustus 2026")
  const formatDateHeader = (dateKey: string) => {
    if (!dateKey || dateKey === 'Tanpa Tanggal') return 'Tanggal Belum Ditentukan';
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${MONTH_NAMES_ID[m]} ${y}`;
  };

  const getDayName = (dateKey: string) => {
    if (!dateKey || dateKey === 'Tanpa Tanggal') return '';
    const parts = dateKey.split('-');
    if (parts.length !== 3) return '';
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return DAY_NAMES_ID[dateObj.getDay()];
  };

  // Parse lines of items cleanly (removing leading bullet points if any)
  const parseOrderLines = (orderDetails?: string) => {
    if (!orderDetails) return [];
    return orderDetails
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[•\-\*]\s*/, ''));
  };

  // Generate plain text agenda format matching image_816b0589.png
  const generateMonthAgendaText = () => {
    const periodLabel =
      selectedMonth === 'all'
        ? `SEMUA BULAN (${selectedYear === 'all' ? 'SEMUA TAHUN' : `TAHUN ${selectedYear}`})`
        : `BULAN: ${MONTH_NAMES_ID[selectedMonth as number].toUpperCase()} ${selectedYear}`;

    let text = `JADWAL TENDA & PERALATAN - GAPURA ENTERPRISE\n`;
    text += `${periodLabel}\n`;
    text += `====================================\n\n`;

    if (monthSections.length === 0 || monthSchedules.length === 0) {
      text += `(Belum ada agenda jadwal tenda pada periode ini)\n`;
      return text;
    }

    monthSections.forEach((sec) => {
      if (selectedMonth === 'all') {
        text += `\n=== ${sec.label.toUpperCase()} (${sec.totalEvents} ACARA) ===\n\n`;
      }

      sec.dateGroups.forEach((group) => {
        const dateLabel = formatDateHeader(group.dateKey);
        text += `${dateLabel}\n`;

        group.items.forEach((item, index) => {
          const itemNumber = index + 1;
          const locationOrName = item.address
            ? `${item.address} (${item.customerName})`
            : item.customerName;

          text += `${itemNumber}.${locationOrName}\n`;

          const lines = parseOrderLines(item.orderDetails);
          if (lines.length > 0) {
            lines.forEach((l) => {
              text += `${l}\n`;
            });
          } else {
            text += `- Tenda & peralatan standar\n`;
          }
          text += `\n`;
        });

        text += `------------------------------------\n`;
      });
    });

    text += `WA/Telp: 0821-1887-0862 • Gapura Enterprise`;
    return text;
  };

  // Copy entire month agenda text to clipboard
  const handleCopyMonthAgenda = async () => {
    try {
      const text = generateMonthAgendaText();
      await navigator.clipboard.writeText(text);
      setCopiedMonth(true);
      const label =
        selectedMonth === 'all'
          ? 'Semua bulan'
          : `Bulan ${MONTH_NAMES_ID[selectedMonth as number]}`;
      onShowToast(`Agenda ${label} berhasil disalin ke format WhatsApp!`, 'success');
      setTimeout(() => setCopiedMonth(false), 3000);
    } catch {
      onShowToast('Gagal menyalin agenda ke clipboard', 'error');
    }
  };

  // Copy single day agenda text to clipboard
  const handleCopyDayAgenda = async (dateKey: string, items: ScheduleItem[]) => {
    try {
      const dateLabel = formatDateHeader(dateKey);
      let text = `JADWAL TENDA - GAPURA ENTERPRISE\n`;
      text += `${dateLabel}\n`;
      text += `====================================\n`;

      items.forEach((item, index) => {
        const itemNumber = index + 1;
        const locationOrName = item.address
          ? `${item.address} (${item.customerName})`
          : item.customerName;

        text += `${itemNumber}.${locationOrName}\n`;
        const lines = parseOrderLines(item.orderDetails);
        if (lines.length > 0) {
          lines.forEach((l) => {
            text += `${l}\n`;
          });
        }
        if (item.setupDate) {
          text += `[Estimasi Pasang: ${formatDateTimeIndo(item.setupDate)}]\n`;
        }
        text += `\n`;
      });

      await navigator.clipboard.writeText(text);
      setCopiedDayId(dateKey);
      onShowToast(`Agenda tanggal ${dateLabel} berhasil disalin!`, 'success');
      setTimeout(() => setCopiedDayId(null), 2500);
    } catch {
      onShowToast('Gagal menyalin agenda hari ini', 'error');
    }
  };

  // Open modal to add schedule on specific date
  const handleAddNewOnDate = (dateKey?: string) => {
    let defaultSetup = '';
    let defaultTeardown = '';
    if (dateKey && dateKey !== 'Tanpa Tanggal') {
      defaultSetup = `${dateKey}T08:30`;
      defaultTeardown = `${dateKey}T17:00`;
    }
    setEditingSchedule({
      id: '',
      customerName: '',
      address: '',
      phone: '',
      orderDetails: '',
      setupDate: defaultSetup,
      teardownDate: defaultTeardown,
      status: 'AKTIF',
      picCrew: '',
      notes: '',
      createdAt: new Date().toISOString(),
    });
    setIsFormModalOpen(true);
  };

  const handleEditItem = (item: ScheduleItem) => {
    setEditingSchedule(item);
    setIsFormModalOpen(true);
  };

  const cleanPhoneForWa = (p?: string) => {
    if (!p) return '';
    let clean = p.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
  };

  const activeCount = monthSchedules.filter((s) => s.status === 'AKTIF').length;
  const completedCount = monthSchedules.filter((s) => s.status === 'SELESAI').length;

  const currentDisplayLabel =
    selectedMonth === 'all'
      ? `Semua Bulan ${selectedYear === 'all' ? '(Semua Tahun)' : selectedYear}`
      : `${MONTH_NAMES_ID[selectedMonth as number]} ${selectedYear}`;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & MONTH NAVIGATION BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Current Scope */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="p-1.5 rounded-lg bg-[#8B0000]/10 text-[#8B0000]">
                <CalendarDays className="w-5 h-5 text-[#8B0000]" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Jadwal per Bulan & Agenda Lapangan
              </h2>
              <span className="bg-[#bef264] text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {currentDisplayLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Lihat agenda per bulan maupun semua bulan sepanjang tahun dengan format buku catatan lapangan kru
            </p>
          </div>

          {/* Month & Year Selectors with "Semua Bulan" option */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition cursor-pointer"
                title={selectedMonth === 'all' ? 'Tahun Sebelumnya' : 'Bulan Sebelumnya'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2.5">
                {/* Month Dropdown with 'all' option */}
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMonth(val === 'all' ? 'all' : parseInt(val, 10));
                  }}
                  aria-label="Pilih Bulan"
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">📅 Semua Bulan (1 Tahun Penuh)</option>
                  {MONTH_NAMES_ID.map((m, idx) => (
                    <option key={m} value={idx}>
                      Bulan: {m}
                    </option>
                  ))}
                </select>

                <span className="text-slate-300">/</span>

                {/* Year Dropdown with 'all' option */}
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedYear(val === 'all' ? 'all' : parseInt(val, 10));
                  }}
                  aria-label="Pilih Tahun"
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Tahun</option>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition cursor-pointer"
                title={selectedMonth === 'all' ? 'Tahun Selanjutnya' : 'Bulan Selanjutnya'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Toggle: Semua Bulan Button */}
            <button
              type="button"
              onClick={handleToggleAllMonths}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                selectedMonth === 'all'
                  ? 'bg-[#8B0000] text-white border-[#8B0000] shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Tampilkan seluruh bulan dalam 1 halaman agenda"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{selectedMonth === 'all' ? '✓ Semua Bulan' : 'Semua Bulan'}</span>
            </button>

            {/* Current Month Button */}
            <button
              type="button"
              onClick={handleGoToCurrentMonth}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
            >
              Bulan Ini
            </button>

            {/* Add Schedule Button */}
            <button
              type="button"
              onClick={() => handleAddNewOnDate()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jadwal</span>
            </button>
          </div>
        </div>

        {/* 2. TOOLBAR: VIEW SWITCHER, SEARCH, FILTER, AND EXPORT BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'agenda'
                  ? 'bg-[#8B0000] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Agenda Format Catatan HP / Buku (Sesuai Contoh)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Format Agenda Buku</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#8B0000] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Kalender Kotak Bulanan"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kalender Kotak</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table'
                  ? 'bg-white text-[#8B0000] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Tabel Rekap Lengkap"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Rekap</span>
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 flex-wrap flex-1 sm:justify-end">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, alamat, alat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter Status"
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Status ({monthSchedules.length})</option>
              <option value="AKTIF">Hanya Aktif ({activeCount})</option>
              <option value="SELESAI">Hanya Selesai ({completedCount})</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Urutkan Tanggal"
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
            >
              <option value="eventDate">Urut: Tanggal Acara</option>
              <option value="setupDate">Urut: Estimasi Pasang</option>
            </select>

            {/* Copy WhatsApp Agenda Text Button */}
            <button
              type="button"
              onClick={handleCopyMonthAgenda}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                copiedMonth
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title="Salin seluruh agenda periode ini ke format teks WhatsApp kru"
            >
              {copiedMonth ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Salin Teks WA</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition cursor-pointer"
              title="Cetak Agenda Jadwal"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. MONTH JUMP PILLS (WHEN VIEWING "SEMUA BULAN") */}
        {selectedMonth === 'all' && availableMonthPills.length > 1 && (
          <div className="pt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#8B0000]" />
              <span>Lompat ke Bulan:</span>
            </span>
            {availableMonthPills.map((pill) => (
              <a
                key={pill.key}
                href={`#section-${pill.key}`}
                className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-[#8B0000] hover:text-white text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1"
              >
                <span>
                  {pill.label} {pill.year}
                </span>
                <span className="px-1.5 py-0.2 bg-white text-slate-800 rounded-full text-[10px] font-mono group-hover:bg-amber-100">
                  {pill.count}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* 4. NATIONAL HOLIDAY BANNER (FOR SINGLE MONTH VIEW) */}
        {selectedMonth !== 'all' && currentMonthHolidays.length > 0 && (
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 text-xs text-rose-950">
            <div className="font-bold flex items-center gap-1.5 text-rose-900 mb-1">
              <CalendarIcon className="w-3.5 h-3.5 text-rose-700" />
              <span>
                Catatan Hari Penting & Libur Nasional ({MONTH_NAMES_ID[selectedMonth as number]}{' '}
                {selectedYear}):
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
              {currentMonthHolidays.map((h) => (
                <span
                  key={h.day}
                  className={h.isRed ? 'text-rose-700 font-black' : 'text-slate-700 font-semibold'}
                >
                  <strong className={h.isRed ? 'text-rose-800' : 'text-slate-900'}>
                    {h.day} :
                  </strong>{' '}
                  {h.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= VIEW 1: FORMAT AGENDA BUKU / CATATAN HP (PERSIS SEPERTI SCREENSHOT) ================= */}
      {viewMode === 'agenda' && (
        <div className="space-y-6">
          {monthSections.length === 0 || monthSchedules.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">
                Belum Ada Jadwal Pada Periode {currentDisplayLabel}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Silakan tambahkan jadwal baru atau pilih bulan/tahun lain dari menu di atas.
              </p>
              <button
                type="button"
                onClick={() => handleAddNewOnDate()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#8B0000] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#700000] transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Jadwal Baru</span>
              </button>
            </div>
          ) : (
            monthSections.map((section) => (
              <div
                key={section.monthKey}
                id={`section-${section.monthKey}`}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-6"
              >
                {/* Month Section Header */}
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-[#8B0000] text-white">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                        {section.label}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Agenda kerja lapangan & rincian alat per tanggal acara
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {section.totalEvents} Acara
                    </span>
                    {selectedMonth === 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          const parts = section.monthKey.split('-');
                          if (parts.length === 2) {
                            setSelectedYear(parseInt(parts[0], 10));
                            setSelectedMonth(parseInt(parts[1], 10) - 1);
                          }
                        }}
                        className="text-xs font-bold text-[#8B0000] hover:underline flex items-center gap-1"
                      >
                        <span>Fokus Bulan Ini</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Date Groups under this month */}
                <div className="space-y-6">
                  {section.dateGroups.map((group) => {
                    const dateLabel = formatDateHeader(group.dateKey);
                    const dayName = getDayName(group.dateKey);

                    return (
                      <div
                        key={group.dateKey}
                        id={`agenda-date-${group.dateKey}`}
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition"
                      >
                        {/* Header Tanggal Besar (Persis screenshot: "16 Agustus 2026") */}
                        <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#8B0000]"></span>
                            <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                              {dateLabel}
                            </h4>
                            {dayName && (
                              <span className="text-xs font-bold text-[#8B0000] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {dayName}
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({group.items.length} Pekerjaan)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Copy specific day text */}
                            <button
                              type="button"
                              onClick={() => handleCopyDayAgenda(group.dateKey, group.items)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                copiedDayId === group.dateKey
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                              title="Salin teks acara tanggal ini untuk WhatsApp"
                            >
                              {copiedDayId === group.dateKey ? (
                                <>
                                  <Check className="w-3 h-3 text-white" />
                                  <span>Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-600" />
                                  <span>Salin Teks Hari Ini</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAddNewOnDate(group.dateKey)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 transition cursor-pointer"
                              title="Tambah pekerjaan di tanggal ini"
                            >
                              <Plus className="w-3 h-3 text-amber-700" />
                              <span>+ Acara di Tanggal Ini</span>
                            </button>
                          </div>
                        </div>

                        {/* Daftar Acara Bernomor di Tanggal Ini (Persis Screenshot) */}
                        <div className="p-4 sm:p-5 space-y-5 bg-white divide-y divide-slate-100">
                          {group.items.map((item, itemIdx) => {
                            const orderLines = parseOrderLines(item.orderDetails);

                            return (
                              <div
                                key={item.id}
                                className={`pt-4 first:pt-0 space-y-2.5 ${
                                  item.status === 'SELESAI' ? 'opacity-80' : ''
                                }`}
                              >
                                {/* Baris Judul: [Nomor]. [Alamat / Lokasi] [Nama Tuan Hajat] */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-start gap-2">
                                    <span className="font-black text-[#8B0000] text-sm sm:text-base mt-0.5">
                                      {itemIdx + 1}.
                                    </span>
                                    <div>
                                      <h5 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                        {item.address ? (
                                          <>
                                            <span className="text-slate-900 font-extrabold">
                                              {item.address}
                                            </span>{' '}
                                            <span className="text-slate-600 font-medium">
                                              ({item.customerName})
                                            </span>
                                          </>
                                        ) : (
                                          <span>{item.customerName}</span>
                                        )}
                                      </h5>

                                      {/* Quick metadata chips */}
                                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap font-sans">
                                        {item.phone && (
                                          <a
                                            href={`https://wa.me/${cleanPhoneForWa(item.phone)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded"
                                          >
                                            <Phone className="w-3 h-3 text-emerald-600" />
                                            <span>{item.phone}</span>
                                          </a>
                                        )}

                                        {item.setupDate && (
                                          <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-semibold">
                                            <Clock className="w-3 h-3 text-amber-700" />
                                            <span>Pasang: {formatDateTimeIndo(item.setupDate)}</span>
                                          </span>
                                        )}

                                        {item.teardownDate && (
                                          <span className="inline-flex items-center gap-1 text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 font-semibold">
                                            <CalendarIcon className="w-3 h-3 text-blue-700" />
                                            <span>Acara: {formatDateTimeIndo(item.teardownDate)}</span>
                                          </span>
                                        )}

                                        {item.picCrew && (
                                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                                            <HardHat className="w-3 h-3 text-amber-700" />
                                            <span>PIC: {item.picCrew}</span>
                                          </span>
                                        )}

                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                            item.status === 'SELESAI'
                                              ? 'bg-slate-100 text-slate-600 border border-slate-300'
                                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          }`}
                                        >
                                          {item.status === 'SELESAI' ? 'SELESAI BONGKAR' : 'AKTIF'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex items-center gap-1 sm:self-start shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewSchedule(item)}
                                      className="p-1.5 text-slate-600 hover:text-[#8B0000] hover:bg-slate-100 rounded-lg transition"
                                      title="Lihat Lembar SPK Cetak"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setShareSchedule(item)}
                                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                      title="Bagikan ke WhatsApp Kru"
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleEditItem(item)}
                                      className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                      title="Edit Jadwal Ini"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateStatus(
                                          item.id,
                                          item.status === 'AKTIF' ? 'SELESAI' : 'AKTIF'
                                        )
                                      }
                                      className={`p-1.5 rounded-lg transition ${
                                        item.status === 'AKTIF'
                                          ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                          : 'text-emerald-600 hover:text-amber-600 hover:bg-amber-50'
                                      }`}
                                      title={
                                        item.status === 'AKTIF'
                                          ? 'Tandai Selesai Bongkar'
                                          : 'Kembalikan ke Status Aktif'
                                      }
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Hapus jadwal "${item.customerName}"?`)) {
                                          onDeleteSchedule(item.id);
                                          onShowToast('Jadwal berhasil dihapus', 'info');
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Hapus Jadwal"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Rincian Peralatan Baris demi Baris (Sesuai Format Screenshot) */}
                                <div className="ml-5 sm:ml-6 pl-3 border-l-2 border-slate-200 space-y-1">
                                  {orderLines.length > 0 ? (
                                    orderLines.map((line, lIdx) => (
                                      <div
                                        key={lIdx}
                                        className="font-mono text-xs sm:text-sm text-slate-800 leading-snug tracking-tight"
                                      >
                                        {line}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-slate-400 italic">
                                      Belum ada rincian peralatan tenda
                                    </div>
                                  )}

                                  {item.notes && (
                                    <div className="mt-1 text-xs text-amber-800 bg-amber-50/70 p-1.5 rounded border border-amber-200/60 font-sans">
                                      <strong>Catatan:</strong> {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= VIEW 2: KALENDER KOTAK (GRID VIEW) ================= */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#8B0000]" />
              <span>Kalender Kotak — {currentDisplayLabel}</span>
            </h3>
            <span className="text-xs text-slate-500">
              {selectedMonth === 'all'
                ? 'Tinjauan seluruh bulan dalam setahun'
                : 'Klik tanggal untuk menambah atau melihat agenda'}
            </span>
          </div>

          {/* If "Semua Bulan" is selected, render a 12-Month Overview Grid */}
          {selectedMonth === 'all' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {yearMonthsOverview.map((item) => (
                <div
                  key={item.monthName}
                  onClick={() => {
                    setSelectedMonth(item.monthIndex);
                  }}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                    item.count > 0
                      ? 'bg-amber-50/40 border-amber-300 hover:border-[#8B0000] hover:shadow-md'
                      : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">{item.monthName}</h4>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.count > 0
                          ? 'bg-[#8B0000] text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.count} Acara
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1 my-2">
                    {item.events.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[11px] truncate text-slate-700 bg-white/80 p-1 rounded border border-slate-200 font-semibold"
                      >
                        • {ev.customerName}
                      </div>
                    ))}
                    {item.count > 3 && (
                      <div className="text-[10px] text-slate-500 font-bold">
                        +{item.count - 3} acara lainnya...
                      </div>
                    )}
                    {item.count === 0 && (
                      <div className="text-[11px] text-slate-400 italic py-2">
                        Belum ada jadwal
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="w-full mt-2 py-1 text-center text-xs font-bold text-[#8B0000] bg-white rounded-lg border border-slate-200 hover:bg-[#8B0000] hover:text-white transition"
                  >
                    Buka Kalender {item.monthName} →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Single Month 7-day grid */
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`py-2 text-center text-xs font-black uppercase rounded-lg ${
                    idx === 6 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {dayName}
                </div>
              ))}

              {calendarDays.map((cell, idx) => {
                const isToday =
                  cell.isCurrentMonth &&
                  today.getFullYear() === selectedYear &&
                  today.getMonth() === selectedMonth &&
                  today.getDate() === cell.dayNumber;

                const hasEvents = cell.events.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.isCurrentMonth && cell.dateKey) {
                        handleAddNewOnDate(cell.dateKey);
                      }
                    }}
                    className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/60 text-slate-300 border-slate-100'
                        : isToday
                        ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/40'
                        : hasEvents
                        ? 'bg-white border-[#8B0000]/30 hover:border-[#8B0000]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold ${
                          !cell.isCurrentMonth
                            ? 'text-slate-300'
                            : isToday
                            ? 'w-5 h-5 rounded-full bg-[#8B0000] text-white flex items-center justify-center text-[10px]'
                            : hasEvents
                            ? 'text-[#8B0000]'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasEvents && (
                        <span className="text-[10px] font-black bg-[#8B0000] text-white px-1.5 py-0.2 rounded-full">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                      {cell.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewSchedule(ev);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-semibold transition ${
                            ev.status === 'SELESAI'
                              ? 'bg-slate-100 text-slate-600 line-through'
                              : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                          }`}
                          title={`${ev.customerName} - ${ev.address || ''}`}
                        >
                          {ev.customerName}
                        </div>
                      ))}
                      {cell.events.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-bold px-1">
                          +{cell.events.length - 2} lainnya
                        </div>
                      )}
                    </div>

                    {cell.isCurrentMonth && (
                      <div className="text-[9px] text-slate-300 text-right hover:text-slate-600 font-mono">
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 3: TABEL REKAP BULANAN ================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#8B0000]" />
              <span>Tabel Rekap Jadwal — {currentDisplayLabel}</span>
            </h3>
            <span className="text-xs text-slate-500">{monthSchedules.length} baris data ditemukan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#8B0000] text-white text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-10">No</th>
                  <th className="py-3 px-3 min-w-[150px]">Tuan Hajat</th>
                  <th className="py-3 px-3 min-w-[150px]">Alamat / Lokasi</th>
                  <th className="py-3 px-3 min-w-[140px]">Estimasi Pasang</th>
                  <th className="py-3 px-3 min-w-[140px]">Tanggal Acara</th>
                  <th className="py-3 px-3 min-w-[200px]">Rincian Tenda & Alat</th>
                  <th className="py-3 px-3 min-w-[110px] text-center">Status</th>
                  <th className="py-3 px-3 text-center min-w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthSchedules.length > 0 ? (
                  monthSchedules.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.customerName}</div>
                        {item.phone && <div className="text-[11px] text-slate-500">{item.phone}</div>}
                      </td>
                      <td className="py-3 px-3">{item.address || '-'}</td>
                      <td className="py-3 px-3 font-semibold text-amber-900">
                        {item.setupDate ? formatDateTimeIndo(item.setupDate) : '-'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-blue-900">
                        {item.teardownDate ? formatDateTimeIndo(item.teardownDate) : '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-pre-line">
                        {item.orderDetails || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SELESAI'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {item.status === 'SELESAI' ? 'SELESAI' : 'AKTIF'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewSchedule(item)}
                            className="p-1 hover:text-[#8B0000] hover:bg-slate-100 rounded"
                            title="Preview SPK"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-1 hover:text-amber-700 hover:bg-amber-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateStatus(
                                item.id,
                                item.status === 'AKTIF' ? 'SELESAI' : 'AKTIF'
                              )
                            }
                            className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Ubah Status"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada data jadwal untuk {currentDisplayLabel}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT SCHEDULE ================= */}
      {isFormModalOpen && (
        <ScheduleFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingSchedule(null);
          }}
          onSave={(item) => {
            onSaveSchedule(item);
            setIsFormModalOpen(false);
            setEditingSchedule(null);
          }}
          initialData={editingSchedule}
          availableInvoices={availableInvoices}
          onShowToast={onShowToast}
        />
      )}

      {/* ================= MODAL: PREVIEW SPK DOKUMEN CETAK ================= */}
      {previewSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Surat Perintah Kerja (SPK) — {previewSchedule.customerName}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300 font-bold">
                    SPK Resmi Gapura
                  </span>
                </div>
                <p className="text-xs text-slate-500">Pratinjau lembar instruksi resmi kru lapangan</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSchedule(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <ScheduleDocumentPreview schedule={previewSchedule} />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShareSchedule(previewSchedule);
                  setPreviewSchedule(null);
                }}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Bagikan ke WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar SPK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SHARE TO WHATSAPP ================= */}
      {shareSchedule && (
        <ScheduleShareModal
          isOpen={!!shareSchedule}
          onClose={() => setShareSchedule(null)}
          schedule={shareSchedule}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
