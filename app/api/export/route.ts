import { localDateISO, addDaysISO } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import type { AppData } from '@/lib/types';

const BRAND  = 'FF1A1A1A';
const ACCENT = 'FFF26522';
const WHITE  = 'FFFFFFFF';
const LIGHT  = 'FFF5F5F5';
const BORDER = 'FFDDDDDD';

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border    = { bottom: { style: 'thin', color: { argb: ACCENT } } };
  });
  row.height = 22;
}

function styleData(row: ExcelJS.Row, idx: number) {
  const bg = idx % 2 === 0 ? LIGHT : WHITE;
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font      = { name: 'Arial', size: 9, color: { argb: 'FF1A1A1A' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { vertical: 'middle', wrapText: false };
    cell.border    = { bottom: { style: 'hair', color: { argb: BORDER } } };
  });
  row.height = 18;
}

type CellVal = string | number | boolean | null | undefined;

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: CellVal[][],
  colWidths?: number[],
  prependRows?: (string | null)[][]  // righe prima degli header (es. titolo, riga vuota)
) {
  const headerRowIndex = (prependRows?.length ?? 0) + 1;
  const ws = wb.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: headerRowIndex }],
  });

  // Righe di intestazione precedenti (titolo sheet, righe vuote)
  if (prependRows) {
    prependRows.forEach(pr => {
      const row = ws.addRow(pr.map(v => v ?? ''));
      row.eachCell(cell => {
        cell.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FFF26522' } };
      });
      row.height = 20;
    });
  }

  ws.columns = headers.map((h, i) => ({
    key: h,
    width: colWidths?.[i] ?? Math.max(h.length + 4, 14),
  }));

  const hRow = ws.addRow(headers);
  styleHeader(hRow);
  rows.forEach((r, i) => styleData(ws.addRow(r.map(v => v ?? '')), i));

  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: headers.length }
  };
  return ws;
}

const TAB: Record<string, string> = {
  'Tracker Operativo':  'FFF26522',
  'Anagrafica Clienti': 'FF3b9eff',
  'Database Lead':      'FF2ecc71',
  'Dettaglio Commesse': 'FFf5c518',
  'Pipeline':           'FF9b59b6',
  'Preventivi':         'FFe74c3c',
  'Time Tracking':      'FF1abc9c',
  'Team':               'FFFF7A35',
  'Fornitori':          'FF95a5a6',
  'No Go':              'FFe74c3c',
  'Archivio Progetti':  'FF7f8c8d',
  'Rubrica Hotel':      'FF2980b9',
};

