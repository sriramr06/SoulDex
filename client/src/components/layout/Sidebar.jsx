import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import {
  FiArchive,
  FiPenTool,
  FiUsers,
  FiUser,
  FiLogOut,
} from 'react-icons/fi';
import { clearAuthToken } from '../../api/auth';

const Sidebar = ({ isOpen }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}
    >
      <nav className={styles.nav}>
        <NavLink
          to="/characters"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          <FiArchive className={styles.navIcon} />
          <span>Archive</span>
        </NavLink>
        <NavLink
          to="/social"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          <FiUsers className={styles.navIcon} />
          <span>Social</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          <FiUser className={styles.navIcon} />
          <span>Profile</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className={styles.navItem}
          style={{
            marginTop: 'auto',
            background: 'none',
            border: 'none',
            width: '100%',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <FiLogOut className={styles.navIcon} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
