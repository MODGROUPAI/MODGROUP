'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { useRouter } from 'next/navigation';
import { localDateISO } from '@/lib/utils';
import type { Lead } from '@/lib/types';

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function daysSince(date?: string) {
  if (!date) return null;
  return Math.round((Date.now() - new Date(date).getTime()) / 86400000);
}

// Stage commerciale derivata dai campi esistenti del Lead
type CommercialStage = 'Nuovo' | 'Contattato' | 'In trattativa' | 'Preventivo inviato' | 'Vinto' | 'Perso';

function deriveStage(l: Lead): CommercialStage {
  const s = l.statusContact?.toLowerCase() ?? '';
  if (s.includes('perso') || s.includes('chiuso') || s.includes('no')) return 'Perso';
  if (s.includes('vinto') || s.includes('cliente')) return 'Vinto';
  if (l.quoteSent) return 'Preventivo inviato';
  if (s.includes('trattativa') || s.includes('proposta')) return 'In trattativa';
  if (s.includes('contatt') || s.includes('risposto') || s.includes('interesse')) return 'Contattato';
  return 'Nuovo';
}

// Probabilità stimate per stage
const STAGE_PROB: Record<CommercialStage, number> = {
  'Nuovo': 10, 'Contattato': 25, 'In trattativa': 50,
  'Preventivo inviato': 70, 'Vinto': 100, 'Perso': 0,
};

const STAGE_COLOR: Record<CommercialStage, { color: string; bg: string }> = {
  'Nuovo':              { color: 'var(--text-3)',  bg: 'var(--surface3)' },
  'Contattato':         { color: '#60a5fa',        bg: 'rgba(59,130,246,0.12)' },
  'In trattativa':      { color: '#f5c518',        bg: 'rgba(245,197,24,0.12)' },
  'Preventivo inviato': { color: 'var(--brand)',   bg: 'rgba(242,101,34,0.12)' },
  'Vinto':              { color: '#2ecc71',        bg: 'rgba(46,204,113,0.12)' },
  'Perso':              { color: '#f87171',        bg: 'rgba(231,76,60,0.12)' },
};

const STAGES: CommercialStage[] = ['Nuovo', 'Contattato', 'In trattativa', 'Preventivo inviato', 'Vinto', 'Perso'];
const ACTIVE_STAGES: CommercialStage[] = ['Nuovo', 'Contattato', 'In trattativa', 'Preventivo inviato'];

// Valore stimato da interesse/serviceType se non esplicitato
const SERVICE_VALUE: Record<string, number> = {
  'Social Media Management': 2400,
  'Campagna ADV Meta': 1500,
  'Campagna ADV Google': 1500,
  'Shooting Foto/Video': 800,
  'Sito Web': 3500,
  'Consulenza Strategica': 1200,
  'Email Marketing': 900,
};

function estimateValue(l: Lead): number {
  if (l.serviceType && SERVICE_VALUE[l.serviceType]) return SERVICE_VALUE[l.serviceType];
  return 1000; // fallback
}

// ── componente principale ──────────────────────────────────────────────────────

type View = 'funnel' | 'lista' | 'followup';

