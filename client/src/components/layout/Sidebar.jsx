import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import {
  FiArchive,
  FiCompass,
  FiMessageSquare,
  FiUser,
  FiLogOut,
  FiPlusCircle,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../ui/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}
    >
      <div className={styles.mobileHeader}>
        <div 
          className={styles.mobileProfileInfo} 
          onClick={() => {
            navigate('/profile');
            handleLinkClick();
          }}
          role="button"
          tabIndex={0}
        >
          <img 
            src={user?.profilePicture || 'https://via.placeholder.com/150'} 
            alt="Avatar" 
            className={styles.avatar} 
          />
          <span className={styles.displayName}>{user?.displayName || user?.username}</span>
        </div>
        <div className={styles.mobileThemeToggle}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/characters"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
          onClick={handleLinkClick}
        >
          <FiArchive className={styles.navIcon} />
          <span>Archive</span>
        </NavLink>
        <NavLink
          to="/creations"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
          onClick={handleLinkClick}
        >
          <FiPlusCircle className={styles.navIcon} />
          <span>Creations</span>
        </NavLink>
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
          onClick={handleLinkClick}
        >
          <FiCompass className={styles.navIcon} />
          <span>Explore</span>
        </NavLink>
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active} ${styles.desktopOnly}` : `${styles.navItem} ${styles.desktopOnly}`
          }
          onClick={handleLinkClick}
        >
          <FiMessageSquare className={styles.navIcon} />
          <span>Chat</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active} ${styles.desktopOnly}` : `${styles.navItem} ${styles.desktopOnly}`
          }
          onClick={handleLinkClick}
        >
          <FiUser className={styles.navIcon} />
          <span>Profile</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className={`${styles.navItem} ${styles.logoutBtn}`}
        >
          <FiLogOut className={styles.navIcon} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
