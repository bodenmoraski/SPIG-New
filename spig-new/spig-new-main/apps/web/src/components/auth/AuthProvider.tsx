'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credential: string) => Promise<{ redirectTo: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get<{ valid: boolean; user: User }>('/auth/verify');
      if (response.valid) {
        setUser(response.user);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credential: string) => {
    const response = await api.post<{ user: User; redirectTo: string }>('/auth/google', {
      credential,
    });
    setUser(response.user);
    return { redirectTo: response.redirectTo };
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    setUser(null);
  };

  const refresh = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
