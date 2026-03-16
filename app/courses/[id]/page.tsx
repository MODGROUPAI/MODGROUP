'use client';
import { GEMINI_MODEL } from '@/lib/gemini';
import { getApiKey } from '@/lib/aiProvider';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import type { Course, CourseModule, CourseParticipant, ModuleStatus, ParticipantStatus, NotebookArtifact, NotebookArtifactType } from '@/lib/types';

const MODULE_STATUS: ModuleStatus[] = ['Da preparare','In preparazione','Pronto','Erogato'];
const PARTICIPANT_STATUS: ParticipantStatus[] = ['Iscritto','Presente','Assente','Completato','Ritirato'];

const MOD_COLOR: Record<ModuleStatus, string> = {
  'Da preparare':   'var(--text-3)',
  'In preparazione':'#fbbf24',
  'Pronto':         '#4ade80',
  'Erogato':        '#60a5fa',
};

const PART_COLOR: Record<ParticipantStatus, string> = {
  'Iscritto':   'var(--text-3)',
  'Presente':   '#4ade80',
  'Assente':    '#f87171',
  'Completato': '#60a5fa',
  'Ritirato':   '#f87171',
};

function genId(p: string) { return `${p}${Date.now().toString(36).toUpperCase()}`; }

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};

type Tab = 'moduli' | 'partecipanti' | 'info';

