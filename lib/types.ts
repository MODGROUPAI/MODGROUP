export type Priority = 'Bassa' | 'Media' | 'Alta' | 'Urgente';
export type TaskStatus = 'Da fare' | 'In corso' | 'In attesa' | 'Sospesa' | 'Completata';

export interface TeamMember {
  id: string;
  fullName: string;
  lastName: string;
  role: string;
  colorHex: string;
  email: string;
  phone: string;
  startDate: string;
  notes: string;
  isActive: boolean;
}

export type AssetType =
  | 'logo'
  | 'brand_kit'
  | 'photo'
  | 'video'
  | 'font'
  | 'color_palette'
  | 'template'
  | 'document'
  | 'other';

// ── Notifiche automatiche ────────────────────────────────────────────────────

export type NotificationChannel = 'whatsapp' | 'email';

export interface NotificationRule {
  id: string;
  type: string;                   // identificatore tipo notifica
  label: string;                  // descrizione leggibile
  enabled: boolean;
  channel: NotificationChannel;
  recipientOverride?: string;     // email/tel diverso dal default cliente
  templateOverride?: string;      // testo personalizzato
}

export interface ClientNotificationSettings {
  whatsappNumber?: string;        // numero WA del cliente (con prefisso)
  email?: string;                 // email notifiche (può differire dall'email principale)
  enabled: boolean;               // master switch
  rules: NotificationRule[];
}

export interface ClientAsset {
  id: string;
  type: AssetType;
  name: string;
  description?: string;
  driveLink?: string;       // link Drive al file/cartella
  url?: string;             // URL esterno (es. brand guidelines online)
  thumbnailColor?: string;  // colore card (per palette)
  tags?: string[];          // tag liberi
  uploadedAt: string;
  uploadedBy?: string;
  version?: string;         // es. "v2.1"
  approved?: boolean;       // asset approvato dal cliente
}

export interface Client {
  id: string;
  name: string;
  sector: string;
  website?: string;
  address?: string;
  city?: string;
  cap?: string;
  country?: string;
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  socialChannels?: string;
  startDate?: string;
  responsible?: string;           // fullName del membro team
  responsibleId?: string;         // ← NEW: id TeamMember
  notes?: string;
  status: 'Attivo' | 'Inattivo' | 'Archiviato';
  statusDate?: string;
  driveLink?: string;
  convertedFromLeadId?: string;   // ← NEW: id Lead di origine
  marketingBrief?: MarketingBrief; // ← NEW: indagine marketing
  assets?: ClientAsset[];         // libreria asset creativi
  notifications?: ClientNotificationSettings; // impostazioni notifiche automatiche
  sharedCalendar?: boolean;       // calendario condiviso abilitato
  sharedCalendarToken?: string;   // token univoco per link pubblico
  calendarSettings?: {
    showTasks: boolean;           // mostra scadenze task al cliente
    showCaption: boolean;         // mostra anteprima caption
    visibleStatuses: string[];    // stati editoriali visibili al cliente
  };
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: string;         // nome membro team
  authorId?: string;      // id TeamMember
  text: string;
  createdAt: string;      // ISO date
  edited?: boolean;
  mentions?: string[];    // nomi menzionati con @
}

export interface Task {
  id: string;
  clientId?: string;              // ← NEW: id Client
  clientName?: string;            // mantenuto per compatibilità Excel
  dealId?: string;                // ← NEW: id Deal
  projectName?: string;
  title: string;
  startDate?: string;
  dueDate?: string;
  priority: string;
  status: string;
  responsibleId?: string;         // ← NEW: id TeamMember
  responsible?: string;           // mantenuto per compatibilità Excel
  notes?: string;
  isCompleted: boolean;
  driveLink?: string;
  comments?: TaskComment[];
}

export interface Lead {
  id: string;
  source?: string;
  companyName: string;
  feedback?: string;
  interest?: string;
  quoteSent?: boolean;
  email?: string;
  phone?: string;
  target?: string;
  serviceType?: string;
  notes?: string;
  statusContact?: string;
  statusDate?: string;
  driveLink?: string;
  responsible?: string;
  responsibleId?: string;         // ← NEW: id TeamMember
  convertedToClientId?: string;   // ← NEW: id Client dopo conversione
  convertedToDealId?: string;     // ← NEW: id Deal dopo conversione
}

