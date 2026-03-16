// ── Ruoli disponibili ─────────────────────────────────────────────────────────

export type UserRole = 'ceo' | 'account' | 'smm' | 'designer' | 'pm';

export interface RoleConfig {
  id: UserRole;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const ROLES: RoleConfig[] = [
  { id:'ceo',      label:'CEO',              emoji:'👔', color:'#D4AF37', description:'Direzione e strategia' },
  { id:'account',  label:'Account Manager',  emoji:'🤝', color:'#F26522', description:'Gestione clienti' },
  { id:'smm',      label:'Social Media Mgr', emoji:'📱', color:'#3b9eff', description:'Piano editoriale' },
  { id:'designer', label:'Graphic Designer', emoji:'🎨', color:'#a855f7', description:'Asset e creatività' },
  { id:'pm',       label:'Project Manager',  emoji:'📋', color:'#22c55e', description:'Workload e timeline' },
];

export const DEFAULT_ROLE: UserRole = 'account';

const STORAGE_KEY = 'pmo_user_role';

export function getStoredRole(): UserRole {
  if (typeof window === 'undefined') return DEFAULT_ROLE;
  return (localStorage.getItem(STORAGE_KEY) as UserRole) ?? DEFAULT_ROLE;
}

export function setStoredRole(role: UserRole) {
  localStorage.setItem(STORAGE_KEY, role);
}

// Mappa il ruolo testuale del membro team → UserRole
export function inferRoleFromMember(memberRole: string): UserRole {
  const r = memberRole.toLowerCase();
  if (r.includes('ceo') || r.includes('dirett') || r.includes('founder')) return 'ceo';
  if (r.includes('account'))                                               return 'account';
  if (r.includes('smm') || r.includes('social media'))                    return 'smm';
  if (r.includes('art director') || r.includes('design') || r.includes('graphic')) return 'designer';
  if (r.includes('project') || r.includes('pm ') || r.includes(' pm'))   return 'pm';
  return 'account'; // default
}

// Override per nome utente noti MOD Group
export function inferRoleFromName(fullName: string): UserRole | null {
  const n = fullName.toLowerCase();
  if (n.includes('brumana') || n.includes('mario valerio') || n.includes('valerio')) return 'ceo';
  if (n.includes('maccarelli')) return 'account';
  if (n.includes('evangelo'))   return 'designer';
  if (n.includes('marti') && !n.includes('mario')) return 'smm';
  return null; // lascia che inferRoleFromMember faccia il lavoro
}
