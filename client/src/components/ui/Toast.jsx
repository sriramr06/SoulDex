import styles from './Toast.module.css';

const Toast = ({ message, type = 'error', onClose, actionLabel, onAction }) => {
  return (
    <div
      className={`${styles.toast} ${styles[type] || styles.error}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.toastMessage}>{message}</div>
      {actionLabel && onAction && (
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
