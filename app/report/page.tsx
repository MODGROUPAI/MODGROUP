'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';

import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ── helpers ──────────────────────────────────────────────────────────────────

function inMonth(dateStr: string | undefined, ym: string): boolean {
  return !!dateStr && dateStr.startsWith(ym);
}

function KpiBox({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: color ?? 'var(--text-1)', fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ── pagina ────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { data } = useData();
  const router   = useRouter();

  const now = new Date();
  const [selectedYM, setSelectedYM] = useState(() =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [filterClient, setFilterClient] = useState('');
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiReport, setAiReport]         = useState('');
  const [printMode, setPrintMode]       = useState(false);

  // Mesi disponibili (ultimi 12)
  const availableMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ ym, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
    }
    return months;
  }, []);

  const selectedLabel = availableMonths.find(m => m.ym === selectedYM)?.label ?? selectedYM;
  const clientNames   = useMemo(() => [...new Set(data.clients.filter(c => c.status === 'Attivo').map(c => c.name))], [data.clients]);

  // ── aggregazione dati del mese ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const ym = selectedYM;
    const cf = filterClient;

    const filterTask = (t: typeof data.tasks[0]) =>
      (!cf || t.clientName === cf);
    const filterLog  = (l: typeof data.timeLogs[0]) =>
      (!cf || l.clientName === cf);
    const filterEdit = (e: typeof data.editorialContent[0]) =>
      (!cf || e.clientName === cf);

    const tasks       = data.tasks.filter(filterTask);
    const logs        = data.timeLogs.filter(filterLog);
    const editorial   = (data.editorialContent ?? []).filter(filterEdit);

    // Task
    const completedTasks = tasks.filter(t => t.isCompleted && inMonth(t.dueDate, ym));
    const openTasks      = tasks.filter(t => !t.isCompleted);
    const overdueTasks   = openTasks.filter(t => t.dueDate && t.dueDate < selectedYM + '-32');
    const highPrio       = openTasks.filter(t => t.priority === 'Alta' || t.priority === 'Urgente');

    // Ore
    const logsMonth    = logs.filter(l => inMonth(l.date, ym));
    const totalHours   = logsMonth.reduce((s, l) => s + l.hours, 0);
    const billableHours = logsMonth.filter(l => l.billable).reduce((s, l) => s + l.hours, 0);
    const billableRate  = totalHours > 0 ? Math.round(billableHours / totalHours * 100) : 0;

    // Ore per cliente
    const hoursByClient: Record<string, number> = {};
    logsMonth.forEach(l => {
      if (l.clientName) hoursByClient[l.clientName] = (hoursByClient[l.clientName] ?? 0) + l.hours;
    });

    // Ore per membro
    const hoursByMember: Record<string, number> = {};
    logsMonth.forEach(l => {
      if (l.member) hoursByMember[l.member] = (hoursByMember[l.member] ?? 0) + l.hours;
    });

    // Editoriale
    const editMonth     = editorial.filter(e => inMonth(e.scheduledDate, ym));
    const published     = editMonth.filter(e => e.status === 'Pubblicato').length;
    const approved      = editMonth.filter(e => e.status === 'Approvato').length;
    const blockedEdit   = editMonth.filter(e => e.status === 'Bloccato').length;
    const inReviewEdit  = editMonth.filter(e => e.status === 'In revisione').length;
    const plannedEdit   = editMonth.length;

    // Pipeline
    const wonDeals     = data.pipeline.filter(p => p.stage === 'Chiuso vinto' && inMonth(p.closedAt, ym));
    const lostDeals    = data.pipeline.filter(p => p.stage === 'Chiuso perso' && inMonth(p.closedAt, ym));
    const newLeads     = data.leads.filter(l => inMonth(l.statusDate, ym));
    const pipelineVal  = data.pipeline.filter(p => !['Chiuso vinto','Chiuso perso'].includes(p.stage))
      .reduce((s, p) => s + (p.value ?? 0) * ((p.probability ?? 50) / 100), 0);

    // Task per membro
    const tasksByMember: Record<string, { open: number; done: number }> = {};
    tasks.forEach(t => {
      if (!t.responsible) return;
      if (!tasksByMember[t.responsible]) tasksByMember[t.responsible] = { open: 0, done: 0 };
      if (t.isCompleted && inMonth(t.dueDate, ym)) tasksByMember[t.responsible].done++;
      else if (!t.isCompleted) tasksByMember[t.responsible].open++;
    });

    // Editoriale per cliente
    const editByClient: Record<string, { total: number; published: number }> = {};
    editMonth.forEach(e => {
      if (!editByClient[e.clientName]) editByClient[e.clientName] = { total: 0, published: 0 };
      editByClient[e.clientName].total++;
      if (e.status === 'Pubblicato') editByClient[e.clientName].published++;
    });

    return {
      completedTasks, openTasks, overdueTasks, highPrio,
      totalHours, billableHours, billableRate,
      hoursByClient, hoursByMember,
      published, approved, blockedEdit, inReviewEdit, plannedEdit,
      wonDeals, lostDeals, newLeads, pipelineVal,
      tasksByMember, editByClient,
      logsMonth,
    };
  }, [selectedYM, filterClient, data]);

  // ── Genera report AI ───────────────────────────────────────────────────────

  const generateAIReport = useCallback(async () => {
    setAiLoading(true);
    setAiReport('');

    const top3Clients = Object.entries(stats.hoursByClient)
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([n, h]) => `${n}: ${h.toFixed(1)}h`).join(', ');

    const systemPrompt = `Sei un direttore operativo di un'agenzia di marketing italiana. 
Scrivi un report mensile executive professionale in italiano.
Usa un tono diretto e orientato ai risultati.
Struttura con sezioni chiare usando emoji e titoli.
Evidenzia sia i risultati positivi che i punti critici.
Concludi con 3 azioni prioritarie per il mese successivo.`;

    const userMsg = `Genera il report mensile per ${selectedLabel}${filterClient ? ` — Cliente: ${filterClient}` : ' — Tutti i clienti'}.

DATI OPERATIVI:
- Task completati: ${stats.completedTasks.length}
- Task aperti: ${stats.openTasks.length} (${stats.overdueTasks.length} in ritardo, ${stats.highPrio.length} alta priorità)
- Ore lavorate: ${stats.totalHours.toFixed(1)}h (fatturabili: ${stats.billableHours.toFixed(1)}h, ${stats.billableRate}%)
- Top clienti per ore: ${top3Clients || 'n.d.'}

PIANO EDITORIALE:
- Contenuti pianificati: ${stats.plannedEdit}
- Pubblicati: ${stats.published}
- In approvazione: ${stats.inReviewEdit}
- Bloccati: ${stats.blockedEdit}

COMMERCIALE:
- Nuovi lead: ${stats.newLeads.length}
- Commesse vinte: ${stats.wonDeals.length}
- Commesse perse: ${stats.lostDeals.length}
- Pipeline ponderata: €${Math.round(stats.pipelineVal).toLocaleString('it-IT')}

TEAM:
${Object.entries(stats.tasksByMember).map(([n, v]) => `- ${n}: ${v.done} completati, ${v.open} aperti`).join('\n') || 'Nessun dato team'}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          
          system: systemPrompt,
          contents: [{ role:'user', parts:[{ text: userMsg }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.75 },
        }),
      });
      const json = await res.json();
      setAiReport(json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Errore nella generazione.');
    } catch {
      setAiReport('Errore di connessione. Riprova.');
    } finally {
      setAiLoading(false);
    }
  }, [selectedLabel, filterClient, stats]);

  // ── Esporta PDF ────────────────────────────────────────────────────────────

  const exportPDF = useCallback(() => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const topHours = Object.entries(stats.hoursByClient)
      .sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topMembers = Object.entries(stats.tasksByMember)
      .sort((a, b) => b[1].done - a[1].done).slice(0, 6);
    const editClients = Object.entries(stats.editByClient).slice(0, 8);

    win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Report ${selectedLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10pt;color:#1a1a1a;padding:32px 48px;background:#fff}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F26522;padding-bottom:16px;margin-bottom:28px}
.logo{font-size:18pt;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px}
.logo span{color:#F26522}
.period{font-size:10pt;color:#888;margin-top:4px}
.generated{font-size:9pt;color:#aaa;text-align:right}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
.kpi label{font-size:7pt;text-transform:uppercase;letter-spacing:.1em;color:#999;display:block;margin-bottom:5px}
.kpi .val{font-size:20pt;font-weight:800;color:#1a1a1a}
.kpi .sub{font-size:8pt;color:#aaa;margin-top:2px}
h3{font-size:11pt;font-weight:700;margin:20px 0 10px;color:#1a1a1a;display:flex;align-items:center;gap:6px}
h3::before{content:'';display:inline-block;width:4px;height:14px;background:#F26522;border-radius:2px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#1a1a1a;color:#fff;padding:6px 10px;font-size:8pt;text-align:left;font-weight:600}
td{padding:6px 10px;font-size:9pt;border-bottom:1px solid #f5f5f5}
tr:last-child td{border-bottom:none}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.section{break-inside:avoid}
.ai-report{background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-top:20px;white-space:pre-wrap;font-size:10pt;line-height:1.7}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:8pt;color:#aaa;display:flex;justify-content:space-between}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.kpi-grid{grid-template-columns:repeat(4,1fr)}}
</style></head><body>

<div class="header">
  <div>
    <div class="logo">MOD<span>.</span>Group</div>
    <div class="period">Report Mensile — ${selectedLabel}${filterClient ? ` · ${filterClient}` : ''}</div>
  </div>
  <div class="generated">Generato il ${new Date().toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })}</div>
</div>

<div class="kpi-grid">
  <div class="kpi"><label>Task completati</label><div class="val">${stats.completedTasks.length}</div></div>
  <div class="kpi"><label>Task aperti</label><div class="val">${stats.openTasks.length}</div><div class="sub">${stats.overdueTasks.length} in ritardo</div></div>
  <div class="kpi"><label>Ore lavorate</label><div class="val">${stats.totalHours.toFixed(1)}h</div><div class="sub">${stats.billableRate}% fatturabili</div></div>
  <div class="kpi"><label>Pubblicati</label><div class="val">${stats.published}</div><div class="sub">su ${stats.plannedEdit} pianificati</div></div>
</div>

<div class="two-col">
  <div class="section">
    ${topHours.length > 0 ? `<h3>Ore per cliente</h3>
    <table><thead><tr><th>Cliente</th><th>Ore</th><th>Fatturabili</th></tr></thead><tbody>
    ${topHours.map(([n, h]) => {
      const bill = stats.logsMonth.filter(l => l.clientName === n && l.billable).reduce((s, l) => s + l.hours, 0);
      return `<tr><td>${n}</td><td><b>${h.toFixed(1)}h</b></td><td>${bill.toFixed(1)}h</td></tr>`;
    }).join('')}
    </tbody></table>` : ''}

    ${topMembers.length > 0 ? `<h3>Performance team</h3>
    <table><thead><tr><th>Membro</th><th>Completati</th><th>Aperti</th></tr></thead><tbody>
    ${topMembers.map(([n, v]) => `<tr><td>${n}</td><td><b>${v.done}</b></td><td>${v.open}</td></tr>`).join('')}
    </tbody></table>` : ''}
  </div>
  <div class="section">
    ${editClients.length > 0 ? `<h3>Piano editoriale per cliente</h3>
    <table><thead><tr><th>Cliente</th><th>Totale</th><th>Pubblicati</th></tr></thead><tbody>
    ${editClients.map(([n, v]) => `<tr><td>${n}</td><td>${v.total}</td><td><b>${v.published}</b></td></tr>`).join('')}
    </tbody></table>` : ''}

    <h3>Commerciale</h3>
    <table><thead><tr><th>Metrica</th><th>Valore</th></tr></thead><tbody>
    <tr><td>Nuovi lead</td><td><b>${stats.newLeads.length}</b></td></tr>
    <tr><td>Commesse vinte</td><td><b>${stats.wonDeals.length}</b></td></tr>
    <tr><td>Commesse perse</td><td>${stats.lostDeals.length}</td></tr>
    <tr><td>Pipeline ponderata</td><td><b>€${Math.round(stats.pipelineVal).toLocaleString('it-IT')}</b></td></tr>
    </tbody></table>
  </div>
</div>

${aiReport ? `<h3>Analisi e raccomandazioni AI</h3><div class="ai-report">${aiReport}</div>` : ''}

<div class="footer">
  <span>MOD Group · Report ${selectedLabel}</span>
  <span>Documento riservato — uso interno</span>
</div>

<script>window.onload=()=>window.print();<\/script>
</body></html>`);
    win.document.close();
  }, [selectedLabel, filterClient, stats, aiReport]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>Report Mensile</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>{selectedLabel}{filterClient ? ` · ${filterClient}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Selettore mese */}
          <select className="input" style={{ fontSize: 14 }} value={selectedYM} onChange={e => setSelectedYM(e.target.value)}>
            {availableMonths.map(m => <option key={m.ym} value={m.ym}>{m.label}</option>)}
          </select>
          {/* Filtro cliente */}
          <select className="input" style={{ fontSize: 14, width: 180 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">Tutti i clienti</option>
            {clientNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={generateAIReport} disabled={aiLoading} style={{
            padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: aiLoading ? 'wait' : 'pointer',
            background: aiLoading ? 'var(--surface3)' : 'var(--brand)', color: aiLoading ? 'var(--text-3)' : 'white',
          }}>
            {aiLoading ? '⏳' : '✨'} {aiReport ? 'Rigenera' : 'Analisi AI'}
          </button>
          <button onClick={exportPDF} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        <KpiBox label="Task completati" value={stats.completedTasks.length} sub={`${stats.openTasks.length} ancora aperti`} />
        <KpiBox label="Ore lavorate" value={`${stats.totalHours.toFixed(1)}h`} sub={`${stats.billableRate}% fatturabili`} color={stats.totalHours > 0 ? '#4ade80' : 'var(--text-3)'} />
        <KpiBox label="Pubblicati" value={stats.published} sub={`su ${stats.plannedEdit} pianificati`} color='#60a5fa' />
        <KpiBox label="Pipeline ponderata" value={`€${Math.round(stats.pipelineVal / 1000)}k`} sub={`${stats.wonDeals.length} vinte · ${stats.newLeads.length} nuovi lead`} color='var(--brand)' />
      </div>

      {/* Alert */}
      {(stats.overdueTasks.length > 0 || stats.blockedEdit > 0) && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', gap: 16 }}>
          {stats.overdueTasks.length > 0 && <span style={{ fontSize: 14, color: '#f87171' }}>⚠️ {stats.overdueTasks.length} task in ritardo</span>}
          {stats.blockedEdit > 0 && <span style={{ fontSize: 14, color: '#f87171' }}>🚫 {stats.blockedEdit} contenuti bloccati</span>}
        </div>
      )}

      {/* Grid dati */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Ore per cliente */}
        {Object.keys(stats.hoursByClient).length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 14, background: 'var(--brand)', borderRadius: 2, display: 'inline-block' }} />
              Ore per cliente
            </p>
            {Object.entries(stats.hoursByClient).sort((a,b) => b[1]-a[1]).slice(0,6).map(([name, hours]) => {
              const max = Math.max(...Object.values(stats.hoursByClient));
              return (
                <div key={name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{hours.toFixed(1)}h</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(hours / max) * 100}%`, background: 'var(--brand)', borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Team performance */}
        {Object.keys(stats.tasksByMember).length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 14, background: '#60a5fa', borderRadius: 2, display: 'inline-block' }} />
              Performance team
            </p>
            {Object.entries(stats.tasksByMember).sort((a,b) => b[1].done - a[1].done).slice(0,6).map(([name, v]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, padding: '6px 10px', borderRadius: 8, background: 'var(--surface2)' }}>
                <span style={{ fontSize: 14, color: 'var(--text-1)', flex: 1 }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{v.done} ✓</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{v.open} aperti</span>
              </div>
            ))}
          </div>
        )}

        {/* Editoriale per cliente */}
        {Object.keys(stats.editByClient).length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 14, background: '#a855f7', borderRadius: 2, display: 'inline-block' }} />
              Piano editoriale
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Pianificati', val: stats.plannedEdit, color: 'var(--text-2)' },
                { label: 'Pubblicati',  val: stats.published,   color: '#22c55e' },
                { label: 'In revisione',val: stats.inReviewEdit, color: '#fbbf24' },
                { label: 'Bloccati',    val: stats.blockedEdit,  color: '#f87171' },
              ].map(k => (
                <div key={k.label} style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'var(--surface2)' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.val}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{k.label}</p>
                </div>
              ))}
            </div>
            {Object.entries(stats.editByClient).slice(0,5).map(([name, v]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{v.published}/{v.total} pubblicati</span>
              </div>
            ))}
          </div>
        )}

        {/* Commerciale */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, background: 'var(--brand)', borderRadius: 2, display: 'inline-block' }} />
            Commerciale
          </p>
          {[
            { label: 'Nuovi lead', val: stats.newLeads.length, color: '#60a5fa' },
            { label: 'Commesse vinte', val: stats.wonDeals.length, color: '#4ade80' },
            { label: 'Commesse perse', val: stats.lostDeals.length, color: '#f87171' },
            { label: 'Pipeline ponderata', val: `€${Math.round(stats.pipelineVal).toLocaleString('it-IT')}`, color: 'var(--brand)' },
          ].map(k => (
            <div key={k.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{k.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Report */}
      {(aiLoading || aiReport) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand)' }}>✨ Analisi AI — {selectedLabel}</p>
            {aiReport && !aiLoading && (
              <button onClick={() => navigator.clipboard.writeText(aiReport)}
                style={{ fontSize: 13, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                📋 Copia
              </button>
            )}
          </div>
          <div style={{ padding: '20px 24px', minHeight: 120 }}>
            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[90,70,80,60,75].map((w,i) => <div key={i} style={{ height: 12, borderRadius: 6, background: 'var(--surface2)', width: `${w}%` }} />)}
              </div>
            ) : (
              <div style={{ fontSize: 15, color: 'var(--text-1)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiReport}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
