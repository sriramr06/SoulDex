import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLock,
  FiUser,
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiChevronRight,
} from 'react-icons/fi';
import Layout from '../components/layout/Layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { updateUserProfile } from '../api/auth';
import { changePassword, deleteAccount } from '../api/auth';
import { clearAuthToken, clearRefreshToken } from '../api/tokenStorage';
import styles from './Settings.module.css';

const TABS = [
  { id: 'account', label: 'Account', icon: FiUser },
  { id: 'security', label: 'Security', icon: FiLock },
  { id: 'danger', label: 'Danger Zone', icon: FiAlertTriangle },
];

const RACE_OPTIONS = [
  'Human',
  'Shinigami',
  'Hollow',
  'Arrancar',
  'Quincy',
  'Fullbringer',
  'Visored',
  'Other',
];

/* ─────────────────────────── Account Tab ─────────────────────────── */
const AccountTab = ({ user, updateProfileState, showToast }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('isPrivate', isPrivate);
      const res = await updateUserProfile(formData);
      updateProfileState(res.data);
      showToast('Account settings updated successfully!', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update account settings.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSave} id="account-settings-form">
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Account Information</h3>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="settings-email">Email Address</label>
          <input
            id="settings-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="settings-privacy">Account Privacy</label>
          <div className={styles.toggleWrapper}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                id="settings-privacy"
                className={styles.toggleInput}
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleText}>
                {isPrivate ? 'Private Account (Only followers can see your posts)' : 'Public Account (Anyone can see your posts)'}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          id="save-account-btn"
          className={styles.primaryBtn}
          disabled={saving}
        >
          {saving ? 'Saving...' : (
            <><FiCheck className={styles.btnIcon} /> Save Changes</>
          )}
        </button>
      </div>
    </form>
  );
};

/* ─────────────────────────── Security Tab ─────────────────────────── */
const SecurityTab = ({ showToast, logout, navigate }) => {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!current) e.current = 'Current password is required.';
    if (!newPwd || newPwd.length < 8) e.newPwd = 'New password must be at least 8 characters.';
    if (newPwd !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await changePassword(current, newPwd);
      showToast('Password changed! You have been logged out of other devices.', 'success');
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to change password.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} id="security-settings-form">
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Change Password</h3>
        <p className={styles.sectionDesc}>
          After changing your password, all other active sessions will be signed out automatically.
        </p>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="settings-current-password">Current Password</label>
          <div className={styles.passwordWrapper}>
            <input
              id="settings-current-password"
              className={`${styles.input} ${errors.current ? styles.inputError : ''}`}
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrent(!showCurrent)} tabIndex={-1}>
              {showCurrent ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.current && <span className={styles.fieldError}>{errors.current}</span>}
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="settings-new-password">New Password</label>
          <div className={styles.passwordWrapper}>
            <input
              id="settings-new-password"
              className={`${styles.input} ${errors.newPwd ? styles.inputError : ''}`}
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(!showNew)} tabIndex={-1}>
              {showNew ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.newPwd && <span className={styles.fieldError}>{errors.newPwd}</span>}
          <div className={styles.strengthBar}>
            <div
              className={styles.strengthFill}
              style={{ width: newPwd.length >= 12 ? '100%' : newPwd.length >= 8 ? '60%' : newPwd.length > 0 ? '25%' : '0%',
                backgroundColor: newPwd.length >= 12 ? 'var(--status-success)' : newPwd.length >= 8 ? 'var(--status-warning)' : 'var(--status-error)' }}
            />
          </div>
          <span className={styles.strengthLabel}>
            {newPwd.length === 0 ? '' : newPwd.length >= 12 ? 'Strong' : newPwd.length >= 8 ? 'Fair' : 'Weak'}
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="settings-confirm-password">Confirm New Password</label>
          <input
            id="settings-confirm-password"
            className={`${styles.input} ${errors.confirm ? styles.inputError : ''}`}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
          {errors.confirm && <span className={styles.fieldError}>{errors.confirm}</span>}
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          id="change-password-btn"
          type="submit"
          className={styles.primaryBtn}
          disabled={saving}
        >
          {saving ? 'Updating...' : (
            <><FiLock className={styles.btnIcon} /> Update Password</>
          )}
        </button>
      </div>
    </form>
  );
};

/* ──────────────────────── Danger Zone Tab ─────────────────────────── */
const DangerTab = ({ showToast, logout, navigate }) => {
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password) { showToast('Please enter your password.', 'error'); return; }
    setDeleting(true);
    try {
      await deleteAccount(password);
      clearAuthToken();
      clearRefreshToken();
      showToast('Your account has been deleted.', 'success');
      await logout();
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete account.';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={`${styles.formSection} ${styles.dangerSection}`}>
        <div className={styles.dangerHeader}>
          <FiAlertTriangle className={styles.dangerIcon} />
          <h3 className={styles.sectionTitle}>Delete Account</h3>
        </div>
        <p className={styles.sectionDesc}>
          Permanently delete your account and all associated data including posts, messages,
          and character creations. <strong>This action cannot be undone.</strong>
        </p>
        <button
          id="delete-account-trigger"
          className={styles.dangerBtn}
          onClick={() => setShowModal(true)}
          type="button"
        >
          <FiAlertTriangle className={styles.btnIcon} />
          Delete My Account
        </button>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <FiAlertTriangle className={styles.modalDangerIcon} />
              <h3 className={styles.modalTitle}>Confirm Account Deletion</h3>
            </div>
            <p className={styles.modalDesc}>
              This will permanently delete all your data. Enter your password to confirm.
            </p>
            <input
              id="delete-account-password"
              className={`${styles.input} ${styles.modalInput}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => { setShowModal(false); setPassword(''); }}
                type="button"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                className={styles.dangerBtn}
                onClick={handleDelete}
                disabled={deleting}
                type="button"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────── Main Page ───────────────────────────── */
const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const { user, updateProfileState, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSubtitle}>Manage your account preferences</p>
        </div>

        <div className={styles.container}>
          {/* Sidebar Nav */}
          <nav className={styles.tabNav}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`settings-tab-${id}`}
                className={`${styles.tabBtn} ${activeTab === id ? styles.tabActive : ''} ${id === 'danger' ? styles.tabDanger : ''}`}
                onClick={() => setActiveTab(id)}
                type="button"
              >
                <Icon className={styles.tabIcon} />
                <span>{label}</span>
                <FiChevronRight className={styles.tabChevron} />
              </button>
            ))}
          </nav>

          {/* Panel */}
          <div className={styles.panel}>
            {activeTab === 'account' && (
              <AccountTab user={user} updateProfileState={updateProfileState} showToast={showToast} />
            )}
            {activeTab === 'security' && (
              <SecurityTab showToast={showToast} logout={logout} navigate={navigate} />
            )}
            {activeTab === 'danger' && (
              <DangerTab showToast={showToast} logout={logout} navigate={navigate} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
