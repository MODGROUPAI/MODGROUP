'use client';

import { useState, useMemo, useRef } from 'react';
import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';
import { localDateISO } from '@/lib/utils';

// ── helpers ────────────────────────────────────────────────────────────────────

function getDaysOfWeek(offset = 0) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const PRIO_COLOR: Record<string, string> = {
  Alta: '#e74c3c', Urgente: '#e74c3c', Media: '#f5c518', Bassa: '#2ecc71',
};
const STATUS_COLOR: Record<string, string> = {
  'Da fare': 'var(--text-3)', 'In corso': 'var(--brand)',
  'In attesa': '#f5c518', 'Sospesa': '#a78bfa',
};

function memberInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function loadScore(open: number, overdue: number, dueSoon: number): 'free' | 'ok' | 'busy' | 'critical' {
  if (overdue >= 2 || open >= 8) return 'critical';
  if (overdue >= 1 || open >= 5 || dueSoon >= 3) return 'busy';
  if (open >= 2) return 'ok';
  return 'free';
}

const LOAD_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  free:     { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)',   label: '🟢 Libero' },
  ok:       { color: '#3b9eff', bg: 'rgba(59,158,255,0.12)',   label: '🔵 In linea' },
  busy:     { color: '#f5c518', bg: 'rgba(245,197,24,0.12)',   label: '🟡 Carico' },
  critical: { color: '#e74c3c', bg: 'rgba(231,76,60,0.12)',    label: '🔴 Sovraccarico' },
};

// ── componente principale ──────────────────────────────────────────────────────

