'use client';

import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { updateAppData } from '@/lib/store';
import { PageHeader } from '@/components/PageHeader';
import { Modal, Field } from '@/components/Modal';
import { formatDate } from '@/lib/utils';
import type { TeamMember } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  'Da fare': '[background:var(--surface3)] [color:var(--text-2)]',
  'In corso': 'bg-orange-100 text-orange-700',
  'In attesa': '[background:rgba(245,197,24,0.15)] [color:#f5c518]',
  'Sospesa': 'bg-purple-100 text-purple-700',
  'Completata': '[background:rgba(46,204,113,0.15)] [color:#2ecc71]',
};

const PRIORITY_COLORS: Record<string, string> = {
  'Bassa': '[background:var(--surface3)] [color:var(--text-2)]',
  'Media': '[background:rgba(59,158,255,0.15)] [color:#3b9eff]',
  'Alta': '[background:rgba(245,197,24,0.15)] [color:#f5c518]',
  'Urgente': '[background:rgba(231,76,60,0.15)] [color:#e74c3c] font-semibold',
};

const PRESET_COLORS = [
  '#E3F2FD','#E8F5E9','#F3E5F5','#FFE0B2',
  '#E0F2F1','#FFF3E0','#FFF8E1','#FFF9C4',
  '#FFEBEE','#E8EAF6','#FCE4EC','#F1F8E9',
];

const ROLES = ['SMM','Graphic Designer','Art Director','Senior Account','Account','Project Manager','CEO','Copywriter','Web Developer','Altro'];

type View = 'grid' | 'anagrafica';

function emptyMember(): Omit<TeamMember, 'id'> {
  return { fullName: '', lastName: '', role: '', colorHex: '#E3F2FD', email: '', phone: '', startDate: '', notes: '', isActive: true };
}

