import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type TToastVariant = 'info' | 'success' | 'error';

interface IToast {
  id: string;
  message: string;
  variant: TToastVariant;
}

interface IToastContext {
  showToast: (message: string, variant?: TToastVariant) => void;
}

const ToastContext = createContext<IToastContext | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<IToast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, variant: TToastVariant = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, variant }]);

    const timer = setTimeout(() => dismiss(id), 4000);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-3 left-3 right-3 z-100 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: IToast; onDismiss: (id: string) => void }) {
  const variantClasses: Record<TToastVariant, string> = {
    info: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    success: 'border-emerald-800 bg-emerald-950 text-success',
    error: 'border-red-800 bg-red-950 text-error',
  };

  const icons: Record<TToastVariant, string> = {
    info: 'ℹ',
    success: '✓',
    error: '✕',
  };

  return (
    <div
      className={[
        'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-xl',
        'text-sm w-full',
        variantClasses[toast.variant],
      ].join(' ')}
    >
      <span className="shrink-0 font-mono text-xs mt-0.5">{icons[toast.variant]}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function useToast(): IToastContext {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
