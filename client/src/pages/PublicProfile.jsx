import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicProfile, getUserProfile } from '../api/auth';
import { getUserPosts, followUser } from '../api/social';
import api from '../api/apiClient';
import Layout from '../components/layout/Layout';
import CharacterCard from '../components/CharacterCard';
import styles from './Profile.module.css';
import { FiGrid, FiUsers, FiUser, FiImage } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateProfileState } = useAuth();
  const { showToast } = useToast();
  
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [creations, setCreations] = useState([]);
  
  const [activeTab, setActiveTab] = useState('posts');
  const [socialModal, setSocialModal] = useState({ isOpen: false, type: 'followers' });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingCreations, setIsLoadingCreations] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await getPublicProfile(id);
        setProfileUser(res.data);
      } catch (err) {
        console.error(err);
        setErrorMsg('User not found or invalid ID.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const res = await getUserPosts(id);
        setPosts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    fetchUserPosts();
  }, [id]);

  useEffect(() => {
    const fetchCreations = async () => {
      setIsLoadingCreations(true);
      try {
        const res = await api.get(`/api/characters/user/${id}`);
        setCreations(res.data.characters || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingCreations(false);
      }
    };
    fetchCreations();
  }, [id]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      showToast('You must be logged in to follow users.', 'error');
      return;
    }
    try {
      await followUser(id);
      
      // Update the current user's follow state in Context safely by refetching
      const userRes = await getUserProfile();
      updateProfileState(userRes.data);

      // Re-fetch public profile to update their follower count natively
      const res = await getPublicProfile(id);
      setProfileUser(res.data);
      
      showToast('Follow status updated.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update follow status.', 'error');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateText}>Loading profile...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (errorMsg || !profileUser) {
    return (
      <Layout>
        <div className={styles.pageContainer}>
          <button onClick={() => window.history.back()} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '1rem' }}>
            &larr; Go Back
          </button>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateText}>{errorMsg || 'User not found.'}</div>
          </div>
        </div>
      </Layout>
    );
  }

  const isFollowing = currentUser?.following?.some(u => typeof u === 'string' ? u === id : u._id === id);

  return (
    <>
      <Layout>
        <div className={styles.pageContainer}>
          <button onClick={() => window.history.back()} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '1rem' }}>
            &larr; Go Back
          </button>
          <header className={styles.profileHeaderSection}>
            <div className={styles.avatarContainer}>
              <img src={profileUser.profilePicture} alt="Avatar" />
            </div>

            <div className={styles.profileInfoContainer}>
              <div className={styles.usernameRow}>
                <h2 className={styles.username}>{profileUser.username}</h2>
                <div className={styles.actionButtons}>
                  {currentUser?._id !== profileUser._id && (
                    <button
                      className={styles.actionBtn}
                      onClick={handleToggleFollow}
                      style={{
                        background: isFollowing ? 'var(--bg-elevated)' : 'var(--text-primary)',
                        color: isFollowing ? 'var(--text-primary)' : 'var(--bg-primary)',
                      }}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{profileUser.postsCount || posts.length}</span> posts
                </div>
                <div 
                  className={styles.statItem}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSocialModal({ isOpen: true, type: 'followers' })}
                >
                  <span className={styles.statNumber}>{profileUser.followers?.length || 0}</span> followers
                </div>
                <div 
                  className={styles.statItem}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSocialModal({ isOpen: true, type: 'following' })}
                >
                  <span className={styles.statNumber}>{profileUser.following?.length || 0}</span> following
                </div>
              </div>

              <div className={styles.bioSection}>
                <h1 className={styles.displayName}>{profileUser.displayName}</h1>
                <p className={styles.bioText}>{profileUser.bio}</p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Member since {new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </header>

          <div className={styles.divider}></div>

          <div className={styles.tabNav} role="tablist">
            <button
              className={`${styles.tabButton} ${activeTab === 'posts' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              <FiGrid className={styles.tabIcon} /> <span>POSTS</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'creations' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('creations')}
            >
              <FiImage className={styles.tabIcon} /> <span>CREATIONS</span>
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'posts' && (
              <div>
                {isLoadingPosts ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>Loading posts...</div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FiGrid className={styles.emptyStateIcon} />
                    <div className={styles.emptyStateText}>No Posts Yet</div>
                  </div>
                ) : (
                  <div className={`${styles.grid} ${styles.gridPosts}`}>
                    {posts.map((post) => (
                      <div key={post._id} className={styles.card}>
                        <div className={styles.cardImage}>
                          <img src={post.imageUrl} alt={post.caption || 'Post'} />
                        </div>
                        <div className={styles.cardOverlay}>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'creations' && (
              <div>
                {isLoadingCreations ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>Loading creations...</div>
                  </div>
                ) : creations.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FiImage className={styles.emptyStateIcon} />
                    <div className={styles.emptyStateText}>No Creations Yet</div>
                  </div>
                ) : (
                  <div className={`${styles.grid} ${styles.gridCharacters}`}>
                    {creations.map((char) => (
                      <div
                        key={char._id}
                        onClick={() => navigate(`/characters/${char._id}`)}
                        style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex' }}
                      >
                        <CharacterCard character={char} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>

      {socialModal.isOpen && (
        <div className={styles.modalOverlay} onClick={() => setSocialModal({ isOpen: false, type: 'followers' })}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{socialModal.type === 'followers' ? 'Followers' : 'Following'}</h2>
              <button className={styles.closeBtn} onClick={() => setSocialModal({ isOpen: false, type: 'followers' })}>
                &times;
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
              {socialModal.type === 'followers' ? (
                (!profileUser.followers || profileUser.followers.length === 0) ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No followers.</div>
                ) : (
                  profileUser.followers.map((contact) => (
                    <div 
                      key={contact._id} 
                      style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                      onClick={() => { setSocialModal({ isOpen: false }); navigate(`/profile/${contact._id}`); }}
                    >
                      <img src={contact.profilePicture} alt={contact.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '1rem', objectFit: 'cover' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold' }}>{contact.displayName}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{contact.username}</span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                (!profileUser.following || profileUser.following.length === 0) ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Not following anyone.</div>
                ) : (
                  profileUser.following.map((contact) => (
                    <div 
                      key={contact._id} 
                      style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                      onClick={() => { setSocialModal({ isOpen: false }); navigate(`/profile/${contact._id}`); }}
                    >
                      <img src={contact.profilePicture} alt={contact.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '1rem', objectFit: 'cover' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontWeight: 'bold' }}>{contact.displayName}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{contact.username}</span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicProfile;
