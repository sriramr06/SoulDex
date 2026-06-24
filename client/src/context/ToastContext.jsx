import { useState, useRef, useCallback, useEffect } from 'react';
import Toast from '../components/ui/Toast';
import { ToastContext } from './ToastContextDefinition';
import { setShowToast, clearShowToast } from '../utils/toastService';

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const hideToast = useCallback(() => {
    setToast(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message, type = 'info', options = {}) => {
      if (!message) return;
      const { actionLabel, onAction } = options;
      setToast({ message, type, actionLabel, onAction });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(hideToast, 4000);
    },
    [hideToast],
  );

  useEffect(() => {
    // Register for programmatic toasts (api client)
    setShowToast(showToast);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearShowToast();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          actionLabel={toast.actionLabel}
          onAction={() => {
            if (typeof toast.onAction === 'function') toast.onAction();
            hideToast();
          }}
        />
      )}
    </ToastContext.Provider>
  );
};
