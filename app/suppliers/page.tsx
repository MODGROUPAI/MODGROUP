'use client';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { CrudTable } from '@/components/CrudTable';
import { EmptyState } from '@/components/EmptyState';
import { Modal, Field } from '@/components/Modal';
import type { Supplier } from '@/lib/types';

const CATEGORIES: Supplier['category'][] = [
  'Fotografi / Videomaker','Copywriter / Creativi','Stampatori / Produzione',
  'Agenzie / Collaboratori','Influencer / Creator','Fornitori tecnici','Altro'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Fotografi / Videomaker': '[background:rgba(139,92,246,0.15)] [color:#a78bfa]',
  'Copywriter / Creativi': '[background:rgba(59,158,255,0.15)] [color:#3b9eff]',
  'Stampatori / Produzione': '[background:rgba(245,197,24,0.15)] [color:#f5c518]',
  'Agenzie / Collaboratori': 'bg-orange-100 text-orange-700',
  'Influencer / Creator': 'bg-pink-100 text-pink-700',
  'Fornitori tecnici': '[background:var(--surface3)] [color:var(--text-2)]',
  'Altro': '[background:var(--surface3)] [color:var(--text-3)]',
};

function Stars({ value, onChange }: { value?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none transition-colors ${(value??0) >= n ? 'text-amber-400' : 'text-slate-200'} ${onChange ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'}`}
        >★</button>
      ))}
    </div>
  );
}

const EMPTY: Omit<Supplier,'id'> = { name:'', category:'Altro', status:'Attivo' };

