import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { register } from '../api/auth';
import useAppRoutes from '../hooks/useAppRoutes';
import styles from './Auth.module.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { goToLogin } = useAppRoutes();
  const emailInputRef = useRef(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const validate = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
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
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter.');
      hasError = true;
    } else if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain at least one lowercase letter.');
      hasError = true;
    } else if (!/\d/.test(password)) {
      setPasswordError('Password must contain at least one number.');
      hasError = true;
    } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      setPasswordError('Password must contain at least one special character.');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
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
      await register(email, password);
      navigate('/login', { state: { fromRegister: true } });
    } catch (fetchError) {
      const message =
        fetchError.response?.data?.errors?.[0]?.message ||
        fetchError.response?.data?.message ||
        'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>Register</h1>
        {error && <p className={styles.authError}>{error}</p>}
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
              placeholder="Enter password"
              required
              autoComplete="new-password"
              aria-describedby={passwordError ? 'password-error' : undefined}
              className={styles.inputWithIcon}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
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

          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className={styles.inputGroup}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              required
              autoComplete="new-password"
              aria-describedby={
                confirmPasswordError ? 'confirm-password-error' : undefined
              }
              className={styles.inputWithIcon}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className={styles.iconButton}
              aria-label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
            >
              {showConfirmPassword ? (
                <FiEyeOff size={18} />
              ) : (
                <FiEye size={18} />
              )}
            </button>
          </div>
          {confirmPasswordError && (
            <p
              id="confirm-password-error"
              className={styles.fieldError}
              role="alert"
            >
              {confirmPasswordError}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className={styles.authFooter}>
          <span>Already have an account?</span>
          <button type="button" onClick={goToLogin} className={styles.authLink}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
