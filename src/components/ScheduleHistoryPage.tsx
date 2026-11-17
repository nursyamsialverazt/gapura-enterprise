import React from 'react';
import { ScheduleItem, InvoiceData } from '../types';
import { MonthlySchedulePage } from './MonthlySchedulePage';

interface ScheduleHistoryPageProps {
  schedules: ScheduleItem[];
  availableInvoices?: InvoiceData[];
  onSaveSchedule?: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onClearAllHistory?: () => void;
  onUpdateStatus: (id: string, status: 'AKTIF' | 'SELESAI') => void;
  onNavigateToActive: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBackup?: () => void;
}

export const ScheduleHistoryPage: React.FC<ScheduleHistoryPageProps> = ({
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
  return (
    <MonthlySchedulePage
      schedules={schedules}
      availableInvoices={availableInvoices}
      onSaveSchedule={onSaveSchedule || (() => {})}
      onDeleteSchedule={onDeleteSchedule}
      onClearAllHistory={onClearAllHistory}
      onUpdateStatus={onUpdateStatus}
      onNavigateToActive={onNavigateToActive}
      onShowToast={onShowToast}
      onOpenBackup={onOpenBackup}
    />
  );
};
