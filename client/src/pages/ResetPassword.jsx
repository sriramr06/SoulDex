import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import useAppRoutes from '../hooks/useAppRoutes';
import styles from './Auth.module.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { goToLogin } = useAppRoutes();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is required.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate('/login', { state: { fromReset: true } });
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.message ||
          'Unable to reset password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>Set New Password</h1>
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
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter a new password"
            required
          />
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your new password"
            required
          />
          <button type="submit" disabled={loading || !token}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
        <div className={styles.authFooter}>
          <span>Back to login?</span>
          <button type="button" onClick={goToLogin} className={styles.authLink}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
