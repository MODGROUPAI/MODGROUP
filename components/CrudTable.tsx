'use client';
import { ReactNode, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface Column<T> {
  key: string;
  header?: string;
  label?: string;   // backwards compat
  render?: (row: T) => ReactNode;
  width?: string;
}

interface CrudTableProps<T extends { id: string }> {
  rows: T[];
  columns?: Column<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
  extraActions?: (row: T) => ReactNode;
  emptyMessage?: string;
  emptyNode?: ReactNode;
  searchPlaceholder?: string; // accepted but unused (search handled at page level)
  onRowClick?: (row: T) => void;
}

export function CrudTable<T extends { id: string }>({
  rows, columns, onEdit, onDelete, extraActions, emptyMessage = 'Nessun dato.', emptyNode, onRowClick
}: CrudTableProps<T>) {
  const [hoverId, setHoverId] = useState<string | null>(null);


  const keys = columns
    ? columns.map(c => c.key)
    : rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : [];

  const headers = columns ? columns.map(c => c.header ?? c.label ?? c.key) : keys;

  const formatVal = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Sì' : 'No';
    if (Array.isArray(val)) return val.length ? `${val.length} elementi` : '—';
    if (typeof val === 'object') return '—';
    return String(val);
  };

  if (rows.length === 0) {
    if (emptyNode) return <>{emptyNode}</>;
    return (
      <div
        className="flex items-center justify-center py-16 text-sm rounded-2xl"
        style={{ color: 'var(--text-3)', background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
              {(onEdit || onDelete || extraActions) && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.id}
                onMouseEnter={() => setHoverId(row.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                {keys.map((key, i) => (
                  <td key={key}>
                    {columns?.[i]?.render
                      ? columns[i].render!(row)
                      : formatVal((row as Record<string, unknown>)[key])}
                  </td>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <td>
                    <div
                      className="flex items-center gap-1 transition-opacity"
                      style={{ opacity: hoverId === row.id ? 1 : 0 }}
                    >
                      {extraActions?.(row)}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
