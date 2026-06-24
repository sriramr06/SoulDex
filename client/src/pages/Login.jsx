import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import {
  login,
  saveAuthToken,
  saveRefreshToken,
  getUserProfile,
} from '../api/auth';
import useAppRoutes from '../hooks/useAppRoutes';
import { useAuth } from '../hooks/useAuth';
import styles from './Auth.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { goToRegister, goToForgotPassword } = useAppRoutes();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const emailInputRef = useRef(null);
  const serverMessageRef = useRef(null);

  const successMessage = location.state?.fromRegister
    ? 'Registration successful. Please log in.'
    : location.state?.fromReset
      ? 'Password reset successful. Please log in.'
      : '';

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const validate = () => {
    setEmailError('');
    setPasswordError('');
    let hasError = false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }

    return !hasError;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const response = await login(trimmedEmail, password);
      const token = response?.data?.token;
      const refreshToken = response?.data?.refreshToken;

      if (!token) throw new Error('Invalid server response');

      saveAuthToken(token, rememberMe);
      if (refreshToken) saveRefreshToken(refreshToken, rememberMe);

      const profileRes = await getUserProfile();
      setUser(profileRes.data);

      const redirectPath = location.state?.from?.pathname || '/characters';
      navigate(redirectPath, { replace: true });
    } catch (fetchError) {
      let message = 'Login failed. Please try again.';
      if (fetchError.response?.status === 429) {
        message = 'Too many requests. Please try again later.';
      } else if (fetchError.response?.data?.message) {
        message = fetchError.response.data.message;
      } else if (typeof fetchError.response?.data === 'string') {
        message = fetchError.response.data;
      }
      
      setError(message);
      setPassword('');
      // focus server message for screen readers
      serverMessageRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>Login</h1>
        {successMessage && (
          <p className={styles.authSuccess} role="status" aria-live="polite">
            {successMessage}
          </p>
        )}
        {error && (
          <p
            className={styles.authError}
            role="alert"
            aria-live="assertive"
            ref={serverMessageRef}
            tabIndex={-1}
          >
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <label htmlFor="email">Email</label>
          <div className={styles.inputGroup}>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              aria-describedby={emailError ? 'email-error' : undefined}
              ref={emailInputRef}
              className={styles.inputWithIcon}
            />
            <span className={styles.inputIcon} aria-hidden>
              <FiMail size={18} />
            </span>
          </div>
          {emailError && (
            <p id="email-error" className={styles.fieldError} role="alert">
              {emailError}
            </p>
          )}

          <label htmlFor="password">Password</label>
          <div className={styles.inputGroup}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              aria-describedby={passwordError ? 'password-error' : undefined}
              className={styles.inputWithIcon}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className={styles.iconButton}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {passwordError && (
            <p id="password-error" className={styles.fieldError} role="alert">
              {passwordError}
            </p>
          )}

          <div className={styles.rowBetween}>
            <label className={styles.rememberLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe((r) => !r)}
                name="remember"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={goToForgotPassword}
              className={styles.authLink}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className={styles.authFooter}>
          <span>New here?</span>
          <button
            type="button"
            onClick={goToRegister}
            className={styles.authLink}
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
