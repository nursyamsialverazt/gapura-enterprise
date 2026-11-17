import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage =
        'Terjadi gangguan saat memproses data. Silakan muat ulang halaman.';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error) {
          if (String(parsed.error).includes('permission') || String(parsed.error).includes('insufficient')) {
            friendlyMessage =
              'Akses database ditolak atau sesi login perlu diperbarui. Silakan muat ulang dan masuk kembali.';
          } else {
            friendlyMessage = `Kendala sinkronisasi: ${parsed.error}`;
          }
        }
      } catch {
        // Use default friendly message if not JSON
      }

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border border-red-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#8B0000] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Ada Kendala Sementara
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
