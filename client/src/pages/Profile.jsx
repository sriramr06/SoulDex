import { useState, useEffect, useRef } from 'react';

import api from '../api/apiClient';
import {
  createPost,
  getUserPosts,
  deletePost,
  followUser,
  updatePost,
  toggleLike,
  addComment,
  deleteComment,
} from '../api/social';
import { getUserProfile, updateUserProfile } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Layout from '../components/layout/Layout';
import {
  FiX,
  FiTrash2,
  FiPlus,
  FiGrid,
  FiBookmark,
  FiImage,
  FiHeart,
  FiMessageSquare,
} from 'react-icons/fi';
import { AiFillHeart } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import useAppRoutes from '../hooks/useAppRoutes';
import CharacterCard from '../components/CharacterCard';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, updateProfileState, authLoading } = useAuth();
  const { goToCharacterDetails } = useAppRoutes();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('posts');
  const [socialModal, setSocialModal] = useState({
    isOpen: false,
    type: 'followers',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [username, setUsername] = useState(user?.username || '');
  const [race, setRace] = useState(user?.race || '');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const postRefs = useRef({});

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostCaption, setEditPostCaption] = useState('');
  const [isSavingPost, setIsSavingPost] = useState(false);

  const [posts, setPosts] = useState([]);
  const [creations, setCreations] = useState([]);
  // rely on authLoading from useAuth instead of duplicate profile fetch
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingCreations, setIsLoadingCreations] = useState(true);
  // undo is handled via global toast action

  useEffect(() => {
    const draft = localStorage.getItem('postDraftCaption');
    if (draft) {
      setCaption(draft);
    }
  }, []);

  // profile data is loaded by AuthProvider; avoid duplicate fetch here

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB.', 'error');
        e.target.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('File must be an image.', 'error');
        e.target.value = '';
        return;
      }
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (profilePicPreview) {
        URL.revokeObjectURL(profilePicPreview);
      }
    };
  }, [profilePicPreview]);

  useEffect(() => {
    if (!isEditing) {
      const timeoutId = setTimeout(() => {
        setDisplayName(user?.displayName || '');
        setBio(user?.bio || '');
        setUsername(user?.username || '');
        setRace(user?.race || '');
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [user, isEditing]);

  const resetProfileEdit = () => {
    setIsEditing(false);
    setProfilePicFile(null);
    setProfilePicPreview(null);
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
    setUsername(user?.username || '');
    setRace(user?.race || '');
    setProfileError('');
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileError('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setProfileError('Username cannot be empty.');
      setSaving(false);
      return;
    }

    if (trimmedUsername.endsWith('.')) {
      setProfileError('Username cannot end with a period.');
      setSaving(false);
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
      setProfileError(
        'Username can only contain letters, numbers, underscores, and periods.',
      );
      setSaving(false);
      return;
    }

    const formData = new FormData();
    formData.append('displayName', displayName.trim());
    formData.append('bio', bio.trim());
    formData.append('username', trimmedUsername);
    formData.append('race', race.trim());
    if (profilePicFile) {
      formData.append('profilePicture', profilePicFile);
    }

    try {
      const response = await updateUserProfile(formData);
      const updatedUser = {
        ...response.data,
        postsCount:
          response.data.postsCount ?? user?.postsCount ?? posts.length,
      };
      updateProfileState(updatedUser);
      resetProfileEdit();
    } catch (err) {
      console.error('Failed to save profile:', err);
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to update profile.';
      setProfileError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const removeFavorite = async (charId) => {
    if (!window.confirm('Remove this favorite?')) return;
    const prevFavorites = user?.favorites ? [...user.favorites] : [];
    setFavoriteLoading((s) => ({ ...s, [charId]: true }));
    try {
      const response = await api.post(`/api/favorites/${charId}`);
      const updatedUser = { ...user, favorites: response.data.favorites };
      updateProfileState(updatedUser);
      // use global toast with action to allow undo
      showToast('Favorite removed', 'info', {
        actionLabel: 'Undo',
        onAction: async () => {
          try {
            await api.post(`/api/favorites/${charId}`);
            updateProfileState({ ...user, favorites: prevFavorites });
            showToast('Favorite restored.', 'success');
          } catch (err) {
            console.error('Failed to restore favorite via undo:', err);
            showToast('Failed to restore favorite.', 'error');
          }
        },
      });
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      showToast('Failed to remove favorite.', 'error');
    } finally {
      setFavoriteLoading((s) => ({ ...s, [charId]: false }));
    }
  };

  // loading maps for per-item actions
  const [followLoading, setFollowLoading] = useState({});
  const [favoriteLoading, setFavoriteLoading] = useState({});

  const toggleFollow = async (targetUserId) => {
    setFollowLoading((s) => ({ ...s, [targetUserId]: true }));
    try {
      await followUser(targetUserId);
      const res = await getUserProfile();
      updateProfileState(res.data);
      showToast('Follow state updated.', 'success');
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      showToast('Failed to update follow.', 'error');
    } finally {
      setFollowLoading((s) => ({ ...s, [targetUserId]: false }));
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB.', 'error');
        e.target.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('File must be an image.', 'error');
        e.target.value = '';
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const resetPostModal = () => {
    setIsPostModalOpen(false);
    setImageFile(null);
    setImagePreview(null);
    setCaption('');
    localStorage.removeItem('postDraftCaption');
  };

  const handleCloseCreatePost = () => {
    if (imageFile || caption) {
      if (window.confirm('You have unsaved changes. Discard?')) {
        setIsPostModalOpen(false);
      }
    } else {
      setIsPostModalOpen(false);
    }
  };

  const handleDraftPost = () => {
    localStorage.setItem('postDraftCaption', caption);
    showToast('Draft saved locally!', 'success');
    setIsPostModalOpen(false);
  };


  const handleEditPostSave = async (postId) => {
    setIsSavingPost(true);
    try {
      const res = await updatePost(postId, { caption: editPostCaption });
      setPosts((prev) => prev.map((p) => p._id === res.data._id ? res.data : p));
      setEditingPostId(null);
      showToast('Post updated successfully.', 'success');
    } catch (err) {
      console.error('Failed to update post:', err);
      showToast('Failed to update post.');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await toggleLike(postId);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, likes: res.data.likes } : post,
        ),
      );
    } catch (error) {
      console.error('Like error', error);
      showToast('Unable to like post. Please try again.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCommentPostId) return;
    try {
      const res = await addComment(activeCommentPostId, commentText);
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p._id === res.data._id ? res.data : p)),
      );
      setCommentText('');
      showToast('Comment added!', 'success');
    } catch (err) {
      console.error('Comment error', err);
      showToast('Failed to add comment.');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await deleteComment(postId, commentId);
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post._id === res.data._id ? res.data : post)),
      );
    } catch (err) {
      console.error('Delete comment error', err);
      showToast('Failed to delete comment.');
    }
  };

  const handleDeleteUserPost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      if (user && typeof user.postsCount === 'number') {
        updateProfileState({
          ...user,
          postsCount: Math.max(0, user.postsCount - 1),
        });
      }
      showToast('Post deleted successfully.', 'success');
      if (activeCommentPostId === postId) setActiveCommentPostId(null);
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast('Could not delete post.');
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      showToast('Please select an image.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);

    try {
      await createPost(formData);
      if (user?._id) {
        try {
          const res = await getUserPosts(user._id);
          const unique = res.data.filter(
            (p, index, arr) => arr.findIndex((x) => x._id === p._id) === index,
          );
          setPosts(unique);
          if (user && typeof user.postsCount === 'number') {
            updateProfileState({ ...user, postsCount: unique.length });
          }
        } catch (err) {
          console.error('Failed to refresh posts:', err);
        }
      }
      resetPostModal();
      showToast('Post created successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to upload post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user?._id) return;
      setIsLoadingPosts(true);
      try {
        const res = await getUserPosts(user._id);
        const unique = res.data.filter(
          (p, index, arr) => arr.findIndex((x) => x._id === p._id) === index,
        );
        setPosts(unique);
      } catch (err) {
        console.error('Failed to load user posts:', err);
        showToast('Failed to load user posts.', 'error');
      } finally {
        setIsLoadingPosts(false);
      }
    };
    fetchUserPosts();
  }, [user?._id, showToast]);

  useEffect(() => {
    const fetchCreations = async () => {
      if (!user?._id) return;
      setIsLoadingCreations(true);
      try {
        const res = await api.get(`/api/characters/user/${user._id}`);
        setCreations(res.data.characters || []);
      } catch (err) {
        console.error('Failed to load creations:', err);
        showToast('Failed to load creations.', 'error');
      } finally {
        setIsLoadingCreations(false);
      }
    };
    fetchCreations();
  }, [user?._id, showToast]);

  if (authLoading && !user) {
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

  return (
    <>
      <Layout>
        <div className={styles.pageContainer}>
          {activeTab === 'posts' && (
            <div className={styles.floatingPostBtn}>
              <button
                onClick={() => setIsPostModalOpen(true)}
                title="Create New Post"
              >
                <FiPlus />
              </button>
            </div>
          )}

          <header className={styles.profileHeaderSection}>
            <div className={styles.avatarContainer}>
              <img
                src={profilePicPreview || user?.profilePicture}
                alt="Avatar"
              />
            </div>

            <div className={styles.profileInfoContainer}>
              <div className={styles.usernameRow}>
                <h2 className={styles.username}>
                  {user?.username ? `${user.username}` : 'username'}
                </h2>
                <div className={styles.actionButtons}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      setDisplayName(user?.displayName || '');
                      setBio(user?.bio || '');
                      setUsername(user?.username || '');
                      setRace(user?.race || '');
                      setIsEditing(true);
                    }}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {user?.postsCount || posts.length || 0}
                  </span>{' '}
                  posts
                </div>
                <div
                  className={styles.statItem}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setSocialModal({ isOpen: true, type: 'followers' })
                  }
                >
                  <span className={styles.statNumber}>
                    {user?.followers?.length || 0}
                  </span>{' '}
                  followers
                </div>
                <div
                  className={styles.statItem}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setSocialModal({ isOpen: true, type: 'following' })
                  }
                >
                  <span className={styles.statNumber}>
                    {user?.following?.length || 0}
                  </span>{' '}
                  following
                </div>
              </div>

              <div className={styles.bioSection}>
                <h1 className={styles.displayName}>
                  {user?.displayName || 'Soul Society Shinigami'}
                </h1>
                <p className={styles.bioText}>
                  {user?.bio ||
                    'No records yet. Edit your profile to add a strong bio.'}
                </p>
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
              className={`${styles.tabButton} ${activeTab === 'favorites' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <FiBookmark className={styles.tabIcon} /> <span>FAVORITES</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'creations' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('creations')}
            >
              <FiImage className={styles.tabIcon} /> <span>CREATIONS</span>
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'favorites' &&
              (!user?.favorites || user.favorites.length === 0 ? (
                <div className={styles.emptyState}>
                  <FiBookmark className={styles.emptyStateIcon} />
                  <div className={styles.emptyStateText}>No Favorites Yet</div>
                </div>
              ) : (
                <div className={`${styles.grid} ${styles.gridCharacters} ${styles.gridFavorites}`}>
                  {user.favorites.map((char) => (
                    <div
                      key={char._id}
                      onClick={() => goToCharacterDetails(char._id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <CharacterCard
                        character={char}
                        action={
                          <button
                            type="button"
                            className={`${styles.cardAction} ${styles.cardActionFavorites}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(char._id);
                            }}
                            title="Remove favorite"
                            aria-hidden={!!favoriteLoading[char._id]}
                            disabled={!!favoriteLoading[char._id]}
                            aria-disabled={!!favoriteLoading[char._id]}
                            aria-label="Remove favorite"
                          >
                            <AiFillHeart size={18} color="white" />
                            <span className={styles.heartFallback} aria-hidden>
                              ❤
                            </span>
                            <span className={styles.srOnly}>
                              Remove favorite
                            </span>
                          </button>
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === 'creations' && (
              <div>
                {isLoadingCreations ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>Loading...</div>
                  </div>
                ) : creations.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FiImage className={styles.emptyStateIcon} />
                    <div className={styles.emptyStateText}>
                      No Creations Yet
                    </div>
                  </div>
                ) : (
                  <div className={`${styles.grid} ${styles.gridCharacters}`}>
                    {creations.map((char) => (
                      <div
                        key={char._id}
                        onClick={() => goToCharacterDetails(char._id)}
                        style={{
                          cursor: 'pointer',
                          textDecoration: 'none',
                          display: 'flex',
                        }}
                      >
                        <CharacterCard character={char} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div>
                {isLoadingPosts ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>Loading...</div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FiGrid className={styles.emptyStateIcon} />
                    <div className={styles.emptyStateText}>No Posts Yet</div>
                  </div>
                ) : (
                  <div className={`${styles.grid} ${styles.gridPosts}`}>
                    {posts.map((post) => (
                      <div key={post._id} className={styles.card} onClick={() => {
                        setIsSidebarOpen(true);
                        setTimeout(() => {
                          if (postRefs.current[post._id]) {
                            postRefs.current[post._id].scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}>
                        <div className={styles.cardImage}>
                          <img
                            src={post.imageUrl}
                            alt={post.caption || 'Post'}
                          />
                        </div>
                        <div className={styles.cardOverlay}>
                          <span>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isPostModalOpen && (
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={resetPostModal}
          >
            <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-labelledby="createPostTitle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 id="createPostTitle">Create New Post</h2>
                <button
                  className={styles.closeBtn}
                  onClick={handleCloseCreatePost}
                  aria-label="Close create post modal"
                >
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmitPost}>
                <div className={styles.formGroup}>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className={styles.imagePreview}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Caption</label>
                  <textarea
                    className={styles.formInput}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    maxLength="500"
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCloseCreatePost}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleDraftPost}
                  >
                    Draft
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={uploading}
                  >
                    {uploading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isSidebarOpen && (
          <>
            <div className={styles.sidebarOverlay} onClick={() => { setIsSidebarOpen(false); setActiveCommentPostId(null); }} />
            <div className={`${styles.sidebarContainer} ${activeCommentPostId ? styles.expanded : ''}`}>
              <div className={styles.sidebarMain}>
                <div className={styles.sidebarHeader}>
                  <h2>Posts</h2>
                  <button className={styles.closeBtn} onClick={() => { setIsSidebarOpen(false); setActiveCommentPostId(null); }}>
                    <FiX />
                  </button>
                </div>
                <div className={styles.sidebarContent}>
                  {posts.map((post) => (
                    <div key={post._id} className={styles.sidebarPost} ref={el => postRefs.current[post._id] = el}>
                      <div className={styles.sidebarPostHeader}>
                        <img src={post.author?.profilePicture || user?.profilePicture} alt="Avatar" className={styles.sidebarAvatar} />
                        <span className={styles.sidebarUsername}>{post.author?.username || user?.username}</span>
                      </div>
                      <img src={post.imageUrl} alt="Post" className={styles.sidebarPostImage} />
                      
                      <div className={styles.sidebarPostActions}>
                        <div className={styles.sidebarActionGroup}>
                          <button className={styles.sidebarActionBtn} onClick={() => handleLike(post._id)}>
                            <FiHeart fill={post.likes?.includes(user?._id) ? '#f56565' : 'transparent'} color={post.likes?.includes(user?._id) ? '#f56565' : 'currentColor'} />
                            {post.likes?.length || 0}
                          </button>
                          <button className={styles.sidebarActionBtn} onClick={() => setActiveCommentPostId(activeCommentPostId === post._id ? null : post._id)}>
                            <FiMessageSquare />
                            {post.comments?.length || 0}
                          </button>
                        </div>
                        <div className={styles.sidebarActionGroup}>
                          <button className={styles.sidebarActionBtn} onClick={() => { setEditingPostId(post._id); setEditPostCaption(post.caption || ''); }}>
                            Edit
                          </button>
                          <button className={styles.sidebarActionBtn} style={{color: 'var(--status-error)'}} onClick={() => handleDeleteUserPost(post._id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      {editingPostId === post._id ? (
                        <div className={styles.editPostForm}>
                          <textarea
                            className={styles.editCaptionInput}
                            value={editPostCaption}
                            onChange={e => setEditPostCaption(e.target.value)}
                          />
                          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <button className={styles.cancelBtn} onClick={() => setEditingPostId(null)}>Cancel</button>
                            <button className={styles.saveBtn} disabled={isSavingPost} onClick={() => handleEditPostSave(post._id)}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.sidebarPostCaption}>{post.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {activeCommentPostId && (
                <div className={styles.sidebarComments}>
                  <div className={styles.commentsHeader}>
                    <h2>Comments</h2>
                    <button className={styles.closeBtn} onClick={() => setActiveCommentPostId(null)}>
                      <FiX />
                    </button>
                  </div>
                  <div className={styles.commentsList}>
                    {posts.find(p => p._id === activeCommentPostId)?.comments?.map(comment => (
                      <div key={comment._id} className={styles.commentItem}>
                        <img src={comment.user?.profilePicture} alt="Avatar" className={styles.commentAvatar} />
                        <div className={styles.commentContent}>
                          <span className={styles.commentUsername}>{comment.user?.username}</span>
                          <p className={styles.commentText}>{comment.text}</p>
                        </div>
                        {(comment.user?._id === user?._id || user?._id) && (
                           <button className={styles.deleteCommentBtn} onClick={() => handleDeleteComment(activeCommentPostId, comment._id)}>
                             <FiTrash2 size={12} />
                           </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <form className={styles.commentInputArea} onSubmit={handleAddComment}>
                    <input 
                      type="text" 
                      className={styles.commentInput} 
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                    <button type="submit" className={styles.commentSubmitBtn} disabled={!commentText.trim()}>Post</button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}

        {isEditing && (
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={resetProfileEdit}
          >
            <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-labelledby="editProfileTitle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 id="editProfileTitle">Edit Profile</h2>
                <button
                  className={styles.closeBtn}
                  onClick={resetProfileEdit}
                  aria-label="Close edit profile modal"
                >
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleProfileSave}>
                {profileError && (
                  <div className={styles.errorText}>{profileError}</div>
                )}
                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/\s+/g, ''))
                    }
                    className={styles.formInput}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Race</label>
                  <input
                    list="raceOptions"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className={styles.formInput}
                  />
                  <datalist id="raceOptions">
                    <option value="Shinigami" />
                    <option value="Quincy" />
                    <option value="Hollow" />
                    <option value="Arrancar" />
                    <option value="Espada" />
                    <option value="Fullbringer" />
                    <option value="Visored" />
                    <option value="Human" />
                  </datalist>
                </div>
                <div className={styles.formGroup}>
                  <label>Bio</label>
                  <textarea
                    maxLength={300}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePicChange}
                  />
                  {profilePicPreview && (
                    <img
                      src={profilePicPreview}
                      alt="Preview"
                      className={styles.avatarPreview}
                    />
                  )}
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={resetProfileEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>

      {socialModal.isOpen && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => setSocialModal({ isOpen: false, type: 'followers' })}
        >
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="socialModalTitle"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="socialModalTitle">
                {socialModal.type === 'followers' ? 'Followers' : 'Following'}
              </h2>
              <button
                className={styles.closeBtn}
                onClick={() =>
                  setSocialModal({ isOpen: false, type: 'followers' })
                }
                aria-label="Close social modal"
              >
                <FiX />
              </button>
            </div>
            <div
              style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}
            >
              {socialModal.type === 'followers' ? (
                !user?.followers || user.followers.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    No followers.
                  </div>
                ) : (
                  user.followers.map((contact) => {
                    const isFollowedBack = user.following?.some(
                      (f) =>
                        (typeof f === 'string' ? f : f._id) === contact._id,
                    );
                    return (
                      <div
                        key={contact._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem',
                          borderBottom: '1px solid var(--border-light)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flex: 1,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSocialModal({
                              isOpen: false,
                              type: 'followers',
                            });
                            navigate(`/profile/${contact._id}`);
                          }}
                        >
                          <img
                            src={contact.profilePicture}
                            alt={contact.displayName}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              marginRight: '1rem',
                              objectFit: 'cover',
                            }}
                          />
                          <div
                            style={{ display: 'flex', flexDirection: 'column' }}
                          >
                            <span style={{ fontWeight: 'bold' }}>
                              {contact.displayName}
                            </span>
                            <span
                              style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                              }}
                            >
                              @{contact.username}
                            </span>
                          </div>
                        </div>
                        {!isFollowedBack ? (
                          <button
                            onClick={() => toggleFollow(contact._id)}
                            style={{
                              background: 'var(--primary-color, #3b82f6)',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              color: 'white',
                            }}
                            disabled={!!followLoading[contact._id]}
                          >
                            {followLoading[contact._id] ? '...' : 'Follow Back'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSocialModal({
                                isOpen: false,
                                type: 'followers',
                              });
                              navigate('/chat', {
                                state: { userId: contact._id },
                              });
                            }}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-light)',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Message
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              ) : !user?.following || user.following.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Not following anyone.
                </div>
              ) : (
                user.following.map((contact) => (
                  <div
                    key={contact._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid var(--border-light)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSocialModal({ isOpen: false, type: 'following' });
                        navigate(`/profile/${contact._id}`);
                      }}
                    >
                      <img
                        src={contact.profilePicture}
                        alt={contact.displayName}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          marginRight: '1rem',
                          objectFit: 'cover',
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {contact.displayName}
                        </span>
                        <span
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                          }}
                        >
                          @{contact.username}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSocialModal({ isOpen: false, type: 'following' });
                        navigate('/chat', {
                          state: { userId: contact._id },
                        });
                      }}
                      style={{
                        background: 'var(--primary-color, #3b82f6)',
                        border: 'none',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        color: 'white',
                        marginRight: '0.5rem',
                      }}
                    >
                      Message
                    </button>
                    <button
                      onClick={() => toggleFollow(contact._id)}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-light)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                      }}
                      disabled={!!followLoading[contact._id]}
                    >
                      {followLoading[contact._id] ? '...' : 'Unfollow'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* undo handled via global toast action; no local snackbar */}
    </>
  );
};

export default Profile;
