import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/apiClient';
import Layout from '../components/layout/Layout';
import useAppRoutes from '../hooks/useAppRoutes';
import CreateOCModal from '../components/character-wizard/CreateOCModal';
import CharacterCard from '../components/CharacterCard';
import styles from './Creations.module.css';
import { FiPlus } from 'react-icons/fi';
import { useToast } from '../hooks/useToast';

const Creations = () => {
  const { user } = useAuth();
  const { goToCharacterDetails } = useAppRoutes();
  const { showToast } = useToast();
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOCModal, setShowOCModal] = useState(false);

  const fetchCreations = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/characters/user/${user._id}`);
      setCreations(res.data.characters || []);
    } catch (err) {
      console.error('Failed to load creations:', err);
      setError('Failed to load your creations. Please refresh the page.');
      showToast('Failed to load creations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCreations();
  }, [user]);

  const handleOCSuccess = () => {
    setShowOCModal(false);
    fetchCreations();
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            My Creations{' '}
            {!loading && creations.length > 0 && `(${creations.length})`}
          </h1>
          <button
            className={styles.createBtn}
            onClick={() => setShowOCModal(true)}
          >
            <FiPlus /> Create New Character
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading your spirit archive...</p>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '2rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--status-error)',
              borderRadius: '0.5rem',
              color: 'var(--status-error)',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        ) : creations.length === 0 ? (
          <div className={styles.emptyState}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              You haven't created any characters yet.
            </p>
            <button
              className={styles.createBtn}
              style={{ margin: '0 auto' }}
              onClick={() => setShowOCModal(true)}
            >
              Create Your First OC
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {creations.map((char) => (
              <div
                key={char._id}
                onClick={() => goToCharacterDetails(char._id)}
                style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex' }}
              >
                <CharacterCard character={char} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showOCModal && (
        <CreateOCModal
          onClose={() => setShowOCModal(false)}
          onSuccess={handleOCSuccess}
        />
      )}
    </Layout>
  );
};

export default Creations;