export interface Deal {
  id: string;
  clientId?: string;              // ← NEW: id Client
  companyName: string;            // mantenuto per compatibilità Excel
  source?: string;
  projectLeader?: string;
  projectLeaderId?: string;       // ← NEW: id TeamMember
  jobType?: string;
  status?: string;
  margin?: string;
  contactPerson?: string;
  statusContact?: string;
  statusDate?: string;
  driveLink?: string;
  budgetOre?: number;
  budgetEuro?: number;
  alertThreshold?: number;
  originLeadId?: string;          // ← NEW: id Lead di origine
  originQuoteId?: string;         // ← NEW: id Quote di origine
}

export interface NoGo {
  id: string;
  source?: string;
  companyName: string;
  jobType?: string;
  status?: string;
  contactPerson?: string;
  originLeadId?: string;          // ← NEW: id Lead di origine
}

export interface HotelContact {
  id: string;
  propertyName: string;
  category?: string;
  city?: string;
  contactName?: string;
  role?: string;
  email?: string;
  phone?: string;
  contactDate?: string;
  feedback?: string;
  notes?: string;
}

export interface ArchivedProject {
  id: string;
  clientId?: string;
  clientName: string;
  sector?: string;
  startDate?: string;
  endDate?: string;
  closureReason?: string;
  totalRevenue?: string;
  responsible?: string;
  notes?: string;
  reactivatable?: string;
  originDealId?: string;          // ← NEW: id Deal di origine
}

// ── Contratti / Retainer ─────────────────────────────────────────────────────

export type RetainerStatus = 'Attivo' | 'In scadenza' | 'Sospeso' | 'Terminato' | 'Bozza';
export type RetainerBillingCycle = 'Mensile' | 'Bimestrale' | 'Trimestrale' | 'Annuale';

export interface RetainerPayment {
  id: string;
  dueDate: string;
  paidDate?: string;
  amount: number;
  paid: boolean;
  invoiceNumber?: string;
  notes?: string;
}

export interface Retainer {
  id: string;
  clientId?: string;
  clientName: string;
  title: string;                  // es. "SMM Mensile", "ADV Retainer"
  serviceType: string;
  status: RetainerStatus;
  billingCycle: RetainerBillingCycle;
  monthlyValue: number;           // valore mensile €
  hoursIncluded?: number;         // ore incluse nel retainer
  startDate: string;
  endDate?: string;               // se vuoto = tempo indeterminato
  autoRenew: boolean;
  renewalNoticeDays?: number;     // giorni di preavviso per disdetta
  responsible?: string;
  responsibleId?: string;
  driveLink?: string;             // link contratto su Drive
  notes?: string;
  payments: RetainerPayment[];    // storico pagamenti
  createdAt: string;
  updatedAt?: string;
}

export interface AppData {
  tasks: Task[];
  courses?: Course[];
  retainers?: Retainer[];
  courseCategories?: CourseCategory[];
  clients: Client[];
  leads: Lead[];
  deals: Deal[];
  noGo: NoGo[];
  hotelContacts: HotelContact[];
  teamMembers: TeamMember[];
  archivedProjects: ArchivedProject[];
  suppliers: Supplier[];
  pipeline: PipelineDeal[];
  timeLogs: TimeLog[];
  templates: ProjectTemplate[];
  quotes: Quote[];
  editorialContent: EditorialContent[];
}

export type DriveLinks = Record<string, string>;

// ── Preventivi ────────────────────────────────────────────────
export type QuoteStatus = 'Bozza' | 'Inviato' | 'Accettato' | 'Rifiutato' | 'Scaduto';

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  companyName: string;
  clientId?: string;              // ← NEW: id Client
  contactName?: string;
  email?: string;
  leadId?: string;
  pipelineId?: string;
  status: QuoteStatus;
  issueDate: string;
  expiryDate?: string;
  projectLeader?: string;
  projectLeaderId?: string;       // ← NEW: id TeamMember
  serviceType?: string;
  items: QuoteLineItem[];
  subtotal: number;
  discountPct?: number;
  discountAmt?: number;
  total: number;
  notes?: string;
  internalNotes?: string;
  convertedToDealId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: 'Fotografi / Videomaker' | 'Copywriter / Creativi' | 'Stampatori / Produzione' | 'Agenzie / Collaboratori' | 'Influencer / Creator' | 'Fornitori tecnici' | 'Altro';
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  serviceDescription?: string;
  rate?: string;
  projects?: string;
  rating?: number;
  notes?: string;
  status: 'Attivo' | 'Inattivo';
  lastContact?: string;
}

