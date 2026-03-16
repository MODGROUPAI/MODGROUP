'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import type { Course, CourseStatus, CourseCategory } from '@/lib/types';

// Categorie di default se non ci sono ancora dati
const DEFAULT_CATEGORIES: CourseCategory[] = [
  { id: 'cat-1', name: 'Marketing Digitale', color: '#F26522', emoji: '📊', order: 1, createdAt: localDateISO() },
  { id: 'cat-2', name: 'Social Media',        color: '#3b9eff', emoji: '📱', order: 2, createdAt: localDateISO() },
  { id: 'cat-3', name: 'AI & Automazione',    color: '#a855f7', emoji: '🤖', order: 3, createdAt: localDateISO() },
  { id: 'cat-4', name: 'Content Creation',    color: '#22c55e', emoji: '✍️', order: 4, createdAt: localDateISO() },
  { id: 'cat-5', name: 'Advertising',         color: '#f59e0b', emoji: '📣', order: 5, createdAt: localDateISO() },
  { id: 'cat-6', name: 'Branding',            color: '#ec4899', emoji: '🎨', order: 6, createdAt: localDateISO() },
  { id: 'cat-7', name: 'Altro',               color: '#6b7280', emoji: '📚', order: 7, createdAt: localDateISO() },
];

const STATUS_STYLE: Record<CourseStatus, { bg: string; color: string }> = {
  'Bozza':      { bg: 'var(--surface3)',       color: 'var(--text-3)' },
  'Attivo':     { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  'Completato': { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  'Archiviato': { bg: 'rgba(120,120,120,0.12)',color: 'var(--text-3)' },
};

const PALETTE = ['#F26522','#3b9eff','#a855f7','#22c55e','#f59e0b','#ec4899','#06b6d4','#ef4444','#8b5cf6','#14b8a6'];
const EMOJIS  = ['📊','📱','🤖','✍️','📣','🎨','📚','💡','🎯','🔧','📈','🌐'];

function genId(p: string) { return `${p}${Date.now().toString(36).toUpperCase()}`; }

const inputStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};

type Modal = 'new-course' | 'manage-categories' | null;

export default function CoursesPage() {
  const { data, update } = useData();
  const router  = useRouter();
  const today   = localDateISO();

  const courses    = data.courses ?? [];
  const categories = data.courseCategories?.length ? data.courseCategories : DEFAULT_CATEGORIES;

  const [modal, setModal]           = useState<Modal>(null);
  const [filterStatus, setFilterStatus] = useState<CourseStatus | ''>('');
  const [filterCat, setFilterCat]   = useState('');
  const [search, setSearch]         = useState('');

  // ── Form nuovo corso ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title:'', subtitle:'', platform:'Remodel', category: categories[0]?.name ?? '',
    status:'Bozza' as CourseStatus, instructor:'Mattia Brumana',
    coInstructors:'', location:'Online', startDate:'', endDate:'',
    maxParticipants:'', price:'', driveLink:'', description:'', notes:'',
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Gestione categorie ────────────────────────────────────────────────────
  const [catForm, setCatForm]   = useState({ name:'', emoji:'📚', color:'#F26522', description:'' });
  const [editCatId, setEditCatId] = useState<string | null>(null);

  const saveCategory = () => {
    if (!catForm.name.trim()) return;
    if (editCatId) {
      update({ courseCategories: categories.map(c => c.id === editCatId ? { ...c, ...catForm } : c) });
    } else {
      const newCat: CourseCategory = {
        id: genId('CAT'), name: catForm.name, emoji: catForm.emoji,
        color: catForm.color, description: catForm.description,
        order: categories.length + 1, createdAt: today,
      };
      update({ courseCategories: [...categories, newCat] });
    }
    setCatForm({ name:'', emoji:'📚', color:'#F26522', description:'' });
    setEditCatId(null);
  };

  const deleteCategory = (id: string) => {
    if (!confirm('Eliminare questa categoria?')) return;
    update({ courseCategories: categories.filter(c => c.id !== id) });
  };

  const startEditCat = (cat: CourseCategory) => {
    setEditCatId(cat.id);
    setCatForm({ name: cat.name, emoji: cat.emoji ?? '📚', color: cat.color, description: cat.description ?? '' });
  };

  // ── Crea corso ────────────────────────────────────────────────────────────
  const handleCreate = () => {
    const newCourse: Course = {
      id: genId('CRS'), title: form.title, subtitle: form.subtitle || undefined,
      platform: form.platform, category: form.category, status: form.status,
      instructor: form.instructor,
      coInstructors: form.coInstructors ? form.coInstructors.split(',').map(s=>s.trim()) : undefined,
      location: form.location, startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
      price: form.price ? parseFloat(form.price) : undefined,
      driveLink: form.driveLink || undefined, description: form.description || undefined,
      notes: form.notes || undefined, modules: [], participants: [], createdAt: today,
    };
    update({ courses: [newCourse, ...courses] });
    setModal(null);
    router.push(`/courses/${newCourse.id}`);
  };

  // ── Filtri ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => courses.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterCat && c.category !== filterCat) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return [c.title, c.instructor, c.category, c.platform].some(v => v?.toLowerCase().includes(s));
  }), [courses, filterStatus, filterCat, search]);

  // KPI
  const kpi = {
    active:   courses.filter(c => c.status === 'Attivo').length,
    parts:    courses.reduce((s,c) => s + c.participants.length, 0),
    modules:  courses.reduce((s,c) => s + c.modules.length, 0),
    certs:    courses.reduce((s,c) => s + c.participants.filter(p=>p.certificateIssued).length, 0),
  };

  const getCatData = (name: string) => categories.find(c => c.name === name);

  return (
    <div style={{ padding:'28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:26, color:'var(--text-1)' }}>Corsi — Remodel</h1>
          <p style={{ fontSize:14, color:'var(--text-3)', marginTop:3 }}>Piattaforma di formazione · {courses.length} corsi</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setModal('manage-categories')} style={{ padding:'8px 16px', borderRadius:10, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>
            🏷️ Categorie
          </button>
          <button onClick={() => setModal('new-course')} style={{ padding:'9px 20px', borderRadius:10, fontSize:15, fontWeight:700, border:'none', background:'var(--brand)', color:'white', cursor:'pointer' }}>
            + Nuovo Corso
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
        {[
          { label:'Corsi attivi',       val:kpi.active,   color:'#4ade80' },
          { label:'Partecipanti totali', val:kpi.parts,   color:'var(--brand)' },
          { label:'Moduli totali',       val:kpi.modules, color:'#60a5fa' },
          { label:'Certificati emessi',  val:kpi.certs,   color:'#fbbf24' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{k.label}</p>
            <p style={{ fontSize:28, fontWeight:800, color:k.color, fontFamily:"'Cormorant Garamond',serif" }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filtri + navigazione categorie */}
      <div style={{ marginBottom:20 }}>
        {/* Pills categorie */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
          <button onClick={() => setFilterCat('')} style={{
            padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 150ms',
            background: filterCat === '' ? 'var(--brand)' : 'var(--surface2)',
            color: filterCat === '' ? 'white' : 'var(--text-3)',
          }}>
            Tutte ({courses.length})
          </button>
          {categories.sort((a,b) => a.order - b.order).map(cat => {
            const count = courses.filter(c => c.category === cat.name).length;
            if (count === 0) return null;
            const active = filterCat === cat.name;
            return (
              <button key={cat.id} onClick={() => setFilterCat(active ? '' : cat.name)} style={{
                padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 150ms',
                background: active ? cat.color : 'var(--surface2)',
                color: active ? 'white' : 'var(--text-3)',
                boxShadow: active ? `0 2px 12px ${cat.color}44` : 'none',
              }}>
                {cat.emoji} {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Barra ricerca + filtro stato */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <input style={{ ...inputStyle, maxWidth:280 }} placeholder="Cerca titolo, docente..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ ...inputStyle, width:'auto', cursor:'pointer' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as CourseStatus | '')}>
            <option value="">Tutti gli stati</option>
            {(['Bozza','Attivo','Completato','Archiviato'] as CourseStatus[]).map(s => <option key={s}>{s}</option>)}
          </select>
          {(search || filterStatus || filterCat) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterCat(''); }}
              style={{ fontSize:13, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer' }}>✕ Reset</button>
          )}
          <span style={{ fontSize:13, color:'var(--text-3)', alignSelf:'center', marginLeft:'auto' }}>{filtered.length} risultati</span>
        </div>
      </div>

      {/* Griglia corsi */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-3)' }}>
          <p style={{ fontSize:48, marginBottom:12 }}>🎓</p>
          <p style={{ fontSize:17, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>
            {courses.length === 0 ? 'Nessun corso ancora' : 'Nessun risultato'}
          </p>
          <p style={{ fontSize:15 }}>{courses.length === 0 ? 'Crea il primo corso Remodel' : 'Prova a cambiare i filtri'}</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 }}>
          {filtered.map(course => {
            const cat = getCatData(course.category ?? '');
            const readyMods = course.modules.filter(m => m.status==='Pronto'||m.status==='Erogato').length;
            const completedP = course.participants.filter(p => p.status==='Completato').length;
            return (
              <div key={course.id}
                onClick={() => router.push(`/courses/${course.id}`)}
                style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, padding:'20px', cursor:'pointer', transition:'all 150ms', overflow:'hidden', position:'relative' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cat?.color ?? 'var(--brand)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Striscia colore categoria */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: cat?.color ?? 'var(--brand)', borderRadius:'16px 16px 0 0' }} />

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, marginTop:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {cat && (
                      <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:20,
                        background: cat.color + '20', color: cat.color, border: `1px solid ${cat.color}44` }}>
                        {cat.emoji} {cat.name}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background: STATUS_STYLE[course.status].bg, color: STATUS_STYLE[course.status].color }}>
                    {course.status}
                  </span>
                </div>

                <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {course.title}
                </h3>
                {course.subtitle && <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:8 }}>{course.subtitle}</p>}

                <div style={{ display:'flex', gap:12, marginBottom:12, fontSize:13, color:'var(--text-3)' }}>
                  <span>👤 {course.instructor}</span>
                  <span>📍 {course.location || 'Online'}</span>
                </div>

                {course.modules.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:12, color:'var(--text-3)' }}>Moduli pronti</span>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{readyMods}/{course.modules.length}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:'var(--surface2)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${course.modules.length>0?(readyMods/course.modules.length)*100:0}%`, background: cat?.color ?? 'var(--brand)', borderRadius:2 }} />
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', gap:10, fontSize:13, color:'var(--text-3)' }}>
                    <span>👥 {course.participants.length}{course.maxParticipants?`/${course.maxParticipants}`:''}</span>
                    {completedP > 0 && <span style={{ color:'#4ade80' }}>✓ {completedP}</span>}
                  </div>
                  {course.price && <span style={{ fontSize:14, fontWeight:700, color: cat?.color ?? 'var(--brand)' }}>€{course.price.toLocaleString('it-IT')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal gestione categorie ── */}
      {modal === 'manage-categories' && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => { setModal(null); setEditCatId(null); setCatForm({ name:'', emoji:'📚', color:'#F26522', description:'' }); }} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, width:'100%', maxWidth:560, maxHeight:'88vh', overflowY:'auto', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
              <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)' }}>🏷️ Gestione Categorie</h2>
              <button onClick={() => { setModal(null); setEditCatId(null); }} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Form nuova/modifica categoria */}
              <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>
                  {editCatId ? '✏️ Modifica categoria' : '+ Nuova categoria'}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Nome *</label>
                    <input style={inputStyle} value={catForm.name} onChange={e => setCatForm(f=>({...f,name:e.target.value}))} placeholder="Es. E-commerce, Leadership..." />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Emoji</label>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {EMOJIS.map(e => (
                        <button key={e} onClick={() => setCatForm(f=>({...f,emoji:e}))} style={{
                          width:30, height:30, borderRadius:7, border:`2px solid ${catForm.emoji===e?'var(--brand)':'var(--border)'}`,
                          background: catForm.emoji===e ? 'rgba(242,101,34,0.1)' : 'var(--surface)', cursor:'pointer', fontSize:16,
                        }}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Colore</label>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {PALETTE.map(c => (
                        <button key={c} onClick={() => setCatForm(f=>({...f,color:c}))} style={{
                          width:28, height:28, borderRadius:6, border:`3px solid ${catForm.color===c?'white':'transparent'}`,
                          background:c, cursor:'pointer', boxShadow: catForm.color===c?`0 0 0 2px ${c}`:''
                        }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Descrizione (opzionale)</label>
                    <input style={inputStyle} value={catForm.description} onChange={e => setCatForm(f=>({...f,description:e.target.value}))} placeholder="Breve descrizione..." />
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:20,
                    background: catForm.color + '20', color: catForm.color, border:`1px solid ${catForm.color}44` }}>
                    {catForm.emoji} {catForm.name || 'Anteprima'}
                  </span>
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  {editCatId && (
                    <button onClick={() => { setEditCatId(null); setCatForm({ name:'', emoji:'📚', color:'#F26522', description:'' }); }}
                      style={{ padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:600, border:'1px solid var(--border)', background:'none', color:'var(--text-3)', cursor:'pointer' }}>
                      Annulla modifica
                    </button>
                  )}
                  <button onClick={saveCategory} disabled={!catForm.name.trim()} style={{
                    flex:1, padding:'8px', borderRadius:8, fontSize:14, fontWeight:700, border:'none',
                    cursor:catForm.name.trim()?'pointer':'not-allowed',
                    background:catForm.name.trim()?'var(--brand)':'var(--surface3)',
                    color:catForm.name.trim()?'white':'var(--text-3)',
                  }}>
                    {editCatId ? 'Salva modifiche' : '+ Aggiungi categoria'}
                  </button>
                </div>
              </div>

              {/* Lista categorie */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {categories.sort((a,b)=>a.order-b.order).map(cat => {
                  const count = courses.filter(c => c.category === cat.name).length;
                  return (
                    <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:cat.color, flexShrink:0 }} />
                      <span style={{ fontSize:16 }}>{cat.emoji}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>{cat.name}</p>
                        {cat.description && <p style={{ fontSize:12, color:'var(--text-3)' }}>{cat.description}</p>}
                      </div>
                      <span style={{ fontSize:12, color:'var(--text-3)', padding:'2px 8px', borderRadius:20, background:'var(--surface3)' }}>{count} corsi</span>
                      <button onClick={() => startEditCat(cat)} style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text-3)', cursor:'pointer' }}>✏️</button>
                      {count === 0 && (
                        <button onClick={() => deleteCategory(cat.id)} style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(248,113,113,0.3)', background:'none', color:'#f87171', cursor:'pointer' }}>🗑</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal nuovo corso ── */}
      {modal === 'new-course' && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setModal(null)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>🎓 Nuovo Corso</h2>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { label:'Titolo *', key:'title', full:true, placeholder:'Es. Marketing Digitale 2026' },
                  { label:'Sottotitolo', key:'subtitle', full:true, placeholder:'Es. Corso avanzato per PMI' },
                ].map(({ label, key, full, placeholder }) => (
                  <div key={key} style={{ gridColumn:full?'1/-1':'auto', display:'flex', flexDirection:'column', gap:5 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
                    <input style={inputStyle} value={(form as Record<string,string>)[key]} onChange={e => setF(key, e.target.value)} placeholder={placeholder} />
                  </div>
                ))}
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Categoria</label>
                  <select style={{ ...inputStyle, cursor:'pointer' }} value={form.category} onChange={e => setF('category', e.target.value)}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Piattaforma</label>
                  <input style={inputStyle} value={form.platform} onChange={e => setF('platform', e.target.value)} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Docente</label>
                  <input style={inputStyle} value={form.instructor} onChange={e => setF('instructor', e.target.value)} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Stato</label>
                  <select style={{ ...inputStyle, cursor:'pointer' }} value={form.status} onChange={e => setF('status', e.target.value)}>
                    {(['Bozza','Attivo','Completato','Archiviato'] as CourseStatus[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Location</label>
                  <input style={inputStyle} value={form.location} onChange={e => setF('location', e.target.value)} placeholder="Online / Milano..." />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Data inizio</label>
                  <input style={inputStyle} type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Data fine</label>
                  <input style={inputStyle} type="date" value={form.endDate} onChange={e => setF('endDate', e.target.value)} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Max partecipanti</label>
                  <input style={inputStyle} type="number" value={form.maxParticipants} onChange={e => setF('maxParticipants', e.target.value)} placeholder="Es. 20" />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Prezzo €</label>
                  <input style={inputStyle} type="number" value={form.price} onChange={e => setF('price', e.target.value)} placeholder="0" />
                </div>
                <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cartella Drive</label>
                  <input style={inputStyle} value={form.driveLink} onChange={e => setF('driveLink', e.target.value)} placeholder="https://drive.google.com/..." />
                </div>
                <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Descrizione</label>
                  <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }} value={form.description} onChange={e => setF('description', e.target.value)} />
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button onClick={() => setModal(null)} style={{ padding:'9px 18px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>Annulla</button>
              <button onClick={handleCreate} disabled={!form.title.trim()} style={{
                flex:1, padding:'9px', borderRadius:9, fontSize:15, fontWeight:700, border:'none',
                cursor:form.title.trim()?'pointer':'not-allowed',
                background:form.title.trim()?'var(--brand)':'var(--surface3)',
                color:form.title.trim()?'white':'var(--text-3)',
              }}>
                🎓 Crea corso
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
