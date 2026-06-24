import { useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ChatTab from '../components/social/ChatTab';
import styles from './Chat.module.css';

const Chat = () => {
  const location = useLocation();

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <ChatTab initialContact={location.state?.userId} />
      </div>
    </Layout>
  );
};

export default Chat;
