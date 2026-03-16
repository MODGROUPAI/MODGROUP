'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';
import { localDateISO } from '@/lib/utils';

type DayEvent = {
  id: string;
  type: 'task' | 'editorial';
  label: string;
  client: string;
  sub?: string;
  color: string;
  urgent?: boolean;
};

const EDITORIAL_STATUS_COLOR: Record<string, string> = {
  'Da fare': 'var(--text-3)', 'In produzione': '#60a5fa',
  'Bloccato': '#fca5a5', 'In revisione': '#fde68a',
  'Approvato': '#4ade80', 'Pubblicato': '#22c55e', 'Rimandato': '#f87171',
};

const CLIENT_PALETTE = [
  '#F26522','#3b9eff','#2ecc71','#a855f7','#f5c518','#e91e8c','#00bcd4','#ff7043',
];

function getClientColor(name: string, palette: Record<string, string>) {
  return palette[name] ?? 'var(--brand)';
}

function getDaysOfWeek(weekOffset: number) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = domenica
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export default function ClientAgendaPage() {
  const { data } = useData();
  const router = useRouter();
  const today = localDateISO();

  const [weekOffset, setWeekOffset] = useState(0);
  const [filterClient, setFilterClient] = useState('');
  const [showWeekends, setShowWeekends] = useState(false);

  const days = useMemo(() => getDaysOfWeek(weekOffset), [weekOffset]);
  const visibleDays = showWeekends ? days : days.slice(0, 5);

  // Mappa colori clienti
  const clientNames = useMemo(() =>
    [...new Set(data.clients.filter(c => c.status === 'Attivo').map(c => c.name))],
    [data.clients]
  );
  const clientColors = useMemo(() => {
    const map: Record<string, string> = {};
    clientNames.forEach((name, i) => { map[name] = CLIENT_PALETTE[i % CLIENT_PALETTE.length]; });
    return map;
  }, [clientNames]);

  // Aggrega eventi per giorno
  const eventsByDay = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};
    visibleDays.forEach(d => { map[d] = []; });

    // Task con dueDate nella finestra
    data.tasks.filter(t =>
      !t.isCompleted &&
      t.dueDate &&
      visibleDays.includes(t.dueDate) &&
      (!filterClient || t.clientName === filterClient)
    ).forEach(t => {
      const color = clientColors[t.clientName ?? ''] ?? 'var(--brand)';
      map[t.dueDate!].push({
        id: t.id, type: 'task',
        label: t.title,
        client: t.clientName ?? '—',
        sub: t.responsible ? `👤 ${t.responsible}` : undefined,
        color,
        urgent: t.priority === 'Alta',
      });
    });

    // Contenuti editoriali pianificati in questa settimana
    (data.editorialContent ?? []).filter(e =>
      visibleDays.includes(e.scheduledDate) &&
      (!filterClient || e.clientName === filterClient)
    ).forEach(e => {
      const color = EDITORIAL_STATUS_COLOR[e.status] ?? 'var(--text-3)';
      map[e.scheduledDate].push({
        id: e.id, type: 'editorial',
        label: `${e.platform} · ${e.format}`,
        client: e.clientName,
        sub: e.status,
        color,
        urgent: e.status === 'Bloccato',
      });
    });

    return map;
  }, [data.tasks, data.editorialContent, visibleDays, filterClient, clientColors]);

  const totalEvents = useMemo(() =>
    Object.values(eventsByDay).reduce((s, ev) => s + ev.length, 0),
    [eventsByDay]
  );

  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  const weekLabel = (() => {
    const first = new Date(days[0]);
    const last  = new Date(days[6]);
    if (first.getMonth() === last.getMonth())
      return `${first.getDate()}–${last.getDate()} ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`;
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            Agenda Clienti
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>
            {weekLabel} · {totalEvents} eventi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtro cliente */}
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="input"
            style={{ width: 180, fontSize: 14 }}>
            <option value="">Tutti i clienti</option>
            {clientNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Weekend toggle */}
          <button onClick={() => setShowWeekends(v => !v)}
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${showWeekends ? 'var(--brand)' : 'var(--border2)'}`,
              background: showWeekends ? 'var(--brand-dim)' : 'transparent',
              color: showWeekends ? 'var(--brand)' : 'var(--text-3)',
              transition: 'all 150ms',
            }}>
            Weekend
          </button>

          {/* Navigazione settimane */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setWeekOffset(v => v - 1)}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 18 }}>
              ‹
            </button>
            <button onClick={() => setWeekOffset(0)}
              style={{ padding: '0 12px', height: 32, borderRadius: 8, border: '1px solid var(--border2)', background: weekOffset === 0 ? 'var(--surface2)' : 'none', color: weekOffset === 0 ? 'var(--brand)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Oggi
            </button>
            <button onClick={() => setWeekOffset(v => v + 1)}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 18 }}>
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Legenda clienti */}
      {!filterClient && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {clientNames.filter(c => Object.values(eventsByDay).flat().some(e => e.client === c)).map(c => (
            <button key={c} onClick={() => setFilterClient(c)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${clientColors[c]}44`, background: `${clientColors[c]}12`, color: clientColors[c] }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: clientColors[c] }} />
              {c}
            </button>
          ))}
        </div>
      )}
      {filterClient && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setFilterClient('')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text-2)' }}>
            ✕ {filterClient}
          </button>
        </div>
      )}

      {/* Griglia settimana */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)`, gap: 8 }}>
        {visibleDays.map((day, i) => {
          const isToday = day === today;
          const isPast = day < today;
          const events = eventsByDay[day] ?? [];
          const dateObj = new Date(day + 'T12:00:00');
          const hasUrgent = events.some(e => e.urgent);

          return (
            <div key={day} style={{
              background: isToday ? 'rgba(242,101,34,0.06)' : 'var(--surface)',
              border: `1px solid ${isToday ? 'rgba(242,101,34,0.35)' : hasUrgent ? 'rgba(231,76,60,0.25)' : 'var(--border)'}`,
              borderRadius: 14, overflow: 'hidden',
              opacity: isPast ? 0.7 : 1,
              transition: 'all 150ms',
              minHeight: 120,
            }}>
              {/* Day header */}
              <div style={{
                padding: '10px 12px 8px',
                borderBottom: `1px solid ${isToday ? 'rgba(242,101,34,0.2)' : 'var(--border)'}`,
                background: isToday ? 'rgba(242,101,34,0.08)' : 'transparent',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isToday ? 'var(--brand)' : 'var(--text-3)' }}>
                  {DAY_NAMES[i]}
                </p>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 22, lineHeight: 1, color: isToday ? 'var(--brand)' : isPast ? 'var(--text-3)' : 'var(--text-1)' }}>
                  {dateObj.getDate()}
                </p>
                {events.length > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{events.length} evento{events.length !== 1 ? 'i' : ''}</p>
                )}
              </div>

              {/* Events */}
              <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {events.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0', opacity: 0.5 }}>—</p>
                ) : (
                  events.map(ev => (
                    <div key={ev.id}
                      onClick={() => ev.type === 'task' ? router.push('/tasks') : router.push('/editorial')}
                      style={{
                        padding: '6px 8px', borderRadius: 7, cursor: 'pointer',
                        background: `${ev.color}14`,
                        border: `1px solid ${ev.color}30`,
                        transition: 'all 120ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${ev.color}25`)}
                      onMouseLeave={e => (e.currentTarget.style.background = `${ev.color}14`)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span style={{ fontSize: 11 }}>{ev.type === 'task' ? '☑️' : '📣'}</span>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ev.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {ev.label}
                        </p>
                        {ev.urgent && <span style={{ fontSize: 11, color: '#e74c3c' }}>!</span>}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.client}
                      </p>
                      {ev.sub && (
                        <p style={{ fontSize: 11, color: 'var(--text-3)', opacity: 0.7 }}>{ev.sub}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: totali per cliente */}
      {totalEvents > 0 && (
        <div className="card" style={{ marginTop: 16, padding: '14px 18px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 10 }}>
            Riepilogo settimana
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {clientNames.map(c => {
              const count = Object.values(eventsByDay).flat().filter(e => e.client === c).length;
              if (!count) return null;
              return (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColors[c] }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
