import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Users,
  Coins,
  DollarSign,
  Download,
  Copy,
  Printer,
  HelpCircle,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  History,
  CheckCircle,
  MinusCircle,
  PlusCircle,
  Database,
} from 'lucide-react';
import { formatRupiah, generatePayrollNumber, isDeductionColumn } from '../utils/formatters';
import { PayrollData, PayrollColumn, PayrollRow } from '../types';

interface PayrollPageProps {
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onSaveToHistory?: (payroll: PayrollData) => void;
  onNavigateToHistory?: () => void;
  initialPayrollData?: PayrollData | null;
  historyCount?: number;
  onOpenBackup?: () => void;
}

const STORAGE_KEY = 'gapura_simple_payroll_table';

export const PayrollPage: React.FC<PayrollPageProps> = ({
  onShowToast,
  onSaveToHistory,
  onNavigateToHistory,
  initialPayrollData,
  historyCount = 0,
  onOpenBackup,
}) => {
  const [currentId, setCurrentId] = useState<string | undefined>(
    initialPayrollData?.id
  );
  const [payrollNumber, setPayrollNumber] = useState<string>(
    initialPayrollData?.payrollNumber || generatePayrollNumber()
  );
  const [columns, setColumns] = useState<PayrollColumn[]>(() => [
    { id: 'col-1', name: 'Gaji Pokok / Hari', isDeduction: false },
    { id: 'col-2', name: 'Lembur / Bonus', isDeduction: false },
    { id: 'col-3', name: 'Kasbon / Pinjaman', isDeduction: true },
  ]);

  const [rows, setRows] = useState<PayrollRow[]>(() => [
    { id: 'row-1', employeeName: '', amounts: { 'col-1': 0, 'col-2': 0, 'col-3': 0 } },
    { id: 'row-2', employeeName: '', amounts: { 'col-1': 0, 'col-2': 0, 'col-3': 0 } },
    { id: 'row-3', employeeName: '', amounts: { 'col-1': 0, 'col-2': 0, 'col-3': 0 } },
  ]);

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [tableTitle, setTableTitle] = useState<string>('Rekap Gaji Kru & Pekerja');
  const [showHelper, setShowHelper] = useState<boolean>(false);

  // Sync if initialPayrollData changes (e.g. loaded from history)
  useEffect(() => {
    if (initialPayrollData) {
      setCurrentId(initialPayrollData.id);
      setPayrollNumber(initialPayrollData.payrollNumber || generatePayrollNumber());
      if (initialPayrollData.columns && initialPayrollData.columns.length > 0) {
        setColumns(initialPayrollData.columns);
      }
      if (initialPayrollData.rows && initialPayrollData.rows.length > 0) {
        setRows(initialPayrollData.rows);
      }
      if (initialPayrollData.date) {
        setDate(initialPayrollData.date);
      }
      if (initialPayrollData.title) {
        setTableTitle(initialPayrollData.title);
      }
    }
  }, [initialPayrollData]);

  // Quick preset suggestions with Kasbon support
  const presets: { label: string; cols: { name: string; isDeduction?: boolean }[] }[] = [
    {
      label: 'Standar + Kasbon (Pokok, Lembur, Kasbon)',
      cols: [
        { name: 'Gaji Pokok', isDeduction: false },
        { name: 'Lembur / Bonus', isDeduction: false },
        { name: 'Kasbon / Pinjaman', isDeduction: true },
      ],
    },
    {
      label: 'WO Lengkap (Upah, Makan, Tips, Kasbon)',
      cols: [
        { name: 'Upah Kerja', isDeduction: false },
        { name: 'Uang Makan', isDeduction: false },
        { name: 'Bonus / Tips', isDeduction: false },
        { name: 'Kasbon (Potongan)', isDeduction: true },
      ],
    },
    {
      label: 'Event 3 Hari + Kasbon',
      cols: [
        { name: 'Hari ke-1', isDeduction: false },
        { name: 'Hari ke-2', isDeduction: false },
        { name: 'Hari ke-3', isDeduction: false },
        { name: 'Kasbon', isDeduction: true },
      ],
    },
    {
      label: 'Tanpa Kasbon (Pokok & Lembur saja)',
      cols: [
        { name: 'Gaji Pokok', isDeduction: false },
        { name: 'Lembur / Bonus', isDeduction: false },
      ],
    },
  ];

  // Load from localStorage on mount (if no initialPayrollData)
  useEffect(() => {
    if (initialPayrollData) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.columns && parsed.rows) {
          let loadedCols: PayrollColumn[] = parsed.columns.map((c: any) => ({
            ...c,
            isDeduction: c.isDeduction !== undefined ? c.isDeduction : isDeductionColumn(c),
          }));

          // If old draft had no deduction/kasbon column at all, add default Kasbon column
          const hasDeduction = loadedCols.some((c) => isDeductionColumn(c));
          if (!hasDeduction) {
            const kasbonColId = `col-${Date.now()}-kasbon`;
            loadedCols = [
              ...loadedCols,
              { id: kasbonColId, name: 'Kasbon / Pinjaman', isDeduction: true },
            ];
          }

          setColumns(loadedCols);
          // Normalize row property
          const mappedRows = parsed.rows.map((r: any) => ({
            id: r.id || `row-${Math.random()}`,
            employeeName: r.employeeName ?? r.name ?? '',
            amounts: r.amounts || {},
          }));
          setRows(mappedRows);
          if (parsed.date) setDate(parsed.date);
          if (parsed.tableTitle) setTableTitle(parsed.tableTitle);
          if (parsed.id) setCurrentId(parsed.id);
          if (parsed.payrollNumber) setPayrollNumber(parsed.payrollNumber);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save to localStorage & History list
  const handleSave = () => {
    try {
      const payrollDataToSave: PayrollData = {
        id: currentId || `payroll-${Date.now()}`,
        payrollNumber: payrollNumber || generatePayrollNumber(),
        title: tableTitle,
        date,
        columns,
        rows,
        preparedBySignature: null,
        receivedBySignature: null,
        createdAt: new Date().toISOString(),
      };

      // Save draft state
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          id: payrollDataToSave.id,
          payrollNumber: payrollDataToSave.payrollNumber,
          columns,
          rows,
          date,
          tableTitle,
        })
      );

      // Save to Payroll History
      if (onSaveToHistory) {
        onSaveToHistory(payrollDataToSave);
      }

      setCurrentId(payrollDataToSave.id);

      if (onShowToast) {
        onShowToast('Data penggajian berhasil disimpan ke Riwayat!', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset Table
  const handleReset = () => {
    if (window.confirm('Kosongkan semua data tabel penggajian untuk membuat rekap baru?')) {
      const initialCols = [
        { id: 'col-1', name: 'Gaji Pokok / Hari' },
        { id: 'col-2', name: 'Lembur / Bonus' },
      ];
      const initialRows = [
        { id: 'row-1', employeeName: '', amounts: { 'col-1': 0, 'col-2': 0 } },
        { id: 'row-2', employeeName: '', amounts: { 'col-1': 0, 'col-2': 0 } },
        { id: 'row-3', employeeName: '', amounts: { 'col-1': 0, 'col-2': 0 } },
      ];
      setColumns(initialCols);
      setRows(initialRows);
      setCurrentId(undefined);
      setPayrollNumber(generatePayrollNumber());
      setTableTitle('Rekap Gaji Kru & Pekerja');
      localStorage.removeItem(STORAGE_KEY);
      if (onShowToast) onShowToast('Tabel telah dikosongkan untuk rekap baru', 'info');
    }
  };

  // Apply Preset
  const handleApplyPreset = (
    presetCols: { name: string; isDeduction?: boolean }[]
  ) => {
    if (
      rows.some(
        (r) =>
          (r.employeeName || (r as any).name) ||
          Object.values(r.amounts).some((v) => Number(v) > 0)
      ) &&
      !window.confirm('Terapkan template kolom ini? Nilai kolom akan disesuaikan.')
    ) {
      return;
    }

    const newCols: PayrollColumn[] = presetCols.map((col, i) => ({
      id: `col-p-${i + 1}`,
      name: col.name,
      isDeduction: col.isDeduction ?? isDeductionColumn(col),
    }));

    setColumns(newCols);
    setRows((prev) =>
      prev.map((row) => {
        const newAmounts: { [k: string]: number } = {};
        newCols.forEach((c) => {
          newAmounts[c.id] = row.amounts[c.id] || 0;
        });
        return { ...row, amounts: newAmounts };
      })
    );
    if (onShowToast) onShowToast('Format kolom diterapkan!', 'success');
  };

  // Add row (Nama Vertikal)
  const addRow = () => {
    const newAmounts: { [colId: string]: number } = {};
    columns.forEach((col) => {
      newAmounts[col.id] = 0;
    });
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        employeeName: '',
        amounts: newAmounts,
      },
    ]);
  };

  // Remove row
  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      if (onShowToast) onShowToast('Minimal harus ada 1 nama pekerja', 'info');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Update employee name
  const updateName = (index: number, val: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], employeeName: val };
      return updated;
    });
  };

  // Update amount in a cell
  const updateAmount = (rowIndex: number, colId: string, val: number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        amounts: {
          ...updated[rowIndex].amounts,
          [colId]: isNaN(val) ? 0 : val,
        },
      };
      return updated;
    });
  };

  // Add column (Upah Pendapatan or Kasbon Potongan)
  const addColumn = (asDeduction: boolean = false) => {
    const newColId = `col-${Date.now()}`;
    const newColName = asDeduction
      ? `Kasbon / Potongan ${columns.filter((c) => isDeductionColumn(c)).length + 1}`
      : `Upah / Bonus ${columns.filter((c) => !isDeductionColumn(c)).length + 1}`;
    setColumns((prev) => [
      ...prev,
      { id: newColId, name: newColName, isDeduction: asDeduction },
    ]);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        amounts: { ...r.amounts, [newColId]: 0 },
      }))
    );
    if (onShowToast) {
      onShowToast(
        asDeduction
          ? 'Kolom Kasbon / Potongan ditambahkan'
          : 'Kolom Upah ditambahkan',
        'info'
      );
    }
  };

  // Toggle deduction status of a column
  const toggleColumnDeduction = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => {
        if (c.id === colId) {
          const currentlyDeduction = isDeductionColumn(c);
          const nextVal = !currentlyDeduction;
          return {
            ...c,
            isDeduction: nextVal,
            name:
              c.name.startsWith('Jumlah') || c.name.startsWith('Upah') || c.name.startsWith('Kasbon')
                ? nextVal
                  ? 'Kasbon / Pinjaman'
                  : 'Upah Kerja'
                : c.name,
          };
        }
        return c;
      })
    );
    if (onShowToast) onShowToast('Status kolom diperbarui', 'info');
  };

  // Remove column
  const removeColumn = (colId: string) => {
    if (columns.length <= 1) {
      if (onShowToast) onShowToast('Minimal harus ada 1 kolom nominal', 'info');
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    setRows((prev) =>
      prev.map((r) => {
        const copy = { ...r.amounts };
        delete copy[colId];
        return { ...r, amounts: copy };
      })
    );
  };

  // Rename column
  const renameColumn = (colId: string, newName: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, name: newName } : c))
    );
  };

  // Duplicate Row
  const duplicateRow = (index: number) => {
    const target = rows[index];
    const targetName = target.employeeName || (target as any).name || '';
    const newRow: PayrollRow = {
      id: `row-${Date.now()}`,
      employeeName: targetName ? `${targetName} (Copy)` : '',
      amounts: { ...target.amounts },
    };
    const nextRows = [...rows];
    nextRows.splice(index + 1, 0, newRow);
    setRows(nextRows);
    if (onShowToast) onShowToast('Baris berhasil disalin', 'info');
  };

  // Calculate Row Earnings (positive)
  const getRowEarnings = (row: PayrollRow): number => {
    return columns
      .filter((col) => !isDeductionColumn(col))
      .reduce((sum, col) => sum + (row.amounts[col.id] || 0), 0);
  };

  // Calculate Row Deductions (kasbon/potongan)
  const getRowDeductions = (row: PayrollRow): number => {
    return columns
      .filter((col) => isDeductionColumn(col))
      .reduce((sum, col) => sum + (row.amounts[col.id] || 0), 0);
  };

  // Calculate Net Row Total (Earnings - Deductions)
  const getRowTotal = (row: PayrollRow): number => {
    return getRowEarnings(row) - getRowDeductions(row);
  };

  // Calculate Column Total
  const getColumnTotal = (colId: string): number => {
    return rows.reduce((sum, row) => sum + (row.amounts[colId] || 0), 0);
  };

  // Grand Totals & Stats
  const totalGrossEarnings = rows.reduce((sum, row) => sum + getRowEarnings(row), 0);
  const totalKasbon = rows.reduce((sum, row) => sum + getRowDeductions(row), 0);
  const grandTotal = totalGrossEarnings - totalKasbon; // Gaji Bersih yang dibayarkan

  const totalEmployeesWithData = rows.filter(
    (r) => (r.employeeName || (r as any).name || '').trim() !== ''
  ).length;
  const averagePerPerson =
    totalEmployeesWithData > 0 ? Math.round(grandTotal / totalEmployeesWithData) : 0;

  // Export to CSV
  const exportCSV = () => {
    let csv = `No,Nama,${columns
      .map(
        (c) =>
          `"${c.name}${isDeductionColumn(c) ? ' (Potongan/Kasbon)' : ''}"`
      )
      .join(',')},Total Gaji Bersih (Diterima)\n`;
    rows.forEach((r, idx) => {
      const name = r.employeeName || (r as any).name || 'Tanpa Nama';
      const amounts = columns.map((c) => r.amounts[c.id] || 0).join(',');
      csv += `${idx + 1},"${name}",${amounts},${getRowTotal(r)}\n`;
    });
    const colTotals = columns
      .map((c) => `${isDeductionColumn(c) ? '-' : ''}${getColumnTotal(c.id)}`)
      .join(',');
    csv += `TOTAL,,${colTotals},${grandTotal}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap-Gaji-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('File CSV berhasil diunduh!', 'success');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* 1. Header Card dengan Tampilan Bersih & Modern */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Coins className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={tableTitle}
                onChange={(e) => setTableTitle(e.target.value)}
                placeholder="Judul Rekap Gaji..."
                className="font-bold text-lg sm:text-xl text-slate-800 bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:outline-none transition px-1 py-0.5"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pl-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-slate-600 font-medium hover:text-blue-600 focus:outline-none cursor-pointer"
                />
              </span>
              <span>•</span>
              <span className="font-mono text-slate-600 font-bold">{payrollNumber}</span>
              <span>•</span>
              <span>{rows.length} Baris Terdaftar</span>
              <span>•</span>
              <span>{columns.length} Kolom Nominal</span>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToHistory && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition"
                title="Buka Riwayat Rekap Penggajian"
              >
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>Riwayat Gaji ({historyCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHelper(!showHelper)}
              className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition"
              title="Template Kolom Cepat"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Template Kolom</span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-emerald-200 transition"
              title="Unduh format Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
              title="Cetak Tabel"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-semibold border border-slate-200 hover:border-rose-200 transition"
              title="Kosongkan Tabel"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-200 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Tabel</span>
            </button>

            {onOpenBackup && (
              <button
                id="btn-backup-payroll"
                type="button"
                onClick={onOpenBackup}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Cadangkan dan pulihkan data penggajian"
              >
                <Database className="w-3.5 h-3.5 text-amber-700" />
                <span>Backup Gaji</span>
              </button>
            )}
          </div>
        </div>

        {/* Template Quick Selection (Accordion Drawer) */}
        {showHelper && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" /> Pilih Format Cepat:
            </span>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.cols)}
                className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Ringkasan Mini Stats / Dashboard KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Upah Kotor */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Upah Kotor
            </p>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {formatRupiah(totalGrossEarnings)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Kasbon / Potongan */}
        <div className="bg-white rounded-xl border border-rose-200/80 p-3.5 shadow-2xs flex items-center justify-between bg-gradient-to-br from-white to-rose-50/30">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                Total Kasbon
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                Potongan
              </span>
            </div>
            <p className="text-lg sm:text-xl font-black text-rose-600 mt-0.5 font-mono">
              {totalKasbon > 0 ? `- ${formatRupiah(totalKasbon)}` : 'Rp 0'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <MinusCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Gaji Bersih Dibayarkan */}
        <div className="bg-white rounded-xl border border-emerald-200/80 p-3.5 shadow-2xs flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Total Bersih Dibayar
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                Netto
              </span>
            </div>
            <p className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5 font-mono">
              {formatRupiah(grandTotal)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Pekerja Terisi */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Kru / Pekerja
            </p>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {totalEmployeesWithData}{' '}
              <span className="text-xs font-normal text-slate-400">
                dari {rows.length} baris
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Tabel Spreadsheet Utama */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            <span>Matriks Gaji Kru / Karyawan</span>
            <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
              (Gaji bersih = Total upah dikurangi kasbon otomatis)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addColumn(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold border border-slate-300 hover:border-blue-300 shadow-2xs transition"
              title="Tambah kolom pendapatan / upah kerja baru"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Kolom Upah</span>
            </button>

            <button
              type="button"
              onClick={() => addColumn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 shadow-2xs transition"
              title="Tambah kolom potongan kasbon / pinjaman"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>+ Kolom Kasbon</span>
            </button>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Baris Nama</span>
            </button>
          </div>
        </div>

        {/* Scrollable Container with Modern Aesthetics */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-300">
                {/* No */}
                <th className="py-3 px-3 w-14 text-center border-r border-slate-200 bg-slate-200/50">
                  No
                </th>

                {/* Nama Vertikal */}
                <th className="py-3 px-3.5 min-w-[220px] border-r border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nama Pekerja (Vertikal)</span>
                  </span>
                </th>

                {/* Kolom-kolom Horizontal */}
                {columns.map((col, idx) => {
                  const isDeduction = isDeductionColumn(col);
                  return (
                    <th
                      key={col.id}
                      className={`py-2 px-3 min-w-[180px] border-r transition-colors ${
                        isDeduction
                          ? 'border-rose-200 bg-rose-50/60'
                          : 'border-slate-200 bg-blue-50/40'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5 group">
                        <div className="flex items-center justify-between gap-1">
                          {/* Toggle Badge */}
                          <button
                            type="button"
                            onClick={() => toggleColumnDeduction(col.id)}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition flex items-center gap-0.5 ${
                              isDeduction
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                            }`}
                            title="Klik untuk mengubah jenis kolom (Upah / Kasbon)"
                          >
                            {isDeduction ? '➖ Kasbon (Potongan)' : '➕ Upah / Bonus'}
                          </button>

                          {columns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeColumn(col.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-white/80 transition"
                              title="Hapus kolom ini"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Input Nama Kolom */}
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => renameColumn(col.id, e.target.value)}
                          className={`bg-transparent font-bold text-xs outline-none w-full border-b border-dashed py-0.5 transition ${
                            isDeduction
                              ? 'text-rose-900 border-rose-300 focus:border-rose-600'
                              : 'text-slate-800 border-blue-300 focus:border-blue-600'
                          }`}
                          placeholder={`Kolom ${idx + 1}`}
                          title="Klik untuk mengubah nama kolom"
                        />
                      </div>
                    </th>
                  );
                })}

                {/* Total Bersih Per Baris */}
                <th className="py-3 px-4 min-w-[170px] text-right border-r border-slate-200 bg-slate-200/60 text-slate-900 font-black">
                  Total Diterima (Bersih)
                </th>

                {/* Opsi / Action */}
                <th className="py-3 px-2 w-16 text-center text-[10px] text-slate-500 font-semibold">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {rows.map((row, rIdx) => {
                const rowTotal = getRowTotal(row);
                const rowEarnings = getRowEarnings(row);
                const rowDeductions = getRowDeductions(row);

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {/* No */}
                    <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200 bg-slate-50/50">
                      {rIdx + 1}
                    </td>

                    {/* Nama Input */}
                    <td className="py-2 px-3 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.employeeName ?? (row as any).name ?? ''}
                        onChange={(e) => updateName(rIdx, e.target.value)}
                        placeholder={`Nama orang ke-${rIdx + 1}...`}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      />
                    </td>

                    {/* Kolom-kolom Nominal Jumlah */}
                    {columns.map((col) => {
                      const val = row.amounts[col.id] || 0;
                      const isDeduction = isDeductionColumn(col);

                      return (
                        <td
                          key={col.id}
                          className={`py-2 px-3 border-r transition-colors ${
                            isDeduction
                              ? 'border-rose-100 bg-rose-50/20'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="relative flex items-center">
                            <span
                              className={`absolute left-2.5 text-xs font-bold pointer-events-none select-none ${
                                isDeduction ? 'text-rose-500' : 'text-slate-400'
                              }`}
                            >
                              {isDeduction ? '- Rp' : 'Rp'}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={val === 0 ? '' : val}
                              onChange={(e) =>
                                updateAmount(
                                  rIdx,
                                  col.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className={`w-full pl-9 pr-2.5 py-1.5 text-right font-mono text-sm border rounded-lg font-semibold outline-none transition ${
                                isDeduction
                                  ? 'text-rose-700 bg-white border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                                  : 'text-slate-800 bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                              }`}
                            />
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Bersih Per Baris */}
                    <td className="py-2 px-4 text-right border-r border-slate-200 bg-slate-50/60">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatRupiah(rowTotal)}
                      </div>
                      {rowDeductions > 0 && (
                        <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                          (Kasbon: -{formatRupiah(rowDeductions)})
                        </div>
                      )}
                    </td>

                    {/* Aksi Baris */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateRow(rIdx)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition"
                          title="Duplikasi baris ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(rIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Summary - Total Kolom & Grand Total */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-950">
                <td
                  colSpan={2}
                  className="py-3 px-4 text-right uppercase tracking-wider text-slate-300 border-r border-slate-800"
                >
                  TOTAL KESELURUHAN :
                </td>

                {/* Subtotal per masing-masing kolom */}
                {columns.map((col) => {
                  const colTotal = getColumnTotal(col.id);
                  const isDeduction = isDeductionColumn(col);

                  return (
                    <td
                      key={col.id}
                      className="py-3 px-3 text-right font-mono text-xs border-r border-slate-800"
                    >
                      {isDeduction ? (
                        <span className="text-rose-400 font-bold">
                          - {formatRupiah(colTotal)}
                        </span>
                      ) : (
                        <span className="text-slate-200">
                          {formatRupiah(colTotal)}
                        </span>
                      )}
                    </td>
                  );
                })}

                {/* Grand Total Bersih */}
                <td className="py-3 px-4 text-right font-mono text-base font-black text-emerald-400 border-r border-slate-800 bg-slate-950">
                  {formatRupiah(grandTotal)}
                </td>

                <td className="bg-slate-950" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Fast Action Buttons */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Tambah Baris Nama</span>
            </button>

            <button
              type="button"
              onClick={() => addColumn(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Tambah Kolom Upah</span>
            </button>

            <button
              type="button"
              onClick={() => addColumn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 shadow-2xs transition"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>+ Tambah Kolom Kasbon</span>
            </button>
          </div>

          <div className="text-xs text-slate-600 font-medium">
            Total Bersih Dibayarkan:{' '}
            <span className="font-mono font-black text-emerald-600 text-sm pl-1">
              {formatRupiah(grandTotal)}
            </span>
            {totalKasbon > 0 && (
              <span className="text-[11px] text-slate-400 pl-1.5">
                (Kotor {formatRupiah(totalGrossEarnings)} - Kasbon {formatRupiah(totalKasbon)})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
