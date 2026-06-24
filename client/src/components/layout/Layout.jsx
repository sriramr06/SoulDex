import { useState } from 'react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './Layout.module.css';

const Layout = ({ children, onScroll, pageRef }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layout}>
      <Topbar onToggleSidebar={toggleSidebar} />
      <div className={styles.bodyWrapper}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div 
          className={`${styles.sidebarBackdrop} ${sidebarOpen ? styles.open : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <main
          className={`${styles.mainContent} ${!sidebarOpen ? styles.sidebarClosed : ''}`}
          onScroll={onScroll}
          ref={pageRef}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
