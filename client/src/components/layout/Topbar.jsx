import styles from './Topbar.module.css';
import { FiMenu, FiMessageSquare } from 'react-icons/fi';
import ThemeToggle from '../ui/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';
import NotificationsDropdown from '../NotificationsDropdown';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const Topbar = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { totalUnread, resetUnread } = useSocket() || {};

  const handleChatClick = () => {
    resetUnread?.();
    navigate('/chat');
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <FiMenu />
        </button>
        <div className={styles.logo}>
          <div className={styles.logoTitle}>SOULDEX</div>
        </div>
      </div>

      <div className={styles.rightSection}>
        <NotificationsDropdown />
        <button 
          className={`${styles.iconBtn} ${styles.mobileChatBtn}`}
          onClick={handleChatClick}
          aria-label="Chat"
        >
          <div className={styles.chatIconWrap}>
            <FiMessageSquare />
            {totalUnread > 0 && (
              <span className={styles.unreadBadge}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </button>
        <div className={styles.desktopThemeToggle}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
