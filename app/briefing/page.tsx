'use client';
import { GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRole } from '@/hooks/useRole';
import { getAmbrogioProfile } from '@/lib/ambrogio';
import { getApiKey } from '@/lib/aiProvider';
import type { UserRole } from '@/lib/roles';


const SECTOR_CONFIG: Record<UserRole, {
  label: string; topics: string[];
  searchQueries: string[]; notebookPrompt: string;
}> = {
  ceo: {
    label: 'Business & Marketing Agency',
    topics: ['Marketing agency Italia','AI tools agenzie','Business PMI','Digital trends'],
    searchQueries: ['marketing agency trends Italy 2026 news week','AI tools marketing agencies 2026','digital marketing Italy news this week'],
    notebookPrompt: 'Crea un Audio Overview in italiano di 7-10 minuti per il CEO di una marketing agency italiana. Tono: autorevole, strategico. Include: trend settore, opportunità, rischi.',
  },
  account: {
    label: 'Hospitality & Luxury Italia',
    topics: ['Hospitality Italia','Luxury travel','Hotel marketing','Turismo lusso'],
    searchQueries: ['hospitality luxury Italy news this week 2026','hotel marketing trends 2026','turismo lusso Italia notizie settimana'],
    notebookPrompt: 'Crea un Audio Overview in italiano di 7-10 minuti per un account manager specializzato in hospitality e luxury.',
  },
  smm: {
    label: 'Social Media & Content',
    topics: ['Instagram algoritmo','TikTok trends','LinkedIn news','Content marketing'],
    searchQueries: ['Instagram algorithm update 2026 this week','TikTok trending Italy 2026','social media marketing news this week'],
    notebookPrompt: 'Crea un Audio Overview in italiano di 7-10 minuti per un social media manager. Include: aggiornamenti algoritmi, trend contenuti, case study recenti.',
  },
  designer: {
    label: 'Design & Visual Trends',
    topics: ['Graphic design trends','Canva updates','Brand identity','Visual marketing'],
    searchQueries: ['graphic design trends 2026 this week','Canva new features 2026','visual marketing trends 2026'],
    notebookPrompt: 'Crea un Audio Overview in italiano di 7-10 minuti per un graphic designer di agenzia. Include: trend visivi, aggiornamenti tool design.',
  },
  pm: {
    label: 'Project Management & Produttività',
    topics: ['Project management','Produttività team','AI workflow','Agency ops'],
    searchQueries: ['project management trends 2026 news','team productivity AI 2026','workflow automation marketing 2026'],
    notebookPrompt: 'Crea un Audio Overview in italiano di 7-10 minuti per un project manager di agenzia. Include: news PM, strumenti produttività, best practice.',
  },
};

async function gemini(apiKey: string, prompt: string, system?: string, useSearch = false): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body: Record<string, unknown> = {
    contents: [{ role:'user', parts:[{ text: prompt }] }],
    generationConfig: { maxOutputTokens: useSearch ? 2000 : 1500, temperature: 0.75 },
  };
  if (system) body.system_instruction = { parts:[{ text: system }] };
  if (useSearch) body.tools = [{ googleSearch:{} }];
  const res  = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.map((p:{text?:string}) => p.text ?? '').join('\n') ?? '';
}

