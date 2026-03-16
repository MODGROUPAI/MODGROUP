// Store per l'utente corrente — collegato al team reale
const USER_KEY    = 'pmo_current_user';
const MEMBER_KEY  = 'pmo_current_member';

export interface CurrentUser {
  id: string;          // id TeamMember
  name: string;        // fullName del membro
  role: string;        // ruolo nel team
  initials: string;    // MB, MV, VM...
}

function isBrowser() { return typeof window !== 'undefined'; }

export function getCurrentUser(): CurrentUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as CurrentUser : null;
  } catch { return null; }
}

export function setCurrentUser(user: CurrentUser) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(MEMBER_KEY, user.id); // sincronia con pmo_current_member
  } catch {}
}

export function clearCurrentUser() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MEMBER_KEY);
  } catch {}
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
