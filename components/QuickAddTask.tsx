'use client';

import { useState, useEffect, useRef } from 'react';
import { useData } from '@/hooks/useData';
import type { Task } from '@/lib/types';

interface QuickAddTaskProps {
  onClose: () => void;
}

export function QuickAddTask({ onClose }: QuickAddTaskProps) {
  const { data, update } = useData();
  const [form, setForm] = useState({ title: '', clientName: '', responsible: '', dueDate: '', priority: 'Media', status: 'Da fare' });
  const inputRef = useRef<HTMLInputElement>(null);

  const clientNames = [...new Set(data.clients.map(c => c.name).filter(Boolean))];
  const teamNames = [...new Set(data.teamMembers.map(t => t.fullName).filter(Boolean))];

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    const task: Task = {
      id: `TASK${Date.now()}`,
      ...form,
      isCompleted: form.status === 'Completata',
    };
    update({ tasks: [task, ...data.tasks] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--brand)' }}>⚡</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Nuovo task rapido</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface3)', color: 'var(--text-3)' }}>ESC per chiudere</span>
        </div>

        {/* Form */}
        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Task *</label>
            <input ref={inputRef} className="input" value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Descrizione del task..." />
          </div>
          <div>
            <label className="label">Cliente</label>
            <input className="input" list="qa-clients" value={form.clientName}
              onChange={e => set('clientName', e.target.value)} placeholder="Nome cliente" />
            <datalist id="qa-clients">{clientNames.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="label">Responsabile</label>
            <input className="input" list="qa-team" value={form.responsible}
              onChange={e => set('responsible', e.target.value)} placeholder="Membro team" />
            <datalist id="qa-team">{teamNames.map(t => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input className="input" type="date" value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Priorità</label>
            <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {['Bassa','Media','Alta','Urgente'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Invio per salvare</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border2)', color: 'var(--text-3)' }}>
              Annulla
            </button>
            <button onClick={handleSave}
              disabled={!form.title.trim()}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: 'var(--brand)' }}>
              Crea task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
