'use client';
import { Power } from 'lucide-react';

export function QuitButton() {
  const quit = async () => {
    if (!confirm('Chiudere il server?')) return;
    try { await fetch('/api/quit', { method: 'POST' }); } catch {}
  };
  return (
    <button onClick={quit} className="btn-ghost text-xs px-3 py-1.5" title="Spegni server">
      <Power size={11} />
    </button>
  );
}