function useVoicePlayer(text: string) {
  const [playing, setPlaying]   = useState(false);
  const [paused, setPaused]     = useState(false);
  const [speed, setSpeed]       = useState(1);
  const [progress, setProgress] = useState(0);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setPlaying(false); setPaused(false); setProgress(0);
  }, []);

  const play = useCallback(() => {
    if (!text || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const voices   = window.speechSynthesis.getVoices();
    const itVoice  = voices.find(v => v.lang.startsWith('it')) ?? voices[0];
    const utter    = new SpeechSynthesisUtterance(text);
    if (itVoice) utter.voice = itVoice;
    utter.rate  = speed; utter.pitch = 1.05;
    utter.onboundary = (e) => { if (e.name==='word') setProgress(Math.round((e.charIndex/text.length)*100)); };
    utter.onend  = () => { setPlaying(false); setPaused(false); setProgress(100); };
    window.speechSynthesis.speak(utter);
    setPlaying(true); setPaused(false);
  }, [text, speed]);

  const pause  = useCallback(() => { window.speechSynthesis?.pause();  setPaused(true);  setPlaying(false); }, []);
  const resume = useCallback(() => { window.speechSynthesis?.resume(); setPaused(false); setPlaying(true);  }, []);
  const changeSpeed = useCallback((s: number) => { setSpeed(s); stop(); }, [stop]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  return { playing, paused, progress, speed, play, pause, resume, stop, changeSpeed };
}

export default function BriefingPage() {
  const { role }   = useRole();
  const profile    = getAmbrogioProfile(role);
  const config     = SECTOR_CONFIG[role];
  const color      = profile.color;

  const [briefing, setBriefing]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [copied, setCopied]           = useState(false);
  const [showGate, setShowGate]       = useState(false);
  const [lastGen, setLastGen]         = useState('');
  const voice = useVoicePlayer(briefing);

  const doGenerate = async () => {
    setShowGate(false);
    const apiKey = getApiKey();
    if (!apiKey) {
      alert('Configura la API key Gemini in GOD Mode. Ottienila gratis su aistudio.google.com');
      return;
    }
    setLoading(true); setBriefing(''); voice.stop();

    try {
      setLoadingStep(`Ricerca news: ${config.topics[0]} e altri argomenti...`);
      const searchText = await gemini(
        apiKey,
        `Cerca le news più importanti di questa settimana su questi argomenti per un professionista italiano del settore ${config.label}:\n${config.searchQueries.map((q,i) => `${i+1}. ${q}`).join('\n')}\nRaccogli risultati concreti e aggiornati. Rispondi in italiano.`,
        undefined,
        true,
      );

      setLoadingStep('Ambrogio sta elaborando il briefing...');
      const today = new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

      const text = await gemini(
        apiKey,
        `Data: ${today}\n\nNews raccolte:\n${searchText}\n\nGenera il briefing per ${profile.fullName}. Inizia con "Buongiorno da MOD Group..."`,
        `Sei Dott. Ambrogio ${profile.title}, il radiogiornale personale di MOD Group.
Presenta le news del settore ${config.label} come un giornalista radiofonico italiano caldo e professionale.
Struttura:
1. Apertura — saluto e data (2 frasi)
2. Titoli in pillole — 3 notizie chiave (3 frasi)
3. Approfondimento — analisi delle news con contesto pratico
4. Implicazioni — cosa significa per il lavoro quotidiano
5. Chiusura — firma e arrivederci
Lunghezza: 500-700 parole. Frasi fluide, ritmo naturale — verrà letto ad alta voce.`,
      );

      setBriefing(text);
      setLastGen(today);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
      setBriefing(`Errore: ${msg}\n\nVerifica la API key Gemini in GOD Mode.`);
    }

    setLoading(false); setLoadingStep('');
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(`${config.notebookPrompt}\n\nCONTENUTO:\n${briefing}`);
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ padding:'28px 32px 80px', maxWidth:860 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:`${color}20`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
          {profile.avatar}
        </div>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:28, color:'var(--text-1)', lineHeight:1.1 }}>
            🎙 MOD Briefing
          </h1>
          <p style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>
            {profile.fullName} · {config.label}
            {lastGen && ` · Generato ${lastGen}`}
          </p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'rgba(66,133,244,0.1)', border:'1px solid rgba(66,133,244,0.3)' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#4285F4' }}>Powered by Gemini</span>
        </div>
      </div>

      {/* CTA iniziale */}
      {!briefing && !loading && (
        <div style={{ background:'var(--surface)', border:`1px solid ${color}33`, borderRadius:16, padding:'36px', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🎙</div>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text-1)', marginBottom:8, fontFamily:"'Cormorant Garamond',serif" }}>
            Il tuo radiogiornale personale ti aspetta
          </p>
          <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20, lineHeight:1.7, maxWidth:480, margin:'0 auto 20px' }}>
            Ambrogio cercherà le news più rilevanti di questa settimana per <strong style={{ color }}>{config.label}</strong> con Google Search e le presenterà come un radiogiornale personalizzato.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:24 }}>
            {config.topics.map(t => (
              <span key={t} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:`${color}12`, border:`1px solid ${color}33`, color }}>
                {t}
              </span>
            ))}
          </div>
          <button onClick={() => setShowGate(true)} style={{ padding:'13px 36px', borderRadius:12, border:'none', cursor:'pointer', background:color, color:'white', fontSize:15, fontWeight:800, boxShadow:`0 4px 20px ${color}44` }}>
            🎙 Genera il briefing
          </button>
          <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10 }}>
            Usa Google Search · Gemini 2.5 Flash · Gratis
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background:'var(--surface)', border:`1px solid ${color}33`, borderRadius:16, padding:'48px', textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20 }}>
            {[0,1,2].map(i => <div key={i} style={{ width:12, height:12, borderRadius:'50%', background:color, animation:`bounce 1.2s ease ${i*0.2}s infinite` }} />)}
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>{profile.fullName} sta preparando il briefing...</p>
          <p style={{ fontSize:12, color:'var(--text-3)' }}>{loadingStep}</p>
          <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
        </div>
      )}

      {/* Player + Briefing */}
      {briefing && !loading && (
        <>
          {/* Player */}
          <div style={{ background:`${color}08`, border:`2px solid ${color}44`, borderRadius:16, padding:'20px 22px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <span style={{ fontSize:22 }}>🎙</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Ascolta il briefing</p>
                <p style={{ fontSize:11, color:'var(--text-3)' }}>Voce italiana · Web Speech API</p>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {[0.8,1,1.2,1.5,1.8].map(s => (
                  <button key={s} onClick={() => voice.changeSpeed(s)} style={{ padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:10, fontWeight:700, background:voice.speed===s?color:'var(--surface2)', color:voice.speed===s?'white':'var(--text-3)' }}>{s}×</button>
                ))}
              </div>
            </div>
            <div style={{ height:5, background:'var(--surface2)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
              <div style={{ height:'100%', width:`${voice.progress}%`, background:color, borderRadius:3, transition:'width 200ms' }} />
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              {!voice.playing && !voice.paused && <button onClick={voice.play} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:10, border:'none', cursor:'pointer', background:color, color:'white', fontSize:14, fontWeight:800, boxShadow:`0 4px 14px ${color}44` }}>▶ Ascolta</button>}
              {voice.playing  && <button onClick={voice.pause}  style={{ padding:'11px 24px', borderRadius:10, border:`2px solid ${color}`, cursor:'pointer', background:'transparent', color, fontSize:14, fontWeight:800 }}>⏸ Pausa</button>}
              {voice.paused   && <button onClick={voice.resume} style={{ padding:'11px 24px', borderRadius:10, border:'none', cursor:'pointer', background:color, color:'white', fontSize:14, fontWeight:800 }}>▶ Riprendi</button>}
              {(voice.playing||voice.paused||voice.progress>0) && <button onClick={voice.stop} style={{ padding:'11px 16px', borderRadius:10, border:'1px solid var(--border2)', cursor:'pointer', background:'none', color:'var(--text-3)', fontSize:12 }}>⏹ Stop</button>}
              {voice.progress===100 && <span style={{ fontSize:13, color:'#4ade80', fontWeight:700 }}>✅ Ascolto completato!</span>}
            </div>
          </div>

          {/* Testo */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:'24px 26px', marginBottom:16 }}>
            <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.9, whiteSpace:'pre-wrap', fontFamily:"'Montserrat',sans-serif" }}>{briefing}</p>
          </div>

          {/* Azioni */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            <button onClick={copyPrompt} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:`1px solid ${color}44`, background:`${color}08`, cursor:'pointer', fontSize:12, fontWeight:700, color }}>
              📓 {copied ? 'Copiato! Incolla in NotebookLM' : 'Copia prompt per NotebookLM'}
            </button>
            <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'1px solid rgba(96,165,250,0.4)', background:'rgba(96,165,250,0.06)', cursor:'pointer', fontSize:12, fontWeight:700, color:'#60a5fa', textDecoration:'none' }}>
              🌐 Apri NotebookLM →
            </a>
            <button onClick={() => setShowGate(true)} style={{ padding:'10px 16px', borderRadius:10, border:'1px solid var(--border2)', background:'none', cursor:'pointer', fontSize:12, color:'var(--text-3)' }}>
              🔄 Rigenera
            </button>
          </div>

          <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.2)', fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>
            <strong style={{ color:'#60a5fa' }}>💡 Per il podcast vero:</strong> copia il prompt → aprilo in NotebookLM → incollalo come fonte → clicca <em>"Audio Overview"</em>. In 2 minuti hai due host AI che discutono le tue news.
          </div>
        </>
      )}

      {/* Gate web search */}
      {showGate && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setShowGate(false)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, width:'100%', maxWidth:440, background:'var(--surface)', border:`2px solid ${color}`, borderRadius:18, padding:'32px', boxShadow:'0 20px 60px rgba(0,0,0,0.7)', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:14 }}>🔍</div>
            <p style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Ricerca Google attivata</p>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:6, lineHeight:1.6 }}>Ambrogio cercherà le news di questa settimana con Google Search per:</p>
            <p style={{ fontSize:14, fontWeight:700, color, marginBottom:20 }}>{config.label}</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowGate(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer', fontWeight:600, fontSize:13 }}>Annulla</button>
              <button onClick={doGenerate} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:color, color:'white', cursor:'pointer', fontWeight:800, fontSize:13 }}>✓ Genera briefing</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
