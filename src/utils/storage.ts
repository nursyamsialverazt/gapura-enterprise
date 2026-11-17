import { InvoiceData, PayrollData, ScheduleItem } from '../types';

const STORAGE_KEY = 'gapura_enterprise_invoices_v4';
const PAYROLL_STORAGE_KEY = 'gapura_enterprise_payrolls_v1';
const SCHEDULE_STORAGE_KEY = 'gapura_enterprise_schedules_v1';

export const getInvoicesFromStorage = (): InvoiceData[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

export const saveInvoiceToStorage = (invoice: InvoiceData): InvoiceData[] => {
  try {
    const existing = getInvoicesFromStorage();
    const invoiceToSave = {
      ...invoice,
      id: invoice.id || `inv-${Date.now()}`,
      createdAt: invoice.createdAt || new Date().toISOString(),
    };

    const existingIndex = existing.findIndex((item) => item.id === invoiceToSave.id);
    let updated: InvoiceData[];

    if (existingIndex >= 0) {
      updated = [...existing];
      updated[existingIndex] = invoiceToSave;
    } else {
      updated = [invoiceToSave, ...existing];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return [];
  }
};

export const deleteInvoiceFromStorage = (idOrNumber: string): InvoiceData[] => {
  try {
    const existing = getInvoicesFromStorage();
    const filtered = existing.filter(
      (item) => item.id !== idOrNumber && item.invoiceNumber !== idOrNumber
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error deleting from localStorage:', error);
    return [];
  }
};

export const clearAllInvoicesFromStorage = (): InvoiceData[] => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (error) {
    console.error('Error clearing all invoices from localStorage:', error);
    return [];
  }
};

export const updateInvoiceStatusInStorage = (
  idOrNumber: string,
  paymentStatus: 'LUNAS' | 'BELUM_LUNAS' | 'AUTO'
): InvoiceData[] => {
  try {
    const existing = getInvoicesFromStorage();
    const updated = existing.map((item) => {
      if (item.id === idOrNumber || item.invoiceNumber === idOrNumber) {
        if (paymentStatus === 'AUTO') {
          const itemCopy = { ...item };
          delete itemCopy.paymentStatus;
          return itemCopy;
        }
        return {
          ...item,
          paymentStatus,
        };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating invoice status in storage:', error);
    return [];
  }
};

// ======================== PAYROLL / PENGGAJIAN STORAGE ========================

export const getPayrollsFromStorage = (): PayrollData[] => {
  try {
    const data = localStorage.getItem(PAYROLL_STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading payrolls from localStorage:', error);
    return [];
  }
};

export const savePayrollToStorage = (payroll: PayrollData): PayrollData[] => {
  try {
    const existing = getPayrollsFromStorage();
    const payrollToSave: PayrollData = {
      ...payroll,
      id: payroll.id || `payroll-${Date.now()}`,
      createdAt: payroll.createdAt || new Date().toISOString(),
    };

    const existingIndex = existing.findIndex((item) => item.id === payrollToSave.id);
    let updated: PayrollData[];

    if (existingIndex >= 0) {
      updated = [...existing];
      updated[existingIndex] = payrollToSave;
    } else {
      updated = [payrollToSave, ...existing];
    }

    localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving payroll to localStorage:', error);
    return [];
  }
};

export const deletePayrollFromStorage = (id: string): PayrollData[] => {
  try {
    const existing = getPayrollsFromStorage();
    const filtered = existing.filter((item) => item.id !== id);
    localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error deleting payroll from localStorage:', error);
    return [];
  }
};

export const clearAllPayrollsFromStorage = (): PayrollData[] => {
  try {
    localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (error) {
    console.error('Error clearing all payrolls from localStorage:', error);
    return [];
  }
};

/**
 * Mengambil daftar nama kru/pekerja unik yang terdaftar di Data Gaji / Penggajian
 */
export const getCrewListFromPayroll = (): string[] => {
  try {
    const crewSet = new Set<string>();

    // 1. Ambil dari riwayat rekap penggajian yang tersimpan
    const payrolls = getPayrollsFromStorage();
    payrolls.forEach((p) => {
      if (p.rows && Array.isArray(p.rows)) {
        p.rows.forEach((r) => {
          const name = (r.employeeName || '').trim();
          if (name) crewSet.add(name);
        });
      }
    });

    // 2. Ambil dari tabel draf aktif penggajian di localStorage
    const draftData = localStorage.getItem('gapura_simple_payroll_table');
    if (draftData) {
      try {
        const parsed = JSON.parse(draftData);
        if (parsed.rows && Array.isArray(parsed.rows)) {
          parsed.rows.forEach((r: any) => {
            const name = (r.employeeName || '').trim();
            if (name) crewSet.add(name);
          });
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // 3. Fallback nama kru standar jika data gaji masih kosong baru mulai
    if (crewSet.size === 0) {
      const defaultCrew = [
        'Kang Deden',
        'Mas Joko',
        'Kang Agus',
        'Kang Ujang',
        'Kang Asep',
        'Kang Hendra (Koordinator)',
      ];
      defaultCrew.forEach((c) => crewSet.add(c));
    }

    return Array.from(crewSet).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error getting crew list from payroll:', error);
    return ['Kang Deden', 'Mas Joko', 'Kang Agus', 'Kang Ujang'];
  }
};


// ======================== SCHEDULE / JADWAL STORAGE ========================

const getInitialDefaultSchedules = (): ScheduleItem[] => {
  const now = new Date();
  
  // Schedule 1: Setup tomorrow morning, teardown day after tomorrow
  const setup1 = new Date(now);
  setup1.setDate(now.getDate() + 1);
  setup1.setHours(8, 30, 0, 0);

  const teardown1 = new Date(now);
  teardown1.setDate(now.getDate() + 3);
  teardown1.setHours(9, 0, 0, 0);

  // Schedule 2: Setup today afternoon, teardown tomorrow night
  const setup2 = new Date(now);
  setup2.setHours(14, 0, 0, 0);

  const teardown2 = new Date(now);
  teardown2.setDate(now.getDate() + 1);
  teardown2.setHours(20, 0, 0, 0);

  // Format to YYYY-MM-DDTHH:mm
  const formatDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return [
    {
      id: 'sch-sample-1',
      customerName: 'Bpk. H. Rahmat Mulyana',
      address: 'Jl. Pesantren No. 45 RT 02/05, Cibabat, Cimahi Utara',
      phone: '081223344556',
      orderDetails: '• Tenda Plafon VIP 8 x 15 Meter (Kain Maroon Gold)\n• Panggung Pelaminan 6 x 4 Meter + Karpet Merah\n• Kursi Futura + Sarung Pita (120 unit)\n• Sound System 5.000 Watt + 4 Mic Wireless\n• Kipas Blower Air Kabut (4 unit)',
      setupDate: formatDateTime(setup1),
      teardownDate: formatDateTime(teardown1),
      status: 'AKTIF',
      picCrew: 'Kang Deden (0821-9988-7711)',
      notes: 'Akses gang muat mobil engkel. Titik pasang di halaman depan rumah, listrik 2.200W aman.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sch-sample-2',
      customerName: 'Ibu Hj. Siti Nurhaliza',
      address: 'Komplek Permata Indah Blok C3 No. 12, Sariwangi, Bandung Barat',
      phone: '085799112233',
      orderDetails: '• Tenda Roder Semi Dekorasi 10 x 20 Meter\n• Meja Prasmanan Bulat + Skirting (8 set)\n• 3x6 Panggung Pelaminan Lengkap\n• Panggung Hiburan 6x4',
      setupDate: formatDateTime(setup2),
      teardownDate: formatDateTime(teardown2),
      status: 'AKTIF',
      picCrew: 'Kang Agus & Tim 4 Orang',
      notes: 'Bongkar malam setelah resepsi selesai jam 20.00. Hubungi Pak RT untuk izin parkir truk.',
      createdAt: new Date().toISOString(),
    },
  ];
};

export const getSchedulesFromStorage = (): ScheduleItem[] => {
  try {
    const data = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!data) {
      const initial = getInitialDefaultSchedules();
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading schedules from localStorage:', error);
    return [];
  }
};

export const saveScheduleToStorage = (schedule: ScheduleItem): ScheduleItem[] => {
  try {
    const existing = getSchedulesFromStorage();
    const scheduleToSave: ScheduleItem = {
      ...schedule,
      id: schedule.id || `schedule-${Date.now()}`,
      createdAt: schedule.createdAt || new Date().toISOString(),
    };

    const existingIndex = existing.findIndex((item) => item.id === scheduleToSave.id);
    let updated: ScheduleItem[];

    if (existingIndex >= 0) {
      updated = [...existing];
      updated[existingIndex] = scheduleToSave;
    } else {
      updated = [scheduleToSave, ...existing];
    }

    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving schedule to localStorage:', error);
    return [];
  }
};

export const deleteScheduleFromStorage = (id: string): ScheduleItem[] => {
  try {
    const existing = getSchedulesFromStorage();
    const filtered = existing.filter((item) => item.id !== id);
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error deleting schedule from localStorage:', error);
    return [];
  }
};

export const updateScheduleStatusInStorage = (
  id: string,
  status: 'AKTIF' | 'SELESAI'
): ScheduleItem[] => {
  try {
    const existing = getSchedulesFromStorage();
    const updated = existing.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          completedAt: status === 'SELESAI' ? new Date().toISOString() : undefined,
        };
      }
      return item;
    });
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating schedule status in localStorage:', error);
    return [];
  }
};

export const clearAllSchedulesFromStorage = (): ScheduleItem[] => {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (error) {
    console.error('Error clearing all schedules from localStorage:', error);
    return [];
  }
};

// ======================== BACKUP & RESTORE DATA ========================

const LAST_BACKUP_KEY = 'gapura_enterprise_last_backup_timestamp';

export interface BackupPayload {
  version: string;
  appName: string;
  backupDate: string;
  invoices: InvoiceData[];
  payrolls: PayrollData[];
  schedules: ScheduleItem[];
  meta?: {
    totalInvoices: number;
    totalPayrolls: number;
    totalSchedules: number;
  };
}

export const getLastBackupTime = (): string | null => {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
};

export const setLastBackupTime = (dateStr?: string) => {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, dateStr || new Date().toISOString());
  } catch (err) {
    console.error('Error setting last backup time:', err);
  }
};

export const exportAllDataAsObject = (): BackupPayload => {
  const invoices = getInvoicesFromStorage();
  const payrolls = getPayrollsFromStorage();
  const schedules = getSchedulesFromStorage();
  setLastBackupTime();
  return {
    version: '2.0',
    appName: 'Gapura Enterprise',
    backupDate: new Date().toISOString(),
    invoices,
    payrolls,
    schedules,
    meta: {
      totalInvoices: invoices.length,
      totalPayrolls: payrolls.length,
      totalSchedules: schedules.length,
    },
  };
};

export const restoreBackupData = (
  payload: any,
  mode: 'merge' | 'replace'
): {
  success: boolean;
  message: string;
  counts: { invoices: number; payrolls: number; schedules: number };
} => {
  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      message: 'Format data tidak valid.',
      counts: { invoices: 0, payrolls: 0, schedules: 0 },
    };
  }

  let incomingInvoices: InvoiceData[] = Array.isArray(payload.invoices) ? payload.invoices : [];
  let incomingPayrolls: PayrollData[] = Array.isArray(payload.payrolls) ? payload.payrolls : [];
  let incomingSchedules: ScheduleItem[] = Array.isArray(payload.schedules) ? payload.schedules : [];

  // Support if payload itself was an array exported directly
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0];
    if ('invoiceNumber' in first) {
      incomingInvoices = payload;
    } else if ('payrollNumber' in first) {
      incomingPayrolls = payload;
    } else if ('setupDate' in first) {
      incomingSchedules = payload;
    }
  }

  let finalInvoices: InvoiceData[];
  let finalPayrolls: PayrollData[];
  let finalSchedules: ScheduleItem[];

  if (mode === 'replace') {
    finalInvoices = incomingInvoices;
    finalPayrolls = incomingPayrolls;
    finalSchedules = incomingSchedules;
  } else {
    // Merge mode: retain existing and merge incoming by ID or unique key
    const currentInvoices = getInvoicesFromStorage();
    const currentPayrolls = getPayrollsFromStorage();
    const currentSchedules = getSchedulesFromStorage();

    const invMap = new Map<string, InvoiceData>();
    currentInvoices.forEach((i) => invMap.set(i.id || i.invoiceNumber, i));
    incomingInvoices.forEach((i) => invMap.set(i.id || i.invoiceNumber, i));
    finalInvoices = Array.from(invMap.values());

    const payMap = new Map<string, PayrollData>();
    currentPayrolls.forEach((p) => payMap.set(p.id || p.payrollNumber, p));
    incomingPayrolls.forEach((p) => payMap.set(p.id || p.payrollNumber, p));
    finalPayrolls = Array.from(payMap.values());

    const schMap = new Map<string, ScheduleItem>();
    currentSchedules.forEach((s) => schMap.set(s.id, s));
    incomingSchedules.forEach((s) => schMap.set(s.id, s));
    finalSchedules = Array.from(schMap.values());
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(finalInvoices));
  localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(finalPayrolls));
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(finalSchedules));
  setLastBackupTime();

  return {
    success: true,
    message:
      mode === 'replace'
        ? 'Seluruh data berhasil ditimpa dari file cadangan!'
        : 'Data berhasil digabungkan dengan file cadangan!',
    counts: {
      invoices: finalInvoices.length,
      payrolls: finalPayrolls.length,
      schedules: finalSchedules.length,
    },
  };
};

