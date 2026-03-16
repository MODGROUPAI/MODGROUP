'use client';

import { useState, useEffect } from 'react';
import { QuickAddTask } from './QuickAddTask';

export function GlobalShortcuts() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowQuickAdd(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!showQuickAdd) return null;
  return <QuickAddTask onClose={() => setShowQuickAdd(false)} />;
}
