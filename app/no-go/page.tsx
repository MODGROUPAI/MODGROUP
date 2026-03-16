'use client';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { Modal, Field } from '@/components/Modal';
import type { NoGo } from '@/lib/types';


const NOGO_STATUSES = ['Perso','Budget insufficiente','Fuori target','Non risponde','Rimandato','Altro'];
const NOGO_SOURCES  = ['Instagram','LinkedIn','Referral','Cold outreach','Evento','Sito Web','Altro'];

const EMPTY: Omit<NoGo,'id'> = { companyName:'' };

export default function NoGoPage() {
  const { data, update } = useData();
  const [modal, setModal] = useState<NoGo | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<NoGo,'id'>>(EMPTY);

  const set = (k: keyof typeof form, v: string) => setForm(f=>({...f,[k]:v}));
  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (r: NoGo) => { const {id,...rest}=r; setForm(rest); setModal(r); };
  const handleSave = () => {
    const saved: NoGo = { id: modal?.id??`NOGO${Date.now()}`, ...form };
    update({ noGo: modal?.id ? data.noGo.map(n=>n.id===saved.id?saved:n) : [saved,...data.noGo] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ noGo: data.noGo.filter(n=>n.id!==id) });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="No Go" description={`${data.noGo.length} opportunità archiviate`} />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>+ Nuovo No Go</button>
      </div>

      {/* KPI strip */}
      {data.noGo.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Totale no-go',      value: String(data.noGo.length),                                                                color: 'var(--text-1)' },
            { label: 'Budget insuff.',    value: String(data.noGo.filter(n=>n.status==='Budget insufficiente').length),                    color: '#e74c3c' },
            { label: 'Rimandati',         value: String(data.noGo.filter(n=>n.status==='Rimandato').length),                              color: '#f5c518' },
          ].map(k => (
            <div key={k.label} className="card px-4 py-3">
              <p className="label mb-1">{k.label}</p>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'2rem', lineHeight:1, color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <CrudTable rows={data.noGo} onEdit={openEdit} onDelete={handleDelete}
        searchPlaceholder="Cerca per cliente, fonte, referente..."
        columns={[
          {key:'source', label:'Fonte'},
          {key:'companyName', label:'Cliente', render:r=><span className="font-medium">{r.companyName}</span>},
          {key:'jobType', label:'Lavoro'},
          {key:'status', label:'Motivo', render:r=><span className="rounded-full px-2.5 py-0.5 text-xs [background:rgba(231,76,60,0.15)] [color:#e74c3c]">{r.status||'—'}</span>},
          {key:'contactPerson', label:'Referente'},
        ]}
      />
      {modal !== undefined && (
        <Modal title={modal?'Modifica No Go':'Nuovo No Go'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.companyName.trim()}>
          <Field label="Cliente *" full><input className="input" list="clients-nogo" value={form.companyName} onChange={e=>set('companyName',e.target.value)} /><datalist id="clients-nogo">{data.clients.map(c=><option key={c.id} value={c.name}/>)}</datalist></Field>
          <Field label="Fonte"><input className="input" list="nogo-sources" value={form.source??''} onChange={e=>set('source',e.target.value)} /><datalist id="nogo-sources">{NOGO_SOURCES.map(s=><option key={s} value={s}/>)}</datalist></Field>
          <Field label="Lavoro"><input className="input" value={form.jobType??''} onChange={e=>set('jobType',e.target.value)} /></Field>
          <Field label="Motivo"><select className="input" value={form.status??''} onChange={e=>set('status',e.target.value)}><option value="">— Seleziona —</option>{NOGO_STATUSES.map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Referente"><input className="input" value={form.contactPerson??''} onChange={e=>set('contactPerson',e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
