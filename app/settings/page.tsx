'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/hooks/useData';
import {
  ALL_SECTIONS, ALL_ENABLED, loadPermissions, savePermissions,
  type MemberPermissions,
} from '@/lib/permissions';

// Raggruppa sezioni per gruppo
const GROUPS = [...new Set(ALL_SECTIONS.map(s => s.group))];

// Profili predefiniti
const PRESETS: Record<string, { label: string; emoji: string; sections: Record<string, boolean> }> = {
  full: {
    label: 'Accesso completo', emoji: '🔓',
    sections: Object.fromEntries(ALL_SECTIONS.map(s => [s.key, true])),
  },
  smm: {
    label: 'Social Media Manager', emoji: '📱',
    sections: {
      ...Object.fromEntries(ALL_SECTIONS.map(s => [s.key, false])),
      daily: true, dashboard: true, tasks: true, calendar: true,
      clients: true, account: true, editorial: true, report: true,
      ai: true, templates: true,
    },
  },
  account: {
    label: 'Account Manager', emoji: '🤝',
    sections: {
      ...Object.fromEntries(ALL_SECTIONS.map(s => [s.key, false])),
      daily: true, dashboard: true, tasks: true, calendar: true, health: true,
      leads: true, pipeline: true, quotes: true, clients: true, deals: true,
      onboarding: true, account: true, editorial: true, report: true,
      ai: true, templates: true, contacts: true,
    },
  },
  designer: {
    label: 'Graphic Designer', emoji: '🎨',
    sections: {
      ...Object.fromEntries(ALL_SECTIONS.map(s => [s.key, false])),
      daily: true, dashboard: true, tasks: true,
      clients: true, editorial: true, canva: true, ai: true,
    },
  },
  pm: {
    label: 'Project Manager', emoji: '📋',
    sections: {
      ...Object.fromEntries(ALL_SECTIONS.map(s => [s.key, false])),
      daily: true, dashboard: true, tasks: true, calendar: true, health: true,
      clients: true, deals: true, account: true, editorial: true,
      report: true, timetracking: true, team: true, templates: true, ai: true,
    },
  },
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none',
};

