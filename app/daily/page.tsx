'use client';

import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function localToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function daysFromNow(isoDate: string) {
  const today = localToday();
  const d = new Date(isoDate); d.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function PriorityDot({ p }: { p: string }) {
  const colors: Record<string, string> = {
    'Urgente': '#e74c3c',
    'Alta':    '#f39c12',
    'Media':   '#3b9eff',
    'Bassa':   '#555',
  };
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[p] ?? '#555', display: 'inline-block', flexShrink: 0 }} />;
}

function SectionTitle({ emoji, title, count }: { emoji: string; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ fontSize: 17 }}>{emoji}</span>
      <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-3)' }}>{title}</span>
      {count !== undefined && count > 0 && (
        <span style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', borderRadius: 4, fontSize: 12, fontWeight: 700, padding: '1px 6px' }}>{count}</span>
      )}
    </div>
  );
}

export default function DailyBriefPage() {
  const { data, loaded } = useData();
  const router = useRouter();
  const [todayLabel, setTodayLabel] = useState('');
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTodayLabel(dayLabel(new Date()));
    const key = new Date().toISOString().split('T')[0];
    const savedDay = localStorage.getItem('pmo_daily_date');
    if (savedDay !== key) {
      localStorage.setItem('pmo_daily_date', key);
      localStorage.removeItem('pmo_daily_checked');
      setCheckedTasks(new Set());
    } else {
      try { setCheckedTasks(new Set(JSON.parse(localStorage.getItem('pmo_daily_checked') ?? '[]'))); } catch {}
    }
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('pmo_daily_checked', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  if (!loaded) return <div style={{ color: 'var(--text-3)', padding: 48, textAlign: 'center', fontSize: 15 }}>Caricamento…</div>;

  const today = localToday();
  const todayISO = today.toISOString().split('T')[0];

  // ── 1. Task urgenti / scadute oggi ──────────────────────────
  const urgentTasks = data.tasks
    .filter(t => !t.isCompleted)
    .filter(t => {
      if (!t.dueDate) return t.priority === 'Urgente';
      const d = daysFromNow(t.dueDate);
      return d <= 0 || t.priority === 'Urgente';
    })
    .sort((a, b) => {
      const order = ['Urgente','Alta','Media','Bassa'];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    })
    .slice(0, 8);

  // ── 2. Editoriale oggi ───────────────────────────────────────
  const editorialToday = (data.editorialContent ?? []).filter(e => {
    if (e.status === 'Pubblicato') return false;
    if (e.scheduledDate === todayISO) return true;
    if (e.status === 'In revisione' && e.waitingSince) {
      const days = (today.getTime() - new Date(e.waitingSince).getTime()) / 86400000;
      return days >= 2;
    }
    return false;
  }).slice(0, 6);

  // ── 3. Scadenze prossimi 3gg ─────────────────────────────────
  const upcoming = data.tasks
    .filter(t => !t.isCompleted && t.dueDate)
    .filter(t => { const d = daysFromNow(t.dueDate!); return d > 0 && d <= 3; })
    .sort((a, b) => daysFromNow(a.dueDate!) - daysFromNow(b.dueDate!))
    .slice(0, 6);

  // ── 4. Client Health ─────────────────────────────────────────
  const activeClients = data.clients.filter(c => c.status === 'Attivo');
  const clientHealth = activeClients.map(c => {
    const tasks = data.tasks.filter(t => !t.isCompleted && t.clientName?.toLowerCase() === c.name.toLowerCase());
    const overdueTasks = tasks.filter(t => t.dueDate && daysFromNow(t.dueDate) < 0);
    const waitingEd = (data.editorialContent ?? []).filter(e =>
      e.clientName?.toLowerCase() === c.name.toLowerCase() &&
      e.status === 'In revisione' && e.waitingSince &&
      (today.getTime() - new Date(e.waitingSince).getTime()) / 86400000 >= 2
    );
    const deal = data.deals.find(d => d.companyName.toLowerCase() === c.name.toLowerCase());
    let budgetPct = 0;
    if (deal?.budgetOre) {
      const used = data.timeLogs.filter(l => l.clientName?.toLowerCase() === c.name.toLowerCase()).reduce((s, l) => s + l.hours, 0);
      budgetPct = Math.round((used / deal.budgetOre) * 100);
    }
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (overdueTasks.length > 0 || budgetPct >= 100) status = 'red';
    else if (waitingEd.length > 0 || budgetPct >= 80 || tasks.length > 4) status = 'yellow';
    return { client: c, tasks, overdueTasks, waitingEd, budgetPct, status, deal };
  }).sort((a, b) => ({ red: 0, yellow: 1, green: 2 }[a.status] - { red: 0, yellow: 1, green: 2 }[b.status]));

  // ── 5. Lead caldi ────────────────────────────────────────────
  const hotLeads = data.leads
    .filter(l => l.quoteSent && l.statusContact !== 'Chiuso' && l.statusContact !== 'Inattivo')
    .slice(0, 4);

  // Completion
  const allCheckable = [...urgentTasks.map(t => t.id), ...editorialToday.map(e => e.id)];
  const doneItems = allCheckable.filter(id => checkedTasks.has(id)).length;
  const totalItems = allCheckable.length;
  const completionPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 100;

  const statusColor = { green: '#2ecc71', yellow: '#f5c518', red: '#e74c3c' };
  const circumference = 2 * Math.PI * 26;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Daily Brief</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1, marginBottom: 4, textTransform: 'capitalize' }}>
              {todayLabel || '…'}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-3)' }}>Ecco cosa conta oggi.</p>
          </div>

          {/* Ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface3)" strokeWidth="5" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke={completionPct === 100 ? '#2ecc71' : completionPct > 50 ? 'var(--brand)' : '#e74c3c'}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={`${circumference * (1 - completionPct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                {completionPct}%
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{doneItems}/{totalItems}</span>
          </div>
        </div>

        {totalItems > 0 && (
          <div style={{ marginTop: 16, height: 3, background: 'var(--surface3)', borderRadius: 99 }}>
            <div style={{ height: 3, borderRadius: 99, width: `${completionPct}%`, background: completionPct === 100 ? '#2ecc71' : 'linear-gradient(90deg,var(--brand),var(--brand-light))', transition: 'width 0.4s ease' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>

        {/* COL SX */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Task urgenti */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: '20px 20px 16px' }}>
            <SectionTitle emoji="🔥" title="Da fare oggi" count={urgentTasks.filter(t => !checkedTasks.has(t.id)).length} />
            {urgentTasks.length === 0
              ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Nessun task urgente. Ottimo.</p>
              : urgentTasks.map(t => {
                  const done = checkedTasks.has(t.id);
                  const daysLeft = t.dueDate ? daysFromNow(t.dueDate) : null;
                  return (
                    <button key={t.id} onClick={() => toggleCheck(t.id)}
                      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 6px', borderRadius: 8, marginBottom: 2, background: done ? 'rgba(46,204,113,0.05)' : 'transparent', border: 'none', cursor: 'pointer', opacity: done ? 0.5 : 1, transition: 'opacity 150ms' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2, border: `2px solid ${done ? '#2ecc71' : 'var(--border2)'}`, background: done ? '#2ecc71' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', transition: 'all 150ms' }}>
                        {done ? '✓' : ''}
                      </span>
                      <PriorityDot p={t.priority} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.3 }}>{t.title}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                          {t.clientName || '—'}{t.responsible ? ` · ${t.responsible}` : ''}
                          {daysLeft !== null && daysLeft < 0 && <span style={{ color: '#e74c3c', marginLeft: 6, fontWeight: 700 }}>▲ {Math.abs(daysLeft)}gg ritardo</span>}
                          {daysLeft === 0 && <span style={{ color: 'var(--brand)', marginLeft: 6, fontWeight: 700 }}>Scade oggi</span>}
                        </p>
                      </div>
                    </button>
                  );
                })
            }
            <button onClick={() => router.push('/tasks')} style={{ marginTop: 12, fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Vai al tracker →
            </button>
          </div>

          {/* Scadenze 72h */}
          {upcoming.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: '20px 20px 16px' }}>
              <SectionTitle emoji="📅" title="Scadenze 72h" />
              {upcoming.map(t => {
                const d = daysFromNow(t.dueDate!);
                return (
                  <button key={t.id} onClick={() => router.push('/tasks')}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderBottom: '1px solid var(--border)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <PriorityDot p={t.priority} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, color: 'var(--text-1)', fontWeight: 500 }}>{t.title}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.clientName || '—'}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d === 1 ? 'var(--brand)' : 'var(--text-3)', flexShrink: 0 }}>
                      {d === 1 ? 'Domani' : `${d}gg`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Lead */}
          {hotLeads.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: '20px 20px 16px' }}>
              <SectionTitle emoji="💼" title="Lead da seguire" count={hotLeads.length} />
              {hotLeads.map(l => (
                <button key={l.id} onClick={() => router.push('/leads')}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid var(--border)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{l.companyName}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{l.serviceType || l.source || '—'}</p>
                  </div>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(245,197,24,0.12)', color: '#f5c518', fontWeight: 700, flexShrink: 0 }}>Preventivo inviato</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COL DX */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Editoriale */}
          {editorialToday.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: '20px 20px 16px' }}>
              <SectionTitle emoji="📣" title="Editoriale oggi" count={editorialToday.filter(e => !checkedTasks.has(e.id)).length} />
              {editorialToday.map(e => {
                const done = checkedTasks.has(e.id);
                const isWaiting = e.status === 'In revisione';
                return (
                  <button key={e.id} onClick={() => toggleCheck(e.id)}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 6px', borderRadius: 8, marginBottom: 2, background: done ? 'rgba(46,204,113,0.05)' : 'transparent', border: 'none', cursor: 'pointer', opacity: done ? 0.5 : 1 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2, border: `2px solid ${done ? '#2ecc71' : 'var(--border2)'}`, background: done ? '#2ecc71' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', transition: 'all 150ms' }}>
                      {done ? '✓' : ''}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', textDecoration: done ? 'line-through' : 'none' }}>{e.clientName} — {e.format}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                        {e.platform}
                        {isWaiting && <span style={{ color: '#f5c518', marginLeft: 6 }}>⏳ Attesa approvazione</span>}
                        {!isWaiting && <span style={{ color: 'var(--brand)', marginLeft: 6 }}>Da pubblicare</span>}
                      </p>
                    </div>
                  </button>
                );
              })}
              <button onClick={() => router.push('/editorial')} style={{ marginTop: 12, fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Vai al piano editoriale →
              </button>
            </div>
          )}

          {/* Client Health */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: '20px 20px 16px' }}>
            <SectionTitle emoji="🟢" title="Stato clienti" />
            {clientHealth.length === 0
              ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Nessun cliente attivo.</p>
              : clientHealth.map(({ client, tasks, overdueTasks, waitingEd, budgetPct, status, deal }) => (
                <button key={client.id} onClick={() => router.push('/clients')}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', borderBottom: '1px solid var(--border)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor[status], flexShrink: 0, boxShadow: `0 0 6px ${statusColor[status]}66` }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{client.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>
                      {tasks.length} task aperti
                      {overdueTasks.length > 0 && <span style={{ color: '#e74c3c', marginLeft: 6 }}>· {overdueTasks.length} in ritardo</span>}
                      {waitingEd.length > 0 && <span style={{ color: '#f5c518', marginLeft: 6 }}>· {waitingEd.length} ed. bloccati</span>}
                    </p>
                  </div>
                  {deal?.budgetOre ? (
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: budgetPct >= 100 ? '#e74c3c' : budgetPct >= 80 ? '#f5c518' : 'var(--text-3)' }}>{budgetPct}%</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>budget</p>
                    </div>
                  ) : null}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      {/* Done state */}
      {completionPct === 100 && totalItems > 0 && (
        <div style={{ marginTop: 32, textAlign: 'center', padding: 24, background: 'rgba(46,204,113,0.06)', borderRadius: 16, border: '1px solid rgba(46,204,113,0.2)' }}>
          <p style={{ fontSize: 24 }}>✅</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#2ecc71', marginTop: 8 }}>Daily brief completato.</p>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Tutto fatto per oggi.</p>
        </div>
      )}
    </div>
  );
}
