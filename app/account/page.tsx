'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';

function getDaysOfWeek(offset: number): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const DAY_NAMES  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const PRIO_COLOR: Record<string, string> = { Alta:'#f87171', Urgente:'#ff4444', Media:'#fbbf24', Bassa:'#4ade80' };
const STATUS_COLOR: Record<string, string> = {
  'Da fare':'var(--text-3)', 'In produzione':'#60a5fa', 'Bloccato':'#f87171',
  'In revisione':'#fbbf24', 'Approvato':'#4ade80', 'Pubblicato':'#22c55e', 'Rimandato':'#f87171',
};

export default function AccountDashboardPage() {
  const { data }  = useData();
  const router    = useRouter();
  const today     = localDateISO();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [view, setView] = useState<'settimana' | 'lista'>('settimana');

  const days     = useMemo(() => getDaysOfWeek(weekOffset), [weekOffset]);
  const workdays = days.slice(0, 5);

  // Lista account manager (da teamMembers)
  const accounts = useMemo(() =>
    data.teamMembers.filter(m => m.isActive &&
      ['Account', 'Senior Account', 'Account Manager', 'Project Manager'].some(r =>
        m.role.toLowerCase().includes(r.toLowerCase())
      )
    ), [data.teamMembers]
  );

  // Se non ci sono account con ruolo specifico, usa tutti i membri
  const members = accounts.length > 0 ? accounts : data.teamMembers.filter(m => m.isActive);

  const weekLabel = (() => {
    const first = new Date(days[0]);
    const last  = new Date(days[6]);
    if (first.getMonth() === last.getMonth())
      return `${first.getDate()}–${last.getDate()} ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;
  })();

  // Per ogni membro: clienti assegnati + task + scadenze + alert
  const accountData = useMemo(() => {
    return members
      .filter(m => !selectedAccount || m.fullName === selectedAccount)
      .map(member => {
        // Clienti assegnati
        const myClients = data.clients.filter(c =>
          c.status === 'Attivo' && (
            c.responsible === member.fullName ||
            c.responsibleId === member.id
          )
        );

        // Task assegnati questa settimana (in scadenza)
        const myTasks = data.tasks.filter(t =>
          !t.isCompleted &&
          (t.responsible === member.fullName || t.responsibleId === member.id) &&
          t.dueDate &&
          t.dueDate >= days[0] && t.dueDate <= days[6]
        );

        // Task in ritardo
        const overdue = data.tasks.filter(t =>
          !t.isCompleted &&
          (t.responsible === member.fullName || t.responsibleId === member.id) &&
          t.dueDate && t.dueDate < today
        );

        // Task totali aperti (non solo questa settimana)
        const allOpenTasks = data.tasks.filter(t =>
          !t.isCompleted &&
          (t.responsible === member.fullName || t.responsibleId === member.id)
        );

        // Contenuti in revisione (aspettano feedback)
        const pendingReview = (data.editorialContent ?? []).filter(e =>
          (e.responsible === member.fullName || e.responsibleId === member.id) &&
          (e.status === 'In revisione' || e.status === 'Bloccato')
        );

        // Task per giorno (questa settimana)
        const tasksByDay: Record<string, typeof myTasks> = {};
        workdays.forEach(d => {
          tasksByDay[d] = myTasks.filter(t => t.dueDate === d);
        });

        // Alert level
        const alertLevel = overdue.length > 0 ? 'red' : myTasks.filter(t => t.priority === 'Alta' || t.priority === 'Urgente').length > 0 ? 'yellow' : 'green';

        return { member, myClients, myTasks, overdue, allOpenTasks, pendingReview, tasksByDay, alertLevel };
      });
  }, [members, selectedAccount, data, days, workdays, today]);

  // KPI globali
  const globalKpi = useMemo(() => ({
    totalOverdue:  accountData.reduce((s, a) => s + a.overdue.length, 0),
    totalThisWeek: accountData.reduce((s, a) => s + a.myTasks.length, 0),
    totalPending:  accountData.reduce((s, a) => s + a.pendingReview.length, 0),
    totalClients:  data.clients.filter(c => c.status === 'Attivo').length,
  }), [accountData, data.clients]);

  const alertColor = { red: '#f87171', yellow: '#fbbf24', green: '#4ade80' };

  return (
    <div style={{ padding: '28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            Scadenze Account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>{weekLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtro account */}
          <select className="input" style={{ fontSize: 14, width: 180 }}
            value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            <option value="">Tutti gli account</option>
            {members.map(m => <option key={m.id} value={m.fullName}>{m.fullName}</option>)}
          </select>

          {/* Vista toggle */}
          {['settimana','lista'].map(v => (
            <button key={v} onClick={() => setView(v as typeof view)} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${view === v ? 'var(--brand)' : 'var(--border2)'}`,
              background: view === v ? 'rgba(242,101,34,0.1)' : 'transparent',
              color: view === v ? 'var(--brand)' : 'var(--text-3)',
            }}>
              {v === 'settimana' ? '📅 Settimana' : '📋 Lista'}
            </button>
          ))}

          {/* Navigazione */}
          <button onClick={() => setWeekOffset(0)} style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>Oggi</button>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 15, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>‹</button>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 15, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>›</button>
        </div>
      </div>

      {/* KPI strip globale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'In ritardo', val: globalKpi.totalOverdue, color: globalKpi.totalOverdue > 0 ? '#f87171' : '#4ade80' },
          { label: 'Questa settimana', val: globalKpi.totalThisWeek, color: '#60a5fa' },
          { label: 'In revisione / bloccati', val: globalKpi.totalPending, color: globalKpi.totalPending > 0 ? '#fbbf24' : 'var(--text-3)' },
          { label: 'Clienti attivi', val: globalKpi.totalClients, color: 'var(--text-2)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{k.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: k.color, fontFamily: "'Cormorant Garamond',serif" }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Account cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {accountData.map(({ member, myClients, overdue, allOpenTasks, pendingReview, tasksByDay, alertLevel }) => (
          <div key={member.id} style={{
            background: 'var(--surface)', border: `1px solid ${overdue.length > 0 ? 'rgba(248,113,113,0.3)' : 'var(--border2)'}`,
            borderRadius: 16, overflow: 'hidden',
          }}>
            {/* Account header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: `${member.colorHex}22`, border: `2px solid ${member.colorHex}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 17, color: member.colorHex,
              }}>
                {member.fullName.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{member.fullName}</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{member.role} · {myClients.length} clienti attivi</p>
              </div>

              {/* Badge alert */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {overdue.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                    ⚠️ {overdue.length} in ritardo
                  </span>
                )}
                {pendingReview.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                    ⏳ {pendingReview.length} in revisione
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                  {allOpenTasks.length} task aperti
                </span>
              </div>
            </div>

            {/* Vista SETTIMANA */}
            {view === 'settimana' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
                {workdays.map((day, di) => {
                  const dayTasks = tasksByDay[day] ?? [];
                  const isToday  = day === today;
                  return (
                    <div key={day} style={{
                      borderRight: di < 4 ? '1px solid var(--border)' : 'none',
                      minHeight: 120, padding: '10px 12px',
                      background: isToday ? 'rgba(242,101,34,0.04)' : 'transparent',
                    }}>
                      {/* Day label */}
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--brand)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {DAY_NAMES[di]}
                        </span>
                        <span style={{ fontSize: 12, color: isToday ? 'var(--brand)' : 'var(--text-3)' }}>
                          {new Date(day).getDate()}
                        </span>
                        {isToday && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand)', marginLeft: 2 }} />}
                      </div>

                      {/* Task del giorno */}
                      {dayTasks.length === 0 ? (
                        <div style={{ height: 30 }} />
                      ) : (
                        dayTasks.map(t => (
                          <div key={t.id} style={{
                            marginBottom: 5, padding: '5px 8px', borderRadius: 7,
                            background: 'var(--surface2)', border: `1px solid ${PRIO_COLOR[t.priority] ?? 'var(--border)'}22`,
                            borderLeft: `3px solid ${PRIO_COLOR[t.priority] ?? 'var(--border)'}`,
                          }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 2 }}>{t.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.clientName}</p>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vista LISTA */}
            {view === 'lista' && (
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Task in ritardo */}
                {overdue.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171', minWidth: 60 }}>RITARDO</span>
                    <span style={{ fontSize: 14, color: 'var(--text-1)', flex: 1 }}>{t.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.clientName}</span>
                    <span style={{ fontSize: 12, color: '#f87171' }}>{t.dueDate}</span>
                  </div>
                ))}
                {/* Task questa settimana */}
                {Object.entries(tasksByDay).flatMap(([day, tasks]) =>
                  tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: day === today ? 'var(--brand)' : 'var(--text-3)', minWidth: 60 }}>
                        {DAY_NAMES[workdays.indexOf(day)]} {new Date(day).getDate()}
                      </span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIO_COLOR[t.priority] ?? 'var(--border)', flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', flex: 1 }}>{t.title}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.clientName}</span>
                    </div>
                  ))
                )}
                {overdue.length === 0 && Object.values(tasksByDay).every(t => t.length === 0) && (
                  <p style={{ fontSize: 14, color: 'var(--text-3)', padding: '8px 0' }}>✅ Nessuna scadenza questa settimana</p>
                )}
              </div>
            )}

            {/* Footer: clienti assegnati + link briefing */}
            {myClients.length > 0 && (
              <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Clienti:</span>
                {myClients.map(c => (
                  <button key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                    style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text-2)', cursor: 'pointer' }}>
                    {c.name}
                  </button>
                ))}
                <button onClick={() => router.push(`/clients/${myClients[0]?.id}/briefing`)}
                  style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.06)', color: '#60a5fa', cursor: 'pointer' }}>
                  🗓 Brief riunione →
                </button>
              </div>
            )}
          </div>
        ))}

        {accountData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
            <p style={{ fontSize: 16 }}>Nessun account trovato. Aggiungi membri del team con ruolo Account.</p>
          </div>
        )}
      </div>
    </div>
  );
}
