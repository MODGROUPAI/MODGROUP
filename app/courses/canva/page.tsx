'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAppData } from '@/lib/store';
import { Suspense } from 'react';
import type { Course, CourseModule } from '@/lib/types';

// ── Tipi di design generabili ─────────────────────────────────────────────────

interface CanvaTemplate {
  id: string;
  icon: string;
  label: string;
  desc: string;
  designType: string;
  category: 'corso' | 'modulo' | 'social' | 'certificato' | 'questionario';
  promptBuilder: (course: Course, mod?: CourseModule) => string;
}

const TEMPLATES: CanvaTemplate[] = [
  // ── CORSO ──
  {
    id: 'course-cover',
    icon: '🖼️', label: 'Copertina Corso', category: 'corso',
    desc: 'Copertina professionale per il corso con titolo e brand Re Model',
    designType: 'poster',
    promptBuilder: (c) => `Copertina corso di formazione professionale. Titolo: "${c.title}". ${c.subtitle ? `Sottotitolo: "${c.subtitle}".` : ''} Docente: ${c.instructor}. Brand: Re Model by We Are MOD. Stile: elegante, moderno, palette beige #F5F5DC e oro #D4AF37, tipografia serif bold. Include logo testuale "Re Model" in basso.`,
  },
  {
    id: 'course-social',
    icon: '📱', label: 'Post Social Corso', category: 'social',
    desc: 'Post Instagram/LinkedIn per annunciare il corso',
    designType: 'instagram_post',
    promptBuilder: (c) => `Post social media per annuncio corso di formazione. Corso: "${c.title}". ${c.subtitle ? c.subtitle + '.' : ''} Docente: ${c.instructor}. Brand Re Model / We Are MOD. Stile vintage-editoriale, colori beige e oro #D4AF37, font serif. Call to action: "Iscriviti ora". Formato quadrato.`,
  },
  {
    id: 'course-story',
    icon: '⭕', label: 'Story Corso', category: 'social',
    desc: 'Instagram/LinkedIn Story verticale per promuovere il corso',
    designType: 'your_story',
    promptBuilder: (c) => `Story verticale per promuovere corso formazione "${c.title}". Brand Re Model. Stile elegante, beige e oro. Include titolo corso, nome docente ${c.instructor} e CTA "Scopri di più". Formato 9:16.`,
  },
  {
    id: 'course-brochure',
    icon: '📄', label: 'Brochure Corso', category: 'corso',
    desc: 'Documento/flyer con info complete del corso',
    designType: 'flyer',
    promptBuilder: (c) => `Flyer/brochure professionale per corso di formazione. Titolo: "${c.title}". ${c.subtitle ? `Sottotitolo: "${c.subtitle}".` : ''} Docente: ${c.instructor}. ${c.location ? `Modalità: ${c.location}.` : ''} ${c.price ? `Prezzo: €${c.price}.` : ''} Brand Re Model by We Are MOD. Stile editoriale vintage, colori beige #F5F5DC, oro #D4AF37, carbone #1A1A1A.`,
  },
  // ── MODULO ──
  {
    id: 'module-cover',
    icon: '📚', label: 'Copertina Modulo', category: 'modulo',
    desc: 'Slide copertina per ogni modulo del corso',
    designType: 'presentation',
    promptBuilder: (c, m) => `Slide copertina modulo didattico. Corso: "${c.title}". Modulo ${m?.order}: "${m?.title}". ${m?.description ? `Tema: ${m.description}.` : ''} Docente: ${m ? (c.instructor) : c.instructor}. Brand Re Model. Stile: presentazione professionale, sfondo scuro o beige, accenti oro. Una sola slide di apertura.`,
  },
  {
    id: 'module-infographic',
    icon: '📊', label: 'Infografica Modulo', category: 'modulo',
    desc: 'Infografica visiva con i concetti chiave del modulo',
    designType: 'infographic',
    promptBuilder: (c, m) => `Infografica didattica per modulo di formazione. Titolo: "${m?.title ?? c.title}". ${m?.description ? `Contenuto: ${m.description}.` : ''} Stile visivo educativo, brand Re Model, palette beige e oro #D4AF37. Include 4-6 punti chiave con icone. Formato verticale.`,
  },
  {
    id: 'module-social',
    icon: '🎬', label: 'Post Modulo Social', category: 'social',
    desc: 'Post social per annunciare o promuovere un singolo modulo',
    designType: 'instagram_post',
    promptBuilder: (c, m) => `Post social media per modulo didattico. Corso "${c.title}", Modulo: "${m?.title ?? ''}". Brand Re Model. Stile editoriale, oro e beige. Include numero modulo e titolo in grande. CTA: "Disponibile ora".`,
  },
  // ── QUESTIONARIO ──
  {
    id: 'quiz-template',
    icon: '❓', label: 'Template Questionario', category: 'questionario',
    desc: 'Template visivo per questionario/test di verifica',
    designType: 'document',
    promptBuilder: (c, m) => `Template questionario di verifica per corso di formazione. ${m ? `Modulo: "${m.title}".` : `Corso: "${c.title}".`} Brand Re Model by We Are MOD. Stile professionale con aree per domande a risposta multipla e aperta. Include header con logo testuale e spazio per nome partecipante. Palette beige e oro.`,
  },
  {
    id: 'feedback-form',
    icon: '💬', label: 'Form Feedback', category: 'questionario',
    desc: 'Modulo di raccolta feedback al termine del corso',
    designType: 'document',
    promptBuilder: (c) => `Form raccolta feedback corso di formazione "${c.title}". Brand Re Model. Design pulito e professionale, stile editoriale. Include scala di valutazione 1-10, domande aperte su punti di forza e miglioramento, spazio per commenti. Palette beige e oro #D4AF37.`,
  },
  // ── CERTIFICATO ──
  {
    id: 'certificate-design',
    icon: '🏆', label: 'Certificato Canva', category: 'certificato',
    desc: 'Versione Canva del certificato di completamento',
    designType: 'certificate',
    promptBuilder: (c) => `Certificato di completamento corso "${c.title}". Docente: ${c.instructor}. Brand: Re Model by We Are MOD. Stile elegante vintage, bordo decorativo, palette beige carta #F5F5DC e oro antico #D4AF37, font serif. Include spazio per nome partecipante, data, firma docente. Formato orizzontale A4.`,
  },
  {
    id: 'certificate-social',
    icon: '🥇', label: 'Badge Certificato Social', category: 'certificato',
    desc: 'Badge/post da condividere sui social dopo il certificato',
    designType: 'instagram_post',
    promptBuilder: (c) => `Badge/post celebrativo per certificato completamento corso "${c.title}". Brand Re Model. Stile premium, oro e scuro. Testo: "Ho completato il corso" + titolo corso. Include badge circolare con simbolo diploma. Da condividere su LinkedIn/Instagram.`,
  },
];

