'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAppData, updateAppData } from '@/lib/store';
import { localDateISO } from '@/lib/utils';
import type { Client, EditorialContent, ContentPlatform, ContentFormat } from '@/lib/types';

// ── costanti ─────────────────────────────────────────────────────────────────

const PLATFORMS: ContentPlatform[] = ['Instagram','Facebook','LinkedIn','TikTok','YouTube','Pinterest'];
const FORMATS: ContentFormat[]     = ['Post','Reel','Story','Carousel','Video','UGC'];
const PLATFORM_EMOJI: Record<string,string> = {
  Instagram:'📸', Facebook:'👥', LinkedIn:'💼', TikTok:'🎵', YouTube:'▶️', Pinterest:'📌',
};
const FORMAT_EMOJI: Record<string,string> = {
  Post:'🖼', Reel:'🎬', Story:'⭕', Carousel:'📎', Video:'📹', UGC:'👤',
};

function getMonthDays(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const days: string[] = [];
  const total = new Date(y, m, 0).getDate();
  for (let d = 1; d <= total; d++) {
    days.push(`${ym}-${String(d).padStart(2,'0')}`);
  }
  return days;
}

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

interface PlannedPost {
  date: string;
  platform: ContentPlatform;
  format: ContentFormat;
  topic: string;
  caption: string;
  visualNotes: string;
  tags: string;
  rationale: string;
}

interface GeneratedPlan {
  summary: string;
  posts: PlannedPost[];
  strategy_notes: string;
}

// ── PAGINA ────────────────────────────────────────────────────────────────────

