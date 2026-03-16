'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAppData } from '@/lib/store';
import type { Course, CourseCategory } from '@/lib/types';

// ── Brand Re Model ─────────────────────────────────────────────────────────
// ── Palette WeAreMOD — da wearemod.com ──────────────────────────────────────
const B = {
  blue:     '#1E5EFF',  // blu elettrico WeAreMOD — primario
  blueDark: '#1245CC',  // blu scuro — hover
  blueLight:'#E8EEFF',  // blu chiaro — sfondi sezioni
  orange:   '#D4561A',  // arancione CTA — bottoni primari
  orangeHover:'#B8461A',// arancione hover
  paper:    '#F5EDE3',  // beige/crema — sfondo header
  paperDark:'#EDE0D3',  // beige scuro — sezioni alternate
  ink:      '#1A1A1A',  // nero testo
  inkLight: '#555555',  // grigio testo secondario
  white:    '#FFFFFF',
  // alias per compatibilità
  gold:     '#D4561A',  // rimappa orange su gold per CTA
  goldDark: '#B8461A',
  coral:    '#1E5EFF',  // rimappa blue su coral per accenti
  green:    '#1E5EFF',
  indigo:   '#1245CC',
  silver:   '#888888',
  sienna:   '#D4561A',
};

const DEFAULT_CATEGORIES: CourseCategory[] = [
  { id:'c1', name:'Marketing Digitale', color:'#1E5EFF', emoji:'📊', order:1, createdAt:'' },
  { id:'c2', name:'Social Media',       color:'#D4561A', emoji:'📱', order:2, createdAt:'' },
  { id:'c3', name:'AI & Automazione',   color:'#1245CC', emoji:'🤖', order:3, createdAt:'' },
  { id:'c4', name:'Content Creation',   color:'#1E5EFF', emoji:'✍️', order:4, createdAt:'' },
];

// ── Componente decorativo — linea ornamentale ─────────────────────────────
function OrnamentalLine({ color = B.blue }: { color?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
      <div style={{ flex:1, height:1, background:`linear-gradient(to right, transparent, ${color})` }} />
      <div style={{ width:6, height:6, borderRadius:'50%', background:color }} />
      <div style={{ width:10, height:10, borderRadius:'50%', border:`2px solid ${color}` }} />
      <div style={{ width:6, height:6, borderRadius:'50%', background:color }} />
      <div style={{ flex:1, height:1, background:`linear-gradient(to left, transparent, ${color})` }} />
    </div>
  );
}

