'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAppData, updateAppData } from '@/lib/store';
import { localDateISO, addDaysISO } from '@/lib/utils';
import { findClientByName } from '@/lib/types';
import type { Client, Deal, Task, ProjectTemplate, TeamMember } from '@/lib/types';

function genId(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

const SECTORS   = ['Hospitality', 'Food & Beverage', 'Retail', 'Real Estate', 'Fashion', 'Wellness', 'Turismo', 'Altro'];
const JOB_TYPES = ['Social Media Management', 'Advertising', 'Content Creation', 'Branding', 'Web', 'Consulenza', 'Altro'];
const DEAL_STATUSES = ['In corso', 'In attesa', 'Approvato', 'Proposta'];

interface WizardState {
  clientName: string; sector: string; city: string;
  contactName: string; contactRole: string; email: string; phone: string;
  website: string; driveLink: string;
  jobType: string; dealStatus: string; projectLeaderId: string;
  budgetEuro: string; budgetOre: string; startDate: string;
  templateId: string;
  taskAssignments: Record<string, string>;
}

const EMPTY: WizardState = {
  clientName: '', sector: '', city: '', contactName: '', contactRole: '',
  email: '', phone: '', website: '', driveLink: '',
  jobType: '', dealStatus: 'In corso', projectLeaderId: '',
  budgetEuro: '', budgetOre: '', startDate: localDateISO(),
  templateId: '', taskAssignments: {},
};

function StepBar({ current }: { current: number }) {
  const steps = ['Cliente', 'Commessa', 'Template', 'Team', 'Riepilogo'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current; const active = idx === current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, transition: 'all 300ms',
                background: done || active ? 'var(--brand)' : 'var(--surface2)',
                color: done || active ? 'white' : 'var(--text-3)',
                border: active ? '2px solid var(--brand-light)' : done ? 'none' : '1px solid var(--border)',
                boxShadow: active ? '0 0 16px rgba(242,101,34,0.4)' : 'none',
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? 'var(--brand)' : done ? 'var(--text-2)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--brand)' : 'var(--border)', margin: '0 8px', marginBottom: 20, transition: 'background 300ms' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}{required && <span style={{ color: 'var(--brand)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, fontSize: 15, fontWeight: 500,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]             = useState(1);
  const [state, setState]           = useState<WizardState>(EMPTY);
  const [templates, setTemplates]   = useState<ProjectTemplate[]>([]);
  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [dupWarning, setDupWarning] = useState<Client | null>(null);

  useEffect(() => {
    const data = getAppData();
    if (data) { setTemplates(data.templates ?? []); setTeam(data.teamMembers ?? []); }
  }, []);

  const set = (k: keyof WizardState, v: unknown) => setState(s => ({ ...s, [k]: v }));

  const selectedTemplate = templates.find(t => t.id === state.templateId);
  const leader = team.find(m => m.id === state.projectLeaderId);

  // Controllo duplicati real-time
  useEffect(() => {
    if (!state.clientName.trim()) { setDupWarning(null); return; }
    const data = getAppData();
    if (!data) return;
    const dup = findClientByName(data.clients, state.clientName);
    setDupWarning(dup ?? null);
  }, [state.clientName]);

  const canNext: Record<number, boolean> = {
    1: !!state.clientName.trim(),
    2: !!state.jobType,
    3: true, 4: true,
  };

  const handleSave = async () => {
    setSaving(true);
    const data = getAppData();
    const now  = localDateISO();

    const clientId = genId('CLI');
    const newClient: Client = {
      id: clientId, name: state.clientName, sector: state.sector, city: state.city,
      contactName: state.contactName, contactRole: state.contactRole,
      email: state.email, phone: state.phone, website: state.website,
      driveLink: state.driveLink || undefined,
      startDate: now, status: 'Attivo', statusDate: now,
      responsible:   leader?.fullName,
      responsibleId: state.projectLeaderId || undefined,
    };

    const dealId = genId('DEAL');
    const newDeal: Deal = {
      id: dealId, clientId,
      companyName: state.clientName,
      jobType: state.jobType, status: state.dealStatus,
      projectLeader:   leader?.fullName,
      projectLeaderId: state.projectLeaderId || undefined,
      budgetEuro:  state.budgetEuro ? parseFloat(state.budgetEuro) : undefined,
      budgetOre:   state.budgetOre  ? parseFloat(state.budgetOre)  : undefined,
      alertThreshold: 80, statusDate: now,
    };

    const newTasks: Task[] = selectedTemplate
      ? selectedTemplate.tasks.map((tt, i) => {
          const memberId = state.taskAssignments[String(i)];
          const member   = team.find(m => m.id === memberId);
          return {
            id: genId('TASK'),
            clientId,
            clientName:  state.clientName,
            dealId,
            projectName: state.jobType,
            title:       tt.title,
            priority:    tt.priority as Task['priority'],
            status:      'Da fare' as Task['status'],
            startDate:   state.startDate,
            dueDate:     addDaysISO(new Date(state.startDate), tt.dueDaysOffset),
            responsibleId: memberId || undefined,
            responsible:   member?.fullName ?? tt.responsible ?? '',
            notes:       tt.notes ?? '',
            isCompleted: false,
          };
        })
      : [];

    updateAppData({
      clients: [...(data?.clients ?? []), newClient],
      deals:   [...(data?.deals   ?? []), newDeal],
      tasks:   [...(data?.tasks   ?? []), ...newTasks],
    });

    setSaving(false);
    setDone(true);
    setTimeout(() => router.push('/clients'), 2000);
  };

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>Cliente creato!</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 16 }}>
          {state.clientName} · {selectedTemplate ? `${selectedTemplate.tasks.length} task generati` : 'nessun template'}
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Reindirizzamento...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Nuovo Cliente</h1>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-3)', marginLeft: 30 }}>Wizard onboarding — completa i passaggi per configurare tutto in una volta</p>
      </div>

      <StepBar current={step} />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 18, padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>

        {/* ── STEP 1: Cliente ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Dati Cliente</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Informazioni base per l'anagrafica</p>
            </div>

            {/* Warning duplicato */}
            {dupWarning && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>Cliente già esistente</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    "{dupWarning.name}" è già in anagrafica ({dupWarning.status}). Vuoi davvero creare un duplicato?
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Nome azienda" required>
                  <input style={{ ...inputStyle, borderColor: dupWarning ? 'rgba(251,191,36,0.5)' : undefined }}
                    value={state.clientName} onChange={e => set('clientName', e.target.value)}
                    placeholder="Es. Hotel Bellavista" autoFocus />
                </Field>
              </div>
              <Field label="Settore">
                <select style={selectStyle} value={state.sector} onChange={e => set('sector', e.target.value)}>
                  <option value="">Seleziona...</option>
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Città">
                <input style={inputStyle} value={state.city} onChange={e => set('city', e.target.value)} placeholder="Milano" />
              </Field>
              <Field label="Contatto principale">
                <input style={inputStyle} value={state.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Nome Cognome" />
              </Field>
              <Field label="Ruolo contatto">
                <input style={inputStyle} value={state.contactRole} onChange={e => set('contactRole', e.target.value)} placeholder="Marketing Manager" />
              </Field>
              <Field label="Email">
                <input style={inputStyle} type="email" value={state.email} onChange={e => set('email', e.target.value)} placeholder="email@azienda.it" />
              </Field>
              <Field label="Telefono">
                <input style={inputStyle} value={state.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 000 0000000" />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Sito web">
                  <input style={inputStyle} value={state.website} onChange={e => set('website', e.target.value)} placeholder="https://www.azienda.it" />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Cartella Google Drive">
                  <input style={inputStyle} value={state.driveLink} onChange={e => set('driveLink', e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Commessa ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Commessa</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Tipo di lavoro, budget e responsabile</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Tipo di lavoro" required>
                <select style={selectStyle} value={state.jobType} onChange={e => set('jobType', e.target.value)}>
                  <option value="">Seleziona...</option>
                  {JOB_TYPES.map(j => <option key={j}>{j}</option>)}
                </select>
              </Field>
              <Field label="Stato commessa">
                <select style={selectStyle} value={state.dealStatus} onChange={e => set('dealStatus', e.target.value)}>
                  {DEAL_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Project Leader">
                <select style={selectStyle} value={state.projectLeaderId} onChange={e => set('projectLeaderId', e.target.value)}>
                  <option value="">Nessuno</option>
                  {team.map(m => <option key={m.id} value={m.id}>{m.fullName} — {m.role}</option>)}
                </select>
              </Field>
              <Field label="Data inizio">
                <input style={inputStyle} type="date" value={state.startDate} onChange={e => set('startDate', e.target.value)} />
              </Field>
              <Field label="Budget €">
                <input style={inputStyle} type="number" value={state.budgetEuro} onChange={e => set('budgetEuro', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Budget ore">
                <input style={inputStyle} type="number" value={state.budgetOre} onChange={e => set('budgetOre', e.target.value)} placeholder="0" />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 3: Template ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Template di progetto</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Scegli un template per generare i task automaticamente (opzionale)</p>
            </div>
            <div onClick={() => set('templateId', '')} style={{
              padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${!state.templateId ? 'var(--brand)' : 'var(--border)'}`,
              background: !state.templateId ? 'rgba(242,101,34,0.06)' : 'var(--surface2)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>🚫</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Senza template</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Crea i task manualmente dopo</p>
              </div>
            </div>
            {templates.length === 0 && (
              <div style={{ padding: '20px', borderRadius: 12, background: 'var(--surface2)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Nessun template disponibile. Aggiungili dalla sezione Template.</p>
              </div>
            )}
            {templates.map(t => (
              <div key={t.id} onClick={() => set('templateId', t.id)} style={{
                padding: '14px 18px', borderRadius: 12, cursor: 'pointer', transition: 'all 150ms',
                border: `2px solid ${state.templateId === t.id ? 'var(--brand)' : 'var(--border)'}`,
                background: state.templateId === t.id ? 'rgba(242,101,34,0.06)' : 'var(--surface2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{t.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.description || t.serviceType}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text-2)' }}>
                    {t.tasks.length} task
                  </span>
                </div>
                {state.templateId === t.id && t.tasks.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {t.tasks.map((tt, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 60 }}>+{tt.dueDaysOffset}gg</span>
                        <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{tt.title}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', padding: '2px 6px', background: 'var(--surface3)', borderRadius: 4 }}>{tt.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 4: Assegnazione team ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Assegna il team</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Assegna ogni task a un membro del team</p>
            </div>
            {!selectedTemplate || selectedTemplate.tasks.length === 0 ? (
              <div style={{ padding: '24px', borderRadius: 12, background: 'var(--surface2)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-3)', fontSize: 15 }}>Nessun template selezionato — i task verranno creati senza assegnazione.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedTemplate.tasks.map((tt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{tt.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>+{tt.dueDaysOffset} giorni · {tt.priority}</p>
                    </div>
                    <select
                      style={{ ...selectStyle, width: 180, fontSize: 14 }}
                      value={state.taskAssignments[String(i)] ?? ''}
                      onChange={e => set('taskAssignments', { ...state.taskAssignments, [String(i)]: e.target.value })}
                    >
                      <option value="">Non assegnato</option>
                      {team.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Riepilogo ── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Riepilogo</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Controlla e conferma</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>👤 Cliente</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{state.clientName}</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{[state.sector, state.city].filter(Boolean).join(' · ')}</p>
              {state.contactName && <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>{state.contactName}{state.contactRole && ` — ${state.contactRole}`}</p>}
              {state.driveLink && <p style={{ fontSize: 13, color: 'var(--brand)', marginTop: 4 }}>📁 Drive collegato</p>}
            </div>
            <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>📋 Commessa</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{state.jobType}</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                {leader && <p style={{ fontSize: 14, color: 'var(--text-2)' }}>👤 {leader.fullName}</p>}
                {state.budgetEuro && <p style={{ fontSize: 14, color: 'var(--text-2)' }}>💶 €{Number(state.budgetEuro).toLocaleString('it-IT')}</p>}
                {state.budgetOre && <p style={{ fontSize: 14, color: 'var(--text-2)' }}>⏱ {state.budgetOre}h</p>}
              </div>
            </div>
            {selectedTemplate && selectedTemplate.tasks.length > 0 && (
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  ✅ {selectedTemplate.tasks.length} task da "{selectedTemplate.name}"
                </p>
                {selectedTemplate.tasks.map((tt, i) => {
                  const member = team.find(m => m.id === state.taskAssignments[String(i)]);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < selectedTemplate.tasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-1)' }}>{tt.title}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{member?.fullName ?? 'Non assegnato'}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {dupWarning && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <p style={{ fontSize: 14, color: '#fbbf24' }}>⚠️ Attenzione: stai creando un cliente con lo stesso nome di uno esistente.</p>
              </div>
            )}
          </div>
        )}

        {/* Navigazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            ← {step === 1 ? 'Annulla' : 'Indietro'}
          </button>
          {step < 5 ? (
            <button onClick={() => canNext[step] && setStep(s => s + 1)} disabled={!canNext[step]} style={{ padding: '10px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', cursor: canNext[step] ? 'pointer' : 'not-allowed', background: canNext[step] ? 'var(--brand)' : 'var(--surface3)', color: canNext[step] ? 'white' : 'var(--text-3)', transition: 'all 150ms' }}>
              Avanti →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer', background: 'var(--brand)', color: 'white', boxShadow: '0 4px 16px rgba(242,101,34,0.4)' }}>
              {saving ? '⏳ Salvo...' : '🚀 Crea cliente'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