export type PipelineStage = 'Nuovo' | 'Contattato' | 'In trattativa' | 'Preventivo inviato' | 'Chiuso vinto' | 'Chiuso perso';

export interface PipelineDeal {
  id: string;
  companyName: string;
  clientId?: string;              // ← NEW: id Client se già esistente
  contactName?: string;
  email?: string;
  phone?: string;
  source?: string;
  serviceType?: string;
  value?: number;
  probability?: number;
  stage: PipelineStage;
  responsible?: string;
  responsibleId?: string;         // ← NEW: id TeamMember
  notes?: string;
  driveLink?: string;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
}

export interface TemplateTask {
  id: string;
  title: string;
  priority: string;
  dueDaysOffset: number;
  responsible?: string;
  responsibleId?: string;         // ← NEW: id TeamMember
  notes?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  serviceType: string;
  tasks: TemplateTask[];
  createdAt: string;
}

export interface TimeLog {
  id: string;
  date: string;
  member: string;
  memberId?: string;              // ← NEW: id TeamMember
  clientId?: string;              // ← NEW: id Client
  clientName?: string;
  dealId?: string;                // ← NEW: id Deal
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  hours: number;
  billable: boolean;
  notes?: string;
}

// ── Piano Editoriale ─────────────────────────────────────────────────────────
export type ContentFormat = 'Post' | 'Reel' | 'Story' | 'Carousel' | 'Video' | 'UGC' | 'Altro';
export type ContentStatus = 'Da fare' | 'In produzione' | 'Bloccato' | 'In revisione' | 'Approvato' | 'Pubblicato' | 'Rimandato';
export type ContentPlatform = 'Instagram' | 'Facebook' | 'LinkedIn' | 'TikTok' | 'YouTube' | 'Pinterest' | 'Altro';

export interface EditorialContent {
  id: string;
  clientId?: string;              // ← NEW: id Client
  clientName: string;
  platform: ContentPlatform;
  format: ContentFormat;
  scheduledDate: string;
  publishedDate?: string;
  status: ContentStatus;
  caption?: string;
  visualNotes?: string;
  driveLink?: string;
  responsible?: string;
  responsibleId?: string;         // ← NEW: id TeamMember
  approvedBy?: string;
  waitingSince?: string;
  blockedReason?: string;
  briefChecklist?: {
    textApproved: boolean;
    materialsReady: boolean;
    styleRef: boolean;
    formatConfirmed: boolean;
  };
  notes?: string;
  tags?: string;
  // ── Flusso approvazione ──────────────────────────────────────────────────
  approvalToken?: string;         // token univoco per link pubblico cliente
  approvalRequestedAt?: string;   // quando è stato inviato al cliente
  approvalRespondedAt?: string;   // quando il cliente ha risposto
  approvalStatus?: 'pending' | 'approved' | 'changes_requested';
  clientFeedback?: string;        // testo del feedback cliente
  clientName2?: string;           // nome del cliente che ha risposto (da form pubblico)
  revisionHistory?: ContentRevision[]; // storico revisioni
}

export interface ContentRevision {
  id: string;
  date: string;
  action: 'sent_for_approval' | 'approved' | 'changes_requested' | 'revised';
  note?: string;
  by?: string; // responsabile interno o "cliente"
}

// ── Utility types ─────────────────────────────────────────────────────────────

/** Risolve il nome display di un client dato id o stringa */
export function resolveClientName(
  clients: Client[],
  clientId?: string,
  fallbackName?: string
): string {
  if (clientId) {
    const c = clients.find(c => c.id === clientId);
    if (c) return c.name;
  }
  return fallbackName ?? '';
}

