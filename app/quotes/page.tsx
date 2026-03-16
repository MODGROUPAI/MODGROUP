'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';
import { localDateISO, addDaysISO } from '@/lib/utils';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import type { Quote, QuoteLineItem, QuoteStatus } from '@/lib/types';
import { approvalGate } from '@/lib/approvalGate';

const STATUS_STYLE: Record<QuoteStatus, string> = {
  'Bozza':     '[background:var(--surface3)] [color:var(--text-2)]',
  'Inviato':   '[background:rgba(59,158,255,0.15)] [color:#3b9eff]',
  'Accettato': '[background:rgba(46,204,113,0.15)] [color:#2ecc71]',
  'Rifiutato': '[background:rgba(231,76,60,0.15)] [color:#e74c3c]',
  'Scaduto':   '[background:rgba(245,197,24,0.15)] [color:#f5c518]',
};

const SERVICE_TYPES = [
  'Social Media Management','Campagna ADV','Consulenza Strategica',
  'Shooting Foto/Video','Sito Web','Email Marketing','Onboarding Cliente','Altro',
];

function nextQuoteNumber(quotes: Quote[]): string {
  const year = new Date().getFullYear();
  const nums = quotes
    .map(q => parseInt(q.quoteNumber.split('-').pop() ?? '0'))
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `PRV-${year}-${String(next).padStart(3,'0')}`;
}

function calcTotals(items: QuoteLineItem[], discountPct?: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discAmt = discountPct ? subtotal * (discountPct / 100) : 0;
  return { subtotal, discountAmt: discAmt, total: subtotal - discAmt };
}

const EMPTY_ITEM = (): QuoteLineItem => ({
  id: `I${Date.now()}${Math.random().toString(36).slice(2,5)}`,
  description: '', quantity: 1, unitPrice: 0, total: 0,
});

type ModalMode = 'view' | 'edit' | 'new';

