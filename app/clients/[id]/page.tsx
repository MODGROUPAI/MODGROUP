'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import { approvalGate } from '@/lib/approvalGate';
import type { ContentStatus } from '@/lib/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

const STATUS_DOT: Record<string, string> = {
  'Da fare': 'var(--text-3)', 'In produzione': '#60a5fa',
  'Bloccato': '#fca5a5', 'In revisione': '#fde68a',
  'Approvato': '#4ade80', 'Pubblicato': '#22c55e', 'Rimandato': '#f87171',
};

const PRIO_COLOR: Record<string, string> = {
  Alta: '#e74c3c', Media: '#f5c518', Bassa: '#2ecc71',
};

// ── componente principale ─────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, update } = useData();
  const today = localDateISO();

  const client = data.clients.find(c => c.id === id);

  // Dati correlati
  const tasks     = useMemo(() => data.tasks.filter(t => t.clientName?.toLowerCase() === client?.name?.toLowerCase()), [data.tasks, client]);
  const deal      = useMemo(() => data.deals.find(d => d.companyName?.toLowerCase() === client?.name?.toLowerCase()), [data.deals, client]);
  const timeLogs  = useMemo(() => data.timeLogs.filter(l => l.clientName?.toLowerCase() === client?.name?.toLowerCase()), [data.timeLogs, client]);
  const editorial = useMemo(() => {
    const month = today.slice(0, 7);
    return (data.editorialContent ?? []).filter(e => e.clientName?.toLowerCase() === client?.name?.toLowerCase() && e.scheduledDate.startsWith(month));
  }, [data.editorialContent, client, today]);

  // KPI derivati
  const openTasks     = tasks.filter(t => !t.isCompleted);
  const overdueTasks  = openTasks.filter(t => t.dueDate && t.dueDate < today);
  const dueSoonTasks  = openTasks.filter(t => t.dueDate && t.dueDate >= today && diffDays(today, t.dueDate) <= 7);
  const totalHours    = timeLogs.reduce((s, l) => s + l.hours, 0);
  const budgetOre     = deal?.budgetOre ?? 0;
  const budgetPct     = budgetOre > 0 ? Math.round((totalHours / budgetOre) * 100) : null;
  const alertThreshold = deal?.alertThreshold ?? 80;

  // Stato salute
  const health = (() => {
    if (overdueTasks.length > 0 || (budgetPct !== null && budgetPct >= 100)) return 'red';
    if (dueSoonTasks.length > 0 || (budgetPct !== null && budgetPct >= alertThreshold)) return 'yellow';
    return 'green';
  })();
  const healthColor = { red: '#e74c3c', yellow: '#f5c518', green: '#2ecc71' }[health];
  const healthLabel = { red: '⚠️ Richiede attenzione', yellow: '🟡 Monitorare', green: '✅ Tutto ok' }[health];

  // Genera testo aggiornamento (feature 3)
  const [copied, setCopied] = useState<'wa' | 'email' | null>(null);
  const generateUpdate = (type: 'wa' | 'email') => {
    const publishedThisMonth = editorial.filter(e => e.status === 'Pubblicato').length;
    const pendingApproval    = editorial.filter(e => e.status === 'In revisione').length;
    const blocked            = editorial.filter(e => e.status === 'Bloccato').length;
    const nextDeadline       = openTasks.filter(t => t.dueDate).sort((a,b) => a.dueDate!.localeCompare(b.dueDate!))[0];

    if (type === 'wa') {
      const msg =
        `📊 *Aggiornamento ${client!.name}*\n` +
        `📅 ${new Date().toLocaleDateString('it-IT', { day:'numeric', month:'long' })}\n\n` +
        `✅ *Pubblicati questo mese:* ${publishedThisMonth}\n` +
        (pendingApproval > 0 ? `⏳ *In attesa di approvazione:* ${pendingApproval}\n` : '') +
        (blocked > 0 ? `🚫 *Contenuti bloccati:* ${blocked}\n` : '') +
        (nextDeadline ? `\n📌 *Prossima scadenza:* ${nextDeadline.title} (${nextDeadline.dueDate})\n` : '') +
        (budgetPct !== null ? `\n⏱ *Budget ore:* ${totalHours.toFixed(1)}h / ${budgetOre}h (${budgetPct}%)\n` : '') +
        `\n_— Team MOD_`;
      navigator.clipboard.writeText(msg);
    } else {
      const msg =
        `Oggetto: Aggiornamento attività — ${client!.name}\n\n` +
        `Gentile ${client!.contactName || 'Cliente'},\n\n` +
        `Le inviamo un aggiornamento sulle attività del mese corrente.\n\n` +
        `📣 Piano editoriale:\n` +
        `• Contenuti pubblicati: ${publishedThisMonth}\n` +
        (pendingApproval > 0 ? `• In attesa della sua approvazione: ${pendingApproval}\n` : '') +
        (blocked > 0 ? `• Contenuti in attesa di materiali: ${blocked}\n` : '') +
        (nextDeadline ? `\n📌 Prossima scadenza operativa: ${nextDeadline.title} (${nextDeadline.dueDate})\n` : '') +
        (budgetPct !== null ? `\n⏱ Stato budget ore: ${totalHours.toFixed(1)}h utilizzate su ${budgetOre}h previste (${budgetPct}%).\n` : '') +
        `\nResto a disposizione per qualsiasi necessità.\n\nCordiali saluti,\n${data.teamMembers.find(t => t.fullName === client?.responsible)?.fullName || 'Team MOD'}`;
      navigator.clipboard.writeText(msg);
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  // Genera link condivisibile per il cliente
  const generateShareLink = () => {
    if (!approvalGate({
      action: 'Condividi dashboard con cliente',
      recipient: client?.name,
      warnings: [
        'La dashboard include KPI, task aperti e piano contenuti',
        'Verifica che non ci siano informazioni sensibili visibili',
      ],
    })) return;
    const today2 = localDateISO();
    const thisMonth2 = today2.slice(0, 7);
    const sharedData = {
      clientName:   client!.name,
      sector:       client!.sector,
      responsible:  client!.responsible,
      generatedAt:  new Date().toISOString(),
      openTasks:    openTasks.length,
      overdueTasks: overdueTasks.length,
      completedTasks: tasks.filter(t => t.isCompleted).length,
      dueSoonTasks: dueSoonTasks.slice(0, 5).map(t => ({ title: t.title, dueDate: t.dueDate! })),
      publishedThisMonth: editorial.filter(e => e.status === 'Pubblicato').length,
      plannedThisMonth:   editorial.length,
      inReview:     editorial.filter(e => e.status === 'In revisione').length,
      blocked:      editorial.filter(e => e.status === 'Bloccato').length,
      upcomingContent: editorial
        .filter(e => e.status !== 'Pubblicato')
        .slice(0, 8)
        .map(e => ({ platform: e.platform, format: e.format, scheduledDate: e.scheduledDate, status: e.status })),
      hoursLogged:  totalHours,
      budgetOre:    deal?.budgetOre,
      budgetEuro:   deal?.budgetEuro,
      budgetPct:    budgetPct ?? undefined,
      health:       health as 'green' | 'yellow' | 'red',
      healthLabel:  healthLabel,
      accountName:  client!.responsible,
    };
    const token = encodeURIComponent(btoa(JSON.stringify(sharedData)));
    const url   = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    alert('Link copiato! Incollalo e mandalo al cliente.');
  };

  // Calendario condiviso
  const toggleSharedCalendar = () => {
    if (!client) return;
    const token = client.sharedCalendarToken ?? `CAL${client.id}${Date.now().toString(36)}`;
    const updated = {
      ...client,
      sharedCalendar: !client.sharedCalendar,
      sharedCalendarToken: token,
    };
    update({ clients: data.clients.map(c => c.id === id ? updated : c) });
  };

  // Impostazioni calendario condiviso
  const DEFAULT_CAL_SETTINGS = {
    showTasks:       false,
    showCaption:     false,
    visibleStatuses: ['Pubblicato', 'Approvato'],
  };
  const ALL_STATUSES = ['Da fare','In produzione','In revisione','Approvato','Pubblicato','Bloccato','Rimandato'];
  const [calSettings, setCalSettings] = useState(client?.calendarSettings ?? DEFAULT_CAL_SETTINGS);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState(client?.driveLink ?? '');

  const saveDriveLink = () => {
    if (!client) return;
    update({ clients: data.clients.map(c => c.id === id ? { ...c, driveLink: driveLinkInput.trim() } : c) });
    setShowDriveModal(false);
  };
  const [showCalSettings, setShowCalSettings] = useState(false);

  const saveCalSettings = () => {
    if (!client) return;
    update({ clients: data.clients.map(c => c.id === id ? { ...c, calendarSettings: calSettings } : c) });
    setShowCalSettings(false);
  };

  const toggleVisibleStatus = (status: string) => {
    setCalSettings(s => ({
      ...s,
      visibleStatuses: s.visibleStatuses.includes(status)
        ? s.visibleStatuses.filter(x => x !== status)
        : [...s.visibleStatuses, status],
    }));
  };

  const copyCalendarLink = () => {
    if (!client?.sharedCalendarToken) return;
    if (!approvalGate({
      action: 'Condividi calendario con cliente',
      recipient: client?.name,
      warnings: ['Verifica le impostazioni calendario — solo stati approvati sono visibili'],
    })) return;
    const url = `${window.location.origin}/calendar/client/${client.sharedCalendarToken}`;
    navigator.clipboard.writeText(url);
    alert('Link calendario copiato!\n\n' + url);
  };

  // Toggle task completata
  const toggleTask = (taskId: string) => {
    update({
      tasks: data.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t),
    });
  };

  if (!client) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        <p style={{ fontSize: 48 }}>🏢</p>
        <p style={{ marginTop: 12, fontSize: 16 }}>Cliente non trovato</p>
        <button onClick={() => router.push('/clients')} style={{ marginTop: 16, color: 'var(--brand)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Torna ai clienti
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Back ── */}
      <button onClick={() => router.push('/clients')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
        ← Tutti i clienti
      </button>

      {/* ── Hero header ── */}
      <div className="card anim-fade-up" style={{ padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: `${healthColor}20`, border: `2px solid ${healthColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 800, fontSize: 22, color: healthColor,
            }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)', lineHeight: 1.1 }}>
                {client.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{client.sector || 'Settore n.d.'}</span>
                {client.city && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· {client.city}</span>}
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: `${healthColor}18`, color: healthColor,
                  border: `1px solid ${healthColor}44`,
                }}>
                  {healthLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right: azioni rapide */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {client.email && (
              <a href={`mailto:${client.email}`}
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: '1px solid var(--border2)', color: 'var(--text-2)', background: 'none',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✉️ Email
              </a>
            )}
            {/* Drive button — apre il link + tasto modifica */}
            <div style={{ display:'flex', gap:4 }}>
              <a
                href={client.driveLink ?? '#'}
                target="_blank" rel="noopener noreferrer"
                onClick={e => { if (!client.driveLink) { e.preventDefault(); setShowDriveModal(true); } }}
                style={{ padding:'8px 14px', borderRadius:10, fontSize:13, fontWeight:600,
                  border:`1px solid ${client.driveLink ? 'rgba(46,204,113,0.4)' : 'var(--border2)'}`,
                  color: client.driveLink ? '#2ecc71' : 'var(--text-3)',
                  background: client.driveLink ? 'rgba(46,204,113,0.08)' : 'transparent',
                  textDecoration:'none', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                📁 {client.driveLink ? 'Drive' : 'Drive —'}
              </a>
              <button
                onClick={() => { setDriveLinkInput(client.driveLink ?? ''); setShowDriveModal(true); }}
                title={client.driveLink ? 'Modifica link Drive' : 'Collega cartella Drive'}
                style={{ padding:'8px 10px', borderRadius:10, fontSize:12,
                  border:`1px solid ${client.driveLink ? 'rgba(46,204,113,0.3)' : 'var(--border2)'}`,
                  color: client.driveLink ? '#2ecc71' : 'var(--text-3)',
                  background:'transparent', cursor:'pointer' }}>
                ✏️
              </button>
            </div>
            <button
              onClick={() => router.push(`/clients/${id}/brief`)}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(242,101,34,0.4)', color: 'var(--brand)',
                background: client.marketingBrief?.updatedAt ? 'rgba(242,101,34,0.08)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {client.marketingBrief?.updatedAt ? '📊 Brief Marketing' : '📊 Compila Brief'}
            </button>
            <button
              onClick={() => router.push(`/clients/${id}/briefing`)}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa',
                background: 'rgba(96,165,250,0.06)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🗓 Brief Riunione
            </button>
            <button
              onClick={() => router.push(`/clients/${id}/notifications`)}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: `1px solid ${client.notifications?.enabled ? 'rgba(74,222,128,0.4)' : 'var(--border2)'}`,
                color: client.notifications?.enabled ? '#4ade80' : 'var(--text-3)',
                background: client.notifications?.enabled ? 'rgba(74,222,128,0.06)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {client.notifications?.enabled ? '🔔' : '🔕'} Notifiche
            </button>
            <button
              onClick={() => router.push(`/clients/${id}/assets`)}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37',
                background: 'rgba(212,175,55,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🗂️ Asset ({client.assets?.length ?? 0})
            </button>
            {/* Calendario condiviso — toggle + copia link */}
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:10, border:`1px solid ${client.sharedCalendar?'rgba(96,165,250,0.4)':'var(--border2)'}`, background:client.sharedCalendar?'rgba(96,165,250,0.06)':'transparent' }}>
              <button onClick={toggleSharedCalendar}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:client.sharedCalendar?'#60a5fa':'var(--text-3)', padding:0, display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:28, height:16, borderRadius:8, background:client.sharedCalendar?'#60a5fa':'var(--surface3)', position:'relative', transition:'background 200ms' }}>
                  <div style={{ position:'absolute', top:2, left:client.sharedCalendar?14:2, width:12, height:12, borderRadius:'50%', background:'white', transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
                📅 Calendario
              </button>
              {client.sharedCalendar && (
                <>
                  <button onClick={copyCalendarLink}
                    style={{ fontSize:12, color:'#60a5fa', background:'rgba(96,165,250,0.1)', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:5 }}>
                    🔗
                  </button>
                  <button onClick={() => setShowCalSettings(true)}
                    style={{ fontSize:12, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:5 }}>
                    ⚙️
                  </button>
                </>
              )}
            </div>
            <button onClick={() => generateShareLink()}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80',
                background: 'rgba(74,222,128,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🔗 Condividi
            </button>
            <button onClick={() => generateUpdate('wa')}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(37,211,102,0.4)', color: '#25d366',
                background: copied === 'wa' ? 'rgba(37,211,102,0.15)' : 'transparent', cursor: 'pointer', transition: 'all 150ms' }}>
              {copied === 'wa' ? '✅ Copiato!' : '📱 Aggiornamento WA'}
            </button>
            <button onClick={() => generateUpdate('email')}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa',
                background: copied === 'email' ? 'rgba(59,130,246,0.15)' : 'transparent', cursor: 'pointer', transition: 'all 150ms' }}>
              {copied === 'email' ? '✅ Copiato!' : '📧 Aggiornamento Email'}
            </button>
          </div>
        </div>

        {/* Info strip */}
        <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { label: 'Contatto', value: client.contactName || '—' },
            { label: 'Ruolo', value: client.contactRole || '—' },
            { label: 'Telefono', value: client.phone || '—' },
            { label: 'Responsabile', value: client.responsible || '—' },
            { label: 'Dal', value: client.startDate ? new Date(client.startDate).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }) : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Task aperte',      value: openTasks.length,     color: openTasks.length > 0 ? 'var(--text-1)' : '#2ecc71' },
          { label: 'Scadute',          value: overdueTasks.length,  color: overdueTasks.length > 0 ? '#e74c3c' : 'var(--text-3)' },
          { label: 'Scadono in 7gg',   value: dueSoonTasks.length,  color: dueSoonTasks.length > 0 ? '#f5c518' : 'var(--text-3)' },
          { label: 'Editoriale mese',  value: editorial.length,     color: 'var(--text-1)' },
        ].map(k => (
          <div key={k.label} className="card anim-fade-up delay-100" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: '2.4rem', lineHeight: 1, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Budget ore barra ── */}
      {budgetOre > 0 && (
        <div className="card anim-fade-up delay-150" style={{ padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
              Budget ore commessa
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: budgetPct! >= 100 ? '#e74c3c' : budgetPct! >= alertThreshold ? '#f5c518' : '#2ecc71' }}>
              {totalHours.toFixed(1)}h / {budgetOre}h ({budgetPct}%)
            </p>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface3)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 600ms cubic-bezier(.4,0,.2,1)',
              width: `${Math.min(budgetPct! , 100)}%`,
              background: budgetPct! >= 100 ? '#e74c3c' : budgetPct! >= alertThreshold
                ? 'linear-gradient(90deg, #f5c518, #e74c3c)'
                : 'linear-gradient(90deg, var(--brand), #f5c518)',
            }} />
          </div>
          {deal?.budgetEuro && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-3)' }}>
              Valore commessa: € {Number(deal.budgetEuro).toLocaleString('it-IT')}
            </p>
          )}
        </div>
      )}

      {/* ── 3 colonne: Task | Editoriale | Info ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 16 }}>

        {/* ── Task attive ── */}
        <div className="card anim-fade-up delay-200" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
              Task attive ({openTasks.length})
            </p>
            <button onClick={() => router.push(`/tasks?client=${encodeURIComponent(client.name)}`)}
              style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Tutte →
            </button>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ padding: 20, fontSize: 14, color: 'var(--text-3)', textAlign: 'center' }}>Nessuna task aperta 🎉</p>
          ) : (
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {openTasks.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).map(t => {
                const isOverdue = t.dueDate && t.dueDate < today;
                const isDueSoon = t.dueDate && t.dueDate >= today && diffDays(today, t.dueDate) <= 7;
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 18px', borderBottom: '1px solid var(--border)',
                    background: isOverdue ? 'rgba(231,76,60,0.04)' : 'transparent',
                  }}>
                    <button onClick={() => toggleTask(t.id)} style={{
                      width: 16, height: 16, borderRadius: 4, border: '2px solid var(--border2)',
                      background: 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: 1,
                      transition: 'all 150ms',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: isOverdue ? '#f87171' : 'var(--text-1)', fontWeight: 500, lineHeight: 1.3 }}>{t.title}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        {t.dueDate && (
                          <span style={{ fontSize: 12, color: isOverdue ? '#f87171' : isDueSoon ? '#f5c518' : 'var(--text-3)' }}>
                            {isOverdue ? '⚠️ ' : isDueSoon ? '⏰ ' : '📅 '}{t.dueDate}
                          </span>
                        )}
                        {t.responsible && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👤 {t.responsible}</span>}
                        {t.priority && <span style={{ fontSize: 12, color: PRIO_COLOR[t.priority] ?? 'var(--text-3)' }}>● {t.priority}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Piano editoriale mese ── */}
        <div className="card anim-fade-up delay-200" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
              Editoriale mese ({editorial.length})
            </p>
            <button onClick={() => router.push(`/editorial?client=${encodeURIComponent(client.name)}`)}
              style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Piano completo →
            </button>
          </div>
          {editorial.length === 0 ? (
            <p style={{ padding: 20, fontSize: 14, color: 'var(--text-3)', textAlign: 'center' }}>Nessun contenuto pianificato</p>
          ) : (
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {editorial.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).map(e => {
                const dotColor = STATUS_DOT[e.status as ContentStatus] ?? 'var(--text-3)';
                return (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 18px', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, lineHeight: 1.3 }}>
                        {e.platform} · {e.format}
                      </p>
                      {e.caption && (
                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {e.caption}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>📅 {e.scheduledDate}</span>
                        <span style={{ fontSize: 12, color: dotColor, fontWeight: 600 }}>{e.status}</span>
                      </div>
                      {e.status === 'Bloccato' && (e as any).blockedReason && (
                        <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 2 }}>🚫 {(e as any).blockedReason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Info + contatto ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Contatto */}
          <div className="card anim-fade-up delay-300" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 12 }}>Contatto cliente</p>
            {client.contactName ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{client.contactName}</p>
                {client.contactRole && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{client.contactRole}</p>}
                {client.email && (
                  <a href={`mailto:${client.email}`} style={{ display: 'block', marginTop: 8, fontSize: 13, color: 'var(--brand)' }}>{client.email}</a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} style={{ display: 'block', marginTop: 4, fontSize: 13, color: 'var(--text-2)' }}>{client.phone}</a>
                )}
              </>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Nessun contatto salvato</p>
            )}
          </div>

          {/* Commessa attiva */}
          {deal && (
            <div className="card anim-fade-up delay-300" style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 12 }}>Commessa attiva</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{deal.jobType || 'Commessa'}</p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Status: {deal.status || '—'}</p>
              {deal.budgetEuro && (
                <p style={{ fontSize: 13, color: '#2ecc71', marginTop: 4 }}>€ {Number(deal.budgetEuro).toLocaleString('it-IT')}</p>
              )}
              <button onClick={() => router.push('/deals')}
                style={{ marginTop: 10, fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Vedi commessa →
              </button>
            </div>
          )}

          {/* Log ore recenti */}
          {timeLogs.length > 0 && (
            <div className="card anim-fade-up delay-300" style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 10 }}>Ore recenti</p>
              {timeLogs.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 4).map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--text-1)' }}>{l.member}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.date}</p>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', fontFamily: "'Cormorant Garamond',serif" }}>{l.hours}h</p>
                </div>
              ))}
              <button onClick={() => router.push('/timetracking')}
                style={{ marginTop: 6, fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Tutti i log →
              </button>
            </div>
          )}

          {/* Note */}
          {client.notes && (
            <div className="card anim-fade-up delay-300" style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 }}>Note</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal impostazioni calendario ── */}
      {showCalSettings && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setShowCalSettings(false)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, width:'100%', maxWidth:440, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--surface)' }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-1)' }}>⚙️ Impostazioni Calendario Cliente</h3>
              <button onClick={() => setShowCalSettings(false)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Avviso */}
              <div style={{ padding:'10px 14px', borderRadius:9, background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)', fontSize:13, color:'#60a5fa' }}>
                ℹ️ Di default il cliente vede solo <strong>Pubblicato</strong> e <strong>Approvato</strong> — nessun dato interno.
              </div>

              {/* Stati visibili */}
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>Quali stati mostri al cliente?</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {ALL_STATUSES.map(status => {
                    const isEnabled = calSettings.visibleStatuses.includes(status);
                    const isSafe    = ['Pubblicato','Approvato'].includes(status);
                    return (
                      <label key={status} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'8px 12px', borderRadius:9, background:'var(--surface2)', border:`1px solid ${isEnabled ? 'rgba(96,165,250,0.3)' : 'var(--border)'}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:14, color:'var(--text-1)' }}>{status}</span>
                          {isSafe && <span style={{ fontSize:11, color:'#4ade80', padding:'1px 6px', borderRadius:20, background:'rgba(74,222,128,0.1)' }}>sicuro</span>}
                          {!isSafe && <span style={{ fontSize:11, color:'#fbbf24', padding:'1px 6px', borderRadius:20, background:'rgba(251,191,36,0.1)' }}>interno</span>}
                        </div>
                        <div onClick={() => toggleVisibleStatus(status)}
                          style={{ width:32, height:18, borderRadius:9, background:isEnabled?'#60a5fa':'var(--surface3)', border:`1px solid ${isEnabled?'#60a5fa':'var(--border)'}`, position:'relative', cursor:'pointer', transition:'all 200ms' }}>
                          <div style={{ position:'absolute', top:2, left:isEnabled?14:2, width:12, height:12, borderRadius:'50%', background:'white', transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opzioni aggiuntive */}
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>Cosa mostrare nel dettaglio?</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { key:'showCaption', label:'Anteprima caption', sub:'Il cliente vede il testo del post', warn:true },
                    { key:'showTasks',   label:'Scadenze task',      sub:'Mostra le date di consegna interne', warn:true },
                  ].map(opt => {
                    const isOn = calSettings[opt.key as keyof typeof calSettings] as boolean;
                    return (
                      <label key={opt.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'8px 12px', borderRadius:9, background:'var(--surface2)', border:`1px solid ${isOn?'rgba(251,191,36,0.3)':'var(--border)'}` }}>
                        <div>
                          <p style={{ fontSize:14, color:'var(--text-1)' }}>{opt.label}</p>
                          <p style={{ fontSize:12, color:opt.warn?'#fbbf24':'var(--text-3)' }}>{opt.sub}</p>
                        </div>
                        <div onClick={() => setCalSettings(s => ({ ...s, [opt.key]: !isOn }))}
                          style={{ width:32, height:18, borderRadius:9, background:isOn?'#fbbf24':'var(--surface3)', border:`1px solid ${isOn?'#fbbf24':'var(--border)'}`, position:'relative', cursor:'pointer', transition:'all 200ms' }}>
                          <div style={{ position:'absolute', top:2, left:isOn?14:2, width:12, height:12, borderRadius:'50%', background:'white', transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button onClick={() => setShowCalSettings(false)} style={{ padding:'8px 16px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>Annulla</button>
              <button onClick={saveCalSettings} style={{ flex:1, padding:'8px', borderRadius:9, fontSize:14, fontWeight:700, border:'none', background:'#60a5fa', color:'white', cursor:'pointer' }}>
                💾 Salva impostazioni
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal Drive Link ── */}
      {showDriveModal && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setShowDriveModal(false)} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:501, width:'100%', maxWidth:480, background:'var(--surface)',
            border:'1px solid rgba(46,204,113,0.4)', borderRadius:18, padding:'28px',
            boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
          }}>
            <p style={{ fontSize:18, fontWeight:700, color:'var(--text-1)', marginBottom:6, fontFamily:"'Cormorant Garamond',serif" }}>
              📁 Collega cartella Drive
            </p>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20, lineHeight:1.6 }}>
              Incolla il link della cartella Google Drive di <strong style={{ color:'var(--text-1)' }}>{client.name}</strong>.
              Si trova su drive.google.com aprendo la cartella e copiando l'URL.
            </p>
            <input
              type="url"
              value={driveLinkInput}
              onChange={e => setDriveLinkInput(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              autoFocus
              style={{
                width:'100%', padding:'11px 14px', borderRadius:10, fontSize:13,
                border:'1px solid rgba(46,204,113,0.4)', background:'var(--surface2)',
                color:'var(--text-1)', outline:'none', marginBottom:16,
                boxSizing:'border-box', fontFamily:'monospace',
              }}
            />
            {driveLinkInput && !driveLinkInput.startsWith('https://drive.google.com') && (
              <p style={{ fontSize:11, color:'#fbbf24', marginBottom:12 }}>
                ⚠️ Il link dovrebbe iniziare con https://drive.google.com
              </p>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowDriveModal(false)} style={{
                flex:1, padding:'11px', borderRadius:10, border:'1px solid var(--border2)',
                background:'none', color:'var(--text-2)', cursor:'pointer', fontWeight:600, fontSize:13,
              }}>Annulla</button>
              {driveLinkInput && client.driveLink && (
                <button onClick={() => { setDriveLinkInput(''); saveDriveLink(); }} style={{
                  padding:'11px 14px', borderRadius:10, border:'1px solid rgba(248,113,113,0.4)',
                  background:'rgba(248,113,113,0.06)', color:'#f87171', cursor:'pointer', fontSize:13,
                }}>🗑 Rimuovi</button>
              )}
              <button onClick={saveDriveLink} style={{
                flex:2, padding:'11px', borderRadius:10, border:'none',
                background:'#2ecc71', color:'white', cursor:'pointer', fontWeight:800, fontSize:13,
              }}>
                💾 Salva link Drive
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-3)', marginTop:12, lineHeight:1.5 }}>
              💡 Crea prima la cartella su Drive → apri la cartella → copia l'URL dalla barra del browser
            </p>
          </div>
        </>
      )}
    </div>
  );
}
