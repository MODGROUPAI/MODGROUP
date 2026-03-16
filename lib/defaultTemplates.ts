import type { ProjectTemplate } from './types';
import { localDateISO } from './utils';

// ── Template predefiniti MOD Group ────────────────────────────────────────────
// dueDaysOffset: giorni dalla data di inizio commessa

export const DEFAULT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'TPL-SMM',
    name: 'Social Media Management — Onboarding',
    description: 'Setup completo per nuovo cliente SMM: brief, accessi, piano editoriale',
    serviceType: 'Social Media Management',
    createdAt: '2025-01-01',
    tasks: [
      { id: 't1', title: 'Kickoff call con il cliente',               priority: 'Alta',   dueDaysOffset: 3  },
      { id: 't2', title: 'Raccolta accessi social (Instagram, FB, etc.)', priority: 'Alta', dueDaysOffset: 5  },
      { id: 't3', title: 'Compilare brief marketing cliente',          priority: 'Alta',   dueDaysOffset: 7  },
      { id: 't4', title: 'Audit profili social esistenti',             priority: 'Media',  dueDaysOffset: 10 },
      { id: 't5', title: 'Definire piano editoriale primo mese',       priority: 'Alta',   dueDaysOffset: 14 },
      { id: 't6', title: 'Approvazione piano editoriale con cliente',  priority: 'Alta',   dueDaysOffset: 16 },
      { id: 't7', title: 'Primo contenuto in pubblicazione',           priority: 'Media',  dueDaysOffset: 21 },
      { id: 't8', title: 'Report fine primo mese',                     priority: 'Media',  dueDaysOffset: 35 },
    ],
  },
  {
    id: 'TPL-ADV',
    name: 'Campagna ADV Meta/Google',
    description: 'Setup e lancio campagna pubblicitaria',
    serviceType: 'Campagna ADV',
    createdAt: '2025-01-01',
    tasks: [
      { id: 't1', title: 'Brief campagna — obiettivi e target',        priority: 'Alta',   dueDaysOffset: 2  },
      { id: 't2', title: 'Accesso Business Manager / Google Ads',      priority: 'Alta',   dueDaysOffset: 3  },
      { id: 't3', title: 'Definire budget e periodo campagna',         priority: 'Alta',   dueDaysOffset: 4  },
      { id: 't4', title: 'Creazione copy e visual ads',                priority: 'Alta',   dueDaysOffset: 8  },
      { id: 't5', title: 'Approvazione creatività con cliente',        priority: 'Alta',   dueDaysOffset: 10 },
      { id: 't6', title: 'Setup pixel/tracking conversioni',           priority: 'Alta',   dueDaysOffset: 12 },
      { id: 't7', title: 'Lancio campagna',                            priority: 'Alta',   dueDaysOffset: 14 },
      { id: 't8', title: 'Check performance dopo 7 giorni',            priority: 'Media',  dueDaysOffset: 21 },
      { id: 't9', title: 'Report finale campagna',                     priority: 'Media',  dueDaysOffset: 45 },
    ],
  },
  {
    id: 'TPL-CONTENT',
    name: 'Content Creation — Shooting',
    description: 'Pianificazione e produzione shooting foto/video',
    serviceType: 'Shooting Foto/Video',
    createdAt: '2025-01-01',
    tasks: [
      { id: 't1', title: 'Brief creativo shooting',                    priority: 'Alta',   dueDaysOffset: 3  },
      { id: 't2', title: 'Sopralluogo location (se necessario)',        priority: 'Bassa',  dueDaysOffset: 7  },
      { id: 't3', title: 'Moodboard e selezione stile visivo',         priority: 'Alta',   dueDaysOffset: 7  },
      { id: 't4', title: 'Approvazione moodboard con cliente',         priority: 'Alta',   dueDaysOffset: 9  },
      { id: 't5', title: 'Organizzazione shooting (date, staff, props)', priority: 'Alta', dueDaysOffset: 12 },
      { id: 't6', title: 'Giornata di shooting',                       priority: 'Alta',   dueDaysOffset: 16 },
      { id: 't7', title: 'Prima selezione materiali',                  priority: 'Media',  dueDaysOffset: 19 },
      { id: 't8', title: 'Post-produzione e ritocchi',                  priority: 'Alta',  dueDaysOffset: 23 },
      { id: 't9', title: 'Consegna materiali al cliente',              priority: 'Alta',   dueDaysOffset: 26 },
    ],
  },
  {
    id: 'TPL-BRANDING',
    name: 'Branding & Identità Visiva',
    description: 'Progetto di branding o rebranding completo',
    serviceType: 'Branding',
    createdAt: '2025-01-01',
    tasks: [
      { id: 't1', title: 'Workshop brand identity con cliente',        priority: 'Alta',   dueDaysOffset: 5  },
      { id: 't2', title: 'Ricerca e analisi competitor',               priority: 'Media',  dueDaysOffset: 8  },
      { id: 't3', title: 'Moodboard concept visivo (3 direzioni)',     priority: 'Alta',   dueDaysOffset: 14 },
      { id: 't4', title: 'Presentazione concept al cliente',           priority: 'Alta',   dueDaysOffset: 16 },
      { id: 't5', title: 'Sviluppo logo selezionato',                  priority: 'Alta',   dueDaysOffset: 23 },
      { id: 't6', title: 'Brand guidelines complete',                  priority: 'Alta',   dueDaysOffset: 35 },
      { id: 't7', title: 'Applicazioni brand (biglietti, carta, ecc.)', priority: 'Media', dueDaysOffset: 42 },
      { id: 't8', title: 'Consegna file sorgenti',                     priority: 'Alta',   dueDaysOffset: 45 },
    ],
  },
  {
    id: 'TPL-WEB',
    name: 'Sito Web',
    description: 'Progettazione e sviluppo sito web',
    serviceType: 'Sito Web',
    createdAt: '2025-01-01',
    tasks: [
      { id: 't1', title: 'Raccolta contenuti e materiali cliente',     priority: 'Alta',   dueDaysOffset: 5  },
      { id: 't2', title: 'Definire sitemap e struttura pagine',        priority: 'Alta',   dueDaysOffset: 8  },
      { id: 't3', title: 'Wireframe (bozza layout)',                   priority: 'Alta',   dueDaysOffset: 14 },
      { id: 't4', title: 'Approvazione wireframe',                     priority: 'Alta',   dueDaysOffset: 16 },
      { id: 't5', title: 'Design grafico pagine principali',           priority: 'Alta',   dueDaysOffset: 23 },
      { id: 't6', title: 'Approvazione design',                        priority: 'Alta',   dueDaysOffset: 25 },
      { id: 't7', title: 'Sviluppo sito',                              priority: 'Alta',   dueDaysOffset: 40 },
      { id: 't8', title: 'Test e revisioni',                           priority: 'Alta',   dueDaysOffset: 45 },
      { id: 't9', title: 'Pubblicazione e go-live',                    priority: 'Alta',   dueDaysOffset: 50 },
      { id: 't10', title: 'Formazione cliente gestione CMS',           priority: 'Media',  dueDaysOffset: 52 },
    ],
  },
  {
    id: 'TPL-CONSULT',
    name: 'Consulenza Strategica',
    description: 'Analisi e strategia marketing per PMI',
    serviceType: 'Consulenza Strategica',
    createdAt: '2025-01-01',
    tasks: [
      { id: 't1', title: 'Intervista discovery con il cliente',        priority: 'Alta',   dueDaysOffset: 3  },
      { id: 't2', title: 'Analisi situazione attuale (audit)',          priority: 'Alta',  dueDaysOffset: 10 },
      { id: 't3', title: 'Ricerca competitor e mercato',               priority: 'Media',  dueDaysOffset: 14 },
      { id: 't4', title: 'Definizione strategia e obiettivi',          priority: 'Alta',   dueDaysOffset: 20 },
      { id: 't5', title: 'Presentazione piano strategico',             priority: 'Alta',   dueDaysOffset: 23 },
      { id: 't6', title: 'Approvazione e sign-off strategia',          priority: 'Alta',   dueDaysOffset: 25 },
      { id: 't7', title: 'Piano d\'azione con KPI e timeline',         priority: 'Alta',   dueDaysOffset: 30 },
    ],
  },
];

/**
 * Applica un template a una commessa — genera i task con date calcolate
 */
export function applyTemplate(
  template: ProjectTemplate,
  clientId: string,
  clientName: string,
  dealId: string,
  startDateStr: string,
  responsibleId?: string,
  responsible?: string,
): import('./types').Task[] {
  const start = new Date(startDateStr);
  return template.tasks.map(tt => {
    const due = new Date(start);
    due.setDate(due.getDate() + tt.dueDaysOffset);
    return {
      id:          `TSK${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`.toUpperCase(),
      clientId,
      clientName,
      dealId,
      projectName: template.name,
      title:       tt.title,
      priority:    tt.priority,
      status:      'Da fare',
      responsible: tt.responsible ?? responsible,
      responsibleId: tt.responsibleId ?? responsibleId,
      notes:       tt.notes,
      dueDate:     due.toISOString().slice(0,10),
      isCompleted: false,
    };
  });
}
