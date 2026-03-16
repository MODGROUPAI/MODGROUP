'use client';
import { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser, type CurrentUser } from '@/lib/userStore';

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoaded(true);
  }, []);

  const login = (u: CurrentUser) => {
    setCurrentUser(u);
    setUser(u);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('pmo_current_user');
      localStorage.removeItem('pmo_current_member');
    } catch {}
  };

  return { user, loaded, login, logout };
}
