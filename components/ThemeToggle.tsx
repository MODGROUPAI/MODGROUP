'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('pmo-theme') as 'dark' | 'light' | null;
    if (saved) apply(saved);
  }, []);

  function apply(t: 'dark' | 'light') {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
    localStorage.setItem('pmo-theme', t);
  }

  return (
    <button
      onClick={() => apply(theme === 'dark' ? 'light' : 'dark')}
      className="btn-ghost px-2.5 py-1.5"
      title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      style={{ gap: 0 }}
    >
      {theme === 'dark'
        ? <Sun size={13} style={{ color: 'var(--text-2)' }} />
        : <Moon size={13} style={{ color: 'var(--text-2)' }} />
      }
    </button>
  );
}
