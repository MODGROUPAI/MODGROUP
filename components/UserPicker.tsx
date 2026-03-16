'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useData } from '@/hooks/useData';
import { getInitials } from '@/lib/userStore';
import { inferRoleFromMember, inferRoleFromName, setStoredRole } from '@/lib/roles';
import { isGodUser } from '@/lib/godMode';

// Colore per ruolo
function roleColor(role: string): string {
  const map: Record<string, string> = {
    'Account':       '#3b9eff',
    'Art Director':  '#a855f7',
    'SMM':           '#2ecc71',
    'CEO':           '#D4AF37',
    'Developer':     '#f5c518',
    'PM':            '#22c55e',
    'Trainer':       '#F88379',
    'Altro':         '#6b7280',
  };
  // Match parziale
  for (const [k, v] of Object.entries(map)) {
    if (role?.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'var(--brand)';
}

export function UserPicker() {
  const { user, loaded, login, logout } = useCurrentUser();
  const { data } = useData();
  const [open, setOpen]       = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch]   = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Chiudi dropdown fuori click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowLogin(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Primo accesso → mostra login automaticamente
  useEffect(() => {
    if (loaded && !user) setShowLogin(true);
  }, [loaded, user]);

  const teamMembers = data.teamMembers ?? [];

  // Filtra per ricerca
  const filtered = search.trim()
    ? teamMembers.filter(m => m.fullName.toLowerCase().includes(search.toLowerCase()) || m.role?.toLowerCase().includes(search.toLowerCase()))
    : teamMembers;

  const selectMember = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    // Inferisce il ruolo dashboard dal ruolo del membro e lo salva
    const dashRole = inferRoleFromName(member.fullName) ?? inferRoleFromMember(member.role ?? '');
    setStoredRole(dashRole);
    login({
      id:       member.id,
      name:     member.fullName,
      role:     member.role ?? 'Altro',
      initials: getInitials(member.fullName),
    });
    setShowLogin(false);
    setOpen(false);
    setSearch('');
    // Forza reload della pagina per applicare il nuovo ruolo ovunque
    window.location.href = '/';
  };

  const color = user ? roleColor(user.role) : 'var(--text-3)';
  const isGod = user ? isGodUser(user.name) : false;

  // ── Schermata login ──────────────────────────────────────────────────────────
  if (showLogin) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 20, padding: '36px 40px', width: 420, maxWidth: '92vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', fontSize: 22, color: 'white', fontWeight: 800,
            }}>M</div>
            <p style={{ fontFamily:"'Montserrat',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-1)' }}>
              MOD<span style={{ color: 'var(--brand)' }}>.</span>PMO
            </p>
          </div>

          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, textAlign: 'center' }}>
            Chi sei?
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>
            Seleziona il tuo profilo dal team MOD Group
          </p>

          {/* Cerca */}
          {teamMembers.length > 5 && (
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca nel team..."
              style={{
                width: '100%', padding: '9px 14px', borderRadius: 10, fontSize: 14,
                border: '1px solid var(--border2)', background: 'var(--surface2)',
                color: 'var(--text-1)', outline: 'none', marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Lista membri */}
          {teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Nessun membro nel team</p>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                Importa prima il file Excel con i dati del team per abilitare il login.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {filtered.map(m => {
                const god = isGodUser(m.fullName);
                const clr = roleColor(m.role ?? '');
                return (
                  <button key={m.id} onClick={() => selectMember(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${clr}33`, background: `${clr}06`,
                    transition: 'all 150ms', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${clr}15`; e.currentTarget.style.borderColor = `${clr}66`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${clr}06`; e.currentTarget.style.borderColor = `${clr}33`; }}>
                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: `${clr}22`, border: `2px solid ${clr}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, color: clr,
                      fontFamily: "'Montserrat',sans-serif",
                    }}>
                      {getInitials(m.fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.fullName}
                      </p>
                      <p style={{ fontSize: 12, color: clr, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.role}</p>
                    </div>
                    {god && (
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', flexShrink: 0 }}>
                        ⚡ ADMIN
                      </span>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', padding: '16px' }}>
                  Nessun risultato per "{search}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!loaded) return null;

  // ── Pill utente in topbar ────────────────────────────────────────────────────
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 10px 4px 4px', borderRadius: 20,
        background: open ? 'var(--surface2)' : 'transparent',
        border: '1px solid ' + (open ? 'var(--border2)' : 'transparent'),
        cursor: 'pointer', transition: 'all 150ms',
      }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `${color}22`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color,
          fontFamily: "'Montserrat',sans-serif",
        }}>
          {user ? getInitials(user.name) : '?'}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name ?? 'Accedi'}
          </p>
          {user && <p style={{ fontSize: 11, color, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>{user.role}</p>}
        </div>
        {isGod && <span style={{ fontSize: 12 }}>⚡</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 12, padding: 8, minWidth: 200, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {user && (
            <div style={{ padding: '8px 12px', marginBottom: 6, borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{user.name}</p>
              <p style={{ fontSize: 12, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user.role}</p>
            </div>
          )}
          <button
            onClick={() => { setSearch(''); setShowLogin(true); setOpen(false); }}
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-1)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            🔄 Cambia utente
          </button>
          {user && (
            <button
              onClick={() => { logout(); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              🚪 Esci
            </button>
          )}
        </div>
      )}
    </div>
  );
}
