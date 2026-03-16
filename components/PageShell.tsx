'use client';
import { useData } from '@/hooks/useData';

export function PageShell({ children }: { children: React.ReactNode }) {
  const { loaded } = useData();
  if (!loaded) return (
    <div className="flex flex-col gap-5 animate-pulse">
      {/* Header skeleton */}
      <div className="h-9 w-56 rounded-xl" style={{ background: 'var(--surface3)' }} />
      <div className="h-3 w-36 rounded" style={{ background: 'var(--surface2)' }} />
      {/* KPI row skeleton */}
      <div className="grid grid-cols-4 gap-4 mt-2">
        {[...Array(4)].map((_,i) => (
          <div key={i} className="card p-5 flex flex-col gap-3">
            <div className="h-2.5 w-20 rounded" style={{ background: 'var(--surface3)' }} />
            <div className="h-10 w-14 rounded-lg" style={{ background: 'var(--surface3)' }} />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="card overflow-hidden">
        <div className="h-10 border-b" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }} />
        {[...Array(6)].map((_,i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="h-3 w-16 rounded" style={{ background: 'var(--surface3)' }} />
            <div className="h-3 w-32 rounded" style={{ background: 'var(--surface3)' }} />
            <div className="h-3 w-24 rounded" style={{ background: 'var(--surface3)' }} />
            <div className="h-3 w-20 rounded ml-auto" style={{ background: 'var(--surface3)' }} />
          </div>
        ))}
      </div>
    </div>
  );
  return <>{children}</>;
}
