'use client';
import { localDateISO, addDaysISO } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Modal, Field } from '@/components/Modal';
import type { TimeLog } from '@/lib/types';

const EMPTY: Omit<TimeLog,'id'> = {
  date: localDateISO(),
  member: '', hours: 1, billable: true,
};

export default function TimeTrackingPage() {
  const { data, update } = useData();
  const [modal, setModal] = useState<TimeLog | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<TimeLog,'id'>>(EMPTY);
  const [filterMember, setFilterMember] = useState('Tutti');
  const [filterClient, setFilterClient] = useState('Tutti');

  const set = (k: keyof typeof form, v: unknown) => setForm(f=>({...f,[k]:v}));

  const members = ['Tutti', ...new Set(data.teamMembers.map(t=>t.fullName))];
  const clients = ['Tutti', ...new Set(data.clients.map(c=>c.name).filter(Boolean))];

  const openNew = () => {
    setForm({ ...EMPTY, member: filterMember !== 'Tutti' ? filterMember : '' });
    setModal(null);
  };
  const openEdit = (r: TimeLog) => { const {id,...rest}=r; setForm(rest); setModal(r); };

  const handleSave = () => {
    const saved: TimeLog = { id: modal?.id ?? `TIME${Date.now()}`, ...form };
    update({ timeLogs: modal?.id
      ? data.timeLogs.map(t => t.id===saved.id ? saved : t)
      : [saved, ...data.timeLogs]
    });
    setModal(undefined);
  };
  const handleDelete = (id: string) => { update({ timeLogs: data.timeLogs.filter(t=>t.id!==id) }); setModal(undefined); };

  const filtered = useMemo(() => data.timeLogs.filter(t =>
    (filterMember==='Tutti' || t.member===filterMember) &&
    (filterClient==='Tutti' || t.clientName===filterClient)
  ).sort((a,b) => b.date.localeCompare(a.date)), [data.timeLogs, filterMember, filterClient]);

  // Aggregates
  const totalHours = filtered.reduce((s,t)=>s+t.hours,0);
  const billableHours = filtered.filter(t=>t.billable).reduce((s,t)=>s+t.hours,0);
  const billableRatio = totalHours > 0 ? Math.round((billableHours/totalHours)*100) : 0;

  // Per member summary
  const byMember: Record<string, {total:number, billable:number}> = {};
  data.timeLogs.forEach(t => {
    if (!byMember[t.member]) byMember[t.member] = {total:0, billable:0};
    byMember[t.member].total += t.hours;
    if (t.billable) byMember[t.member].billable += t.hours;
  });

  // Per client summary
  const byClient: Record<string, number> = {};
  filtered.forEach(t => { if (t.clientName) byClient[t.clientName] = (byClient[t.clientName]??0) + t.hours; });
  const topClients = Object.entries(byClient).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Time Tracking" description="Log ore per task e progetto" />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>
          + Log Ore
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card px-4 py-3"><p className="text-xs [color:var(--text-3)] mb-1">Ore totali</p><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p></div>
        <div className="card px-4 py-3"><p className="text-xs [color:var(--text-3)] mb-1">Ore billable</p><p className="text-2xl font-bold [color:#2ecc71]">{billableHours.toFixed(1)}h</p></div>
        <div className="card px-4 py-3"><p className="text-xs [color:var(--text-3)] mb-1">Billable ratio</p><p className="text-2xl font-bold">{billableRatio}%</p></div>
        <div className="card px-4 py-3"><p className="text-xs [color:var(--text-3)] mb-1">Log totali</p><p className="text-2xl font-bold">{filtered.length}</p></div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Ore per membro */}
        <div className="card p-4 col-span-1">
          <h3 className="text-sm font-semibold mb-3">Ore per membro</h3>
          {Object.keys(byMember).length === 0
            ? <p className="text-xs [color:var(--text-3)]">Nessun log.</p>
            : Object.entries(byMember).sort((a,b)=>b[1].total-a[1].total).map(([name,{total,billable}])=>(
              <div key={name} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="[color:var(--text-3)]">{total.toFixed(1)}h <span className="[color:#2ecc71]">({billable.toFixed(1)}b)</span></span>
                </div>
                <div className="h-1.5 rounded-full [background:var(--surface3)]">
                  <div className="h-1.5 rounded-full" style={{width:`${Math.min((total/Math.max(...Object.values(byMember).map(v=>v.total)))*100,100)}%`, backgroundColor:'#C8511A'}} />
                </div>
              </div>
            ))
          }
        </div>

        {/* Top clienti per ore */}
        <div className="card p-4 col-span-2">
          <h3 className="text-sm font-semibold mb-3">Ore per cliente (filtrate)</h3>
          {topClients.length === 0
            ? <p className="text-xs [color:var(--text-3)]">Nessun dato.</p>
            : topClients.map(([name, hours]) => (
              <div key={name} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="[color:var(--text-3)]">{hours.toFixed(1)}h</span>
                </div>
                <div className="h-1.5 rounded-full [background:var(--surface3)]">
                  <div className="h-1.5 rounded-full bg-blue-400" style={{width:`${(hours/topClients[0][1])*100}%`}} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Filtri */}
      <div className="mb-4 flex gap-3">
        <select className="rounded-xl border [border-color:var(--border2)] [background:var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          value={filterMember} onChange={e=>setFilterMember(e.target.value)}>
          {members.map(m=><option key={m}>{m}</option>)}
        </select>
        <select className="rounded-xl border [border-color:var(--border2)] [background:var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          value={filterClient} onChange={e=>setFilterClient(e.target.value)}>
          {clients.map(c=><option key={c}>{c}</option>)}
        </select>
        <span className="text-xs [color:var(--text-3)] self-center">{filtered.length} log</span>
      </div>

      {/* Log table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b [border-color:var(--border)] [background:var(--surface2)]">
                {['Data','Membro','Cliente','Progetto','Task','Ore','Billable','Note',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal [color:var(--text-3)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9}><EmptyState icon="⏱️" title={data.timeLogs.length === 0 ? "Nessun log ore" : "Nessun risultato"} description={data.timeLogs.length === 0 ? "Traccia le ore lavorate per cliente per calcolare la redditività e monitorare il budget commesse." : "Prova a cambiare i filtri."} action={data.timeLogs.length === 0 ? { label: "+ Log ore", onClick: () => setModal({} as TimeLog) } : undefined} size="sm" /></td></tr>
                : filtered.map(t => (
                  <tr key={t.id} className="border-b [border-color:var(--border)] hover:[background:var(--surface2)] transition-colors group">
                    <td className="px-4 py-3 text-xs [color:var(--text-3)]">{t.date}</td>
                    <td className="px-4 py-3 font-medium">{t.member}</td>
                    <td className="px-4 py-3 [color:var(--text-2)]">{t.clientName||'--'}</td>
                    <td className="px-4 py-3 [color:var(--text-3)] text-xs">{t.projectName||'--'}</td>
                    <td className="px-4 py-3 [color:var(--text-3)] text-xs max-w-[140px] truncate">{t.taskTitle||'--'}</td>
                    <td className="px-4 py-3 font-semibold">{t.hours}h</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.billable?'[background:rgba(46,204,113,0.15)] [color:#2ecc71]':'[background:var(--surface3)] [color:var(--text-3)]'}`}>
                        {t.billable?'Si':'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs [color:var(--text-3)] max-w-[120px] truncate">{t.notes||'--'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>openEdit(t)} className="rounded-lg px-2 py-1 text-xs [color:var(--text-3)] hover:[background:var(--surface3)]">edit</button>
                        <button onClick={()=>handleDelete(t.id)} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:[background:rgba(231,76,60,0.06)]">del</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal !== undefined && (
        <Modal title={modal?'Modifica Log':'Nuovo Log Ore'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.member||!form.hours}>
          <Field label="Data"><input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)} /></Field>
          <Field label="Membro *">
            <input className="input" list="team-list" value={form.member} onChange={e=>set('member',e.target.value)} />
            <datalist id="team-list">{data.teamMembers.map(t=><option key={t.id} value={t.fullName}/>)}</datalist>
          </Field>
          <Field label="Cliente">
            <input className="input" list="clients-list" value={form.clientName??''} onChange={e=>set('clientName',e.target.value)} />
            <datalist id="clients-list">{data.clients.map(c=><option key={c.id} value={c.name}/>)}</datalist>
          </Field>
          <Field label="Progetto"><input className="input" value={form.projectName??''} onChange={e=>set('projectName',e.target.value)} /></Field>
          <Field label="Task" full><input className="input" value={form.taskTitle??''} onChange={e=>set('taskTitle',e.target.value)} /></Field>
          <Field label="Ore *"><input className="input" type="number" min="0.25" step="0.25" value={form.hours} onChange={e=>set('hours',parseFloat(e.target.value)||0)} /></Field>
          <Field label="Billable">
            <select className="input" value={form.billable?'si':'no'} onChange={e=>set('billable',e.target.value==='si')}>
              <option value="si">Si</option><option value="no">No</option>
            </select>
          </Field>
          <Field label="Note" full><textarea className="input resize-none" rows={2} value={form.notes??''} onChange={e=>set('notes',e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
