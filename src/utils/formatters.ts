/**
 * Utility functions for IDR Currency and Date formatting
 */

export const formatRupiah = (amount: number): string => {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumberOnly = (amount: number): string => {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const parseNumberInput = (value: string): number => {
  const clean = value.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      } else {
        // DD-MM-YYYY
        return dateStr;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const formatDateTimeIndo = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '-';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    const dateFormatted = date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateFormatted}, ${hours}:${minutes} WIB`;
  } catch {
    return dateTimeStr;
  }
};

export const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GE-${year}${month}${day}-${random}`;
};

export const generatePayrollNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GJ-${year}${month}${day}-${random}`;
};

/**
 * Checks if a payroll column is a deduction / kasbon
 */
export const isDeductionColumn = (col: { name: string; isDeduction?: boolean }): boolean => {
  if (typeof col.isDeduction === 'boolean') {
    return col.isDeduction;
  }
  const lower = (col.name || '').toLowerCase();
  return (
    lower.includes('kasbon') ||
    lower.includes('potongan') ||
    lower.includes('pinjaman') ||
    lower.includes('denda') ||
    lower.includes('minus')
  );
};

