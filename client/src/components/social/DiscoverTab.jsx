import { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { searchUsers, followUser } from '../../api/social';
import { getUserProfile, getAuthToken } from '../../api/auth';
import styles from './DiscoverTab.module.css';

const DiscoverTab = ({ query, setQuery }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Load current user's following list to show correct button states
    const loadCurrentUser = async () => {
      try {
        const res = await getUserProfile();
        setCurrentUserFollowing(res.data.following || []);
        setCurrentUserId(res.data._id);
      } catch (err) {
        console.error('Failed to load user profile for following list', err);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 0) {
        setLoading(true);
        try {
          const res = await searchUsers(query);
          setResults(res.data);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleFollowToggle = async (userId) => {
    try {
      const res = await followUser(userId);
      setCurrentUserFollowing(res.data.following);
    } catch (error) {
      console.error('Follow error', error);
      alert(error.response?.data?.message || 'Error toggling follow');
    }
  };

  return (
    <div className={styles.container}>
      {loading && <div className={styles.loading}>Searching...</div>}

      {!loading && results.length > 0 && (
        <div className={styles.resultsGrid}>
          {results.map((user) => {
            const isFollowing = currentUserFollowing.includes(user._id);
            return (
              <div key={user._id} className={styles.userCard}>
                <img
                  src={user.profilePicture}
                  alt="Avatar"
                  className={styles.avatar}
                />
                <h3 className={styles.displayName}>
                  {user.displayName || user.email?.split('@')[0]}
                </h3>
                <p className={styles.username}>@{user.username || 'user'}</p>
                <span className={styles.race}>{user.race || 'Human'}</span>
                {user._id === currentUserId ? (
                  <button
                    className={styles.followBtn}
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#9ca3af',
                      border: '1px solid #e5e7eb',
                      cursor: 'default',
                    }}
                    disabled
                  >
                    You
                  </button>
                ) : (
                  <button
                    className={`${styles.followBtn} ${isFollowing ? styles.following : styles.notFollowing}`}
                    onClick={() => handleFollowToggle(user._id)}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && query.length > 0 && results.length === 0 && (
        <div className={styles.loading}>No users found.</div>
      )}
    </div>
  );
};

export default DiscoverTab;
