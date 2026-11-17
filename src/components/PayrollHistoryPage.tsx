import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Trash2,
  Edit3,
  DollarSign,
  Users,
  Coins,
  TrendingUp,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Printer,
  Download,
  Copy,
  ChevronRight,
  PlusCircle,
  Eye,
  CheckCircle,
  MinusCircle,
  Database,
} from 'lucide-react';
import { PayrollData, PayrollColumn, PayrollRow } from '../types';
import { formatRupiah, formatDateIndo, isDeductionColumn } from '../utils/formatters';

interface PayrollHistoryPageProps {
  payrolls: PayrollData[];
  onLoadPayroll: (payroll: PayrollData) => void;
  onDeletePayroll: (id: string) => void;
  onClearAllPayrolls?: () => void;
  onCreateNewPayroll: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBackup?: () => void;
}

export const PayrollHistoryPage: React.FC<PayrollHistoryPageProps> = ({
  payrolls,
  onLoadPayroll,
  onDeletePayroll,
  onClearAllPayrolls,
  onCreateNewPayroll,
  onShowToast,
  onOpenBackup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Helper to compute worker's row earnings (gross)
  const getWorkerEarnings = (payroll: PayrollData, row: PayrollRow): number => {
    return payroll.columns
      .filter((col) => !isDeductionColumn(col))
      .reduce((sum, col) => sum + (row.amounts[col.id] || 0), 0);
  };

  // Helper to compute worker's kasbon / deductions
  const getWorkerKasbon = (payroll: PayrollData, row: PayrollRow): number => {
    return payroll.columns
      .filter((col) => isDeductionColumn(col))
      .reduce((sum, col) => sum + (row.amounts[col.id] || 0), 0);
  };

  // Helper to compute worker's net take-home pay
  const getWorkerNetTotal = (payroll: PayrollData, row: PayrollRow): number => {
    return getWorkerEarnings(payroll, row) - getWorkerKasbon(payroll, row);
  };

  // Compute individual payroll totals
  const getPayrollGrandTotal = (payroll: PayrollData): number => {
    return payroll.rows.reduce((total, row) => {
      return total + getWorkerNetTotal(payroll, row);
    }, 0);
  };

  const getPayrollKasbonTotal = (payroll: PayrollData): number => {
    return payroll.rows.reduce((total, row) => {
      return total + getWorkerKasbon(payroll, row);
    }, 0);
  };

  const getPayrollEmployeeCount = (payroll: PayrollData): number => {
    return payroll.rows.filter((r) => r.employeeName.trim() !== '').length;
  };

  // Filtered payroll list
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((item) => {
      // 1. Search Query (Title, No, Pekerja)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchNumber = item.payrollNumber?.toLowerCase().includes(query);
        const matchWorkers = item.rows.some((r) =>
          r.employeeName?.toLowerCase().includes(query)
        );
        const matchDate = item.date?.toLowerCase().includes(query);

        if (!matchTitle && !matchNumber && !matchWorkers && !matchDate) {
          return false;
        }
      }

      // 2. Month filter (YYYY-MM)
      if (filterMonth) {
        if (!item.date || !item.date.startsWith(filterMonth)) {
          return false;
        }
      }

      return true;
    });
  }, [payrolls, searchQuery, filterMonth]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalNominal = 0;
    let totalKasbon = 0;
    let totalWorkersRecorded = 0;

    payrolls.forEach((p) => {
      totalNominal += getPayrollGrandTotal(p);
      totalKasbon += getPayrollKasbonTotal(p);
      totalWorkersRecorded += getPayrollEmployeeCount(p);
    });

    return {
      totalCount: payrolls.length,
      totalNominal,
      totalKasbon,
      totalWorkersRecorded,
      avgPerPayroll: payrolls.length > 0 ? Math.round(totalNominal / payrolls.length) : 0,
    };
  }, [payrolls]);

  // Export single payroll to CSV
  const exportSinglePayrollCSV = (payroll: PayrollData) => {
    let csv = `No,Nama Kru / Pekerja,${payroll.columns
      .map(
        (c) =>
          `"${c.name}${isDeductionColumn(c) ? ' (Potongan/Kasbon)' : ''}"`
      )
      .join(',')},Total Gaji Bersih\n`;
    payroll.rows.forEach((r, idx) => {
      const amounts = payroll.columns.map((c) => r.amounts[c.id] || 0).join(',');
      const netSum = getWorkerNetTotal(payroll, r);
      csv += `${idx + 1},"${r.employeeName || 'Tanpa Nama'}",${amounts},${netSum}\n`;
    });
    const colTotals = payroll.columns
      .map((c) => {
        const colSum = payroll.rows.reduce(
          (s, r) => s + (r.amounts[c.id] || 0),
          0
        );
        return `${isDeductionColumn(c) ? '-' : ''}${colSum}`;
      })
      .join(',');
    const grand = getPayrollGrandTotal(payroll);
    csv += `TOTAL,,${colTotals},${grand}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${payroll.payrollNumber || 'Rekap-Gaji'}-${payroll.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('File CSV berhasil diunduh!', 'success');
  };

  const handleOpenDetail = (payroll: PayrollData) => {
    setSelectedPayroll(payroll);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* 1. Header & Navigation Back to Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-2xs">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-serif">
              Riwayat Rekap Penggajian
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Daftar seluruh rekap upah & gaji kru Gapura Enterprise yang tersimpan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClearAllPayrolls && payrolls.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'PERINGATAN: Hapus SEMUA riwayat penggajian? Data yang dihapus tidak bisa dikembalikan.'
                  )
                ) {
                  onClearAllPayrolls();
                  onShowToast('Semua riwayat penggajian berhasil dihapus', 'info');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus Semua</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCreateNewPayroll}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-200 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Rekap Gaji Baru</span>
          </button>

          {onOpenBackup && (
            <button
              id="btn-backup-payroll-history"
              type="button"
              onClick={onOpenBackup}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
              title="Cadangkan dan pulihkan data riwayat gaji"
            >
              <Database className="w-4 h-4 text-amber-700" />
              <span>Backup Data Gaji</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Ringkasan Kartu Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Rekap</p>
            <p className="text-lg sm:text-xl font-black text-slate-800 font-mono">
              {stats.totalCount} <span className="text-xs font-normal text-slate-400">tabel</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Bersih</p>
            <p className="text-sm sm:text-lg font-black text-emerald-600 font-mono">
              {formatRupiah(stats.totalNominal)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-2xs flex items-center gap-3 bg-gradient-to-br from-white to-rose-50/30">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <MinusCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-rose-700 uppercase">Kasbon Terpotong</p>
            <p className="text-sm sm:text-lg font-black text-rose-600 font-mono">
              {stats.totalKasbon > 0 ? `- ${formatRupiah(stats.totalKasbon)}` : 'Rp 0'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Kru Terdata</p>
            <p className="text-lg sm:text-xl font-black text-slate-800 font-mono">
              {stats.totalWorkersRecorded} <span className="text-xs font-normal text-slate-400">orang</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul rekap, no. gaji, atau nama kru..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent focus:outline-none text-xs text-slate-700 font-medium cursor-pointer"
                title="Filter berdasarkan bulan"
              />
              {filterMonth && (
                <button
                  type="button"
                  onClick={() => setFilterMonth('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {(searchQuery || filterMonth) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterMonth('');
                }}
                className="text-xs text-blue-600 hover:underline px-2 py-1 font-semibold"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Daftar Riwayat Payroll */}
      {filteredPayrolls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-800 text-base">
              {payrolls.length === 0
                ? 'Belum Ada Riwayat Rekap Penggajian'
                : 'Tidak Ditemukan Riwayat yang Sesuai'}
            </h3>
            <p className="text-xs text-slate-500">
              {payrolls.length === 0
                ? 'Rekap gaji yang Anda simpan di menu Penggajian akan otomatis tercatat dan dapat dibuka kembali di sini kapan saja.'
                : 'Coba ubah kata kunci pencarian atau bersihkan filter tanggal bulan.'}
            </p>
          </div>
          {payrolls.length === 0 && (
            <button
              type="button"
              onClick={onCreateNewPayroll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buka Menu Penggajian Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayrolls.map((item) => {
            const grandTotal = getPayrollGrandTotal(item);
            const workersCount = getPayrollEmployeeCount(item);
            const previewWorkers = item.rows
              .filter((r) => r.employeeName.trim() !== '')
              .slice(0, 3);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition duration-150 flex flex-col justify-between overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {item.payrollNumber}
                      </span>
                      <h3 className="font-bold text-slate-800 text-base mt-1.5 leading-snug">
                        {item.title || 'Rekap Gaji Kru'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Hapus riwayat rekap "${item.title || item.payrollNumber}"?`
                            )
                          ) {
                            if (item.id) onDeletePayroll(item.id);
                            onShowToast('Rekap penggajian berhasil dihapus', 'info');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus riwayat ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateIndo(item.date)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {workersCount} pekerja
                    </span>
                  </div>
                </div>

                {/* Body Preview Kru */}
                <div className="p-4 sm:p-5 bg-slate-50/50 space-y-2.5 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Daftar Penerima:
                  </p>
                  <div className="space-y-1.5">
                    {previewWorkers.map((w, idx) => {
                      const rowTotal = getWorkerNetTotal(item, w);
                      const workerKasbon = getWorkerKasbon(item, w);
                      return (
                        <div
                          key={w.id || idx}
                          className="flex items-center justify-between text-xs py-0.5"
                        >
                          <span className="text-slate-700 font-medium truncate max-w-[150px]">
                            {idx + 1}. {w.employeeName}
                          </span>
                          <div className="text-right">
                            <span className="font-mono text-slate-700 font-semibold">
                              {formatRupiah(rowTotal)}
                            </span>
                            {workerKasbon > 0 && (
                              <span className="text-[10px] text-rose-600 font-mono block">
                                (Kasbon: -{formatRupiah(workerKasbon)})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {workersCount > 3 && (
                      <p className="text-[11px] text-slate-400 italic">
                        + {workersCount - 3} kru lainnya...
                      </p>
                    )}

                    {workersCount === 0 && (
                      <p className="text-xs text-slate-400 italic">Belum ada nama pekerja</p>
                    )}
                  </div>
                </div>

                {/* Footer Total & Actions */}
                <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total Dibayarkan (Bersih)
                    </span>
                    <span className="font-mono font-black text-emerald-600 text-base sm:text-lg">
                      {formatRupiah(grandTotal)}
                    </span>
                    {getPayrollKasbonTotal(item) > 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold block">
                        Kasbon: -{formatRupiah(getPayrollKasbonTotal(item))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition"
                      title="Lihat Rincian Lengkap"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => exportSinglePayrollCSV(item)}
                      className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 rounded-xl transition"
                      title="Export CSV / Excel"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadPayroll(item)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                      title="Buka & Edit di Tabel Penggajian"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal Detail / Preview Lengkap */}
      {isDetailModalOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {selectedPayroll.payrollNumber}
                  </span>
                  <span className="text-xs text-slate-300">
                    {formatDateIndo(selectedPayroll.date)}
                  </span>
                </div>
                <h2 className="text-lg font-bold font-serif text-white">
                  {selectedPayroll.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportSinglePayrollCSV(selectedPayroll)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    onLoadPayroll(selectedPayroll);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Buka di Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-4 min-w-[160px]">Nama Kru / Pekerja</th>
                      {selectedPayroll.columns.map((col) => {
                        const isDeduction = isDeductionColumn(col);
                        return (
                          <th
                            key={col.id}
                            className={`py-2.5 px-3 text-right min-w-[130px] ${
                              isDeduction ? 'bg-rose-50/60 text-rose-700' : ''
                            }`}
                          >
                            <span className="block">{col.name}</span>
                            {isDeduction && (
                              <span className="text-[9px] text-rose-600 font-bold block">
                                (Kasbon / Potongan)
                              </span>
                            )}
                          </th>
                        );
                      })}
                      <th className="py-2.5 px-4 text-right min-w-[140px] bg-slate-200/60 font-black">
                        Total Bersih
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPayroll.rows.map((row, idx) => {
                      const netRowTotal = getWorkerNetTotal(selectedPayroll, row);
                      const workerKasbon = getWorkerKasbon(selectedPayroll, row);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {row.employeeName || <span className="text-slate-300 italic">(Tanpa Nama)</span>}
                          </td>
                          {selectedPayroll.columns.map((col) => {
                            const val = row.amounts[col.id] || 0;
                            const isDeduction = isDeductionColumn(col);

                            return (
                              <td
                                key={col.id}
                                className={`py-2.5 px-3 text-right font-mono ${
                                  isDeduction
                                    ? 'text-rose-600 font-bold bg-rose-50/20'
                                    : 'text-slate-600'
                                }`}
                              >
                                {isDeduction && val > 0
                                  ? `- ${formatRupiah(val)}`
                                  : formatRupiah(val)}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50">
                            <div>{formatRupiah(netRowTotal)}</div>
                            {workerKasbon > 0 && (
                              <div className="text-[10px] text-rose-600 font-normal">
                                (Kasbon: -{formatRupiah(workerKasbon)})
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold text-xs">
                      <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-slate-300">
                        TOTAL KESELURUHAN :
                      </td>
                      {selectedPayroll.columns.map((col) => {
                        const colTotal = selectedPayroll.rows.reduce(
                          (sum, r) => sum + (r.amounts[col.id] || 0),
                          0
                        );
                        const isDeduction = isDeductionColumn(col);

                        return (
                          <td
                            key={col.id}
                            className={`py-3 px-3 text-right font-mono ${
                              isDeduction ? 'text-rose-400 font-bold' : 'text-slate-200'
                            }`}
                          >
                            {isDeduction ? `- ${formatRupiah(colTotal)}` : formatRupiah(colTotal)}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm bg-slate-950">
                        {formatRupiah(getPayrollGrandTotal(selectedPayroll))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Tersimpan pada: {new Date(selectedPayroll.createdAt).toLocaleString('id-ID')}
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
