import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem('souldex_search') || '',
  );
  const [raceFilter, setRaceFilter] = useState(
    () => sessionStorage.getItem('souldex_race') || 'All',
  );

  useEffect(() => {
    sessionStorage.setItem('souldex_search', searchQuery);
    sessionStorage.setItem('souldex_race', raceFilter);
  }, [searchQuery, raceFilter]);

  const pageContentRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadCharacters = useCallback(
    async (
      pageNum,
      reset = false,
      search = '',
      race = 'All',
      sort = 'name',
    ) => {
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
          sort,
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
          setHasMore(false);
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

  // The effect triggers a fresh load when search/filter changes.
  useEffect(() => {
    setTimeout(() => {
      loadCharacters(1, true, searchQuery, raceFilter);
      setPage(1);
    }, 0);
  }, [searchQuery, raceFilter, loadCharacters]);

  useEffect(() => {
    if (
      !error &&
      !loading &&
      !isFetchingNext &&
      hasMore &&
      pageContentRef.current
    ) {
      const el = pageContentRef.current;
      if (el.scrollHeight <= el.clientHeight) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadCharacters(nextPage, false, searchQuery, raceFilter);
      }
    }
  }, [
    error,
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
          <div className={`${styles.titleAndFilters} ${styles.desktopOnly}`}>
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
          <div className={styles.searchAndCreate}>
            <div className={`${styles.mobileFilterDropdown} ${styles.mobileOnly}`}>
              <select 
                value={raceFilter} 
                onChange={(e) => setRaceFilter(e.target.value)}
                className={styles.filterSelect}
                aria-label="Filter by race"
              >
                {filters.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
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
              {searchQuery && (
                <button 
                  className={styles.clearSearchBtn} 
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button 
              className={styles.createBtn}
              onClick={() => navigate('/creations')}
            >
              + Create Character
            </button>
          </div>
        </div>

        {loading && (
          <div>
            <div className={styles.loading}>
              Scanning Spiritual Signatures...
            </div>
            <div className={styles.grid} aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && (
          <>
            <div className={styles.resultSummary}>
              <div>Showing {characters.length} matching characters</div>
            </div>
            {characters.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No characters found</h3>
                <p>
                  Try a different search or filter, or create a new character.
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {(characters || []).map((char) =>
                  char && char._id ? (
                    <div
                      key={char._id}
                      onClick={() => navigate(`/characters/${char._id}`)}
                      className={styles.cardWrapper}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(`/characters/${char._id}`);
                        }
                      }}
                    >
                      <CharacterCard character={char} />
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {hasMore && !loading && (
              <div className={styles.loadMoreWrap}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={() => {
                    if (!isFetchingNext) {
                      const next = page + 1;
                      setPage(next);
                      loadCharacters(next, false, searchQuery, raceFilter);
                    }
                  }}
                >
                  {isFetchingNext ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Characters;