export default function SuppliersPage() {
  const { data, update } = useData();
  const [modal, setModal] = useState<Supplier | null | undefined>(undefined);
  const [form, setForm] = useState<Omit<Supplier,'id'>>(EMPTY);
  const [filterCat, setFilterCat] = useState<string>('Tutti');

  const set = (k: keyof typeof form, v: unknown) => setForm(f=>({...f,[k]:v}));
  const openNew = () => { setForm(EMPTY); setModal(null); };
  const openEdit = (r: Supplier) => { const {id,...rest}=r; setForm(rest); setModal(r); };
  const handleSave = () => {
    const saved: Supplier = { id: modal?.id??`SUP${Date.now()}`, ...form };
    update({ suppliers: modal?.id ? data.suppliers.map(s=>s.id===saved.id?saved:s) : [saved,...data.suppliers] });
    setModal(undefined);
  };
  const handleDelete = (id: string) => update({ suppliers: data.suppliers.filter(s=>s.id!==id) });

  const filtered = filterCat === 'Tutti' ? data.suppliers : data.suppliers.filter(s => s.category === filterCat);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Fornitori" description={`${data.suppliers.length} fornitori · ${data.suppliers.filter(s=>s.status==='Attivo').length} attivi`} />
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{backgroundColor:'#C8511A'}}>+ Nuovo Fornitore</button>
      </div>

      {/* Filtro categoria */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['Tutti', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCat===cat ? 'text-white' : '[background:var(--surface3)] [color:var(--text-3)] hover:bg-slate-200'}`}
            style={filterCat===cat ? {backgroundColor:'#C8511A'} : {}}>
            {cat}
          </button>
        ))}
      </div>


      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Fornitori attivi',  value: String(data.suppliers.filter(s=>s.status==='Attivo').length),   color: 'var(--text-1)' },
          { label: 'Inattivi',          value: String(data.suppliers.filter(s=>s.status==='Inattivo').length), color: 'var(--text-3)' },
          { label: 'Valutazione media', value: data.suppliers.length ? (data.suppliers.reduce((s,x)=>s+(x.rating??0),0)/data.suppliers.length).toFixed(1)+'★' : '—', color: '#f5c518' },
        ].map(k => (
          <div key={k.label} className="card px-4 py-3">
            <p className="label mb-1">{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'2rem', lineHeight:1, color:k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <CrudTable rows={filtered} onEdit={openEdit} onDelete={handleDelete}
        searchPlaceholder="Cerca per nome, servizio, progetto..."
        columns={[
          {key:'name', label:'Nome', render:r=><span className="font-medium [color:var(--text-1)]">{r.name}</span>},
          {key:'category', label:'Categoria', render:r=>(
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${CATEGORY_COLORS[r.category]??'[background:var(--surface3)] [color:var(--text-3)]'}`}>{r.category}</span>
          )},
          {key:'contactName', label:'Contatto'},
          {key:'email', label:'Email', render:r=>r.email?(
            <div className="flex items-center gap-1.5">
              <a href={`mailto:${r.email}`} className="text-orange-600 hover:underline text-xs">{r.email}</a>
              <a href={`mailto:${r.email}?subject=Collaborazione MOD Group`}
                className="rounded-lg px-1.5 py-0.5 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                title="Invia mail">mail</a>
            </div>
          ):<span className="[color:var(--text-3)]">—</span>},
          {key:'phone', label:'Telefono'},
          {key:'serviceDescription', label:'Servizio', render:r=><span className="text-xs [color:var(--text-3)] max-w-[140px] truncate block">{r.serviceDescription||'—'}</span>},
          {key:'rate', label:'Tariffa'},
          {key:'projects', label:'Progetti', render:r=><span className="text-xs [color:var(--text-3)] max-w-[120px] truncate block">{r.projects||'—'}</span>},
          {key:'rating', label:'Rating', render:r=><Stars value={r.rating} />},
          {key:'status', label:'Stato', render:r=>(
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.status==='Attivo'?'[background:rgba(46,204,113,0.15)] [color:#2ecc71]':'[background:var(--surface3)] [color:var(--text-3)]'}`}>{r.status}</span>
          )},
        ]}
      />

      {modal !== undefined && (
        <Modal title={modal?'Modifica Fornitore':'Nuovo Fornitore'} onClose={()=>setModal(undefined)} onSave={handleSave} saveDisabled={!form.name.trim()}>
          <Field label="Nome *" full><input className="input" value={form.name} onChange={e=>set('name',e.target.value)} autoFocus /></Field>
          <Field label="Categoria">
            <select className="input" value={form.category} onChange={e=>set('category',e.target.value as Supplier['category'])}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Stato">
            <select className="input" value={form.status} onChange={e=>set('status',e.target.value as Supplier['status'])}>
              <option>Attivo</option><option>Inattivo</option>
            </select>
          </Field>
          <Field label="Contatto"><input className="input" value={form.contactName??''} onChange={e=>set('contactName',e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email??''} onChange={e=>set('email',e.target.value)} /></Field>
          <Field label="Telefono"><input className="input" value={form.phone??''} onChange={e=>set('phone',e.target.value)} /></Field>
          <Field label="Sito Web" full><input className="input" type="url" value={form.website??''} onChange={e=>set('website',e.target.value)} placeholder="https://..." /></Field>
          <Field label="Descrizione Servizio" full><input className="input" value={form.serviceDescription??''} onChange={e=>set('serviceDescription',e.target.value)} /></Field>
          <Field label="Tariffa / Budget"><input className="input" value={form.rate??''} onChange={e=>set('rate',e.target.value)} placeholder="es. €500/giorno" /></Field>
          <Field label="Progetti su cui ha lavorato" full><input className="input" value={form.projects??''} onChange={e=>set('projects',e.target.value)} placeholder="es. Sereno Hotels, Convento San Panfilo..." /></Field>
          <Field label="Ultimo Contatto"><input className="input" type="date" value={form.lastContact??''} onChange={e=>set('lastContact',e.target.value)} /></Field>
          <Field label="Valutazione">
            <Stars value={form.rating} onChange={v=>set('rating',v)} />
          </Field>
          <Field label="Note e Storico" full><textarea className="input resize-none" rows={3} value={form.notes??''} onChange={e=>set('notes',e.target.value)} placeholder="Storico collaborazioni, feedback, dettagli..." /></Field>
        </Modal>
      )}
    </div>
  );
}
