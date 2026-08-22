import React from 'react';
import { Zap, X, Bell } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  subtitle: string;
  type?: 'success' | 'info' | 'warning';
}

interface SyncToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const SyncToastNotification: React.FC<SyncToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 border border-teal-500/50 shadow-[0_10px_25px_rgba(0,0,0,0.5)] rounded-xl p-3.5 flex items-start gap-3 backdrop-blur-md animate-slideInRight transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-950 text-teal-400 border border-teal-800/80 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-slate-100 truncate">{toast.title}</h4>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-500 hover:text-slate-200 text-xs p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-teal-300/90 mt-0.5 font-medium leading-tight">{toast.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
