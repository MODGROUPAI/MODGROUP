'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}
function fmtH(v: number) { return `${v.toFixed(1)}h`; }

function pctColor(pct: number) {
  if (pct >= 30) return '#2ecc71';
  if (pct >= 10) return '#f5c518';
  return '#e74c3c';
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${MONTHS[parseInt(mo)-1]} ${y}`;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color, transition: 'width 500ms ease' }} />
    </div>
  );
}

const DEFAULT_RATE = 75;

// ── componente principale ──────────────────────────────────────────────────────

type View = 'clienti' | 'mesi' | 'membri' | 'commesse';

export default function CFOPage() {
  const { data } = useData();
  const today = localDateISO();
  const currentMonth = today.slice(0, 7);

  const [view, setView]         = useState<View>('clienti');
  const [rate, setRate]         = useState(DEFAULT_RATE);
  const [filterMonth, setFilterMonth] = useState('');

  // ── Per cliente ──────────────────────────────────────────────────────────────
  const byClient = useMemo(() => {
    const map: Record<string, { total: number; billable: number; months: Set<string> }> = {};
    data.timeLogs.forEach(l => {
      const k = l.clientName || '(senza cliente)';
      if (!map[k]) map[k] = { total: 0, billable: 0, months: new Set() };
      map[k].total    += l.hours;
      map[k].billable += l.billable ? l.hours : 0;
      map[k].months.add(l.date.slice(0, 7));
    });
    return Object.entries(map).map(([name, d]) => {
      const deal       = data.deals.find(de => de.companyName?.toLowerCase() === name.toLowerCase());
      const revenue    = deal?.budgetEuro ?? d.billable * rate * 1.3;
      const cost       = d.total * rate;
      const margin     = revenue - cost;
      const marginPct  = revenue > 0 ? (margin / revenue) * 100 : 0;
      const budgetOre  = deal?.budgetOre ?? 0;
      const budgetPct  = budgetOre > 0 ? Math.round((d.total / budgetOre) * 100) : null;
      return { name, total: d.total, billable: d.billable, revenue, cost, margin, marginPct, budgetOre, budgetPct };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [data.timeLogs, data.deals, rate]);

  // ── Per mese ─────────────────────────────────────────────────────────────────
  const byMonth = useMemo(() => {
    const map: Record<string, { total: number; billable: number; clients: Set<string>; members: Set<string> }> = {};
    data.timeLogs.forEach(l => {
      const m = l.date.slice(0, 7);
      if (!map[m]) map[m] = { total: 0, billable: 0, clients: new Set(), members: new Set() };
      map[m].total    += l.hours;
      map[m].billable += l.billable ? l.hours : 0;
      if (l.clientName) map[m].clients.add(l.clientName);
      map[m].members.add(l.member);
    });
    return Object.entries(map)
      .map(([month, d]) => {
        const revenue   = d.billable * rate * 1.3;
        const cost      = d.total * rate;
        const margin    = revenue - cost;
        const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
        return { month, total: d.total, billable: d.billable, revenue, cost, margin, marginPct, clients: d.clients.size, members: d.members.size };
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [data.timeLogs, rate]);

  // ── Per membro ───────────────────────────────────────────────────────────────
  const byMember = useMemo(() => {
    const map: Record<string, { total: number; billable: number; clients: Set<string> }> = {};
    data.timeLogs
      .filter(l => !filterMonth || l.date.startsWith(filterMonth))
      .forEach(l => {
        if (!map[l.member]) map[l.member] = { total: 0, billable: 0, clients: new Set() };
        map[l.member].total    += l.hours;
        map[l.member].billable += l.billable ? l.hours : 0;
        if (l.clientName) map[l.member].clients.add(l.clientName);
      });
    return Object.entries(map).map(([name, d]) => {
      const billablePct = d.total > 0 ? (d.billable / d.total) * 100 : 0;
      const revenue     = d.billable * rate;
      return { name, total: d.total, billable: d.billable, billablePct, revenue, clients: d.clients.size };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [data.timeLogs, filterMonth, rate]);

  // ── Per commessa ─────────────────────────────────────────────────────────────
  const byDeal = useMemo(() => {
    return data.deals.map(deal => {
      const logs     = data.timeLogs.filter(l => l.clientName?.toLowerCase() === deal.companyName?.toLowerCase());
      const usedHrs  = logs.reduce((s, l) => s + l.hours, 0);
      const budgetOre = deal.budgetOre ?? 0;
      const budgetEuro = deal.budgetEuro ?? 0;
      const costEuro  = usedHrs * rate;
      const margin    = budgetEuro - costEuro;
      const marginPct = budgetEuro > 0 ? (margin / budgetEuro) * 100 : null;
      const budgetPct = budgetOre > 0 ? Math.round((usedHrs / budgetOre) * 100) : null;
      const threshold = deal.alertThreshold ?? 80;
      return { deal, usedHrs, budgetOre, budgetEuro, costEuro, margin, marginPct, budgetPct, threshold };
    }).sort((a, b) => (b.budgetEuro) - (a.budgetEuro));
  }, [data.deals, data.timeLogs, rate]);

  // ── KPI globali ───────────────────────────────────────────────────────────────
  const totalHours      = data.timeLogs.reduce((s, l) => s + l.hours, 0);
  const totalBillable   = data.timeLogs.filter(l => l.billable).reduce((s, l) => s + l.hours, 0);
  const billableRate    = totalHours > 0 ? Math.round((totalBillable / totalHours) * 100) : 0;
  const thisMonthLogs   = data.timeLogs.filter(l => l.date.startsWith(currentMonth));
  const thisMonthHrs    = thisMonthLogs.reduce((s, l) => s + l.hours, 0);
  const thisMonthRevEst = thisMonthLogs.filter(l => l.billable).reduce((s, l) => s + l.hours, 0) * rate * 1.3;

  const availableMonths = useMemo(() => [...new Set(data.timeLogs.map(l => l.date.slice(0,7)))].sort().reverse(), [data.timeLogs]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            Dashboard Redditività
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>
            Analisi costi, margini e ore fatturabili
          </p>
        </div>
        {/* Tariffa oraria */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>Tariffa €/h</label>
          <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))}
            className="input" style={{ width: 80, fontSize: 14, textAlign: 'right' }} min={10} max={500} step={5} />
        </div>
      </div>

      {/* KPI globali */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Ore totali',      value: fmtH(totalHours),          color: 'var(--text-1)' },
          { label: 'Ore fatturabili', value: fmtH(totalBillable),        color: '#2ecc71' },
          { label: 'Tasso fatturabile', value: `${billableRate}%`,       color: pctColor(billableRate - 50) },
          { label: 'Ore questo mese', value: fmtH(thisMonthHrs),         color: 'var(--brand)' },
          { label: 'Ricavi stimati (mese)', value: fmt(thisMonthRevEst), color: '#2ecc71' },
        ].map(k => (
          <div key={k.label} className="card kpi-mount" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: '1.8rem', lineHeight: 1, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'clienti',  label: '🏢 Per cliente' },
          { key: 'mesi',     label: '📅 Andamento mensile' },
          { key: 'membri',   label: '👥 Per membro' },
          { key: 'commesse', label: '📋 Budget commesse' },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key as View)}
            style={{ padding: '10px 16px', borderRadius: '8px 8px 0 0', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 150ms', background: view === t.key ? 'var(--surface)' : 'transparent', color: view === t.key ? 'var(--brand)' : 'var(--text-3)', borderBottom: view === t.key ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CLIENTI ── */}
      {view === 'clienti' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {byClient.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Nessun log ore registrato.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Cliente', 'Ore totali', 'Ore fatt.', 'Ricavi stimati', 'Costo', 'Margine', 'Marg. %', 'Budget ore', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byClient.map(c => (
                  <tr key={c.name} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: 'var(--text-1)' }}>{fmtH(c.total)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#2ecc71' }}>{fmtH(c.billable)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{fmt(c.revenue)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#e74c3c' }}>{fmt(c.cost)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: c.margin >= 0 ? '#2ecc71' : '#e74c3c' }}>{fmt(c.margin)}</td>
                    <td style={{ padding: '12px 14px', minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bar pct={c.marginPct} color={pctColor(c.marginPct)} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: pctColor(c.marginPct), width: 36 }}>{Math.round(c.marginPct)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', minWidth: 120 }}>
                      {c.budgetPct !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Bar pct={c.budgetPct} color={c.budgetPct >= 100 ? '#e74c3c' : c.budgetPct >= 80 ? '#f5c518' : '#2ecc71'} />
                          <span style={{ fontSize: 12, color: 'var(--text-3)', width: 32 }}>{c.budgetPct}%</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 12, fontWeight: 700, background: `${pctColor(c.marginPct)}18`, color: pctColor(c.marginPct) }}>
                        {c.marginPct >= 30 ? '✅ Sano' : c.marginPct >= 10 ? '⚠️ Basso' : '🔴 Critico'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB MESI ── */}
      {view === 'mesi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byMonth.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Nessun log mensile.</div>
          ) : (
            byMonth.map((m, i) => {
              const isCurrentMonth = m.month === currentMonth;
              const prevMonth = byMonth[i + 1];
              const revDelta = prevMonth ? m.revenue - prevMonth.revenue : null;
              return (
                <div key={m.month} className="card anim-fade-up" style={{
                  padding: '16px 20px',
                  border: isCurrentMonth ? '1px solid rgba(242,101,34,0.35)' : '1px solid var(--border)',
                  background: isCurrentMonth ? 'rgba(242,101,34,0.04)' : 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ minWidth: 80 }}>
                      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 20, color: isCurrentMonth ? 'var(--brand)' : 'var(--text-1)', lineHeight: 1 }}>
                        {monthLabel(m.month)}
                      </p>
                      {isCurrentMonth && <p style={{ fontSize: 11, color: 'var(--brand)', marginTop: 2, fontWeight: 700 }}>MESE CORRENTE</p>}
                    </div>

                    {/* Metriche */}
                    <div style={{ display: 'flex', gap: 24, flex: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {[
                        { label: 'Ore',         value: fmtH(m.total),    color: 'var(--text-1)' },
                        { label: 'Fatturabili', value: fmtH(m.billable), color: '#2ecc71' },
                        { label: 'Ricavi est.', value: fmt(m.revenue),   color: 'var(--text-1)' },
                        { label: 'Margine',     value: fmt(m.margin),    color: m.margin >= 0 ? '#2ecc71' : '#e74c3c' },
                        { label: 'Marg. %',     value: `${Math.round(m.marginPct)}%`, color: pctColor(m.marginPct) },
                        { label: 'Clienti',     value: String(m.clients), color: 'var(--text-3)' },
                      ].map(stat => (
                        <div key={stat.label} style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 2 }}>{stat.label}</p>
                          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 18, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                        </div>
                      ))}
                      {revDelta !== null && (
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 2 }}>vs mese prec.</p>
                          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 18, color: revDelta >= 0 ? '#2ecc71' : '#e74c3c', lineHeight: 1 }}>
                            {revDelta >= 0 ? '↑' : '↓'} {fmt(Math.abs(revDelta))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra margine */}
                  <div style={{ marginTop: 12 }}>
                    <Bar pct={Math.max(m.marginPct, 0)} color={pctColor(m.marginPct)} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB MEMBRI ── */}
      {view === 'membri' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input" style={{ width: 160, fontSize: 13 }}>
              <option value="">Tutti i mesi</option>
              {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {byMember.length === 0 ? (
              <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Nessun log registrato.</div>
            ) : (
              byMember.map(m => {
                const member = data.teamMembers.find(t => t.fullName === m.name);
                return (
                  <div key={m.name} className="card anim-fade-up" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: member?.colorHex ?? 'var(--surface3)', border: '2px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>
                        {m.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{m.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.clients} clienti</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      {[
                        { label: 'Ore totali',   value: fmtH(m.total),   color: 'var(--text-1)' },
                        { label: 'Fatturabili',  value: fmtH(m.billable), color: '#2ecc71' },
                        { label: 'Ricavi gen.',  value: fmt(m.revenue),  color: 'var(--brand)' },
                        { label: '% Fattur.',    value: `${Math.round(m.billablePct)}%`, color: pctColor(m.billablePct - 50) },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px' }}>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{s.label}</p>
                          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 18, color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <Bar pct={m.billablePct} color={pctColor(m.billablePct - 50)} />
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{Math.round(m.billablePct)}% ore fatturabili</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB COMMESSE ── */}
      {view === 'commesse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byDeal.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Nessuna commessa con budget configurato.</div>
          ) : (
            byDeal.map(({ deal, usedHrs, budgetOre, budgetEuro, costEuro, margin, marginPct, budgetPct, threshold }) => {
              const overBudget = budgetPct !== null && budgetPct >= 100;
              const nearLimit  = budgetPct !== null && budgetPct >= threshold && !overBudget;
              const barColor   = overBudget ? '#e74c3c' : nearLimit ? '#f5c518' : '#2ecc71';
              return (
                <div key={deal.id} className="card anim-fade-up" style={{
                  padding: '18px 22px',
                  border: `1px solid ${overBudget ? 'rgba(231,76,60,0.3)' : nearLimit ? 'rgba(245,197,24,0.3)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{deal.companyName}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{deal.jobType || 'Commessa'} · {deal.status || '—'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Budget',    value: budgetEuro > 0 ? fmt(budgetEuro) : '—',   color: 'var(--text-1)' },
                        { label: 'Costo ore', value: fmt(costEuro),                             color: '#e74c3c' },
                        { label: 'Margine',   value: budgetEuro > 0 ? fmt(margin) : '—',       color: margin >= 0 ? '#2ecc71' : '#e74c3c' },
                        ...(marginPct !== null ? [{ label: 'Marg. %', value: `${Math.round(marginPct)}%`, color: pctColor(marginPct) }] : []),
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{s.label}</p>
                          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 18, color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barra budget ore */}
                  {budgetOre > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Budget ore: {fmtH(usedHrs)} / {fmtH(budgetOre)}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{budgetPct}%</p>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(budgetPct ?? 0, 100)}%`, background: barColor, transition: 'width 500ms ease' }} />
                      </div>
                      {overBudget && <p style={{ fontSize: 12, color: '#e74c3c', marginTop: 4, fontWeight: 600 }}>⚠️ Budget ore superato di {fmtH(usedHrs - budgetOre)}</p>}
                      {nearLimit && <p style={{ fontSize: 12, color: '#f5c518', marginTop: 4 }}>⏳ Vicino al limite soglia ({threshold}%)</p>}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
