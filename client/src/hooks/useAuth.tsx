import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/studies';
import type { Researcher } from '../types';

interface AuthContextValue {
  researcher: Researcher | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setResearcher)
      .catch(() => setResearcher(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    setResearcher(data);
  };

  const logout = async () => {
    await apiLogout();
    setResearcher(null);
  };

  return (
    <AuthContext.Provider value={{ researcher, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