export default function WorkloadPage() {
  const { data, update } = useData();
  const router = useRouter();
  const today = localDateISO();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'workload' | 'bottleneck'>('overview');
  const [reassignModal, setReassignModal] = useState<{ taskId: string; title: string } | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const dragId = useRef<string | null>(null);
  const [dragOverMember, setDragOverMember] = useState<string | null>(null);

  const days = useMemo(() => getDaysOfWeek(weekOffset), [weekOffset]);
  const activeMembers = useMemo(() =>
    data.teamMembers.filter(m => m.isActive !== false),
    [data.teamMembers]
  );
  const openTasks = useMemo(() =>
    data.tasks.filter(t => !t.isCompleted),
    [data.tasks]
  );

  // ── Dati carico per membro ───────────────────────────────────────────────────
  const memberLoad = useMemo(() => activeMembers.map(m => {
    const tasks = openTasks.filter(t => t.responsible === m.fullName);
    const overdue  = tasks.filter(t => t.dueDate && t.dueDate < today);
    const dueSoon  = tasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= days[4]);
    const inProgress = tasks.filter(t => t.status === 'In corso');
    const score = loadScore(tasks.length, overdue.length, dueSoon.length);
    return { member: m, tasks, overdue, dueSoon, inProgress, score };
  }), [activeMembers, openTasks, today, days]);

  // Task senza responsabile
  const unassignedTasks = useMemo(() =>
    openTasks.filter(t => !t.responsible || t.responsible.trim() === ''),
    [openTasks]
  );

  // ── Workload matrix (membro × giorno) ───────────────────────────────────────
  const workloadMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, typeof openTasks>> = {};
    activeMembers.forEach(m => {
      matrix[m.fullName] = {};
      days.forEach(d => { matrix[m.fullName][d] = []; });
    });
    openTasks.forEach(t => {
      if (t.responsible && t.dueDate && matrix[t.responsible] && days.includes(t.dueDate)) {
        matrix[t.responsible][t.dueDate].push(t);
      }
    });
    return matrix;
  }, [activeMembers, openTasks, days]);

  // ── Bottleneck radar ────────────────────────────────────────────────────────
  const bottlenecks = useMemo(() => {
    const list: { type: string; label: string; tasks: typeof openTasks; severity: 'high' | 'med' | 'low' } = [] as any;
    const results: Array<{ type: string; label: string; tasks: typeof openTasks; severity: 'high' | 'med' | 'low' }> = [];

    // Scadute (severity high)
    const overdue = openTasks.filter(t => t.dueDate && t.dueDate < today);
    if (overdue.length > 0) results.push({ type: 'overdue', label: 'Scadute', tasks: overdue, severity: 'high' });

    // Senza responsabile
    if (unassignedTasks.length > 0) results.push({ type: 'unassigned', label: 'Senza responsabile', tasks: unassignedTasks, severity: 'high' });

    // In attesa da > 3gg (stimate da startDate o senza dueDate)
    const stuck = openTasks.filter(t =>
      t.status === 'In attesa' &&
      t.startDate &&
      Math.round((new Date(today).getTime() - new Date(t.startDate).getTime()) / 86400000) > 3
    );
    if (stuck.length > 0) results.push({ type: 'stuck', label: 'In attesa da > 3 giorni', tasks: stuck, severity: 'med' });

    // Alta priorità non ancora "In corso"
    const highNotStarted = openTasks.filter(t => (t.priority === 'Alta' || t.priority === 'Urgente') && t.status === 'Da fare');
    if (highNotStarted.length > 0) results.push({ type: 'highprio', label: 'Alta priorità non avviate', tasks: highNotStarted, severity: 'med' });

    // Senza data di scadenza
    const noDueDate = openTasks.filter(t => !t.dueDate && !t.isCompleted);
    if (noDueDate.length > 0) results.push({ type: 'nodate', label: 'Senza data di scadenza', tasks: noDueDate, severity: 'low' });

    return results;
  }, [openTasks, unassignedTasks, today]);

  // ── Drag & drop riassegnazione ───────────────────────────────────────────────
  const handleDragStart = (taskId: string) => { dragId.current = taskId; };
  const handleDrop = (memberName: string) => {
    if (!dragId.current) return;
    update({
      tasks: data.tasks.map(t =>
        t.id === dragId.current ? { ...t, responsible: memberName } : t
      ),
    });
    dragId.current = null;
    setDragOverMember(null);
  };

  const handleReassign = () => {
    if (!reassignModal || !reassignTo) return;
    update({
      tasks: data.tasks.map(t =>
        t.id === reassignModal.taskId ? { ...t, responsible: reassignTo } : t
      ),
    });
    setReassignModal(null);
    setReassignTo('');
  };

  // ── helpers render ───────────────────────────────────────────────────────────
  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];
  const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const weekLabel = (() => {
    const f = new Date(days[0]); const l = new Date(days[4]);
    return f.getMonth() === l.getMonth()
      ? `${f.getDate()}–${l.getDate()} ${MONTH_NAMES[f.getMonth()]} ${f.getFullYear()}`
      : `${f.getDate()} ${MONTH_NAMES[f.getMonth()]} – ${l.getDate()} ${MONTH_NAMES[l.getMonth()]}`;
  })();

  const SEV_COLOR = { high: '#e74c3c', med: '#f5c518', low: 'var(--text-3)' };
  const SEV_BG    = { high: 'rgba(231,76,60,0.08)', med: 'rgba(245,197,24,0.08)', low: 'var(--surface2)' };
  const SEV_LABEL = { high: '🔴 Critico', med: '🟡 Attenzione', low: '⚪ Da risolvere' };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Topbar ── */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            Workload Team
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>
            {activeMembers.length} membri attivi · {openTasks.length} task aperte
          </p>
        </div>
        {/* Navigazione settimana (visibile nel tab workload) */}
        {activeTab === 'workload' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', marginRight: 4 }}>{weekLabel}</span>
            <button onClick={() => setWeekOffset(v => v - 1)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>‹</button>
            <button onClick={() => setWeekOffset(0)} style={{ padding: '0 10px', height: 30, borderRadius: 7, border: '1px solid var(--border2)', background: weekOffset === 0 ? 'var(--surface2)' : 'none', color: weekOffset === 0 ? 'var(--brand)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Oggi</button>
            <button onClick={() => setWeekOffset(v => v + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>›</button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'overview',   label: '👥 Carico team' },
          { key: 'workload',   label: '📅 Workload settimanale' },
          { key: 'bottleneck', label: `⚠️ Bottleneck${bottlenecks.length > 0 ? ` (${bottlenecks.reduce((s,b) => s + b.tasks.length, 0)})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              padding: '10px 16px', borderRadius: '8px 8px 0 0', fontSize: 14, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              background: activeTab === tab.key ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--brand)' : 'var(--text-3)',
              borderBottom: activeTab === tab.key ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          TAB 1 — OVERVIEW CARICO TEAM
      ════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Task totali aperte',   value: openTasks.length,           color: 'var(--text-1)' },
              { label: 'Scadute',              value: openTasks.filter(t => t.dueDate && t.dueDate < today).length, color: '#e74c3c' },
              { label: 'Senza responsabile',   value: unassignedTasks.length,     color: '#f5c518' },
              { label: 'Sovraccarichi',        value: memberLoad.filter(m => m.score === 'critical').length, color: '#e74c3c' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 }}>{k.label}</p>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: '2.2rem', lineHeight: 1, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Griglia membri */}
          {activeMembers.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
              <p style={{ color: 'var(--text-3)', fontSize: 15 }}>Nessun membro del team. Aggiungili dalla pagina Team.</p>
              <button onClick={() => router.push('/team')} style={{ marginTop: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Vai al Team →</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {memberLoad.map(({ member: m, tasks, overdue, dueSoon, inProgress, score }) => {
                const ls = LOAD_STYLE[score];
                return (
                  <div key={m.id}
                    onDragOver={e => { e.preventDefault(); setDragOverMember(m.fullName); }}
                    onDragLeave={() => setDragOverMember(null)}
                    onDrop={() => handleDrop(m.fullName)}
                    className="card anim-fade-up"
                    style={{
                      padding: 0, overflow: 'hidden',
                      border: `1px solid ${dragOverMember === m.fullName ? 'var(--brand)' : 'var(--border)'}`,
                      transition: 'border-color 150ms',
                    }}>
                    {/* Header membro */}
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: m.colorHex ?? ls.bg,
                        border: `2px solid ${ls.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: '#1a1a1a',
                      }}>
                        {memberInitials(m.fullName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>{m.fullName}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{m.role || '—'}</p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                        background: ls.bg, color: ls.color, border: `1px solid ${ls.color}44`,
                        whiteSpace: 'nowrap',
                      }}>
                        {ls.label}
                      </span>
                    </div>

                    {/* Metriche */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                      {[
                        { label: 'Aperte',     value: tasks.length,       color: 'var(--text-1)' },
                        { label: 'Scadute',    value: overdue.length,     color: overdue.length > 0 ? '#e74c3c' : 'var(--text-3)' },
                        { label: 'In scadenza',value: dueSoon.length,     color: dueSoon.length > 0 ? '#f5c518' : 'var(--text-3)' },
                      ].map(stat => (
                        <div key={stat.label} style={{ padding: '10px 12px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: '1.6rem', color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Task lista (prime 4) */}
                    <div style={{ padding: '8px 0' }}>
                      {tasks.length === 0 ? (
                        <p style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-3)' }}>Nessuna task assegnata</p>
                      ) : (
                        tasks
                          .sort((a, b) => {
                            if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                            if (a.dueDate) return -1; if (b.dueDate) return 1; return 0;
                          })
                          .slice(0, 4)
                          .map(t => {
                            const isOverdue = t.dueDate && t.dueDate < today;
                            return (
                              <div key={t.id}
                                draggable
                                onDragStart={() => handleDragStart(t.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '6px 16px', cursor: 'grab',
                                  background: isOverdue ? 'rgba(231,76,60,0.04)' : 'transparent',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? 'rgba(231,76,60,0.04)' : 'transparent')}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: PRIO_COLOR[t.priority] ?? 'var(--text-3)' }} />
                                <p style={{ fontSize: 13, color: isOverdue ? '#f87171' : 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                                {t.dueDate && (
                                  <span style={{ fontSize: 11, color: isOverdue ? '#f87171' : 'var(--text-3)', flexShrink: 0 }}>{t.dueDate.slice(5)}</span>
                                )}
                                <button onClick={() => { setReassignModal({ taskId: t.id, title: t.title }); setReassignTo(''); }}
                                  style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', opacity: 0, transition: 'opacity 150ms' }}
                                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                                  title="Riassegna">
                                  ↗
                                </button>
                              </div>
                            );
                          })
                      )}
                      {tasks.length > 4 && (
                        <button onClick={() => router.push(`/tasks?responsible=${encodeURIComponent(m.fullName)}`)}
                          style={{ display: 'block', width: '100%', padding: '6px 16px', textAlign: 'left', fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          +{tasks.length - 4} altre task →
                        </button>
                      )}
                    </div>

                    {/* Drop hint */}
                    {dragOverMember === m.fullName && (
                      <div style={{ padding: '8px 16px', background: 'rgba(242,101,34,0.08)', borderTop: '1px solid rgba(242,101,34,0.3)', fontSize: 13, color: 'var(--brand)', textAlign: 'center' }}>
                        Rilascia per assegnare a {m.fullName}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Card "Non assegnate" */}
              {unassignedTasks.length > 0 && (
                <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden', border: '1px dashed rgba(245,197,24,0.4)' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(245,197,24,0.12)', border: '2px solid #f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>?</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#f5c518' }}>Non assegnate</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{unassignedTasks.length} task senza responsabile</p>
                    </div>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {unassignedTasks.slice(0, 5).map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: PRIO_COLOR[t.priority] ?? 'var(--text-3)', flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                        <button onClick={() => { setReassignModal({ taskId: t.id, title: t.title }); setReassignTo(''); }}
                          style={{ fontSize: 12, color: 'var(--brand)', background: 'rgba(242,101,34,0.1)', border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 6 }}>
                          Assegna
                        </button>
                      </div>
                    ))}
                    {unassignedTasks.length > 5 && (
                      <p style={{ padding: '4px 16px', fontSize: 12, color: 'var(--text-3)' }}>+{unassignedTasks.length - 5} altre</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          TAB 2 — WORKLOAD SETTIMANALE
      ════════════════════════════════ */}
      {activeTab === 'workload' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: 160, padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  Membro
                </th>
                {days.map((d, i) => {
                  const isToday = d === today;
                  const dateObj = new Date(d + 'T12:00:00');
                  return (
                    <th key={d} style={{
                      padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)',
                      background: isToday ? 'rgba(242,101,34,0.06)' : 'transparent',
                      minWidth: 130,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: isToday ? 'var(--brand)' : 'var(--text-3)', letterSpacing: '0.08em' }}>{DAY_NAMES[i]}</p>
                      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 18, color: isToday ? 'var(--brand)' : 'var(--text-1)' }}>{dateObj.getDate()}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activeMembers.map(m => {
                const ls = LOAD_STYLE[memberLoad.find(ml => ml.member.id === m.id)?.score ?? 'free'];
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Membro */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: m.colorHex ?? 'var(--surface3)',
                          border: `2px solid ${ls.color}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: '#1a1a1a', flexShrink: 0,
                        }}>
                          {memberInitials(m.fullName)}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{m.fullName.split(' ')[0]}</p>
                          <p style={{ fontSize: 11, color: ls.color }}>{ls.label}</p>
                        </div>
                      </div>
                    </td>

                    {/* Celle giorni */}
                    {days.map(d => {
                      const cellTasks = workloadMatrix[m.fullName]?.[d] ?? [];
                      const isToday = d === today;
                      const hasOverdue = cellTasks.some(t => t.dueDate && t.dueDate < today);
                      return (
                        <td key={d} style={{
                          padding: '6px 6px', verticalAlign: 'top',
                          background: isToday ? 'rgba(242,101,34,0.04)' : 'transparent',
                          borderLeft: '1px solid var(--border)',
                        }}>
                          {cellTasks.length === 0 ? (
                            <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--text-3)', opacity: 0.4 }}>—</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {cellTasks.slice(0, 3).map(t => (
                                <div key={t.id}
                                  draggable
                                  onDragStart={() => handleDragStart(t.id)}
                                  style={{
                                    padding: '4px 7px', borderRadius: 5,
                                    background: `${PRIO_COLOR[t.priority] ?? 'var(--text-3)'}15`,
                                    border: `1px solid ${PRIO_COLOR[t.priority] ?? 'var(--text-3)'}30`,
                                    cursor: 'grab',
                                  }}
                                >
                                  <p style={{ fontSize: 12, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{t.title}</p>
                                  {t.clientName && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.clientName}</p>}
                                </div>
                              ))}
                              {cellTasks.length > 3 && (
                                <p style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 6px' }}>+{cellTasks.length - 3}</p>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeMembers.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 13 }}>Nessun membro del team configurato.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          TAB 3 — BOTTLENECK RADAR
      ════════════════════════════════ */}
      {activeTab === 'bottleneck' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bottlenecks.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>✅</p>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: '#2ecc71', marginBottom: 6 }}>Nessun bottleneck</p>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Tutte le task sono assegnate, in corso e senza ritardi.</p>
            </div>
          ) : (
            bottlenecks.map(bn => (
              <div key={bn.type} className="card anim-fade-up" style={{
                padding: 0, overflow: 'hidden',
                border: `1px solid ${SEV_COLOR[bn.severity]}33`,
              }}>
                {/* Header sezione */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px', background: SEV_BG[bn.severity],
                  borderBottom: `1px solid ${SEV_COLOR[bn.severity]}22`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: SEV_COLOR[bn.severity], background: `${SEV_COLOR[bn.severity]}20`, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {SEV_LABEL[bn.severity]}
                  </span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{bn.label}</p>
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: SEV_COLOR[bn.severity], fontWeight: 700 }}>
                    {bn.tasks.length} task
                  </span>
                </div>

                {/* Lista task */}
                <div>
                  {bn.tasks.slice(0, 8).map(t => {
                    const isOverdue = t.dueDate && t.dueDate < today;
                    return (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 18px', borderBottom: '1px solid var(--border)',
                      }}>
                        {/* Prio dot */}
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIO_COLOR[t.priority] ?? 'var(--text-3)', flexShrink: 0 }} />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                            {t.clientName && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>🏢 {t.clientName}</span>}
                            {t.responsible && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👤 {t.responsible}</span>}
                            {t.dueDate && <span style={{ fontSize: 12, color: isOverdue ? '#f87171' : 'var(--text-3)' }}>📅 {t.dueDate}</span>}
                            {t.status && <span style={{ fontSize: 12, color: STATUS_COLOR[t.status] ?? 'var(--text-3)' }}>● {t.status}</span>}
                          </div>
                        </div>

                        {/* Azioni rapide */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => { setReassignModal({ taskId: t.id, title: t.title }); setReassignTo(t.responsible ?? ''); }}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>
                            Riassegna
                          </button>
                          <button onClick={() => update({ tasks: data.tasks.map(task => task.id === t.id ? { ...task, status: 'In corso' } : task) })}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid rgba(242,101,34,0.4)', background: 'transparent', color: 'var(--brand)', cursor: 'pointer' }}>
                            Avvia
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {bn.tasks.length > 8 && (
                    <button onClick={() => router.push('/tasks')}
                      style={{ display: 'block', width: '100%', padding: '10px 18px', textAlign: 'left', fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--border)' }}>
                      Vedi tutte le {bn.tasks.length} task →
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Modal riassegna ── */}
      {reassignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setReassignModal(null); }}>
          <div className="card" style={{ padding: '28px 32px', width: 380, maxWidth: '90vw', borderRadius: 18 }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Riassegna task</p>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.5 }}>{reassignModal.title}</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 6 }}>Assegna a</label>
            <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} className="input" style={{ marginBottom: 20 }}>
              <option value="">— Seleziona membro —</option>
              {activeMembers.map(m => <option key={m.id} value={m.fullName}>{m.fullName} ({m.role})</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setReassignModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }}>Annulla</button>
              <button onClick={handleReassign} disabled={!reassignTo} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--brand)', color: 'white', border: 'none', cursor: reassignTo ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, opacity: reassignTo ? 1 : 0.4 }}>
                Assegna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
