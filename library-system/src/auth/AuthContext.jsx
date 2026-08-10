import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth as authApi, token } from '../lib/api';

const AuthContext = createContext(null);

const USER_KEY = 'library.user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'); } catch { return null; }
  });
  const [ready, setReady] = useState(true);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    token.set(result.token);
    setUser(result.user);
    try { localStorage.setItem(USER_KEY, JSON.stringify(result.user)); } catch { /* ignore */ }
    return result.user;
  }, []);

  const logout = useCallback(() => {
    token.clear();
    try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    isAdmin: user?.role === 'admin',
    login,
    logout,
  }), [user, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
