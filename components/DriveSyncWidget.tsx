'use client';

import { useState } from 'react';
import { useDriveSync } from '@/hooks/useDriveSync';

const STATUS_COLOR: Record<string, string> = {
  idle:    'var(--text-3)',
  syncing: 'var(--brand)',
  ok:      '#4ade80',
  error:   '#f87171',
};

const STATUS_ICON: Record<string, string> = {
  idle:    '☁️',
  syncing: '⏳',
  ok:      '✓',
  error:   '✗',
};

export function DriveSyncWidget() {
  const [open, setOpen] = useState(false);
  const {
    isConnected, syncEnabled, lastSync, syncStatus, syncError,
    connect, disconnect, toggleSync, pushNow, pullNow,
  } = useDriveSync(() => window.location.reload());

  const color = STATUS_COLOR[syncStatus];

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Badge topbar */}
      <button
        onClick={() => setOpen(o => !o)}
        title={isConnected ? `Drive sync ${syncEnabled ? 'attivo' : 'in pausa'}` : 'Connetti Google Drive'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: `1px solid ${isConnected ? 'rgba(74,222,128,0.3)' : 'var(--border2)'}`,
          background: isConnected ? 'rgba(74,222,128,0.06)' : 'transparent',
          color: isConnected ? color : 'var(--text-3)',
          cursor: 'pointer', transition: 'all 150ms',
        }}
      >
        <span style={{ fontSize: 14 }}>{isConnected ? STATUS_ICON[syncStatus] : '☁️'}</span>
        <span>{isConnected ? (syncEnabled ? 'Drive' : 'Drive ⏸') : 'Drive'}</span>
        {lastSync && syncEnabled && (
          <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{lastSync}</span>
        )}
      </button>

      {/* Pannello */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 400, marginTop: 8,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 16, padding: '20px', width: 300,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>☁️</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Google Drive Sync</p>
                <p style={{ fontSize: 12, color: isConnected ? '#4ade80' : 'var(--text-3)' }}>
                  {isConnected ? '● Connesso' : '○ Non connesso'}
                </p>
              </div>
            </div>

            {!isConnected ? (
              /* ── Non connesso ── */
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>
                  Connetti il tuo account Google per sincronizzare automaticamente i dati con un file Excel su Drive.
                </p>
                <button
                  onClick={() => { setOpen(false); connect(); }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    border: 'none', background: 'var(--brand)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <span>🔐</span> Connetti Google Drive
                </button>
              </div>
            ) : (
              /* ── Connesso ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Toggle sync */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Sync automatico</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Pull ogni 5 min · Push ad ogni salvataggio</p>
                  </div>
                  <button
                    onClick={() => toggleSync(!syncEnabled)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none',
                      background: syncEnabled ? 'var(--brand)' : 'var(--surface3)',
                      cursor: 'pointer', position: 'relative', transition: 'background 200ms',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: syncEnabled ? 20 : 3,
                      width: 16, height: 16, borderRadius: 8,
                      background: 'white', transition: 'left 200ms',
                    }} />
                  </button>
                </div>

                {/* Status */}
                {syncError && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: 12, color: '#f87171' }}>✗ {syncError}</p>
                  </div>
                )}
                {lastSync && !syncError && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <p style={{ fontSize: 12, color: '#4ade80' }}>✓ Ultimo sync: {lastSync}</p>
                  </div>
                )}

                {/* Azioni manuali */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { pullNow(); setOpen(false); }}
                    disabled={syncStatus === 'syncing'}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: '1px solid var(--border2)', background: 'var(--surface2)',
                      color: 'var(--text-2)', cursor: 'pointer',
                    }}
                  >
                    ↓ Pull ora
                  </button>
                  <button
                    onClick={() => { pushNow(); setOpen(false); }}
                    disabled={syncStatus === 'syncing'}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: '1px solid rgba(242,101,34,0.4)', background: 'rgba(242,101,34,0.08)',
                      color: 'var(--brand)', cursor: 'pointer',
                    }}
                  >
                    ↑ Push ora
                  </button>
                </div>

                {/* Disconnetti */}
                <button
                  onClick={() => { disconnect(); setOpen(false); }}
                  style={{
                    width: '100%', padding: '7px', borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--border)', background: 'none',
                    color: 'var(--text-3)', cursor: 'pointer',
                  }}
                >
                  Disconnetti account
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