export default function RemodelPage() {
  const router = useRouter();
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>(DEFAULT_CATEGORIES);
  const [filterCat,  setFilterCat]  = useState('');
  const [search,     setSearch]     = useState('');
  const [hovered,    setHovered]    = useState<string | null>(null);

  useEffect(() => {
    const data = getAppData();
    if (data?.courses)                 setCourses(data.courses);
    if (data?.courseCategories?.length) setCategories(data.courseCategories);
  }, []);

  const activeCourses = courses.filter(c => c.status === 'Attivo' || c.status === 'Completato');

  const filtered = useMemo(() => activeCourses.filter(c => {
    if (filterCat && c.category !== filterCat) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return [c.title, c.subtitle, c.instructor, c.category].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  }), [activeCourses, filterCat, search]);

  const getCat = (name?: string) => categories.find(c => c.name === name);

  const totalParts = courses.reduce((s,c)=>s+c.participants.length,0);
  const totalCerts = courses.reduce((s,c)=>s+c.participants.filter(p=>p.certificateIssued).length,0);

  return (
    <div style={{ minHeight:'100vh', background:B.white, fontFamily:"'Montserrat','Helvetica Neue',Arial,sans-serif", color:B.ink }}>

      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        
        .remodel-body { font-family: 'Montserrat', Arial, sans-serif; }
        
        .remodel-nav-link {
          color: #1A1A1A; font-family: 'Montserrat', sans-serif;
          font-size: 14px; font-weight: 600; text-decoration: none;
          padding: 6px 0; border-bottom: 2px solid transparent;
          transition: border-color 200ms; letter-spacing: 0.2px;
        }
        .remodel-nav-link:hover { border-bottom-color: #1E5EFF; color: #1E5EFF; }
        
        .remodel-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: #D4561A; color: #FFFFFF;
          padding: 13px 30px; border-radius: 50px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 700; font-size: 15px; cursor: pointer;
          border: none; transition: all 200ms; letter-spacing: 0.3px;
          text-decoration: none;
        }
        .remodel-cta:hover { background: #B8461A; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(212,86,26,0.35); }
        
        .remodel-card {
          background: #fff; border: 2px solid #E8EEFF;
          border-radius: 20px; overflow: hidden;
          transition: all 250ms; cursor: pointer;
        }
        .remodel-card:hover {
          transform: translateY(-4px);
          border-color: #1E5EFF;
          box-shadow: 0 12px 40px rgba(30,94,255,0.15);
        }
        
        .remodel-badge {
          display: inline-block; padding: 4px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700; font-family: 'Montserrat', sans-serif;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        
        .remodel-filter-btn {
          padding: 9px 20px; border-radius: 30px; cursor: pointer;
          font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 13px;
          transition: all 150ms; border: 2px solid transparent;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ background:B.paper, borderBottom:`2px solid ${B.blue}`, padding:'0 48px', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(8px)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:72 }}>
          {/* Logo WeAreMOD */}
          <div style={{ lineHeight:1.1, fontFamily:"'Montserrat','Helvetica Neue',Arial,sans-serif", fontWeight:800, fontSize:15 }}>
            <div style={{ color:B.ink }}>we</div>
            <div style={{ color:B.ink }}>are</div>
            <div style={{ color:B.blue }}>mod.</div>
          </div>

          {/* Nav links */}
          <div style={{ display:'flex', gap:36, alignItems:'center' }}>
            <a href="#corsi"      className="remodel-nav-link">I corsi</a>
            <a href="#docenti"    className="remodel-nav-link">Docenti</a>
            <a href="#certificati" className="remodel-nav-link">Certificati</a>
            <button onClick={() => router.push('/courses')}
              style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:15, color:B.silver, background:'none', border:'none', cursor:'pointer', letterSpacing:'0.5px' }}>
              ← Gestionale
            </button>
          </div>

          {/* CTA */}
          <button className="remodel-cta" onClick={() => router.push('/courses/newsletter')}>
            Newsletter →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background:B.blue, padding:'80px 48px 64px', borderBottom:'none', position:'relative', overflow:'hidden', color:B.white }}>
        {/* Texture pattern decorativo */}
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'radial-gradient(circle, #1A1A1A 1px, transparent 1px)', backgroundSize:'24px 24px', pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>

            {/* Left */}
            <div>
              <div style={{ display:'inline-block', padding:'6px 18px', borderRadius:2, border:`1px solid ${B.blue}`, marginBottom:24 }}>
                <span style={{ fontSize:13, fontWeight:600, color:B.blue, textTransform:'uppercase', letterSpacing:'3px', fontFamily:'Arial, sans-serif' }}>
                  We Are MOD · Formazione
                </span>
              </div>

              <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:18, color:B.ink, lineHeight:1.4, marginBottom:16, fontWeight:400 }}>
                Non stai "investendo" nella comunicazione digitale.
              </p>
              <h1 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:58, fontWeight:700, fontStyle:'italic', lineHeight:1.05, letterSpacing:'-1px', color:B.blue, marginBottom:24 }}>
                Ti stai formando<br />per guidarla.
              </h1>

              <OrnamentalLine />

              <p style={{ fontSize:17, color:B.sienna, lineHeight:1.8, maxWidth:440, marginBottom:36, fontStyle:'italic' }}>
                Se sei un imprenditore o gestisci una PMI, il tempo è la tua risorsa più preziosa.
                Noi non lo sprechiamo.
              </p>

              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <a href="#corsi" className="remodel-cta">Prenota una call →</a>
                <a href="#corsi" style={{ fontSize:17, color:B.ink, textDecoration:'none', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', borderBottom:`1px solid ${B.ink}44` }}>
                  Esplora i corsi
                </a>
              </div>
            </div>

            {/* Right — Stats con stile vintage */}
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
                {[
                  { val: activeCourses.length,  label:'Corsi disponibili',  color:B.blue },
                  { val: totalParts,             label:'Imprenditori formati', color:B.orange },
                  { val: totalCerts,             label:'Certificati emessi', color:B.green },
                  { val: courses.reduce((s,c)=>s+c.modules.length,0), label:'Moduli didattici', color:B.indigo },
                ].map((k, i) => (
                  <div key={k.label} style={{
                    padding:'32px 24px', background: i===0?B.ink:i===1?B.paperDark:i===2?B.paper:B.paperDark,
                    border:`1px solid ${B.blue}33`,
                    borderTopLeftRadius:i===0?8:0, borderTopRightRadius:i===1?8:0,
                    borderBottomLeftRadius:i===2?8:0, borderBottomRightRadius:i===3?8:0,
                  }}>
                    <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:52, fontWeight:700, color:i===0?B.blue:k.color, lineHeight:1, marginBottom:8 }}>{k.val}</p>
                    <p style={{ fontFamily:'Arial, sans-serif', fontSize:13, textTransform:'uppercase', letterSpacing:'2px', color:i===0?B.silver:B.sienna }}>{k.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTRI CATEGORIA ── */}
      <div style={{ background:B.white, borderBottom:`2px solid ${B.blue}22`, padding:'0 48px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', gap:0, overflowX:'auto' }}>
          <button onClick={() => setFilterCat('')} style={{
            padding:'18px 28px', border:'none', background:'none', cursor:'pointer',
            fontFamily:"'Cormorant Garamond', serif", fontSize:17, fontWeight: filterCat==='' ? 700 : 400,
            color: filterCat==='' ? B.blue : B.sienna,
            borderBottom: filterCat==='' ? `2px solid ${B.blue}` : '2px solid transparent',
            marginBottom:-1, whiteSpace:'nowrap', transition:'all 150ms',
          }}>
            Tutti i corsi ({activeCourses.length})
          </button>
          {categories.filter(cat => activeCourses.some(c => c.category === cat.name)).map(cat => (
            <button key={cat.id} onClick={() => setFilterCat(filterCat===cat.name?'':cat.name)} style={{
              padding:'18px 28px', border:'none', background:'none', cursor:'pointer',
              fontFamily:"'Cormorant Garamond', serif", fontSize:17, fontWeight: filterCat===cat.name ? 700 : 400,
              color: filterCat===cat.name ? cat.color : B.sienna,
              borderBottom: filterCat===cat.name ? `2px solid ${cat.color}` : '2px solid transparent',
              marginBottom:-1, whiteSpace:'nowrap', transition:'all 150ms',
            }}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRIGLIA CORSI ── */}
      <div id="corsi" style={{ maxWidth:1100, margin:'0 auto', padding:'64px 48px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:48, flexWrap:'wrap', gap:20 }}>
          <div>
            <p style={{ fontFamily:'Arial,sans-serif', fontSize:13, textTransform:'uppercase', letterSpacing:'3px', color:B.sienna, marginBottom:10 }}>
              {filterCat ? `Categoria: ${filterCat}` : 'Tutti i corsi'}
            </p>
            <h2 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:40, fontWeight:700, letterSpacing:'-1px', color:B.ink }}>
              Il tuo percorso formativo
            </h2>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca corsi..."
            style={{ padding:'10px 20px', border:`1px solid ${B.blue}66`, borderRadius:2, fontSize:16, fontFamily:"'Cormorant Garamond',serif", background:'transparent', color:B.ink, outline:'none', width:220 }} />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <OrnamentalLine />
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:B.sienna, marginTop:24 }}>
              {courses.length === 0 ? 'I corsi saranno disponibili presto' : 'Nessun risultato'}
            </p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:2 }}>
            {filtered.map((course, idx) => {
              const cat        = getCat(course.category);
              const isHov      = hovered === course.id;
              const totalMods  = course.modules.length;
              const readyMods  = course.modules.filter(m=>m.status==='Erogato'||m.status==='Pronto').length;
              const certCount  = course.participants.filter(p=>p.certificateIssued).length;
              const catColor   = cat?.color ?? B.blue;

              return (
                <div key={course.id}
                  className="remodel-card"
                  onClick={() => router.push(`/courses/${course.id}`)}
                  onMouseEnter={() => setHovered(course.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isHov ? B.paperDark : B.paper,
                    border:`1px solid ${isHov ? catColor : B.blue+'44'}`,
                    cursor:'pointer', position:'relative', overflow:'hidden',
                  }}>

                  {/* Angolo decorativo */}
                  <div style={{ position:'absolute', top:0, right:0, width:40, height:40,
                    background:`linear-gradient(225deg, ${catColor} 50%, transparent 50%)`, opacity:0.6 }} />

                  <div style={{ padding:'28px 28px 24px' }}>
                    {/* Tag categoria */}
                    {cat && (
                      <div style={{ marginBottom:16 }}>
                        <span style={{ fontFamily:'Arial,sans-serif', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px',
                          color:catColor, borderBottom:`1px solid ${catColor}` }}>
                          {cat.emoji} {cat.name}
                        </span>
                      </div>
                    )}

                    {/* Titolo */}
                    <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, lineHeight:1.2, marginBottom:8, color:B.ink, letterSpacing:'-0.5px' }}>
                      {course.title}
                    </h3>
                    {course.subtitle && (
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:B.sienna, fontStyle:'italic', marginBottom:20, lineHeight:1.5 }}>
                        {course.subtitle}
                      </p>
                    )}

                    <OrnamentalLine color={`${catColor}66`} />

                    {/* Docente */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', border:`2px solid ${catColor}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:catColor, flexShrink:0 }}>
                        {course.instructor.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:600, color:B.ink }}>{course.instructor}</p>
                        <p style={{ fontFamily:'Arial,sans-serif', fontSize:12, textTransform:'uppercase', letterSpacing:'1px', color:B.silver }}>Docente</p>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                      {[
                        { label:'Location',  val:course.location||'Online' },
                        { label:'Moduli',    val:`${totalMods} lezioni` },
                        { label:'Iscritti',  val:`${course.participants.length}${course.maxParticipants?`/${course.maxParticipants}`:''}` },
                        { label:'Inizio',    val:course.startDate||'Da definire' },
                      ].map(k => (
                        <div key={k.label}>
                          <p style={{ fontFamily:'Arial,sans-serif', fontSize:11, textTransform:'uppercase', letterSpacing:'1.5px', color:B.silver, marginBottom:3 }}>{k.label}</p>
                          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:B.ink }}>{k.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Barra progress stile vintage */}
                    {totalMods > 0 && (
                      <div style={{ marginBottom:20 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontFamily:'Arial,sans-serif', fontSize:11, textTransform:'uppercase', letterSpacing:'1.5px', color:B.silver }}>Completamento</span>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:600, color:catColor }}>{readyMods}/{totalMods}</span>
                        </div>
                        <div style={{ height:2, background:`${catColor}22`, position:'relative' }}>
                          <div style={{ height:'100%', width:`${(readyMods/totalMods)*100}%`, background:catColor, transition:'width 400ms' }} />
                          {/* Tacche */}
                          {Array.from({length:totalMods-1},(_,i)=>(
                            <div key={i} style={{ position:'absolute', top:-2, left:`${((i+1)/totalMods)*100}%`, width:1, height:6, background:`${catColor}44` }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:16, borderTop:`1px solid ${B.blue}33` }}>
                      <div style={{ display:'flex', gap:12 }}>
                        {certCount > 0 && (
                          <span style={{ fontFamily:'Arial,sans-serif', fontSize:13, color:B.blue, fontWeight:700 }}>🏆 {certCount} certificati</span>
                        )}
                        {course.status === 'Completato' && (
                          <span style={{ fontFamily:'Arial,sans-serif', fontSize:13, color:B.green, fontWeight:700 }}>✓ Concluso</span>
                        )}
                      </div>
                      {course.price ? (
                        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:catColor }}>
                          €{course.price.toLocaleString('it-IT')}
                        </span>
                      ) : (
                        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontStyle:'italic', color:catColor }}>
                          Scopri →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SEZIONE DOCENTI ── */}
      <div id="docenti" style={{ background:B.blue, color:B.white, padding:'64px 48px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <p style={{ fontFamily:'Arial,sans-serif', fontSize:13, textTransform:'uppercase', letterSpacing:'3px', color:B.blue, marginBottom:16 }}>Il team</p>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, fontWeight:700, fontStyle:'italic', color:B.paper }}>
              I tuoi docenti
            </h2>
            <OrnamentalLine color={B.blue} />
          </div>

          {/* Lista docenti univoci */}
          <div style={{ display:'flex', justifyContent:'center', gap:32, flexWrap:'wrap' }}>
            {[...new Set(courses.map(c => c.instructor))].map(instructor => {
              const instructorCourses = courses.filter(c => c.instructor === instructor);
              return (
                <div key={instructor} style={{ textAlign:'center', padding:'32px 24px', border:`1px solid ${B.blue}33`, borderRadius:4, minWidth:200 }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', border:`2px solid ${B.blue}`, margin:'0 auto 16px',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:'#FFFFFF' }}>
                    {instructor.charAt(0)}
                  </div>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, color:B.paper, marginBottom:6 }}>{instructor}</p>
                  <p style={{ fontFamily:'Arial,sans-serif', fontSize:12, textTransform:'uppercase', letterSpacing:'2px', color:B.silver }}>
                    {instructorCourses.length} corso{instructorCourses.length>1?'i':''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CERTIFICATI ── */}
      {totalCerts > 0 && (
        <div id="certificati" style={{ background:B.blueLight, padding:'64px 48px', borderTop:`2px solid ${B.blue}33` }}>
          <div style={{ maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
            <p style={{ fontFamily:'Arial,sans-serif', fontSize:13, textTransform:'uppercase', letterSpacing:'3px', color:B.blue, marginBottom:16 }}>Riconoscimenti</p>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, fontWeight:700, color:B.ink, marginBottom:8 }}>
              {totalCerts} certificati emessi
            </h2>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontStyle:'italic', color:B.sienna }}>
              Professionisti formati che guidano la comunicazione digitale della loro impresa.
            </p>
            <OrnamentalLine />
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ background:B.ink, color:B.white, padding:'48px', textAlign:'center', borderTop:`3px solid ${B.blue}` }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:8 }}>
          <span style={{ fontStyle:'italic' }}>Re</span><span style={{ color:'#FFFFFF' }}> Model</span>
        </div>
        <p style={{ fontFamily:'Arial,sans-serif', fontSize:13, textTransform:'uppercase', letterSpacing:'3px', color:B.silver, marginBottom:24 }}>
          Part of We Are MOD · MOD Group
        </p>
        <a href="https://wearemod.com/contattaci/" target="_blank" rel="noopener noreferrer" className="remodel-cta">
          Prenota una call →
        </a>
        <p style={{ marginTop:32, fontFamily:'Arial,sans-serif', fontSize:13, color:B.silver }}>
          © 2025 Re Model · wearemod.com
        </p>
      </div>
    </div>
  );
}
