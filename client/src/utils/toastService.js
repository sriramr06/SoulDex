let _showToast = null;

export const setShowToast = (fn) => {
  _showToast = fn;
};

export const clearShowToast = () => {
  _showToast = null;
};

export const showToast = (message, type = 'error', options = {}) => {
  if (!_showToast) {
    // Fallback to console when provider not registered
    console.warn('Toast unavailable:', message);
    return;
  }
  _showToast(message, type, options);
};

export default {
  setShowToast,
  clearShowToast,
  showToast,
};
