import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiHeart, FiX, FiMessageSquare } from 'react-icons/fi';
import { getFeed, createPost, toggleLike, addComment } from '../../api/social';
import { getUserProfile, getAuthToken } from '../../api/auth';
import styles from './FeedTab.module.css';

const FeedTab = ({ isModalOpen, setIsModalOpen }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Comment Modal State
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Modal State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUserAndFeed = async () => {
      setLoading(true);
      try {
        if (page === 1) {
          const userRes = await getUserProfile();
          setCurrentUserId(userRes.data._id);
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
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndFeed();
  }, [page]);

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
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, likes: res.data.likes } : post,
        ),
      );
      if (activePostForComments && activePostForComments._id === postId) {
        setActivePostForComments((prev) => ({
          ...prev,
          likes: res.data.likes,
        }));
      }
    } catch (error) {
      console.error('Like error', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activePostForComments) return;
    try {
      const res = await addComment(activePostForComments._id, commentText);
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p._id === res.data._id ? res.data : p)),
      );
      setActivePostForComments(res.data);
      setCommentText('');
    } catch (err) {
      console.error('Comment error', err);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert('Please select an image');

    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);

    try {
      const res = await createPost(formData);
      // Prepend new post
      setPosts([res.data, ...posts]);
      setIsModalOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setCaption('');
    } catch (error) {
      console.error(error);
      alert('Failed to upload post');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div>Loading feed...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {posts.map((post, index) => {
          const isLastPost = posts.length === index + 1;
          return (
            <div
              key={post._id}
              className={styles.postItem}
              ref={isLastPost ? lastPostElementRef : null}
              onClick={() => setActivePostForComments(post)}
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
                  src={post.author.profilePicture}
                  alt="Avatar"
                  className={styles.authorAvatar}
                />
                <span className={styles.authorName}>
                  {post.author.username}
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

      {/* Create Post Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Post</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
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
                  onClick={() => setIsModalOpen(false)}
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
      {activePostForComments && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActivePostForComments(null)}
        >
          <div
            className={styles.commentsModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.commentsImageSection}>
              <img
                src={activePostForComments.imageUrl}
                alt="Post"
                className={styles.commentsMainImage}
              />
            </div>

            <div className={styles.commentsSideSection}>
              <div className={styles.commentsHeader}>
                <div
                  className={styles.postAuthor}
                  style={{
                    position: 'relative',
                    bottom: 0,
                    left: 0,
                    color: 'var(--text-primary)',
                  }}
                >
                  <img
                    src={activePostForComments.author.profilePicture}
                    alt="Avatar"
                    className={styles.authorAvatar}
                    style={{ border: 'none' }}
                  />
                  <span
                    className={styles.authorName}
                    style={{ textShadow: 'none' }}
                  >
                    {activePostForComments.author.username}
                  </span>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => setActivePostForComments(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className={styles.commentsList}>
                {activePostForComments.caption && (
                  <div className={styles.commentItem}>
                    <img
                      src={activePostForComments.author.profilePicture}
                      alt="Avatar"
                      className={styles.commentAvatar}
                    />
                    <div className={styles.commentTextContent}>
                      <strong>{activePostForComments.author.username}</strong>{' '}
                      {activePostForComments.caption}
                    </div>
                  </div>
                )}

                {activePostForComments.comments &&
                  activePostForComments.comments.map((comment, i) => (
                    <div key={i} className={styles.commentItem}>
                      <img
                        src={comment.user?.profilePicture}
                        alt="Avatar"
                        className={styles.commentAvatar}
                      />
                      <div className={styles.commentTextContent}>
                        <strong>{comment.user?.username}</strong> {comment.text}
                      </div>
                    </div>
                  ))}
              </div>

              <div className={styles.commentsActionsRow}>
                <div
                  className={styles.postStatItem}
                  onClick={() => handleLike(activePostForComments._id)}
                  style={{
                    cursor: 'pointer',
                    color: activePostForComments.likes.includes(currentUserId)
                      ? '#f56565'
                      : 'var(--text-primary)',
                  }}
                >
                  <FiHeart
                    fill={
                      activePostForComments.likes.includes(currentUserId)
                        ? '#f56565'
                        : 'transparent'
                    }
                    size={24}
                  />
                  <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>
                    {activePostForComments.likes.length} likes
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleAddComment}
                className={styles.commentInputForm}
              >
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={styles.commentInput}
                />
                <button
                  type="submit"
                  className={styles.commentPostBtn}
                  disabled={!commentText.trim()}
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedTab;