/** Risolve il nome display di un team member dato id o stringa */
export function resolveMemberName(
  members: TeamMember[],
  memberId?: string,
  fallbackName?: string
): string {
  if (memberId) {
    const m = members.find(m => m.id === memberId);
    if (m) return m.fullName;
  }
  return fallbackName ?? '';
}

/** Controlla se un client esiste già per nome (case-insensitive) */
export function findClientByName(clients: Client[], name: string): Client | undefined {
  const lower = name.toLowerCase().trim();
  return clients.find(c => c.name.toLowerCase().trim() === lower);
}

// ── Marketing Brief ───────────────────────────────────────────────────────────

export interface MarketingBrief {
  // Brand identity
  brandValues?: string;        // valori del brand
  toneOfVoice?: string;        // tono di voce (es. "formale ma caldo")
  doNotSay?: string;           // cosa NON dire/mostrare
  visualStyle?: string;        // stile visivo (colori, mood, riferimenti)

  // Target
  targetAge?: string;          // fascia d'età
  targetInterests?: string;    // interessi e stili di vita
  targetPainPoints?: string;   // bisogni e problemi del target
  targetGeo?: string;          // geografia target

  // Obiettivi
  socialGoal?: string;         // obiettivo principale (awareness/lead/prenotazioni...)
  kpiTarget?: string;          // KPI da raggiungere
  contentFrequency?: string;   // frequenza pubblicazione desiderata

  // Competitor
  competitors?: string;        // competitor principali
  competitorStrengths?: string;// cosa fanno bene i competitor
  differentiators?: string;    // cosa differenzia questo cliente

  // Contenuto
  topFormats?: string;         // formati che funzionano meglio
  topTopics?: string;          // argomenti evergreen del brand
  seasonality?: string;        // stagionalità / eventi annuali rilevanti

  // Note libere
  extraNotes?: string;

  updatedAt?: string;
}

// Aggiunge marketingBrief a Client
declare module './types' {}

// ── Corsi di Formazione (Remodel) ─────────────────────────────────────────────

export interface CourseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;   // hex color
  emoji?: string;
  order: number;
  createdAt: string;
}

export type CourseStatus = 'Bozza' | 'Attivo' | 'Completato' | 'Archiviato';
export type ModuleStatus = 'Da preparare' | 'In preparazione' | 'Pronto' | 'Erogato';
export type ParticipantStatus = 'Iscritto' | 'Presente' | 'Assente' | 'Completato' | 'Ritirato';

export type NotebookArtifactType =
  | 'audio_overview'
  | 'video_overview'
  | 'mind_map'
  | 'report'
  | 'flashcard'
  | 'quiz'
  | 'infographic'
  | 'slide_deck'
  | 'data_table'
  | 'study_guide'
  | 'faq'
  | 'timeline';

export interface NotebookArtifact {
  id: string;
  type: NotebookArtifactType;
  label: string;
  link: string;
  driveLink?: string;
  createdAt: string;
  notes?: string;
}

export interface CourseModule {
  id: string;
  order: number;
  title: string;
  description?: string;
  duration?: number;          // minuti
  status: ModuleStatus;
  driveLink?: string;         // materiali (PDF, PPTX, ecc.)
  videoLink?: string;         // video lezione
  notebookLink?: string;      // link NotebookLM notebook principale
  artifacts?: NotebookArtifact[]; // artefatti generati da NotebookLM
  notes?: string;
  deliveredAt?: string;       // data erogazione
}

export interface CourseParticipant {
  id: string;
  name: string;
  email?: string;
  company?: string;
  role?: string;
  enrolledAt: string;
  status: ParticipantStatus;
  completedModules: string[]; // array di module id
  certificateIssued?: boolean;
  certificateDate?: string;
  notes?: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  platform: string;           // es. "Remodel"
  category?: string;          // es. "Marketing Digitale", "Social Media", "AI"
  status: CourseStatus;
  instructor: string;         // es. "Mattia Brumana" (default docente)
  instructorId?: string;      // id TeamMember
  coInstructors?: string[];
  startDate?: string;
  endDate?: string;
  location?: string;          // "Online" | "In presenza" | luogo
  maxParticipants?: number;
  price?: number;
  modules: CourseModule[];
  participants: CourseParticipant[];
  driveLink?: string;         // cartella materiali generale
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
