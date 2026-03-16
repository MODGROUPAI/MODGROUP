'use client';
import { localDateISO, addDaysISO } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { EmptyState } from '@/components/EmptyState';
import { Modal, Field } from '@/components/Modal';
import type { Client, ArchivedProject } from '@/lib/types';


const CLIENT_SECTORS = [
  'Hospitality','Food & Beverage','Moda & Lifestyle','Agricoltura & Enogastronomia',
  'Real Estate','Professionale','Retail','Wellness & Beauty','Altro'
];

const EMPTY: Omit<Client,'id'> = { name:'', sector:'', status:'Attivo' };

export default function ClientsPage() {
  const { data, update } = useData();
  const router = useRouter();
  const [modal, setModal] = useState<Client | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<Client,'id'>>(EMPTY);
  const [archiveModal, setArchiveModal] = useState<Client | null>(null);
  const [archiveForm, setArchiveForm] = useState({ closureReason: '', totalRevenue: '', notes: '' });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({...f,[k]:v}));

  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (c: Client) => { const {id,...rest} = c; setForm(rest); setModal(c); };

  const handleSave = () => {
    const saved: Client = { id: modal?.id ?? `CLI${Date.now()}`, ...form };
    update({ clients: modal?.id ? data.clients.map(c => c.id===saved.id ? saved : c) : [saved,...data.clients] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ clients: data.clients.filter(c => c.id!==id) });

  // Archivia cliente → sposta in Archivio Progetti + segna come Archiviato
  const openArchive = (c: Client) => {
    setArchiveForm({ closureReason: '', totalRevenue: '', notes: c.notes || '' });
    setArchiveModal(c);
  };

  const confirmArchive = () => {
    if (!archiveModal) return;
    const archived: ArchivedProject = {
      id: `ARCH${Date.now()}`,
      clientId: archiveModal.id,
      clientName: archiveModal.name,
      sector: archiveModal.sector || '',
      startDate: archiveModal.startDate || '',
      endDate: localDateISO(),
      closureReason: archiveForm.closureReason,
      totalRevenue: archiveForm.totalRevenue,
      responsible: archiveModal.responsible || '',
      notes: archiveForm.notes,
      reactivatable: 'Si',
    };
    update({
      archivedProjects: [archived, ...data.archivedProjects],
      clients: data.clients.map(c => c.id === archiveModal.id ? { ...c, status: 'Archiviato' as Client['status'] } : c),
    });
    setArchiveModal(null);
  };

  const active = data.clients.filter(c=>c.status==='Attivo').length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Anagrafica Clienti" description={`${active} attivi · ${data.clients.length} totali`} />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>+ Nuovo Cliente</button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Clienti attivi',   value: String(data.clients.filter(c=>c.status==='Attivo').length),     color: 'var(--text-1)' },
          { label: 'Inattivi',         value: String(data.clients.filter(c=>c.status==='Inattivo').length),   color: 'var(--text-3)' },
          { label: 'Con Drive link',   value: String(data.clients.filter(c=>c.driveLink).length),             color: '#2ecc71' },
          { label: 'Archiviati',       value: String(data.clients.filter(c=>c.status==='Archiviato').length), color: 'var(--text-3)' },
        ].map(k => (
          <div key={k.label} className="card px-4 py-3">
            <p className="label mb-1">{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'2rem', lineHeight:1, color:k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <CrudTable rows={data.clients}
          onRowClick={(row: Client) => router.push(`/clients/${row.id}`)}
          emptyNode={<EmptyState icon="🏢" title="Nessun cliente attivo" description="Aggiungi i tuoi clienti o promuovi un lead esistente dal database lead." action={{ label: "+ Nuovo cliente", onClick: () => setModal({} as Client) }} secondary={{ label: "Vai ai lead", href: "/leads" }} />} onEdit={openEdit} onDelete={handleDelete}
        searchPlaceholder="Cerca per nome, settore, città..."
        extraActions={(row: Client) => (
          row.status === 'Attivo'
            ? <button onClick={e => { e.stopPropagation(); openArchive(row); }}
                className="text-xs [color:var(--text-3)] hover:[color:#f5c518] px-2 py-1 rounded hover:bg-amber-50 transition-colors" title="Archivia cliente">
                Archivia
              </button>
            : null
        )}
        columns={[
          {key:'id', label:'ID', render:r=><span className="text-xs [color:var(--text-3)]">{r.id}</span>},
          {key:'name', label:'Cliente', render:r=><span className="font-medium">{r.name}</span>},
          {key:'sector', label:'Settore', render:r=><span className="text-xs [color:var(--text-3)]">{r.sector||'—'}</span>},
          {key:'city', label:'Città'},
          {key:'contactName', label:'Contatto'},
          {key:'email', label:'Email', render:r=>r.email?<a href={`mailto:${r.email}`} className="text-orange-600 hover:underline text-xs">{r.email}</a>:<span>—</span>},
          {key:'responsible', label:'Responsabile'},
          {key:'status', label:'Stato', render:r=>(
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.status==='Attivo'?'[background:rgba(46,204,113,0.15)] [color:#2ecc71]':r.status==='Archiviato'?'[background:rgba(245,197,24,0.15)] [color:#f5c518]':'[background:var(--surface3)] [color:var(--text-3)]'}`}>{r.status}</span>
          )},
          {key:'driveLink', label:'Drive', render:r=>r.driveLink?<a href={r.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs [color:#2ecc71] [background:rgba(46,204,113,0.12)] px-2 py-1 rounded hover:opacity-80">Apri Drive</a>:<span className="text-xs [color:var(--text-3)]">—</span>},
        ]}
      />

      {/* Modal modifica/nuovo */}
      {modal !== undefined && (
        <Modal title={modal ? 'Modifica Cliente' : 'Nuovo Cliente'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.name.trim()}>
          <Field label="Nome Cliente *" full><input className="input" value={form.name} onChange={e=>set('name',e.target.value)} /></Field>
          <Field label="Settore"><input className="input" list="client-sectors" value={form.sector??''} onChange={e=>set('sector',e.target.value)} /><datalist id="client-sectors">{CLIENT_SECTORS.map(s=><option key={s} value={s}/>)}</datalist></Field>
          <Field label="Sito Web"><input className="input" value={form.website??''} onChange={e=>set('website',e.target.value)} /></Field>
          <Field label="Città"><input className="input" value={form.city??''} onChange={e=>set('city',e.target.value)} /></Field>
          <Field label="Indirizzo"><input className="input" value={form.address??''} onChange={e=>set('address',e.target.value)} /></Field>
          <Field label="CAP"><input className="input" value={form.cap??''} onChange={e=>set('cap',e.target.value)} /></Field>
          <Field label="Paese"><input className="input" value={form.country??''} onChange={e=>set('country',e.target.value)} /></Field>
          <Field label="Contatto Principale"><input className="input" value={form.contactName??''} onChange={e=>set('contactName',e.target.value)} /></Field>
          <Field label="Ruolo Contatto"><input className="input" list="client-roles" value={form.contactRole??''} onChange={e=>set('contactRole',e.target.value)} /><datalist id="client-roles">{['Direttore Marketing','Owner','PR Manager','F&B Manager','Responsabile Comunicazione','Altro'].map(r=><option key={r} value={r}/>)}</datalist></Field>
          <Field label="Email"><input className="input" type="email" value={form.email??''} onChange={e=>set('email',e.target.value)} /></Field>
          <Field label="Telefono"><input className="input" value={form.phone??''} onChange={e=>set('phone',e.target.value)} /></Field>
          <Field label="Responsabile"><input className="input" list="team-clients" value={form.responsible??''} onChange={e=>set('responsible',e.target.value)} /><datalist id="team-clients">{data.teamMembers.map(t=><option key={t.id} value={t.fullName}/>)}</datalist></Field>
          <Field label="Stato">
            <select className="input" value={form.status} onChange={e=>set('status',e.target.value as Client['status'])}>
              {['Attivo','Inattivo','Archiviato'].map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Data Inizio"><input className="input" type="date" value={form.startDate??''} onChange={e=>set('startDate',e.target.value)} /></Field>
          <Field label="Link Google Drive" full><input className="input" type="url" value={form.driveLink??''} onChange={e=>set('driveLink',e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          <Field label="Note" full><textarea className="input resize-none" rows={2} value={form.notes??''} onChange={e=>set('notes',e.target.value)} /></Field>
        </Modal>
      )}

      {/* Modal archiviazione */}
      {archiveModal && (
        <Modal title={`Archivia "${archiveModal.name}"`} onClose={()=>setArchiveModal(null)} onSave={confirmArchive} saveLabel="Archivia">
          <Field label="Motivo chiusura" full>
            <input className="input" value={archiveForm.closureReason} onChange={e=>setArchiveForm(f=>({...f,closureReason:e.target.value}))} placeholder="Es. Fine contratto, cliente perso..." />
          </Field>
          <Field label="Fatturato totale">
            <input className="input" value={archiveForm.totalRevenue} onChange={e=>setArchiveForm(f=>({...f,totalRevenue:e.target.value}))} placeholder="Es. 12000" />
          </Field>
          <Field label="Note finali" full>
            <textarea className="input resize-none" rows={2} value={archiveForm.notes} onChange={e=>setArchiveForm(f=>({...f,notes:e.target.value}))} />
          </Field>
          <div className="col-span-2 text-xs [color:var(--text-3)] [background:var(--surface2)] rounded-lg p-3">
            Il cliente verra segnato come "Archiviato" e copiato automaticamente in Archivio Progetti.
          </div>
        </Modal>
      )}
    </div>
  );
}