export default function SettingsPage() {
  const { data, update } = useData();
  const [permissions, setPerms] = useState<Record<string, MemberPermissions>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [sections, setSections]     = useState<Record<string, boolean>>(ALL_ENABLED);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    const loaded = loadPermissions();
    setPerms(loaded);

    // Inizializza Mattia Brumana e Mario Valerio con accesso completo se non esistono ancora
    const init: Record<string, MemberPermissions> = { ...loaded };
    let changed = false;

    // Usa isGodUser per riconoscere gli admin — stesso criterio preciso
    // (già importato tramite isGodUser nei GOD_USERS)
    const GOD_FULL_NAMES = ['Brumana Mattia', 'Mattia Brumana', 'Mario Valerio', 'Valerio Mario', 'Valentina Maccarelli', 'Maccarelli Valentina'];
    data.teamMembers.forEach(m => {
      if (!init[m.id]) {
        const mParts = m.fullName.toLowerCase().split(' ');
        const isAdmin = GOD_FULL_NAMES.some(godName => {
          const gParts = godName.toLowerCase().split(' ');
          return gParts.every(p => mParts.some(mp => mp === p));
        });
        init[m.id] = {
          memberId: m.id,
          memberName: m.fullName,
          sections: isAdmin ? { ...ALL_ENABLED } : { ...ALL_ENABLED },
        };
        changed = true;
      }
    });

    if (changed) {
      savePermissions(init);
      setPerms(init);
    }
  }, [data.teamMembers]);

  const selectMember = (id: string) => {
    setSelectedId(id);
    setSections(permissions[id]?.sections ?? ALL_ENABLED);
    setSaved(false);
  };

  const toggleSection = (key: string) => {
    setSections(s => ({ ...s, [key]: !s[key] }));
    setSaved(false);
  };

  const toggleGroup = (group: string, val: boolean) => {
    const groupKeys = ALL_SECTIONS.filter(s => s.group === group).map(s => s.key);
    setSections(s => ({ ...s, ...Object.fromEntries(groupKeys.map(k => [k, val])) }));
    setSaved(false);
  };

  const applyPreset = (presetKey: string) => {
    setSections({ ...PRESETS[presetKey].sections });
    setSaved(false);
  };

  const saveMember = () => {
    if (!selectedId) return;
    const member = data.teamMembers.find(m => m.id === selectedId);
    const updated = {
      ...permissions,
      [selectedId]: { memberId: selectedId, memberName: member?.fullName ?? '', sections },
    };
    savePermissions(updated);
    setPerms(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const member = data.teamMembers.find(m => m.id === selectedId);
  const enabledCount = Object.values(sections).filter(Boolean).length;

  return (
    <div style={{ padding: '28px 28px 60px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
          🔐 Gestione Accessi
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
          Configura quali sezioni sono visibili per ogni membro del team
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Lista membri */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Membri team
            </p>
          </div>
          {data.teamMembers.length === 0 ? (
            <p style={{ padding: 16, fontSize: 14, color: 'var(--text-3)' }}>Nessun membro — importa i dati Excel</p>
          ) : (
            data.teamMembers.map(m => {
              const isSelected = selectedId === m.id;
              const memberSections = permissions[m.id]?.sections ?? ALL_ENABLED;
              const count = Object.values(memberSections).filter(Boolean).length;
              const isAdmin = ['brumana', 'mario valerio', 'valerio'].some(n => m.fullName.toLowerCase().includes(n));
              return (
                <button key={m.id} onClick={() => selectMember(m.id)} style={{
                  width: '100%', padding: '11px 16px', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'rgba(242,101,34,0.08)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--brand)' : '3px solid transparent',
                  textAlign: 'left', transition: 'all 100ms',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAdmin ? 'var(--brand)' : 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: isAdmin ? 'white' : 'var(--text-2)', flexShrink: 0 }}>
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--brand)' : 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{count}/{ALL_SECTIONS.length} sezioni</p>
                    </div>
                    {isAdmin && <span style={{ fontSize: 11, color: 'var(--brand)', padding: '1px 6px', borderRadius: 20, background: 'rgba(242,101,34,0.1)', border: '1px solid rgba(242,101,34,0.2)', flexShrink: 0 }}>ADMIN</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pannello permessi */}
        {!selectedId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-3)', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>👈</p>
              <p style={{ fontSize: 16 }}>Seleziona un membro del team</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header membro */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{member?.fullName}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{member?.role} · {enabledCount} sezioni abilitate su {ALL_SECTIONS.length}</p>
                </div>
                <button onClick={saveMember} style={{
                  padding: '9px 20px', borderRadius: 9, fontSize: 14, fontWeight: 700, border: 'none',
                  cursor: 'pointer', background: saved ? '#4ade80' : 'var(--brand)', color: 'white', transition: 'background 300ms',
                }}>
                  {saved ? '✓ Salvato!' : '💾 Salva accessi'}
                </button>
              </div>
            </div>

            {/* Preset rapidi */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '14px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Profili predefiniti</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button key={key} onClick={() => applyPreset(key)} style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border2)',
                    background: 'var(--surface2)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: 'var(--text-2)', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                    {preset.emoji} {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle per gruppo */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, overflow: 'hidden' }}>
              {GROUPS.map((group, gi) => {
                const groupSections = ALL_SECTIONS.filter(s => s.group === group);
                const allOn  = groupSections.every(s => sections[s.key] !== false);
                const allOff = groupSections.every(s => sections[s.key] === false);
                return (
                  <div key={group} style={{ borderBottom: gi < GROUPS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {/* Header gruppo */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--surface2)' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{group}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => toggleGroup(group, true)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.06)', color: '#4ade80', cursor: 'pointer' }}>
                          Tutto ✓
                        </button>
                        <button onClick={() => toggleGroup(group, false)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)', color: '#f87171', cursor: 'pointer' }}>
                          Tutto ✗
                        </button>
                      </div>
                    </div>
                    {/* Sezioni del gruppo */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
                      {groupSections.map((section, si) => {
                        const enabled = sections[section.key] !== false;
                        return (
                          <label key={section.key}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                              cursor: 'pointer', borderRight: si % 3 < 2 ? '1px solid var(--border)' : 'none',
                              borderBottom: si < groupSections.length - 3 ? '1px solid var(--border)' : 'none',
                              background: enabled ? 'transparent' : 'rgba(248,113,113,0.03)',
                              transition: 'background 150ms',
                            }}>
                            <div
                              onClick={() => toggleSection(section.key)}
                              style={{
                                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                                background: enabled ? 'var(--brand)' : 'var(--surface3)',
                                border: `1px solid ${enabled ? 'var(--brand)' : 'var(--border)'}`,
                                position: 'relative', flexShrink: 0, transition: 'all 200ms',
                              }}>
                              <div style={{
                                position: 'absolute', top: 2, left: enabled ? 18 : 2,
                                width: 14, height: 14, borderRadius: '50%',
                                background: enabled ? 'white' : 'var(--text-3)',
                                transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }} />
                            </div>
                            <span style={{ fontSize: 14, color: enabled ? 'var(--text-1)' : 'var(--text-3)', fontWeight: enabled ? 500 : 400 }}>
                              {section.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Salva in fondo */}
            <button onClick={saveMember} style={{
              width: '100%', padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none',
              cursor: 'pointer', background: saved ? '#4ade80' : 'var(--brand)', color: 'white', transition: 'background 300ms',
            }}>
              {saved ? '✓ Accessi salvati!' : `💾 Salva accessi per ${member?.fullName}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
