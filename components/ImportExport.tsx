'use client';

import { localDateISO } from '@/lib/utils';
import { useRef, useState, useCallback } from 'react';
import { parseXlsx } from '@/lib/xlsxParser';
import { setAppData, getAppData } from '@/lib/store';
import type { AppData } from '@/lib/types';

interface ImportExportProps {
  onImported?: () => void;
}

type StatusMsg = { type: 'ok' | 'error' | 'info'; msg: string };

function buildSummary(data: AppData): string[] {
  return [
    `${data.tasks.length} task`,
    `${data.clients.length} clienti`,
    `${data.leads.length} lead`,
    `${data.deals.length} commesse`,
    `${data.pipeline.length} pipeline`,
    `${data.teamMembers.length} membri`,
    `${data.timeLogs.length} time log`,
    `${data.suppliers.length} fornitori`,
    `${data.noGo.length} no go`,
    `${data.hotelContacts.length} hotel`,
    `${data.archivedProjects.length} archivio`,
    `${(data.quotes ?? []).length} preventivi`,
  ].filter(s => !s.startsWith('0 '));
}

async function processBuffer(buffer: ArrayBuffer): Promise<AppData> {
  const data = parseXlsx(buffer);
  const total = data.tasks.length + data.clients.length + data.leads.length + data.deals.length;
  if (total === 0) throw new Error('Nessun dato trovato. Verifica i nomi dei fogli Excel.');
  return data;
}

