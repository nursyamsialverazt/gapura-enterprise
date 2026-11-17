import React, { useState, useEffect, useRef } from 'react';
import {
  FilePlus2,
  History,
  RotateCcw,
  Sparkles,
  Printer,
  Eye,
  CheckCircle,
  FileSpreadsheet,
  Coins,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Database,
} from 'lucide-react';
import { InvoiceData, InvoiceItem, ActiveTab, PayrollData, ScheduleItem } from './types';
import { generateInvoiceNumber } from './utils/formatters';
import {
  getInvoicesFromStorage,
  saveInvoiceToStorage,
  deleteInvoiceFromStorage,
  clearAllInvoicesFromStorage,
  updateInvoiceStatusInStorage,
  getPayrollsFromStorage,
  savePayrollToStorage,
  deletePayrollFromStorage,
  clearAllPayrollsFromStorage,
  getSchedulesFromStorage,
  saveScheduleToStorage,
  deleteScheduleFromStorage,
  updateScheduleStatusInStorage,
  clearAllSchedulesFromStorage,
} from './utils/storage';
import { Header } from './components/Header';
import { CustomerForm } from './components/CustomerForm';
import { ItemsList } from './components/ItemsList';
import { SignaturePad } from './components/SignaturePad';
import { InvoicePreview } from './components/InvoicePreview';
import { ActionButtons } from './components/ActionButtons';
import { HistoryPage } from './components/HistoryPage';
import { PayrollPage } from './components/PayrollPage';
import { PayrollHistoryPage } from './components/PayrollHistoryPage';
import { SchedulePage } from './components/SchedulePage';
import { ScheduleHistoryPage } from './components/ScheduleHistoryPage';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  ensureUserWorkspace,
  subscribeUserInvoices,
  subscribeUserSchedules,
  subscribeUserPayrolls,
  saveInvoiceToCloud,
  updateInvoiceStatusInCloud,
  deleteInvoiceFromCloud,
  saveScheduleToCloud,
  updateScheduleStatusInCloud,
  deleteScheduleFromCloud,
  savePayrollToCloud,
  deletePayrollFromCloud,
  migrateLocalDataToCloud,
  sanitizeDocId,
} from './services/cloudSync';
import { CloudSyncBar } from './components/CloudSyncBar';
import { BackupModal } from './components/BackupModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { ToastContainer, ToastMessage } from './components/Toast';

