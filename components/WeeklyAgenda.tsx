'use client';

import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';

const DAYS = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

export function WeeklyAgenda() {
  const { data } = useData();
  const router = useRouter();

  const today = new Date(); today.setHours(0,0,0,0);

  // Settimana corrente (lun → dom)
  const weekStart = new Date(today);
  const dow = today.getDay();
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const tasksByDay = days.map(day => {
    const iso = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    return data.tasks.filter(t => !t.isCompleted && t.dueDate === iso);
  });

  const hasAny = tasksByDay.some(ts => ts.length > 0);
  if (!hasAny) return null;

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ color: 'var(--text-1)' }}>Agenda settimana</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
            {days[0].getDate()} {MONTHS[days[0].getMonth()]} — {days[6].getDate()} {MONTHS[days[6].getMonth()]}
          </p>
        </div>
        <button onClick={() => router.push('/tasks')}
          style={{ color: 'var(--brand)', fontSize: 14 }}>
          Vedi tracker
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          const isPast = day < today;
          const tasks = tasksByDay[i];

          return (
            <div key={i}
              className="rounded-xl p-2 min-h-[80px]"
              style={{
                background: isToday ? 'rgba(200,81,26,0.08)' : 'var(--surface2)',
                border: isToday ? '1px solid rgba(200,81,26,0.3)' : '1px solid var(--border)',
                opacity: isPast ? 0.7 : 1,
              }}>
              <p className="text-center mb-2" style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--brand)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {DAYS[day.getDay()]}
              </p>
              <p className="text-center mb-2" style={{ fontSize: 18, fontWeight: 700, color: isToday ? 'var(--brand)' : 'var(--text-1)' }}>
                {day.getDate()}
              </p>
              {tasks.map(t => (
                <button key={t.id} onClick={() => router.push('/tasks')}
                  className="w-full text-left rounded px-1.5 py-1 mb-1 block truncate"
                  title={`${t.title} — ${t.clientName || ''}`}
                  style={{
                    fontSize: 11,
                    background: t.priority === 'Urgente' ? 'rgba(231,76,60,0.15)' : t.priority === 'Alta' ? 'rgba(245,197,24,0.12)' : 'rgba(200,81,26,0.1)',
                    color: t.priority === 'Urgente' ? '#e74c3c' : t.priority === 'Alta' ? '#f5c518' : 'var(--text-2)',
                  }}>
                  {t.title}
                </button>
              ))}
              {tasks.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