export default function CourseDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { data, update } = useData();
  const today    = localDateISO();

  const courses  = data.courses ?? [];
  const course   = courses.find(c => c.id === id);

  const [tab, setTab]               = useState<Tab>('moduli');
  const [moduleModal, setModuleModal] = useState<CourseModule | null | 'new'>(null);
  const [partModal, setPartModal]   = useState<CourseParticipant | null | 'new'>(null);
  const [modForm, setModForm]       = useState<Partial<CourseModule>>({});
  const [partForm, setPartForm]     = useState<Partial<CourseParticipant>>({});
  const [genLoading, setGenLoading] = useState(false);
  const [certLoading, setCertLoading] = useState<string | null>(null);

  if (!course) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
      <p style={{ fontSize:48, marginBottom:12 }}>🎓</p>
      <p>Corso non trovato</p>
      <button onClick={() => router.push('/courses')} style={{ marginTop:16, color:'var(--brand)', background:'none', border:'none', cursor:'pointer' }}>← Torna ai corsi</button>
    </div>
  );

  const saveCourse = (updated: Course) => {
    update({ courses: courses.map(c => c.id === id ? { ...updated, updatedAt: today } : c) });
  };

  // ── Moduli ────────────────────────────────────────────────────────────────

  const openNewModule = () => {
    setModForm({ order: course.modules.length + 1, status: 'Da preparare', title: '' });
    setModuleModal('new');
  };

  const openEditModule = (m: CourseModule) => {
    setModForm({ ...m });
    setModuleModal(m);
  };

  const saveModule = () => {
    if (!modForm.title) return;
    const newMod: CourseModule = {
      id:          (moduleModal !== 'new' && moduleModal) ? moduleModal.id : genId('MOD'),
      order:       modForm.order ?? course.modules.length + 1,
      title:       modForm.title,
      description: modForm.description,
      duration:    modForm.duration,
      status:      modForm.status ?? 'Da preparare',
      driveLink:   modForm.driveLink,
      videoLink:   modForm.videoLink,
      notes:       modForm.notes,
      deliveredAt: modForm.deliveredAt,
    };
    const modules = moduleModal !== 'new' && moduleModal
      ? course.modules.map(m => m.id === moduleModal.id ? newMod : m)
      : [...course.modules, newMod].sort((a, b) => a.order - b.order);
    saveCourse({ ...course, modules });
    setModuleModal(null);
  };

  const deleteModule = (modId: string) => {
    if (!confirm('Eliminare questo modulo?')) return;
    saveCourse({ ...course, modules: course.modules.filter(m => m.id !== modId) });
  };

  const updateModuleStatus = (modId: string, status: ModuleStatus) => {
    const modules = course.modules.map(m => m.id === modId ? { ...m, status, deliveredAt: status === 'Erogato' ? today : m.deliveredAt } : m);
    saveCourse({ ...course, modules });
  };

  // ── Partecipanti ──────────────────────────────────────────────────────────

  const openNewPart = () => {
    setPartForm({ status: 'Iscritto', enrolledAt: today, completedModules: [] });
    setPartModal('new');
  };

  const openEditPart = (p: CourseParticipant) => {
    setPartForm({ ...p });
    setPartModal(p);
  };

  const savePart = () => {
    if (!partForm.name) return;
    const newPart: CourseParticipant = {
      id:               (partModal !== 'new' && partModal) ? partModal.id : genId('PAR'),
      name:             partForm.name,
      email:            partForm.email,
      company:          partForm.company,
      role:             partForm.role,
      enrolledAt:       partForm.enrolledAt ?? today,
      status:           partForm.status ?? 'Iscritto',
      completedModules: partForm.completedModules ?? [],
      certificateIssued:partForm.certificateIssued,
      certificateDate:  partForm.certificateDate,
      notes:            partForm.notes,
    };
    const participants = partModal !== 'new' && partModal
      ? course.participants.map(p => p.id === partModal.id ? newPart : p)
      : [...course.participants, newPart];
    saveCourse({ ...course, participants });
    setPartModal(null);
  };

  const deletePart = (partId: string) => {
    if (!confirm('Rimuovere questo partecipante?')) return;
    saveCourse({ ...course, participants: course.participants.filter(p => p.id !== partId) });
  };

  const toggleModuleComplete = (partId: string, modId: string) => {
    const participants = course.participants.map(p => {
      if (p.id !== partId) return p;
      const has = p.completedModules.includes(modId);
      const completedModules = has ? p.completedModules.filter(m => m !== modId) : [...p.completedModules, modId];
      const allDone = completedModules.length === course.modules.length;
      return { ...p, completedModules, status: (allDone ? 'Completato' : p.status) as ParticipantStatus };
    });
    saveCourse({ ...course, participants });
  };

  const issueCertificate = (partId: string) => {
    const participants = course.participants.map(p =>
      p.id === partId ? { ...p, certificateIssued: true, certificateDate: today, status: 'Completato' as ParticipantStatus } : p
    );
    saveCourse({ ...course, participants });
  };

  // ── Genera moduli con AI ───────────────────────────────────────────────────

  const generateModules = useCallback(async () => {
    setGenLoading(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts:[{ text:'Sei un instructional designer esperto. Rispondi SOLO con JSON valido, senza markdown.' }] },
          contents: [{ role:'user', parts:[{ text:'Crea la struttura modulare per questo corso: Titolo: ' + course.title + ' Categoria: ' + course.category + ' Docente: ' + course.instructor + (course.description ? ' Descrizione: ' + course.description : '') + '. Genera 6-10 moduli logici e progressivi. Rispondi SOLO con JSON: {"modules":[{"order":1,"title":"Titolo modulo","description":"Obiettivi in 2 righe","duration":90}]}' }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
        }),
      });
      const json = await res.json();
      const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? json.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
      const s = text.indexOf('{'); const e = text.lastIndexOf('}');
      const parsed = JSON.parse(text.slice(s, e + 1));
      if (parsed.modules?.length) {
        const newModules: CourseModule[] = parsed.modules.map((m: { order: number; title: string; description?: string; duration?: number }) => ({
          id: genId('MOD'),
          order: m.order,
          title: m.title,
          description: m.description,
          duration: m.duration,
          status: 'Da preparare' as ModuleStatus,
        }));
        saveCourse({ ...course, modules: newModules });
      }
    } catch (err) { console.error(err); }
    finally { setGenLoading(false); }
  }, [course]);

  // ── Genera certificato ────────────────────────────────────────────────────

  const printCertificate = (part: CourseParticipant) => {
    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Certificato — ${part.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;background:#fff;color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px}
.cert{border:3px solid #F26522;border-radius:16px;padding:60px 70px;max-width:750px;width:100%;text-align:center;position:relative}
.cert::before{content:'';position:absolute;inset:8px;border:1px solid rgba(242,101,34,0.3);border-radius:12px;pointer-events:none}
.logo{font-size:14pt;font-weight:800;color:#1a1a1a;letter-spacing:2px;margin-bottom:6px}
.logo span{color:#F26522}
.platform{font-size:10pt;color:#888;margin-bottom:32px;text-transform:uppercase;letter-spacing:3px}
.certifies{font-size:11pt;color:#888;margin-bottom:8px}
.name{font-size:28pt;font-weight:700;color:#1a1a1a;margin-bottom:24px;border-bottom:2px solid #F26522;padding-bottom:16px;display:inline-block}
.completed{font-size:11pt;color:#888;margin-bottom:8px}
.course{font-size:18pt;font-weight:700;color:#F26522;margin-bottom:8px}
.subtitle{font-size:11pt;color:#888;margin-bottom:32px}
.meta{display:flex;justify-content:center;gap:60px;margin-bottom:40px;font-size:10pt;color:#888}
.meta strong{display:block;color:#1a1a1a;font-size:11pt;margin-top:4px}
.signatures{display:flex;justify-content:center;gap:80px;margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb}
.sig{text-align:center}
.sig-line{width:160px;border-bottom:1px solid #1a1a1a;margin:0 auto 8px}
.sig-name{font-size:10pt;font-weight:700}
.sig-role{font-size:9pt;color:#888}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="cert">
  <div class="logo">MOD<span>.</span>Group</div>
  <div class="platform">${course.platform}</div>
  <div class="certifies">Certifica che</div>
  <div><span class="name">${part.name}</span></div>
  <div class="completed">ha completato con successo il corso</div>
  <div class="course">${course.title}</div>
  ${course.subtitle ? `<div class="subtitle">${course.subtitle}</div>` : ''}
  <div class="meta">
    <div>Durata<strong>${course.modules.length} moduli</strong></div>
    <div>Data<strong>${part.certificateDate || today}</strong></div>
    <div>Docente<strong>${course.instructor}</strong></div>
  </div>
  <div class="signatures">
    <div class="sig"><div class="sig-line"></div><div class="sig-name">${course.instructor}</div><div class="sig-role">Docente</div></div>
    <div class="sig"><div class="sig-line"></div><div class="sig-name">MOD Group</div><div class="sig-role">Remodel</div></div>
  </div>
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`);
    win.document.close();
  };

  // ── Genera prompt NotebookLM ─────────────────────────────────────────────

  const [nbModal, setNbModal]     = useState<CourseModule | null>(null);
  const [nbPrompt, setNbPrompt]   = useState('');
  const [nbCopied, setNbCopied]   = useState(false);
  const [nbLoading, setNbLoading] = useState(false);

  const generateNotebookPrompt = async (mod: CourseModule) => {
    setNbModal(mod);
    setNbPrompt('');
    setNbCopied(false);
    setNbLoading(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts:[{ text:'Sei un instructional designer esperto. Genera prompt precisi e ottimizzati per NotebookLM. Rispondi SOLO con il prompt, nessun preamble.' }] },
          contents: [{ role:'user', parts:[{ text:
            'Genera un prompt ottimizzato per NotebookLM per trovare le migliori fonti e creare il contenuto di questo modulo didattico.' +
            '\n\nCORSO: ' + course.title +
            '\nMODULO: ' + mod.title + ' (modulo ' + mod.order + ' di ' + course.modules.length + ')' +
            '\nDOCENTE: ' + course.instructor +
            '\nDESCRIZIONE: ' + (mod.description || 'non specificata') +
            '\nDURATA: ' + (mod.duration ? mod.duration + ' minuti' : 'non specificata') +
            '\n\nIl prompt deve:' +
            '\n1. Indicare le FONTI da cercare (libri, articoli, siti autorevoli specifici per il tema)' +
            '\n2. Specificare le DOMANDE GUIDA per strutturare il contenuto' +
            '\n3. Definire il LIVELLO del pubblico (imprenditori e PMI italiani)' +
            '\n4. Indicare il FORMATO dell output desiderato (slide, dispensa, esercizi)' +
            '\n5. Suggerire ESEMPI PRATICI da includere nel modulo' +
            '\n\nScrivi il prompt in italiano, diretto e specifico.'
          }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
        }),
      });
      const json = await res.json();
      setNbPrompt(json.candidates?.[0]?.content?.parts?.[0]?.text ?? json.content?.[0]?.text ?? 'Errore nella generazione.');
    } catch { setNbPrompt('Errore di connessione. Riprova.'); }
    finally { setNbLoading(false); }
  };

  const copyAndOpenNotebook = () => {
    navigator.clipboard.writeText(nbPrompt);
    setNbCopied(true);
    setTimeout(() => window.open('https://notebooklm.google.com', '_blank'), 400);
  };

  const saveNotebookLink = (modId: string, link: string) => {
    const modules = course.modules.map(m => m.id === modId ? { ...m, notebookLink: link } : m);
    saveCourse({ ...course, modules });
  };

  // ── Artefatti NotebookLM ────────────────────────────────────────────────────

  const ARTIFACT_TYPES: { type: NotebookArtifactType; icon: string; label: string; desc: string }[] = [
    { type:'audio_overview', icon:'🎙️', label:'Audio Overview', desc:'Podcast del modulo' },
    { type:'video_overview', icon:'🎬', label:'Video Overview', desc:'Video riassuntivo' },
    { type:'mind_map',       icon:'🧠', label:'Mind Map',       desc:'Mappa concettuale' },
    { type:'report',         icon:'📄', label:'Report',         desc:'Documento approfondito' },
    { type:'flashcard',      icon:'🃏', label:'Flashcard',      desc:'Schede memorizzazione' },
    { type:'quiz',           icon:'❓', label:'Quiz',           desc:'Test di verifica' },
    { type:'infographic',    icon:'📊', label:'Infographic',    desc:'Visual sintetico' },
    { type:'slide_deck',     icon:'🖥️', label:'Slide Deck',     desc:'Presentazione' },
    { type:'data_table',     icon:'📋', label:'Data Table',     desc:'Tabella strutturata' },
    { type:'study_guide',    icon:'📚', label:'Study Guide',    desc:'Guida allo studio' },
    { type:'faq',            icon:'💬', label:'FAQ',            desc:'Domande frequenti' },
    { type:'timeline',       icon:'⏱️', label:'Timeline',       desc:'Cronologia argomenti' },
  ];

  const [artifactsModal, setArtifactsModal] = useState<CourseModule | null>(null);
  const [newArtifact, setNewArtifact]       = useState<{ type: NotebookArtifactType; link: string; driveLink: string; notes: string }>({ type:'audio_overview', link:'', driveLink:'', notes:'' });

  const saveArtifact = () => {
    if (!artifactsModal || !newArtifact.link.trim()) return;
    const artType = ARTIFACT_TYPES.find(a => a.type === newArtifact.type)!;
    const artifact: NotebookArtifact = {
      id:        `ART${Date.now().toString(36).toUpperCase()}`,
      type:      newArtifact.type,
      label:     artType.label,
      link:      newArtifact.link,
      driveLink: newArtifact.driveLink || undefined,
      createdAt: today,
      notes:     newArtifact.notes || undefined,
    };
    const modules = course.modules.map(m => m.id === artifactsModal.id
      ? { ...m, artifacts: [...(m.artifacts ?? []), artifact] }
      : m
    );
    saveCourse({ ...course, modules });
    setNewArtifact({ type:'audio_overview', link:'', driveLink:'', notes:'' });
  };

  const deleteArtifact = (modId: string, artId: string) => {
    const modules = course.modules.map(m => m.id === modId
      ? { ...m, artifacts: (m.artifacts ?? []).filter(a => a.id !== artId) }
      : m
    );
    saveCourse({ ...course, modules });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const completedModules  = course.modules.filter(m => m.status === 'Erogato').length;
  const completedParts    = course.participants.filter(p => p.status === 'Completato').length;
  const totalDuration     = course.modules.reduce((s, m) => s + (m.duration ?? 0), 0);

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <button onClick={() => router.push('/courses')} style={{ fontSize:14, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', marginBottom:12 }}>
          ← Tutti i corsi
        </button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'var(--surface2)', color:'var(--text-2)', border:'1px solid var(--border)' }}>
                {course.platform}
              </span>
              {course.category && <span style={{ fontSize:13, color:'var(--text-3)' }}>{course.category}</span>}
              <span style={{ fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(74,222,128,0.1)', color:'#4ade80' }}>
                {course.status}
              </span>
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:28, color:'var(--text-1)', marginBottom:4 }}>{course.title}</h1>
            {course.subtitle && <p style={{ fontSize:15, color:'var(--text-3)', marginBottom:6 }}>{course.subtitle}</p>}
            <div style={{ display:'flex', gap:16, fontSize:14, color:'var(--text-3)' }}>
              <span>👤 {course.instructor}</span>
              {course.coInstructors?.length && <span>+ {course.coInstructors.join(', ')}</span>}
              <span>📍 {course.location || 'Online'}</span>
              {course.startDate && <span>📅 {course.startDate}{course.endDate ? ' → ' + course.endDate : ''}</span>}
              {totalDuration > 0 && <span>⏱ {Math.floor(totalDuration/60)}h {totalDuration%60>0 ? totalDuration%60+'min' : ''}</span>}
            </div>
          </div>
          {course.driveLink && (
            <a href={course.driveLink} target="_blank" rel="noopener noreferrer"
              style={{ padding:'8px 16px', borderRadius:10, fontSize:14, fontWeight:600, border:'1px solid rgba(74,222,128,0.4)', color:'#4ade80', background:'rgba(74,222,128,0.06)', textDecoration:'none' }}>
              📁 Materiali Drive
            </a>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
        {[
          { label:'Moduli',       val:`${completedModules}/${course.modules.length}`, sub:'erogati', color:'var(--brand)' },
          { label:'Partecipanti', val:course.participants.length, sub:`${course.maxParticipants ? '/ '+course.maxParticipants+' max' : 'iscritti'}`, color:'#60a5fa' },
          { label:'Completati',   val:completedParts, sub:'partecipanti', color:'#4ade80' },
          { label:'Certificati',  val:course.participants.filter(p=>p.certificateIssued).length, sub:'emessi', color:'#fbbf24' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{k.label}</p>
            <p style={{ fontSize:24, fontWeight:800, color:k.color, fontFamily:"'Cormorant Garamond',serif" }}>{k.val}</p>
            <p style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--surface2)', borderRadius:10, padding:4, width:'fit-content', marginBottom:24 }}>
        {(['moduli','partecipanti','info'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer',
            background: tab === t ? 'var(--brand)' : 'transparent',
            color: tab === t ? 'white' : 'var(--text-3)',
            fontWeight:600, fontSize:14, textTransform:'capitalize',
          }}>
            {t === 'moduli' ? `📚 Moduli (${course.modules.length})` : t === 'partecipanti' ? `👥 Partecipanti (${course.participants.length})` : 'ℹ️ Info'}
          </button>
        ))}
      </div>

      {/* ── TAB MODULI ── */}
      {tab === 'moduli' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <button onClick={openNewModule} style={{ padding:'8px 18px', borderRadius:10, fontSize:14, fontWeight:700, border:'none', background:'var(--brand)', color:'white', cursor:'pointer' }}>
              + Aggiungi modulo
            </button>
            <button
              onClick={() => router.push(`/courses/canva?courseId=${course.id}`)}
              style={{ padding:'8px 16px', borderRadius:10, fontSize:14, fontWeight:600, border:'1px solid rgba(242,101,34,0.4)', background:'rgba(242,101,34,0.06)', color:'var(--brand)', cursor:'pointer' }}>
              🎨 Canva
            </button>
          {course.modules.length === 0 && (
              <button onClick={generateModules} disabled={genLoading} style={{ padding:'8px 18px', borderRadius:10, fontSize:14, fontWeight:600, border:'1px solid rgba(242,101,34,0.4)', background:'rgba(242,101,34,0.06)', color:'var(--brand)', cursor:genLoading?'wait':'pointer' }}>
                {genLoading ? '⏳ Generando...' : '✨ Genera struttura con AI'}
              </button>
            )}
          </div>

          {course.modules.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px', color:'var(--text-3)' }}>
              <p style={{ fontSize:36, marginBottom:12 }}>📚</p>
              <p style={{ fontSize:16, marginBottom:8 }}>Nessun modulo ancora</p>
              <p style={{ fontSize:14 }}>Aggiungi moduli manualmente o genera la struttura con AI</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...course.modules].sort((a,b) => a.order - b.order).map(mod => (
                <div key={mod.id} style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'var(--brand)', flexShrink:0 }}>
                      {mod.order}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>{mod.title}</p>
                        {mod.duration && <span style={{ fontSize:12, color:'var(--text-3)' }}>⏱ {mod.duration}min</span>}
                      </div>
                      {mod.description && <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.5, marginBottom:6 }}>{mod.description}</p>}
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <select value={mod.status} onChange={e => updateModuleStatus(mod.id, e.target.value as ModuleStatus)}
                          style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:20, border:'none', cursor:'pointer',
                            background:'var(--surface2)', color:MOD_COLOR[mod.status] }}>
                          {MODULE_STATUS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        {mod.driveLink && <a href={mod.driveLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#4ade80', textDecoration:'none' }}>📁 Materiali</a>}
                        {mod.videoLink && <a href={mod.videoLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#60a5fa', textDecoration:'none' }}>▶️ Video</a>}
                        {mod.notebookLink && <a href={mod.notebookLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#a78bfa', textDecoration:'none' }}>📓 Notebook</a>}
                        {(mod.artifacts?.length ?? 0) > 0 && (
                          <button onClick={() => setArtifactsModal(mod)} style={{ fontSize:12, color:'#a78bfa', background:'none', border:'none', cursor:'pointer', padding:0, textDecoration:'underline' }}>
                            📦 {mod.artifacts!.length} artefatti
                          </button>
                        )}
                        {mod.deliveredAt && <span style={{ fontSize:12, color:'var(--text-3)' }}>Erogato: {mod.deliveredAt}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => generateNotebookPrompt(mod)}
                        title="Genera prompt per NotebookLM"
                        style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(96,165,250,0.3)', background:'rgba(96,165,250,0.06)', color:'#60a5fa', cursor:'pointer' }}>
                        📓
                      </button>
                      <button
                        onClick={() => router.push(`/courses/canva?courseId=${course.id}&moduleId=${mod.id}`)}
                        title="Genera grafiche Canva per questo modulo"
                        style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(242,101,34,0.3)', background:'rgba(242,101,34,0.06)', color:'var(--brand)', cursor:'pointer' }}>
                        🎨
                      </button>
                      <button onClick={() => setArtifactsModal(mod)}
                        title="Artefatti NotebookLM"
                        style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(167,139,250,0.3)', background:'rgba(167,139,250,0.06)', color:'#a78bfa', cursor:'pointer', position:'relative' }}>
                        📦{(mod.artifacts?.length ?? 0) > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:14, height:14, borderRadius:7, background:'#a78bfa', color:'white', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{mod.artifacts!.length}</span>}
                      </button>
                      <button onClick={() => openEditModule(mod)} style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid var(--border2)', background:'none', color:'var(--text-3)', cursor:'pointer' }}>✏️</button>
                      <button onClick={() => deleteModule(mod.id)} style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(248,113,113,0.3)', background:'none', color:'#f87171', cursor:'pointer' }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB PARTECIPANTI ── */}
      {tab === 'partecipanti' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:14, color:'var(--text-3)' }}>{course.participants.length} partecipanti · {completedParts} completati</p>
            <button onClick={openNewPart} style={{ padding:'8px 18px', borderRadius:10, fontSize:14, fontWeight:700, border:'none', background:'var(--brand)', color:'white', cursor:'pointer' }}>
              + Aggiungi partecipante
            </button>
          </div>

          {course.participants.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px', color:'var(--text-3)' }}>
              <p style={{ fontSize:36, marginBottom:12 }}>👥</p>
              <p style={{ fontSize:16 }}>Nessun partecipante ancora</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {course.participants.map(part => {
                const pct = course.modules.length > 0 ? Math.round((part.completedModules.length / course.modules.length) * 100) : 0;
                return (
                  <div key={part.id} style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'14px 18px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:'rgba(242,101,34,0.1)', border:'1px solid rgba(242,101,34,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'var(--brand)', flexShrink:0 }}>
                        {part.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>{part.name}</p>
                          <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'var(--surface2)', color:PART_COLOR[part.status] }}>
                            {part.status}
                          </span>
                          {part.certificateIssued && <span style={{ fontSize:12, color:'#fbbf24' }}>🏆 Certificato</span>}
                        </div>
                        <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:8 }}>
                          {[part.company, part.role, part.email].filter(Boolean).join(' · ')}
                        </p>
                        {course.modules.length > 0 && (
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:12, color:'var(--text-3)' }}>Progressione</span>
                              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{part.completedModules.length}/{course.modules.length} ({pct}%)</span>
                            </div>
                            <div style={{ height:5, borderRadius:3, background:'var(--surface2)', overflow:'hidden', marginBottom:6 }}>
                              <div style={{ height:'100%', width:`${pct}%`, background: pct === 100 ? '#4ade80' : 'var(--brand)', borderRadius:3 }} />
                            </div>
                            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                              {[...course.modules].sort((a,b)=>a.order-b.order).map(m => (
                                <button key={m.id} onClick={() => toggleModuleComplete(part.id, m.id)}
                                  style={{ fontSize:11, padding:'2px 7px', borderRadius:20, cursor:'pointer', transition:'all 150ms',
                                    background: part.completedModules.includes(m.id) ? 'rgba(74,222,128,0.15)' : 'var(--surface2)',
                                    color: part.completedModules.includes(m.id) ? '#4ade80' : 'var(--text-3)',
                                    border: `1px solid ${part.completedModules.includes(m.id) ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                                  }}>
                                  {m.order}. {m.title.slice(0,20)}{m.title.length>20?'...':''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {!part.certificateIssued && part.completedModules.length === course.modules.length && course.modules.length > 0 && (
                          <button onClick={() => issueCertificate(part.id)} style={{ fontSize:12, padding:'5px 10px', borderRadius:8, border:'1px solid rgba(251,191,36,0.4)', background:'rgba(251,191,36,0.08)', color:'#fbbf24', cursor:'pointer' }}>
                            🏆 Emetti
                          </button>
                        )}
                        {part.certificateIssued && (
                          <button onClick={() => printCertificate(part)} style={{ fontSize:12, padding:'5px 10px', borderRadius:8, border:'1px solid rgba(251,191,36,0.4)', background:'rgba(251,191,36,0.08)', color:'#fbbf24', cursor:'pointer' }}>
                            🖨️ Certificato
                          </button>
                        )}
                        <button onClick={() => openEditPart(part)} style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid var(--border2)', background:'none', color:'var(--text-3)', cursor:'pointer' }}>✏️</button>
                        <button onClick={() => deletePart(part.id)} style={{ fontSize:13, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(248,113,113,0.3)', background:'none', color:'#f87171', cursor:'pointer' }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB INFO ── */}
      {tab === 'info' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { label:'Piattaforma', val:course.platform },
            { label:'Categoria', val:course.category },
            { label:'Docente', val:course.instructor },
            { label:'Co-docenti', val:course.coInstructors?.join(', ') },
            { label:'Location', val:course.location },
            { label:'Prezzo', val:course.price ? '€'+course.price.toLocaleString('it-IT') : undefined },
            { label:'Data inizio', val:course.startDate },
            { label:'Data fine', val:course.endDate },
            { label:'Max partecipanti', val:course.maxParticipants?.toString() },
            { label:'Creato il', val:course.createdAt },
          ].filter(f => f.val).map(f => (
            <div key={f.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{f.label}</p>
              <p style={{ fontSize:15, color:'var(--text-1)' }}>{f.val}</p>
            </div>
          ))}
          {course.description && (
            <div style={{ gridColumn:'1/-1', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Descrizione</p>
              <p style={{ fontSize:15, color:'var(--text-1)', lineHeight:1.6 }}>{course.description}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Artefatti NotebookLM ── */}
      {artifactsModal !== null && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:600 }} onClick={() => setArtifactsModal(null)} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:601, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto',
            background:'var(--surface)', border:'1px solid var(--border2)',
            borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
          }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
              <div>
                <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)', marginBottom:3 }}>📦 Artefatti NotebookLM</h3>
                <p style={{ fontSize:13, color:'var(--text-3)' }}>{artifactsModal.title} · {(artifactsModal.artifacts?.length ?? 0)} artefatti salvati</p>
              </div>
              <button onClick={() => setArtifactsModal(null)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>

            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Artefatti esistenti */}
              {(artifactsModal.artifacts?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Artefatti salvati</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {artifactsModal.artifacts!.map(art => {
                      const artDef = ARTIFACT_TYPES.find(a => a.type === art.type);
                      return (
                        <div key={art.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                          <span style={{ fontSize:18, flexShrink:0 }}>{artDef?.icon ?? '📄'}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>{art.label}</p>
                            {art.notes && <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{art.notes}</p>}
                            <p style={{ fontSize:12, color:'var(--text-3)' }}>Aggiunto il {art.createdAt}</p>
                          </div>
                          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                            <a href={art.link} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(167,139,250,0.4)', background:'rgba(167,139,250,0.06)', color:'#a78bfa', textDecoration:'none' }}>
                              Apri
                            </a>
                            {art.driveLink && (
                              <a href={art.driveLink} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(74,222,128,0.4)', background:'rgba(74,222,128,0.06)', color:'#4ade80', textDecoration:'none' }}>
                                📁
                              </a>
                            )}
                            <button onClick={() => deleteArtifact(artifactsModal.id, art.id)}
                              style={{ fontSize:12, padding:'4px 8px', borderRadius:7, border:'1px solid rgba(248,113,113,0.3)', background:'none', color:'#f87171', cursor:'pointer' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aggiungi nuovo artefatto */}
              <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>+ Aggiungi artefatto</p>

                {/* Selezione tipo — griglia icone */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
                  {ARTIFACT_TYPES.map(a => (
                    <button key={a.type} onClick={() => setNewArtifact(n => ({ ...n, type:a.type }))}
                      title={a.desc}
                      style={{
                        padding:'8px 4px', borderRadius:8, border:`1px solid ${newArtifact.type===a.type?'rgba(167,139,250,0.5)':'var(--border)'}`,
                        background: newArtifact.type===a.type?'rgba(167,139,250,0.1)':'transparent',
                        cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all 150ms',
                      }}>
                      <span style={{ fontSize:18 }}>{a.icon}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:newArtifact.type===a.type?'#a78bfa':'var(--text-3)', textAlign:'center', lineHeight:1.2 }}>{a.label}</span>
                    </button>
                  ))}
                </div>

                {/* Link e dettagli */}
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Link NotebookLM *</label>
                    <input value={newArtifact.link} onChange={e => setNewArtifact(n=>({...n,link:e.target.value}))}
                      placeholder="https://notebooklm.google.com/notebook/..."
                      style={{ padding:'8px 12px', borderRadius:8, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text-1)', outline:'none' }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Link Drive (copia salvata, opzionale)</label>
                    <input value={newArtifact.driveLink} onChange={e => setNewArtifact(n=>({...n,driveLink:e.target.value}))}
                      placeholder="https://drive.google.com/..."
                      style={{ padding:'8px 12px', borderRadius:8, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text-1)', outline:'none' }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Note</label>
                    <input value={newArtifact.notes} onChange={e => setNewArtifact(n=>({...n,notes:e.target.value}))}
                      placeholder="Es. versione in italiano, 12 min..."
                      style={{ padding:'8px 12px', borderRadius:8, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text-1)', outline:'none' }} />
                  </div>
                  <button onClick={saveArtifact} disabled={!newArtifact.link.trim()}
                    style={{ padding:'9px', borderRadius:8, fontSize:14, fontWeight:700, border:'none',
                      cursor:newArtifact.link.trim()?'pointer':'not-allowed',
                      background:newArtifact.link.trim()?'#a78bfa':'var(--surface3)',
                      color:newArtifact.link.trim()?'white':'var(--text-3)', marginTop:4 }}>
                    + Salva artefatto
                  </button>
                </div>
              </div>

              {/* Quick link NotebookLM */}
              <div style={{ display:'flex', justifyContent:'center' }}>
                <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:14, color:'#60a5fa', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                  📓 Apri NotebookLM →
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal NotebookLM ── */}
      {nbModal !== null && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:600 }} onClick={() => setNbModal(null)} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:601, width:'100%', maxWidth:560, maxHeight:'88vh', overflowY:'auto',
            background:'var(--surface)', border:'1px solid var(--border2)',
            borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
          }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
              <div>
                <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)', marginBottom:3 }}>📓 NotebookLM — Prompt fonti</h3>
                <p style={{ fontSize:13, color:'var(--text-3)' }}>{nbModal.title}</p>
              </div>
              <button onClick={() => setNbModal(null)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>

            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>

              {/* Istruzioni flusso */}
              <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#60a5fa', marginBottom:6 }}>📋 Flusso di lavoro</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {['1. Copia il prompt generato','2. Apri NotebookLM (bottone sotto)','3. Incolla il prompt e aggiungi le fonti','4. Salva il link del notebook nel modulo'].map((step,i)=>(
                    <p key={i} style={{ fontSize:13, color:'var(--text-2)' }}>{step}</p>
                  ))}
                </div>
              </div>

              {/* Prompt generato */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>Prompt per NotebookLM</label>
                {nbLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'16px', background:'var(--surface2)', borderRadius:10 }}>
                    {[85,60,75,50,80].map((w,i)=><div key={i} style={{ height:11, borderRadius:5, background:'var(--surface3)', width:`${w}%` }} />)}
                  </div>
                ) : (
                  <textarea
                    value={nbPrompt}
                    onChange={e => setNbPrompt(e.target.value)}
                    style={{ width:'100%', minHeight:220, padding:'14px', borderRadius:10, fontSize:14, lineHeight:1.7, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', resize:'vertical', fontFamily:'inherit', outline:'none' }}
                  />
                )}
              </div>

              {/* Salva link notebook */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>Link NotebookLM (dopo averlo creato)</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    defaultValue={nbModal.notebookLink ?? ''}
                    placeholder="https://notebooklm.google.com/notebook/..."
                    onBlur={e => e.target.value && saveNotebookLink(nbModal.id, e.target.value)}
                    style={{ flex:1, padding:'9px 13px', borderRadius:9, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', outline:'none' }}
                  />
                  {nbModal.notebookLink && (
                    <a href={nbModal.notebookLink} target="_blank" rel="noopener noreferrer"
                      style={{ padding:'9px 14px', borderRadius:9, border:'1px solid rgba(167,139,250,0.4)', background:'rgba(167,139,250,0.08)', color:'#a78bfa', textDecoration:'none', fontSize:14, fontWeight:600, whiteSpace:'nowrap' }}>
                      Apri →
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Footer azioni */}
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button onClick={() => setNbModal(null)} style={{ padding:'9px 16px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>
                Chiudi
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(nbPrompt); setNbCopied(true); setTimeout(()=>setNbCopied(false),2000); }}
                disabled={!nbPrompt || nbLoading}
                style={{ padding:'9px 16px', borderRadius:9, fontSize:14, fontWeight:600, border:`1px solid ${nbCopied?'rgba(74,222,128,0.4)':'var(--border2)'}`, background:nbCopied?'rgba(74,222,128,0.1)':'none', color:nbCopied?'#4ade80':'var(--text-2)', cursor:'pointer' }}>
                {nbCopied ? '✓ Copiato!' : '📋 Copia prompt'}
              </button>
              <button
                onClick={copyAndOpenNotebook}
                disabled={!nbPrompt || nbLoading}
                style={{ flex:1, padding:'9px', borderRadius:9, fontSize:15, fontWeight:700, border:'none', cursor:nbPrompt&&!nbLoading?'pointer':'not-allowed', background:nbPrompt&&!nbLoading?'#4285f4':'var(--surface3)', color:nbPrompt&&!nbLoading?'white':'var(--text-3)' }}>
                📓 Copia + Apri NotebookLM
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal modulo ── */}
      {moduleModal !== null && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setModuleModal(null)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding:'18px 22px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)' }}>{moduleModal === 'new' ? 'Nuovo modulo' : 'Modifica modulo'}</h3>
              <button onClick={() => setModuleModal(null)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Titolo *', key:'title', type:'text', placeholder:'Es. Introduzione al Social Media Marketing' },
                { label:'Ordine', key:'order', type:'number', placeholder:'1' },
                { label:'Durata (minuti)', key:'duration', type:'number', placeholder:'90' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
                  <input style={inputStyle} type={type} value={(modForm as Record<string,unknown>)[key]?.toString() ?? ''} onChange={e => setModForm(f => ({ ...f, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Stato</label>
                <select style={{ ...inputStyle, cursor:'pointer' }} value={modForm.status ?? 'Da preparare'} onChange={e => setModForm(f => ({ ...f, status: e.target.value as ModuleStatus }))}>
                  {MODULE_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Descrizione / Obiettivi</label>
                <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }} value={modForm.description ?? ''} onChange={e => setModForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {[
                { label:'Link Drive (materiali)', key:'driveLink', placeholder:'https://drive.google.com/...' },
                { label:'Link Video lezione',  key:'videoLink',     placeholder:'https://youtube.com/...' },
                { label:'Link NotebookLM',     key:'notebookLink',  placeholder:'https://notebooklm.google.com/notebook/...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
                  <input style={inputStyle} value={(modForm as Record<string,string>)[key] ?? ''} onChange={e => setModForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button onClick={() => setModuleModal(null)} style={{ padding:'8px 16px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>Annulla</button>
              <button onClick={saveModule} disabled={!modForm.title} style={{ flex:1, padding:'8px', borderRadius:9, fontSize:14, fontWeight:700, border:'none', cursor:modForm.title?'pointer':'not-allowed', background:modForm.title?'var(--brand)':'var(--surface3)', color:modForm.title?'white':'var(--text-3)' }}>Salva modulo</button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal partecipante ── */}
      {partModal !== null && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setPartModal(null)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding:'18px 22px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-1)' }}>{partModal === 'new' ? 'Nuovo partecipante' : 'Modifica partecipante'}</h3>
              <button onClick={() => setPartModal(null)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Nome *', key:'name', placeholder:'Es. Mario Rossi' },
                { label:'Email', key:'email', placeholder:'mario@azienda.it' },
                { label:'Azienda', key:'company', placeholder:'Nome azienda' },
                { label:'Ruolo', key:'role', placeholder:'Es. Titolare, Marketing Manager...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
                  <input style={inputStyle} value={(partForm as Record<string,string>)[key] ?? ''} onChange={e => setPartForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Stato</label>
                <select style={{ ...inputStyle, cursor:'pointer' }} value={partForm.status ?? 'Iscritto'} onChange={e => setPartForm(f => ({ ...f, status: e.target.value as ParticipantStatus }))}>
                  {PARTICIPANT_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Note</label>
                <textarea style={{ ...inputStyle, minHeight:60, resize:'vertical', fontFamily:'inherit' }} value={partForm.notes ?? ''} onChange={e => setPartForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding:'12px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button onClick={() => setPartModal(null)} style={{ padding:'8px 16px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>Annulla</button>
              <button onClick={savePart} disabled={!partForm.name} style={{ flex:1, padding:'8px', borderRadius:9, fontSize:14, fontWeight:700, border:'none', cursor:partForm.name?'pointer':'not-allowed', background:partForm.name?'var(--brand)':'var(--surface3)', color:partForm.name?'white':'var(--text-3)' }}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
