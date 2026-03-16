import type { NotificationRule } from './types';

// ── Regole di notifica predefinite ───────────────────────────────────────────
// Tutte DISABILITATE di default — si attivano solo su scelta esplicita

export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  // Piano editoriale
  {
    id: 'content_published',
    type: 'content_published',
    label: 'Contenuto pubblicato',
    enabled: false,
    channel: 'whatsapp',
    templateOverride: 'Ciao! Abbiamo appena pubblicato un nuovo contenuto per {clientName} su {platform}. 📱',
  },
  {
    id: 'content_ready_review',
    type: 'content_ready_review',
    label: 'Contenuto pronto per revisione',
    enabled: false,
    channel: 'whatsapp',
    templateOverride: 'Ciao! È pronto un contenuto per la tua approvazione. Clicca qui per vederlo: {approvalLink}',
  },
  {
    id: 'monthly_plan_ready',
    type: 'monthly_plan_ready',
    label: 'Piano mensile pronto',
    enabled: false,
    channel: 'email',
    templateOverride: '',
  },
  // Report
  {
    id: 'monthly_report',
    type: 'monthly_report',
    label: 'Report mensile disponibile',
    enabled: false,
    channel: 'email',
    templateOverride: '',
  },
  // Scadenze
  {
    id: 'task_deadline_reminder',
    type: 'task_deadline_reminder',
    label: 'Reminder scadenza attività',
    enabled: false,
    channel: 'whatsapp',
    templateOverride: 'Reminder: tra 48h scade la consegna di "{taskTitle}" per {clientName}.',
  },
  // Contratti
  {
    id: 'contract_expiry',
    type: 'contract_expiry',
    label: 'Contratto in scadenza',
    enabled: false,
    channel: 'email',
    templateOverride: '',
  },
  // ADV
  {
    id: 'campaign_launched',
    type: 'campaign_launched',
    label: 'Campagna ADV lanciata',
    enabled: false,
    channel: 'whatsapp',
    templateOverride: 'La tua campagna {campaignName} è live! Iniziamo a monitorare i risultati. 🚀',
  },
  {
    id: 'campaign_weekly_report',
    type: 'campaign_weekly_report',
    label: 'Report settimanale ADV',
    enabled: false,
    channel: 'email',
    templateOverride: '',
  },
];

// Canali disponibili con icone
export const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: '📱', color: '#25d366' },
  email:    { label: 'Email',    icon: '📧', color: '#3b9eff' },
};

// Genera messaggio WA da template
export function buildNotificationText(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (text, [key, val]) => text.replace(new RegExp(`{${key}}`, 'g'), val),
    template
  );
}
