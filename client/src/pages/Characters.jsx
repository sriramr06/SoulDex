import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../api/auth';
import { fetchCharacters } from '../api/characters';
import Layout from '../components/layout/Layout';
import CharacterCard from '../components/CharacterCard';
import styles from './Characters.module.css';

const Characters = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('souldex_search') || '');
  const [raceFilter, setRaceFilter] = useState(() => sessionStorage.getItem('souldex_race') || 'All');

  useEffect(() => {
    sessionStorage.setItem('souldex_search', searchQuery);
    sessionStorage.setItem('souldex_race', raceFilter);
  }, [searchQuery, raceFilter]);

  const pageContentRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadCharacters = useCallback(
    async (pageNum, reset = false, search = '', race = 'All') => {
      if (!isMountedRef.current) return;

      try {
        if (pageNum === 1) {
          setLoading(true);
          setError(null);
        } else {
          setIsFetchingNext(true);
        }

        const data = await fetchCharacters({
          page: pageNum,
          limit: 12,
          search,
          filter: race,
        });

        if (!isMountedRef.current) return;

        const incomingChars = data?.characters || [];

        if (reset) {
          setCharacters(incomingChars);
        } else {
          setCharacters((prev) => {
            const safePrev = prev || [];
            const existingIds = new Set(safePrev.map((c) => c._id));
            const newChars = incomingChars.filter(
              (c) => !existingIds.has(c._id),
            );
            return [...safePrev, ...newChars];
          });
        }

        setHasMore(Boolean(data?.hasMore));
      } catch (err) {
        if (isMountedRef.current) {
          setError('Failed to load characters from the Archive.');
          console.error(err);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsFetchingNext(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setPage(1);
    setCharacters([]);
    setHasMore(true);
    setError(null);
    loadCharacters(1, true, searchQuery, raceFilter);
  }, [searchQuery, raceFilter, navigate, loadCharacters]);

  useEffect(() => {
    if (!loading && !isFetchingNext && hasMore && pageContentRef.current) {
      const el = pageContentRef.current;
      if (el.scrollHeight <= el.clientHeight) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadCharacters(nextPage, false, searchQuery, raceFilter);
      }
    }
  }, [
    page,
    loading,
    isFetchingNext,
    hasMore,
    loadCharacters,
    searchQuery,
    raceFilter,
  ]);

  const handleScroll = useCallback(
    (e) => {
      const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
      // Trigger load when the user is near the bottom of the scroll container.
      if (scrollTop + clientHeight >= scrollHeight - 250) {
        if (!isFetchingNext && !loading && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadCharacters(nextPage, false, searchQuery, raceFilter);
        }
      }
    },
    [
      page,
      isFetchingNext,
      loading,
      hasMore,
      loadCharacters,
      searchQuery,
      raceFilter,
    ],
  );

  const filters = [
    'All',
    'Shinigami',
    'Quincy',
    'Arrancar/Espada',
    'Fullbringer',
    'Visored',
    'Human',
  ];

  return (
    <Layout onScroll={handleScroll} pageRef={pageContentRef}>
      <div className={styles.pageContainer}>
        <div className={styles.headerRow}>
          <div className={styles.titleAndFilters}>
            <div className={styles.filterButtons}>
              {filters.map((f) => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${raceFilter === f ? styles.active : ''}`}
                  onClick={() => {
                    setRaceFilter(f);
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.searchWrapper}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search Archive..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className={styles.loading}>Scanning Spiritual Signatures...</div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && (
          <div className={styles.grid}>
            {(characters || []).map((char) =>
              char && char._id ? (
                <div
                  key={char._id}
                  onClick={() => navigate(`/characters/${char._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <CharacterCard character={char} />
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Characters;
