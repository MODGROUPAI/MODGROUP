'use client';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { Modal, Field } from '@/components/Modal';
import { formatDate } from '@/lib/utils';
import type { HotelContact } from '@/lib/types';


const CONTACT_CATEGORIES = ['Hotel','Resort','B&B','Agriturismo','Ristorante','Spa','Altro'];
const CONTACT_ROLES = ['Direttore','Direttore Marketing','F&B Manager','PR Manager','Owner','Reception','Altro'];

const EMPTY: Omit<HotelContact,'id'> = { propertyName:'' };

export default function ContactsPage() {
  const { data, update } = useData();
  const [modal, setModal] = useState<HotelContact | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<HotelContact,'id'>>(EMPTY);

  const set = (k: keyof typeof form, v: string) => setForm(f=>({...f,[k]:v}));
  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (r: HotelContact) => { const {id,...rest}=r; setForm(rest); setModal(r); };
  const handleSave = () => {
    const saved: HotelContact = { id: modal?.id??`HOT${Date.now()}`, ...form };
    update({ hotelContacts: modal?.id ? data.hotelContacts.map(h=>h.id===saved.id?saved:h) : [saved,...data.hotelContacts] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ hotelContacts: data.hotelContacts.filter(h=>h.id!==id) });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Rubrica Hotel" description={`${data.hotelContacts.length} strutture`} />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>+ Nuova Struttura</button>
      </div>
      <CrudTable rows={data.hotelContacts} onEdit={openEdit} onDelete={handleDelete}
        searchPlaceholder="Cerca per struttura, città, referente..."
        columns={[
          {key:'propertyName', label:'Struttura', render:r=><span className="font-medium">{r.propertyName}</span>},
          {key:'category', label:'Categoria'},
          {key:'city', label:'Città'},
          {key:'contactName', label:'Referente'},
          {key:'role', label:'Ruolo'},
          {key:'email', label:'Email', render:r=>r.email?<a href={`mailto:${r.email}`} className="text-orange-600 hover:underline text-xs">{r.email}</a>:<span>—</span>},
          {key:'phone', label:'Telefono'},
          {key:'contactDate', label:'Data contatto', render:r=><span className="text-xs">{formatDate(r.contactDate)}</span>},
          {key:'feedback', label:'Feedback'},
        ]}
      />
      {modal !== undefined && (
        <Modal title={modal?'Modifica Struttura':'Nuova Struttura'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.propertyName.trim()}>
          <Field label="Struttura *" full><input className="input" value={form.propertyName} onChange={e=>set('propertyName',e.target.value)} /></Field>
          <Field label="Categoria"><select className="input" value={form.category??''} onChange={e=>set('category',e.target.value)}><option value="">— Seleziona —</option>{CONTACT_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
          <Field label="Città"><input className="input" value={form.city??''} onChange={e=>set('city',e.target.value)} /></Field>
          <Field label="Referente"><input className="input" value={form.contactName??''} onChange={e=>set('contactName',e.target.value)} /></Field>
          <Field label="Ruolo"><select className="input" value={form.role??''} onChange={e=>set('role',e.target.value)}><option value="">— Seleziona —</option>{CONTACT_ROLES.map(r=><option key={r}>{r}</option>)}</select></Field>
          <Field label="Email"><input className="input" type="email" value={form.email??''} onChange={e=>set('email',e.target.value)} /></Field>
          <Field label="Telefono"><input className="input" value={form.phone??''} onChange={e=>set('phone',e.target.value)} /></Field>
          <Field label="Data contatto"><input className="input" type="date" value={form.contactDate??''} onChange={e=>set('contactDate',e.target.value)} /></Field>
          <Field label="Feedback"><input className="input" value={form.feedback??''} onChange={e=>set('feedback',e.target.value)} /></Field>
          <Field label="Note" full><textarea className="input resize-none" rows={2} value={form.notes??''} onChange={e=>set('notes',e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
