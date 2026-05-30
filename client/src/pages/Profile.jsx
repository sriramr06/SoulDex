import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/apiClient';
import { createPost } from '../api/social';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import {
  FiEdit2,
  FiSave,
  FiX,
  FiUploadCloud,
  FiTrash2,
  FiHeart,
  FiUser,
  FiPlus,
} from 'react-icons/fi';
import useAppRoutes from '../hooks/useAppRoutes';
import feedStyles from '../components/social/FeedTab.module.css';
import './Profile.module.css';
import ProfileEditForm from '../components/profile/ProfileEditForm';

const Profile = () => {
  const { user, updateProfileState } = useAuth();
  const { goToCharacterDetails } = useAppRoutes();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('favorites');
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Post Modal States
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const [myCreations, setMyCreations] = useState([]);
  const [creationsLoading, setCreationsLoading] = useState(false);

  // Fetch only this user's created characters
  const fetchMyCreations = async (email) => {
    if (!email) return;
    setCreationsLoading(true);
    try {
      const params = new URLSearchParams({ createdBy: email, limit: 100 });
      const response = await api.get(`/api/characters?${params}`);
      if (response.data.success) {
        setMyCreations(response.data.characters);
      }
    } catch (err) {
      console.error('Error fetching creations:', err);
    } finally {
      setCreationsLoading(false);
    }
  };

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
    setUsername(user?.username || '');
    setProfilePicPreview(null);
    setProfilePicFile(null);
    fetchMyCreations(user?.email);
  }, [user?.displayName, user?.bio, user?.username, user?.email]);

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileError('');

    const formData = new FormData();
    formData.append('displayName', displayName);
    formData.append('bio', bio);
    formData.append('username', username);
    if (profilePicFile) {
      formData.append('profilePicture', profilePicFile);
    }

    try {
      const response = await api.put(`/api/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateProfileState(response.data);
      setIsEditing(false);
      setProfilePicFile(null);
      setProfilePicPreview(null);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setProfileError(
        err.response?.data?.message || 'Failed to update profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const removeFavorite = async (charId) => {
    try {
      const response = await api.post(`/api/favorites/${charId}`);
      const updatedUser = { ...user, favorites: response.data.favorites };
      updateProfileState(updatedUser);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const deleteCharacter = async (charId) => {
    if (
      !window.confirm('Are you sure you want to delete this custom character?')
    )
      return;

    try {
      const response = await api.delete(`/api/characters/${charId}`);
      if (response.data.success) {
        setMyCreations((prev) => prev.filter((char) => char._id !== charId));
      }
    } catch (err) {
      console.error('Failed to delete character:', err);
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
      await createPost(formData);
      setIsPostModalOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setCaption('');
      alert('Post created successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to upload post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="shell-page">
      <Navbar />

      <main className="profile-grid-layout">
        {/* Left Side: Profile Card */}
        <div className="profile-card-left">
          <div className="profile-desc-box">
            <div style={{ display: 'flex', gap: '0.5rem', position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
              <button
                className={feedStyles.createPostBtn}
                style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setIsPostModalOpen(true)}
              >
                <FiPlus /> New Post
              </button>
              {!isEditing && (
                <button
                  className="card-action-btn"
                  style={{ position: 'relative', top: 0, right: 0 }}
                  onClick={() => {
                    setDisplayName(user?.displayName || '');
                    setBio(user?.bio || '');
                    setUsername(user?.username || '');
                    setIsEditing(true);
                  }}
                >
                  <FiEdit2 />
                </button>
              )}
            </div>

            {/* Profile Header (Avatar and details) */}
            <div className="profile-card-header">
              <div className="profile-avatar-box">
                <img
                  src={profilePicPreview || user?.profilePicture}
                  alt="Avatar"
                />
              </div>

              {!isEditing ? (
                <div>
                  <h2 className="profile-name">
                    {user?.displayName || 'Soul Society Shinigami'}
                  </h2>
                  <p className="profile-handle">
                    @{user?.username || 'shinigami'}
                  </p>
                  <p className="profile-email">{user?.email}</p>
                </div>
              ) : (
                <div className="profile-edit-form">
                  <label
                    htmlFor="avatar-upload"
                    className="file-upload-dragzone"
                  >
                    <FiUploadCloud className="file-upload-icon" />
                    <span>Upload avatar image</span>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePicChange}
                      className="hidden-input"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Bio info */}
            <div className="profile-bio">
              {!isEditing ? (
                <div>
                  <h4 className="profile-bio-title">Biography</h4>
                  <p className="profile-bio-text">
                    {user?.bio ||
                      'No spiritual records documented. Edit profile to write a biography.'}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleProfileSave}
                  className="profile-edit-form"
                >
                  {profileError && (
                    <div className="error-text">{profileError}</div>
                  )}
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="profile-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="profile-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bio (max 300 chars)</label>
                    <textarea
                      maxLength={300}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="profile-input"
                    />
                  </div>
                  <div className="profile-form-actions">
                    <button
                      type="submit"
                      className="auth-btn"
                      disabled={saving}
                    >
                      <FiSave /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="logout-btn"
                      onClick={() => {
                        setIsEditing(false);
                        setProfilePicFile(null);
                        setProfilePicPreview(null);
                      }}
                    >
                      <FiX /> Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Tabs Section */}
        <div className="profile-info-right">
          <div className="profile-tabs-wrapper">
            <button
              className={`profile-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              Favorited Spirits ({user?.favorites?.length || 0})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'creations' ? 'active' : ''}`}
              onClick={() => setActiveTab('creations')}
            >
              My Creations ({myCreations.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'favorites' ? (
              !user?.favorites || user.favorites.length === 0 ? (
                <div className="profile-tab-empty">
                  <FiHeart className="profile-tab-empty-icon" />
                  <p>You haven't favorited any characters yet.</p>
                </div>
              ) : (
                <div className="grid-3">
                  {(user?.favorites || []).map((char) => (
                    <div key={char._id} className="character-card">
                      <div className="card-overlay-actions">
                        <button
                          className="card-action-btn delete"
                          title="Unfavorite"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(char._id);
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                      <div
                        className="char-image-container tall"
                        onClick={() => goToCharacterDetails(char._id)}
                      >
                        <img src={char.img} alt={char.name} />
                        <span className="char-badge">{char.race}</span>
                      </div>
                      <div
                        className="char-details char-details-stack"
                        onClick={() => goToCharacterDetails(char._id)}
                      >
                        <h3 className="char-name">{char.name}</h3>
                        <span className="char-meta">
                          {char.rank || 'Officer'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : myCreations.length === 0 ? (
              creationsLoading ? (
                <div className="grid-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="character-card skeleton-card">
                      <div className="skeleton-img tall" />
                      <div className="char-details">
                        <div className="skeleton-line medium" />
                        <div className="skeleton-line short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="profile-tab-empty">
                  <FiUser className="profile-tab-empty-icon" />
                  <p>You haven't created any custom characters yet.</p>
                </div>
              )
            ) : (
              <div className="grid-3">
                {myCreations.map((char) => (
                  <div key={char._id} className="character-card">
                    <div className="card-overlay-actions">
                      <button
                        className="card-action-btn"
                        title="Edit Character"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/characters/${char._id}/edit`);
                        }}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="card-action-btn delete"
                        title="Delete Character"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCharacter(char._id);
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div
                      className="char-image-container tall"
                      onClick={() => goToCharacterDetails(char._id)}
                    >
                      <img src={char.img} alt={char.name} />
                      <span className="char-badge">{char.race}</span>
                    </div>
                    <div
                      className="char-details char-details-stack"
                      onClick={() => goToCharacterDetails(char._id)}
                    >
                      <h3 className="char-name">{char.name}</h3>
                      <span className="char-meta">
                        {char.rank || 'Officer'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {isPostModalOpen && (
        <div className={feedStyles.modalOverlay}>
          <div className={feedStyles.modalContent}>
            <div className={feedStyles.modalHeader}>
              <h2>Create New Post</h2>
              <button
                className={feedStyles.closeBtn}
                onClick={() => setIsPostModalOpen(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmitPost}>
              <div className={feedStyles.formGroup}>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className={feedStyles.imagePreview}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                />
              </div>

              <div className={feedStyles.formGroup}>
                <label>Caption</label>
                <textarea
                  className={feedStyles.formInput}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  maxLength="500"
                />
              </div>

              <div className={feedStyles.modalActions}>
                <button
                  type="button"
                  className={feedStyles.cancelBtn}
                  onClick={() => setIsPostModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={feedStyles.saveBtn}
                  disabled={uploading}
                >
                  {uploading ? 'Posting...' : 'Share Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
