'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';

type HealthLevel = 'green' | 'yellow' | 'red';

interface ClientKPI {
  id: string;
  name: string;
  sector: string;
  responsible?: string;
  health: HealthLevel;
  reasons: string[];
  openTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  publishedThisMonth: number;
  plannedThisMonth: number;
  blockedContent: number;
  inReviewContent: number;
  hoursLogged: number;
  budgetOre?: number;
  budgetPct?: number;
  alertThreshold: number;
  lastActivity?: string;
  driveLink?: string;
  dealStatus?: string;
}

const HEALTH_COLOR: Record<HealthLevel, string> = {
  green:  '#4ade80',
  yellow: '#fbbf24',
  red:    '#f87171',
};

const HEALTH_BG: Record<HealthLevel, string> = {
  green:  'rgba(74,222,128,0.08)',
  yellow: 'rgba(251,191,36,0.08)',
  red:    'rgba(248,113,113,0.08)',
};

const HEALTH_LABEL: Record<HealthLevel, string> = {
  green:  '✅ In regola',
  yellow: '🟡 Attenzione',
  red:    '🔴 Critico',
};

export default function ClientHealthPage() {
  const { data } = useData();
  const router   = useRouter();
  const today    = localDateISO();
  const thisMonth = today.slice(0, 7);

  const [filterHealth, setFilterHealth] = useState<HealthLevel | ''>('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [sortBy, setSortBy] = useState<'health' | 'name' | 'overdue' | 'budget'>('health');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const responsibles = useMemo(() =>
    [...new Set(data.clients.filter(c => c.status === 'Attivo' && c.responsible).map(c => c.responsible!))],
    [data.clients]
  );

  const clientKPIs: ClientKPI[] = useMemo(() => {
    return data.clients
      .filter(c => c.status === 'Attivo')
      .map(client => {
        // Task
        const tasks = data.tasks.filter(t =>
          t.clientId === client.id || t.clientName?.toLowerCase() === client.name.toLowerCase()
        );
        const openTasks    = tasks.filter(t => !t.isCompleted);
        const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < today);
        const dueSoonTasks = openTasks.filter(t => {
          if (!t.dueDate) return false;
          const days = Math.round((new Date(t.dueDate).getTime() - new Date(today).getTime()) / 86400000);
          return days >= 0 && days <= 7;
        });

        // Editoriale
        const editorial = (data.editorialContent ?? []).filter(e =>
          e.clientId === client.id || e.clientName?.toLowerCase() === client.name.toLowerCase()
        );
        const editMonth        = editorial.filter(e => e.scheduledDate?.startsWith(thisMonth));
        const publishedMonth   = editMonth.filter(e => e.status === 'Pubblicato').length;
        const plannedMonth     = editMonth.length;
        const blockedContent   = editorial.filter(e => e.status === 'Bloccato').length;
        const inReviewContent  = editorial.filter(e => e.status === 'In revisione').length;

        // Ore e budget
        const logs        = data.timeLogs.filter(l =>
          l.clientId === client.id || l.clientName?.toLowerCase() === client.name.toLowerCase()
        );
        const hoursLogged = logs.reduce((s, l) => s + l.hours, 0);
        const deal        = data.deals.find(d =>
          d.clientId === client.id || d.companyName?.toLowerCase() === client.name.toLowerCase()
        );
        const budgetOre   = deal?.budgetOre;
        const budgetPct   = budgetOre ? Math.round((hoursLogged / budgetOre) * 100) : undefined;
        const alertThreshold = deal?.alertThreshold ?? 80;

        // Ultima attività
        const allDates = [
          ...logs.map(l => l.date),
          ...editorial.map(e => e.scheduledDate),
          client.statusDate,
        ].filter(Boolean) as string[];
        const lastActivity = allDates.sort().reverse()[0];

        // Calcola salute
        const reasons: string[] = [];
        let health: HealthLevel = 'green';

        if (overdueTasks.length > 0) {
          health = 'red';
          reasons.push(`${overdueTasks.length} task in ritardo`);
        }
        if (budgetPct !== undefined && budgetPct >= 100) {
          health = 'red';
          reasons.push(`Budget ore esaurito (${budgetPct}%)`);
        }
        if (blockedContent > 0) {
          if (health !== 'red') health = 'yellow';
          reasons.push(`${blockedContent} contenuti bloccati`);
        }
        if (budgetPct !== undefined && budgetPct >= alertThreshold && budgetPct < 100) {
          if (health !== 'red') health = 'yellow';
          reasons.push(`Budget ore al ${budgetPct}%`);
        }
        if (dueSoonTasks.length > 0 && health === 'green') {
          health = 'yellow';
          reasons.push(`${dueSoonTasks.length} task in scadenza questa settimana`);
        }
        if (inReviewContent > 0 && health === 'green') {
          reasons.push(`${inReviewContent} contenuti in revisione`);
        }
        if (reasons.length === 0) {
          reasons.push('Tutto in regola');
        }

        return {
          id:              client.id,
          name:            client.name,
          sector:          client.sector,
          responsible:     client.responsible,
          health,
          reasons,
          openTasks:       openTasks.length,
          overdueTasks:    overdueTasks.length,
          dueSoonTasks:    dueSoonTasks.length,
          publishedThisMonth: publishedMonth,
          plannedThisMonth:   plannedMonth,
          blockedContent,
          inReviewContent,
          hoursLogged,
          budgetOre,
          budgetPct,
          alertThreshold,
          lastActivity,
          driveLink:       client.driveLink,
          dealStatus:      deal?.status,
        };
      });
  }, [data, today, thisMonth]);

  const filtered = useMemo(() => {
    let list = clientKPIs;
    if (filterHealth) list = list.filter(c => c.health === filterHealth);
    if (filterResponsible) list = list.filter(c => c.responsible === filterResponsible);
    return [...list].sort((a, b) => {
      if (sortBy === 'health') {
        const order = { red: 0, yellow: 1, green: 2 };
        return order[a.health] - order[b.health];
      }
      if (sortBy === 'overdue') return b.overdueTasks - a.overdueTasks;
      if (sortBy === 'budget') return (b.budgetPct ?? 0) - (a.budgetPct ?? 0);
      return a.name.localeCompare(b.name);
    });
  }, [clientKPIs, filterHealth, filterResponsible, sortBy]);

  // Summary globale
  const summary = useMemo(() => ({
    red:    clientKPIs.filter(c => c.health === 'red').length,
    yellow: clientKPIs.filter(c => c.health === 'yellow').length,
    green:  clientKPIs.filter(c => c.health === 'green').length,
    totalOverdue:  clientKPIs.reduce((s, c) => s + c.overdueTasks, 0),
    totalBlocked:  clientKPIs.reduce((s, c) => s + c.blockedContent, 0),
  }), [clientKPIs]);

  return (
    <div style={{ padding:'28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:26, color:'var(--text-1)' }}>
            KPI Multi-Cliente
          </h1>
          <p style={{ fontSize:14, color:'var(--text-3)', marginTop:3 }}>
            Stato di salute di tutti i clienti attivi — {clientKPIs.length} clienti
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {(['grid','table'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'7px 14px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer',
              border:`1px solid ${view===v?'var(--brand)':'var(--border2)'}`,
              background: view===v?'rgba(242,101,34,0.1)':'transparent',
              color: view===v?'var(--brand)':'var(--text-3)',
            }}>
              {v === 'grid' ? '⊞ Griglia' : '≡ Tabella'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary semaforo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:24 }}>
        {[
          { label:'🔴 Critici',    val:summary.red,          color:'#f87171', filter:'red' as HealthLevel },
          { label:'🟡 Attenzione', val:summary.yellow,       color:'#fbbf24', filter:'yellow' as HealthLevel },
          { label:'✅ In regola',  val:summary.green,        color:'#4ade80', filter:'green' as HealthLevel },
          { label:'Task in ritardo', val:summary.totalOverdue, color:'#f87171', filter:'' as '' },
          { label:'Contenuti bloccati', val:summary.totalBlocked, color:'#fbbf24', filter:'' as '' },
        ].map(k => (
          <div key={k.label}
            onClick={() => k.filter ? setFilterHealth(filterHealth === k.filter ? '' : k.filter) : undefined}
            style={{
              background:'var(--surface)', border:`1px solid ${filterHealth === k.filter ? k.color : 'var(--border)'}`,
              borderRadius:12, padding:'14px 18px', cursor: k.filter ? 'pointer' : 'default',
              transition:'border 150ms',
            }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{k.label}</p>
            <p style={{ fontSize:28, fontWeight:800, color:k.color, fontFamily:"'Cormorant Garamond',serif" }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <select style={{ padding:'7px 12px', borderRadius:9, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', outline:'none', cursor:'pointer' }}
          value={filterHealth} onChange={e => setFilterHealth(e.target.value as HealthLevel | '')}>
          <option value="">Tutti i semafori</option>
          <option value="red">🔴 Critici</option>
          <option value="yellow">🟡 Attenzione</option>
          <option value="green">✅ In regola</option>
        </select>
        {responsibles.length > 0 && (
          <select style={{ padding:'7px 12px', borderRadius:9, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', outline:'none', cursor:'pointer' }}
            value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
            <option value="">Tutti gli account</option>
            {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <select style={{ padding:'7px 12px', borderRadius:9, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', outline:'none', cursor:'pointer' }}
          value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
          <option value="health">Ordina: Semaforo</option>
          <option value="overdue">Ordina: Task in ritardo</option>
          <option value="budget">Ordina: Budget %</option>
          <option value="name">Ordina: Nome</option>
        </select>
        {(filterHealth || filterResponsible) && (
          <button onClick={() => { setFilterHealth(''); setFilterResponsible(''); }}
            style={{ fontSize:13, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer' }}>
            ✕ Reset
          </button>
        )}
        <span style={{ fontSize:13, color:'var(--text-3)', alignSelf:'center', marginLeft:'auto' }}>
          {filtered.length} clienti
        </span>
      </div>

      {/* ── VISTA GRIGLIA ── */}
      {view === 'grid' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {filtered.map(c => (
            <div key={c.id}
              onClick={() => router.push(`/clients/${c.id}`)}
              style={{
                background:'var(--surface)', border:`1px solid ${HEALTH_COLOR[c.health]}33`,
                borderRadius:14, padding:'16px 18px', cursor:'pointer', transition:'all 150ms',
                borderLeft:`4px solid ${HEALTH_COLOR[c.health]}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = HEALTH_BG[c.health]}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                  <p style={{ fontSize:12, color:'var(--text-3)' }}>{[c.sector, c.responsible].filter(Boolean).join(' · ')}</p>
                </div>
                <span style={{ fontSize:13, fontWeight:700, padding:'3px 9px', borderRadius:20, flexShrink:0, marginLeft:8,
                  background: HEALTH_BG[c.health], color: HEALTH_COLOR[c.health],
                  border:`1px solid ${HEALTH_COLOR[c.health]}44`,
                }}>
                  {c.health === 'green' ? '✅' : c.health === 'yellow' ? '🟡' : '🔴'}
                </span>
              </div>

              {/* Motivi */}
              <div style={{ marginBottom:12 }}>
                {c.reasons.slice(0, 2).map((r, i) => (
                  <p key={i} style={{ fontSize:12, color: c.health === 'green' ? 'var(--text-3)' : HEALTH_COLOR[c.health], marginBottom:2 }}>
                    {c.health !== 'green' ? '⚠ ' : '✓ '}{r}
                  </p>
                ))}
              </div>

              {/* KPI mini */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
                {[
                  { label:'Task', val:c.openTasks, warn: c.overdueTasks > 0 },
                  { label:'Pubbl.', val:`${c.publishedThisMonth}/${c.plannedThisMonth}` },
                  { label:'Budget', val: c.budgetPct !== undefined ? `${c.budgetPct}%` : '—', warn: c.budgetPct !== undefined && c.budgetPct >= c.alertThreshold },
                ].map(k => (
                  <div key={k.label} style={{ textAlign:'center', padding:'6px', borderRadius:8, background:'var(--surface2)' }}>
                    <p style={{ fontSize:16, fontWeight:800, color: k.warn ? '#f87171' : 'var(--text-1)', fontFamily:"'Cormorant Garamond',serif" }}>{k.val}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:8, borderTop:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>
                  {c.lastActivity ? `Ultima att.: ${c.lastActivity}` : 'Nessuna attività'}
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  {c.driveLink && (
                    <a href={c.driveLink} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                      style={{ fontSize:12, color:'#4ade80' }}>📁</a>
                  )}
                  <button onClick={e => { e.stopPropagation(); router.push(`/clients/${c.id}/briefing`); }}
                    style={{ fontSize:11, padding:'2px 8px', borderRadius:6, border:'1px solid rgba(96,165,250,0.3)', background:'none', color:'#60a5fa', cursor:'pointer' }}>
                    Brief →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VISTA TABELLA ── */}
      {view === 'table' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                {['Cliente','Account','Semaforo','Task','Pubbl./Piano','Budget ore','Bloccati','Ultima att.',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 100ms',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  onMouseEnter={e => e.currentTarget.style.background = HEALTH_BG[c.health]}
                  onMouseLeave={e => e.currentTarget.style.background = i%2===0?'transparent':'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding:'10px 14px' }}>
                    <p style={{ fontSize:15, fontWeight:600, color:'var(--text-1)' }}>{c.name}</p>
                    <p style={{ fontSize:12, color:'var(--text-3)' }}>{c.sector}</p>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:14, color:'var(--text-2)' }}>{c.responsible ?? '—'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:20,
                      background:HEALTH_BG[c.health], color:HEALTH_COLOR[c.health],
                      border:`1px solid ${HEALTH_COLOR[c.health]}44` }}>
                      {HEALTH_LABEL[c.health]}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', textAlign:'center' }}>
                    <span style={{ fontSize:15, fontWeight:700, color: c.overdueTasks>0?'#f87171':'var(--text-1)' }}>{c.openTasks}</span>
                    {c.overdueTasks > 0 && <span style={{ fontSize:11, color:'#f87171', display:'block' }}>{c.overdueTasks} ritardo</span>}
                  </td>
                  <td style={{ padding:'10px 14px', textAlign:'center', fontSize:14, color:'var(--text-2)' }}>
                    {c.publishedThisMonth}/{c.plannedThisMonth}
                  </td>
                  <td style={{ padding:'10px 14px', textAlign:'center' }}>
                    {c.budgetPct !== undefined ? (
                      <div>
                        <span style={{ fontSize:14, fontWeight:700, color: c.budgetPct>=100?'#f87171':c.budgetPct>=c.alertThreshold?'#fbbf24':'#4ade80' }}>
                          {c.budgetPct}%
                        </span>
                        <div style={{ height:3, width:60, background:'var(--surface2)', borderRadius:2, margin:'3px auto 0' }}>
                          <div style={{ height:'100%', width:`${Math.min(c.budgetPct,100)}%`, background:c.budgetPct>=100?'#f87171':c.budgetPct>=c.alertThreshold?'#fbbf24':'#4ade80', borderRadius:2 }} />
                        </div>
                      </div>
                    ) : <span style={{ color:'var(--text-3)', fontSize:14 }}>—</span>}
                  </td>
                  <td style={{ padding:'10px 14px', textAlign:'center' }}>
                    {c.blockedContent > 0
                      ? <span style={{ fontSize:14, fontWeight:700, color:'#f87171' }}>{c.blockedContent}</span>
                      : <span style={{ color:'var(--text-3)', fontSize:14 }}>—</span>}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text-3)' }}>
                    {c.lastActivity ?? '—'}
                  </td>
                  <td style={{ padding:'10px 14px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => router.push(`/clients/${c.id}/briefing`)}
                      style={{ fontSize:12, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(96,165,250,0.3)', background:'none', color:'#60a5fa', cursor:'pointer', whiteSpace:'nowrap' }}>
                      Brief →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
