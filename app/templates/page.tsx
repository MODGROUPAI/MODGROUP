'use client';
import { localDateISO, addDaysISO } from '@/lib/utils';

import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { DEFAULT_TEMPLATES, applyTemplate } from '@/lib/defaultTemplates';
import { PageHeader } from '@/components/PageHeader';
import type { ProjectTemplate, TemplateTask, Task } from '@/lib/types';

const SERVICE_TYPES = [
  'Social Media Management', 'Campagna ADV', 'Onboarding Cliente',
  'Lancio Prodotto', 'Sito Web', 'Email Marketing', 'Shooting Foto/Video',
  'Consulenza Strategica', 'Altro',
];

const PRIORITIES = ['Bassa', 'Media', 'Alta', 'Urgente'];

const EMPTY_TASK: Omit<TemplateTask, 'id'> = { title: '', priority: 'Media', dueDaysOffset: 0, responsible: '', notes: '' };
const EMPTY_TPL: Omit<ProjectTemplate, 'id' | 'createdAt' | 'tasks'> = { name: '', description: '', serviceType: 'Social Media Management' };

// ── Preset templates built-in ──────────────────────────────────
const PRESETS: Omit<ProjectTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'Onboarding Cliente Social',
    description: 'Attivazione nuovo cliente social media',
    serviceType: 'Onboarding Cliente',
    tasks: [
      { id: 'p1', title: 'Kickoff call con il cliente', priority: 'Alta', dueDaysOffset: 1, responsible: 'Account', notes: '' },
      { id: 'p2', title: 'Raccolta asset (logo, foto, credenziali)', priority: 'Alta', dueDaysOffset: 3, responsible: 'Account', notes: '' },
      { id: 'p3', title: 'Analisi competitor e benchmark', priority: 'Media', dueDaysOffset: 5, responsible: 'Strategist', notes: '' },
      { id: 'p4', title: 'Definizione tone of voice e linee guida', priority: 'Alta', dueDaysOffset: 7, responsible: 'Copywriter', notes: '' },
      { id: 'p5', title: 'Creazione piano editoriale primo mese', priority: 'Alta', dueDaysOffset: 10, responsible: 'Social Media Manager', notes: '' },
      { id: 'p6', title: 'Setup profili e strumenti di scheduling', priority: 'Media', dueDaysOffset: 12, responsible: 'Social Media Manager', notes: '' },
      { id: 'p7', title: 'Approvazione piano editoriale', priority: 'Alta', dueDaysOffset: 14, responsible: 'Account', notes: 'Inviare al cliente per approvazione' },
    ],
  },
  {
    name: 'Lancio Campagna ADV Meta',
    description: 'Setup e lancio campagna su Meta Ads',
    serviceType: 'Campagna ADV',
    tasks: [
      { id: 'p1', title: 'Brief creativo', priority: 'Alta', dueDaysOffset: 1, responsible: 'Account', notes: '' },
      { id: 'p2', title: 'Definizione target e obiettivi', priority: 'Alta', dueDaysOffset: 2, responsible: 'Strategist', notes: '' },
      { id: 'p3', title: 'Produzione creatività (immagini/video)', priority: 'Alta', dueDaysOffset: 7, responsible: 'Grafico', notes: '' },
      { id: 'p4', title: 'Copywriting annunci', priority: 'Media', dueDaysOffset: 8, responsible: 'Copywriter', notes: '' },
      { id: 'p5', title: 'Setup Business Manager e pixel', priority: 'Media', dueDaysOffset: 5, responsible: 'Media Buyer', notes: '' },
      { id: 'p6', title: 'Creazione campagna e adset', priority: 'Alta', dueDaysOffset: 10, responsible: 'Media Buyer', notes: '' },
      { id: 'p7', title: 'Revisione e approvazione cliente', priority: 'Urgente', dueDaysOffset: 12, responsible: 'Account', notes: '' },
      { id: 'p8', title: 'Go live campagna', priority: 'Urgente', dueDaysOffset: 14, responsible: 'Media Buyer', notes: '' },
      { id: 'p9', title: 'Report 7 giorni post-lancio', priority: 'Media', dueDaysOffset: 21, responsible: 'Media Buyer', notes: '' },
    ],
  },
  {
    name: 'Shooting Foto/Video',
    description: 'Organizzazione e produzione shooting',
    serviceType: 'Shooting Foto/Video',
    tasks: [
      { id: 'p1', title: 'Moodboard e concept visivo', priority: 'Alta', dueDaysOffset: 3, responsible: 'Creativi', notes: '' },
      { id: 'p2', title: 'Scouting location', priority: 'Media', dueDaysOffset: 5, responsible: 'Produzione', notes: '' },
      { id: 'p3', title: 'Prenotazione fotografo/videomaker', priority: 'Alta', dueDaysOffset: 7, responsible: 'Account', notes: '' },
      { id: 'p4', title: 'Briefing team creativo', priority: 'Media', dueDaysOffset: 10, responsible: 'Account', notes: '' },
      { id: 'p5', title: 'Giorno shooting', priority: 'Urgente', dueDaysOffset: 14, responsible: 'Produzione', notes: '' },
      { id: 'p6', title: 'Selezione e consegna materiali grezzi', priority: 'Media', dueDaysOffset: 17, responsible: 'Fotografo', notes: '' },
      { id: 'p7', title: 'Post-produzione e ritocchi', priority: 'Media', dueDaysOffset: 21, responsible: 'Grafico', notes: '' },
      { id: 'p8', title: 'Consegna finale al cliente', priority: 'Alta', dueDaysOffset: 25, responsible: 'Account', notes: '' },
    ],
  },
];

