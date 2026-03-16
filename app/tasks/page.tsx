'use client';

import { useState, useRef } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { TaskModal } from '@/components/TaskModal';
import { formatDate } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { TaskComments } from '@/components/TaskComments';

const PRIORITY_COLORS: Record<string, string> = {
  'Bassa': '[background:var(--surface3)] [color:var(--text-2)]',
  'Media': '[background:rgba(59,158,255,0.15)] [color:#3b9eff]',
  'Alta': '[background:rgba(245,197,24,0.15)] [color:#f5c518]',
  'Urgente': '[background:rgba(231,76,60,0.15)] [color:#e74c3c] font-semibold',
};

const STATUS_COLORS: Record<string, string> = {
  'Da fare': '[background:var(--surface3)] [color:var(--text-2)]',
  'In corso': '[background:rgba(200,81,26,0.15)] [color:var(--brand-light)]',
  'In attesa': '[background:rgba(245,197,24,0.15)] [color:#f5c518]',
  'Sospesa': '[background:rgba(139,92,246,0.15)] [color:#a78bfa]',
  'Completata': '[background:rgba(46,204,113,0.15)] [color:#2ecc71]',
};

const COLUMNS: { status: string; color: string; bg: string }[] = [
  { status: 'Da fare',    color: '[color:var(--text-2)]',  bg: '[background:var(--surface2)]' },
  { status: 'In corso',   color: '[color:var(--brand-light)]', bg: '[background:rgba(200,81,26,0.07)]' },
  { status: 'In attesa',  color: '[color:#f5c518]',  bg: '[background:rgba(245,197,24,0.07)]' },
  { status: 'Sospesa',    color: '[color:#a78bfa]',  bg: '[background:rgba(139,92,246,0.07)]' },
  { status: 'Completata', color: '[color:#2ecc71]',  bg: 'bg-green-50' },
];

type View = 'table' | 'kanban';