const CATEGORY_CONFIG = {
  corso:        { label: 'Corso',         color: '#D4AF37', emoji: '🎓' },
  modulo:       { label: 'Modulo',        color: '#60a5fa', emoji: '📚' },
  social:       { label: 'Social Media',  color: '#F88379', emoji: '📱' },
  questionario: { label: 'Questionario',  color: '#4ade80', emoji: '❓' },
  certificato:  { label: 'Certificato',   color: '#a78bfa', emoji: '🏆' },
};

// ── PAGINA ────────────────────────────────────────────────────────────────────

function CanvaGeneratorInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const courseId     = searchParams.get('courseId');
  const moduleId     = searchParams.get('moduleId');

  const [courses, setCourses]         = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(courseId ?? '');
  const [selectedModule, setSelectedModule] = useState<string>(moduleId ?? '');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [generating, setGenerating]   = useState<string | null>(null);
  const [results, setResults]         = useState<Record<string, { url?: string; error?: string }>>({});

  useEffect(() => {
    const data = getAppData();
    if (data?.courses) setCourses(data.courses);
  }, []);

  const course = courses.find(c => c.id === selectedCourse);
  const module = course?.modules.find(m => m.id === selectedModule);

  const filteredTemplates = TEMPLATES.filter(t => {
    if (selectedCat && t.category !== selectedCat) return false;
    if (!selectedCourse) return false;
    if (t.category === 'modulo' && !selectedModule) return false;
    return true;
  });

  const generate = useCallback(async (template: CanvaTemplate) => {
    if (!course) return;
    setGenerating(template.id);

    const prompt = template.promptBuilder(course, module);

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          
          mcp_servers: [{ type: 'url', url: 'https://mcp.canva.com/mcp', name: 'canva' }],
          messages: [{
            role: 'user',
            content: `Crea un design Canva con questi parametri:
Tipo: ${template.designType}
Prompt: ${prompt}

Usa lo strumento Canva per generare il design e restituisci l'URL del design creato.`,
          }],
        }),
      });

      const json = await res.json();
      const text = (json.content ?? []).filter((b: {type:string}) => b.type === 'text').map((b: {text:string}) => b.text).join('');

      // Estrai URL Canva dalla risposta
      const urlMatch = text.match(/https:\/\/www\.canva\.com\/design\/[^\s"')]+/);
      if (urlMatch) {
        setResults(r => ({ ...r, [template.id]: { url: urlMatch[0] } }));
      } else {
        setResults(r => ({ ...r, [template.id]: { url: 'https://www.canva.com/design/', error: 'Design creato — controlla Canva' } }));
      }
    } catch (err) {
      setResults(r => ({ ...r, [template.id]: { error: 'Errore. Riprova.' } }));
    } finally {
      setGenerating(null);
    }
  }, [course, module]);

  const inputStyle: React.CSSProperties = {
    padding: '9px 13px', borderRadius: 9, fontSize: 14,
    border: '1px solid var(--border2)', background: 'var(--surface2)',
    color: 'var(--text-1)', outline: 'none', width: '100%', cursor: 'pointer',
  };

  return (
    <div style={{ padding: '28px 28px 60px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            Canva Generator
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>Genera grafiche, copertine, certificati e questionari per Re Model</p>
        </div>
      </div>

      {/* Config */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>⚙️ Seleziona corso e modulo</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Corso *</label>
            <select style={inputStyle} value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedModule(''); }}>
              <option value="">Seleziona corso...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Modulo (per design specifici)
            </label>
            <select style={inputStyle} value={selectedModule} onChange={e => setSelectedModule(e.target.value)} disabled={!course}>
              <option value="">Nessun modulo specifico</option>
              {course?.modules.sort((a,b) => a.order - b.order).map(m => (
                <option key={m.id} value={m.id}>{m.order}. {m.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filtri categoria */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedCat('')} style={{
          padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          background: selectedCat === '' ? 'var(--brand)' : 'var(--surface2)',
          color: selectedCat === '' ? 'white' : 'var(--text-3)',
        }}>
          Tutti
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setSelectedCat(selectedCat === key ? '' : key)} style={{
            padding: '7px 16px', borderRadius: 20, border: `1px solid ${selectedCat === key ? cfg.color : 'var(--border)'}`, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: selectedCat === key ? cfg.color + '20' : 'transparent',
            color: selectedCat === key ? cfg.color : 'var(--text-3)',
          }}>
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* Avviso se nessun corso selezionato */}
      {!selectedCourse && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🎨</p>
          <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 6 }}>Seleziona un corso per iniziare</p>
          <p style={{ fontSize: 14 }}>Poi scegli il tipo di design da generare con Canva</p>
        </div>
      )}

      {/* Griglia template */}
      {selectedCourse && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {filteredTemplates.map(template => {
            const cat     = CATEGORY_CONFIG[template.category];
            const result  = results[template.id];
            const isGen   = generating === template.id;
            const needsMod = template.category === 'modulo' && !selectedModule;

            return (
              <div key={template.id} style={{
                background: 'var(--surface)', border: `1px solid ${result?.url ? cat.color + '44' : 'var(--border2)'}`,
                borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12,
                opacity: needsMod ? 0.5 : 1,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{template.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{template.label}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: cat.color + '20', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {cat.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4 }}>{template.desc}</p>
                  </div>
                </div>

                {needsMod && (
                  <p style={{ fontSize: 12, color: '#fbbf24', fontStyle: 'italic' }}>⚠️ Seleziona un modulo specifico</p>
                )}

                {/* Risultato */}
                {result?.url && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>✓ Design creato</p>
                    <a href={result.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none', wordBreak: 'break-all' }}>
                      Apri in Canva →
                    </a>
                  </div>
                )}
                {result?.error && !result?.url && (
                  <p style={{ fontSize: 12, color: '#f87171' }}>✗ {result.error}</p>
                )}

                {/* Bottone genera */}
                <button
                  onClick={() => generate(template)}
                  disabled={isGen || needsMod || !selectedCourse}
                  style={{
                    marginTop: 'auto', padding: '10px', borderRadius: 9, fontSize: 14, fontWeight: 700,
                    border: 'none', cursor: isGen || needsMod ? 'not-allowed' : 'pointer',
                    background: result?.url ? 'rgba(74,222,128,0.15)' : isGen ? 'var(--surface3)' : 'var(--brand)',
                    color: result?.url ? '#4ade80' : isGen ? 'var(--text-3)' : 'white',
                    transition: 'all 150ms',
                  }}>
                  {isGen ? '⏳ Generando...' : result?.url ? '🔄 Rigenera' : '✨ Genera con Canva'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CanvaGeneratorPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-3)' }}>Caricamento...</div>}>
      <CanvaGeneratorInner />
    </Suspense>
  );
}
