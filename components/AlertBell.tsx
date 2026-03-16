'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAppData } from '@/lib/store';
import { localDateISO } from '@/lib/utils';

type AlertLevel = 'red' | 'yellow' | 'info';

interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  link?: string;
  copyText?: string;
}

const LEVEL_COLOR: Record<AlertLevel, string> = {
  red:    '#f87171',
  yellow: '#fbbf24',
  info:   '#60a5fa',
};

const LEVEL_BG: Record<AlertLevel, string> = {
  red:    'rgba(248,113,113,0.08)',
  yellow: 'rgba(251,191,36,0.08)',
  info:   'rgba(96,165,250,0.08)',
};

const LEVEL_BORDER: Record<AlertLevel, string> = {
  red:    'rgba(248,113,113,0.25)',
  yellow: 'rgba(251,191,36,0.25)',
  info:   'rgba(96,165,250,0.25)',
};

const LEVEL_ICON: Record<AlertLevel, string> = {
  red: '🔴', yellow: '🟡', info: '🔵',
};

export function AlertBell() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [copied, setCopied]   = useState<string | null>(null);

  // Carica dismissed da localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pmo_dismissed_alerts');
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  // Calcola alert dai dati
  useEffect(() => {
    const data = getAppData();
    if (!data) return;

    const today = localDateISO();
    const newAlerts: Alert[] = [];

    // ── Task in ritardo ────────────────────────────────────────────────────
    const overdueTasks = data.tasks.filter(t =>
      !t.isCompleted && t.dueDate && t.dueDate < today
    );
    if (overdueTasks.length > 0) {
      const list = overdueTasks.slice(0, 3).map(t => `• ${t.title} (${t.clientName})`).join('\n');
      newAlerts.push({
        id:    'overdue-tasks',
        level: 'red',
        title: `${overdueTasks.length} task in ritardo`,
        body:  overdueTasks.slice(0, 3).map(t => `${t.title} — ${t.clientName}`).join(', ') + (overdueTasks.length > 3 ? ` +${overdueTasks.length - 3} altri` : ''),
        link:  '/tasks',
        copyText: `⚠️ Task in ritardo:\n${list}`,
      });
    }

    // ── Task in scadenza oggi / domani ────────────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dueSoon = data.tasks.filter(t =>
      !t.isCompleted && t.dueDate && (t.dueDate === today || t.dueDate === tomorrowStr)
    );
    if (dueSoon.length > 0) {
      newAlerts.push({
        id:    'due-soon',
        level: 'yellow',
        title: `${dueSoon.length} task in scadenza oggi/domani`,
        body:  dueSoon.slice(0, 3).map(t => `${t.title} — ${t.dueDate}`).join(', '),
        link:  '/tasks',
      });
    }

    // ── Budget ore al limite (≥80%) ───────────────────────────────────────
    data.deals.forEach(deal => {
      if (!deal.budgetOre || deal.budgetOre === 0) return;
      const logged = data.timeLogs
        .filter(l => l.clientName === deal.companyName || l.clientId === deal.clientId)
        .reduce((s, l) => s + l.hours, 0);
      const pct = Math.round((logged / deal.budgetOre) * 100);
      const threshold = deal.alertThreshold ?? 80;
      if (pct >= threshold) {
        newAlerts.push({
          id:    `budget-${deal.id}`,
          level: pct >= 100 ? 'red' : 'yellow',
          title: `Budget ore: ${deal.companyName}`,
          body:  `${logged.toFixed(1)}h su ${deal.budgetOre}h (${pct}%) — soglia ${threshold}%`,
          link:  '/profitability',
          copyText: `⚠️ Budget ore ${deal.companyName}: ${pct}% consumato (${logged.toFixed(1)}h / ${deal.budgetOre}h)`,
        });
      }
    });

    // ── Contenuti bloccati ────────────────────────────────────────────────
    const blocked = (data.editorialContent ?? []).filter(e => e.status === 'Bloccato');
    if (blocked.length > 0) {
      newAlerts.push({
        id:    'blocked-content',
        level: 'yellow',
        title: `${blocked.length} contenuti bloccati`,
        body:  blocked.slice(0, 3).map(e => `${e.clientName} — ${e.platform}`).join(', '),
        link:  '/editorial',
        copyText: `🚫 Contenuti bloccati:\n${blocked.slice(0,5).map(e => `• ${e.clientName} ${e.platform}: ${e.blockedReason || 'motivo non specificato'}`).join('\n')}`,
      });
    }

    // ── Contenuti in revisione da >3 giorni ───────────────────────────────
    const staleReview = (data.editorialContent ?? []).filter(e => {
      if (e.status !== 'In revisione' || !e.waitingSince) return false;
      const days = Math.round((new Date(today).getTime() - new Date(e.waitingSince).getTime()) / 86400000);
      return days >= 3;
    });
    if (staleReview.length > 0) {
      newAlerts.push({
        id:    'stale-review',
        level: 'yellow',
        title: `${staleReview.length} contenuti in attesa da >3gg`,
        body:  staleReview.slice(0, 3).map(e => `${e.clientName} — ${e.platform}`).join(', '),
        link:  '/editorial',
      });
    }

    // ── Lead non contattati da >7 giorni ─────────────────────────────────
    const staleLeads = data.leads.filter(l => {
      if (!l.statusDate) return false;
      const days = Math.round((new Date(today).getTime() - new Date(l.statusDate).getTime()) / 86400000);
      return days >= 7 && l.statusContact !== 'Vinto' && l.statusContact !== 'Perso';
    });
    if (staleLeads.length > 0) {
      newAlerts.push({
        id:    'stale-leads',
        level: 'info',
        title: `${staleLeads.length} lead da ricontattare`,
        body:  `Non aggiornati da oltre 7 giorni`,
        link:  '/leads',
        copyText: `📋 Lead da ricontattare:\n${staleLeads.slice(0,5).map(l => `• ${l.companyName} (ultimo contatto: ${l.statusDate})`).join('\n')}`,
      });
    }

    // ── Clienti senza contenuti questo mese ──────────────────────────────
    const thisMonth = today.slice(0, 7);
    const activeClients = data.clients.filter(c => c.status === 'Attivo');
    const clientsWithContent = new Set(
      (data.editorialContent ?? [])
        .filter(e => e.scheduledDate?.startsWith(thisMonth))
        .map(e => e.clientName)
    );
    const clientsNoContent = activeClients.filter(c => !clientsWithContent.has(c.name));
    if (clientsNoContent.length > 0) {
      newAlerts.push({
        id:    'no-content-month',
        level: 'info',
        title: `${clientsNoContent.length} clienti senza contenuti questo mese`,
        body:  clientsNoContent.slice(0, 4).map(c => c.name).join(', ') + (clientsNoContent.length > 4 ? '...' : ''),
        link:  '/editorial',
      });
    }

    setAlerts(newAlerts);
  }, [open]); // ricalcola quando si apre

  const visibleAlerts = useMemo(() =>
    alerts.filter(a => !dismissed.has(a.id)),
    [alerts, dismissed]
  );

  const redCount    = visibleAlerts.filter(a => a.level === 'red').length;
  const yellowCount = visibleAlerts.filter(a => a.level === 'yellow').length;
  const badgeCount  = visibleAlerts.length;

  const dismiss = (id: string) => {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    try { localStorage.setItem('pmo_dismissed_alerts', JSON.stringify([...next])); } catch {}
  };

  const dismissAll = () => {
    const next = new Set([...dismissed, ...visibleAlerts.map(a => a.id)]);
    setDismissed(next);
    try { localStorage.setItem('pmo_dismissed_alerts', JSON.stringify([...next])); } catch {}
  };

  const bellColor = redCount > 0 ? '#f87171' : yellowCount > 0 ? '#fbbf24' : badgeCount > 0 ? '#60a5fa' : 'var(--text-3)';

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Alert e notifiche"
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 9, border: 'none',
          background: open ? 'var(--surface2)' : 'transparent',
          cursor: 'pointer', color: bellColor, fontSize: 18, transition: 'all 150ms',
        }}
      >
        🔔
        {badgeCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16,
            borderRadius: 8, fontSize: 11, fontWeight: 800, lineHeight: '16px', textAlign: 'center',
            padding: '0 3px',
            background: redCount > 0 ? '#f87171' : yellowCount > 0 ? '#fbbf24' : '#60a5fa',
            color: 'white',
          }}>
            {badgeCount}
          </span>
        )}
      </button>

      {/* Pannello */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 400, marginTop: 8,
            width: 360, maxHeight: '80vh', overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                🔔 Alert {badgeCount > 0 ? `(${badgeCount})` : ''}
              </p>
              {visibleAlerts.length > 0 && (
                <button onClick={dismissAll} style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Segna tutti come letti
                </button>
              )}
            </div>

            {/* Alert list */}
            {visibleAlerts.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>✅</p>
                <p style={{ fontSize: 15, color: 'var(--text-3)' }}>Tutto in ordine!</p>
              </div>
            ) : (
              <div style={{ padding: '10px' }}>
                {visibleAlerts.map(alert => (
                  <div key={alert.id} style={{
                    padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                    background: LEVEL_BG[alert.level],
                    border: `1px solid ${LEVEL_BORDER[alert.level]}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{LEVEL_ICON[alert.level]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: LEVEL_COLOR[alert.level], marginBottom: 3 }}>{alert.title}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{alert.body}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {alert.link && (
                            <button onClick={() => { router.push(alert.link!); setOpen(false); }}
                              style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: `1px solid ${LEVEL_BORDER[alert.level]}`, background: 'none', color: LEVEL_COLOR[alert.level], cursor: 'pointer' }}>
                              Vai →
                            </button>
                          )}
                          {alert.copyText && (
                            <button onClick={() => { navigator.clipboard.writeText(alert.copyText!); setCopied(alert.id); setTimeout(() => setCopied(null), 2000); }}
                              style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: copied === alert.id ? '#4ade80' : 'var(--text-3)', cursor: 'pointer' }}>
                              {copied === alert.id ? '✓ Copiato' : '📋 Copia WA'}
                            </button>
                          )}
                          <button onClick={() => dismiss(alert.id)}
                            style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', marginLeft: 'auto' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
