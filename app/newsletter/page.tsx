'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';
import { useState, useCallback } from 'react';

const DEFAULT_TOPICS = [
  { id:1, label:'AI Tools & LLM',         active:true,  icon:'🤖' },
  { id:2, label:'Social Media Marketing',  active:true,  icon:'📱' },
  { id:3, label:'Content Creation AI',     active:true,  icon:'✍️' },
  { id:4, label:'Automazione & No-Code',   active:false, icon:'⚡' },
  { id:5, label:'SEO & Analytics',         active:false, icon:'📊' },
  { id:6, label:'Design AI Tools',         active:false, icon:'🎨' },
  { id:7, label:'Hospitality & Turismo',   active:false, icon:'🏨' },
  { id:8, label:'Instagram & TikTok',      active:false, icon:'🎬' },
];

const TONES = ['Professionale','Casual','Tecnico','Sintetico'];

type StepStatus = 'waiting'|'loading'|'done'|'error';

interface NewsItem {
  headline: string; summary: string;
  source_name?: string; source_url?: string; date?: string; verified?: boolean;
}
interface NewsSection { title:string; icon:string; items:NewsItem[]; }
interface Newsletter {
  subject:string; intro:string; sections:NewsSection[];
  tip_of_day?:string; cta?:string;
  _meta?:{ generatedAt:string; topics:string[] };
}

async function geminiCall(prompt: string, useSearch = false): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('Nessuna API key configurata');
  const body: Record<string,unknown> = {
    contents:[{ role:'user', parts:[{ text: prompt }] }],
    generationConfig:{ maxOutputTokens:2000, temperature:0.7 },
  };
  if (useSearch) body.tools = [{ googleSearch:{} }];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text??'').join('') ?? '';
}

function safeParseJSON<T>(raw: string): T | null {
  try {
    const clean = raw.replace(/```json\n?|```\n?/g,'').trim();
    const s = clean.indexOf('{');
    const e = clean.lastIndexOf('}');
    if (s === -1 || e === -1) return null;
    return JSON.parse(clean.slice(s, e+1)) as T;
  } catch { return null; }
}

