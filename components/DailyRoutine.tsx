'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/useRole';
import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';
import {
  getRoutine, getRoutineItems, getContextualMessage,
  getCompletedToday, markCompleted, getStreakDays,
  type RoutineItem, type RoutineFrequency,
} from '@/lib/routines';
import { localDateISO } from '@/lib/utils';

const ROLE_COLORS: Record<string, string> = {
  ceo:'#D4AF37', account:'#F26522', smm:'#3b9eff',
  designer:'#a855f7', pm:'#22c55e',
};

const ROLE_EMOJI: Record<string, string> = {
  ceo:'👔', account:'🤝', smm:'📱', designer:'🎨', pm:'📋',
};

const DISMISS_KEY = 'pmo_routine_dismissed';

function wasShownToday(role: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}');
    return data[role] === localDateISO();
  } catch { return false; }
}

function dismissToday(role: string) {
  try {
    const data = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}');
    data[role] = localDateISO();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
  } catch {}
}

export function DailyRoutine() {
  const { role }   = useRole();
  const { data, update } = useData();
  const router     = useRouter();
  const color      = ROLE_COLORS[role] ?? '#F26522';
  const emoji      = ROLE_EMOJI[role] ?? '👤';

  const [visible, setVisible]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<RoutineFrequency>('daily');
  const [justDone, setJustDone]   = useState<string | null>(null);

  const routine  = getRoutine(role);
  const message  = getContextualMessage(role);
  const streak   = getStreakDays(role);
  const today    = localDateISO();

  // Determina frequenza corretta in base al giorno
  const dayOfWeek = new Date().getDay();
  const isMonday  = dayOfWeek === 1;
  const isFriday  = dayOfWeek === 5;
  const isMonthStart = new Date().getDate() <= 2;

  const defaultTab: RoutineFrequency = isMonthStart ? 'monthly'
    : isMonday ? 'weekly_monday'
    : isFriday ? 'weekly_friday'
    : 'daily';

  useEffect(() => {
    if (!wasShownToday(role)) {
      const timer = setTimeout(() => {
        setVisible(true);
        setActiveTab(defaultTab);
        setCompleted(getCompletedToday(role));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [role]);

  // Auto-dismiss dopo 12 secondi se non aperto
  useEffect(() => {
    if (visible && !expanded) {
      const timer = setTimeout(() => dismiss(), 12000);
      return () => clearTimeout(timer);
    }
  }, [visible, expanded]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    dismissToday(role);
    setTimeout(() => { setVisible(false); setLeaving(false); }, 300);
  }, [role]);

  const toggleItem = useCallback((item: RoutineItem) => {
    const already = completed.includes(item.id);
    if (already) return; // non si può de-spuntare (commitment)

    markCompleted(role, item.id);
    setCompleted(c => [...c, item.id]);
    setJustDone(item.id);
    setTimeout(() => setJustDone(null), 800);

    // Crea task nel tracker se richiesto
    if (item.createTask) {
      const newTask = {
        id: `routine_${item.id}_${Date.now()}`,
        title: item.text,
        description: item.description ?? '',
        status: 'Da fare' as const,
        priority: 'Media' as const,
        dueDate: today,
        isCompleted: false,
        createdAt: today,
        source: 'routine',
      };
      update({ tasks: [...data.tasks, newTask] });
    }
  }, [completed, role, data.tasks, update, today]);

  const items = getRoutineItems(role, activeTab);
  const doneCount = items.filter(i => completed.includes(i.id)).length;
  const allDone   = items.length > 0 && doneCount === items.length;

  const TAB_LABELS: Record<RoutineFrequency, string> = {
    daily:         '☀️ Oggi',
    weekly_monday: '📅 Lunedì',
    weekly_friday: '🎯 Venerdì',
    monthly:       '📊 Mese',
  };

  const AVAILABLE_TABS: RoutineFrequency[] = ['daily', 'weekly_monday', 'weekly_friday', 'monthly'];

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 900,
      width: expanded ? 360 : 300,
      background: 'var(--surface)',
      border: `1.5px solid ${color}44`,
      borderRadius: 18,
      boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}18`,
      overflow: 'hidden',
      transition: 'all 300ms cubic-bezier(0.34,1.56,0.64,1)',
      opacity: leaving ? 0 : 1,
      transform: leaving ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
      animation: 'slideInUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity:0; transform:translateY(24px) scale(0.92); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }
        @keyframes checkPop {
          0%   { transform:scale(1); }
          40%  { transform:scale(1.3); }
          100% { transform:scale(1); }
        }
        .routine-check-anim { animation: checkPop 0.35s ease; }
      `}</style>

      {/* Header — sempre visibile */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${color}10, transparent)`,
          borderBottom: expanded ? `1px solid ${color}22` : 'none',
        }}
      >
        {/* Avatar ruolo */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `${color}20`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {message}
          </p>
          {streak > 1 && (
            <p style={{ fontSize: 10, color, marginTop: 1 }}>
              🔥 {streak} giorni di fila — ottimo ritmo!
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); dismiss(); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
          >×</button>
          <span style={{ fontSize: 9, color: 'var(--text-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▾</span>
        </div>
      </div>

      {/* Corpo espanso */}
      {expanded && (
        <div>
          {/* Tab frequenza */}
          <div style={{ display: 'flex', gap: 2, padding: '8px 12px 6px', overflowX: 'auto' }}>
            {AVAILABLE_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '4px 9px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 150ms',
                background: activeTab === tab ? color : 'var(--surface2)',
                color: activeTab === tab ? 'white' : 'var(--text-3)',
              }}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div style={{ padding: '4px 14px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  {doneCount}/{items.length} completati
                </span>
                {allDone && (
                  <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>✅ Tutto fatto!</span>
                )}
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--surface3)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%`,
                  background: allDone ? '#4ade80' : color,
                  transition: 'width 400ms ease',
                }} />
              </div>
            </div>
          )}

          {/* Lista items */}
          <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 12px 12px' }}>
            {items.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '16px 0' }}>
                Nessuna attività per questa frequenza
              </p>
            ) : (
              items.map(item => {
                const done = completed.includes(item.id);
                const isJustDone = justDone === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={isJustDone ? 'routine-check-anim' : ''}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 10px', borderRadius: 9, marginBottom: 4,
                      cursor: done ? 'default' : 'pointer',
                      background: done ? `${color}08` : 'transparent',
                      border: `1px solid ${done ? color + '25' : 'transparent'}`,
                      transition: 'all 200ms',
                      opacity: done ? 0.7 : 1,
                    }}
                    onMouseEnter={e => !done && (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => !done && (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      border: `2px solid ${done ? color : 'var(--border2)'}`,
                      background: done ? color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms',
                    }}>
                      {done && <span style={{ fontSize: 10, color: 'white', fontWeight: 800 }}>✓</span>}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 13 }}>{item.emoji}</span>
                        <p style={{
                          fontSize: 12, fontWeight: 600,
                          color: done ? 'var(--text-3)' : 'var(--text-1)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}>
                          {item.text}
                        </p>
                        {item.createTask && (
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 20, background: `${color}15`, color, fontWeight: 700 }}>
                            + task
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${color}15`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <button
              onClick={() => router.push('/daily')}
              style={{
                fontSize: 11, color, background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: 700, padding: 0,
              }}
            >
              Daily Brief completo →
            </button>
            <button onClick={dismiss} style={{
              fontSize: 10, color: 'var(--text-3)', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
