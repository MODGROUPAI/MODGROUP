// ── GOD MODE — controllo master di tutte le feature dell'app ─────────────────

// Utenti con accesso GOD
export const GOD_USERS = [
  'brumana mattia',
  'mattia brumana',
  'mario valerio',
  'valerio mario',
  'valentina maccarelli',
  'maccarelli valentina',
  'valentina', // fallback se solo nome
];

export function isGodUser(name: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  // Match esatto nome completo (es. "Brumana Mattia" o "Mattia Brumana")
  return GOD_USERS.some(u => {
    const uParts = u.split(' ');
    const nParts = n.split(' ');
    // Entrambe le parole del nome GOD devono essere presenti nel nome completo
    return uParts.every(part => nParts.some(np => np === part));
  });
}

// ── Feature controllabili ─────────────────────────────────────────────────────

export interface GodFeature {
  id: string;
  label: string;
  description: string;
  group: string;
  defaultOn: boolean;
  icon: string;
  // Effetti: sidebar keys da nascondere, path da bloccare
  sidebarKeys?: string[];
  paths?: string[];
}

export const GOD_FEATURES: GodFeature[] = [
  // ── FORMAZIONE ──────────────────────────────────────────────────────────────
  {
    id: 'module_training',
    label: 'Modulo Formazione (Remodel)',
    description: 'Corsi, moduli, partecipanti, certificati',
    group: 'Formazione', icon: '🎓', defaultOn: true,
    sidebarKeys: ['courses'], paths: ['/courses'],
  },
  {
    id: 'feature_remodel_page',
    label: 'Pagina pubblica Re Model',
    description: 'Pagina branded con stile WeAreMOD',
    group: 'Formazione', icon: '🌐', defaultOn: true,
    sidebarKeys: ['remodel'], paths: ['/remodel'],
  },
  {
    id: 'feature_canva',
    label: 'Canva Generator',
    description: 'Generazione grafiche, copertine, certificati',
    group: 'Formazione', icon: '🎨', defaultOn: true,
    sidebarKeys: ['canva'], paths: ['/courses/canva'],
  },
  {
    id: 'feature_notebooklm',
    label: 'Integrazione NotebookLM',
    description: 'Prompt fonti e artefatti per moduli didattici',
    group: 'Formazione', icon: '📓', defaultOn: true,
  },
  {
    id: 'feature_courses_newsletter',
    label: 'Newsletter Corsi',
    description: 'Invio newsletter ai partecipanti',
    group: 'Formazione', icon: '📬', defaultOn: true,
    sidebarKeys: ['newsletter_courses'], paths: ['/courses/newsletter'],
  },

  // ── COMMERCIALE ─────────────────────────────────────────────────────────────
  {
    id: 'feature_retainers',
    label: 'Contratti & Retainer',
    description: 'Gestione contratti ricorrenti e pagamenti',
    group: 'Commerciale', icon: '📑', defaultOn: true,
    sidebarKeys: ['retainers'], paths: ['/retainers'],
  },
  {
    id: 'feature_quotes',
    label: 'Preventivi',
    description: 'Generatore preventivi con AI',
    group: 'Commerciale', icon: '📄', defaultOn: true,
    sidebarKeys: ['quotes'], paths: ['/quotes'],
  },
  {
    id: 'feature_pipeline',
    label: 'Pipeline commerciale',
    description: 'Kanban opportunità con probabilità e valore',
    group: 'Commerciale', icon: '📊', defaultOn: true,
    sidebarKeys: ['pipeline'], paths: ['/pipeline'],
  },
  {
    id: 'feature_forecast',
    label: 'Forecast Ricavi',
    description: 'Proiezione ricavi su 3-12 mesi',
    group: 'Commerciale', icon: '💰', defaultOn: true,
    sidebarKeys: ['forecast'], paths: ['/forecast'],
  },
  {
    id: 'feature_leads',
    label: 'Database Lead',
    description: 'Gestione prospect e conversione clienti',
    group: 'Commerciale', icon: '🎯', defaultOn: true,
    sidebarKeys: ['leads'], paths: ['/leads'],
  },

  // ── OPERATIVO ───────────────────────────────────────────────────────────────
  {
    id: 'feature_timetracking',
    label: 'Time Tracking',
    description: 'Log ore per cliente e progetto',
    group: 'Operativo', icon: '⏱️', defaultOn: true,
    sidebarKeys: ['timetracking'], paths: ['/timetracking'],
  },
  {
    id: 'feature_profitability',
    label: 'Dashboard Redditività',
    description: 'Margini e profittabilità per cliente',
    group: 'Operativo', icon: '📈', defaultOn: true,
    sidebarKeys: ['profitability'], paths: ['/profitability'],
  },
  {
    id: 'feature_report_ai',
    label: 'Analisi AI nel Report',
    description: 'Executive summary AI nel report mensile',
    group: 'Operativo', icon: '🤖', defaultOn: true,
  },
  {
    id: 'feature_newsletter_ai',
    label: 'Newsletter AI (interna)',
    description: 'Newsletter AI con fact-check per il team',
    group: 'Operativo', icon: '📰', defaultOn: true,
    sidebarKeys: ['newsletter'], paths: ['/newsletter'],
  },

  // ── AI & AUTOMAZIONE ────────────────────────────────────────────────────────
  {
    id: 'feature_ai_agent',
    label: 'Agente AI',
    description: 'Chat AI Gemini libera',
    group: 'AI', icon: '🧠', defaultOn: true,
    sidebarKeys: ['ai'], paths: ['/ai'],
  },
  {
    id: 'feature_ai_content',
    label: 'Generazione contenuti AI',
    description: 'Creazione caption, hashtag e note visual con AI',
    group: 'AI', icon: '✨', defaultOn: true,
    paths: ['/editorial/new'],
  },
  {
    id: 'feature_ai_planner',
    label: 'Pianificatore contenuti AI',
    description: 'Genera piano editoriale mensile con AI',
    group: 'AI', icon: '📅', defaultOn: true,
    paths: ['/editorial/plan'],
  },
  {
    id: 'feature_ai_brief',
    label: 'Brief creativo AI',
    description: 'Brief per designer generato da AI',
    group: 'AI', icon: '🎨', defaultOn: true,
  },
  {
    id: 'feature_ai_briefing',
    label: 'Brief pre-riunione AI',
    description: 'Briefing strutturato AI prima delle riunioni cliente',
    group: 'AI', icon: '🗓', defaultOn: true,
  },

  // ── CONDIVISIONE CLIENTE ────────────────────────────────────────────────────
  {
    id: 'feature_share_dashboard',
    label: 'Dashboard condivisibile',
    description: 'Snapshot pubblico dello stato cliente',
    group: 'Condivisione', icon: '🔗', defaultOn: true,
  },
  {
    id: 'feature_shared_calendar',
    label: 'Calendario condiviso',
    description: 'Calendario pubblico per il cliente',
    group: 'Condivisione', icon: '📅', defaultOn: true,
  },
  {
    id: 'feature_approval_flow',
    label: 'Flusso approvazione contenuti',
    description: 'Link di approvazione per il cliente',
    group: 'Condivisione', icon: '✅', defaultOn: true,
  },

  // ── SISTEMA ─────────────────────────────────────────────────────────────────
  {
    id: 'feature_notifications',
    label: 'Notifiche automatiche',
    description: 'WA ed email automatici al cliente',
    group: 'Sistema', icon: '🔔', defaultOn: true,
  },
  {
    id: 'feature_approval_gate',
    label: 'Gate approvazione',
    description: 'Conferma obbligatoria prima di ogni invio esterno',
    group: 'Sistema', icon: '🔒', defaultOn: true,
  },
  {
    id: 'feature_task_comments',
    label: 'Commenti sui task',
    description: 'Thread di commenti con @menzioni',
    group: 'Sistema', icon: '💬', defaultOn: true,
  },
  {
    id: 'feature_client_assets',
    label: 'Libreria asset creativi',
    description: 'Archivio loghi, foto, brand kit per cliente',
    group: 'Sistema', icon: '🗂️', defaultOn: true,
  },
  {
    id: 'feature_google_drive',
    label: 'Sync Google Drive',
    description: 'Sincronizzazione automatica su Drive',
    group: 'Sistema', icon: '☁️', defaultOn: true,
  },
];

const GOD_STORAGE_KEY = 'pmo_god_features';

export function loadGodFeatures(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(GOD_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch { return {}; }
}

export function saveGodFeatures(state: Record<string, boolean>) {
  localStorage.setItem(GOD_STORAGE_KEY, JSON.stringify(state));
}

export function isFeatureEnabled(featureId: string): boolean {
  const state = loadGodFeatures();
  if (featureId in state) return state[featureId];
  const feature = GOD_FEATURES.find(f => f.id === featureId);
  return feature?.defaultOn ?? true;
}

export function getAllFeatureStates(): Record<string, boolean> {
  const stored = loadGodFeatures();
  return Object.fromEntries(
    GOD_FEATURES.map(f => [f.id, f.id in stored ? stored[f.id] : f.defaultOn])
  );
}
