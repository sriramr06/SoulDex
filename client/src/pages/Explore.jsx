import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { FiSearch } from 'react-icons/fi';
import FeedTab from '../components/social/FeedTab';
import styles from './Explore.module.css';

const Explore = () => {
  const [discoverQuery, setDiscoverQuery] = useState('');

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Explore</h1>
          <div className={styles.searchBar}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search souls..."
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.contentArea}>
          <FeedTab
            isModalOpen={false}
            setIsModalOpen={() => {}}
            query={discoverQuery}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Explore;
