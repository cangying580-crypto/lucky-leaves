import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, action?: { label: string; run: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', action?: { label: string; run: () => void }) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, message, type, actionLabel: action?.label, onAction: action?.run }]);
      window.setTimeout(() => dismiss(id), action ? 6000 : 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-dot" />
            <span className="toast-msg">{t.message}</span>
            {t.actionLabel && (
              <button
                className="toast-action"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button className="toast-close" aria-label="关闭提示" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}