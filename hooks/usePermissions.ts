'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  loadPermissions, savePermissions, getMemberPermissions,
  getCurrentMemberId, setCurrentMemberId, ALL_ENABLED,
  type MemberPermissions,
} from '@/lib/permissions';

export function usePermissions() {
  const [currentMemberId, setCurrentMemberIdState] = useState<string>('');
  const [permissions, setPermissionsState] = useState<Record<string, MemberPermissions>>({});

  useEffect(() => {
    setCurrentMemberIdState(getCurrentMemberId());
    setPermissionsState(loadPermissions());
  }, []);

  const switchMember = useCallback((id: string) => {
    setCurrentMemberId(id);
    setCurrentMemberIdState(id);
  }, []);

  const updateMemberPermissions = useCallback((memberId: string, memberName: string, sections: Record<string, boolean>) => {
    const updated = { ...permissions, [memberId]: { memberId, memberName, sections } };
    savePermissions(updated);
    setPermissionsState(updated);
  }, [permissions]);

  const canAccess = useCallback((sectionKey: string): boolean => {
    if (!currentMemberId) return true; // nessun membro selezionato = accesso completo
    const memberPerms = permissions[currentMemberId]?.sections;
    if (!memberPerms) return true; // nessun profilo configurato = accesso completo
    return memberPerms[sectionKey] !== false;
  }, [currentMemberId, permissions]);

  const currentMemberSections = currentMemberId
    ? (permissions[currentMemberId]?.sections ?? ALL_ENABLED)
    : ALL_ENABLED;

  return {
    currentMemberId,
    switchMember,
    permissions,
    updateMemberPermissions,
    canAccess,
    currentMemberSections,
  };
}
