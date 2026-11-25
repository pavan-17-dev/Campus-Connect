import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.loadUser());

  const login = useCallback(async (credentials) => {
    const loggedIn = await authService.login(credentials);
    authService.saveUser(loggedIn);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback((values) => authService.register(values), []);

  const updateProfile = useCallback((changes) => {
    setUser((prev) => {
      const next = { ...prev, ...changes };
      authService.saveUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    authService.clearUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, register, logout, updateProfile }),
    [user, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
