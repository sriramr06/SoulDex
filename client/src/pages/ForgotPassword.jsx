import { useState } from 'react';
import { requestPasswordReset } from '../api/auth';
import useAppRoutes from '../hooks/useAppRoutes';
import styles from './Auth.module.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { goToLogin } = useAppRoutes();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setMessage(
        'If that email is registered, a password reset link has been sent.',
      );
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.message ||
          'Unable to send password reset link. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>Reset Password</h1>
        {message && (
          <p className={styles.authSuccess} role="status" aria-live="polite">
            {message}
          </p>
        )}
        {error && (
          <p className={styles.authError} role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <div className={styles.authFooter}>
          <span>Remembered your password?</span>
          <button type="button" onClick={goToLogin} className={styles.authLink}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