export default function CommercialPipelinePage() {
  const { data, update } = useData();
  const router = useRouter();
  const today = localDateISO();

  const [view, setView] = useState<View>('funnel');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterService, setFilterService] = useState('');
  const [editStageId, setEditStageId] = useState<string | null>(null);
  const [editStageVal, setEditStageVal] = useState<CommercialStage>('Nuovo');

  // Leads arricchiti con stage e valore stimato
  const leads = useMemo(() => data.leads.map(l => ({
    ...l,
    stage: deriveStage(l),
    estimatedValue: estimateValue(l),
    daysSinceContact: daysSince(l.statusDate),
  })).filter(l =>
    (!filterResponsible || l.responsible === filterResponsible) &&
    (!filterService || l.serviceType === filterService)
  ), [data.leads, filterResponsible, filterService]);

  const activeLeads  = useMemo(() => leads.filter(l => ACTIVE_STAGES.includes(l.stage)), [leads]);
  const wonLeads     = useMemo(() => leads.filter(l => l.stage === 'Vinto'), [leads]);
  const lostLeads    = useMemo(() => leads.filter(l => l.stage === 'Perso'), [leads]);

  // Valore pipeline
  const pipelineValue    = useMemo(() => activeLeads.reduce((s, l) => s + l.estimatedValue * (STAGE_PROB[l.stage] / 100), 0), [activeLeads]);
  const totalPotential   = useMemo(() => activeLeads.reduce((s, l) => s + l.estimatedValue, 0), [activeLeads]);
  const wonValue         = useMemo(() => wonLeads.reduce((s, l) => s + l.estimatedValue, 0), [wonLeads]);
  const conversionRate   = useMemo(() => {
    const closed = wonLeads.length + lostLeads.length;
    return closed > 0 ? Math.round((wonLeads.length / closed) * 100) : null;
  }, [wonLeads, lostLeads]);

  // Follow-up necessari: non contattati da > 7gg o senza data
  const needFollowup = useMemo(() => activeLeads.filter(l =>
    !l.daysSinceContact || l.daysSinceContact > 7
  ).sort((a, b) => (b.daysSinceContact ?? 999) - (a.daysSinceContact ?? 999)), [activeLeads]);

  // Per stage (funnel)
  const byStage = useMemo(() => {
    const map: Record<CommercialStage, typeof leads> = {
      'Nuovo': [], 'Contattato': [], 'In trattativa': [],
      'Preventivo inviato': [], 'Vinto': [], 'Perso': [],
    };
    leads.forEach(l => map[l.stage].push(l));
    return map;
  }, [leads]);

  // Responsabili e servizi disponibili
  const responsibles = useMemo(() => [...new Set(data.leads.map(l => l.responsible).filter(Boolean))], [data.leads]);
  const services     = useMemo(() => [...new Set(data.leads.map(l => l.serviceType).filter(Boolean))], [data.leads]);

  // Aggiorna stage (modifica statusContact)
  const applyStageChange = () => {
    if (!editStageId) return;
    const statusMap: Record<CommercialStage, string> = {
      'Nuovo': 'Nuovo', 'Contattato': 'Contattato', 'In trattativa': 'In trattativa',
      'Preventivo inviato': 'Preventivo inviato', 'Vinto': 'Vinto', 'Perso': 'Perso',
    };
    update({
      leads: data.leads.map(l =>
        l.id === editStageId
          ? { ...l, statusContact: statusMap[editStageVal], quoteSent: editStageVal === 'Preventivo inviato' ? true : l.quoteSent, statusDate: today }
          : l
      ),
    });
    setEditStageId(null);
  };

  // Genera messaggio followup
  const [copiedFollowup, setCopiedFollowup] = useState<string | null>(null);
  const copyFollowup = (l: typeof leads[0]) => {
    const msg =
      `Ciao ${l.companyName},\n\n` +
      `Volevamo aggiornarci su come stanno andando le cose e capire se possiamo essere utili.\n\n` +
      (l.serviceType ? `Avevamo discusso di ${l.serviceType} — siamo pronti a procedere quando vuoi.\n\n` : '') +
      `Resto a disposizione per qualsiasi domanda.\n\nCordiali saluti,\nTeam MOD`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedFollowup(l.id);
      setTimeout(() => setCopiedFollowup(null), 2000);
    });
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            Pipeline Commerciale
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>
            {activeLeads.length} lead attivi · pipeline ponderata {fmt(pipelineValue)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)} className="input" style={{ width: 160, fontSize: 13 }}>
            <option value="">Tutti i responsabili</option>
            {responsibles.map(r => <option key={r} value={r!}>{r}</option>)}
          </select>
          <select value={filterService} onChange={e => setFilterService(e.target.value)} className="input" style={{ width: 180, fontSize: 13 }}>
            <option value="">Tutti i servizi</option>
            {services.map(s => <option key={s} value={s!}>{s}</option>)}
          </select>
          <button onClick={() => router.push('/leads')}
            style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            + Nuovo lead →
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Lead attivi',         value: activeLeads.length,                    color: 'var(--text-1)',  sub: '' },
          { label: 'Pipeline ponderata',  value: fmt(pipelineValue),                    color: 'var(--brand)',   sub: `su ${fmt(totalPotential)} potenziale` },
          { label: 'Vinti',               value: wonLeads.length,                       color: '#2ecc71',        sub: fmt(wonValue) },
          { label: 'Tasso conversione',   value: conversionRate !== null ? `${conversionRate}%` : '—', color: conversionRate !== null && conversionRate >= 30 ? '#2ecc71' : '#f5c518', sub: `${wonLeads.length}/${wonLeads.length + lostLeads.length} chiusi` },
          { label: 'Followup necessari',  value: needFollowup.length,                   color: needFollowup.length > 0 ? '#f5c518' : 'var(--text-3)', sub: '> 7gg senza contatto' },
        ].map(k => (
          <div key={k.label} className="card kpi-mount" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: '2rem', lineHeight: 1, color: k.color }}>{k.value}</p>
            {k.sub && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'funnel',   label: '🔽 Funnel' },
          { key: 'lista',    label: '📋 Lista completa' },
          { key: 'followup', label: `📞 Follow-up${needFollowup.length > 0 ? ` (${needFollowup.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key as View)}
            style={{ padding: '10px 16px', borderRadius: '8px 8px 0 0', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 150ms', background: view === t.key ? 'var(--surface)' : 'transparent', color: view === t.key ? 'var(--brand)' : 'var(--text-3)', borderBottom: view === t.key ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB FUNNEL ── */}
      {view === 'funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {STAGES.map(stage => {
            const sc = STAGE_COLOR[stage];
            const stageLeads = byStage[stage];
            const stageValue = stageLeads.reduce((s, l) => s + l.estimatedValue, 0);
            return (
              <div key={stage}>
                {/* Stage header */}
                <div style={{ padding: '10px 12px', borderRadius: '10px 10px 0 0', background: sc.bg, borderBottom: `2px solid ${sc.color}44`, marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: sc.color }}>{stage}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-1)', marginTop: 2, fontWeight: 600 }}>
                    {stageLeads.length} · {fmt(stageValue)}
                  </p>
                </div>
                {/* Cards lead */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stageLeads.length === 0 ? (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, opacity: 0.5 }}>—</div>
                  ) : (
                    stageLeads.map(l => (
                      <div key={l.id}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all 150ms' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = sc.color)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        onClick={() => { setEditStageId(l.id); setEditStageVal(l.stage); }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 4 }}>{l.companyName}</p>
                        {l.serviceType && <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{l.serviceType}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: sc.color, fontWeight: 600 }}>{fmt(l.estimatedValue)}</span>
                          {l.daysSinceContact !== null && (
                            <span style={{ fontSize: 11, color: (l.daysSinceContact ?? 0) > 7 ? '#f87171' : 'var(--text-3)' }}>
                              {l.daysSinceContact}gg
                            </span>
                          )}
                        </div>
                        {l.responsible && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>👤 {l.responsible}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB LISTA ── */}
      {view === 'lista' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Azienda', 'Servizio', 'Stage', 'Valore est.', 'Probabilità', 'Valore pond.', 'Responsabile', 'Ultimo contatto', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Nessun lead trovato</td></tr>
              ) : (
                leads.map(l => {
                  const sc = STAGE_COLOR[l.stage];
                  const prob = STAGE_PROB[l.stage];
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 100ms', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => { setEditStageId(l.id); setEditStageVal(l.stage); }}>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{l.companyName}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-3)' }}>{l.serviceType || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.color }}>{l.stage}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{fmt(l.estimatedValue)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2 }}>
                            <div style={{ height: '100%', borderRadius: 2, background: sc.color, width: `${prob}%`, transition: 'width 400ms ease' }} />
                          </div>
                          <span style={{ fontSize: 12, color: sc.color, fontWeight: 700, width: 28, textAlign: 'right' }}>{prob}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: 'var(--brand)', fontWeight: 600 }}>{fmt(l.estimatedValue * prob / 100)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-3)' }}>{l.responsible || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: (l.daysSinceContact ?? 0) > 7 ? '#f87171' : 'var(--text-3)' }}>
                        {l.daysSinceContact !== null ? `${l.daysSinceContact}gg fa` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={e => { e.stopPropagation(); copyFollowup(l); }}
                          style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'none', color: copiedFollowup === l.id ? '#2ecc71' : 'var(--text-3)', cursor: 'pointer' }}>
                          {copiedFollowup === l.id ? '✅' : '📞'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB FOLLOW-UP ── */}
      {view === 'followup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {needFollowup.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>✅</p>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: '#2ecc71' }}>Tutti i lead sono aggiornati</p>
              <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 6 }}>Nessun follow-up in sospeso da più di 7 giorni.</p>
            </div>
          ) : (
            needFollowup.map(l => {
              const sc = STAGE_COLOR[l.stage];
              const urgent = (l.daysSinceContact ?? 0) > 14;
              return (
                <div key={l.id} className="card anim-fade-up" style={{
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                  border: `1px solid ${urgent ? 'rgba(231,76,60,0.3)' : 'var(--border)'}`,
                  background: urgent ? 'rgba(231,76,60,0.03)' : 'var(--surface)',
                }}>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{l.companyName}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: sc.bg, color: sc.color }}>{l.stage}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {l.serviceType && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>📦 {l.serviceType}</span>}
                      {l.responsible && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>👤 {l.responsible}</span>}
                      {l.email && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>✉️ {l.email}</span>}
                      {l.phone && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>📞 {l.phone}</span>}
                    </div>
                  </div>

                  {/* Giorni */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: '2rem', lineHeight: 1, color: urgent ? '#e74c3c' : '#f5c518' }}>
                      {l.daysSinceContact ?? '?'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>giorni fa</p>
                  </div>

                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => copyFollowup(l)}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(37,211,102,0.4)', background: copiedFollowup === l.id ? 'rgba(37,211,102,0.12)' : 'transparent', color: '#25d366', cursor: 'pointer', transition: 'all 150ms' }}>
                      {copiedFollowup === l.id ? '✅ Copiato' : '📱 Messaggio'}
                    </button>
                    {l.email && (
                      <a href={`mailto:${l.email}`} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        ✉️ Email
                      </a>
                    )}
                    <button onClick={() => { setEditStageId(l.id); setEditStageVal(l.stage); }}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                      Aggiorna stage
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Modal aggiorna stage ── */}
      {editStageId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditStageId(null); }}>
          <div className="card" style={{ padding: '28px 32px', width: 380, borderRadius: 18 }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
              Aggiorna stage
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>
              {leads.find(l => l.id === editStageId)?.companyName}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {STAGES.map(s => {
                const sc = STAGE_COLOR[s];
                return (
                  <button key={s} onClick={() => setEditStageVal(s)}
                    style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms', border: `2px solid ${editStageVal === s ? sc.color : 'var(--border2)'}`, background: editStageVal === s ? sc.bg : 'transparent', color: editStageVal === s ? sc.color : 'var(--text-2)' }}>
                    {s}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditStageId(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }}>Annulla</button>
              <button onClick={applyStageChange} style={{ flex: 2, padding: 10, borderRadius: 10, background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
