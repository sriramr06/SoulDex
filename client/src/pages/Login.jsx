import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login, saveAuthToken } from '../api/auth';
import useAppRoutes from '../hooks/useAppRoutes';
import styles from './Auth.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { goToRegister, goToCharacters } = useAppRoutes();

  const successMessage = location.state?.fromRegister
    ? 'Registration successful. Please log in.'
    : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      const response = await login(email, password);
      saveAuthToken(response.data.token);
      goToCharacters();
    } catch (fetchError) {
      const message =
        fetchError.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>Login</h1>
        {successMessage && <p className={styles.authSuccess}>{successMessage}</p>}
        {error && <p className={styles.authError}>{error}</p>}
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
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className={styles.authFooter}>
          <span>New here?</span>
          <button type="button" onClick={goToRegister} className={styles.authLink}>
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
