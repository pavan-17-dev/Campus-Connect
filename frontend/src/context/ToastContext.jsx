import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

const icons = { success: 'bi-check-circle-fill', info: 'bi-info-circle-fill', danger: 'bi-exclamation-triangle-fill' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="cc-toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`cc-toast cc-toast-${t.tone}`}>
            <i className={`bi ${icons[t.tone] || icons.info}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
