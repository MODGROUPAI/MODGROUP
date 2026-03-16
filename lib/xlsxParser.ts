// @ts-nocheck
import * as XLSX from 'xlsx';
import { localDateISO } from './utils';
import type {
  AppData, Task, Client, Lead, Deal, NoGo, HotelContact, TeamMember,
  ArchivedProject, Supplier, PipelineDeal, TimeLog, ProjectTemplate,
  TemplateTask, Quote, QuoteLineItem,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE COERCERS
// ─────────────────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = parseFloat(str(v).replace(',', '.'));
  return isNaN(n) ? undefined : n;
}

function bool(v: unknown): boolean {
  const s = str(v).toLowerCase();
  return s === 'sì' || s === 'si' || s === 'yes' || s === 'true' || s === '1';
}

function parseDate(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.split('T')[0];
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(parseInt(s));
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

function resolveSheetName(wb: XLSX.WorkBook, name: string): string | null {
  if (wb.Sheets[name]) return name;
  const lower = name.toLowerCase();
  return (
    wb.SheetNames.find(n => n.toLowerCase() === lower) ??
    wb.SheetNames.find(n => n.toLowerCase().includes(lower.split(' ')[0].toLowerCase())) ??
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN RESOLVER — alias mapping, first match wins
// ─────────────────────────────────────────────────────────────────────────────

function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') return row[alias];
  }
  return undefined;
}
function pickStr(row, aliases: string[]): string { return str(pick(row, aliases)); }
function pickNum(row, aliases: string[]): number | undefined { return num(pick(row, aliases)); }
function pickDate(row, aliases: string[]): string { return parseDate(pick(row, aliases)); }
function pickBool(row, aliases: string[]): boolean { return bool(pick(row, aliases)); }

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN ALIAS MAPS — edit here to add variants
// ─────────────────────────────────────────────────────────────────────────────

const COL = {
  TASK: {
    id:          ['ID Task', 'ID', 'id'],
    clientName:  ['Cliente', 'Client'],
    projectName: ['Progetto', 'Progetto/Commessa', 'Project'],
    title:       ['Task', 'Titolo', 'Title'],
    startDate:   ['Data Inizio', 'Start Date'],
    dueDate:     ['Deadline', 'Data Fine', 'Due Date', 'Scadenza'],
    priority:    ['Priorità', 'Priority'],
    status:      ['Stato', 'Status'],
    responsible: ['Responsabile', 'Responsible', 'Assegnato a'],
    notes:       ['Note', 'Notes'],
    driveLink:   ['Drive Link', 'Link Drive', 'Drive'],
  },
  CLIENT: {
    id:            ['ID Cliente', 'ID', 'id'],
    name:          ['Nome Cliente', 'Azienda', 'Nome', 'Client'],
    sector:        ['Settore', 'Sector', 'Industria'],
    website:       ['Sito Web', 'Website', 'Sito'],
    address:       ['Indirizzo', 'Address'],
    city:          ['Città', 'City'],
    cap:           ['CAP', 'ZIP'],
    country:       ['Paese', 'Country'],
    contactName:   ['Contatto Principale', 'Contatto', 'Contact', 'Referente'],
    contactRole:   ['Ruolo Contatto', 'Ruolo', 'Role'],
    email:         ['Email', 'E-mail'],
    phone:         ['Telefono', 'Tel', 'Phone', 'Cellulare'],
    socialChannels:['Canali Social', 'Social'],
    startDate:     ['Data Inizio Collab.', 'Data Inizio', 'Start Date'],
    responsible:   ['Responsabile', 'Responsible', 'Account'],
    notes:         ['Note', 'Notes'],
    status:        ['Stato Contatto', 'Stato', 'Status'],
    statusDate:    ['Data Stato', 'Data Aggiornamento'],
    driveLink:     ['Drive Link', 'Link Drive'],
  },
  LEAD: {
    source:        ['Fonte', 'Source'],
    companyName:   ['Nome / Azienda', 'Azienda', 'Nome', 'Company'],
    feedback:      ['Feedback'],
    interest:      ['Interesse', 'Interest'],
    quoteSent:     ['Preventivo', 'Quote Sent', 'Offerta'],
    email:         ['Email', 'E-mail'],
    phone:         ['Telefono', 'Tel', 'Phone', 'Cellulare'],
    target:        ['Target'],
    serviceType:   ['Tipologia / Servizio', 'Servizio', 'Service', 'Tipo Servizio'],
    notes:         ['Note', 'Notes'],
    statusContact: ['Stato Contatto', 'Stato', 'Status'],
    statusDate:    ['Data Stato', 'Data Aggiornamento'],
    driveLink:     ['Drive Link', 'Link Drive'],
    responsible:   ['Responsabile', 'Responsible'],
  },
  DEAL: {
    source:        ['Fonte', 'Source'],
    projectLeader: ['Project Leader', 'PM', 'Responsabile'],
    companyName:   ['Cliente', 'Azienda', 'Company'],
    jobType:       ['Lavoro', 'Tipo Lavoro', 'Job Type', 'Servizio'],
    status:        ['Status', 'Stato'],
    margin:        ['Margine', 'Margin'],
    contactPerson: ['Referente', 'Contatto', 'Contact'],
    statusContact: ['Stato Contatto'],
    statusDate:    ['Data Stato'],
    budgetOre:     ['Budget Ore', 'Budget Hours', 'Ore Budget'],
    budgetEuro:    ['Budget Euro', 'Budget €', 'Budget EUR', 'Valore'],
    alertThreshold:['Soglia Alert %', 'Alert %', 'Soglia'],
    driveLink:     ['Drive Link', 'Link Drive'],
  },
  NOGO: {
    source:        ['Fonte', 'Source'],
    companyName:   ['Cliente', 'Azienda', 'Company'],
    jobType:       ['Lavoro', 'Tipo Lavoro', 'Job Type'],
    status:        ['Status', 'Stato', 'Motivo'],
    contactPerson: ['Referente', 'Contatto'],
  },
  HOTEL: {
    propertyName: ['Struttura', 'Hotel', 'Nome', 'Property'],
    category:     ['Categoria', 'Category', 'Tipo'],
    city:         ['Città', 'City'],
    contactName:  ['Referente', 'Contatto', 'Contact'],
    role:         ['Ruolo', 'Role'],
    email:        ['Email', 'E-mail'],
    phone:        ['Telefono', 'Tel', 'Phone'],
    contactDate:  ['Data contatto', 'Data Contatto', 'Contact Date'],
    feedback:     ['Feedback'],
    notes:        ['Note', 'Notes'],
  },
  TEAM: {
    fullName:  ['Nome', 'Full Name', 'Nome Completo'],
    lastName:  ['Cognome', 'Last Name'],
    role:      ['Ruolo', 'Role', 'Posizione'],
    colorHex:  ['Colore HEX', 'Color', 'Colore'],
    email:     ['Email', 'E-mail'],
    phone:     ['Cellulare', 'Telefono', 'Phone'],
    startDate: ['Data Inizio', 'Start Date'],
    notes:     ['Note', 'Notes'],
  },
  ARCHIVE: {
    clientId:      ['ID Cliente', 'ID'],
    clientName:    ['Nome Cliente', 'Cliente', 'Azienda'],
    sector:        ['Settore', 'Sector'],
    startDate:     ['Data Inizio', 'Start Date'],
    endDate:       ['Data Fine', 'End Date'],
    closureReason: ['Motivo Chiusura', 'Motivo', 'Reason'],
    totalRevenue:  ['Fatturato Totale', 'Fatturato', 'Revenue'],
    responsible:   ['Responsabile', 'Responsible'],
    notes:         ['Note / Storia', 'Note', 'Notes'],
    reactivatable: ['Riattivabile?', 'Riattivabile', 'Reactivatable'],
  },
  SUPPLIER: {
    id:                 ['ID', 'id'],
    name:               ['Nome', 'Name'],
    category:           ['Categoria', 'Category'],
    contactName:        ['Contatto', 'Contact', 'Referente'],
    email:              ['Email', 'E-mail'],
    phone:              ['Telefono', 'Tel', 'Cellulare'],
    website:            ['Sito Web', 'Website', 'Sito'],
    serviceDescription: ['Servizio', 'Service', 'Descrizione Servizio'],
    rate:               ['Tariffa', 'Rate', 'Tariffa/h'],
    projects:           ['Progetti', 'Projects'],
    rating:             ['Valutazione', 'Rating', 'Voto'],
    notes:              ['Note', 'Notes'],
    status:             ['Stato', 'Status'],
    lastContact:        ['Ultimo Contatto', 'Last Contact', 'Data Contatto'],
  },
  PIPELINE: {
    id:          ['ID', 'id'],
    companyName: ['Azienda', 'Cliente', 'Company'],
    contactName: ['Contatto', 'Contact', 'Referente'],
    email:       ['Email', 'E-mail'],
    phone:       ['Telefono', 'Tel'],
    source:      ['Fonte', 'Source'],
    serviceType: ['Servizio', 'Service', 'Tipologia'],
    value:       ['Valore €', 'Valore', 'Value', 'Budget'],
    probability: ['Probabilità %', 'Probabilità', 'Probability', 'Prob %'],
    stage:       ['Fase', 'Stage', 'Stato'],
    responsible: ['Responsabile', 'Responsible'],
    notes:       ['Note', 'Notes'],
    createdAt:   ['Data Creazione', 'Created At'],
    updatedAt:   ['Data Aggiornamento', 'Updated At'],
    closedAt:    ['Data Chiusura', 'Closed At'],
    driveLink:   ['Drive Link', 'Link Drive'],
  },
  TIMELOG: {
    id:          ['ID', 'id'],
    date:        ['Data', 'Date'],
    member:      ['Membro', 'Member', 'Persona'],
    clientName:  ['Cliente', 'Client'],
    projectName: ['Progetto', 'Project'],
    taskTitle:   ['Task', 'Task Title', 'Attività'],
    hours:       ['Ore', 'Hours', 'H'],
    billable:    ['Billable', 'Fatturabile', 'Billable?'],
    notes:       ['Note', 'Notes'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHEET ROW READER
// ─────────────────────────────────────────────────────────────────────────────

function getSheetRows(wb: XLSX.WorkBook, sheetName: string, headerRow = 1): Record<string, unknown>[] {
  const resolved = resolveSheetName(wb, sheetName);
  if (!resolved) return [];
  const ws = wb.Sheets[resolved];
  if (!ws) return [];

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
  const headers = (raw[headerRow - 1] ?? []) as string[];
  const rows: Record<string, unknown>[] = [];

  for (let i = headerRow; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.every(v => v === null || v === undefined || v === '')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { if (h) obj[h] = row[idx]; });
    rows.push(obj);
  }
  return rows;
}

// Deterministic slug ID
function slug(s: string, maxLen = 20): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, maxLen) || 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE IMPORT
// ─────────────────────────────────────────────────────────────────────────────

export function parseXlsx(buffer: ArrayBuffer): AppData {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const teamMembers: TeamMember[] = getSheetRows(wb, 'Team', 2)
    .filter(r => pickStr(r, COL.TEAM.fullName))
    .map((r, i) => ({
      id:        `TEAM${String(i + 1).padStart(3, '0')}`,
      fullName:  pickStr(r, COL.TEAM.fullName),
      lastName:  pickStr(r, COL.TEAM.lastName),
      role:      pickStr(r, COL.TEAM.role),
      colorHex:  pickStr(r, COL.TEAM.colorHex) || '#C8511A',
      email:     pickStr(r, COL.TEAM.email),
      phone:     pickStr(r, COL.TEAM.phone),
      startDate: pickDate(r, COL.TEAM.startDate),
      notes:     pickStr(r, COL.TEAM.notes),
      isActive:  true,
    }));

  const tasks: Task[] = getSheetRows(wb, 'Tracker Operativo', 1)
    .filter(r => pickStr(r, COL.TASK.title) || pickStr(r, COL.TASK.clientName))
    .map((r, i) => {
      const status = pickStr(r, COL.TASK.status) || 'Da fare';
      return {
        id:          pickStr(r, COL.TASK.id) || `TASK${String(i + 1).padStart(3, '0')}`,
        clientName:  pickStr(r, COL.TASK.clientName),
        projectName: pickStr(r, COL.TASK.projectName),
        title:       pickStr(r, COL.TASK.title),
        startDate:   pickDate(r, COL.TASK.startDate),
        dueDate:     pickDate(r, COL.TASK.dueDate),
        priority:    pickStr(r, COL.TASK.priority) || 'Media',
        status,
        responsible: pickStr(r, COL.TASK.responsible),
        notes:       pickStr(r, COL.TASK.notes),
        isCompleted: status.toLowerCase() === 'completata',
        driveLink:   pickStr(r, COL.TASK.driveLink) || undefined,
      };
    });

  const clients: Client[] = getSheetRows(wb, 'Anagrafica Clienti', 3)
    .filter(r => { const n = pickStr(r, COL.CLIENT.name); return n && n !== 'Nome Cliente'; })
    .map(r => {
      const name = pickStr(r, COL.CLIENT.name);
      return {
        id:             pickStr(r, COL.CLIENT.id) || `CLI_${slug(name)}`,
        name,
        sector:         pickStr(r, COL.CLIENT.sector),
        website:        pickStr(r, COL.CLIENT.website),
        address:        pickStr(r, COL.CLIENT.address),
        city:           pickStr(r, COL.CLIENT.city),
        cap:            pickStr(r, COL.CLIENT.cap),
        country:        pickStr(r, COL.CLIENT.country),
        contactName:    pickStr(r, COL.CLIENT.contactName),
        contactRole:    pickStr(r, COL.CLIENT.contactRole),
        email:          pickStr(r, COL.CLIENT.email),
        phone:          pickStr(r, COL.CLIENT.phone),
        socialChannels: pickStr(r, COL.CLIENT.socialChannels),
        startDate:      pickDate(r, COL.CLIENT.startDate),
        responsible:    pickStr(r, COL.CLIENT.responsible),
        notes:          pickStr(r, COL.CLIENT.notes),
        status:         (pickStr(r, COL.CLIENT.status) as Client['status']) || 'Attivo',
        statusDate:     pickDate(r, COL.CLIENT.statusDate),
        driveLink:      pickStr(r, COL.CLIENT.driveLink),
      };
    });

  const leads: Lead[] = getSheetRows(wb, 'Database Lead', 2)
    .filter(r => { const n = pickStr(r, COL.LEAD.companyName); return n && n !== 'Nome / Azienda' && n !== 'Azienda'; })
    .map((r, i) => ({
      id:            `LEAD${String(i + 1).padStart(3, '0')}`,
      source:        pickStr(r, COL.LEAD.source),
      companyName:   pickStr(r, COL.LEAD.companyName),
      feedback:      pickStr(r, COL.LEAD.feedback),
      interest:      pickStr(r, COL.LEAD.interest),
      quoteSent:     pickBool(r, COL.LEAD.quoteSent),
      email:         pickStr(r, COL.LEAD.email),
      phone:         pickStr(r, COL.LEAD.phone),
      target:        pickStr(r, COL.LEAD.target),
      serviceType:   pickStr(r, COL.LEAD.serviceType),
      notes:         pickStr(r, COL.LEAD.notes),
      statusContact: pickStr(r, COL.LEAD.statusContact),
      statusDate:    pickDate(r, COL.LEAD.statusDate),
      driveLink:     pickStr(r, COL.LEAD.driveLink),
      responsible:   pickStr(r, COL.LEAD.responsible),
    }));

  const deals: Deal[] = getSheetRows(wb, 'Dettaglio Commesse 2026', 2)
    .filter(r => { const n = pickStr(r, COL.DEAL.companyName); return n && n !== 'Cliente'; })
    .map((r, i) => ({
      id:             `DEAL${String(i + 1).padStart(3, '0')}`,
      source:         pickStr(r, COL.DEAL.source),
      projectLeader:  pickStr(r, COL.DEAL.projectLeader),
      companyName:    pickStr(r, COL.DEAL.companyName),
      jobType:        pickStr(r, COL.DEAL.jobType),
      status:         pickStr(r, COL.DEAL.status),
      margin:         pickStr(r, COL.DEAL.margin),
      contactPerson:  pickStr(r, COL.DEAL.contactPerson),
      statusContact:  pickStr(r, COL.DEAL.statusContact),
      statusDate:     pickDate(r, COL.DEAL.statusDate),
      budgetOre:      pickNum(r, COL.DEAL.budgetOre),
      budgetEuro:     pickNum(r, COL.DEAL.budgetEuro),
      alertThreshold: pickNum(r, COL.DEAL.alertThreshold) ?? 80,
      driveLink:      pickStr(r, COL.DEAL.driveLink),
    }));

  const noGo: NoGo[] = getSheetRows(wb, 'No Go', 2)
    .filter(r => { const n = pickStr(r, COL.NOGO.companyName); return n && n !== 'Cliente'; })
    .map((r, i) => ({
      id:            `NOGO${String(i + 1).padStart(3, '0')}`,
      source:        pickStr(r, COL.NOGO.source),
      companyName:   pickStr(r, COL.NOGO.companyName),
      jobType:       pickStr(r, COL.NOGO.jobType),
      status:        pickStr(r, COL.NOGO.status),
      contactPerson: pickStr(r, COL.NOGO.contactPerson),
    }));

  const hotelContacts: HotelContact[] = getSheetRows(wb, 'Rubrica Hotel', 2)
    .filter(r => { const n = pickStr(r, COL.HOTEL.propertyName); return n && n !== 'Struttura'; })
    .map((r, i) => ({
      id:           `HOT${String(i + 1).padStart(3, '0')}`,
      propertyName: pickStr(r, COL.HOTEL.propertyName),
      category:     pickStr(r, COL.HOTEL.category),
      city:         pickStr(r, COL.HOTEL.city),
      contactName:  pickStr(r, COL.HOTEL.contactName),
      role:         pickStr(r, COL.HOTEL.role),
      email:        pickStr(r, COL.HOTEL.email),
      phone:        pickStr(r, COL.HOTEL.phone),
      contactDate:  pickDate(r, COL.HOTEL.contactDate),
      feedback:     pickStr(r, COL.HOTEL.feedback),
      notes:        pickStr(r, COL.HOTEL.notes),
    }));

  const archivedProjects: ArchivedProject[] = getSheetRows(wb, 'Archivio Progetti', 2)
    .filter(r => { const n = pickStr(r, COL.ARCHIVE.clientName); return n && n !== 'Nome Cliente'; })
    .map((r, i) => ({
      id:             `ARCH${String(i + 1).padStart(3, '0')}`,
      clientId:       pickStr(r, COL.ARCHIVE.clientId),
      clientName:     pickStr(r, COL.ARCHIVE.clientName),
      sector:         pickStr(r, COL.ARCHIVE.sector),
      startDate:      pickDate(r, COL.ARCHIVE.startDate),
      endDate:        pickDate(r, COL.ARCHIVE.endDate),
      closureReason:  pickStr(r, COL.ARCHIVE.closureReason),
      totalRevenue:   pickStr(r, COL.ARCHIVE.totalRevenue),
      responsible:    pickStr(r, COL.ARCHIVE.responsible),
      notes:          pickStr(r, COL.ARCHIVE.notes),
      reactivatable:  pickStr(r, COL.ARCHIVE.reactivatable),
    }));

  const suppliers: Supplier[] = getSheetRows(wb, 'Fornitori', 1)
    .filter(r => { const n = pickStr(r, COL.SUPPLIER.name); return n && n !== 'Nome'; })
    .map((r, i) => ({
      id:                 pickStr(r, COL.SUPPLIER.id) || `SUP${String(i + 1).padStart(3, '0')}`,
      name:               pickStr(r, COL.SUPPLIER.name),
      category:           (pickStr(r, COL.SUPPLIER.category) || 'Altro') as Supplier['category'],
      contactName:        pickStr(r, COL.SUPPLIER.contactName),
      email:              pickStr(r, COL.SUPPLIER.email),
      phone:              pickStr(r, COL.SUPPLIER.phone),
      website:            pickStr(r, COL.SUPPLIER.website),
      serviceDescription: pickStr(r, COL.SUPPLIER.serviceDescription),
      rate:               pickStr(r, COL.SUPPLIER.rate),
      projects:           pickStr(r, COL.SUPPLIER.projects),
      rating:             pickNum(r, COL.SUPPLIER.rating) !== undefined ? Math.round(pickNum(r, COL.SUPPLIER.rating)!) : undefined,
      notes:              pickStr(r, COL.SUPPLIER.notes),
      status:             (pickStr(r, COL.SUPPLIER.status) || 'Attivo') as Supplier['status'],
      lastContact:        pickDate(r, COL.SUPPLIER.lastContact),
    }));

  const pipeline: PipelineDeal[] = getSheetRows(wb, 'Pipeline', 1)
    .filter(r => { const n = pickStr(r, COL.PIPELINE.companyName); return n && n !== 'Azienda'; })
    .map((r, i) => ({
      id:          pickStr(r, COL.PIPELINE.id) || `PIPE${String(i + 1).padStart(3, '0')}`,
      companyName: pickStr(r, COL.PIPELINE.companyName),
      contactName: pickStr(r, COL.PIPELINE.contactName),
      email:       pickStr(r, COL.PIPELINE.email),
      phone:       pickStr(r, COL.PIPELINE.phone),
      source:      pickStr(r, COL.PIPELINE.source),
      serviceType: pickStr(r, COL.PIPELINE.serviceType),
      value:       pickNum(r, COL.PIPELINE.value),
      probability: pickNum(r, COL.PIPELINE.probability),
      stage:       (pickStr(r, COL.PIPELINE.stage) || 'Nuovo') as PipelineDeal['stage'],
      responsible: pickStr(r, COL.PIPELINE.responsible),
      notes:       pickStr(r, COL.PIPELINE.notes),
      driveLink:   pickStr(r, COL.PIPELINE.driveLink),
      createdAt:   pickDate(r, COL.PIPELINE.createdAt) || localDateISO(),
      updatedAt:   pickDate(r, COL.PIPELINE.updatedAt),
      closedAt:    pickDate(r, COL.PIPELINE.closedAt),
    }));

  const timeLogs: TimeLog[] = getSheetRows(wb, 'Time Tracking', 1)
    .filter(r => { const n = pickStr(r, COL.TIMELOG.member); return n && n !== 'Membro'; })
    .map((r, i) => ({
      id:          pickStr(r, COL.TIMELOG.id) || `TIME${String(i + 1).padStart(4, '0')}`,
      date:        pickDate(r, COL.TIMELOG.date) || localDateISO(),
      member:      pickStr(r, COL.TIMELOG.member),
      clientName:  pickStr(r, COL.TIMELOG.clientName),
      projectName: pickStr(r, COL.TIMELOG.projectName),
      taskTitle:   pickStr(r, COL.TIMELOG.taskTitle),
      hours:       pickNum(r, COL.TIMELOG.hours) ?? 0,
      billable:    pickBool(r, COL.TIMELOG.billable),
      notes:       pickStr(r, COL.TIMELOG.notes),
    }));

  // TEMPLATE DI PROGETTO
  const templateRows = getSheetRows(wb, 'Template Progetto', 1).filter(r => r['Nome Template']);
  const templateMap = new Map<string, ProjectTemplate>();
  templateRows.forEach((r, i) => {
    const tid = str(r['ID Template']) || `TPL${String(i + 1).padStart(3, '0')}`;
    if (!templateMap.has(tid)) {
      templateMap.set(tid, {
        id: tid, name: str(r['Nome Template']), description: str(r['Descrizione']),
        serviceType: str(r['Tipo Servizio']), tasks: [], createdAt: localDateISO(),
      });
    }
    if (str(r['Task Title'])) {
      const tpl = templateMap.get(tid)!;
      tpl.tasks.push({
        id: `${tid}_T${tpl.tasks.length + 1}`,
        title: str(r['Task Title']),
        priority: str(r['Priorità']) || 'Media',
        dueDaysOffset: r['Giorni Offset'] ? parseInt(str(r['Giorni Offset'])) : 0,
        responsible: str(r['Ruolo']),
        notes: str(r['Note Task']),
      });
    }
  });
  const templates: ProjectTemplate[] = Array.from(templateMap.values());

  // PREVENTIVI
  const quoteRows = getSheetRows(wb, 'Preventivi', 1).filter(r => r['ID Preventivo']);
  const quoteMap = new Map<string, Quote>();
  quoteRows.forEach(r => {
    const qid = str(r['ID Preventivo']);
    if (!quoteMap.has(qid)) {
      quoteMap.set(qid, {
        id: qid, quoteNumber: str(r['Numero']) || qid,
        companyName: str(r['Cliente']), contactName: str(r['Contatto']), email: str(r['Email']),
        leadId: str(r['ID Lead']), pipelineId: str(r['ID Pipeline']),
        status: (str(r['Stato']) || 'Bozza') as Quote['status'],
        issueDate: parseDate(r['Data Emissione']) || localDateISO(),
        expiryDate: parseDate(r['Data Scadenza']),
        projectLeader: str(r['Project Leader']), serviceType: str(r['Tipo Servizio']),
        discountPct: num(r['Sconto %']),
        notes: str(r['Note']), internalNotes: str(r['Note Interne']),
        convertedToDealId: str(r['ID Commessa']),
        items: [], subtotal: 0, total: 0,
      });
    }
    const q = quoteMap.get(qid)!;
    if (str(r['Descrizione Voce'])) {
      const qty = num(r['Quantità']) ?? 1;
      const price = num(r['Prezzo Unitario']) ?? 0;
      q.items.push({ id: `${qid}_I${q.items.length + 1}`, description: str(r['Descrizione Voce']), quantity: qty, unitPrice: price, total: qty * price });
    }
  });
  const quotes: Quote[] = Array.from(quoteMap.values()).map(q => {
    const subtotal = q.items.reduce((s, i) => s + i.total, 0);
    const discAmt = q.discountPct ? subtotal * (q.discountPct / 100) : (q.discountAmt ?? 0);
    return { ...q, subtotal, discountAmt: discAmt, total: subtotal - discAmt };
  });

  return { tasks, clients, leads, deals, noGo, hotelContacts, teamMembers, archivedProjects, suppliers, pipeline, timeLogs, templates, quotes, editorialContent: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT (client-side)
// ─────────────────────────────────────────────────────────────────────────────

export function exportToXlsx(data: AppData): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID Task','Cliente','Progetto','Task','Data Inizio','Deadline','Priorità','Stato','Responsabile','Note','Drive Link'],
    ...data.tasks.map(t => [t.id,t.clientName,t.projectName,t.title,t.startDate,t.dueDate,t.priority,t.status,t.responsible,t.notes,t.driveLink||'']),
  ]), 'Tracker Operativo');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Anagrafica Clienti'],[],
    ['ID Cliente','Nome Cliente','Settore','Sito Web','Indirizzo','Città','CAP','Paese','Contatto Principale','Ruolo Contatto','Email','Telefono','Canali Social','Data Inizio Collab.','Responsabile','Note','Stato Contatto','Data Stato','Drive Link'],
    ...data.clients.map(c => [c.id,c.name,c.sector,c.website,c.address,c.city,c.cap,c.country,c.contactName,c.contactRole,c.email,c.phone,c.socialChannels,c.startDate,c.responsible,c.notes,c.status,c.statusDate,c.driveLink]),
  ]), 'Anagrafica Clienti');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Database Lead'],
    ['Fonte','Nome / Azienda','Feedback','Interesse','Preventivo','Email','Telefono','Target','Tipologia / Servizio','Note','Stato Contatto','Data Stato','Responsabile','Drive Link'],
    ...data.leads.map(l => [l.source,l.companyName,l.feedback,l.interest,l.quoteSent?'Si':'No',l.email,l.phone,l.target,l.serviceType,l.notes,l.statusContact,l.statusDate,(l as {responsible?:string}).responsible,l.driveLink]),
  ]), 'Database Lead');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Dettaglio Commesse 2026'],
    ['Fonte','Project Leader','Cliente','Lavoro','Status','Margine','Referente','Stato Contatto','Data Stato','Budget Ore','Budget Euro','Soglia Alert %','Drive Link'],
    ...data.deals.map(d => [d.source,d.projectLeader,d.companyName,d.jobType,d.status,d.margin,d.contactPerson,d.statusContact,d.statusDate,d.budgetOre,d.budgetEuro,d.alertThreshold??80,d.driveLink]),
  ]), 'Dettaglio Commesse 2026');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['No Go'],
    ['Fonte','Cliente','Lavoro','Status','Referente'],
    ...data.noGo.map(n => [n.source,n.companyName,n.jobType,n.status,n.contactPerson]),
  ]), 'No Go');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Rubrica Hotel'],
    ['Struttura','Categoria','Città','Referente','Ruolo','Email','Telefono','Data contatto','Feedback','Note'],
    ...data.hotelContacts.map(h => [h.propertyName,h.category,h.city,h.contactName,h.role,h.email,h.phone,h.contactDate,h.feedback,h.notes]),
  ]), 'Rubrica Hotel');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Team'],
    ['Nome','Cognome','Ruolo','Colore HEX','Email','Cellulare','Data Inizio','Note'],
    ...data.teamMembers.map(t => [t.fullName,t.lastName,t.role,t.colorHex,t.email,t.phone,t.startDate,t.notes]),
  ]), 'Team');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Archivio Progetti'],
    ['ID Cliente','Nome Cliente','Settore','Data Inizio','Data Fine','Motivo Chiusura','Fatturato Totale','Responsabile','Note / Storia','Riattivabile?'],
    ...data.archivedProjects.map(a => [a.clientId,a.clientName,a.sector,a.startDate,a.endDate,a.closureReason,a.totalRevenue,a.responsible,a.notes,a.reactivatable]),
  ]), 'Archivio Progetti');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID','Nome','Categoria','Contatto','Email','Telefono','Sito Web','Servizio','Tariffa','Progetti','Valutazione','Ultimo Contatto','Stato','Note'],
    ...data.suppliers.map(s => [s.id,s.name,s.category,s.contactName,s.email,s.phone,s.website,s.serviceDescription,s.rate,s.projects,s.rating,s.lastContact,s.status,s.notes]),
  ]), 'Fornitori');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID','Azienda','Contatto','Email','Telefono','Fonte','Servizio','Valore €','Probabilità %','Fase','Responsabile','Data Creazione','Data Aggiornamento','Data Chiusura','Drive Link','Note'],
    ...data.pipeline.map(p => [p.id,p.companyName,p.contactName,p.email,p.phone,p.source,p.serviceType,p.value,p.probability,p.stage,p.responsible,p.createdAt,p.updatedAt,p.closedAt,p.driveLink,p.notes]),
  ]), 'Pipeline');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID','Data','Membro','Cliente','Progetto','Task','Ore','Billable','Note'],
    ...data.timeLogs.map(t => [t.id,t.date,t.member,t.clientName,t.projectName,t.taskTitle,t.hours,t.billable?'Si':'No',t.notes]),
  ]), 'Time Tracking');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID Template','Nome Template','Descrizione','Tipo Servizio','Task Title','Priorità','Giorni Offset','Ruolo','Note Task'],
    ...(data.templates??[]).flatMap(tpl =>
      tpl.tasks.length > 0
        ? tpl.tasks.map((t,i) => [i===0?tpl.id:'',i===0?tpl.name:'',i===0?tpl.description:'',i===0?tpl.serviceType:'',t.title,t.priority,t.dueDaysOffset,t.responsible,t.notes])
        : [[tpl.id,tpl.name,tpl.description,tpl.serviceType,'','','','','']]
    ),
  ]), 'Template Progetto');

  const qRows: unknown[][] = [['ID Preventivo','Numero','Cliente','Contatto','Email','ID Lead','ID Pipeline','Stato','Data Emissione','Data Scadenza','Project Leader','Tipo Servizio','Sconto %','Note','Note Interne','ID Commessa','Descrizione Voce','Quantità','Prezzo Unitario']];
  (data.quotes??[]).forEach(q => {
    if (q.items.length === 0) {
      qRows.push([q.id,q.quoteNumber,q.companyName,q.contactName,q.email,q.leadId,q.pipelineId,q.status,q.issueDate,q.expiryDate,q.projectLeader,q.serviceType,q.discountPct,q.notes,q.internalNotes,q.convertedToDealId,'','','']);
    } else {
      q.items.forEach((item,i) => qRows.push([i===0?q.id:'',i===0?q.quoteNumber:'',i===0?q.companyName:'',i===0?q.contactName:'',i===0?q.email:'',i===0?q.leadId:'',i===0?q.pipelineId:'',i===0?q.status:'',i===0?q.issueDate:'',i===0?q.expiryDate:'',i===0?q.projectLeader:'',i===0?q.serviceType:'',i===0?q.discountPct:'',i===0?q.notes:'',i===0?q.internalNotes:'',i===0?q.convertedToDealId:'',item.description,item.quantity,item.unitPrice]));
    }
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qRows), 'Preventivi');

  // ── Categorie Corsi ──────────────────────────────────────────────────────
  if ((data as {courseCategories?: unknown[]}).courseCategories?.length) {
    const cats = (data as {courseCategories: {id:string;name:string;emoji?:string;color:string;description?:string;order:number;createdAt:string}[]}).courseCategories;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['ID','Nome','Emoji','Colore','Descrizione','Ordine','Creata il'],
      ...cats.map(c => [c.id, c.name, c.emoji??'', c.color, c.description??'', c.order, c.createdAt]),
    ]), 'Categorie Corsi');
  }

  // ── Corsi ────────────────────────────────────────────────────────────────
  if ((data as {courses?: unknown[]}).courses?.length) {
    const courses = (data as {courses: {
      id:string; title:string; subtitle?:string; platform:string; category?:string;
      status:string; instructor:string; coInstructors?:string[]; location?:string;
      startDate?:string; endDate?:string; maxParticipants?:number; price?:number;
      driveLink?:string; description?:string; notes?:string; createdAt:string;
      modules:{id:string;order:number;title:string;description?:string;duration?:number;status:string;driveLink?:string;videoLink?:string;deliveredAt?:string;notes?:string}[];
      participants:{id:string;name:string;email?:string;company?:string;role?:string;enrolledAt:string;status:string;completedModules:string[];certificateIssued?:boolean;certificateDate?:string;notes?:string}[];
    }[]}).courses;

    // Sheet corsi
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['ID Corso','Titolo','Sottotitolo','Piattaforma','Categoria','Stato','Docente','Co-docenti','Location','Data Inizio','Data Fine','Max Partecipanti','Prezzo €','Drive Link','Descrizione','Note','Creato il'],
      ...courses.map(c => [
        c.id, c.title, c.subtitle??'', c.platform, c.category??'', c.status,
        c.instructor, (c.coInstructors??[]).join(', '), c.location??'',
        c.startDate??'', c.endDate??'', c.maxParticipants??'', c.price??'',
        c.driveLink??'', c.description??'', c.notes??'', c.createdAt,
      ]),
    ]), 'Corsi');

    // Sheet moduli (flat — tutti i moduli di tutti i corsi)
    const modRows: unknown[][] = [['ID Corso','Titolo Corso','Ordine','Titolo Modulo','Descrizione','Durata (min)','Stato','Drive Materiali','Video Link','Data Erogazione','Note']];
    courses.forEach(c => {
      (c.modules ?? []).sort((a,b)=>a.order-b.order).forEach(m => {
        modRows.push([c.id, c.title, m.order, m.title, m.description??'', m.duration??'', m.status, m.driveLink??'', m.videoLink??'', m.deliveredAt??'', m.notes??'']);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(modRows), 'Moduli Corsi');

    // Sheet partecipanti (flat)
    const partRows: unknown[][] = [['ID Corso','Titolo Corso','ID Partecipante','Nome','Email','Azienda','Ruolo','Iscritto il','Stato','Moduli Completati','Certificato','Data Certificato','Note']];
    courses.forEach(c => {
      (c.participants ?? []).forEach(p => {
        partRows.push([
          c.id, c.title, p.id, p.name, p.email??'', p.company??'', p.role??'',
          p.enrolledAt, p.status, p.completedModules.length + '/' + c.modules.length,
          p.certificateIssued ? 'Sì' : 'No', p.certificateDate??'', p.notes??'',
        ]);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(partRows), 'Partecipanti Corsi');
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
