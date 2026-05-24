import React from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("تم عزل خطأ قاتل:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 text-center" dir="rtl">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-black mb-2">عذراً، حدث انقطاع في البيانات</h2>
          <p className="text-slate-500 font-bold mb-6">جدار الحماية منع انهيار التطبيق. يرجى التحديث.</p>
          <button onClick={() => window.location.reload()} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform">تحديث الصفحة</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

export const Toast = ({ message, type, isVisible, action }) => {
  if (!isVisible) return null;
  const bgColor = type === 'error' ? 'bg-red-500/95' : type === 'success' ? 'bg-green-500/95' : 'bg-slate-800/95';
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? Wifi : WifiOff;
  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-3 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-md transition-all duration-500 animate-in slide-in-from-top ${bgColor}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm font-bold tracking-wide">{message}</span>
      {action && action.label && typeof action.onClick === 'function' && (
        <button onClick={action.onClick} className="ml-3 bg-white text-black text-sm font-black px-3 py-1 rounded-md active:scale-95">{action.label}</button>
      )}
    </div>
  );
};

export const LoadingOverlay = ({ isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-900/95 border border-slate-700 p-6 shadow-2xl text-white">
        <div className="animate-spin rounded-full border-4 border-orange-500 border-t-transparent w-14 h-14"></div>
        <p className="text-sm font-black text-center">جاري تحميل بيانات الطقس...</p>
      </div>
    </div>
  );
};
