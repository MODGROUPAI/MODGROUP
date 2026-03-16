'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredRole, setStoredRole, DEFAULT_ROLE } from '@/lib/roles';
import type { UserRole } from '@/lib/roles';

export function useRole() {
  const [role, setRoleState] = useState<UserRole>(DEFAULT_ROLE);

  useEffect(() => {
    setRoleState(getStoredRole());
  }, []);

  const setRole = useCallback((r: UserRole) => {
    setStoredRole(r);
    setRoleState(r);
  }, []);

  return { role, setRole };
}
