import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/apiClient';
import { useSocket } from '../context/SocketContext';
import {
  FiHeart,
  FiMessageSquare,
  FiSend,
  FiStar,
  FiArrowLeft,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi';
import useAppRoutes from '../hooks/useAppRoutes';
import { useAuth } from '../hooks/useAuth';
import './CharacterDetails.css';

const CharacterDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goToCharacters } = useAppRoutes();
  const { user, updateProfileState } = useAuth();

  const [character, setCharacter] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = user?._id;
  const userEmail = user?.email;
  const socket = useSocket();

  // Fetch character details
  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/characters/${id}`);
        if (response.data.success) {
          setCharacter(response.data.character);
        } else {
          setError(response.data.message || 'Character not found.');
        }
      } catch (err) {
        console.error('Error fetching character details:', err);
        setError('Character profile could not be loaded or was not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [id]);

  // Real-time socket updates for this character
  useEffect(() => {
    if (!socket) return;

    socket.on('characterUpdated', (updatedData) => {
      if (updatedData.characterId === id) {
        setCharacter((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            likes: updatedData.likes,
            comments: updatedData.comments,
          };
        });
      }
    });

    socket.on('characterDeleted', (deletedData) => {
      if (deletedData.characterId === id) {
        alert('This spirit profile has been removed from the registry.');
        goToCharacters();
      }
    });

    return () => {
      socket.off('characterUpdated');
      socket.off('characterDeleted');
    };
  }, [id, goToCharacters, socket]);

  const handleLike = async () => {
    if (!userId || !character) return;

    try {
      const response = await api.post(`/api/characters/${character._id}/like`);
      if (response.data.success) {
        setCharacter((prev) => ({
          ...prev,
          likes: response.data.likes,
        }));
      }
    } catch (err) {
      console.error('Failed to like character', err);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!character) return;
    try {
      const response = await api.post(`/api/favorites/${character._id}`);
      if (response.data.favorites) {
        updateProfileState({ ...user, favorites: response.data.favorites });
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError('');

    if (!newComment.trim()) {
      setCommentError('Comment message cannot be empty.');
      return;
    }

    try {
      const response = await api.post(`/api/characters/${id}/comment`, {
        text: newComment,
      });

      if (response.data.success) {
        setCharacter((prev) => ({
          ...prev,
          comments: response.data.comments,
        }));
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to add comment', err);
      setCommentError('Server error. Failed to add comment.');
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this spirit profile from the archives?',
      )
    )
      return;

    try {
      const response = await api.delete(`/api/characters/${character._id}`);
      if (response.data.success) {
        goToCharacters();
      }
    } catch (err) {
      console.error('Failed to delete character:', err);
    }
  };

  // Helper functions to parse mixed database types and custom abilities
  const getAbilitySectionTitle = (race) => {
    const lowerRace = race?.toLowerCase();
    if (lowerRace === 'shinigami') return 'Zanpakutō';
    if (lowerRace === 'quincy') return 'Quincy Powers';
    if (
      lowerRace === 'arrancar' ||
      lowerRace === 'espada' ||
      lowerRace === 'hollow'
    )
      return 'Resurrección';
    if (lowerRace === 'fullbringer') return 'Fullbring';
    if (lowerRace === 'visored') return 'Visored Powers';
    return 'Spiritual Powers';
  };

  const hasSpecialAbilities = (sp) => {
    if (!sp) return false;
    if (typeof sp === 'string' && sp.trim() !== '') return true;
    if (typeof sp === 'object') {
      return Object.entries(sp).some(
        ([key, val]) => key !== 'powerType' && val && String(val).trim() !== '',
      );
    }
    return false;
  };

  const renderZanpakuto = (sp) => {
    if (!sp) return null;
    if (typeof sp === 'string') return <div className="desc-text">{sp}</div>;

    if (typeof sp === 'object') {
      const lowerRace = character?.race?.toLowerCase();

      const renderField = (label, value) => {
        if (!value) return null;
        return (
          <div className="kv-row" key={label}>
            <span className="kv-label">{label}</span>
            <span className="kv-value">{value}</span>
          </div>
        );
      };

      if (lowerRace === 'shinigami' || lowerRace === 'hybrid') {
        return (
          <>
            {renderField('Name', sp.zanpakutoName)}
            {renderField('Release Command', sp.releaseCommand)}
            {renderField('Shikai Form', sp.shikai)}
            {renderField('Bankai Form', sp.bankai)}
          </>
        );
      }
      if (lowerRace === 'quincy') {
        return (
          <>
            {renderField('Spirit Weapon', sp.spiritWeapon)}
            {renderField('Schrift', sp.schrift)}
            {renderField('Vollständig', sp.vollstandig)}
          </>
        );
      }
      if (
        lowerRace === 'arrancar' ||
        lowerRace === 'espada' ||
        lowerRace === 'hollow'
      ) {
        return (
          <>
            {renderField('Resurrección', sp.resurreccionName)}
            {renderField('Release Command', sp.releaseCommand)}
            {renderField('Segunda Etapa', sp.segundaEtapa)}
            {renderField('Aspect of Death', sp.aspectOfDeath)}
          </>
        );
      }
      if (lowerRace === 'fullbringer') {
        return (
          <>
            {renderField('Fullbring Name', sp.fullbringName)}
            {renderField('Focus Object', sp.focusObject)}
            {renderField('Ability', sp.abilityDetail)}
          </>
        );
      }
      if (lowerRace === 'visored') {
        return (
          <>
            {renderField('Zanpakutō', sp.zanpakutoName)}
            {renderField('Release Command', sp.releaseCommand)}
            {renderField('Shikai', sp.shikai)}
            {renderField('Bankai', sp.bankai)}
            {renderField('Hollow Mask', sp.hollowMask)}
          </>
        );
      }
      
      // Fallback
      const filtered = Object.entries(sp).filter(
        ([k, v]) => k !== 'powerType' && v && String(v).trim() !== '',
      );
      if (filtered.length === 0) return null;
      return (
        <>
          {filtered.map(([key, val]) => renderField(key, val))}
        </>
      );
    }
    return null;
  };

  const renderAffiliations = (aff) => {
    if (!aff) return 'None';
    if (Array.isArray(aff)) return aff.join(', ');
    if (typeof aff === 'string') return aff;
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="shell-page shell-loading">
        <div className="spinner"></div>
        <p className="loading-text">Accessing Soul Archives...</p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="shell-page">
        <Navbar />
        <div className="error-banner error-banner-centered">
          <h2>ERROR</h2>
          <p>{error || 'Character not found.'}</p>
        </div>
      </div>
    );
  }

  const isLiked = character.likes?.includes(userId);
  const isFavorited = user?.favorites?.some((fav) =>
    typeof fav === 'string' ? fav === character._id : fav._id === character._id,
  );
  const isOwner = character.createdBy === userEmail || user?.role === 'admin';

  return (
    <div className="details-page-wrapper">
      <div className="details-bg-glow"></div>

      <div className="top-actions-bar">
        <div>
          <button className="action-btn" onClick={goToCharacters}>
            <FiArrowLeft /> Archives
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className={`action-btn ${isLiked ? 'active-like' : ''}`} 
            onClick={handleLike}
          >
            <FiHeart /> {character.likes?.length || 0}
          </button>
          <button 
            className={`action-btn ${isFavorited ? 'active-fav' : ''}`} 
            onClick={handleFavoriteToggle}
          >
            <FiStar />
          </button>
          {isOwner && (
            <>
              <button className="action-btn" onClick={() => navigate(`/characters/${character._id}/edit`)}>
                <FiEdit2 /> Edit
              </button>
              <button className="action-btn danger" onClick={handleDelete}>
                <FiTrash2 /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <main className="details-main-layout">
        
        {/* LEFT COLUMN */}
        <section className="side-col left-col">
          <div className="glass-panel identity-panel">
            <div className="panel-header">Identity</div>
            <h1>{character.name}</h1>
            {character.romajiName && character.romajiName.toLowerCase() !== character.name.toLowerCase() && (
              <p className="subtitle">{character.romajiName}</p>
            )}
            {character.englishName && character.englishName.toLowerCase() !== character.name.toLowerCase() && (
              <p className="subtitle">{character.englishName}</p>
            )}
            {character.japaneseName && character.japaneseName !== character.name && (
              <p className="japanese-name">{character.japaneseName}</p>
            )}
            
            <div className="badge-row">
              <span className="premium-badge">{character.race || 'Unknown'}</span>
              {character.organization?.group && (
                <span className="premium-badge">{character.organization.group}</span>
              )}
            </div>
          </div>

          <div className="glass-panel meta-panel">
            <div className="panel-header">Affiliations</div>
            {renderAffiliations(character.affiliation) !== 'None' && 
             renderAffiliations(character.affiliation) !== character.organization?.group && (
              <div className="kv-row">
                <span className="kv-label">Affiliation</span>
                <span className="kv-value">{renderAffiliations(character.affiliation)}</span>
              </div>
            )}
            {character.organization?.group && (
              <div className="kv-row">
                <span className="kv-label">Organization</span>
                <span className="kv-value">{character.organization.group}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="kv-label">Rank</span>
              <span className="kv-value">
                {character.organization?.division
                  ? `${character.organization.division} — ${character.organization?.rank || ''}`
                  : character.organization?.rank || 'None'}
              </span>
            </div>
          </div>

          <div className="glass-panel desc-panel">
            <div className="panel-header">Biography</div>
            <div className="desc-text">
              {character.description || 'No biography files retrieved from the Soul Society archives.'}
            </div>
          </div>
        </section>

        {/* CENTER HERO */}
        <section className="character-hero-col">
          <img
            src={character.detailsImage || character.img}
            alt={character.name}
            className="character-hero-image"
          />
        </section>

        {/* RIGHT COLUMN */}
        <section className="side-col right-col">
          <div className="glass-panel stats-panel">
            <div className="panel-header">Physical Stats</div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Gender</span>
                <span className="stat-val">{character.gender || 'Unknown'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Age</span>
                <span className="stat-val">{character.age || 'Unknown'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Height</span>
                <span className="stat-val">{character.height || 'Unknown'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Weight</span>
                <span className="stat-val">{character.weight || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {hasSpecialAbilities(character.spiritualPower) && (
            <div className="glass-panel powers-panel">
              <div className="panel-header">{getAbilitySectionTitle(character.race)}</div>
              {renderZanpakuto(character.spiritualPower)}
            </div>
          )}

          <div className="glass-panel comments-panel">
            <div className="panel-header">Transmissions</div>
            <div className="comments-container">
              {character.comments?.length === 0 ? (
                <div className="empty-state">
                  <FiMessageSquare size={24} style={{ marginBottom: '8px' }} />
                  <div>No transmissions yet.</div>
                </div>
              ) : (
                [...character.comments].reverse().map((c, i) => (
                  <div key={i} className="comment-bubble">
                    <div className="comment-meta">
                      <strong>{c.userEmail.split('@')[0]}</strong>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="comment-text">{c.text}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleCommentSubmit} className="comment-input-row">
              <input
                type="text"
                placeholder="Send a message..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit">
                <FiSend />
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>
  );
};

export default CharacterDetails;