function QuotesInner() {
  const { data, update } = useData();
  const searchParams = useSearchParams();
  const quotes = data.quotes ?? [];

  const [filter, setFilter] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | ''>('');
  const [modal, setModal] = useState<{ mode: ModalMode; quote: Quote } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState<Omit<Quote,'id'|'subtotal'|'discountAmt'|'total'> & { items: QuoteLineItem[] }>({
    quoteNumber: '', companyName: '', status: 'Bozza',
    issueDate: localDateISO(),
    items: [EMPTY_ITEM()],
  });

  // Auto-apri modal nuovo se arriva da Lead o Pipeline
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    const company = searchParams.get('company');
    if (company) {
      openNew({
        companyName: company,
        leadId: leadId ?? undefined,
        contactName: searchParams.get('contact') ?? undefined,
        email: searchParams.get('email') ?? undefined,
        serviceType: searchParams.get('service') ?? undefined,
        pipelineId: searchParams.get('pipelineId') ?? undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // ── Genera voci preventivo con AI ─────────────────────────────────────────
  const generateItems = async () => {
    if (!form.serviceType && !form.companyName) return;
    setAiLoading(true);
    try {
      const client = data.clients.find(c => c.name === form.companyName);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts:[{ text:"Sei un account manager di un'agenzia di marketing italiana. Rispondi SOLO con JSON valido, nessun markdown." }] },
          contents: [{ role:'user', parts:[{ text:'Genera le voci di un preventivo per: Cliente: ' + form.companyName + ' Settore: ' + (client?.sector || 'n.d.') + ' Servizio: ' + form.serviceType + ' Project Leader: ' + (form.projectLeader || 'n.d.') + '. Rispondi con JSON: {"items":[{"description":"descrizione voce","quantity":1,"unitPrice":500}],"notes":"note suggerite"}. Includi 3-5 voci specifiche e realistiche. Prezzi in euro per PMI italiana.' }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
      });
      const json = await res.json();
      const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').replace(/\`\`\`json|\`\`\`/g, '').trim();
      const s = text.indexOf('{'); const e = text.lastIndexOf('}');
      const parsed = JSON.parse(text.slice(s, e+1));
      if (parsed.items?.length) {
        const newItems = parsed.items.map((i: {description:string;quantity:number;unitPrice:number}) => ({
          id: 'I' + Date.now() + Math.random().toString(36).slice(2,5),
          description: i.description,
          quantity: i.quantity ?? 1,
          unitPrice: i.unitPrice ?? 0,
          total: (i.quantity ?? 1) * (i.unitPrice ?? 0),
        }));
        setForm(f => ({ ...f, items: newItems, notes: parsed.notes ? (f.notes ? f.notes + '\n' + parsed.notes : parsed.notes) : f.notes }));
      }
    } catch (err) { console.error(err); }
    finally { setAiLoading(false); }
  };

  // ── Duplica preventivo ─────────────────────────────────────────────────────
  const duplicateQuote = (q: Quote) => {
    const num = nextQuoteNumber(quotes);
    const today = localDateISO();
    setForm({
      ...q,
      quoteNumber: num,
      status: 'Bozza',
      issueDate: today,
      expiryDate: addDaysISO(new Date(), 30),
      convertedToDealId: undefined,
    });
    setModal({ mode: 'new', quote: null as unknown as Quote });
  };

  // ── Email di invio copiabile ───────────────────────────────────────────────
  const copyEmailText = (q: Quote) => {
    if (!approvalGate({
      action: 'Copia email preventivo',
      recipient: q.companyName,
      warnings: ['Stai per copiare un preventivo da inviare al cliente'],
    })) return;
    const fmt2 = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    const itemsText = q.items.map(i => '  • ' + i.description + ' (x' + i.quantity + '): €' + fmt2(i.total)).join('\n');
    const discount = q.discountPct ? '  Sconto ' + q.discountPct + '%: -€' + fmt2(q.discountAmt ?? 0) + '\n' : '';
    const expiry = q.expiryDate ? 'Il preventivo è valido fino al ' + q.expiryDate + '.\n\n' : '';
    const text = 'Oggetto: Preventivo ' + q.quoteNumber + ' — ' + q.companyName + '\n\n' +
      'Gentile ' + (q.contactName || 'Cliente') + ',\n\n' +
      'in allegato trova il nostro preventivo ' + q.quoteNumber + ' per il servizio di ' + (q.serviceType || 'consulenza') + '.\n\n' +
      'RIEPILOGO:\n' + itemsText + '\n' + discount +
      '  TOTALE: €' + fmt2(q.total) + '\n\n' +
      expiry +
      'Resto a disposizione per qualsiasi chiarimento.\n\n' +
      'Cordiali saluti,\n' + (q.projectLeader || 'Team MOD') + '\nMOD Group — modgroup.it';
    navigator.clipboard.writeText(text);
  };


  const filtered = useMemo(() => quotes.filter(q => {
    if (filterStatus && q.status !== filterStatus) return false;
    if (!filter.trim()) return true;
    const s = filter.toLowerCase();
    return [q.companyName, q.quoteNumber, q.serviceType, q.projectLeader, q.contactName]
      .some(v => v?.toLowerCase().includes(s));
  }), [quotes, filter, filterStatus]);

  // Stats
  const totalSent    = quotes.filter(q => q.status !== 'Bozza').reduce((s,q) => s + q.total, 0);
  const totalAccepted = quotes.filter(q => q.status === 'Accettato').reduce((s,q) => s + q.total, 0);
  const countPending = quotes.filter(q => q.status === 'Inviato').length;

  const openNew = (prefill?: Partial<Quote>) => {
    const num = nextQuoteNumber(quotes);
    setForm({
      quoteNumber: num,
      companyName: prefill?.companyName ?? '',
      contactName: prefill?.contactName ?? '',
      email: prefill?.email ?? '',
      leadId: prefill?.leadId,
      pipelineId: prefill?.pipelineId,
      status: 'Bozza',
      issueDate: localDateISO(),
      expiryDate: addDaysISO(new Date(), 30),
      projectLeader: '',
      serviceType: prefill?.serviceType ?? 'Social Media Management',
      discountPct: undefined,
      notes: '',
      internalNotes: '',
      items: [EMPTY_ITEM()],
    });
    setModal({ mode: 'new', quote: null as unknown as Quote });
  };

  const openEdit = (q: Quote) => {
    setForm({ ...q, items: q.items.length ? q.items : [EMPTY_ITEM()] });
    setModal({ mode: 'edit', quote: q });
  };

  const openView = (q: Quote) => setModal({ mode: 'view', quote: q });

  const saveQuote = () => {
    const { subtotal, discountAmt, total } = calcTotals(form.items, form.discountPct);
    const items = form.items.map(i => ({ ...i, total: i.quantity * i.unitPrice }));
    if (modal?.mode === 'new') {
      const q: Quote = { id: `PRV${Date.now()}`, ...form, items, subtotal, discountAmt, total };
      update({ quotes: [q, ...quotes] });
    } else if (modal?.quote) {
      const q: Quote = { ...modal.quote, ...form, items, subtotal, discountAmt, total };
      update({ quotes: quotes.map(x => x.id === q.id ? q : x) });
    }
    setModal(null);
  };

  const deleteQuote = (id: string) => {
    if (!confirm('Eliminare questo preventivo?')) return;
    update({ quotes: quotes.filter(q => q.id !== id) });
  };

  const changeStatus = (q: Quote, status: QuoteStatus) => {
    update({ quotes: quotes.map(x => x.id === q.id ? { ...x, status } : x) });
  };

  // Converti in Commessa
  const convertToDeal = (q: Quote) => {
    if (!confirm(`Convertire "${q.quoteNumber}" in commessa?\n\nVerra creato un record in Dettaglio Commesse.`)) return;
    const today = localDateISO();
    const dealId = `DEAL${Date.now()}`;
    const newDeal = {
      id: dealId,
      source: 'Preventivo',
      projectLeader: q.projectLeader ?? '',
      companyName: q.companyName,
      jobType: q.serviceType ?? '',
      status: 'In corso',
      margin: String(q.total),
      contactPerson: q.contactName ?? '',
      statusContact: 'Attivo',
      statusDate: today,
      budgetEuro: q.total,
      alertThreshold: 80,
    };
    update({
      deals: [newDeal, ...data.deals],
      quotes: quotes.map(x => x.id === q.id ? { ...x, status: 'Accettato', convertedToDealId: dealId } : x),
    });
    alert('Commessa creata in Dettaglio Commesse!');
  };

  // Stampa / Export PDF
  const printQuote = (q: Quote) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    const logoUrl = window.location.origin + '/logo_mod.png';
    const fmtLocal = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    printWindow.document.write(`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${q.quoteNumber} — ${q.companyName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 3px solid #C8511A; }
  .logo-block { display: flex; align-items: center; gap: 12px; }
  .logo-block img { width: 44px; height: 44px; border-radius: 8px; }
  .company-name { font-size: 18pt; font-weight: 800; color: #1A1A1A; }
  .company-sub { font-size: 9pt; color: #888; }
  .quote-meta { text-align: right; }
  .quote-number { font-size: 15pt; font-weight: 700; color: #C8511A; font-family: monospace; }
  .quote-label { font-size: 8pt; color: #aaa; text-transform: uppercase; letter-spacing: 0.08em; }
  /* Bill to */
  .bill-section { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
  .bill-block h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; margin-bottom: 6px; }
  .bill-block p { font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  .bill-block .name { font-weight: 700; font-size: 12pt; }
  /* Items table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #1A1A1A; color: #fff; }
  thead th { padding: 9px 12px; text-align: left; font-size: 9pt; font-weight: 600; letter-spacing: 0.04em; }
  thead th.right { text-align: right; }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody td { padding: 9px 12px; font-size: 10.5pt; vertical-align: top; }
  tbody td.right { text-align: right; }
  tbody td.desc { color: #1a1a1a; }
  tbody td.num { color: #555; }
  /* Totals */
  .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-bottom: 28px; }
  .totals .row { display: flex; gap: 40px; font-size: 10.5pt; }
  .totals .row span:last-child { min-width: 110px; text-align: right; }
  .totals .row.label { color: #888; }
  .totals .row.discount { color: #c0392b; }
  .totals .row.grand { font-size: 14pt; font-weight: 800; color: #C8511A; padding-top: 8px; border-top: 2px solid #e0e0e0; margin-top: 4px; }
  /* Notes */
  .notes { background: #fafafa; border-left: 3px solid #C8511A; border-radius: 4px; padding: 12px 16px; margin-bottom: 28px; font-size: 10pt; color: #555; line-height: 1.6; }
  .notes h4 { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin-bottom: 6px; }
  /* Footer */
  .footer { border-top: 1px solid #e0e0e0; padding-top: 14px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #aaa; }
  .valid { font-size: 9pt; color: #888; margin-bottom: 24px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 8.5pt; font-weight: 600; background: ${q.status === 'Accettato' ? '#d1fae5' : q.status === 'Rifiutato' ? '#fee2e2' : q.status === 'Inviato' ? '#dbeafe' : '#f1f5f9'}; color: ${q.status === 'Accettato' ? '#065f46' : q.status === 'Rifiutato' ? '#991b1b' : q.status === 'Inviato' ? '#1e40af' : '#475569'}; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 32px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <img src="${logoUrl}" onerror="this.style.display='none'" alt="MOD">
      <div>
        <div class="company-name">MOD Group</div>
        <div class="company-sub">modgroup.it</div>
      </div>
    </div>
    <div class="quote-meta">
      <div class="quote-label">Preventivo</div>
      <div class="quote-number">${q.quoteNumber}</div>
      <div style="margin-top:6px"><span class="status-badge">${q.status}</span></div>
    </div>
  </div>

  <div class="bill-section">
    <div class="bill-block">
      <h3>Destinatario</h3>
      <p class="name">${q.companyName}</p>
      ${q.contactName ? `<p>${q.contactName}</p>` : ''}
      ${q.email ? `<p>${q.email}</p>` : ''}
    </div>
    <div class="bill-block">
      <h3>Dettagli</h3>
      <p><strong>Emesso il:</strong> ${q.issueDate}</p>
      ${q.expiryDate ? `<p><strong>Valido fino al:</strong> ${q.expiryDate}</p>` : ''}
      ${q.projectLeader ? `<p><strong>Referente:</strong> ${q.projectLeader}</p>` : ''}
      ${q.serviceType ? `<p><strong>Servizio:</strong> ${q.serviceType}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50%">Descrizione</th>
        <th class="right" style="width:10%">Qta</th>
        <th class="right" style="width:18%">Prezzo unit.</th>
        <th class="right" style="width:18%">Totale</th>
      </tr>
    </thead>
    <tbody>
      ${q.items.map(item => `
      <tr>
        <td class="desc">${item.description}</td>
        <td class="right num">${item.quantity}</td>
        <td class="right num">€ ${fmtLocal(item.unitPrice)}</td>
        <td class="right" style="font-weight:600">€ ${fmtLocal(item.total)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row label"><span>Subtotale</span><span>€ ${fmtLocal(q.subtotal)}</span></div>
    ${q.discountPct ? `<div class="row discount"><span>Sconto ${q.discountPct}%</span><span>- € ${fmtLocal(q.discountAmt ?? 0)}</span></div>` : ''}
    <div class="row grand"><span>TOTALE</span><span>€ ${fmtLocal(q.total)}</span></div>
  </div>

  ${q.notes ? `<div class="notes"><h4>Note</h4>${q.notes}</div>` : ''}

  <div class="footer">
    <span>MOD Group — modgroup.it — m.brumana@modgroup.it</span>
    <span>Documento generato il ${new Date().toLocaleDateString('it-IT')}</span>
  </div>
</div>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`);
    printWindow.document.close();
  };
  const updateItem = (idx: number, key: keyof QuoteLineItem, val: string | number) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [key]: val };
        return { ...updated, total: updated.quantity * updated.unitPrice };
      });
      return { ...f, items };
    });
  };
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, EMPTY_ITEM()] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_,i) => i !== idx) }));

  const { subtotal: previewSubtotal, total: previewTotal, discountAmt: previewDiscount } = calcTotals(form.items, form.discountPct);

  const fmt = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <PageHeader
        title="Preventivi"
        description={`${quotes.length} totali · €${fmt(totalAccepted)} accettati · ${countPending} in attesa`}
        actions={
          <button onClick={() => openNew()} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
            + Nuovo Preventivo
          </button>
        }
      />

      {/* KPI strip */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Totale emesso', val: `€${fmt(totalSent)}`, color: '[color:var(--text-1)]' },
            { label: 'Accettati', val: `€${fmt(totalAccepted)}`, color: '[color:#2ecc71]' },
            { label: 'In attesa risposta', val: String(countPending), color: '[color:#3b9eff]' },
            { label: 'Tasso accettazione', val: quotes.length ? `${Math.round(quotes.filter(q=>q.status==='Accettato').length/quotes.length*100)}%` : '—', color: '[color:var(--brand)]' },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-xs [color:var(--text-3)] mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input w-full max-w-xs text-sm" placeholder="Cerca cliente, numero, servizio..." value={filter} onChange={e => setFilter(e.target.value)} />
        <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value as QuoteStatus | '')}>
          <option value="">Tutti gli stati</option>
          {(Object.keys(STATUS_STYLE) as QuoteStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filter || filterStatus) && (
          <button onClick={() => { setFilter(''); setFilterStatus(''); }} className="text-xs [color:var(--text-3)] hover:[color:var(--text-2)]">✕ Reset</button>
        )}
        <span className="ml-auto text-xs [color:var(--text-3)] self-center">{filtered.length} risultati</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b [border-color:var(--border)] [background:var(--surface2)]">
                {['Numero','Cliente','Servizio','Project Leader','Data','Scadenza','Totale','Stato',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal [color:var(--text-3)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState
                    icon={quotes.length === 0 ? "📄" : "🔍"}
                    title={quotes.length === 0 ? "Nessun preventivo" : "Nessun risultato"}
                    description={quotes.length === 0 ? "Crea il primo preventivo da inviare a un cliente o a un lead. Puoi convertirlo in commessa una volta accettato." : "Prova a cambiare i filtri o cerca con un termine diverso."}
                    action={quotes.length === 0 ? { label: "+ Nuovo preventivo", onClick: () => openNew() } : undefined}
                    size="sm"
                  />
                </td></tr>
              ) : filtered.map(q => {
                const isExpired = q.status === 'Inviato' && q.expiryDate && q.expiryDate < localDateISO();
                return (
                  <tr key={q.id} className="border-b [border-color:var(--border)] hover:[background:var(--surface2)] transition-colors group cursor-pointer" onClick={() => openView(q)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold [color:var(--text-1)]">{q.quoteNumber}</td>
                    <td className="px-4 py-3 font-medium [color:var(--text-1)]">{q.companyName}</td>
                    <td className="px-4 py-3 text-xs [color:var(--text-3)]">{q.serviceType || '—'}</td>
                    <td className="px-4 py-3 [color:var(--text-2)]">{q.projectLeader || '—'}</td>
                    <td className="px-4 py-3 text-xs [color:var(--text-3)]">{q.issueDate}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={isExpired ? '[color:#e74c3c] font-semibold' : '[color:var(--text-3)]'}>{q.expiryDate || '—'}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold [color:var(--text-1)]">€{fmt(q.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[q.status]}`}>{q.status}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {q.status === 'Inviato' && (
                          <>
                            <button onClick={() => changeStatus(q, 'Accettato')} className="text-xs [background:rgba(46,204,113,0.12)] [color:#2ecc71] hover:[background:rgba(46,204,113,0.2)] rounded-lg px-2 py-1">✓</button>
                            <button onClick={() => changeStatus(q, 'Rifiutato')} className="text-xs [background:rgba(231,76,60,0.06)] [color:#e74c3c] hover:[background:rgba(231,76,60,0.12)] rounded-lg px-2 py-1">✗</button>
                          </>
                        )}
                        {q.status === 'Accettato' && !q.convertedToDealId && (
                          <button onClick={() => convertToDeal(q)} className="text-xs [background:rgba(242,101,34,0.12)] [color:var(--brand)] hover:[background:rgba(242,101,34,0.2)] rounded-lg px-2 py-1 font-medium">→ Commessa</button>
                        )}
                        <button onClick={() => printQuote(q)} className="text-xs [color:var(--text-3)] hover:[background:var(--surface3)] rounded-lg px-2 py-1" title="Stampa / PDF">🖨️</button>
                        <button onClick={() => duplicateQuote(q)} className="text-xs [color:var(--text-3)] hover:[background:var(--surface3)] rounded-lg px-2 py-1" title="Duplica">⧉</button>
                        <button onClick={() => { copyEmailText(q); }} className="text-xs [color:var(--text-3)] hover:[background:var(--surface3)] rounded-lg px-2 py-1" title="Copia email">📧</button>
                        <button onClick={() => openEdit(q)} className="text-xs [color:var(--text-3)] hover:[background:var(--surface3)] rounded-lg px-2 py-1">✏️</button>
                        <button onClick={() => deleteQuote(q.id)} className="text-xs text-red-300 hover:[background:rgba(231,76,60,0.06)] rounded-lg px-2 py-1">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal VIEW ── */}
      {modal?.mode === 'view' && modal.quote && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl [background:var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b [border-color:var(--border)] px-6 py-4">
              <div>
                <p className="font-mono text-sm font-bold [color:var(--text-2)]">{modal.quote.quoteNumber}</p>
                <h2 className="text-lg font-bold [color:var(--text-1)]">{modal.quote.companyName}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[modal.quote.status]}`}>{modal.quote.status}</span>
                <button onClick={() => { openEdit(modal.quote); }} className="rounded-xl border [border-color:var(--border2)] px-3 py-1.5 text-xs [color:var(--text-3)] hover:[background:var(--surface2)]">✏️ Modifica</button>
                <button onClick={() => printQuote(modal.quote)} className="rounded-xl border [border-color:var(--border2)] px-3 py-1.5 text-xs [color:var(--text-3)] hover:[background:var(--surface2)]" title="Stampa / Salva PDF">🖨️ PDF</button>
                <button onClick={() => setModal(null)} className="[color:var(--text-3)] hover:[color:var(--text-2)] text-xl ml-2">×</button>
              </div>
            </div>
            {/* Meta */}
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b [border-color:var(--border)] [background:var(--surface2)] text-xs">
              <div><p className="[color:var(--text-3)]">Contatto</p><p className="font-medium [color:var(--text-1)]">{modal.quote.contactName || '—'}</p></div>
              <div><p className="[color:var(--text-3)]">Project Leader</p><p className="font-medium [color:var(--text-1)]">{modal.quote.projectLeader || '—'}</p></div>
              <div><p className="[color:var(--text-3)]">Tipo Servizio</p><p className="font-medium [color:var(--text-1)]">{modal.quote.serviceType || '—'}</p></div>
              <div><p className="[color:var(--text-3)]">Emesso il</p><p className="font-medium [color:var(--text-1)]">{modal.quote.issueDate}</p></div>
              <div><p className="[color:var(--text-3)]">Scade il</p><p className="font-medium [color:var(--text-1)]">{modal.quote.expiryDate || '—'}</p></div>
              {modal.quote.convertedToDealId && <div><p className="[color:var(--text-3)]">Commessa</p><p className="font-medium [color:#2ecc71]">Convertito ✓</p></div>}
            </div>
            {/* Items */}
            <div className="px-6 py-4">
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b [border-color:var(--border)]">
                  <th className="py-2 text-left text-xs [color:var(--text-3)] font-medium">Descrizione</th>
                  <th className="py-2 text-right text-xs [color:var(--text-3)] font-medium w-16">Qta</th>
                  <th className="py-2 text-right text-xs [color:var(--text-3)] font-medium w-24">Prezzo</th>
                  <th className="py-2 text-right text-xs [color:var(--text-3)] font-medium w-24">Totale</th>
                </tr></thead>
                <tbody>
                  {modal.quote.items.map(item => (
                    <tr key={item.id} className="border-b [border-color:var(--border)]">
                      <td className="py-2 [color:var(--text-1)]">{item.description}</td>
                      <td className="py-2 text-right [color:var(--text-3)]">{item.quantity}</td>
                      <td className="py-2 text-right [color:var(--text-3)]">€{fmt(item.unitPrice)}</td>
                      <td className="py-2 text-right font-medium [color:var(--text-1)]">€{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Totals */}
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8"><span className="[color:var(--text-3)]">Subtotale</span><span className="w-24 text-right">€{fmt(modal.quote.subtotal)}</span></div>
                {modal.quote.discountPct && <div className="flex gap-8"><span className="[color:var(--text-3)]">Sconto {modal.quote.discountPct}%</span><span className="w-24 text-right [color:#e74c3c]">-€{fmt(modal.quote.discountAmt ?? 0)}</span></div>}
                <div className="flex gap-8 font-bold text-base border-t [border-color:var(--border2)] pt-1 mt-1"><span>Totale</span><span className="w-24 text-right" style={{ color: '#C8511A' }}>€{fmt(modal.quote.total)}</span></div>
              </div>
              {modal.quote.notes && <p className="mt-4 text-xs [color:var(--text-3)] [background:var(--surface2)] rounded-xl p-3">{modal.quote.notes}</p>}
            </div>
            {/* Actions */}
            <div className="flex items-center justify-between border-t [border-color:var(--border)] px-6 py-4">
              <div className="flex gap-2">
                {modal.quote.status === 'Bozza' && (
                  <button onClick={() => { changeStatus(modal.quote, 'Inviato'); setModal(null); }}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#0057FF' }}>
                    Segna come Inviato
                  </button>
                )}
                {modal.quote.status === 'Inviato' && (
                  <>
                    <button onClick={() => { changeStatus(modal.quote, 'Accettato'); setModal(null); }} className="rounded-xl px-4 py-2 text-sm font-medium [background:#2ecc71] text-white hover:opacity-90">✓ Accettato</button>
                    <button onClick={() => { changeStatus(modal.quote, 'Rifiutato'); setModal(null); }} className="rounded-xl px-4 py-2 text-sm font-medium [background:rgba(231,76,60,0.06)] [color:#e74c3c] hover:[background:rgba(231,76,60,0.15)]">✗ Rifiutato</button>
                  </>
                )}
                {modal.quote.status === 'Accettato' && !modal.quote.convertedToDealId && (
                  <button onClick={() => { convertToDeal(modal.quote); setModal(null); }}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
                    → Converti in Commessa
                  </button>
                )}
              </div>
              <button onClick={() => setModal(null)} className="rounded-xl border [border-color:var(--border2)] px-4 py-2 text-sm [color:var(--text-3)] hover:[background:var(--surface2)]">Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal EDIT/NEW ── */}
      {(modal?.mode === 'edit' || modal?.mode === 'new') && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
          <div className="w-full max-w-3xl rounded-2xl [background:var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b [border-color:var(--border)] px-6 py-4">
              <h2 className="text-base font-semibold">{modal.mode === 'new' ? 'Nuovo Preventivo' : `Modifica ${form.quoteNumber}`}</h2>
              <button onClick={() => setModal(null)} className="[color:var(--text-3)] hover:[color:var(--text-2)] text-xl">×</button>
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Numero</label>
                  <input className="input w-full font-mono" value={form.quoteNumber} onChange={e => setF('quoteNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Stato</label>
                  <select className="input w-full" value={form.status} onChange={e => setF('status', e.target.value)}>
                    {(Object.keys(STATUS_STYLE) as QuoteStatus[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Cliente *</label>
                  <input list="clients-q" className="input w-full" value={form.companyName} onChange={e => setF('companyName', e.target.value)} />
                  <datalist id="clients-q">{data.clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Contatto</label>
                  <input className="input w-full" value={form.contactName ?? ''} onChange={e => setF('contactName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Email</label>
                  <input type="email" className="input w-full" value={form.email ?? ''} onChange={e => setF('email', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Project Leader</label>
                  <input list="team-q" className="input w-full" value={form.projectLeader ?? ''} onChange={e => setF('projectLeader', e.target.value)} />
                  <datalist id="team-q">{data.teamMembers.map(m => <option key={m.id} value={m.fullName} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Tipo Servizio</label>
                  <select className="input w-full" value={form.serviceType ?? ''} onChange={e => setF('serviceType', e.target.value)}>
                    <option value="">—</option>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Data Emissione</label>
                  <input type="date" className="input w-full" value={form.issueDate} onChange={e => setF('issueDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Data Scadenza</label>
                  <input type="date" className="input w-full" value={form.expiryDate ?? ''} onChange={e => setF('expiryDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Collega a Lead</label>
                  <select className="input w-full" value={form.leadId ?? ''} onChange={e => setF('leadId', e.target.value)}>
                    <option value="">—</option>
                    {data.leads.map(l => <option key={l.id} value={l.id}>{l.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Collega a Pipeline</label>
                  <select className="input w-full" value={form.pipelineId ?? ''} onChange={e => setF('pipelineId', e.target.value)}>
                    <option value="">—</option>
                    {data.pipeline.map(p => <option key={p.id} value={p.id}>{p.companyName} — {p.stage}</option>)}
                  </select>
                </div>
              </div>

              {/* Voci */}
              <div className="border-t [border-color:var(--border)] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold [color:var(--text-3)] uppercase tracking-wide">Voci preventivo</label>
                  <div className="flex items-center gap-2">
                    <button onClick={addItem} className="text-xs [color:var(--brand)] hover:underline">+ Aggiungi voce</button>
                    <button onClick={generateItems} disabled={aiLoading} className="text-xs px-3 py-1 rounded-lg font-semibold transition-colors" style={{ background: aiLoading ? 'var(--surface3)' : 'rgba(242,101,34,0.1)', color: aiLoading ? 'var(--text-3)' : 'var(--brand)', border: '1px solid rgba(242,101,34,0.3)' }}>
                      {aiLoading ? '⏳ Generando...' : '✨ Genera voci AI'}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border [border-color:var(--border)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="[background:var(--surface2)] border-b [border-color:var(--border)]">
                        <th className="px-3 py-2 text-left text-xs [color:var(--text-3)] font-medium">Descrizione</th>
                        <th className="px-3 py-2 text-right text-xs [color:var(--text-3)] font-medium w-20">Qta</th>
                        <th className="px-3 py-2 text-right text-xs [color:var(--text-3)] font-medium w-28">Prezzo unit. €</th>
                        <th className="px-3 py-2 text-right text-xs [color:var(--text-3)] font-medium w-24">Totale</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={item.id} className="border-b [border-color:var(--border)]">
                          <td className="px-2 py-1.5">
                            <input className="input text-xs py-1 w-full" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Es. Social media management mensile" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step={0.5} className="input text-xs py-1 text-right w-full" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value)||0)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step={10} className="input text-xs py-1 text-right w-full" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value)||0)} />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium [color:var(--text-1)] text-xs">€{fmt(item.quantity * item.unitPrice)}</td>
                          <td className="px-2">
                            <button onClick={() => removeItem(idx)} className="text-red-300 hover:[color:#e74c3c] text-base">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Totals preview */}
                <div className="flex flex-col items-end gap-1 mt-3 text-sm">
                  <div className="flex gap-8 [color:var(--text-3)]"><span>Subtotale</span><span className="w-28 text-right">€{fmt(previewSubtotal)}</span></div>
                  <div className="flex items-center gap-4">
                    <span className="[color:var(--text-3)] text-xs">Sconto %</span>
                    <input type="number" min={0} max={100} className="input text-xs py-1 w-16 text-right" value={form.discountPct ?? ''} onChange={e => setF('discountPct', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="0" />
                    {(form.discountPct ?? 0) > 0 && <span className="[color:#e74c3c] text-sm w-28 text-right">-€{fmt(previewDiscount)}</span>}
                  </div>
                  <div className="flex gap-8 font-bold text-base border-t [border-color:var(--border2)] pt-2 mt-1">
                    <span>TOTALE</span><span className="w-28 text-right" style={{ color: '#C8511A' }}>€{fmt(previewTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-3 border-t [border-color:var(--border)] pt-4">
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Note (visibili al cliente)</label>
                  <textarea className="input resize-none w-full" rows={3} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Note interne</label>
                  <textarea className="input resize-none w-full" rows={3} value={form.internalNotes ?? ''} onChange={e => setF('internalNotes', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t [border-color:var(--border)] px-6 py-4">
              <button onClick={() => setModal(null)} className="rounded-xl border [border-color:var(--border2)] px-4 py-2 text-sm [color:var(--text-3)] hover:[background:var(--surface2)]">Annulla</button>
              <button onClick={saveQuote} disabled={!form.companyName.trim()} className="rounded-xl px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
                Salva Preventivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 [color:var(--text-3)] text-sm">Caricamento...</div>}>
      <QuotesInner />
    </Suspense>
  );
}