export default function TeamPage() {
  const { data, refresh } = useData();
  const [view, setView] = useState<View>('grid');
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<Omit<TeamMember, 'id'>>(emptyMember());

  const tasksByMember: Record<string, number> = {};
  data.tasks.filter(t => !t.isCompleted).forEach(t => {
    if (t.responsible) tasksByMember[t.responsible] = (tasksByMember[t.responsible] ?? 0) + 1;
  });

  const memberTasks = selected ? data.tasks.filter(t => t.responsible === selected) : [];
  const selectedMember = data.teamMembers.find(m => m.fullName === selected);

  function openAdd() {
    setForm(emptyMember());
    setEditing(null);
    setModal('add');
  }

  function openEdit(m: TeamMember) {
    setForm({ fullName: m.fullName, lastName: m.lastName || '', role: m.role, colorHex: m.colorHex, email: m.email || '', phone: m.phone || '', startDate: m.startDate || '', notes: m.notes || '', isActive: m.isActive });
    setEditing(m);
    setModal('edit');
  }

  function save() {
    if (!form.fullName.trim()) return;
    let members: TeamMember[];
    if (modal === 'add') {
      const newId = 'TEAM' + String(Date.now()).slice(-6);
      members = [...data.teamMembers, { id: newId, ...form }];
    } else {
      members = data.teamMembers.map(m => m.id === editing!.id ? { ...m, ...form } : m);
    }
    updateAppData({ teamMembers: members });
    refresh();
    setModal(null);
  }

  function deleteMember() {
    if (!editing) return;
    const members = data.teamMembers.filter(m => m.id !== editing.id);
    updateAppData({ teamMembers: members });
    refresh();
    setModal(null);
    if (selected === editing.fullName) setSelected(null);
  }

  function f(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description={data.teamMembers.length + ' membri'}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border [border-color:var(--border2)] overflow-hidden text-sm">
              <button onClick={() => setView('grid')} className={'px-3 py-1.5 ' + (view === 'grid' ? 'text-white' : '[color:var(--text-3)] hover:[background:var(--surface2)]')} style={view === 'grid' ? { backgroundColor: '#C8511A' } : {}}>Schede</button>
              <button onClick={() => setView('anagrafica')} className={'px-3 py-1.5 ' + (view === 'anagrafica' ? 'text-white' : '[color:var(--text-3)] hover:[background:var(--surface2)]')} style={view === 'anagrafica' ? { backgroundColor: '#C8511A' } : {}}>Anagrafica</button>
            </div>
            <button onClick={openAdd} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>+ Membro</button>
          </div>
        }
      />

      {view === 'grid' && (
        <div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
            {data.teamMembers.length === 0 && (
              <p className="text-sm [color:var(--text-3)] col-span-3">Nessun membro — importa Excel o aggiungi manualmente.</p>
            )}
            {data.teamMembers.map(m => {
              const isActive = selected === m.fullName;
              return (
                <div key={m.id} className={'card p-5 flex items-center gap-4 transition-all hover:shadow-md ' + (isActive ? 'ring-2' : '')} style={isActive ? { boxShadow: '0 0 0 2px #C8511A' } : {}}>
                  <button onClick={() => setSelected(isActive ? null : m.fullName)} className="flex items-center gap-4 flex-1 text-left min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: m.colorHex, color: '#2D2D2D' }}>
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold [color:var(--text-1)]">{m.fullName}{m.lastName ? ' ' + m.lastName : ''}</p>
                      <p className="text-xs [color:var(--text-3)]">{m.role}</p>
                      {m.email && <p className="text-xs [color:var(--text-3)] truncate">{m.email}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold" style={{ color: '#C8511A' }}>{tasksByMember[m.fullName] ?? 0}</p>
                      <p className="text-xs [color:var(--text-3)]">task aperti</p>
                    </div>
                  </button>
                  <button onClick={() => openEdit(m)} className="[color:var(--text-3)] hover:[color:var(--text-3)] text-sm ml-1 shrink-0" title="Modifica">&#9998;</button>
                </div>
              );
            })}
          </div>

          {selected && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: selectedMember?.colorHex ?? '#eee', color: '#2D2D2D' }}>
                  {selected.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg font-semibold [color:var(--text-1)]">Task di {selected}</h2>
                <span className="text-xs [color:var(--text-3)]">{memberTasks.length} totali</span>
                <button onClick={() => setSelected(null)} className="ml-auto text-xs [color:var(--text-3)] hover:[color:var(--text-2)]">chiudi</button>
              </div>
              {memberTasks.length === 0 ? (
                <p className="text-sm [color:var(--text-3)]">Nessun task assegnato.</p>
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b [border-color:var(--border)] [background:var(--surface2)]">
                        {['Cliente','Progetto','Task','Priorità','Stato','Deadline','Note'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide [color:var(--text-3)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memberTasks.map(t => (
                        <tr key={t.id} className="border-b [border-color:var(--border)] hover:[background:var(--surface2)] transition-colors">
                          <td className="px-4 py-3 [color:var(--text-2)]">{t.clientName || '—'}</td>
                          <td className="px-4 py-3 [color:var(--text-3)] text-xs">{t.projectName || '—'}</td>
                          <td className="px-4 py-3 font-medium [color:var(--text-1)] max-w-[180px] truncate">{t.title}</td>
                          <td className="px-4 py-3">
                            <span className={'rounded-full px-2.5 py-0.5 text-xs ' + (PRIORITY_COLORS[t.priority] ?? '[background:var(--surface3)] [color:var(--text-2)]')}>{t.priority || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={'rounded-full px-2.5 py-0.5 text-xs ' + (STATUS_COLORS[t.status] ?? '[background:var(--surface3)] [color:var(--text-2)]')}>{t.status || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={t.dueDate && new Date(t.dueDate) < new Date() && !t.isCompleted ? '[color:#e74c3c] font-semibold text-xs' : 'text-xs [color:var(--text-3)]'}>
                              {formatDate(t.dueDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs [color:var(--text-3)] max-w-[160px] truncate">{t.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'anagrafica' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b [border-color:var(--border)] [background:var(--surface2)]">
                {['','Nome','Cognome','Ruolo','Email','Cellulare','Data Inizio','Note',''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide [color:var(--text-3)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.teamMembers.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-sm [color:var(--text-3)]">Nessun membro.</td></tr>
              )}
              {data.teamMembers.map(m => (
                <tr key={m.id} className="border-b [border-color:var(--border)] hover:[background:var(--surface2)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: m.colorHex, color: '#2D2D2D' }}>
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium [color:var(--text-1)]">{m.fullName}</td>
                  <td className="px-4 py-3 [color:var(--text-2)]">{m.lastName || '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full [background:var(--surface3)] px-2.5 py-0.5 text-xs [color:var(--text-2)]">{m.role || '—'}</span></td>
                  <td className="px-4 py-3 [color:var(--text-3)]">{m.email ? <a href={'mailto:' + m.email} className="hover:underline">{m.email}</a> : '—'}</td>
                  <td className="px-4 py-3 [color:var(--text-3)]">{m.phone ? <a href={'tel:' + m.phone} className="hover:underline">{m.phone}</a> : '—'}</td>
                  <td className="px-4 py-3 text-xs [color:var(--text-3)]">{formatDate(m.startDate) || '—'}</td>
                  <td className="px-4 py-3 text-xs [color:var(--text-3)] max-w-[180px] truncate">{m.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(m)} className="[color:var(--text-3)] hover:[color:var(--text-2)] text-sm" title="Modifica">&#9998;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'add' ? 'Nuovo membro' : 'Modifica ' + (editing?.fullName ?? '')}
          onClose={() => setModal(null)}
          onSave={save}
          saveDisabled={!form.fullName.trim()}
          onDelete={modal === 'edit' ? deleteMember : undefined}
        >
          <Field label="Nome *">
            <input className="input" value={form.fullName} onChange={f('fullName')} placeholder="Es. Mario" />
          </Field>
          <Field label="Cognome">
            <input className="input" value={form.lastName} onChange={f('lastName')} placeholder="Es. Rossi" />
          </Field>
          <Field label="Ruolo">
            <select className="input" value={form.role} onChange={f('role')}>
              <option value="">— Seleziona —</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Colore">
            <div className="flex flex-wrap gap-2 mt-1">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, colorHex: c }))}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: form.colorHex === c ? '#C8511A' : 'transparent' }}
                />
              ))}
              <input type="color" value={form.colorHex} onChange={f('colorHex')} className="h-7 w-7 rounded-full cursor-pointer border-0" title="Colore personalizzato" />
            </div>
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={f('email')} placeholder="email@mod.it" />
          </Field>
          <Field label="Cellulare">
            <input className="input" value={form.phone} onChange={f('phone')} placeholder="+39 333 000 0000" />
          </Field>
          <Field label="Data Inizio">
            <input className="input" type="date" value={form.startDate} onChange={f('startDate')} />
          </Field>
          <Field label="Note" full>
            <input className="input" value={form.notes} onChange={f('notes')} placeholder="Note libere" />
          </Field>
        </Modal>
      )}
    </div>
  );
}
