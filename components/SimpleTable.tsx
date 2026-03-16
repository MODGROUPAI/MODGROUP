'use client';

import { useState, useMemo } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

interface Column {
  key: string;
  label: string;
  render?: (row: Row) => React.ReactNode;
}

interface SimpleTableProps {
  rows: Row[];
  columns: Column[];
  searchPlaceholder?: string;
  pageSize?: number;
}

export function SimpleTable({
  rows,
  columns,
  searchPlaceholder = 'Cerca...',
  pageSize = 20,
}: SimpleTableProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row: Row) =>
      Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (v: string) => { setQuery(v); setPage(1); };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          placeholder={searchPlaceholder}
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
        <span className="shrink-0 text-xs text-slate-400">{total} risultati</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {columns.map(c => (
                  <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                    {rows.length === 0 ? 'Nessun dato — importa il file Excel.' : 'Nessun risultato.'}
                  </td>
                </tr>
              ) : paginated.map((row: Row, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className="px-4 py-3 text-slate-700">
                      {c.render ? c.render(row) : <span>{row[c.key] != null ? String(row[c.key]) : '—'}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Pagina {page} di {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">← Prec</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Succ →</button>
          </div>
        </div>
      )}
    </div>
  );
}
