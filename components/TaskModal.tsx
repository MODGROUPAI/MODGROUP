'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types';

interface TaskModalProps {
  task?: Task | null;
  clients: string[];
  team: string[];
  onSave: (task: Task) => void;
  onClose: () => void;
}

const EMPTY: Omit<Task, 'id'> = {
  clientName: '', projectName: '', title: '',
  startDate: '', dueDate: '', priority: 'Media',
  status: 'Da fare', responsible: '', notes: '', isCompleted: false, driveLink: '',
};

export function TaskModal({ task, clients, team, onSave, onClose }: TaskModalProps) {
  const [form, setForm] = useState<Omit<Task, 'id'>>(EMPTY);

  useEffect(() => {
    if (task) {
      const { id, ...rest } = task;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
  }, [task]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    const saved: Task = {
      id: task?.id ?? `TASK${Date.now()}`,
      ...form,
      isCompleted: form.status === 'Completata',
    };
    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
            {task ? 'Modifica Task' : 'Nuovo Task'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: "var(--text-3)" }}>✕</button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {/* Task */}
          <div className="col-span-2">
            <label className="label">Task *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Descrizione del task" />
          </div>

          {/* Cliente */}
          <div>
            <label className="label">Cliente</label>
            <input className="input" list="clients-list" value={form.clientName ?? ''} onChange={e => set('clientName', e.target.value)} placeholder="Nome cliente" />
            <datalist id="clients-list">{clients.map(c => <option key={c} value={c} />)}</datalist>
          </div>

          {/* Progetto */}
          <div>
            <label className="label">Progetto</label>
            <input className="input" value={form.projectName ?? ''} onChange={e => set('projectName', e.target.value)} placeholder="Nome progetto" />
          </div>

          {/* Responsible */}
          <div>
            <label className="label">Responsabile</label>
            <input className="input" list="team-list" value={form.responsible ?? ''} onChange={e => set('responsible', e.target.value)} placeholder="Nome responsabile" />
            <datalist id="team-list">{team.map(t => <option key={t} value={t} />)}</datalist>
          </div>

          {/* Priorità */}
          <div>
            <label className="label">Priorità</label>
            <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {['Bassa','Media','Alta','Urgente'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* Stato */}
          <div>
            <label className="label">Stato</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {['Da fare','In corso','In attesa','Sospesa','Completata'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Data inizio */}
          <div>
            <label className="label">Data inizio</label>
            <input className="input" type="date" value={form.startDate ?? ''} onChange={e => set('startDate', e.target.value)} />
          </div>

          {/* Deadline */}
          <div>
            <label className="label">Deadline</label>
            <input className="input" type="date" value={form.dueDate ?? ''} onChange={e => set('dueDate', e.target.value)} />
          </div>

          {/* Drive link */}
          <div className="col-span-2">
            <label className="label">Link Google Drive</label>
            <input className="input" type="url" value={form.driveLink ?? ''} onChange={e => set('driveLink', e.target.value)} placeholder="https://drive.google.com/..." />
          </div>

          {/* Note */}
          <div className="col-span-2">
            <label className="label">Note</label>
            <textarea className="input resize-none" rows={3} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Note aggiuntive..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm" style={{ border: "1px solid var(--border2)", color: "var(--text-3)" }}>
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition-colors"
            style={{ backgroundColor: '#C8511A' }}
          >
            {task ? 'Salva modifiche' : 'Crea task'}
          </button>
        </div>
      </div>
    </div>
  );
}
