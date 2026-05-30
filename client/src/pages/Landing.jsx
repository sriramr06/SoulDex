import useAppRoutes from '../hooks/useAppRoutes';
import styles from './Landing.module.css';

const Landing = () => {
  const { goToLogin } = useAppRoutes();

  return (
    <div className={styles.landingContainer}>
      <div>
        <div className={styles.landingTitle}>SoulDex</div>
        <div className={styles.landingSubtitle}>
          The Character Repository of Bleach Anime
        </div>
      </div>
      <div className={styles.enterBtn}>
        <button onClick={goToLogin}>Enter Spirit Archive</button>
      </div>
    </div>
  );
};

export default Landing;