export default function TasksPage() {
  const { data, update } = useData();
  const [view, setView] = useState<View>('table');
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Drag state
  const dragId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const today = new Date(); today.setHours(0,0,0,0);

  const filtered = data.tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterResponsible && t.responsible !== filterResponsible) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [t.title, t.clientName, t.projectName, t.responsible, t.status, t.priority, t.notes]
      .some(v => v?.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clientNames = [...new Set(data.clients.map(c => c.name).filter(Boolean))];
  const teamNames = [...new Set(data.teamMembers.map(t => t.fullName).filter(Boolean))];
  const allResponsibles = [...new Set(data.tasks.map(t => t.responsible).filter(Boolean))];

  const handleSave = (saved: Task) => {
    const exists = data.tasks.find(t => t.id === saved.id);
    update({ tasks: exists ? data.tasks.map(t => t.id === saved.id ? saved : t) : [saved, ...data.tasks] });
  };

  const handleDuplicate = (t: Task) => {
    const copy: Task = { ...t, id: `TASK${Date.now()}`, title: `${t.title} (copia)`, isCompleted: false };
    update({ tasks: [copy, ...data.tasks] });
  };

  const handleDelete = (id: string) => {
    update({ tasks: data.tasks.filter(t => t.id !== id) });
    setDeleteId(null);
  };

  // Drag & drop handlers
  const onDragStart = (id: string) => { dragId.current = id; };
  const onDragOver = (e: React.DragEvent, status: string) => { e.preventDefault(); setDragOver(status); };
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragId.current) return;
    const task = data.tasks.find(t => t.id === dragId.current);
    if (!task || task.status === status) return;
    update({ tasks: data.tasks.map(t => t.id === dragId.current ? { ...t, status, isCompleted: status === 'Completata' } : t) });
    dragId.current = null;
  };

  const overdueCount = data.tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < today).length;

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Tracker Operativo"
        description={`${data.tasks.length} task totali${overdueCount > 0 ? ` · ${overdueCount} in ritardo` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Toggle view */}
            <div className="flex rounded-xl border [border-color:var(--border2)] overflow-hidden text-sm">
              <button onClick={() => setView('table')} className={'px-3 py-1.5 transition-colors ' + (view === 'table' ? 'text-white' : '[color:var(--text-3)] hover:[background:var(--surface2)]')} style={view === 'table' ? { backgroundColor: '#C8511A' } : {}}>
                ☰ Tabella
              </button>
              <button onClick={() => setView('kanban')} className={'px-3 py-1.5 transition-colors ' + (view === 'kanban' ? 'text-white' : '[color:var(--text-3)] hover:[background:var(--surface2)]')} style={view === 'kanban' ? { backgroundColor: '#C8511A' } : {}}>
                ⊞ Kanban
              </button>
            </div>
            <button onClick={() => setModalTask(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
              + Nuovo Task
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="w-full max-w-xs rounded-xl border [border-color:var(--border2)] [background:var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          placeholder="Cerca cliente, task, responsabile..."
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
        />
        <select className="input text-sm" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Tutti gli stati</option>
          {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.status}</option>)}
        </select>
        <select className="input text-sm" value={filterResponsible} onChange={e => { setFilterResponsible(e.target.value); setPage(1); }}>
          <option value="">Tutti i responsabili</option>
          {allResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterStatus || filterResponsible || query) && (
          <button onClick={() => { setFilterStatus(''); setFilterResponsible(''); setQuery(''); }} className="text-xs [color:var(--text-3)] hover:[color:var(--text-2)]">✕ Reset filtri</button>
        )}
        <span className="text-xs [color:var(--text-3)] ml-auto">{filtered.length} risultati</span>
      </div>

      {/* ── TABELLA ── */}
      {view === 'table' && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b [border-color:var(--border)] [background:var(--surface2)]">
                    {['Cliente','Progetto','Task','Responsible','Priorità','Stato','Deadline','Note',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal [color:var(--text-3)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9}>
                      <EmptyState
                        icon={data.tasks.length === 0 ? "✅" : "🔍"}
                        title={data.tasks.length === 0 ? "Nessun task ancora" : "Nessun risultato"}
                        description={data.tasks.length === 0 ? "Il tracker è vuoto. Importa il file Excel o aggiungi il primo task manualmente." : "Prova a cambiare i filtri o cerca con un termine diverso."}
                        action={data.tasks.length === 0 ? { label: "+ Nuovo task", onClick: () => setModalTask(null) } : undefined}
                        size="sm"
                      />
                    </td></tr>
                  ) : paginated.map(t => {
                    const isOverdue = t.dueDate && new Date(t.dueDate) < today && !t.isCompleted;
                    const dueDiff = t.dueDate && !t.isCompleted ? (new Date(t.dueDate).setHours(0,0,0,0) - today.getTime()) / 86400000 : null;
                    const isDueSoon = dueDiff !== null && dueDiff >= 0 && dueDiff <= 3;
                    const rowBg = isOverdue
                      ? '[background:rgba(231,76,60,0.08)] hover:[background:rgba(231,76,60,0.12)]'
                      : isDueSoon
                        ? '[background:rgba(245,197,24,0.06)] hover:[background:rgba(245,197,24,0.10)]'
                        : 'hover:[background:var(--surface2)]';
                    return (
                      <tr key={t.id} className={'border-b [border-color:var(--border)] transition-colors group ' + rowBg}>
                        <td className="px-4 py-3 [color:var(--text-1)]">{t.clientName || '—'}</td>
                        <td className="px-4 py-3 [color:var(--text-3)] text-xs">{t.projectName || '—'}</td>
                        <td className="px-4 py-3 font-medium [color:var(--text-1)] max-w-[180px] truncate">{t.title}</td>
                        <td className="px-4 py-3 [color:var(--text-2)]">{t.responsible || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={'rounded-full px-2.5 py-0.5 text-xs ' + (PRIORITY_COLORS[t.priority] ?? '[background:var(--surface3)] [color:var(--text-2)]')}>{t.priority || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={'rounded-full px-2.5 py-0.5 text-xs ' + (STATUS_COLORS[t.status] ?? '[background:var(--surface3)] [color:var(--text-2)]')}>{t.status || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={isOverdue ? '[color:#e74c3c] font-semibold text-xs' : 'text-xs [color:var(--text-3)]'}>
                            {formatDate(t.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs [color:var(--text-3)] max-w-[140px] truncate">{t.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setModalTask(t)} className="rounded-lg px-2 py-1 text-xs [color:var(--text-3)] hover:[background:var(--surface3)]" title="Modifica">✏️</button>
                            <button onClick={() => setDeleteId(t.id)} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:[background:rgba(231,76,60,0.06)]" title="Elimina">🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs [color:var(--text-3)]">
              <span>Pagina {page} di {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="rounded-lg border [border-color:var(--border2)] px-3 py-1.5 hover:[background:var(--surface2)] disabled:opacity-40">← Prec</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="rounded-lg border [border-color:var(--border2)] px-3 py-1.5 hover:[background:var(--surface2)] disabled:opacity-40">Succ →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── KANBAN ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.status);
            const isOver = dragOver === col.status;
            return (
              <div
                key={col.status}
                className={'flex flex-col rounded-2xl min-w-[240px] w-64 shrink-0 transition-colors ' + (isOver ? 'ring-2 ring-orange-400 bg-orange-50' : col.bg)}
                onDragOver={e => onDragOver(e, col.status)}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => onDrop(e, col.status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
                  <span className={'text-sm font-semibold ' + col.color}>{col.status}</span>
                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + STATUS_COLORS[col.status]}>{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {colTasks.length === 0 && (
                    <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed [border-color:var(--border2)] text-xs [color:var(--text-3)]">
                      Trascina qui
                    </div>
                  )}
                  {colTasks.map(t => {
                    const isOverdue = t.dueDate && new Date(t.dueDate) < today && !t.isCompleted;
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => onDragStart(t.id)}
                        onDragEnd={() => setDragOver(null)}
                        className={'rounded-xl [background:var(--surface)] p-3 shadow-sm cursor-grab active:cursor-grabbing border transition-shadow hover:shadow-md ' + (isOverdue ? 'border-red-200' : '[border-color:var(--border)]')}
                      >
                        {/* Client + project */}
                        <p className="text-xs [color:var(--text-3)] mb-1 truncate">{[t.clientName, t.projectName].filter(Boolean).join(' · ') || '—'}</p>
                        {/* Title */}
                        <p className="text-sm font-medium [color:var(--text-1)] mb-2 line-clamp-2">{t.title}</p>
                        {/* Footer */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={'rounded-full px-2 py-0.5 text-xs ' + (PRIORITY_COLORS[t.priority] ?? '[background:var(--surface3)] [color:var(--text-2)]')}>{t.priority || '—'}</span>
                          <span className={'text-xs ' + (isOverdue ? '[color:#e74c3c] font-semibold' : '[color:var(--text-3)]')}>{formatDate(t.dueDate) || ''}</span>
                        </div>
                        {t.responsible && <p className="text-xs [color:var(--text-3)] mt-1.5">👤 {t.responsible}</p>}
                        {t.driveLink && <a href={t.driveLink} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-xs mt-1 inline-block px-1.5 py-0.5 rounded" style={{ color:'#2ecc71', background:'rgba(46,204,113,0.1)' }}>↗ Drive</a>}
                        {/* Actions */}
                        <div className="flex gap-1 mt-2 pt-2 border-t [border-color:var(--border)]">
                          <button onClick={() => setModalTask(t)} className="text-xs [color:var(--text-3)] hover:[color:var(--text-2)] px-1">✏️ Modifica</button>
                          <button onClick={() => setDeleteId(t.id)} className="text-xs text-red-300 hover:[color:#e74c3c] px-1 ml-auto">🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add task button */}
                <button
                  onClick={() => { setModalTask(null); }}
                  className="m-3 mt-0 rounded-xl border-2 border-dashed [border-color:var(--border2)] py-2 text-xs [color:var(--text-3)] hover:border-orange-300 hover:text-orange-500 transition-colors"
                >
                  + Aggiungi task
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crea/modifica */}
      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          clients={clientNames}
          team={teamNames}
          onSave={handleSave}
          onClose={() => setModalTask(undefined)}
        />
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl [background:var(--surface)] p-6 shadow-2xl">
            <h3 className="text-base font-semibold mb-2">Eliminare questo task?</h3>
            <p className="text-sm [color:var(--text-3)] mb-6">L'azione non puo essere annullata nell'app, ma l'Excel originale rimane intatto.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border [border-color:var(--border2)] px-4 py-2 text-sm [color:var(--text-3)] hover:[background:var(--surface2)]">Annulla</button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-xl [background:rgba(231,76,60,0.06)]0 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
