import styles from './Topbar.module.css';
import { FiBell, FiSearch } from 'react-icons/fi';

const Topbar = () => {
  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        <div className={styles.logo}>
          <div className={styles.logoTitle}>SOULDEX</div>
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconBtn}>
          <FiBell />
        </button>

      </div>
    </header>
  );
};

export default Topbar;
