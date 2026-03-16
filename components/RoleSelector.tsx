'use client';

import { useState, useRef, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { ROLES } from '@/lib/roles';
import { useRouter } from 'next/navigation';

export function RoleSelector() {
  const { role, setRole } = useRole();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const router            = useRouter();

  const current = ROLES.find(r => r.id === role) ?? ROLES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 12px', borderRadius: 20,
          border: `1px solid ${current.color}44`,
          background: `${current.color}12`,
          cursor: 'pointer', transition: 'all 150ms',
        }}
      >
        <span style={{ fontSize: 16 }}>{current.emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: current.color }}>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          style={{ color: current.color, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden', zIndex: 200, minWidth: 210,
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vista per ruolo</p>
          </div>
          {ROLES.map(r => (
            <button key={r.id}
              onClick={() => {
                setRole(r.id);
                setOpen(false);
                router.push('/');      // torna alla home del ruolo
                router.refresh();
              }}
              style={{
                width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                background: r.id === role ? `${r.color}10` : 'transparent',
                borderLeft: r.id === role ? `3px solid ${r.color}` : '3px solid transparent',
                transition: 'all 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${r.color}10`}
              onMouseLeave={e => e.currentTarget.style.background = r.id === role ? `${r.color}10` : 'transparent'}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{r.emoji}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: r.id === role ? r.color : 'var(--text-1)' }}>{r.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.description}</p>
              </div>
              {r.id === role && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', color: r.color }}>
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