export default function NewsletterPage() {
  const [topics, setTopics]         = useState(DEFAULT_TOPICS);
  const [tone, setTone]             = useState('Professionale');
  const [status, setStatus]         = useState<'idle'|'searching'|'writing'|'done'|'error'>('idle');
  const [newsletter, setNewsletter] = useState<Newsletter|null>(null);
  const [error, setError]           = useState<string|null>(null);
  const [copied, setCopied]         = useState(false);
  const [searchInfo, setSearchInfo] = useState('');

  const activeTopics = topics.filter(t=>t.active).map(t=>t.label);
  const toggleTopic  = (id:number) => setTopics(t=>t.map(x=>x.id===id?{...x,active:!x.active}:x));

  const generate = useCallback(async () => {
    if (!activeTopics.length) return;
    const key = getApiKey();
    if (!key) { setError('Configura la API key Gemini in GOD Mode'); return; }

    setError(null);
    setNewsletter(null);
    setSearchInfo('');
    const today = new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    try {
      // STEP 1 — Cerca notizie con Google Search (testo libero, nessun JSON)
      setStatus('searching');
      setSearchInfo('Ricerca news in corso...');
      // Calcola data di 7 giorni fa
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toLocaleDateString('it-IT', {day:'numeric', month:'long', year:'numeric'});

      const newsText = await geminiCall(
        'Trova le notizie più importanti pubblicate tra il ' + weekAgoStr + ' e oggi (' + today + ') sui seguenti argomenti: ' +
        activeTopics.join(', ') + '.\n\n' +
        'REGOLE IMPORTANTI:\n' +
        '- Includi SOLO notizie pubblicate negli ultimi 7 giorni (dal ' + weekAgoStr + ' ad oggi)\n' +
        '- NON includere notizie più vecchie di 7 giorni\n' +
        '- NON ripetere la stessa notizia in argomenti diversi\n' +
        '- Ogni notizia deve essere UNICA e NON duplicata\n' +
        '- Per ogni argomento elenca 2-3 notizie distinte con: titolo, fonte, data precisa e breve descrizione\n' +
        '- Se una notizia riguarda più argomenti, inseriscila solo nel più pertinente',
        true
      );
      setSearchInfo('News trovate — generazione newsletter...');

      // STEP 2 — Genera newsletter in JSON in una sola chiamata
      setStatus('writing');
      const prompt =
        'Sei un editor di una newsletter professionale per un team di marketing italiano.\n' +
        'Crea una newsletter professionale in italiano con tono ' + tone + ' basandoti ESCLUSIVAMENTE sulle notizie qui sotto.\n\n' +
        'NOTIZIE TROVATE (ultimi 7 giorni):\n' + newsText + '\n\n' +
        'DATA: ' + today + '\n' +
        'TOPIC: ' + activeTopics.join(', ') + '\n\n' +
        'REGOLE OBBLIGATORIE:\n' +
        '- Usa SOLO notizie degli ultimi 7 giorni — scarta tutto il resto\n' +
        '- Ogni notizia deve apparire UNA SOLA VOLTA in tutta la newsletter\n' +
        '- NON duplicare notizie tra sezioni diverse\n' +
        '- Se una sezione non ha notizie recenti, scrivilo chiaramente invece di inventare\n\n' +
        'Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza nessun testo prima o dopo, senza markdown:\n' +
        '{\n' +
        '  "subject": "oggetto della email",\n' +
        '  "intro": "frase di apertura della newsletter (1 riga)",\n' +
        '  "sections": [\n' +
        '    {\n' +
        '      "title": "nome del topic",\n' +
        '      "icon": "emoji",\n' +
        '      "items": [\n' +
        '        {\n' +
        '          "headline": "titolo notizia",\n' +
        '          "summary": "riassunto di 2-3 righe utile al team marketing",\n' +
        '          "source_name": "nome testata",\n' +
        '          "source_url": "url se disponibile",\n' +
        '          "date": "data"\n' +
        '        }\n' +
        '      ]\n' +
        '    }\n' +
        '  ],\n' +
        '  "tip_of_day": "consiglio pratico per il team marketing",\n' +
        '  "cta": "frase finale motivazionale"\n' +
        '}';

      const jsonRaw = await geminiCall(prompt);
      const parsed  = safeParseJSON<Newsletter>(jsonRaw);

      if (!parsed || !parsed.sections?.length) {
        // Fallback: costruisce newsletter dal testo se il JSON non è valido
        const fallback: Newsletter = {
          subject: 'News Marketing & AI — ' + today,
          intro:   'Ecco le notizie più importanti di questa settimana per il team MOD.',
          sections: activeTopics.map(topic => ({
            title: topic,
            icon:  topics.find(t=>t.label===topic)?.icon ?? '📰',
            items: [{ headline: 'Vedi notizie complete sotto', summary: newsText.slice(0,500) + '...', verified:true }],
          })),
          tip_of_day: 'Rimani aggiornato — la costanza è la chiave del content marketing.',
          cta: 'Buon lavoro dal team MOD! 🚀',
          _meta: { generatedAt: today, topics: activeTopics },
        };
        setNewsletter(fallback);
      } else {
        parsed._meta = { generatedAt: today, topics: activeTopics };
        setNewsletter(parsed);
      }

      setStatus('done');
    } catch (err:unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      if (msg.includes('quota') || msg.includes('limit')) {
        setError('Quota API esaurita — riprova tra qualche minuto o attiva la fatturazione su aistudio.google.com');
      } else {
        setError(msg);
      }
      setStatus('error');
    }
  }, [activeTopics, tone, topics]);

  const copyText = () => {
    if (!newsletter) return;
    const lines = [
      'OGGETTO: ' + newsletter.subject, '',
      newsletter.intro, '',
      ...(newsletter.sections??[]).flatMap(s=>[
        '── ' + s.icon + ' ' + s.title.toUpperCase() + ' ──',
        ...(s.items??[]).map(i=>'• ' + i.headline + '\n  ' + i.summary + (i.source_name ? '\n  Fonte: ' + i.source_name : '')),
        '',
      ]),
      '💡 TIP: ' + (newsletter.tip_of_day??''),
      '', newsletter.cta??'',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true); setTimeout(()=>setCopied(false), 2500);
  };

  const isGenerating = status === 'searching' || status === 'writing';

  return (
    <div style={{padding:'28px 32px 80px', maxWidth:900}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:28, color:'var(--text-1)'}}>
          📰 Newsletter AI
        </h1>
        <p style={{fontSize:13, color:'var(--text-3)', marginTop:4}}>
          Genera una newsletter con notizie reali verificate da Google Search
        </p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
        {/* Topic selector */}
        <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px'}}>
          <p style={{fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12}}>📌 Topic</p>
          <div style={{display:'flex', flexDirection:'column', gap:7}}>
            {topics.map(t=>(
              <button key={t.id} onClick={()=>toggleTopic(t.id)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 13px',
                borderRadius:9, border:`1px solid ${t.active?'var(--brand)':'var(--border)'}`,
                background: t.active?'rgba(242,101,34,0.08)':'transparent',
                cursor:'pointer', textAlign:'left', transition:'all 150ms',
              }}>
                <span style={{fontSize:16}}>{t.icon}</span>
                <span style={{fontSize:13, fontWeight: t.active?700:400, color: t.active?'var(--brand)':'var(--text-2)', flex:1}}>{t.label}</span>
                <span style={{fontSize:12, color: t.active?'var(--brand)':'var(--text-3)'}}>{t.active?'✓':'+'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings + Generate */}
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px'}}>
            <p style={{fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12}}>⚙️ Impostazioni</p>
            <p style={{fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>TONO</p>
            <div style={{display:'flex', flexWrap:'wrap', gap:7, marginBottom:16}}>
              {TONES.map(t=>(
                <button key={t} onClick={()=>setTone(t)} style={{
                  padding:'5px 13px', borderRadius:20, border:`1.5px solid ${tone===t?'var(--brand)':'var(--border)'}`,
                  background: tone===t?'rgba(242,101,34,0.1)':'transparent',
                  color: tone===t?'var(--brand)':'var(--text-2)',
                  cursor:'pointer', fontSize:12, fontWeight: tone===t?700:400,
                }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{padding:'10px 13px', borderRadius:9, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.25)', fontSize:12, color:'#4ade80'}}>
              ✓ Ricerca Google Search attiva — notizie reali degli ultimi 7 giorni
            </div>
          </div>

          {/* Genera */}
          <button onClick={generate} disabled={isGenerating || activeTopics.length===0} style={{
            padding:'14px', borderRadius:12, border:'none', cursor: isGenerating?'default':'pointer',
            background: isGenerating?'var(--surface2)':'var(--brand)', color: isGenerating?'var(--text-3)':'white',
            fontSize:14, fontWeight:800, transition:'all 200ms',
          }}>
            {status==='searching' ? '🔍 Ricerca notizie...' :
             status==='writing'   ? '✍️ Scrittura newsletter...' :
             '🚀 Genera newsletter'}
          </button>

          {searchInfo && isGenerating && (
            <p style={{fontSize:12, color:'var(--text-3)', textAlign:'center'}}>{searchInfo}</p>
          )}

          {error && (
            <div style={{padding:'12px 14px', borderRadius:10, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)', fontSize:12, color:'#f87171', lineHeight:1.6}}>
              ❌ {error}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {newsletter && status==='done' && (
        <div style={{background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, overflow:'hidden'}}>
          {/* Header newsletter */}
          <div style={{padding:'20px 24px', background:'rgba(242,101,34,0.06)', borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12}}>
              <div>
                <p style={{fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4}}>Oggetto email</p>
                <p style={{fontSize:16, fontWeight:700, color:'var(--text-1)'}}>{newsletter.subject}</p>
                <p style={{fontSize:12, color:'var(--text-3)', marginTop:4}}>{newsletter.intro}</p>
              </div>
              <button onClick={copyText} style={{
                padding:'8px 18px', borderRadius:9, border:'1px solid var(--border2)',
                background:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--text-2)',
                whiteSpace:'nowrap', flexShrink:0,
              }}>
                {copied?'✅ Copiato!':'📋 Copia testo'}
              </button>
            </div>
          </div>

          {/* Sezioni */}
          <div style={{padding:'20px 24px', display:'flex', flexDirection:'column', gap:20}}>
            {(newsletter.sections??[]).map((section,si)=>(
              <div key={si}>
                <p style={{fontSize:13, fontWeight:800, color:'var(--text-1)', marginBottom:10, display:'flex', alignItems:'center', gap:6}}>
                  <span style={{fontSize:18}}>{section.icon}</span>
                  {section.title.toUpperCase()}
                </p>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {(section.items??[]).map((item,ii)=>(
                    <div key={ii} style={{padding:'12px 14px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)'}}>
                      <p style={{fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:5}}>{item.headline}</p>
                      <p style={{fontSize:12, color:'var(--text-2)', lineHeight:1.6, marginBottom:item.source_name?6:0}}>{item.summary}</p>
                      {item.source_name && (
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <span style={{fontSize:10, color:'var(--text-3)'}}>📰 {item.source_name}</span>
                          {item.date && <span style={{fontSize:10, color:'var(--text-3)'}}>· {item.date}</span>}
                          {item.source_url && item.source_url.startsWith('http') && (
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{fontSize:10, color:'var(--brand)'}}>↗ Leggi</a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {newsletter.tip_of_day && (
              <div style={{padding:'12px 16px', borderRadius:10, background:'rgba(212,175,55,0.08)', border:'1px solid rgba(212,175,55,0.25)'}}>
                <p style={{fontSize:12, fontWeight:700, color:'#D4AF37', marginBottom:3}}>💡 Tip del giorno</p>
                <p style={{fontSize:13, color:'var(--text-2)'}}>{newsletter.tip_of_day}</p>
              </div>
            )}

            {newsletter.cta && (
              <p style={{fontSize:13, color:'var(--text-2)', textAlign:'center', fontStyle:'italic'}}>{newsletter.cta}</p>
            )}

            {newsletter._meta && (
              <p style={{fontSize:11, color:'var(--text-3)', textAlign:'center'}}>
                Generata il {newsletter._meta.generatedAt} · Topic: {newsletter._meta.topics.join(', ')}
              </p>
            )}
          </div>

          {/* Azioni */}
          <div style={{padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:10}}>
            <button onClick={copyText} style={{flex:1, padding:'10px', borderRadius:9, border:'1px solid var(--border2)', background:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--text-2)'}}>
              {copied?'✅ Copiato!':'📋 Copia testo completo'}
            </button>
            <button onClick={generate} style={{flex:1, padding:'10px', borderRadius:9, border:'none', background:'var(--brand)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700}}>
              🔄 Rigenera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
