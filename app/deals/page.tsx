'use client';
import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { EmptyState } from '@/components/EmptyState';
import { Modal, Field } from '@/components/Modal';
import type { Deal } from '@/lib/types';
import { DEFAULT_TEMPLATES, applyTemplate } from '@/lib/defaultTemplates';


const LEAD_SOURCES = ['Instagram','LinkedIn','Referral','Cold outreach','Evento','Sito Web','Altro'];
const DEAL_STATUSES = ['In corso','In pausa','Completata','Annullata','In attesa'];
const DEAL_JOB_TYPES = [
  'Social Media Management','Campagna ADV Meta','Campagna ADV Google',
  'Shooting Foto/Video','Sito Web','Consulenza Strategica',
  'Email Marketing','Onboarding Cliente','Altro'
];

const EMPTY: Omit<Deal,'id'> = { companyName:'', statusContact:'Attivo', alertThreshold: 80 };

function BudgetBar({ used, budget, threshold }: { used: number; budget: number; threshold: number }) {
  const pct = Math.min((used / budget) * 100, 100);
  const over = used > budget;
  const warn = pct >= threshold && !over;
  const color = over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-0.5">
        <span className={over ? '[color:#e74c3c] font-semibold' : warn ? '[color:#f5c518] font-semibold' : '[color:var(--text-3)]'}>
          {used.toFixed(1)}h / {budget}h
        </span>
        <span className={over ? '[color:#e74c3c] font-bold' : warn ? '[color:#f5c518]' : '[color:var(--text-3)]'}>
          {over ? `+${(used-budget).toFixed(1)}h` : `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full [background:var(--surface3)] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct,100)}%` }} />
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { data, update } = useData();
  const [modal, setModal] = useState<Deal | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<Deal,'id'>>(EMPTY);
  const [view, setView] = useState<'table'|'alert'>('table');
  const [tplDeal, setTplDeal] = useState<Deal | null>(null);
  const [tplId, setTplId]     = useState('');

  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const applyTpl = () => {
    if (!tplDeal || !tplId) return;
    const tpl = DEFAULT_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    const startDate = tplDeal.statusDate ?? new Date().toISOString().slice(0,10);
    const clientId  = tplDeal.clientId ?? '';
    const newTasks  = applyTemplate(tpl, clientId, tplDeal.companyName, tplDeal.id, startDate, tplDeal.projectLeaderId, tplDeal.projectLeader);
    update({ tasks: [...data.tasks, ...newTasks] });
    alert(`✅ ${newTasks.length} task creati dal template "${tpl.name}"!`);
    setTplDeal(null);
    setTplId('');
  };

  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (r: Deal) => { const {id,...rest} = r; setForm(rest); setModal(r); };
  const handleSave = () => {
    const saved: Deal = { id: modal?.id ?? `DEAL${Date.now()}`, ...form };
    update({ deals: modal?.id ? data.deals.map(d => d.id===saved.id ? saved : d) : [saved,...data.deals] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ deals: data.deals.filter(d => d.id !== id) });

  // Calcola ore usate per commessa incrociando timeLogs
  const orePerCommessa = useMemo(() => {
    const map: Record<string, number> = {};
    data.timeLogs.forEach(log => {
      const key = log.clientName?.toLowerCase().trim() ?? '';
      if (key) map[key] = (map[key] ?? 0) + log.hours;
    });
    return map;
  }, [data.timeLogs]);

  const getUsedHours = (deal: Deal) => {
    const key = deal.companyName.toLowerCase().trim();
    return orePerCommessa[key] ?? 0;
  };

  // Alert: commesse con budget impostato e soglia superata
  const alertDeals = useMemo(() => data.deals.filter(d => {
    if (!d.budgetOre) return false;
    const used = getUsedHours(d);
    const pct = (used / d.budgetOre) * 100;
    return pct >= (d.alertThreshold ?? 80);
  }), [data.deals, orePerCommessa]);

  return (
    <div>
      <PageHeader
        title="Dettaglio Commesse 2026"
        description={`${data.deals.length} commesse${alertDeals.length > 0 ? ` · ${alertDeals.length} con alert budget` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {alertDeals.length > 0 && (
              <button onClick={() => setView(v => v === 'alert' ? 'table' : 'alert')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${view === 'alert' ? 'text-white' : '[background:rgba(231,76,60,0.06)] [color:#e74c3c] hover:[background:rgba(231,76,60,0.15)]'}`}
                style={view === 'alert' ? { backgroundColor: '#ef4444' } : {}}>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full [background:rgba(231,76,60,0.06)]0 text-white text-xs font-bold" style={view === 'alert' ? { backgroundColor: 'white', color: '#ef4444' } : {}}>
                  {alertDeals.length}
                </span>
                Alert Budget
              </button>
            )}
            <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: '#C8511A' }}>
              + Nuova Commessa
            </button>
          </div>
        }
      />

      {/* Alert panel */}
      {view === 'alert' && alertDeals.length > 0 && (
        <div className="mb-6 card p-5 border [border-color:rgba(231,76,60,0.25)] [background:rgba(231,76,60,0.06)]">
          <h3 className="text-sm font-semibold [color:#e74c3c] mb-3">Commesse con soglia budget superata</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alertDeals.map(d => {
              const used = getUsedHours(d);
              const over = used > d.budgetOre!;
              return (
                <div key={d.id} className={`rounded-xl p-4 [background:var(--surface)] border ${over ? 'border-red-300' : 'border-amber-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold [color:var(--text-1)]">{d.companyName}</p>
                      <p className="text-xs [color:var(--text-3)]">{d.jobType || '—'} · {d.projectLeader || '—'}</p>
                    </div>
                    {over && <span className="text-xs [background:rgba(231,76,60,0.15)] [color:#e74c3c] rounded-full px-2 py-0.5 font-semibold shrink-0">SFORATO</span>}
                    {!over && <span className="text-xs [background:rgba(245,197,24,0.15)] [color:#f5c518] rounded-full px-2 py-0.5 shrink-0">ATTENZIONE</span>}
                  </div>
                  <BudgetBar used={used} budget={d.budgetOre!} threshold={d.alertThreshold ?? 80} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CrudTable rows={data.deals}
          emptyNode={<EmptyState icon="💰" title="Nessuna commessa aperta" description="Le commesse tracciano il budget ore e il valore economico dei tuoi progetti attivi." action={{ label: "+ Nuova commessa", onClick: () => setModal({} as Deal) }} />} onEdit={openEdit} onDelete={handleDelete}
        extraActions={(deal: Deal) => (
          <button
            onClick={e => { e.stopPropagation(); setTplDeal(deal); setTplId(''); }}
            className="text-xs px-2 py-1 rounded hover:opacity-80 transition-colors"
            style={{ color:'#a78bfa', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)' }}
            title="Applica template task">
            📋
          </button>
        )}
        searchPlaceholder="Cerca per cliente, lavoro, project leader..."
        columns={[
          { key:'source', label:'Fonte' },
          { key:'projectLeader', label:'Project Leader' },
          { key:'companyName', label:'Cliente', render:r=><span className="font-medium">{r.companyName}</span> },
          { key:'jobType', label:'Tipo Lavoro' },
          { key:'status', label:'Stato', render:r=><span className="rounded-full px-2.5 py-0.5 text-xs [background:rgba(245,197,24,0.15)] [color:#f5c518]">{r.status||'—'}</span> },
          { key:'driveLink', label:'Drive', render:r=>r.driveLink?<a href={r.driveLink} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-xs [color:#2ecc71] [background:rgba(46,204,113,0.12)] px-2 py-1 rounded hover:opacity-80">↗ Drive</a>:<span className="text-xs [color:var(--text-3)]">—</span> },
          { key:'budgetOre', label:'Budget Ore', render: r => {
            if (!r.budgetOre) return <span className="text-xs [color:var(--text-3)]">—</span>;
            const used = getUsedHours(r);
            return <div className="min-w-[120px]"><BudgetBar used={used} budget={r.budgetOre} threshold={r.alertThreshold ?? 80} /></div>;
          }},
          { key:'margin', label:'Margine' },
          { key:'statusContact', label:'Stato', render:r=>(
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.statusContact==='Attivo'?'[background:rgba(46,204,113,0.15)] [color:#2ecc71]':'[background:var(--surface3)] [color:var(--text-3)]'}`}>{r.statusContact||'—'}</span>
          )},
        ]}
      />

      {modal !== undefined && (
        <Modal title={modal?'Modifica Commessa':'Nuova Commessa'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.companyName.trim()}>
          <Field label="Cliente *" full><input className="input" value={form.companyName} onChange={e=>set('companyName',e.target.value)} /></Field>
          <Field label="Fonte"><input className="input" list="deal-sources" value={form.source??''} onChange={e=>set('source',e.target.value)} /><datalist id="deal-sources">{LEAD_SOURCES.map(s=><option key={s} value={s}/>)}</datalist></Field>
          <Field label="Project Leader"><input className="input" list="team-deals" value={form.projectLeader??''} onChange={e=>set('projectLeader',e.target.value)} /><datalist id="team-deals">{data.teamMembers.map(t=><option key={t.id} value={t.fullName}/>)}</datalist></Field>
          <Field label="Tipo Lavoro"><input className="input" list="jobtypes-deals" value={form.jobType??''} onChange={e=>set('jobType',e.target.value)} /><datalist id="jobtypes-deals">{DEAL_JOB_TYPES.map(j=><option key={j} value={j}/>)}</datalist></Field>
          <Field label="Stato"><select className="input" value={form.status??''} onChange={e=>set('status',e.target.value)}><option value="">— Seleziona —</option>{DEAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Margine"><input className="input" value={form.margin??''} onChange={e=>set('margin',e.target.value)} /></Field>
          <Field label="Referente"><input className="input" value={form.contactPerson??''} onChange={e=>set('contactPerson',e.target.value)} /></Field>
          <Field label="Stato Contatto">
            <select className="input" value={form.statusContact??'Attivo'} onChange={e=>set('statusContact',e.target.value)}>
              {['Attivo','Inattivo','In trattativa','Chiuso'].map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Data Stato"><input className="input" type="date" value={form.statusDate??''} onChange={e=>set('statusDate',e.target.value)} /></Field>

          {/* Budget section */}
          <div className="col-span-2 border-t [border-color:var(--border)] pt-4 mt-2">
            <p className="text-xs font-semibold [color:var(--text-3)] uppercase tracking-wide mb-3">Budget & Alert</p>
          </div>
          <Field label="Budget Ore">
            <input className="input" type="number" min={0} value={form.budgetOre??''} onChange={e=>set('budgetOre', e.target.value ? parseFloat(e.target.value) : '')} placeholder="Es. 40" />
          </Field>
          <Field label="Budget Euro (€)">
            <input className="input" type="number" min={0} value={form.budgetEuro??''} onChange={e=>set('budgetEuro', e.target.value ? parseFloat(e.target.value) : '')} placeholder="Es. 3000" />
          </Field>
          <Field label="Soglia alert (%)">
            <div className="flex items-center gap-2">
              <input className="input" type="number" min={1} max={100} value={form.alertThreshold??80} onChange={e=>set('alertThreshold', parseInt(e.target.value)||80)} />
              <span className="text-xs [color:var(--text-3)]">Avviso all'80% per default</span>
            </div>
          </Field>
          {form.budgetOre && (
            <Field label="Ore usate (live)" full>
              <div className="pt-1">
                <BudgetBar
                  used={modal ? getUsedHours({ ...modal, ...form } as Deal) : 0}
                  budget={form.budgetOre as number}
                  threshold={(form.alertThreshold as number) ?? 80}
                />
              </div>
            </Field>
          )}
          <Field label="Link Google Drive" full>
            <input className="input" type="url" value={form.driveLink??''} onChange={e=>set('driveLink',e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>
        </Modal>
      )}
      {/* ── Modal applica template ── */}
      {tplDeal !== null && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setTplDeal(null)} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:501, width:'100%', maxWidth:520, background:'var(--surface)',
            border:'1px solid var(--border2)', borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
          }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)' }}>📋 Applica template task</h3>
                <p style={{ fontSize:13, color:'var(--text-3)', marginTop:2 }}>{tplDeal.companyName} — {tplDeal.jobType}</p>
              </div>
              <button onClick={() => setTplDeal(null)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ padding:'10px 14px', borderRadius:9, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', fontSize:13, color:'#a78bfa' }}>
                ℹ️ I task verranno creati con date calcolate dalla data di inizio commessa ({tplDeal.statusDate ?? 'oggi'}).
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Seleziona template *</label>
                <select value={tplId} onChange={e => setTplId(e.target.value)}
                  style={{ padding:'9px 13px', borderRadius:9, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', outline:'none' }}>
                  <option value="">Scegli template...</option>
                  {DEFAULT_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.tasks.length} task)</option>
                  ))}
                  {(data.templates ?? []).filter(t => !DEFAULT_TEMPLATES.find(d => d.id === t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.tasks.length} task) — personalizzato</option>
                  ))}
                </select>
              </div>
              {tplId && (() => {
                const tpl = DEFAULT_TEMPLATES.find(t => t.id === tplId) ?? data.templates?.find(t => t.id === tplId);
                if (!tpl) return null;
                return (
                  <div style={{ padding:'12px 14px', borderRadius:9, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:6 }}>{tpl.tasks.length} task da creare:</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:3, maxHeight:150, overflowY:'auto' }}>
                      {tpl.tasks.map((t, i) => {
                        const due = new Date(tplDeal.statusDate ?? new Date().toISOString().slice(0,10));
                        due.setDate(due.getDate() + t.dueDaysOffset);
                        return (
                          <div key={t.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text-2)' }}>
                            <span>{i+1}. {t.title}</span>
                            <span style={{ color:'var(--text-3)', flexShrink:0, marginLeft:8 }}>scade {due.toLocaleDateString('it-IT')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button onClick={() => setTplDeal(null)} style={{ padding:'9px 18px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>Annulla</button>
              <button onClick={applyTpl} disabled={!tplId} style={{ flex:1, padding:'9px', borderRadius:9, fontSize:15, fontWeight:700, border:'none', cursor:tplId?'pointer':'not-allowed', background:tplId?'#a78bfa':'var(--surface3)', color:tplId?'white':'var(--text-3)' }}>
                📋 Crea task
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
