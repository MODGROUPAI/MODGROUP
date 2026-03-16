'use client';
import { localDateISO, addDaysISO } from '@/lib/utils';

import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

type EventType = 'task-overdue' | 'task-urgent' | 'task-alta' | 'task-normal' | 'deal' | 'quote';

interface CalEvent {
  id: string;
  date: string;
  label: string;
  sub?: string;
  type: EventType;
  href: string;
}

const EVENT_STYLE: Record<EventType, { bg: string; color: string; dot: string }> = {
  'task-overdue': { bg: 'rgba(231,76,60,0.18)',  color: '#f87171', dot: '#e74c3c' },
  'task-urgent':  { bg: 'rgba(231,76,60,0.12)',  color: '#fca5a5', dot: '#e74c3c' },
  'task-alta':    { bg: 'rgba(245,197,24,0.14)', color: '#fde68a', dot: '#f5c518' },
  'task-normal':  { bg: 'rgba(200,81,26,0.12)',  color: 'var(--text-2)', dot: 'var(--brand)' },
  'deal':         { bg: 'rgba(46,204,113,0.12)', color: '#86efac', dot: '#2ecc71' },
  'quote':        { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd', dot: '#3b9eff' },
};

function eventType(t: { priority: string; isCompleted: boolean; dueDate?: string }, today: Date): EventType {
  if (!t.dueDate || t.isCompleted) return 'task-normal';
  const d = new Date(t.dueDate); d.setHours(0,0,0,0);
  if (d < today) return 'task-overdue';
  if (t.priority === 'Urgente') return 'task-urgent';
  if (t.priority === 'Alta') return 'task-alta';
  return 'task-normal';
}

export default function CalendarPage() {
  const { data } = useData();
  const router = useRouter();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'task' | 'deal' | 'quote'>('all');

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  // Costruisci tutti gli eventi
  const allEvents = useMemo<CalEvent[]>(() => {
    const evs: CalEvent[] = [];

    // Task (per dueDate)
    data.tasks.filter(t => t.dueDate && !t.isCompleted).forEach(t => {
      evs.push({
        id: t.id, date: t.dueDate!,
        label: t.title,
        sub: t.clientName || t.responsible || undefined,
        type: eventType(t, today),
        href: '/tasks',
      });
    });

    // Commesse (per statusDate — data ultimo stato)
    data.deals.filter(d => d.statusDate).forEach(d => {
      evs.push({
        id: `deal-${d.id}`, date: d.statusDate!,
        label: d.companyName,
        sub: d.jobType || d.status || undefined,
        type: 'deal',
        href: '/deals',
      });
    });

    // Preventivi (per expiryDate)
    data.quotes.filter(q => q.expiryDate && q.status !== 'Accettato' && q.status !== 'Rifiutato').forEach(q => {
      evs.push({
        id: `quote-${q.id}`, date: q.expiryDate!,
        label: q.companyName || q.quoteNumber,
        sub: `Scadenza preventivo`,
        type: 'quote',
        href: '/quotes',
      });
    });

    return evs;
  }, [data, today]);

  const filteredEvents = useMemo(() => allEvents.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'task') return e.type.startsWith('task');
    if (filter === 'deal') return e.type === 'deal';
    if (filter === 'quote') return e.type === 'quote';
    return true;
  }), [allEvents, filter]);

  // Giorni del mese
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0=Lun
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    return dayNum;
  });

  const isoDate = (d: number) => `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    filteredEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); setSelected(null); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(null); };

  const selectedEvents = selected ? (eventsByDate[selected] ?? []) : [];

  // Stats mese
  const monthEvs = filteredEvents.filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`));
  const overdueCnt = monthEvs.filter(e => e.type === 'task-overdue').length;
  const urgentCnt = monthEvs.filter(e => e.type === 'task-urgent' || e.type === 'task-alta').length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <PageHeader title="Calendario" description="Vista mensile di task, commesse e preventivi." />

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          {(['all','task','deal','quote'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filter === f ? 'var(--brand)' : 'var(--surface2)',
                color: filter === f ? '#fff' : 'var(--text-3)',
                border: `1px solid ${filter === f ? 'var(--brand)' : 'var(--border)'}`,
              }}>
              {{ all:'Tutto', task:'Task', deal:'Commesse', quote:'Preventivi' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Stat strip */}
      {(overdueCnt > 0 || urgentCnt > 0) && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {overdueCnt > 0 && <span className="text-xs rounded-lg px-2.5 py-1" style={{ background:'rgba(231,76,60,0.12)', color:'#f87171' }}>⚠ {overdueCnt} in ritardo questo mese</span>}
          {urgentCnt > 0 && <span className="text-xs rounded-lg px-2.5 py-1" style={{ background:'rgba(245,197,24,0.12)', color:'#fde68a' }}>🔥 {urgentCnt} urgenti / alta priorità</span>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* ── Calendario ── */}
        <div className="card p-5">
          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="rounded-lg p-2 transition-colors hover:[background:var(--surface2)]" style={{ color:'var(--text-2)' }}>‹</button>
            <div className="flex items-center gap-3">
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:'var(--text-1)' }}>
                {MONTHS[month]} {year}
              </h2>
              <button onClick={goToday} className="text-xs rounded-lg px-2.5 py-1 transition-colors"
                style={{ background:'rgba(200,81,26,0.1)', color:'var(--brand)', border:'1px solid rgba(200,81,26,0.2)' }}>
                Oggi
              </button>
            </div>
            <button onClick={nextMonth} className="rounded-lg p-2 transition-colors hover:[background:var(--surface2)]" style={{ color:'var(--text-2)' }}>›</button>
          </div>

          {/* Header giorni */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center pb-2"
                style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid giorni */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((dayNum, i) => {
              if (!dayNum) return <div key={i} />;
              const iso = isoDate(dayNum);
              const evs = eventsByDate[iso] ?? [];
              const isToday = iso === localDateISO(today);
              const isSelected = iso === selected;
              const isWeekend = [5,6].includes(i % 7); // Sab, Dom

              return (
                <div key={i}
                  onClick={() => setSelected(isSelected ? null : iso)}
                  className="relative rounded-xl p-1.5 cursor-pointer transition-all min-h-[72px]"
                  style={{
                    background: isSelected ? 'rgba(200,81,26,0.15)' : isToday ? 'rgba(200,81,26,0.07)' : 'var(--surface2)',
                    border: isSelected ? '1px solid var(--brand)' : isToday ? '1px solid rgba(200,81,26,0.3)' : '1px solid var(--border)',
                    opacity: isWeekend && !evs.length ? 0.5 : 1,
                  }}>
                  {/* Numero giorno */}
                  <p className="text-right mb-1" style={{
                    fontSize: 13, fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--brand)' : 'var(--text-2)',
                  }}>{dayNum}</p>

                  {/* Eventi (max 3 visibili) */}
                  <div className="flex flex-col gap-0.5">
                    {evs.slice(0, 3).map(e => {
                      const st = EVENT_STYLE[e.type];
                      return (
                        <div key={e.id} className="rounded px-1 truncate"
                          style={{ background: st.bg, color: st.color, fontSize: 11, lineHeight: '16px', fontWeight: 500 }}
                          title={e.label}>
                          {e.label}
                        </div>
                      );
                    })}
                    {evs.length > 3 && (
                      <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign:'right', lineHeight:'14px' }}>+{evs.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop:'1px solid var(--border)' }}>
            {([
              ['task-overdue','In ritardo'],
              ['task-urgent','Urgente'],
              ['task-alta','Alta priorità'],
              ['task-normal','Task'],
              ['deal','Commessa'],
              ['quote','Preventivo'],
            ] as [EventType, string][]).map(([t, lbl]) => {
              const st = EVENT_STYLE[t];
              return (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: st.dot }} />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{lbl}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Pannello laterale ── */}
        <div>
          {/* Evento selezionato */}
          {selected && (
            <div className="card p-4 mb-4">
              <p className="label mb-3">
                {new Date(selected + 'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}
              </p>
              {selectedEvents.length === 0
                ? <p className="text-sm" style={{ color:'var(--text-3)' }}>Nessun evento.</p>
                : selectedEvents.map(e => {
                    const st = EVENT_STYLE[e.type];
                    return (
                      <button key={e.id} onClick={() => router.push(e.href)}
                        className="w-full text-left rounded-xl p-3 mb-2 transition-opacity hover:opacity-80"
                        style={{ background: st.bg, border: `1px solid ${st.dot}33` }}>
                        <p className="text-sm font-medium truncate" style={{ color: st.color }}>{e.label}</p>
                        {e.sub && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{e.sub}</p>}
                        <p className="text-xs mt-1" style={{ color: st.dot, opacity: 0.8 }}>
                          {{ 'task-overdue':'Task in ritardo', 'task-urgent':'Task urgente', 'task-alta':'Task alta priorità', 'task-normal':'Task', 'deal':'Commessa', 'quote':'Preventivo' }[e.type]}
                          {' · '}vai →
                        </p>
                      </button>
                    );
                  })
              }
            </div>
          )}

          {/* Prossime scadenze */}
          <div className="card p-4">
            <p className="label mb-3">Prossime scadenze</p>
            {(() => {
              const upcoming = filteredEvents
                .filter(e => new Date(e.date) >= today)
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(0, 8);
              if (upcoming.length === 0) return <p className="text-sm" style={{ color:'var(--text-3)' }}>Nessuna scadenza.</p>;
              return upcoming.map(e => {
                const st = EVENT_STYLE[e.type];
                const eDate = new Date(e.date + 'T12:00:00');
                const diff = Math.round((eDate.getTime() - today.getTime()) / 86400000);
                return (
                  <button key={e.id} onClick={() => router.push(e.href)}
                    className="w-full text-left flex items-start gap-2.5 py-2.5 hover:opacity-80 transition-opacity"
                    style={{ borderBottom:'1px solid var(--border)' }}>
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: st.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color:'var(--text-1)' }}>{e.label}</p>
                      {e.sub && <p className="text-xs truncate" style={{ color:'var(--text-3)' }}>{e.sub}</p>}
                    </div>
                    <span className="text-xs shrink-0 font-medium" style={{ color: diff === 0 ? '#e74c3c' : diff <= 3 ? '#f5c518' : 'var(--text-3)' }}>
                      {diff === 0 ? 'Oggi' : diff === 1 ? 'Dom' : `${diff}gg`}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
