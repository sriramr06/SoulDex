import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  getAuthToken,
  getRefreshToken,
  clearAuthToken,
  clearRefreshToken,
} from '../api/tokenStorage';
import { getUserProfile, logout as logoutApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const rawUser = localStorage.getItem('app_user');
      if (rawUser) {
        return JSON.parse(rawUser);
      }
    } catch (e) {
      console.debug('Failed to parse stored user', e);
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('app_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('app_user');
      }
    } catch (e) {
      console.debug('Failed to persist user state', e);
    }
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      const token = getAuthToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await getUserProfile();
        setUser(response.data);
      } catch (error) {
        clearAuthToken();
        clearRefreshToken();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateProfileState = useCallback((newState) => {
    setUser(newState);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // ignore logout failures, still clear local state
      }
    }
    clearAuthToken();
    clearRefreshToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, authLoading, updateProfileState, setUser, logout }),
    [user, authLoading, updateProfileState, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      authLoading: false,
      updateProfileState: () => {},
      setUser: () => {},
      logout: () => {},
    };
  }
  return context;
};

export default useAuth;
