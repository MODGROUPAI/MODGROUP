'use client';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { EmptyState } from '@/components/EmptyState';
import { Modal, Field } from '@/components/Modal';
import type { ArchivedProject } from '@/lib/types';

const EMPTY: Omit<ArchivedProject,'id'> = { clientName:'' };

export default function ArchivePage() {
  const { data, update } = useData();
  const [modal, setModal] = useState<ArchivedProject | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<ArchivedProject,'id'>>(EMPTY);

  const set = (k: keyof typeof form, v: string) => setForm(f=>({...f,[k]:v}));
  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (r: ArchivedProject) => { const {id,...rest}=r; setForm(rest); setModal(r); };
  const handleSave = () => {
    const saved: ArchivedProject = { id: modal?.id??`ARCH${Date.now()}`, ...form };
    update({ archivedProjects: modal?.id ? data.archivedProjects.map(a=>a.id===saved.id?saved:a) : [saved,...data.archivedProjects] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ archivedProjects: data.archivedProjects.filter(a=>a.id!==id) });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Archivio Progetti" description={`${data.archivedProjects.length} progetti archiviati`} />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>+ Archivia Progetto</button>
      </div>
      <CrudTable rows={data.archivedProjects}
          emptyNode={<EmptyState icon="📦" title="Archivio vuoto" description="I progetti conclusi finiscono qui. L'archivio ti permette di tenere traccia della storia dei tuoi clienti." size="sm" />} onEdit={openEdit} onDelete={handleDelete}
        searchPlaceholder="Cerca per cliente, settore, responsible..."
        columns={[
          {key:'clientName', label:'Cliente', render:r=><span className="font-medium">{r.clientName}</span>},
          {key:'sector', label:'Settore'},
          {key:'startDate', label:'Inizio'},
          {key:'endDate', label:'Fine'},
          {key:'closureReason', label:'Motivo chiusura'},
          {key:'totalRevenue', label:'Fatturato'},
          {key:'responsible', label:'Responsabile'},
          {key:'reactivatable', label:'Riattivabile?', render:r=>(
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.reactivatable==='Si'||r.reactivatable==='Sì'?'[background:rgba(46,204,113,0.15)] [color:#2ecc71]':'[background:var(--surface3)] [color:var(--text-3)]'}`}>{r.reactivatable||'—'}</span>
          )},
        ]}
      />
      {modal !== undefined && (
        <Modal title={modal?'Modifica Progetto':'Archivia Progetto'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.clientName.trim()}>
          <Field label="Cliente *" full><input className="input" value={form.clientName} onChange={e=>set('clientName',e.target.value)} /></Field>
          <Field label="Settore"><input className="input" value={form.sector??''} onChange={e=>set('sector',e.target.value)} /></Field>
          <Field label="Data Inizio"><input className="input" type="date" value={form.startDate??''} onChange={e=>set('startDate',e.target.value)} /></Field>
          <Field label="Data Fine"><input className="input" type="date" value={form.endDate??''} onChange={e=>set('endDate',e.target.value)} /></Field>
          <Field label="Motivo Chiusura" full><input className="input" value={form.closureReason??''} onChange={e=>set('closureReason',e.target.value)} /></Field>
          <Field label="Fatturato Totale"><input className="input" value={form.totalRevenue??''} onChange={e=>set('totalRevenue',e.target.value)} /></Field>
          <Field label="Responsabile"><input className="input" list="team-archive" value={form.responsible??''} onChange={e=>set('responsible',e.target.value)} /><datalist id="team-archive">{data.teamMembers.map(t=><option key={t.id} value={t.fullName}/>)}</datalist></Field>
          <Field label="Riattivabile?">
            <select className="input" value={form.reactivatable??''} onChange={e=>set('reactivatable',e.target.value)}>
              <option value="">—</option><option value="Si">Sì</option><option value="No">No</option>
            </select>
          </Field>
          <Field label="Note / Storia" full><textarea className="input resize-none" rows={2} value={form.notes??''} onChange={e=>set('notes',e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
