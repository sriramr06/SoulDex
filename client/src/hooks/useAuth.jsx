import { useState, useEffect } from 'react';

// Minimal useAuth hook to provide `user` and `updateProfileState`.
// Persists to localStorage so other components can share a simple state.
export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('app_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem('app_user', JSON.stringify(user));
      else localStorage.removeItem('app_user');
    } catch (e) {
      // ignore
    }
  }, [user]);

  const updateProfileState = (newState) => {
    setUser(newState);
  };

  return { user, updateProfileState };
}

export default useAuth;