export async function POST(req: NextRequest) {
  const data = await req.json() as AppData;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MOD Group PMO';
  wb.created = new Date();

  addSheet(wb, 'Tracker Operativo',
    ['ID Task','Cliente','Progetto','Task','Data Inizio','Deadline','Priorità','Stato','Responsabile','Note','Drive Link'],
    data.tasks.map(t => [t.id,t.clientName,t.projectName,t.title,t.startDate,t.dueDate,t.priority,t.status,t.responsible,t.notes,t.driveLink]),
    [12,18,18,36,12,12,10,12,18,28,30]);

  addSheet(wb, 'Anagrafica Clienti',
    ['ID Cliente','Nome Cliente','Settore','Città','Contatto','Ruolo','Email','Telefono','Data Inizio','Responsabile','Stato','Drive Link','Note'],
    data.clients.map(c => [c.id,c.name,c.sector,c.city,c.contactName,c.contactRole,c.email,c.phone,c.startDate,c.responsible,c.status,c.driveLink,c.notes]),
    [12,22,18,14,20,18,26,14,12,18,12,30,30],
    [['Anagrafica Clienti'], [null]]);

  addSheet(wb, 'Database Lead',
    ['Fonte','Nome / Azienda','Tipologia / Servizio','Interesse','Preventivo','Email','Telefono','Stato Contatto','Data Stato','Responsabile','Drive Link','Note'],
    data.leads.map(l => [l.source,l.companyName,l.serviceType,l.interest,l.quoteSent?'Sì':'No',l.email,l.phone,l.statusContact,l.statusDate,(l as {responsible?:string}).responsible,l.driveLink,l.notes]),
    [14,22,20,10,10,26,14,16,12,18,30,28],
    [['Database Lead']]);

  addSheet(wb, 'Dettaglio Commesse 2026',
    ['Fonte','Project Leader','Cliente','Lavoro','Status','Margine','Referente','Stato Contatto','Data Stato','Budget Ore','Budget Euro','Soglia Alert %','Drive Link'],
    data.deals.map(d => [d.source,d.projectLeader,d.companyName,d.jobType,d.status,d.margin,d.contactPerson,d.statusContact,d.statusDate,d.budgetOre,d.budgetEuro,d.alertThreshold??80,d.driveLink]),
    [14,18,22,20,14,12,18,16,12,10,10,12,30],
    [['Dettaglio Commesse 2026']]);

  addSheet(wb, 'Pipeline',
    ['Azienda','Contatto','Email','Fonte','Servizio','Valore €','Probabilità %','Fase','Responsabile','Data Creazione','Data Chiusura','Note','Drive Link'],
    data.pipeline.map(p => [p.companyName,p.contactName,p.email,p.source,p.serviceType,p.value,p.probability,p.stage,p.responsible,p.createdAt,p.closedAt,p.notes,p.driveLink]),
    [22,18,26,14,20,12,12,18,18,12,12,28,30]);

  // Preventivi (flat)
  const qRows: CellVal[][] = [];
  (data.quotes??[]).forEach(q => {
    if (!q.items?.length) {
      qRows.push([q.quoteNumber,q.companyName,q.contactName,q.status,q.issueDate,q.expiryDate,q.projectLeader,q.serviceType,q.total,'','','']);
    } else {
      q.items.forEach((item,i) => qRows.push([
        i===0?q.quoteNumber:'', i===0?q.companyName:'', i===0?q.contactName:'',
        i===0?q.status:'', i===0?q.issueDate:'', i===0?q.expiryDate:'',
        i===0?q.projectLeader:'', i===0?q.serviceType:'', i===0?q.total:'',
        item.description, item.quantity, item.unitPrice,
      ]));
    }
  });
  addSheet(wb, 'Preventivi',
    ['Numero','Cliente','Contatto','Stato','Data Emissione','Scadenza','Project Leader','Servizio','Totale €','Voce','Qtà','Prezzo Unitario'],
    qRows, [16,22,18,12,13,13,18,20,12,28,6,14]);

  addSheet(wb, 'Time Tracking',
    ['Data','Membro','Cliente','Progetto','Task','Ore','Billable','Note'],
    data.timeLogs.map(t => [t.date,t.member,t.clientName,t.projectName,t.taskTitle,t.hours,t.billable?'Sì':'No',t.notes]),
    [12,18,20,20,28,8,9,28]);

  addSheet(wb, 'Team',
    ['Nome','Cognome','Ruolo','Email','Cellulare','Data Inizio','Note'],
    data.teamMembers.map(t => [t.fullName,t.lastName,t.role,t.email,t.phone,t.startDate,t.notes]),
    [16,16,20,26,14,12,28],
    [['Team']]);

  addSheet(wb, 'Fornitori',
    ['Nome','Categoria','Contatto','Email','Telefono','Sito Web','Servizio','Tariffa','Valutazione','Ultimo Contatto','Stato','Note'],
    data.suppliers.map(s => [s.name,s.category,s.contactName,s.email,s.phone,s.website,s.serviceDescription,s.rate,s.rating,s.lastContact,s.status,s.notes]),
    [22,16,18,26,14,24,28,14,10,12,10,28]);

  addSheet(wb, 'No Go',
    ['Fonte','Cliente','Lavoro','Status','Referente'],
    data.noGo.map(n => [n.source,n.companyName,n.jobType,n.status,n.contactPerson]),
    [14,22,20,20,18],
    [['No Go']]);

  addSheet(wb, 'Archivio Progetti',
    ['ID Cliente','Nome Cliente','Settore','Data Inizio','Data Fine','Motivo Chiusura','Fatturato Totale','Responsabile','Note / Storia','Riattivabile?'],
    data.archivedProjects.map(a => [a.clientId,a.clientName,a.sector,a.startDate,a.endDate,a.closureReason,a.totalRevenue,a.responsible,a.notes,a.reactivatable]),
    [12,22,16,12,12,24,14,18,28,11],
    [['Archivio Progetti']]);

  addSheet(wb, 'Rubrica Hotel',
    ['Struttura','Categoria','Città','Referente','Ruolo','Email','Telefono','Data contatto','Feedback','Note'],
    data.hotelContacts.map(h => [h.propertyName,h.category,h.city,h.contactName,h.role,h.email,h.phone,h.contactDate,h.feedback,h.notes]),
    [24,14,14,18,18,26,14,12,14,28],
    [['Rubrica Hotel']]);

  // ── Corsi (se presenti) ──────────────────────────────────────────────────
  const anyData = data as unknown as Record<string, unknown>;
  if (Array.isArray(anyData.courseCategories) && anyData.courseCategories.length > 0) {
    const cats = anyData.courseCategories as {id:string;name:string;emoji?:string;color:string;description?:string;order:number;createdAt:string}[];
    addSheet(wb, 'Categorie Corsi',
      ['ID','Nome','Emoji','Colore','Descrizione','Ordine','Creata il'],
      cats.map(c => [c.id, c.name, c.emoji??'', c.color, c.description??'', c.order, c.createdAt]),
      [18,24,8,10,30,8,12],
      [['Categorie Corsi']]);
  }

  if (Array.isArray(anyData.courses) && anyData.courses.length > 0) {
    const courses = anyData.courses as {
      id:string; title:string; subtitle?:string; platform:string; category?:string;
      status:string; instructor:string; coInstructors?:string[]; location?:string;
      startDate?:string; endDate?:string; maxParticipants?:number; price?:number;
      driveLink?:string; description?:string; notes?:string; createdAt:string;
      modules:{id:string;order:number;title:string;description?:string;duration?:number;status:string;driveLink?:string;videoLink?:string;deliveredAt?:string}[];
      participants:{id:string;name:string;email?:string;company?:string;role?:string;enrolledAt:string;status:string;completedModules:string[];certificateIssued?:boolean;certificateDate?:string}[];
    }[];

    addSheet(wb, 'Corsi',
      ['ID','Titolo','Sottotitolo','Piattaforma','Categoria','Stato','Docente','Co-docenti','Location','Data Inizio','Data Fine','Max Part.','Prezzo €','Drive','Creato il'],
      courses.map(c => [c.id,c.title,c.subtitle??'',c.platform,c.category??'',c.status,c.instructor,(c.coInstructors??[]).join(', '),c.location??'',c.startDate??'',c.endDate??'',c.maxParticipants??'',c.price??'',c.driveLink??'',c.createdAt]),
      [16,30,20,12,18,12,18,18,14,12,12,10,10,28,12],
      [['Corsi Remodel']]);

    const modRows = courses.flatMap(c =>
      (c.modules??[]).sort((a,b)=>a.order-b.order).map(m =>
        [c.id, c.title, m.order, m.title, m.description??'', m.duration??'', m.status, m.driveLink??'', m.videoLink??'', m.deliveredAt??'']
      )
    );
    if (modRows.length > 0) {
      addSheet(wb, 'Moduli Corsi',
        ['ID Corso','Titolo Corso','Ordine','Titolo Modulo','Descrizione','Durata (min)','Stato','Drive','Video','Erogato il'],
        modRows, [16,28,8,30,28,10,16,28,28,12],
        [['Moduli Corsi']]);
    }

    const partRows = courses.flatMap(c =>
      (c.participants??[]).map(p =>
        [c.id, c.title, p.id, p.name, p.email??'', p.company??'', p.role??'', p.enrolledAt, p.status, p.completedModules.length+'/'+c.modules.length, p.certificateIssued?'Sì':'No', p.certificateDate??'']
      )
    );
    if (partRows.length > 0) {
      addSheet(wb, 'Partecipanti Corsi',
        ['ID Corso','Titolo Corso','ID','Nome','Email','Azienda','Ruolo','Iscritto il','Stato','Moduli','Certificato','Data Cert.'],
        partRows, [16,28,16,20,26,22,18,12,12,10,10,12],
        [['Partecipanti Corsi']]);
    }
  }

  // Colori tab
  wb.eachSheet(ws => {
    const c = TAB[ws.name];
    if (c) ws.properties.tabColor = { argb: c };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `PMO_MOD_${localDateISO()}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
