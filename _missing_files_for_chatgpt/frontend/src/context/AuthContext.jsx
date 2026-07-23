import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token');
  });

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const refreshMe = async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) return;

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setToken(savedToken);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, refreshMe, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
