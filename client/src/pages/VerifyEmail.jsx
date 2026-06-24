import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import styles from './Auth.module.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'pending' : 'error'); // pending | success | error
  const [message, setMessage] = useState(token ? '' : 'Missing verification token.');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      return;
    }

    const doVerify = async () => {
      try {
        const res = await verifyEmail(token);
        setStatus('success');
        setMessage(
          res.data?.message || 'Email verified. Redirecting to login...',
        );
        setTimeout(
          () => navigate('/login', { state: { verified: true } }),
          2000,
        );
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      }
    };

    doVerify();
  }, [token, navigate]);

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>Verify Email</h1>
        {status === 'pending' && <p>Verifying your email...</p>}
        {status === 'success' && (
          <p className={styles.authSuccess} role="status">
            {message}
          </p>
        )}
        {status === 'error' && (
          <p className={styles.authError} role="alert">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