export function ImportExport({ onImported }: ImportExportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting]   = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [status, setStatus]         = useState<StatusMsg | null>(null);
  const [lastImport, setLastImport] = useState<{ filename: string; summary: string[]; ts: string } | null>(null);
  const [open, setOpen]             = useState(false);
  const [driveOpen, setDriveOpen]   = useState(false);
  const [driveUrl, setDriveUrl]     = useState('');

  // ── Importa da file locale ────────────────────────────────

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus({ type: 'info', msg: '⏳ Lettura file...' });
    try {
      const buffer = await file.arrayBuffer();
      const data = await processBuffer(buffer);
      setAppData(data);
      const summary = buildSummary(data);
      setLastImport({ filename: file.name, summary, ts: new Date().toLocaleTimeString('it-IT') });
      setStatus({ type: 'ok', msg: `✓ ${summary.slice(0, 3).join(' · ')}` });
      onImported?.();
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatus({ type: 'error', msg: `✗ ${err instanceof Error ? err.message : 'Errore'}` });
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onImported]);

  // ── Importa da Google Drive ───────────────────────────────

  const handleDriveImport = useCallback(async () => {
    if (!driveUrl.trim()) return;
    setImporting(true);
    setDriveOpen(false);
    setStatus({ type: 'info', msg: '⏳ Download da Drive...' });
    try {
      const res = await fetch('/api/drive-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: driveUrl.trim() }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || contentType.includes('application/json')) {
        const json = await res.json();
        throw new Error(json.error ?? 'Errore download');
      }
      const buffer = await res.arrayBuffer();
      const data = await processBuffer(buffer);
      setAppData(data);
      const summary = buildSummary(data);
      setLastImport({ filename: 'Google Drive', summary, ts: new Date().toLocaleTimeString('it-IT') });
      setStatus({ type: 'ok', msg: `✓ Drive: ${summary.slice(0, 3).join(' · ')}` });
      setDriveUrl('');
      onImported?.();
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatus({ type: 'error', msg: `✗ ${err instanceof Error ? err.message : 'Errore'}` });
    } finally {
      setImporting(false);
    }
  }, [driveUrl, onImported]);

  // ── Export ────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    const data = getAppData();
    if (!data) {
      setStatus({ type: 'error', msg: '✗ Nessun dato. Importa prima un file.' });
      return;
    }
    setExporting(true);
    setStatus({ type: 'info', msg: '⏳ Generazione...' });
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `PMO_MOD_${localDateISO()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'ok', msg: `✓ Esportato` });
    } catch (err) {
      setStatus({ type: 'error', msg: `✗ ${err instanceof Error ? err.message : 'Errore'}` });
    } finally {
      setExporting(false);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: active ? 'wait' : 'pointer',
    border: '1px solid var(--border2)', background: 'transparent',
    color: active ? 'var(--text-3)' : 'var(--text-2)',
    transition: 'all 150ms', opacity: active ? 0.6 : 1,
  });

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />

      {/* Importa — dropdown con opzioni */}
      <div style={{ position: 'relative' }}>
        <button
          disabled={importing}
          style={btnStyle(importing)}
          onClick={() => { setOpen(false); setDriveOpen(o => !o); }}
          onMouseEnter={e => !importing && (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={e => !importing && (e.currentTarget.style.color = 'var(--text-2)')}
        >
          {importing ? '⏳' : '↑'} Importa
        </button>

        {/* Dropdown importa */}
        {driveOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setDriveOpen(false)} />
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: 6,
              background: 'var(--surface)', border: '1px solid var(--border2)',
              borderRadius: 12, padding: '12px 14px', width: 300,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {/* Da computer */}
              <button
                onClick={() => { setDriveOpen(false); inputRef.current?.click(); }}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  border: '1px solid var(--border2)', background: 'var(--surface2)',
                  color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span>💻</span> Dal computer
              </button>

              {/* Da Google Drive */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Google Drive
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                  Il file deve essere condiviso con "Chiunque abbia il link".
                </p>
                <input
                  type="text"
                  placeholder="Incolla link Google Drive..."
                  value={driveUrl}
                  onChange={e => setDriveUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDriveImport()}
                  className="input"
                  style={{ width: '100%', fontSize: 13, marginBottom: 8 }}
                  autoFocus
                />
                <button
                  onClick={handleDriveImport}
                  disabled={!driveUrl.trim()}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    fontSize: 14, fontWeight: 700, cursor: driveUrl.trim() ? 'pointer' : 'not-allowed',
                    border: 'none', background: driveUrl.trim() ? 'var(--brand)' : 'var(--surface3)',
                    color: driveUrl.trim() ? 'white' : 'var(--text-3)',
                    transition: 'all 150ms',
                  }}
                >
                  📥 Importa da Drive
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={exporting}
        style={btnStyle(exporting)}
        onMouseEnter={e => !exporting && (e.currentTarget.style.color = 'var(--text-1)')}
        onMouseLeave={e => !exporting && (e.currentTarget.style.color = 'var(--text-2)')}
      >
        {exporting ? '⏳' : '↓'} Esporta
      </button>

      {/* Status */}
      {status && (
        <span style={{
          fontSize: 12, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
          background: status.type === 'ok' ? 'rgba(34,197,94,0.12)' : status.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(242,101,34,0.12)',
          color: status.type === 'ok' ? '#4ade80' : status.type === 'error' ? '#f87171' : 'var(--brand)',
          maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={status.msg}>
          {status.msg}
        </span>
      )}

      {/* Badge ultimo import */}
      {lastImport && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontSize: 12, padding: '3px 7px', borderRadius: 6, fontWeight: 700, cursor: 'pointer',
            border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#4ade80',
          }}
        >
          ℹ️ {lastImport.ts}
        </button>
      )}

      {/* Popup dettaglio ultimo import */}
      {open && lastImport && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 300, marginTop: 8,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 14, padding: '16px 20px', minWidth: 260,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Ultimo import</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
              📄 {lastImport.filename} · {lastImport.ts}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lastImport.summary.map(s => (
                <span key={s} style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                  background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)',
                }}>
                  {s}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <button onClick={() => { setOpen(false); setDriveOpen(true); }}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                ↑ Reimporta
              </button>
              <button onClick={() => { setOpen(false); handleExport(); }}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(242,101,34,0.4)', background: 'rgba(242,101,34,0.08)', color: 'var(--brand)', cursor: 'pointer' }}>
                ↓ Esporta
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
