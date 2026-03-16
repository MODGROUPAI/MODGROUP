'use client';

import { useState, useEffect } from 'react';

interface Note { id: string; text: string; color: string; createdAt: string; }

const NOTE_COLORS = [
  { bg: 'rgba(245,197,24,0.12)', border: 'rgba(245,197,24,0.3)', text: '#f5c518' },
  { bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.25)', text: '#2ecc71' },
  { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)', text: '#3b82f6' },
  { bg: 'rgba(200,81,26,0.10)', border: 'rgba(200,81,26,0.25)', text: '#C8511A' },
];

export function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pmo_sticky_notes');
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: Note[]) => {
    setNotes(updated);
    try { localStorage.setItem('pmo_sticky_notes', JSON.stringify(updated)); } catch {}
  };

  const addNote = () => {
    if (!newText.trim()) return;
    const note: Note = { id: `N${Date.now()}`, text: newText.trim(), color: String(colorIdx), createdAt: new Date().toISOString() };
    save([note, ...notes]);
    setNewText(''); setAdding(false);
  };

  const deleteNote = (id: string) => save(notes.filter(n => n.id !== id));

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ color: 'var(--text-1)' }}>Note rapide</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Appunti veloci, idee, promemoria</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-xl px-3 py-1.5 text-xs font-medium"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          + Nota
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
          <textarea
            autoFocus
            className="input w-full resize-none mb-2"
            rows={3}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addNote(); }}
            placeholder="Scrivi una nota... (⌘Enter per salvare)" />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {NOTE_COLORS.map((c, i) => (
                <button key={i} onClick={() => setColorIdx(i)}
                  className="w-4 h-4 rounded-full"
                  style={{ background: c.text, opacity: colorIdx === i ? 1 : 0.4, outline: colorIdx === i ? `2px solid ${c.text}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setAdding(false); setNewText(''); }}
                className="text-xs px-3 py-1.5 rounded-xl"
                style={{ border: '1px solid var(--border2)', color: 'var(--text-3)' }}>
                Annulla
              </button>
              <button onClick={addNote}
                disabled={!newText.trim()}
                className="text-xs px-3 py-1.5 rounded-xl font-medium text-white disabled:opacity-40"
                style={{ background: 'var(--brand)' }}>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding ? (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nessuna nota. Clicca "+ Nota" per aggiungerne una.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {notes.map(note => {
            const ci = parseInt(note.color) || 0;
            const col = NOTE_COLORS[ci] ?? NOTE_COLORS[0];
            return (
              <div key={note.id} className="relative rounded-xl p-3 group"
                style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs rounded px-1"
                  style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
                  ✕
                </button>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-1)', lineHeight: 1.5 }}>{note.text}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
                  {new Date(note.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
