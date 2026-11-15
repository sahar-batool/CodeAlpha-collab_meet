import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken, ApiError } from '../api/client';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, check whether a saved token is still valid.
  useEffect(() => {
    (async () => {
      if (!getToken()) return setLoading(false);
      try {
        const data = await api('/api/auth/me');
        setUser(data.user);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const authenticate = async (path, body) => {
    const data = await api(path, { method: 'POST', body });
    setToken(data.token);
    setUser(data.user);
  };

  const login = (email, password) => authenticate('/api/auth/login', { email, password });
  const register = (name, email, password) =>
    authenticate('/api/auth/register', { name, email, password });

  const logout = () => {
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);