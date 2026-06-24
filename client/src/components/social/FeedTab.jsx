import { useState, useEffect, useRef, useCallback } from 'react';
import { FiHeart, FiX, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import {
  getFeed,
  createPost,
  toggleLike,
  addComment,
  deleteComment,
  deletePost,
  searchUsers,
  followUser,
} from '../../api/social';
import { getUserProfile } from '../../api/auth';
import { useToast } from '../../hooks/useToast';
import styles from './FeedTab.module.css';

const FeedTab = ({ isModalOpen, setIsModalOpen, query }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  
  // Search State
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Comment Modal State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const postRefs = useRef({});
  const [commentText, setCommentText] = useState('');

  // Modal State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchUserAndFeed = async () => {
      setLoading(true);
      try {
        if (page === 1) {
          const userRes = await getUserProfile();
          setCurrentUserId(userRes.data._id);
          setCurrentUserFollowing(userRes.data.following || []);
        }

        const feedRes = await getFeed(page, 10);
        if (feedRes.data.length === 0) {
          setHasMore(false);
        } else {
          setPosts((prev) => {
            // Filter out duplicates just in case
            const newPosts = feedRes.data.filter(
              (p) => !prev.some((existing) => existing._id === p._id),
            );
            return [...prev, ...newPosts];
          });
        }
      } catch (error) {
        console.error('Failed to load feed', error);
        showToast('Unable to load feed. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndFeed();
  }, [page, showToast]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query && query.trim().length > 0) {
        setSearchLoading(true);
        try {
          const res = await searchUsers(query);
          setSearchResults(res.data);
        } catch (error) {
          console.error(error);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const observer = useRef();
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  const handleLike = async (postId) => {
    try {
      const res = await toggleLike(postId);
      const isLiked = res.data.likes.includes(currentUserId);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, likes: res.data.likes } : post,
        ),
      );
      if (isLiked) {
        showToast('Post liked!', 'success');
      }
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

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deletePost(postId);
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
      if (activeCommentPostId === postId) {
        setActiveCommentPostId(null);
      }

    } catch (err) {
      console.error('Delete post error', err);
      showToast('Failed to delete post.');
    }
  };

  const handleFollowToggle = async (userId) => {
    try {
      const res = await followUser(userId);
      const isNowFollowing = res.data.following.some(f => (typeof f === 'string' ? f : f._id) === userId);
      setCurrentUserFollowing(res.data.following);
      showToast(
        isNowFollowing ? 'User followed successfully.' : 'User unfollowed.',
        'success',
      );
    } catch (error) {
      console.error('Follow error', error);
      showToast('Error toggling follow.');
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetPostModal = () => {
    setIsModalOpen(false);
    setImageFile(null);
    setImagePreview(null);
    setCaption('');
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      showToast('Please select an image before posting.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);

    try {
      const res = await createPost(formData);
      // Prepend new post
      setPosts((prev) => [res.data, ...prev]);
      resetPostModal();
      showToast('Post created successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to upload post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading && page === 1) return <div>Loading feed...</div>;

  return (
    <div className={styles.container}>
      {query && query.trim().length > 0 ? (
        // Search Results View
        <div style={{ marginTop: '1rem' }}>
          {searchLoading && <div className={styles.loading}>Searching users...</div>}
          
          {!searchLoading && searchResults.length > 0 && (
            <div className={styles.resultsGrid}>
              {searchResults.map((user) => {
                const isFollowing = currentUserFollowing.some(f => (typeof f === 'string' ? f : f._id) === user._id);
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
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)',
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

          {!searchLoading && searchResults.length === 0 && (
            <div className={styles.loading}>No users found.</div>
          )}
        </div>
      ) : (
        // Posts Feed View
        <>
          <div className={styles.grid}>
            {posts.map((post, index) => {
              const isLastPost = posts.length === index + 1;
              return (
                <div
                  key={post._id}
                  className={styles.postItem}
                  ref={isLastPost ? lastPostElementRef : null}
                  onClick={() => {
                    setIsSidebarOpen(true);
                    setTimeout(() => {
                      if (postRefs.current[post._id]) {
                        postRefs.current[post._id].scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}
                >
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className={styles.postImage}
                  />

                  <div className={styles.postOverlay}>
                    <div className={styles.postStats}>
                      <div
                        className={styles.postStatItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(post._id);
                        }}
                        style={{
                          color: post.likes.includes(currentUserId)
                            ? '#f56565'
                            : 'white',
                        }}
                      >
                        <FiHeart
                          fill={
                            post.likes.includes(currentUserId)
                              ? '#f56565'
                              : 'transparent'
                          }
                        />
                        {post.likes.length}
                      </div>
                      <div className={styles.postStatItem}>
                        <FiMessageSquare />{' '}
                        {post.comments ? post.comments.length : 0}
                      </div>
                    </div>
                    <p className={styles.postCaption}>{post.caption}</p>
                  </div>

                  <div className={styles.postAuthor}>
                    <img
                      src={post.author?.profilePicture}
                      alt="Avatar"
                      className={styles.authorAvatar}
                    />
                    <span className={styles.authorName}>
                      {post.author?.username}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-secondary)',
              }}
            >
              Loading more posts...
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                marginTop: '3rem',
                color: 'var(--text-secondary)',
              }}
            >
              No posts in the feed yet. Be the first to post!
            </div>
          )}
        </>
      )}

      {/* Create Post Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Post</h2>
              <button className={styles.closeBtn} onClick={resetPostModal}>
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
                  onClick={resetPostModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={uploading}
                >
                  {uploading ? 'Posting...' : 'Share Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Comments Modal */}
      {isSidebarOpen && (
        <>
          <div className={styles.sidebarOverlay} onClick={() => { setIsSidebarOpen(false); setActiveCommentPostId(null); }} />
          <div className={`${styles.sidebarContainer} ${activeCommentPostId ? styles.expanded : ''}`}>
            <div className={styles.sidebarMain}>
              <div className={styles.sidebarHeader}>
                <h2>Feed</h2>
                <button className={styles.closeBtn} onClick={() => { setIsSidebarOpen(false); setActiveCommentPostId(null); }}>
                  <FiX />
                </button>
              </div>
              <div className={styles.sidebarContent}>
                {posts.map((post) => (
                  <div key={post._id} className={styles.sidebarPost} ref={el => postRefs.current[post._id] = el}>
                    <div className={styles.sidebarPostHeader}>
                      <img src={post.author?.profilePicture} alt="Avatar" className={styles.sidebarAvatar} />
                      <span className={styles.sidebarUsername}>{post.author?.username}</span>
                    </div>
                    <img src={post.imageUrl} alt="Post" className={styles.sidebarPostImage} />
                    
                    <div className={styles.sidebarPostActions}>
                      <div className={styles.sidebarActionGroup}>
                        <button className={styles.sidebarActionBtn} onClick={() => handleLike(post._id)}>
                          <FiHeart fill={post.likes?.includes(currentUserId) ? '#f56565' : 'transparent'} color={post.likes?.includes(currentUserId) ? '#f56565' : 'currentColor'} />
                          {post.likes?.length || 0}
                        </button>
                        <button className={styles.sidebarActionBtn} onClick={() => setActiveCommentPostId(activeCommentPostId === post._id ? null : post._id)}>
                          <FiMessageSquare />
                          {post.comments?.length || 0}
                        </button>
                      </div>
                      <div className={styles.sidebarActionGroup}>
                        {post.author?._id === currentUserId && (
                          <button className={styles.sidebarActionBtn} style={{color: 'var(--status-error)'}} onClick={() => handleDeletePost(post._id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={styles.sidebarPostCaption}>{post.caption}</p>
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
                  {posts.find(p => p._id === activeCommentPostId)?.comments?.map(comment => {
                    const canDelete = comment.user?._id === currentUserId || posts.find(p => p._id === activeCommentPostId)?.author?._id === currentUserId;
                    return (
                    <div key={comment._id} className={styles.commentItem}>
                      <img src={comment.user?.profilePicture} alt="Avatar" className={styles.commentAvatar} />
                      <div className={styles.commentContent}>
                        <span className={styles.commentUsername}>{comment.user?.username}</span>
                        <p className={styles.commentText}>{comment.text}</p>
                      </div>
                      {canDelete && (
                         <button className={styles.deleteCommentBtn} onClick={() => handleDeleteComment(activeCommentPostId, comment._id)}>
                           <FiTrash2 size={12} />
                         </button>
                      )}
                    </div>
                  )})}
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
    </div>
  );
};

export default FeedTab;
