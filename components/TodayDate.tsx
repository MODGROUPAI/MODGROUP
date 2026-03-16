'use client';
import { useState, useEffect } from 'react';

export function TodayDate() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(new Date().toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }));
  }, []);
  if (!label) return null;
  return (
    <span
      className="hidden md:block text-xs"
      style={{ color: 'var(--text-3)', letterSpacing: '0.04em' }}
    >
      {label}
    </span>
  );
}
