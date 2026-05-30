import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { FiGlobe, FiSearch, FiMessageCircle, FiPlus } from 'react-icons/fi';
import FeedTab from '../components/social/FeedTab';
import DiscoverTab from '../components/social/DiscoverTab';
import ChatTab from '../components/social/ChatTab';
import styles from './Social.module.css';
import discoverStyles from '../components/social/DiscoverTab.module.css';
import feedStyles from '../components/social/FeedTab.module.css';

const Social = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1>Social Hub</h1>
          <div className={styles.navTabs}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'feed' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              <FiGlobe /> Feed
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'discover' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('discover')}
            >
              <FiSearch /> Discover
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <FiMessageCircle /> Chat
            </button>
          </div>

          <div className={styles.headerRight}>
            {activeTab === 'feed' && (
              <button 
                className={feedStyles.createPostBtn} 
                style={{ margin: 0 }} 
                onClick={() => setIsPostModalOpen(true)}
              >
                <FiPlus /> New Post
              </button>
            )}
            {activeTab === 'discover' && (
              <div className={discoverStyles.searchBar} style={{ margin: 0, padding: '0.5rem 1rem' }}>
                <FiSearch className={discoverStyles.searchIcon} />
                <input
                  type="text"
                  className={discoverStyles.searchInput}
                  placeholder="Search users..."
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.contentArea}>
          {activeTab === 'feed' && <FeedTab isModalOpen={isPostModalOpen} setIsModalOpen={setIsPostModalOpen} />}
          {activeTab === 'discover' && <DiscoverTab query={discoverQuery} setQuery={setDiscoverQuery} />}
          {activeTab === 'chat' && <ChatTab />}
        </div>
      </div>
    </Layout>
  );
};

export default Social;
