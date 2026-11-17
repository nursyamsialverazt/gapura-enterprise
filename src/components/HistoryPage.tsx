import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  Edit3,
  DollarSign,
  TrendingUp,
  Receipt,
  X,
  AlertTriangle,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Check,
  RotateCcw,
  Database,
} from 'lucide-react';
import { InvoiceData } from '../types';
import { formatRupiah } from '../utils/formatters';

interface HistoryPageProps {
  invoices: InvoiceData[];
  onLoadInvoice: (invoice: InvoiceData) => void;
  onDeleteInvoice: (id: string) => void;
  onClearAllInvoices?: () => void;
  onUpdateInvoiceStatus?: (id: string, status: 'LUNAS' | 'BELUM_LUNAS' | 'AUTO') => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBackup?: () => void;
}

const INDONESIAN_MONTHS = [
  'januari',
  'februari',
  'maret',
  'april',
  'mei',
  'juni',
  'juli',
  'agustus',
  'september',
  'oktober',
  'november',
  'desember',
];

// Helper to extract date keywords and formats for flexible search
const getDateSearchStrings = (dateStr?: string): string[] => {
  if (!dateStr) return [];
  const results: string[] = [dateStr.toLowerCase()];

  // If date format is DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let day = '';
    let monthNum = 0;
    let year = '';

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parts[0];
      monthNum = parseInt(parts[1], 10);
      day = parts[2];
    } else {
      // DD-MM-YYYY
      day = parts[0];
      monthNum = parseInt(parts[1], 10);
      year = parts[2];
    }

    if (monthNum >= 1 && monthNum <= 12) {
      const monthName = INDONESIAN_MONTHS[monthNum - 1];
      results.push(monthName);
      results.push(`${day} ${monthName} ${year}`.toLowerCase());
      results.push(`${monthName} ${year}`.toLowerCase());
      results.push(`${day}/${monthNum}/${year}`);
      results.push(`${day}-${monthNum}-${year}`);
      results.push(
        `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      );
    }
  }

  return results;
};

export const HistoryPage: React.FC<HistoryPageProps> = ({
  invoices,
  onLoadInvoice,
  onDeleteInvoice,
  onClearAllInvoices,
  onUpdateInvoiceStatus,
  onShowToast,
  onOpenBackup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD from datepicker
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);

  // Close status dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!statusMenuOpenId) return;
    const handleGlobalClick = () => {
      setStatusMenuOpenId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStatusMenuOpenId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [statusMenuOpenId]);
  
  // Custom delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Financial statistics
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalDP = 0;
    let totalSisa = 0;
    let paidCount = 0;

    invoices.forEach((inv) => {
      const invGross = inv.items.reduce(
        (sum, item) => sum + (item.quantity * item.price || 0),
        0
      );
      const dp = inv.downPayment || 0;
      const sisa = Math.max(0, invGross - dp);

      totalGross += invGross;
      totalDP += dp;
      totalSisa += sisa;

      const isLunas =
        inv.paymentStatus === 'LUNAS'
          ? true
          : inv.paymentStatus === 'BELUM_LUNAS'
          ? false
          : sisa <= 0 && invGross > 0;

      if (isLunas) {
        paidCount++;
      }
    });

    return {
      count: invoices.length,
      totalGross,
      totalDP,
      totalSisa,
      paidCount,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const query = searchQuery.toLowerCase().trim();

      // 1. Text Search across name, address, number, and dates
      let matchQuery = true;
      if (query) {
        const eventDateKeywords = getDateSearchStrings(inv.eventDate);
        let createdDateKeywords: string[] = [];
        if (inv.createdAt) {
          try {
            const d = new Date(inv.createdAt);
            const dDay = String(d.getDate()).padStart(2, '0');
            const dMonth = String(d.getMonth() + 1).padStart(2, '0');
            const dYear = d.getFullYear();
            createdDateKeywords = getDateSearchStrings(`${dDay}-${dMonth}-${dYear}`);
          } catch {
            // ignore
          }
        }

        const matchName = inv.customerName?.toLowerCase().includes(query);
        const matchAddress = inv.address?.toLowerCase().includes(query);
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(query);
        const matchEventDate = eventDateKeywords.some((k) => k.includes(query));
        const matchCreatedDate = createdDateKeywords.some((k) => k.includes(query));

        matchQuery = !!(
          matchName ||
          matchAddress ||
          matchNumber ||
          matchEventDate ||
          matchCreatedDate
        );
      }

      // 2. Specific Date Picker Filter (matching event date or created date)
      let matchDateFilter = true;
      if (filterDate) {
        // filterDate format is YYYY-MM-DD
        const [fY, fM, fD] = filterDate.split('-');
        const formattedTarget1 = `${fD}-${fM}-${fY}`; // DD-MM-YYYY
        const formattedTarget2 = `${parseInt(fD, 10)}-${parseInt(fM, 10)}-${fY}`;
        const formattedTargetISO = filterDate;

        const eventDateMatches =
          inv.eventDate?.includes(formattedTarget1) ||
          inv.eventDate?.includes(formattedTarget2) ||
          inv.eventDate?.includes(formattedTargetISO);

        let createdDateMatches = false;
        if (inv.createdAt) {
          createdDateMatches = inv.createdAt.startsWith(filterDate);
        }

        matchDateFilter = !!(eventDateMatches || createdDateMatches);
      }

      // 3. Status filter
      const invGross = inv.items.reduce(
        (sum, item) => sum + (item.quantity * item.price || 0),
        0
      );
      const remaining = invGross - (inv.downPayment || 0);
      const isPaid =
        inv.paymentStatus === 'LUNAS'
          ? true
          : inv.paymentStatus === 'BELUM_LUNAS'
          ? false
          : remaining <= 0;

      let matchStatus = true;
      if (selectedStatus === 'paid') matchStatus = isPaid;
      if (selectedStatus === 'unpaid') matchStatus = !isPaid;

      return matchQuery && matchDateFilter && matchStatus;
    });
  }, [invoices, searchQuery, filterDate, selectedStatus]);

  // Change status (Lunas / Belum Lunas / Otomatis)
  const handleSelectStatus = (
    inv: InvoiceData,
    newStatus: 'LUNAS' | 'BELUM_LUNAS' | 'AUTO',
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStatusMenuOpenId(null);
    const invId = inv.id || inv.invoiceNumber;
    if (onUpdateInvoiceStatus) {
      onUpdateInvoiceStatus(invId, newStatus);
    }
    const label =
      newStatus === 'LUNAS'
        ? 'LUNAS'
        : newStatus === 'BELUM_LUNAS'
        ? 'BELUM LUNAS'
        : 'OTOMATIS (Sesuai DP)';
    onShowToast(
      `Status nota "${inv.customerName || inv.invoiceNumber}" berhasil diubah ke ${label}.`,
      'success'
    );
  };

  // Trigger modal confirmation
  const handleOpenDelete = (id: string, name: string) => {
    setItemToDelete({ id, name });
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    const targetName = itemToDelete.name;
    
    setItemToDelete(null);
    onDeleteInvoice(targetId);
    onShowToast(`Nota atas nama "${targetName || 'Pelanggan'}" telah berhasil dihapus.`, 'info');
  };

  // Confirm delete all action
  const handleConfirmDeleteAll = () => {
    setShowDeleteAllModal(false);
    if (onClearAllInvoices) {
      onClearAllInvoices();
      onShowToast('Semua riwayat data nota telah berhasil dihapus.', 'info');
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Delete Single Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            id="delete-confirm-modal"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Riwayat Nota?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus nota atas nama{' '}
                <strong className="text-slate-800">
                  {itemToDelete.name || 'Pelanggan Ini'}
                </strong>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                id="btn-cancel-delete"
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition active:scale-95"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-action"
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Data Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            id="delete-all-confirm-modal"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto ring-8 ring-red-50">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-red-950">
                Hapus Semua Riwayat Data?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan menghapus seluruh data riwayat nota (
                <strong className="text-red-700 font-bold">
                  {invoices.length} transaksi
                </strong>
                ) yang tersimpan di perangkat ini.
              </p>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-left text-[11px] text-amber-900 leading-normal">
                ⚠️ <strong>Perhatian:</strong> Data yang sudah dihapus tidak dapat dipulihkan kembali. Pastikan Anda telah menyimpan atau mencetak nota yang diperlukan.
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                id="btn-cancel-delete-all"
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition active:scale-95"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-all-action"
                type="button"
                onClick={handleConfirmDeleteAll}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Semua Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Total Nota</span>
            <Receipt className="w-4 h-4 text-[#8B0000]" />
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.count} Transaksi</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {stats.paidCount} Lunas
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Total Nilai</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 truncate">
            {formatRupiah(stats.totalGross)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Semua Acara</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>DP Masuk</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 truncate">
            {formatRupiah(stats.totalDP)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Uang Muka Diterima</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Sisa Piutang</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-red-700 truncate">
            {formatRupiah(stats.totalSisa)}
          </div>
          <div className="text-[11px] text-red-600 font-medium mt-0.5">Belum Lunas</div>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="md:col-span-7 relative">
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, alamat, no nota, atau ketik tgl (cth: 28-08 / agustus)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:bg-white outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Picker Filter */}
          <div className="md:col-span-5 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="history-date-filter"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#8B0000] focus:bg-white outline-none transition cursor-pointer"
                title="Pilih tanggal khusus untuk filter"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-2 rounded-lg font-medium transition flex items-center gap-1 shrink-0"
                title="Reset filter tanggal"
              >
                <X className="w-3 h-3" />
                Reset Tgl
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Quick Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Status:
            </span>
            {(['all', 'unpaid', 'paid'] as const).map((status) => {
              const label =
                status === 'all'
                  ? 'Semua'
                  : status === 'unpaid'
                  ? 'Belum Lunas'
                  : 'Lunas';
              const isActive = selectedStatus === status;
              return (
                <button
                  key={status}
                  id={`filter-status-${status}`}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    isActive
                      ? 'bg-[#8B0000] text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Action buttons: Reset Filters & Hapus Semua Data */}
          <div className="flex items-center gap-2">
            {(searchQuery || filterDate || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-[#8B0000] hover:text-red-800 font-semibold underline mr-1"
              >
                Reset Filter
              </button>
            )}

            {onOpenBackup && (
              <button
                id="btn-backup-history-nota"
                type="button"
                onClick={onOpenBackup}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg transition active:scale-95 shadow-2xs cursor-pointer"
                title="Cadangkan & Pulihkan data riwayat nota"
              >
                <Database className="w-3.5 h-3.5 text-amber-700" />
                <span>Backup Data Nota</span>
              </button>
            )}

            {invoices.length > 0 && (
              <button
                id="btn-trigger-delete-all"
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition active:scale-95"
                title="Hapus semua data riwayat transaksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Semua Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-[#8B0000] rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">
            {searchQuery || filterDate
              ? 'Tidak Ada Nota yang Cocok'
              : 'Belum Ada Riwayat Nota'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || filterDate
              ? `Tidak ditemukan nota dengan kriteria pencarian saat ini. Coba ubah tanggal atau kata kunci.`
              : 'Mulai buat nota baru di tab "Buat Nota", lalu simpan untuk melihat riwayat di sini.'}
          </p>
          {(searchQuery || filterDate || selectedStatus !== 'all') && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="mt-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Tampilkan Semua Nota
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => {
            const invGross = inv.items.reduce(
              (sum, item) => sum + (item.quantity * item.price || 0),
              0
            );
            const dp = inv.downPayment || 0;
            const remaining = invGross - dp;
            const isLunas =
              inv.paymentStatus === 'LUNAS'
                ? true
                : inv.paymentStatus === 'BELUM_LUNAS'
                ? false
                : remaining <= 0;
            const isManualStatus = !!inv.paymentStatus;
            const invKey = inv.id || inv.invoiceNumber || String(inv.createdAt);
            const isMenuOpen = statusMenuOpenId === invKey;

            return (
              <div
                key={invKey}
                id={`history-item-${invKey}`}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {inv.invoiceNumber || 'GE-NOTA'}
                      </span>

                      {/* Interactive Clickable Status Badge with Dropdown */}
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setStatusMenuOpenId(isMenuOpen ? null : invKey)}
                          title="Klik untuk memilih opsi Lunas atau Belum Lunas"
                          className={`group inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                            isLunas
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          } ${isMenuOpen ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                        >
                          {isLunas ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>LUNAS</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>BELUM LUNAS</span>
                              {remaining > 0 && (
                                <span className="font-normal text-[10px] text-amber-700 ml-0.5">
                                  ({formatRupiah(remaining)})
                                </span>
                              )}
                            </>
                          )}
                          <ChevronDown
                            className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
                              isMenuOpen ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-800'
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu Options */}
                        {isMenuOpen && (
                          <div
                            className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1.5 flex items-center justify-between">
                              <div>
                                <div className="text-[11px] font-bold text-slate-800">Pilih Status Nota</div>
                                <div className="text-[10px] text-slate-400">Klik untuk mengganti status:</div>
                              </div>
                              {isManualStatus ? (
                                <span className="text-[9px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                                  Manual
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                                  Otomatis
                                </span>
                              )}
                            </div>

                            {/* Option 1: LUNAS */}
                            <button
                              type="button"
                              onClick={(e) => handleSelectStatus(inv, 'LUNAS', e)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition cursor-pointer ${
                                inv.paymentStatus === 'LUNAS' || (!inv.paymentStatus && isLunas)
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-emerald-800 text-xs">LUNAS</div>
                                  <div className="text-[10px] text-slate-500">Tandai pembayaran telah lunas</div>
                                </div>
                              </div>
                              {(inv.paymentStatus === 'LUNAS' || (!inv.paymentStatus && isLunas)) && (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </button>

                            {/* Option 2: BELUM LUNAS */}
                            <button
                              type="button"
                              onClick={(e) => handleSelectStatus(inv, 'BELUM_LUNAS', e)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition cursor-pointer mt-1 ${
                                inv.paymentStatus === 'BELUM_LUNAS' || (!inv.paymentStatus && !isLunas)
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                  <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-amber-800 text-xs">BELUM LUNAS</div>
                                  <div className="text-[10px] text-slate-500">
                                    {remaining > 0 ? `Sisa: ${formatRupiah(remaining)}` : 'Masih ada kewajiban / DP'}
                                  </div>
                                </div>
                              </div>
                              {(inv.paymentStatus === 'BELUM_LUNAS' || (!inv.paymentStatus && !isLunas)) && (
                                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                              )}
                            </button>

                            {/* Option 3: OTOMATIS */}
                            <div className="border-t border-slate-100 my-1.5"></div>
                            <button
                              type="button"
                              onClick={(e) => handleSelectStatus(inv, 'AUTO', e)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Kembalikan ke status otomatis berdasarkan nilai DP dan Total"
                            >
                              <div className="flex items-center gap-2">
                                <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <div>
                                  <div className="text-[11px] font-medium text-slate-700">Kembalikan ke Otomatis</div>
                                  <div className="text-[9px] text-slate-400">Sesuai hitungan DP & Total</div>
                                </div>
                              </div>
                              {!inv.paymentStatus && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Aktif
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {inv.customerName || 'Tanpa Nama'}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right sm:self-center">
                    <div className="text-lg font-bold text-emerald-700">
                      {formatRupiah(invGross)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      DP: {formatRupiah(dp)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8B0000] shrink-0" />
                    <span>
                      Tgl Acara:{' '}
                      <strong className="text-slate-800">
                        {inv.eventDate || '-'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#8B0000] shrink-0" />
                    <span className="truncate">{inv.address || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Dibuat:{' '}
                      {inv.createdAt
                        ? new Date(inv.createdAt).toLocaleString('id-ID')
                        : '-'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total Item:{' '}
                    <span className="font-semibold text-slate-700">
                      {inv.items.length} item
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    id={`btn-load-inv-${invKey}`}
                    type="button"
                    onClick={() => onLoadInvoice(inv)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B0000] hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Buka di Editor
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`btn-delete-inv-${invKey}`}
                      type="button"
                      onClick={() =>
                        handleOpenDelete(
                          inv.id || inv.invoiceNumber || invKey,
                          inv.customerName || 'Pelanggan'
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition active:scale-95"
                      title="Hapus Nota dari Riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs">Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
