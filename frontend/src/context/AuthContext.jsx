import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.loadUser());

  const clearSession = useCallback(() => {
    authService.clearUser();
    setUser(null);
  }, []);

  // Refresh the cached profile from the API on start-up, and log out if the
  // session expired (the axios interceptor fires `cc:session-expired`).
  useEffect(() => {
    if (user) {
      authService
        .fetchProfile()
        .then((fresh) => {
          if (fresh) {
            authService.saveUser(fresh);
            setUser(fresh);
          }
        })
        .catch(() => {});
    }
    window.addEventListener('cc:session-expired', clearSession);
    return () => window.removeEventListener('cc:session-expired', clearSession);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (credentials) => {
    const loggedIn = await authService.login(credentials);
    authService.saveUser(loggedIn);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback((values) => authService.register(values), []);

  const updateProfile = useCallback(async (changes) => {
    const saved = await authService.updateProfile(changes);
    setUser((prev) => {
      const next = { ...prev, ...saved };
      authService.saveUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, register, logout, updateProfile }),
    [user, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
