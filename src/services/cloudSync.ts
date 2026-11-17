import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { InvoiceData, PayrollData, ScheduleItem } from '../types';

export function sanitizeDocId(rawId: string): string {
  const cleaned = String(rawId || `doc-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 128);
  return cleaned || `doc-${Date.now()}`;
}

function truncateStr(val: string | undefined | null, maxLen: number): string {
  if (!val) return '';
  return String(val).slice(0, maxLen);
}

function truncateOptionalStr(
  val: string | undefined | null,
  maxLen: number
): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val).slice(0, maxLen);
}

function buildInvoicePayload(
  invoice: InvoiceData,
  ownerId: string,
  includeCreateFields: boolean
) {
  const safeItems = (Array.isArray(invoice.items) ? invoice.items : [])
    .slice(0, 100)
    .map((item) => ({
      id: truncateStr(item.id || `${Date.now()}`, 80),
      name: truncateStr(item.name || '', 200),
      quantity: Number.isFinite(Number(item.quantity)) ? Math.max(0, Number(item.quantity)) : 0,
      price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
    }));

  const safeDownPayment = Number.isFinite(Number(invoice.downPayment))
    ? Math.max(0, Number(invoice.downPayment))
    : 0;

  const base: Record<string, any> = {
    invoiceNumber: truncateStr(invoice.invoiceNumber || `INV-${Date.now()}`, 80),
    customerName: truncateStr(invoice.customerName || '', 200),
    address: truncateStr(invoice.address || '', 500),
    eventDate: truncateStr(invoice.eventDate || '', 60),
    downPayment: safeDownPayment,
    items: safeItems,
    tuanHajatSignature: truncateOptionalStr(invoice.tuanHajatSignature, 150000),
    hormatKamiSignature: truncateOptionalStr(invoice.hormatKamiSignature, 150000),
    notes: truncateOptionalStr(invoice.notes, 1000),
    paymentStatus: invoice.paymentStatus || null,
    updatedAt: serverTimestamp(),
  };

  if (includeCreateFields) {
    base.ownerId = ownerId;
    base.displayCreatedAt = truncateStr(
      invoice.createdAt || new Date().toISOString(),
      60
    );
    base.createdAt = serverTimestamp();
  }

  return base;
}

function buildSchedulePayload(
  schedule: ScheduleItem,
  ownerId: string,
  includeCreateFields: boolean
) {
  const base: Record<string, any> = {
    customerName: truncateStr(schedule.customerName || '', 200),
    address: truncateStr(schedule.address || '', 500),
    phone: truncateStr(schedule.phone || '', 40),
    orderDetails: truncateStr(schedule.orderDetails || '', 5000),
    setupDate: truncateStr(schedule.setupDate || '', 60),
    teardownDate: truncateStr(schedule.teardownDate || '', 60),
    status: schedule.status === 'SELESAI' ? 'SELESAI' : 'AKTIF',
    picCrew: truncateOptionalStr(schedule.picCrew, 300),
    notes: truncateOptionalStr(schedule.notes, 1000),
    sourceInvoiceId: truncateOptionalStr(schedule.sourceInvoiceId, 128),
    sourceInvoiceNumber: truncateOptionalStr(schedule.sourceInvoiceNumber, 80),
    completedAt: truncateOptionalStr(schedule.completedAt, 60),
    updatedAt: serverTimestamp(),
  };

  if (includeCreateFields) {
    base.ownerId = ownerId;
    base.displayCreatedAt = truncateStr(
      schedule.createdAt || new Date().toISOString(),
      60
    );
    base.createdAt = serverTimestamp();
  }

  return base;
}

function buildPayrollPayload(
  payroll: PayrollData,
  ownerId: string,
  includeCreateFields: boolean
) {
  const safeColumns = (Array.isArray(payroll.columns) ? payroll.columns : [])
    .slice(0, 30)
    .map((col) => ({
      id: truncateStr(col.id || `${Date.now()}`, 80),
      name: truncateStr(col.name || '', 100),
      isDeduction: Boolean(col.isDeduction),
    }));

  const safeRows = (Array.isArray(payroll.rows) ? payroll.rows : [])
    .slice(0, 100)
    .map((row) => ({
      id: truncateStr(row.id || `${Date.now()}`, 80),
      employeeName: truncateStr(row.employeeName || '', 150),
      role: truncateStr(row.role || '', 100),
      amounts: row.amounts && typeof row.amounts === 'object' ? row.amounts : {},
      note: truncateStr(row.note || '', 200),
    }));

  const base: Record<string, any> = {
    payrollNumber: truncateStr(payroll.payrollNumber || `GAJI-${Date.now()}`, 80),
    title: truncateStr(payroll.title || '', 200),
    date: truncateStr(payroll.date || '', 60),
    columns: safeColumns,
    rows: safeRows,
    preparedBySignature: truncateOptionalStr(payroll.preparedBySignature, 150000),
    receivedBySignature: truncateOptionalStr(payroll.receivedBySignature, 150000),
    notes: truncateOptionalStr(payroll.notes, 1000),
    updatedAt: serverTimestamp(),
  };

  if (includeCreateFields) {
    base.ownerId = ownerId;
    base.displayCreatedAt = truncateStr(
      payroll.createdAt || new Date().toISOString(),
      60
    );
    base.createdAt = serverTimestamp();
  }

  return base;
}

// ==================== USER WORKSPACE ====================

export async function ensureUserWorkspace(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        uid: user.uid,
        email: truncateOptionalStr(user.email, 200),
        displayName: truncateOptionalStr(user.displayName, 150),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        email: truncateOptionalStr(user.email, 200),
        displayName: truncateOptionalStr(user.displayName, 150),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==================== REALTIME SUBSCRIPTIONS ====================

export function subscribeUserInvoices(
  uid: string,
  onData: (items: InvoiceData[], knownIds: Set<string>) => void
): Unsubscribe {
  const path = 'invoices';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const ids = new Set<string>();
      const list: InvoiceData[] = snapshot.docs.map((d) => {
        ids.add(d.id);
        const data = d.data();
        return {
          id: d.id,
          invoiceNumber: data.invoiceNumber || '',
          customerName: data.customerName || '',
          address: data.address || '',
          eventDate: data.eventDate || '',
          downPayment: Number(data.downPayment || 0),
          items: Array.isArray(data.items) ? data.items : [],
          tuanHajatSignature: data.tuanHajatSignature ?? null,
          hormatKamiSignature: data.hormatKamiSignature ?? null,
          notes: data.notes ?? undefined,
          paymentStatus: data.paymentStatus ?? undefined,
          createdAt: data.displayCreatedAt || new Date().toISOString(),
        };
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list, ids);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserSchedules(
  uid: string,
  onData: (items: ScheduleItem[], knownIds: Set<string>) => void
): Unsubscribe {
  const path = 'schedules';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const ids = new Set<string>();
      const list: ScheduleItem[] = snapshot.docs.map((d) => {
        ids.add(d.id);
        const data = d.data();
        return {
          id: d.id,
          customerName: data.customerName || '',
          address: data.address || '',
          phone: data.phone || '',
          orderDetails: data.orderDetails || '',
          setupDate: data.setupDate || '',
          teardownDate: data.teardownDate || '',
          status: data.status === 'SELESAI' ? 'SELESAI' : 'AKTIF',
          picCrew: data.picCrew ?? undefined,
          notes: data.notes ?? undefined,
          sourceInvoiceId: data.sourceInvoiceId ?? undefined,
          sourceInvoiceNumber: data.sourceInvoiceNumber ?? undefined,
          completedAt: data.completedAt ?? undefined,
          createdAt: data.displayCreatedAt || new Date().toISOString(),
        };
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list, ids);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserPayrolls(
  uid: string,
  onData: (items: PayrollData[], knownIds: Set<string>) => void
): Unsubscribe {
  const path = 'payrolls';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const ids = new Set<string>();
      const list: PayrollData[] = snapshot.docs.map((d) => {
        ids.add(d.id);
        const data = d.data();
        return {
          id: d.id,
          payrollNumber: data.payrollNumber || '',
          title: data.title || '',
          date: data.date || '',
          columns: Array.isArray(data.columns) ? data.columns : [],
          rows: Array.isArray(data.rows) ? data.rows : [],
          preparedBySignature: data.preparedBySignature ?? null,
          receivedBySignature: data.receivedBySignature ?? null,
          notes: data.notes ?? undefined,
          createdAt: data.displayCreatedAt || new Date().toISOString(),
        };
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list, ids);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==================== CRUD MUTATIONS ====================

export async function saveInvoiceToCloud(
  uid: string,
  invoice: InvoiceData,
  knownIds: Set<string>
): Promise<string> {
  const docId = sanitizeDocId(invoice.id || `inv-${Date.now()}`);
  const path = `invoices/${docId}`;
  const docRef = doc(db, 'invoices', docId);
  const exists = knownIds.has(docId);

  try {
    if (exists) {
      await updateDoc(docRef, buildInvoicePayload(invoice, uid, false));
    } else {
      await setDoc(docRef, buildInvoicePayload(invoice, uid, true));
      knownIds.add(docId);
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function updateInvoiceStatusInCloud(
  id: string,
  paymentStatus: 'LUNAS' | 'BELUM_LUNAS' | 'AUTO'
): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `invoices/${docId}`;
  try {
    await updateDoc(doc(db, 'invoices', docId), {
      paymentStatus: paymentStatus === 'AUTO' ? null : paymentStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInvoiceFromCloud(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `invoices/${docId}`;
  try {
    await deleteDoc(doc(db, 'invoices', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveScheduleToCloud(
  uid: string,
  schedule: ScheduleItem,
  knownIds: Set<string>
): Promise<string> {
  const docId = sanitizeDocId(schedule.id || `schedule-${Date.now()}`);
  const path = `schedules/${docId}`;
  const docRef = doc(db, 'schedules', docId);
  const exists = knownIds.has(docId);

  try {
    if (exists) {
      await updateDoc(docRef, buildSchedulePayload(schedule, uid, false));
    } else {
      await setDoc(docRef, buildSchedulePayload(schedule, uid, true));
      knownIds.add(docId);
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function updateScheduleStatusInCloud(
  id: string,
  status: 'AKTIF' | 'SELESAI'
): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `schedules/${docId}`;
  try {
    await updateDoc(doc(db, 'schedules', docId), {
      status,
      completedAt: status === 'SELESAI' ? new Date().toISOString() : null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteScheduleFromCloud(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `schedules/${docId}`;
  try {
    await deleteDoc(doc(db, 'schedules', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePayrollToCloud(
  uid: string,
  payroll: PayrollData,
  knownIds: Set<string>
): Promise<string> {
  const docId = sanitizeDocId(payroll.id || `payroll-${Date.now()}`);
  const path = `payrolls/${docId}`;
  const docRef = doc(db, 'payrolls', docId);
  const exists = knownIds.has(docId);

  try {
    if (exists) {
      await updateDoc(docRef, buildPayrollPayload(payroll, uid, false));
    } else {
      await setDoc(docRef, buildPayrollPayload(payroll, uid, true));
      knownIds.add(docId);
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deletePayrollFromCloud(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `payrolls/${docId}`;
  try {
    await deleteDoc(doc(db, 'payrolls', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function migrateLocalDataToCloud(
  uid: string,
  localInvoices: InvoiceData[],
  localSchedules: ScheduleItem[],
  localPayrolls: PayrollData[],
  cloudInvoiceIds: Set<string>,
  cloudScheduleIds: Set<string>,
  cloudPayrollIds: Set<string>
): Promise<number> {
  let uploadedCount = 0;

  for (const inv of localInvoices) {
    const docId = sanitizeDocId(inv.id || inv.invoiceNumber);
    if (!cloudInvoiceIds.has(docId)) {
      await saveInvoiceToCloud(uid, { ...inv, id: docId }, cloudInvoiceIds);
      uploadedCount++;
    }
  }

  for (const sch of localSchedules) {
    // Skip default starter samples if user already has cloud schedules
    const isStarterSample = sch.id === 'sch-sample-1' || sch.id === 'sch-sample-2';
    if (isStarterSample && cloudScheduleIds.size > 0) continue;

    const docId = sanitizeDocId(sch.id);
    if (!cloudScheduleIds.has(docId)) {
      await saveScheduleToCloud(uid, { ...sch, id: docId }, cloudScheduleIds);
      uploadedCount++;
    }
  }

  for (const pay of localPayrolls) {
    const docId = sanitizeDocId(pay.id || pay.payrollNumber);
    if (!cloudPayrollIds.has(docId)) {
      await savePayrollToCloud(uid, { ...pay, id: docId }, cloudPayrollIds);
      uploadedCount++;
    }
  }

  return uploadedCount;
}
