import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { FiGlobe, FiSearch, FiMessageCircle } from 'react-icons/fi';
import FeedTab from '../components/social/FeedTab';
import ChatTab from '../components/social/ChatTab';
import styles from './Social.module.css';

const Social = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'explore');
  const [discoverQuery, setDiscoverQuery] = useState('');


  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Social Hub</h1>
          <div className={styles.navTabs} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'explore' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('explore')}
              >
                <FiGlobe /> Explore
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <FiMessageCircle /> Chat
              </button>
            </div>
            
            {activeTab !== 'chat' && (
              <div className={styles.searchBar} style={{ margin: 0 }}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search users..."
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.contentArea}>
          {activeTab === 'explore' && (
            <FeedTab
              isModalOpen={false}
              setIsModalOpen={() => {}}
              query={discoverQuery}
            />
          )}
          {activeTab === 'chat' && <ChatTab initialContact={location.state?.userId} />}
        </div>
      </div>
    </Layout>
  );
};

export default Social;
