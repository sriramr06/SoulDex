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
  FiTrash2,
} from 'react-icons/fi';
import useAppRoutes from '../hooks/useAppRoutes';
import Navbar from '../components/Navbar';
import CreateOCModal from '../components/character-wizard/CreateOCModal';
import { useAuth } from '../hooks/useAuth';
import './CharacterDetails.css';

const CharacterDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goToCharacters } = useAppRoutes();
  const { user, updateProfileState } = useAuth();

  const [character, setCharacter] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);

  const userId = user?._id;
  const userEmail = user?.email;
  const { socket } = useSocket() || {};

  // Fetch character details
  useEffect(() => {
    let mounted = true;
    const fetchChar = async () => {
      try {
        const res = await api.get(`/api/characters/${id}`);
        if (mounted) {
          setCharacter(res.data.character);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err.response?.data?.message || 'Failed to load spirit profile',
          );
          setLoading(false);
        }
      }
    };
    fetchChar();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Real-time updates listener
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleCharUpdated = (updatedData) => {
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
    };

    const handleCharDeleted = (deletedData) => {
      if (deletedData.characterId === id) {
        alert('This spirit profile has been removed from the registry.');
        goToCharacters();
      }
    };

    socket.on('characterUpdated', handleCharUpdated);
    socket.on('characterDeleted', handleCharDeleted);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('characterUpdated', handleCharUpdated);
        socket.off('characterDeleted', handleCharDeleted);
      }
    };
  }, [socket, id, goToCharacters]);

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
    setError('');

    if (!newComment.trim()) {
      setError('Comment message cannot be empty.');
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
      setError('Server error. Failed to add comment.');
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

  const getNormalizedPowers = (char) => {
    if (!char) return null;
    
    let sp = char.spiritualPower ? { ...char.spiritualPower } : {};
    
    if (typeof char.spiritualPower === 'string') {
      return char.spiritualPower;
    }

    if (char.zanpakuto) {
      sp.zanpakutoName = sp.zanpakutoName || char.zanpakuto.name;
      sp.releaseCommand = sp.releaseCommand || char.zanpakuto.releaseCommand;
      
      const shikaiRaw = char.zanpakuto.shikai;
      if (shikaiRaw && shikaiRaw.length > 0) sp.shikai = sp.shikai || (Array.isArray(shikaiRaw) ? shikaiRaw.join('\\n') : shikaiRaw);
      
      const bankaiRaw = char.zanpakuto.bankai;
      if (bankaiRaw && bankaiRaw.length > 0) sp.bankai = sp.bankai || (Array.isArray(bankaiRaw) ? bankaiRaw.join('\\n') : bankaiRaw);
    }
    
    if (char.resurrection) {
      sp.resurreccionName = sp.resurreccionName || char.resurrection.name;
      sp.releaseCommand = sp.releaseCommand || char.resurrection.releaseCommand;
      sp.segundaEtapa = sp.segundaEtapa || char.resurrection.segundaEtapa;
    }

    if (char.spirit_weapon) sp.spiritWeapon = sp.spiritWeapon || char.spirit_weapon;
    if (char.vollstandig) sp.vollstandig = sp.vollstandig || char.vollstandig;
    if (char.ability) sp.abilityDetail = sp.abilityDetail || char.ability;

    return sp;
  };

  const hasSpecialAbilities = (char) => {
    const sp = getNormalizedPowers(char);
    if (!sp) return false;
    if (typeof sp === 'string' && sp.trim() !== '') return true;
    if (typeof sp === 'object') {
      return Object.entries(sp).some(
        ([key, val]) => key !== 'powerType' && val && String(val).trim() !== '' && (!Array.isArray(val) || val.length > 0),
      );
    }
    return false;
  };

  const renderZanpakuto = (char) => {
    const sp = getNormalizedPowers(char);
    if (!sp) return null;
    if (typeof sp === 'string') return <div className="desc-text">{sp}</div>;

    if (typeof sp === 'object') {
      const lowerRace = char?.race?.toLowerCase() || '';

      const renderField = (label, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        
        let displayVal = value;
        if (Array.isArray(value)) {
          displayVal = value.join(', ');
        } else if (typeof value === 'string' && value.includes('\\n')) {
          displayVal = value.split('\\n').map((line, i) => <div key={i}>{line}</div>);
        }

        return (
          <div className="kv-row" key={label}>
            <span className="kv-label">{label}</span>
            <span className="kv-value">{displayVal}</span>
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
            {renderField('Hollow Mask', sp.hollowMask)}
            {renderField('Abilities', sp.abilityDetail)}
          </>
        );
      }
      if (lowerRace === 'quincy') {
        return (
          <>
            {renderField('Spirit Weapon', sp.spiritWeapon)}
            {renderField('Schrift', sp.schrift)}
            {renderField('Vollständig', sp.vollstandig)}
            {renderField('Abilities', sp.abilityDetail)}
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
            {renderField('Abilities', sp.abilityDetail)}
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
            {renderField('Abilities', sp.abilityDetail)}
          </>
        );
      }

      const filtered = Object.entries(sp).filter(
        ([k, v]) => k !== 'powerType' && v && String(v).trim() !== '',
      );
      if (filtered.length === 0) return null;
      
      const formatKey = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      return <>{filtered.map(([key, val]) => renderField(formatKey(key), val))}</>;
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

  const isLiked = character.likes?.some(id => String(id) === String(userId));
  const isFavorited = user?.favorites?.some((fav) =>
    typeof fav === 'string' ? fav === character._id : fav._id === character._id,
  );
  const isOwner = character.createdBy === userEmail || user?.role === 'admin';

  return (
    <div>
      <Navbar />
      <div className="details-page-wrapper">
        <div className="top-actions-bar">
          <div>
            <button className="action-btn" onClick={goToCharacters}>
              <FiArrowLeft /> Archives
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className={`action-btn`}
              onClick={() => setShowCommentsDrawer(true)}
            >
              <FiMessageSquare /> {character.comments?.length || 0}
            </button>
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
                <button className="action-btn" onClick={() => setShowEditModal(true)}>
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
              {character.romajiName &&
                character.romajiName.toLowerCase() !==
                  character.name.toLowerCase() && (
                  <p className="subtitle">{character.romajiName}</p>
                )}
              {character.englishName &&
                character.englishName.toLowerCase() !==
                  character.name.toLowerCase() && (
                  <p className="subtitle">{character.englishName}</p>
                )}
              {character.japaneseName &&
                character.japaneseName !== character.name && (
                  <p className="japanese-name">{character.japaneseName}</p>
                )}

              <div className="badge-row">
                <span className="premium-badge">
                  {character.race || 'Unknown'}
                </span>
                {character.organization?.group && (
                  <span className="premium-badge">
                    {character.organization.group}
                  </span>
                )}
              </div>
            </div>

            <div className="glass-panel meta-panel">
              <div className="panel-header">Affiliations</div>
              {renderAffiliations(character.affiliation) !== 'None' &&
                renderAffiliations(character.affiliation) !==
                  character.organization?.group && (
                  <div className="kv-row">
                    <span className="kv-label">Affiliation</span>
                    <span className="kv-value">
                      {renderAffiliations(character.affiliation)}
                    </span>
                  </div>
                )}
              {character.organization?.group && (
                <div className="kv-row">
                  <span className="kv-label">Organization</span>
                  <span className="kv-value">
                    {character.organization.group}
                  </span>
                </div>
              )}
              {character.race === 'Human' ? (
                <div className="kv-row">
                  <span className="kv-label">Occupation</span>
                  <span className="kv-value">
                    {character.occupation || 'None'}
                  </span>
                </div>
              ) : (
                <div className="kv-row">
                  <span className="kv-label">Rank</span>
                  <span className="kv-value">
                    {character.organization?.division
                      ? `${character.organization.division} — ${character.organization?.rank || ''}`
                      : character.organization?.rank || 'None'}
                  </span>
                </div>
              )}
            </div>

            <div className="glass-panel desc-panel">
              <div className="panel-header">Biography</div>
              <div className="desc-text">
                {character.description ||
                  'No biography files retrieved from the Soul Society archives.'}
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
                  <span className="stat-val">
                    {character.gender || 'Unknown'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Age</span>
                  <span className="stat-val">{character.age || 'Unknown'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Height</span>
                  <span className="stat-val">
                    {character.height || 'Unknown'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Weight</span>
                  <span className="stat-val">
                    {character.weight || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {hasSpecialAbilities(character) && (
              <div className="glass-panel powers-panel">
                <div className="panel-header">
                  {getAbilitySectionTitle(character.race)}
                </div>
                {renderZanpakuto(character)}
              </div>
            )}


          </section>
        </main>
      </div>

      {showEditModal && (
        <CreateOCModal 
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            // Quick way to reload the updated data without hard page reload
            api.get(`/api/characters/${id}`).then(res => {
              if (res.data.success) setCharacter(res.data.character);
            });
          }}
          existingCharacter={character}
        />
      )}

      {/* Comments Right Drawer */}
      <div 
        className={`comments-drawer-overlay ${showCommentsDrawer ? 'open' : ''}`} 
        onClick={() => setShowCommentsDrawer(false)}
      />
      <div className={`comments-drawer ${showCommentsDrawer ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>Transmissions ({character.comments?.length || 0})</h3>
          <button className="close-drawer-btn" onClick={() => setShowCommentsDrawer(false)}>✕</button>
        </div>
        <div className="drawer-body">
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
        </div>
        <div className="drawer-footer">
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
      </div>
    </div>
  );
};

export default CharacterDetails;
