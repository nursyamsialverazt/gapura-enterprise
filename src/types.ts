export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  id?: string;
  invoiceNumber: string;
  customerName: string;
  address: string;
  eventDate: string;
  downPayment: number;
  items: InvoiceItem[];
  tuanHajatSignature: string | null; // Base64 data URL
  hormatKamiSignature: string | null; // Base64 data URL
  createdAt: string;
  notes?: string;
  paymentStatus?: 'LUNAS' | 'BELUM_LUNAS' | 'AUTO';
}

export interface PayrollColumn {
  id: string;
  name: string;
  isDeduction?: boolean;
}

export interface PayrollRow {
  id: string;
  employeeName: string;
  role?: string;
  amounts: { [columnId: string]: number };
  note?: string;
}

export interface PayrollData {
  id?: string;
  payrollNumber: string;
  title: string;
  date: string;
  columns: PayrollColumn[];
  rows: PayrollRow[];
  preparedBySignature: string | null;
  receivedBySignature: string | null;
  createdAt: string;
  notes?: string;
}

export interface ScheduleItem {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  orderDetails: string;
  setupDate: string;
  teardownDate: string;
  status: 'AKTIF' | 'SELESAI';
  picCrew?: string;
  notes?: string;
  sourceInvoiceId?: string;
  sourceInvoiceNumber?: string;
  createdAt: string;
  completedAt?: string;
}

export type ActiveTab =
  | 'create'
  | 'history'
  | 'payroll'
  | 'payroll-history'
  | 'schedule'
  | 'schedule-history';

