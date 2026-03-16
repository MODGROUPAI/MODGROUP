// ── Sistema permessi per membro team ─────────────────────────────────────────

export interface SectionPermission {
  key: string;
  label: string;
  path: string;
  group: string;
}

export interface MemberPermissions {
  memberId: string;       // id TeamMember
  memberName: string;     // nome completo
  sections: Record<string, boolean>; // key → abilitato
}

// ── Tutte le sezioni dell'app ────────────────────────────────────────────────

export const ALL_SECTIONS: SectionPermission[] = [
  // Overview
  { key:'daily',          label:'Daily Brief',           path:'/daily',           group:'Overview' },
  { key:'dashboard',      label:'Dashboard',             path:'/',                group:'Overview' },
  { key:'tasks',          label:'Tracker Task',          path:'/tasks',           group:'Overview' },
  { key:'calendar',       label:'Calendario',            path:'/calendar',        group:'Overview' },
  { key:'health',         label:'KPI Clienti',           path:'/clients/health',  group:'Overview' },
  // Commerciale
  { key:'leads',          label:'Lead',                  path:'/leads',           group:'Commerciale' },
  { key:'pipeline',       label:'Pipeline',              path:'/pipeline',        group:'Commerciale' },
  { key:'quotes',         label:'Preventivi',            path:'/quotes',          group:'Commerciale' },
  { key:'clients',        label:'Clienti',               path:'/clients',         group:'Commerciale' },
  { key:'deals',          label:'Commesse',              path:'/deals',           group:'Commerciale' },
  { key:'retainers',      label:'Retainer',              path:'/retainers',       group:'Commerciale' },
  { key:'onboarding',     label:'Nuovo Cliente',         path:'/onboarding',      group:'Commerciale' },
  // Operativo
  { key:'account',        label:'Scadenze Account',      path:'/account',         group:'Operativo' },
  { key:'editorial',      label:'Piano Editoriale',      path:'/editorial',       group:'Operativo' },
  { key:'report',         label:'Report Mensile',        path:'/report',          group:'Operativo' },
  { key:'timetracking',   label:'Time Tracking',         path:'/timetracking',    group:'Operativo' },
  { key:'profitability',  label:'Redditività',           path:'/profitability',   group:'Operativo' },
  { key:'forecast',       label:'Forecast Ricavi',       path:'/forecast',        group:'Operativo' },
  { key:'suppliers',      label:'Fornitori',             path:'/suppliers',       group:'Operativo' },
  { key:'team',           label:'Team',                  path:'/team',            group:'Operativo' },
  // Formazione
  { key:'courses',        label:'Corsi Remodel',         path:'/courses',         group:'Formazione' },
  { key:'remodel',        label:'Pagina Re Model',       path:'/remodel',         group:'Formazione' },
  { key:'newsletter_courses', label:'Newsletter Corsi',  path:'/courses/newsletter', group:'Formazione' },
  { key:'canva',          label:'Canva Generator',       path:'/courses/canva',   group:'Formazione' },
  // Strumenti
  { key:'templates',      label:'Template',              path:'/templates',       group:'Strumenti' },
  { key:'newsletter',     label:'Newsletter AI',         path:'/newsletter',      group:'Strumenti' },
  { key:'contacts',       label:'Rubrica',               path:'/contacts',        group:'Strumenti' },
  { key:'nogo',           label:'No Go',                 path:'/no-go',           group:'Strumenti' },
  { key:'archive',        label:'Archivio',              path:'/archive',         group:'Strumenti' },
  { key:'ai',             label:'Agente AI',             path:'/ai',              group:'Strumenti' },
];

// Tutte le sezioni abilitate (profilo admin/CEO)
export const ALL_ENABLED: Record<string, boolean> =
  Object.fromEntries(ALL_SECTIONS.map(s => [s.key, true]));

// Profilo SMM standard (senza commerciale sensibile)
export const SMM_DEFAULT: Record<string, boolean> = {
  ...ALL_ENABLED,
  retainers: false, forecast: false, profitability: false,
  leads: false, pipeline: false, quotes: false, deals: false,
  onboarding: false, suppliers: false,
  courses: false, remodel: false, newsletter_courses: false,
  canva: true,    // ✅ SMM vede Canva Generator in Formazione
};

// Profilo Designer
export const DESIGNER_DEFAULT: Record<string, boolean> = {
  ...ALL_ENABLED,
  retainers: false, forecast: false, profitability: false,
  leads: false, pipeline: false, quotes: false, deals: false,
  onboarding: false, suppliers: false,
  account: false, report: false, timetracking: false,
  courses: false, remodel: false, newsletter_courses: false,
  canva: true,  // ✅ Designer vede Canva Generator in Formazione
};


const STORAGE_KEY = 'pmo_permissions';

export function loadPermissions(): Record<string, MemberPermissions> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch { return {}; }
}

export function savePermissions(perms: Record<string, MemberPermissions>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

export function getMemberPermissions(memberId: string): Record<string, boolean> {
  const all = loadPermissions();
  return all[memberId]?.sections ?? ALL_ENABLED;
}

export function hasAccess(memberId: string, sectionKey: string): boolean {
  const perms = getMemberPermissions(memberId);
  return perms[sectionKey] !== false; // default: abilitato
}

// Membro corrente (da localStorage, separato dal ruolo)
const CURRENT_MEMBER_KEY = 'pmo_current_member';

export function getCurrentMemberId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CURRENT_MEMBER_KEY) ?? '';
}

export function setCurrentMemberId(id: string) {
  localStorage.setItem(CURRENT_MEMBER_KEY, id);
}