const createEmptyInvoice = (): InvoiceData => ({
  invoiceNumber: generateInvoiceNumber(),
  customerName: '',
  address: '',
  eventDate: '',
  downPayment: 0,
  items: [
    {
      id: '1',
      name: '',
      quantity: 1,
      price: 0,
    },
  ],
  tuanHajatSignature: null,
  hormatKamiSignature: null,
  createdAt: new Date().toISOString(),
});

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [invoice, setInvoice] = useState<InvoiceData>(createEmptyInvoice());
  const [historyList, setHistoryList] = useState<InvoiceData[]>([]);
  const [payrollHistoryList, setPayrollHistoryList] = useState<PayrollData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [editingPayroll, setEditingPayroll] = useState<PayrollData | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupCategory, setBackupCategory] = useState<'all' | 'invoices' | 'schedules' | 'payrolls'>('all');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Firebase Auth & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const cloudInvoiceIdsRef = useRef<Set<string>>(new Set());
  const cloudScheduleIdsRef = useRef<Set<string>>(new Set());
  const cloudPayrollIdsRef = useRef<Set<string>>(new Set());
  const hasMigratedRef = useRef<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial local storage on mount (instant offline-first startup)
  useEffect(() => {
    setHistoryList(getInvoicesFromStorage());
    setPayrollHistoryList(getPayrollsFromStorage());
    setSchedules(getSchedulesFromStorage());
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        try {
          await ensureUserWorkspace(currentUser);
        } catch (err) {
          console.error('Failed ensuring workspace:', err);
        }
      } else {
        hasMigratedRef.current = null;
        cloudInvoiceIdsRef.current.clear();
        cloudScheduleIdsRef.current.clear();
        cloudPayrollIdsRef.current.clear();
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore collections when signed in (with persistent offline cache)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    let invReady = false;
    let schReady = false;
    let payReady = false;

    const tryMigrateLocal = async () => {
      if (!invReady || !schReady || !payReady) return;
      if (hasMigratedRef.current === user.uid) return;
      hasMigratedRef.current = user.uid;

      const previousCloudUid = localStorage.getItem('gapura_cloud_uid');
      const isDifferentUser = previousCloudUid && previousCloudUid !== user.uid;
      localStorage.setItem('gapura_cloud_uid', user.uid);

      if (isDifferentUser) {
        return;
      }

      const localInvoices = getInvoicesFromStorage();
      const localSchedules = getSchedulesFromStorage();
      const localPayrolls = getPayrollsFromStorage();

      if (localInvoices.length > 0 || localSchedules.length > 0 || localPayrolls.length > 0) {
        setIsSyncing(true);
        try {
          const uploaded = await migrateLocalDataToCloud(
            user.uid,
            localInvoices,
            localSchedules,
            localPayrolls,
            cloudInvoiceIdsRef.current,
            cloudScheduleIdsRef.current,
            cloudPayrollIdsRef.current
          );
          if (uploaded > 0) {
            showToast(`${uploaded} data lokal berhasil disinkronkan ke Cloud!`, 'success');
          }
        } catch (err) {
          console.error('Migration error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const unsubInvoices = subscribeUserInvoices(user.uid, (items, ids) => {
      cloudInvoiceIdsRef.current = ids;
      invReady = true;
      if (items.length > 0 || hasMigratedRef.current === user.uid) {
        setHistoryList(items);
        try {
          localStorage.setItem('gapura_enterprise_invoices_v4', JSON.stringify(items));
        } catch {
          // ignore storage quota errors
        }
      }
      void tryMigrateLocal();
    });

    const unsubSchedules = subscribeUserSchedules(user.uid, (items, ids) => {
      cloudScheduleIdsRef.current = ids;
      schReady = true;
      if (items.length > 0 || hasMigratedRef.current === user.uid) {
        setSchedules(items);
        try {
          localStorage.setItem('gapura_enterprise_schedules_v1', JSON.stringify(items));
        } catch {
          // ignore
        }
      }
      void tryMigrateLocal();
    });

    const unsubPayrolls = subscribeUserPayrolls(user.uid, (items, ids) => {
      cloudPayrollIdsRef.current = ids;
      payReady = true;
      if (items.length > 0 || hasMigratedRef.current === user.uid) {
        setPayrollHistoryList(items);
        try {
          localStorage.setItem('gapura_enterprise_payrolls_v1', JSON.stringify(items));
        } catch {
          // ignore
        }
      }
      void tryMigrateLocal();
    });

    return () => {
      unsubInvoices();
      unsubSchedules();
      unsubPayrolls();
    };
  }, [isAuthReady, user]);

  const handleCloudSignIn = async () => {
    try {
      setIsSyncing(true);
      await signInWithPopup(auth, googleProvider);
      showToast('Berhasil masuk ke Google Cloud! Data Anda kini aman.', 'success');
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Gagal masuk dengan Google. Pastikan koneksi internet aktif.', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudSignOut = async () => {
    try {
      await signOut(auth);
      showToast('Berhasil keluar dari akun Google Cloud.', 'info');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleOpenBackup = (
    category: 'all' | 'invoices' | 'schedules' | 'payrolls' = 'all'
  ) => {
    setBackupCategory(category);
    setIsBackupModalOpen(true);
  };

  const handleDataRestored = async () => {
    const restoredInvoices = getInvoicesFromStorage();
    const restoredPayrolls = getPayrollsFromStorage();
    const restoredSchedules = getSchedulesFromStorage();
    setHistoryList(restoredInvoices);
    setPayrollHistoryList(restoredPayrolls);
    setSchedules(restoredSchedules);

    if (user) {
      setIsSyncing(true);
      try {
        await migrateLocalDataToCloud(
          user.uid,
          restoredInvoices,
          restoredSchedules,
          restoredPayrolls,
          cloudInvoiceIdsRef.current,
          cloudScheduleIdsRef.current,
          cloudPayrollIdsRef.current
        );
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'info'
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Customer details
  const handleCustomerChange = (fields: {
    customerName?: string;
    address?: string;
    eventDate?: string;
  }) => {
    setInvoice((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  // Items manipulation
  const handleAddItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `${Date.now()}-${Math.random()}`,
          name: '',
          quantity: 1,
          price: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (invoice.items.length <= 1) return;
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setInvoice((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, items: updated };
    });
  };

  const handleUpdateDP = (amount: number) => {
    setInvoice((prev) => ({ ...prev, downPayment: amount }));
  };

  // Signatures
  const handleSaveTuanHajatSignature = (dataUrl: string | null) => {
    setInvoice((prev) => ({ ...prev, tuanHajatSignature: dataUrl }));
  };

  const handleSaveHormatKamiSignature = (dataUrl: string | null) => {
    setInvoice((prev) => ({ ...prev, hormatKamiSignature: dataUrl }));
  };

  // Clear Form
  const handleClearForm = () => {
    if (
      invoice.customerName ||
      invoice.items.some((i) => i.name) ||
      invoice.downPayment > 0
    ) {
      if (!window.confirm('Bersihkan form dan buat nota baru?')) {
        return;
      }
    }
    setInvoice(createEmptyInvoice());
    showToast('Form telah direset untuk nota baru.', 'info');
  };

  // Save to DB (Local + Firestore Cloud)
  const handleSaveToDB = () => {
    const ensId = sanitizeDocId(invoice.id || `inv-${Date.now()}`);
    const invoiceWithId: InvoiceData = {
      ...invoice,
      id: ensId,
      createdAt: invoice.createdAt || new Date().toISOString(),
    };
    setInvoice(invoiceWithId);
    const updated = saveInvoiceToStorage(invoiceWithId);
    setHistoryList(updated);

    if (user) {
      void saveInvoiceToCloud(user.uid, invoiceWithId, cloudInvoiceIdsRef.current);
    }
  };

  // Load from History into Editor
  const handleLoadInvoice = (selectedInvoice: InvoiceData) => {
    setInvoice({
      ...selectedInvoice,
    });
    setActiveTab('create');
    showToast(`Nota ${selectedInvoice.customerName || selectedInvoice.invoiceNumber} dimuat ke Editor.`, 'success');
  };

  // Delete from History
  const handleDeleteInvoice = (id: string) => {
    const updated = deleteInvoiceFromStorage(id);
    setHistoryList(updated);
    if (user) {
      void deleteInvoiceFromCloud(id);
    }
  };

  // Delete all from History
  const handleClearAllInvoices = () => {
    const prevIds = historyList.map((i) => i.id || i.invoiceNumber).filter(Boolean);
    const updated = clearAllInvoicesFromStorage();
    setHistoryList(updated);
    if (user) {
      prevIds.forEach((id) => {
        void deleteInvoiceFromCloud(id);
      });
    }
  };

  // Update status (Lunas / Belum Lunas / Auto)
  const handleUpdateInvoiceStatus = (
    id: string,
    status: 'LUNAS' | 'BELUM_LUNAS' | 'AUTO'
  ) => {
    const updated = updateInvoiceStatusInStorage(id, status);
    setHistoryList(updated);
    if (invoice.id === id || invoice.invoiceNumber === id) {
      setInvoice((prev) => ({
        ...prev,
        paymentStatus: status === 'AUTO' ? undefined : status,
      }));
    }
    if (user) {
      void updateInvoiceStatusInCloud(id, status);
    }
  };

  // ================= PAYROLL HANDLERS =================
  const handleSavePayrollToHistory = (payroll: PayrollData) => {
    const ensId = sanitizeDocId(payroll.id || `payroll-${Date.now()}`);
    const payrollWithId: PayrollData = {
      ...payroll,
      id: ensId,
      createdAt: payroll.createdAt || new Date().toISOString(),
    };
    const updated = savePayrollToStorage(payrollWithId);
    setPayrollHistoryList(updated);
    if (user) {
      void savePayrollToCloud(user.uid, payrollWithId, cloudPayrollIdsRef.current);
    }
  };

  const handleDeletePayroll = (id: string) => {
    const updated = deletePayrollFromStorage(id);
    setPayrollHistoryList(updated);
    if (user) {
      void deletePayrollFromCloud(id);
    }
  };

  const handleClearAllPayrolls = () => {
    const prevIds = payrollHistoryList.map((p) => p.id || p.payrollNumber).filter(Boolean);
    const updated = clearAllPayrollsFromStorage();
    setPayrollHistoryList(updated);
    if (user) {
      prevIds.forEach((id) => {
        void deletePayrollFromCloud(id);
      });
    }
  };

  const handleLoadPayrollToEditor = (selected: PayrollData) => {
    setEditingPayroll(selected);
    setActiveTab('payroll');
    showToast(`Memuat data rekap "${selected.title || selected.payrollNumber}"`, 'info');
  };

  const handleCreateNewPayroll = () => {
    setEditingPayroll(null);
    setActiveTab('payroll');
  };

  // ================= SCHEDULE / JADWAL HANDLERS =================
  const handleSaveSchedule = (newSchedule: ScheduleItem) => {
    const ensId = sanitizeDocId(newSchedule.id || `schedule-${Date.now()}`);
    const scheduleWithId: ScheduleItem = {
      ...newSchedule,
      id: ensId,
      createdAt: newSchedule.createdAt || new Date().toISOString(),
    };
    const updated = saveScheduleToStorage(scheduleWithId);
    setSchedules(updated);
    if (user) {
      void saveScheduleToCloud(user.uid, scheduleWithId, cloudScheduleIdsRef.current);
    }
    showToast(`Jadwal "${scheduleWithId.customerName}" berhasil disimpan!`, 'success');
  };

  const handleDeleteSchedule = (id: string) => {
    const updated = deleteScheduleFromStorage(id);
    setSchedules(updated);
    if (user) {
      void deleteScheduleFromCloud(id);
    }
  };

  const handleUpdateScheduleStatus = (id: string, status: 'AKTIF' | 'SELESAI') => {
    const updated = updateScheduleStatusInStorage(id, status);
    setSchedules(updated);
    if (user) {
      void updateScheduleStatusInCloud(id, status);
    }
  };

  const handleClearAllScheduleHistory = () => {
    const completedIds = schedules.filter((s) => s.status === 'SELESAI').map((s) => s.id);
    const activeOnly = schedules.filter((s) => s.status === 'AKTIF');
    localStorage.setItem('gapura_enterprise_schedules_v1', JSON.stringify(activeOnly));
    setSchedules(activeOnly);
    if (user) {
      completedIds.forEach((id) => {
        void deleteScheduleFromCloud(id);
      });
    }
  };

  const activeScheduleCount = schedules.filter((s) => s.status === 'AKTIF').length;
  const completedScheduleCount = schedules.filter((s) => s.status === 'SELESAI').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleClearForm}
        historyCount={historyList.length}
        payrollHistoryCount={payrollHistoryList.length}
        activeScheduleCount={activeScheduleCount}
        scheduleHistoryCount={completedScheduleCount}
        onOpenBackup={() => handleOpenBackup('all')}
        onOpenInstall={() => setShowInstallModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 mb-16 md:mb-6">
        <CloudSyncBar
          user={user}
          isAuthReady={isAuthReady}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onSignIn={handleCloudSignIn}
          onSignOut={handleCloudSignOut}
        />
        {activeTab === 'schedule' ? (
          <SchedulePage
            schedules={schedules}
            availableInvoices={historyList}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onUpdateStatus={handleUpdateScheduleStatus}
            onNavigateToHistory={() => setActiveTab('schedule-history')}
            onShowToast={showToast}
            onOpenBackup={() => handleOpenBackup('schedules')}
          />
        ) : activeTab === 'schedule-history' ? (
          <ScheduleHistoryPage
            schedules={schedules}
            availableInvoices={historyList}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onClearAllHistory={handleClearAllScheduleHistory}
            onUpdateStatus={handleUpdateScheduleStatus}
            onNavigateToActive={() => setActiveTab('schedule')}
            onShowToast={showToast}
            onOpenBackup={() => handleOpenBackup('schedules')}
          />
        ) : activeTab === 'history' ? (
          <HistoryPage
            invoices={historyList}
            onLoadInvoice={handleLoadInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onClearAllInvoices={handleClearAllInvoices}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            onShowToast={showToast}
            onOpenBackup={() => handleOpenBackup('invoices')}
          />
        ) : activeTab === 'payroll-history' ? (
          <PayrollHistoryPage
            payrolls={payrollHistoryList}
            onLoadPayroll={handleLoadPayrollToEditor}
            onDeletePayroll={handleDeletePayroll}
            onClearAllPayrolls={handleClearAllPayrolls}
            onCreateNewPayroll={handleCreateNewPayroll}
            onShowToast={showToast}
            onOpenBackup={() => handleOpenBackup('payrolls')}
          />
        ) : activeTab === 'payroll' ? (
          <PayrollPage
            onShowToast={showToast}
            onSaveToHistory={handleSavePayrollToHistory}
            onNavigateToHistory={() => setActiveTab('payroll-history')}
            initialPayrollData={editingPayroll}
            historyCount={payrollHistoryList.length}
            onOpenBackup={() => handleOpenBackup('payrolls')}
          />
        ) : (
          <div className="space-y-4">
            {/* Quick Access to Jadwal & Backup Banner (Desktop Only) */}
            <div className="hidden md:flex bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/5 border border-amber-300/70 rounded-2xl p-4 flex-row items-center justify-between gap-3 shadow-sm bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B0000] text-[#bef264] flex items-center justify-center font-bold shadow-md shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-800 text-base">
                        Menu Jadwal Pasang & Bongkar Tenda
                    </span>
                    <span className="bg-[#8B0000] text-[#bef264] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Aktif & Siap Pakai
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Catat nama tuan hajat, no HP, alamat, rincian pesanan, tgl pasang/bongkar & bagikan via Tabel Word / PDF / WhatsApp!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="banner-btn-open-schedule"
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#8B0000] text-white hover:bg-[#700000] text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#bef264]" />
                  <span>Buka Jadwal ({activeScheduleCount})</span>
                </button>
                <button
                  id="banner-btn-open-schedule-history"
                  type="button"
                  onClick={() => setActiveTab('schedule-history')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-[#8B0000]" />
                  <span>Jadwal per Bulan</span>
                </button>
                <button
                  id="banner-btn-open-backup"
                  type="button"
                  onClick={() => handleOpenBackup('all')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 text-xs font-bold rounded-xl border border-amber-300/80 transition cursor-pointer"
                  title="Cadangkan dan Pulihkan Data Seluruh Modul"
                >
                  <Database className="w-4 h-4 text-amber-700" />
                  <span>Backup Data</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form & Inputs */}
              <div className="lg:col-span-6 space-y-4">
                {/* Section 1: Customer Info */}
                <CustomerForm
                  customerName={invoice.customerName}
                  address={invoice.address}
                  eventDate={invoice.eventDate}
                  onChange={handleCustomerChange}
                />

                {/* Section 2: Items & DP */}
                <ItemsList
                  items={invoice.items}
                  downPayment={invoice.downPayment}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItem={handleUpdateItem}
                  onUpdateDP={handleUpdateDP}
                />

                {/* Section 3: Dual Signatures */}
                <div id="signatures-section" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wider text-[#8B0000] uppercase">
                      Tanda Tangan Digital
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Otomatis masuk ke cetakan
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SignaturePad
                      label="Tanda Tangan Tuan Hajat"
                      signatureData={invoice.tuanHajatSignature}
                      onSave={handleSaveTuanHajatSignature}
                      idPrefix="sig-tuan-hajat"
                    />
                    <SignaturePad
                      label="Tanda Tangan Hormat Kami"
                      signatureData={invoice.hormatKamiSignature}
                      onSave={handleSaveHormatKamiSignature}
                      idPrefix="sig-hormat-kami"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Invoice Preview & Actions */}
              <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-20">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase">
                      <Eye className="w-4 h-4 text-[#8B0000]" />
                      <span>PREVIEW NOTA CETAK</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      {invoice.invoiceNumber}
                    </span>
                  </div>

                  {/* Printable Paper Container */}
                  <div className="overflow-x-auto bg-slate-100/70 p-2 sm:p-4 rounded-lg border border-slate-200/80">
                    <InvoicePreview ref={previewRef} invoice={invoice} />
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4">
                    <ActionButtons
                      invoice={invoice}
                      previewRef={previewRef}
                      onSaveToDB={handleSaveToDB}
                      onClearForm={handleClearForm}
                      onShowToast={showToast}
                      onOpenBackup={() => handleOpenBackup('invoices')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (ONLY navigation bar on Mobile) */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-1 flex justify-around items-center z-40 shadow-xl"
      >
        <button
          id="tab-btn-create-mobile"
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
            activeTab === 'create'
              ? 'text-[#8B0000] font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FilePlus2 className="w-4 h-4" />
          <span className="text-[10px]">Nota</span>
        </button>

        <button
          id="tab-btn-schedule-mobile"
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition relative ${
            activeTab === 'schedule'
              ? 'text-[#8B0000] font-black'
              : 'text-amber-700 font-bold hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {activeScheduleCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#8B0000] text-white text-[8px] font-bold px-1 rounded-full">
                {activeScheduleCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Jadwal</span>
        </button>

        <button
          id="tab-btn-schedule-history-mobile"
          type="button"
          onClick={() => setActiveTab('schedule-history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition relative ${
            activeTab === 'schedule-history'
              ? 'text-[#8B0000] font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-[#8B0000]" />
          <span className="text-[10px]">Per Bulan</span>
        </button>

        <button
          id="tab-btn-payroll-mobile"
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
            activeTab === 'payroll' || activeTab === 'payroll-history'
              ? 'text-[#8B0000] font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="text-[10px]">Gaji</span>
        </button>

        <button
          id="tab-btn-history-mobile"
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
            activeTab === 'history'
              ? 'text-[#8B0000] font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px]">Riw. Nota</span>
        </button>

        <button
          id="tab-btn-backup-mobile"
          type="button"
          onClick={() => handleOpenBackup('all')}
          className="flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition text-amber-700 hover:text-amber-900 active:scale-95"
          title="Buka menu Cadangkan & Pulihkan Data"
        >
          <Database className="w-4 h-4 text-amber-600" />
          <span className="text-[10px] font-bold">Backup</span>
        </button>
      </nav>

      {/* Backup & Restore Data Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        invoices={historyList}
        schedules={schedules}
        payrolls={payrollHistoryList}
        defaultCategory={backupCategory}
        onDataRestored={handleDataRestored}
        onShowToast={showToast}
      />

      {/* PWA & Offline APK Install Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onShowToast={showToast}
      />

      {/* Notification Toast Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
