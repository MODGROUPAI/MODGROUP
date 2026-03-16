'use client';
import { localDateISO, addDaysISO } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { EmptyState } from '@/components/EmptyState';
import { Modal, Field } from '@/components/Modal';
import type { Lead } from '@/lib/types';
import { LeadConvertModal } from '@/components/LeadConvertModal';


const LEAD_SOURCES = ['Instagram','LinkedIn','Referral','Cold outreach','Evento','Sito Web','Altro'];
const LEAD_SERVICES = [
  'Social Media Management','Campagna ADV Meta','Campagna ADV Google',
  'Shooting Foto/Video','Sito Web','Consulenza Strategica','Email Marketing','Altro'
];

const EMPTY: Omit<Lead,'id'> = { companyName:'', statusContact:'Attivo', responsible:'' };

export default function LeadsPage() {
  const { data, update } = useData();
  const router = useRouter();
  const [modal, setModal] = useState<Lead | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<Lead,'id'>>(EMPTY);

  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const set = (k: keyof typeof form, v: unknown) => setForm(f=>({...f,[k]:v}));
  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (r: Lead) => { const {id,...rest}=r; setForm(rest); setModal(r); };
  const handleSave = () => {
    const saved: Lead = { id: modal?.id??`LEAD${Date.now()}`, ...form };
    update({ leads: modal?.id ? data.leads.map(l=>l.id===saved.id?saved:l) : [saved,...data.leads] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ leads: data.leads.filter(l=>l.id!==id) });


  const promoteToClient = (lead: Lead) => setConvertLead(lead);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Database Lead" description={`${data.leads.length} lead totali`} />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>+ Nuovo Lead</button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Lead attivi',       value: String(data.leads.filter(l=>l.statusContact!=='Chiuso'&&l.statusContact!=='Inattivo').length), color: 'var(--text-1)' },
          { label: 'Preventivo inviato',value: String(data.leads.filter(l=>l.quoteSent).length),    color: 'var(--brand)' },
          { label: 'In trattativa',     value: String(data.leads.filter(l=>l.statusContact==='In trattativa').length), color: '#3b9eff' },
          { label: 'Chiusi',            value: String(data.leads.filter(l=>l.statusContact==='Chiuso').length), color: '#2ecc71' },
        ].map(k => (
          <div key={k.label} className="card px-4 py-3">
            <p className="label mb-1">{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'2rem', lineHeight:1, color:k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <CrudTable rows={data.leads}
          emptyNode={<EmptyState icon="🎯" title="Nessun lead ancora" description="Inizia ad aggiungere i tuoi prospect. Ogni cliente attivo è nato qui." action={{ label: "+ Aggiungi lead", onClick: () => setModal({} as Lead) }} />} onEdit={openEdit} onDelete={handleDelete}
        extraActions={(lead: Lead) => (
          <button
            onClick={e => { e.stopPropagation(); router.push(`/quotes?leadId=${lead.id}&company=${encodeURIComponent(lead.companyName)}&service=${encodeURIComponent(lead.serviceType||'')}&contact=${encodeURIComponent(lead.companyName)}&email=${encodeURIComponent(lead.email||'')}`); }}
            className="text-xs [color:#3b9eff] hover:[color:#3b9eff] px-2 py-1 rounded hover:[background:rgba(59,130,246,0.08)] transition-colors"
            title="Crea preventivo">
            📄
          </button>
        )}
        searchPlaceholder="Cerca per azienda, fonte, servizio..."
        columns={[
          {key:'source', label:'Fonte'},
          {key:'companyName', label:'Azienda', render:r=><span className="font-medium">{r.companyName}</span>},
          {key:'serviceType', label:'Servizio'},
          {key:'feedback', label:'Feedback'},
          {key:'interest', label:'Interesse'},
          {key:'quoteSent', label:'Preventivo', render:r=><span className={`text-xs font-semibold ${r.quoteSent?'[color:#2ecc71]':'[color:var(--text-3)]'}`}>{r.quoteSent?'Sì':'No'}</span>},
          {key:'responsible', label:'Responsabile', render:r=><span className="text-xs [color:var(--text-2)]">{r.responsible||'—'}</span>},
          {key:'driveLink', label:'Drive', render:r=>r.driveLink?<a href={r.driveLink} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-xs [color:#2ecc71] [background:rgba(46,204,113,0.12)] px-2 py-1 rounded hover:opacity-80">↗ Drive</a>:<span className="text-xs [color:var(--text-3)]">—</span>},
          {key:'email', label:'Email', render:r=>r.email?<a href={`mailto:${r.email}`} className="text-orange-600 hover:underline text-xs">{r.email}</a>:<span>—</span>},
          {key:'phone', label:'Telefono'},
          {key:'statusContact', label:'Stato', render:r=>(
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.statusContact==='Attivo'?'[background:rgba(46,204,113,0.15)] [color:#2ecc71]':'[background:var(--surface3)] [color:var(--text-3)]'}`}>{r.statusContact||'—'}</span>
          )},
        ]}
      />
      {modal !== undefined && (
        <Modal title={modal?'Modifica Lead':'Nuovo Lead'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.companyName.trim()}>
          <Field label="Azienda *" full><input className="input" value={form.companyName} onChange={e=>set('companyName',e.target.value)} /></Field>
          <Field label="Fonte"><input className="input" list="lead-sources" value={form.source??''} onChange={e=>set('source',e.target.value)} /><datalist id="lead-sources">{LEAD_SOURCES.map(s=><option key={s} value={s}/>)}</datalist></Field>
          <Field label="Servizio"><input className="input" list="lead-services" value={form.serviceType??''} onChange={e=>set('serviceType',e.target.value)} /><datalist id="lead-services">{LEAD_SERVICES.map(s=><option key={s} value={s}/>)}</datalist></Field>
          <Field label="Feedback"><input className="input" value={form.feedback??''} onChange={e=>set('feedback',e.target.value)} /></Field>
          <Field label="Interesse"><select className="input" value={form.interest??''} onChange={e=>set('interest',e.target.value)}><option value="">—</option>{['1 – Basso','2 – Sotto media','3 – Medio','4 – Alto','5 – Molto alto'].map(v=><option key={v} value={v.charAt(0)}>{v}</option>)}</select></Field>
          <Field label="Preventivo inviato">
            <select className="input" value={form.quoteSent?'si':'no'} onChange={e=>set('quoteSent',e.target.value==='si')}>
              <option value="no">No</option><option value="si">Sì</option>
            </select>
          </Field>
          <Field label="Email"><input className="input" type="email" value={form.email??''} onChange={e=>set('email',e.target.value)} /></Field>
          <Field label="Telefono"><input className="input" value={form.phone??''} onChange={e=>set('phone',e.target.value)} /></Field>
          <Field label="Target"><input className="input" value={form.target??''} onChange={e=>set('target',e.target.value)} /></Field>
          <Field label="Stato Contatto">
            <select className="input" value={form.statusContact??'Attivo'} onChange={e=>set('statusContact',e.target.value)}>
              {['Attivo','Inattivo','In trattativa','Chiuso'].map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Data Stato"><input className="input" type="date" value={form.statusDate??''} onChange={e=>set('statusDate',e.target.value)} /></Field>
          <Field label="Link Google Drive" full><input className="input" type="url" value={form.driveLink??''} onChange={e=>set('driveLink',e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          <Field label="Responsabile">
            <input className="input" list="team-leads" value={form.responsible??''} onChange={e=>set('responsible',e.target.value)} placeholder="Seleziona o digita" />
            <datalist id="team-leads">{data.teamMembers.map(t=><option key={t.id} value={t.fullName}/>)}</datalist>
          </Field>
          <Field label="Note" full><textarea className="input resize-none" rows={2} value={form.notes??''} onChange={e=>set('notes',e.target.value)} /></Field>
        </Modal>
      )}
      {convertLead && (
        <LeadConvertModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onDone={(clientId) => { setConvertLead(null); router.push(`/clients/${clientId}`); }}
        />
      )}
    </div>
  );
}