interface ApplyModalState {
  template: ProjectTemplate;
  clientName: string;
  projectName: string;
  startDate: string;
}

export default function TemplatesPage() {
  const { data, update } = useData();
  // Combina template salvati + default (default solo se non già importati)
  const savedTemplates = data.templates ?? [];
  const defaultIds     = new Set(savedTemplates.map(t => t.id));
  const defaultToShow  = DEFAULT_TEMPLATES.filter(d => !defaultIds.has(d.id));
  const templates      = [...savedTemplates, ...defaultToShow];

  const [editModal, setEditModal] = useState<ProjectTemplate | null | 'new' | null>(null);
  const [editForm, setEditForm] = useState<Omit<ProjectTemplate, 'id' | 'createdAt'>>(
    { ...EMPTY_TPL, tasks: [] }
  );
  const [applyModal, setApplyModal] = useState<ApplyModalState | null>(null);
  const [applyFeedback, setApplyFeedback] = useState('');

  // ── Edit template ──────────────────────────────────────────
  const openNew = () => {
    setEditForm({ ...EMPTY_TPL, tasks: [] });
    setEditModal('new');
  };
  const openEdit = (tpl: ProjectTemplate) => {
    setEditForm({ name: tpl.name, description: tpl.description, serviceType: tpl.serviceType, tasks: tpl.tasks });
    setEditModal(tpl);
  };
  const openPreset = (preset: typeof PRESETS[0]) => {
    setEditForm({ name: preset.name + ' (copia)', description: preset.description, serviceType: preset.serviceType, tasks: preset.tasks.map(t => ({ ...t })) });
    setEditModal('new');
  };

  const saveTemplate = () => {
    if (!editForm.name.trim()) return;
    const now = localDateISO();
    if (editModal === 'new') {
      const newTpl: ProjectTemplate = { id: `TPL${Date.now()}`, createdAt: now, ...editForm };
      update({ templates: [newTpl, ...templates] });
    } else if (editModal) {
      update({ templates: templates.map(t => t.id === editModal.id ? { ...editModal, ...editForm } : t) });
    }
    setEditModal(null);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm('Eliminare questo template?')) return;
    update({ templates: templates.filter(t => t.id !== id) });
  };

  // ── Task editing inside template ───────────────────────────
  const addTaskRow = () => {
    setEditForm(f => ({ ...f, tasks: [...f.tasks, { ...EMPTY_TASK, id: `T${Date.now()}` }] }));
  };
  const updateTaskRow = (idx: number, key: keyof TemplateTask, val: string | number) => {
    setEditForm(f => ({ ...f, tasks: f.tasks.map((t, i) => i === idx ? { ...t, [key]: val } : t) }));
  };
  const removeTaskRow = (idx: number) => {
    setEditForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== idx) }));
  };
  const moveTask = (idx: number, dir: -1 | 1) => {
    setEditForm(f => {
      const tasks = [...f.tasks];
      const swap = idx + dir;
      if (swap < 0 || swap >= tasks.length) return f;
      [tasks[idx], tasks[swap]] = [tasks[swap], tasks[idx]];
      return { ...f, tasks };
    });
  };

  // ── Apply template ─────────────────────────────────────────
  const openApply = (tpl: ProjectTemplate) => {
    setApplyModal({ template: tpl, clientName: '', projectName: tpl.name, startDate: localDateISO() });
    setApplyFeedback('');
  };
  const applyTemplate = () => {
    if (!applyModal) return;
    const { template, clientName, projectName, startDate } = applyModal;
    const base = new Date(startDate);
    const newTasks: Task[] = template.tasks.map(tt => {
      const due = new Date(base);
      due.setDate(due.getDate() + tt.dueDaysOffset);
      return {
        id: `TSK${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        title: tt.title,
        clientName: clientName || '',
        projectName: projectName,
        priority: tt.priority,
        status: 'Da fare',
        responsible: tt.responsible || '',
        dueDate: localDateISO(due),
        notes: tt.notes || '',
        isCompleted: false,
        startDate: startDate,
      };
    });
    update({ tasks: [...newTasks, ...data.tasks] });
    setApplyFeedback(`${newTasks.length} task creati nel Tracker Operativo!`);
    setTimeout(() => setApplyModal(null), 1800);
  };

  const clientNames = [...new Set(data.clients.map(c => c.name).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Template di Progetto"
        description={`${templates.length} template salvati`}
        actions={
          <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
            + Nuovo Template
          </button>
        }
      />

      {/* Preset library */}
      {templates.length === 0 && (
        <div className="mb-6 card p-5">
          <p className="text-sm font-semibold [color:var(--text-1)] mb-1">Inizia dai template predefiniti</p>
          <p className="text-xs [color:var(--text-3)] mb-4">Scegli un punto di partenza e personalizzalo.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => openPreset(p)}
                className="text-left rounded-xl border border-dashed [border-color:var(--border2)] p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                <p className="text-sm font-medium [color:var(--text-1)]">{p.name}</p>
                <p className="text-xs [color:var(--text-3)] mt-1">{p.tasks.length} task · {p.serviceType}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map(tpl => (
            <div key={tpl.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold [color:var(--text-1)]">{tpl.name}</p>
                  <p className="text-xs [color:var(--text-3)] mt-0.5">{tpl.serviceType}</p>
                </div>
                <span className="shrink-0 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5">{tpl.tasks.length} task</span>
              </div>
              {tpl.description && <p className="text-xs [color:var(--text-3)]">{tpl.description}</p>}
              {/* Task preview */}
              <div className="flex flex-col gap-1">
                {tpl.tasks.slice(0, 4).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs [color:var(--text-2)]">
                    <span className="w-4 shrink-0 [color:var(--text-3)] text-right">{i+1}.</span>
                    <span className="truncate flex-1">{t.title}</span>
                    <span className="shrink-0 [color:var(--text-3)]">+{t.dueDaysOffset}gg</span>
                  </div>
                ))}
                {tpl.tasks.length > 4 && (
                  <p className="text-xs [color:var(--text-3)] pl-6">... e altri {tpl.tasks.length - 4} task</p>
                )}
              </div>
              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-3 border-t [border-color:var(--border)]">
                <button onClick={() => openApply(tpl)}
                  className="flex-1 rounded-xl py-2 text-xs font-semibold text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
                  ▶ Applica
                </button>
                <button onClick={() => openEdit(tpl)} className="rounded-xl border [border-color:var(--border2)] px-3 py-2 text-xs [color:var(--text-3)] hover:[background:var(--surface2)]">✏️</button>
                <button onClick={() => deleteTemplate(tpl.id)} className="rounded-xl border [border-color:var(--border2)] px-3 py-2 text-xs text-red-400 hover:[background:rgba(231,76,60,0.06)]">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preset shortcuts (when templates exist) */}
      {templates.length > 0 && (
        <div className="mt-6">
          <p className="text-xs [color:var(--text-3)] mb-2">Aggiungi da preset:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => openPreset(p)}
                className="rounded-xl border border-dashed [border-color:var(--border2)] px-3 py-1.5 text-xs [color:var(--text-3)] hover:border-orange-300 hover:text-orange-600 transition-colors">
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal edit template ── */}
      {editModal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
          <div className="w-full max-w-2xl rounded-2xl [background:var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b [border-color:var(--border)] px-6 py-4">
              <h2 className="text-base font-semibold">{editModal === 'new' ? 'Nuovo Template' : 'Modifica Template'}</h2>
              <button onClick={() => setEditModal(null)} className="[color:var(--text-3)] hover:[color:var(--text-2)] text-xl">×</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Nome template *</label>
                  <input className="input w-full" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Onboarding Cliente Social" />
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Tipo servizio</label>
                  <select className="input w-full" value={editForm.serviceType} onChange={e => setEditForm(f => ({ ...f, serviceType: e.target.value }))}>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Descrizione</label>
                  <input className="input w-full" value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              {/* Task list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium [color:var(--text-3)]">Task ({editForm.tasks.length})</label>
                  <button onClick={addTaskRow} className="text-xs text-orange-600 hover:underline">+ Aggiungi task</button>
                </div>
                {editForm.tasks.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed [border-color:var(--border2)] py-8 text-center text-xs [color:var(--text-3)]">
                    Nessun task — clicca "+ Aggiungi task"
                  </div>
                )}
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                  {editForm.tasks.map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-xl border [border-color:var(--border)] [background:var(--surface2)] px-3 py-2">
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button onClick={() => moveTask(idx, -1)} className="[color:var(--text-3)] hover:[color:var(--text-3)] text-xs leading-none">▲</button>
                        <button onClick={() => moveTask(idx, 1)} className="[color:var(--text-3)] hover:[color:var(--text-3)] text-xs leading-none">▼</button>
                      </div>
                      <span className="text-xs [color:var(--text-3)] w-5 shrink-0 text-right">{idx+1}.</span>
                      <input className="input flex-1 text-xs py-1" value={t.title} onChange={e => updateTaskRow(idx, 'title', e.target.value)} placeholder="Titolo task" />
                      <select className="input text-xs py-1 w-24 shrink-0" value={t.priority} onChange={e => updateTaskRow(idx, 'priority', e.target.value)}>
                        {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                      </select>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs [color:var(--text-3)]">+</span>
                        <input className="input text-xs py-1 w-14" type="number" min={0} value={t.dueDaysOffset} onChange={e => updateTaskRow(idx, 'dueDaysOffset', parseInt(e.target.value) || 0)} />
                        <span className="text-xs [color:var(--text-3)]">gg</span>
                      </div>
                      <input className="input text-xs py-1 w-28 shrink-0" value={t.responsible ?? ''} onChange={e => updateTaskRow(idx, 'responsible', e.target.value)} placeholder="Ruolo" />
                      <button onClick={() => removeTaskRow(idx)} className="text-red-300 hover:[color:#e74c3c] text-sm shrink-0">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t [border-color:var(--border)] px-6 py-4">
              <button onClick={() => setEditModal(null)} className="rounded-xl border [border-color:var(--border2)] px-4 py-2 text-sm [color:var(--text-3)] hover:[background:var(--surface2)]">Annulla</button>
              <button onClick={saveTemplate} disabled={!editForm.name.trim()} className="rounded-xl px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>Salva Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal applica template ── */}
      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl [background:var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b [border-color:var(--border)] px-6 py-4">
              <h2 className="text-base font-semibold">Applica "{applyModal.template.name}"</h2>
              <button onClick={() => setApplyModal(null)} className="[color:var(--text-3)] hover:[color:var(--text-2)] text-xl">×</button>
            </div>
            {applyFeedback ? (
              <div className="px-6 py-10 text-center">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-sm font-semibold [color:#2ecc71]">{applyFeedback}</p>
              </div>
            ) : (
              <>
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Cliente</label>
                    <input list="clients-list" className="input w-full" value={applyModal.clientName}
                      onChange={e => setApplyModal(m => m ? { ...m, clientName: e.target.value } : m)}
                      placeholder="Nome cliente (opzionale)" />
                    <datalist id="clients-list">{clientNames.map(n => <option key={n} value={n} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Nome progetto</label>
                    <input className="input w-full" value={applyModal.projectName}
                      onChange={e => setApplyModal(m => m ? { ...m, projectName: e.target.value } : m)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium [color:var(--text-3)] mb-1">Data di avvio</label>
                    <input type="date" className="input w-full" value={applyModal.startDate}
                      onChange={e => setApplyModal(m => m ? { ...m, startDate: e.target.value } : m)} />
                  </div>
                  <div className="rounded-xl [background:var(--surface2)] p-3 text-xs [color:var(--text-3)]">
                    Verranno creati <strong>{applyModal.template.tasks.length} task</strong> nel Tracker Operativo con le deadline calcolate dalla data di avvio.
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t [border-color:var(--border)] px-6 py-4">
                  <button onClick={() => setApplyModal(null)} className="rounded-xl border [border-color:var(--border2)] px-4 py-2 text-sm [color:var(--text-3)] hover:[background:var(--surface2)]">Annulla</button>
                  <button onClick={applyTemplate} className="rounded-xl px-5 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
                    ▶ Crea {applyModal.template.tasks.length} task
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