export default function ContentPlannerPage() {
  const router = useRouter();
  const [clients, setClients]   = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [month, setMonth]       = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [platforms, setPlatforms]       = useState<ContentPlatform[]>(['Instagram']);
  const [formats, setFormats]           = useState<ContentFormat[]>(['Post','Reel','Story']);
  const [extraNotes, setExtraNotes]     = useState('');

  const [loading, setLoading]     = useState(false);
  const [plan, setPlan]           = useState<GeneratedPlan | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [editingPost, setEditingPost] = useState<number | null>(null);

  useEffect(() => {
    const data = getAppData();
    if (data) setClients(data.clients.filter(c => c.status === 'Attivo'));
  }, []);

  const client = clients.find(c => c.id === clientId);
  const mb     = client?.marketingBrief;

  const togglePlatform = (p: ContentPlatform) =>
    setPlatforms(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]);
  const toggleFormat = (f: ContentFormat) =>
    setFormats(fs => fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f]);

  // ── Genera piano con AI ────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!client || platforms.length === 0) return;
    setLoading(true);
    setPlan(null);

    const [y, m] = month.split('-').map(Number);
    const monthName = `${MONTHS_IT[m-1]} ${y}`;
    const days = getMonthDays(month);
    const totalPosts = Math.round((days.length / 7) * postsPerWeek);

    const briefContext = mb ? `
BRIEF MARKETING CLIENTE:
- Valori brand: ${mb.brandValues || 'n.d.'}
- Tono di voce: ${mb.toneOfVoice || 'n.d.'}
- NON comunicare: ${mb.doNotSay || 'nessun vincolo'}
- Stile visivo: ${mb.visualStyle || 'n.d.'}
- Target: ${[mb.targetAge, mb.targetInterests].filter(Boolean).join(', ') || 'n.d.'}
- Obiettivo social: ${mb.socialGoal || 'n.d.'}
- Argomenti evergreen: ${mb.topTopics || 'n.d.'}
- Stagionalità: ${mb.seasonality || 'n.d.'}
- Differenziatori: ${mb.differentiators || 'n.d.'}
- Formati migliori: ${mb.topFormats || 'n.d.'}` : '';

    const systemPrompt = `Sei un esperto social media strategist italiano. 
Crea piani editoriali dettagliati e creativi, con contenuti specifici per ogni post.
Rispondi SOLO con JSON valido, nessun markdown, nessun testo extra.`;

    const userMsg = `Crea un piano editoriale per ${monthName} per il cliente "${client.name}" (settore: ${client.sector || 'n.d.'}).

PARAMETRI:
- Post totali da pianificare: ${totalPosts}
- Piattaforme: ${platforms.join(', ')}
- Formati: ${formats.join(', ')}
- Periodo: ${days[0]} → ${days[days.length-1]}
${briefContext}
${extraNotes ? `NOTE AGGIUNTIVE: ${extraNotes}` : ''}

Per ogni post distribuisci le date in modo equilibrato nel mese (evita cluster, copri tutto il periodo).
Varia formati e temi per mantenere interesse.

JSON richiesto:
{
  "summary": "sintesi strategica del piano in 2-3 righe",
  "strategy_notes": "note strategiche per il team (tono, focus del mese, attenzioni)",
  "posts": [
    {
      "date": "YYYY-MM-DD",
      "platform": "Instagram",
      "format": "Reel",
      "topic": "tema del contenuto (5-8 parole)",
      "caption": "caption completa pronta da usare con emoji",
      "visualNotes": "descrizione visiva per il designer (2 righe)",
      "tags": "#hashtag1 #hashtag2 #hashtag3",
      "rationale": "perché questo contenuto in questa data (1 riga)"
    }
  ]
}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          
          system: systemPrompt,
          contents: [{ role:'user', parts:[{ text: userMsg }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.75 },
        }),
      });
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const clean = text.replace(/```json|```/g, '').trim();
      const s = clean.indexOf('{'); const e = clean.lastIndexOf('}');
      const parsed = JSON.parse(clean.slice(s, e+1)) as GeneratedPlan;
      setPlan(parsed);
    } catch (err) {
      console.error(err);
      alert('Errore nella generazione. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [client, platforms, formats, month, postsPerWeek, mb, extraNotes]);

  // ── Salva nel piano editoriale ────────────────────────────────────────────

  const savePlan = useCallback(async () => {
    if (!plan || !client) return;
    setSaving(true);

    const data = getAppData();
    const newContents: EditorialContent[] = plan.posts.map(p => ({
      id:            `EC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,5)}`,
      clientId:      client.id,
      clientName:    client.name,
      platform:      p.platform as ContentPlatform,
      format:        p.format as ContentFormat,
      scheduledDate: p.date,
      status:        'Da fare' as const,
      caption:       p.caption,
      visualNotes:   p.visualNotes,
      tags:          p.tags,
      notes:         p.rationale,
      briefChecklist: { textApproved: false, materialsReady: false, styleRef: false, formatConfirmed: false },
    }));

    updateAppData({ editorialContent: [...(data?.editorialContent ?? []), ...newContents] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push('/editorial'), 1800);
  }, [plan, client, router]);

  // ── Modifica post inline ──────────────────────────────────────────────────

  const updatePost = (idx: number, field: keyof PlannedPost, value: string) => {
    if (!plan) return;
    const posts = plan.posts.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    setPlan({ ...plan, posts });
  };

  // ── Vista calendario ──────────────────────────────────────────────────────

  const days = getMonthDays(month);
  const [y, m_num] = month.split('-').map(Number);
  const firstDow = new Date(`${month}-01`).getDay(); // 0=domenica

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 9, fontSize: 14,
    border: '1px solid var(--border2)', background: 'var(--surface2)',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  };

  if (saved) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:16 }}>
      <div style={{ fontSize:56 }}>📅</div>
      <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text-1)' }}>{plan?.posts.length} contenuti salvati!</h2>
      <p style={{ color:'var(--text-3)', fontSize:15 }}>Reindirizzamento al piano editoriale...</p>
    </div>
  );

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>←</button>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:26, color:'var(--text-1)' }}>Pianificatore Contenuti AI</h1>
          <p style={{ fontSize:14, color:'var(--text-3)', marginTop:3 }}>Genera un piano editoriale mensile completo in un click</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>

        {/* ── Pannello configurazione ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:80 }}>

          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:20 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>⚙️ Configura piano</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cliente *</label>
                <select style={{ ...inputStyle, cursor:'pointer' }} value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Mese</label>
                <input style={inputStyle} type="month" value={month} onChange={e => setMonth(e.target.value)} />
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Post / settimana: {postsPerWeek}</label>
                <input type="range" min={1} max={7} value={postsPerWeek} onChange={e => setPostsPerWeek(Number(e.target.value))}
                  style={{ width:'100%', accentColor:'var(--brand)' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-3)' }}>
                  <span>1</span><span>~{Math.round((days.length/7)*postsPerWeek)} post totali</span><span>7</span>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Piattaforme</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => togglePlatform(p)} style={{
                      fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20, cursor:'pointer',
                      border:`1px solid ${platforms.includes(p) ? 'var(--brand)' : 'var(--border)'}`,
                      background: platforms.includes(p) ? 'rgba(242,101,34,0.1)' : 'var(--surface2)',
                      color: platforms.includes(p) ? 'var(--brand)' : 'var(--text-3)',
                    }}>
                      {PLATFORM_EMOJI[p]} {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Formati</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {FORMATS.map(f => (
                    <button key={f} onClick={() => toggleFormat(f)} style={{
                      fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20, cursor:'pointer',
                      border:`1px solid ${formats.includes(f) ? 'var(--brand)' : 'var(--border)'}`,
                      background: formats.includes(f) ? 'rgba(242,101,34,0.1)' : 'var(--surface2)',
                      color: formats.includes(f) ? 'var(--brand)' : 'var(--text-3)',
                    }}>
                      {FORMAT_EMOJI[f]} {f}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Note aggiuntive</label>
                <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
                  value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
                  placeholder="Es. focus su apertura stagione, evitare certi topic questo mese..." />
              </div>

              {/* Brief status */}
              {client && (
                <div style={{ padding:'8px 12px', borderRadius:9,
                  background: mb ? 'rgba(74,222,128,0.06)' : 'rgba(251,191,36,0.06)',
                  border: `1px solid ${mb ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)'}`,
                }}>
                  <p style={{ fontSize:12, color: mb ? '#4ade80' : '#fbbf24', fontWeight:600 }}>
                    {mb ? '✓ Brief marketing disponibile — l\'AI lo userà' : '⚠ Brief marketing mancante — risultati meno precisi'}
                  </p>
                  {!mb && (
                    <button onClick={() => router.push(`/clients/${clientId}/brief`)}
                      style={{ fontSize:11, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', padding:0, marginTop:3 }}>
                      Compila brief →
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={generate}
              disabled={loading || !clientId || platforms.length === 0}
              style={{
                marginTop:16, width:'100%', padding:'12px', borderRadius:10,
                fontSize:15, fontWeight:700, border:'none',
                cursor: loading || !clientId ? 'not-allowed' : 'pointer',
                background: loading || !clientId ? 'var(--surface3)' : 'var(--brand)',
                color: loading || !clientId ? 'var(--text-3)' : 'white',
                boxShadow: !loading && clientId ? '0 4px 16px rgba(242,101,34,0.3)' : 'none',
                transition:'all 150ms',
              }}
            >
              {loading ? '⏳ Generazione...' : plan ? '🔄 Rigenera' : '✨ Genera piano'}
            </button>
          </div>
        </div>

        {/* ── Output ── */}
        <div>
          {!plan && !loading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:400, gap:12, color:'var(--text-3)' }}>
              <span style={{ fontSize:48 }}>📅</span>
              <p style={{ fontSize:16 }}>Configura e genera il piano editoriale</p>
              <p style={{ fontSize:14 }}>L'AI creerà caption, note visual e hashtag per ogni post</p>
            </div>
          )}

          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:24 }}>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--brand)', marginBottom:4 }}>⏳ Generazione piano in corso...</p>
              {[85,60,90,50,75,40,80,55,70].map((w,i) => (
                <div key={i} style={{ height:13, borderRadius:6, background:'var(--surface2)', width:`${w}%` }} />
              ))}
            </div>
          )}

          {plan && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Summary + azioni */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:20 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12 }}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--brand)', marginBottom:6 }}>
                      📅 {plan.posts.length} contenuti — {MONTHS_IT[m_num-1]} {y} — {client?.name}
                    </p>
                    <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.6 }}>{plan.summary}</p>
                  </div>
                  <button
                    onClick={savePlan} disabled={saving}
                    style={{ flexShrink:0, padding:'9px 18px', borderRadius:10, fontSize:14, fontWeight:700, border:'none', cursor:saving?'wait':'pointer', background:'var(--brand)', color:'white', whiteSpace:'nowrap' }}
                  >
                    {saving ? '⏳' : '💾'} Salva nel piano
                  </button>
                </div>
                {plan.strategy_notes && (
                  <div style={{ padding:'10px 14px', borderRadius:9, background:'var(--surface2)', fontSize:13, color:'var(--text-2)', lineHeight:1.6 }}>
                    <span style={{ fontWeight:700, color:'var(--text-1)' }}>Note strategiche: </span>{plan.strategy_notes}
                  </div>
                )}
              </div>

              {/* Vista calendario */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, overflow:'hidden' }}>
                {/* Header giorni */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
                  {DAY_NAMES.map(d => (
                    <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{d}</div>
                  ))}
                </div>
                {/* Griglia */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                  {/* Celle vuote prima del primo giorno */}
                  {Array.from({ length: firstDow }, (_, i) => (
                    <div key={`empty-${i}`} style={{ minHeight:80, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'var(--surface2)', opacity:0.4 }} />
                  ))}
                  {days.map((day, di) => {
                    const dow = (firstDow + di) % 7;
                    const postsForDay = plan.posts.map((p,idx) => ({...p, idx})).filter(p => p.date === day);
                    const isToday = day === localDateISO();
                    return (
                      <div key={day} style={{
                        minHeight:80, padding:'6px 6px 4px',
                        borderRight: (firstDow + di) % 7 < 6 ? '1px solid var(--border)' : 'none',
                        borderBottom:'1px solid var(--border)',
                        background: isToday ? 'rgba(242,101,34,0.04)' : 'transparent',
                      }}>
                        <span style={{ fontSize:12, fontWeight: isToday ? 800 : 400, color: isToday ? 'var(--brand)' : dow === 0 || dow === 6 ? 'var(--text-3)' : 'var(--text-2)', display:'block', marginBottom:4 }}>
                          {new Date(day).getDate()}
                        </span>
                        {postsForDay.map(p => (
                          <div key={p.idx}
                            onClick={() => setEditingPost(editingPost === p.idx ? null : p.idx)}
                            style={{
                              marginBottom:3, padding:'3px 6px', borderRadius:6, cursor:'pointer',
                              background:'rgba(242,101,34,0.12)', border:'1px solid rgba(242,101,34,0.3)',
                              borderLeft:`3px solid var(--brand)`,
                            }}>
                            <p style={{ fontSize:11, fontWeight:700, color:'var(--brand)' }}>{PLATFORM_EMOJI[p.platform]} {p.format}</p>
                            <p style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.3, marginTop:1 }}>{p.topic}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lista post con editing inline */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {plan.posts.map((post, idx) => (
                  <div key={idx} style={{
                    background:'var(--surface)', border:`1px solid ${editingPost === idx ? 'var(--brand)' : 'var(--border2)'}`,
                    borderRadius:12, overflow:'hidden', transition:'border 150ms',
                  }}>
                    {/* Post header */}
                    <div
                      onClick={() => setEditingPost(editingPost === idx ? null : idx)}
                      style={{ padding:'12px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}
                    >
                      <div style={{ width:36, height:36, borderRadius:9, background:'rgba(242,101,34,0.1)', border:'1px solid rgba(242,101,34,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {PLATFORM_EMOJI[post.platform]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-3)' }}>{post.date}</span>
                          <span style={{ fontSize:12, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'var(--surface2)', color:'var(--text-2)' }}>{post.platform}</span>
                          <span style={{ fontSize:12, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'var(--surface2)', color:'var(--text-2)' }}>{post.format}</span>
                        </div>
                        <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.topic}</p>
                      </div>
                      <span style={{ fontSize:14, color:'var(--text-3)', transform: editingPost === idx ? 'rotate(180deg)' : 'none', transition:'transform 150ms' }}>▼</span>
                    </div>

                    {/* Post detail (espanso) */}
                    {editingPost === idx && (
                      <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10, paddingTop:14 }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:4 }}>Caption</label>
                          <textarea
                            value={post.caption}
                            onChange={e => updatePost(idx, 'caption', e.target.value)}
                            style={{ ...inputStyle, minHeight:90, resize:'vertical', fontFamily:'inherit', lineHeight:1.6, fontSize:14 }}
                          />
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <div>
                            <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:4 }}>Note visual</label>
                            <textarea value={post.visualNotes} onChange={e => updatePost(idx, 'visualNotes', e.target.value)}
                              style={{ ...inputStyle, minHeight:70, resize:'vertical', fontFamily:'inherit', lineHeight:1.5, fontSize:14 }} />
                          </div>
                          <div>
                            <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:4 }}>Hashtag</label>
                            <textarea value={post.tags} onChange={e => updatePost(idx, 'tags', e.target.value)}
                              style={{ ...inputStyle, minHeight:70, resize:'vertical', fontFamily:'inherit', lineHeight:1.5, fontSize:13, color:'#60a5fa' }} />
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <input type="date" value={post.date} onChange={e => updatePost(idx, 'date', e.target.value)}
                            style={{ ...inputStyle, width:'auto' }} />
                          <select value={post.platform} onChange={e => updatePost(idx, 'platform', e.target.value)} style={{ ...inputStyle, width:'auto', cursor:'pointer' }}>
                            {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                          </select>
                          <select value={post.format} onChange={e => updatePost(idx, 'format', e.target.value)} style={{ ...inputStyle, width:'auto', cursor:'pointer' }}>
                            {FORMATS.map(f => <option key={f}>{f}</option>)}
                          </select>
                          <button onClick={() => {
                            if (!plan) return;
                            setPlan({ ...plan, posts: plan.posts.filter((_,i) => i !== idx) });
                            setEditingPost(null);
                          }} style={{ padding:'8px 14px', borderRadius:9, fontSize:13, fontWeight:600, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.06)', color:'#f87171', cursor:'pointer', marginLeft:'auto' }}>
                            🗑 Rimuovi
                          </button>
                        </div>
                        <p style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic' }}>💡 {post.rationale}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Salva in fondo */}
              <button onClick={savePlan} disabled={saving} style={{
                width:'100%', padding:'13px', borderRadius:12, fontSize:16, fontWeight:700, border:'none',
                cursor:saving?'wait':'pointer', background:'var(--brand)', color:'white',
                boxShadow:'0 4px 20px rgba(242,101,34,0.35)',
              }}>
                {saving ? '⏳ Salvo...' : `💾 Salva ${plan.posts.length} contenuti nel piano editoriale`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
