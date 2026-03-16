'use client';
import { gemini, tryParseJSON , GEMINI_MODEL  } from '@/lib/gemini';
import { callAI, getApiKey } from '@/lib/aiProvider';

import { useState } from 'react';
import { useRole } from '@/hooks/useRole';
import { getAmbrogioProfile } from '@/lib/ambrogio';
import { useRouter } from 'next/navigation';

interface AmbrogioInlineProps {
  context: string;           // es. "cliente Sereno Hotels con 3 task in ritardo"
  suggestions?: string[];    // domande contestuali
  compact?: boolean;
}

export function AmbrogioInline({ context, suggestions = [], compact = false }: AmbrogioInlineProps) {
  const { role }   = useRole();
  const router     = useRouter();
  const profile    = getAmbrogioProfile(role);
  const [open, setOpen]     = useState(false);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [input, setInput]   = useState('');

  const ask = async (question: string) => {
    setOpen(true);
    setLoading(true);
    setAnswer('');
    const key = getApiKey();
    if (!key) { setAnswer('⚠️ Configura la API key Gemini in GOD Mode per usare Ambrogio.'); setLoading(false); return; }

    try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          system_instruction:{ parts:[{ text:`${profile.systemPrompt}\n\nCONTESTO ATTUALE:\n${context}\n\nRispondi in modo conciso (max 3 frasi). Vai dritto al punto. Italiano.` }] },
          contents:[{ role:'user', parts:[{ text: question }] }],
          generationConfig:{ maxOutputTokens:400, temperature:0.7 },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Nessuna risposta.');
    } catch { setAnswer('Errore di connessione. Riprova.'); }
    setLoading(false);
  };

  if (compact) {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        <button onClick={() => router.push('/ambrogio')} style={{
          display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
          borderRadius:20, border:`1px solid ${profile.color}44`,
          background:`${profile.color}08`, cursor:'pointer', fontSize:11,
          fontWeight:600, color:profile.color, transition:'all 150ms',
        }}>
          <span style={{ fontSize:14 }}>{profile.avatar}</span>
          Chiedi ad Ambrogio
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background:`${profile.color}06`, border:`1px solid ${profile.color}22`,
      borderRadius:12, overflow:'hidden', transition:'all 200ms',
    }}>
      {/* Header widget */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer' }}
           onClick={() => setOpen(o => !o)}>
        <div style={{
          width:30, height:30, borderRadius:'50%', flexShrink:0,
          background:`${profile.color}18`, border:`1.5px solid ${profile.color}`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
        }}>
          {profile.avatar}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:12, fontWeight:700, color:profile.color }}>{profile.fullName}</p>
          <p style={{ fontSize:10, color:'var(--text-3)' }}>Clicca per chiedere qualcosa su questa pagina</p>
        </div>
        <span style={{ fontSize:12, color:'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 200ms' }}>▾</span>
      </div>

      {/* Corpo espanso */}
      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${profile.color}18` }}>
          {/* Domande suggerite contestuali */}
          {suggestions.length > 0 && !answer && !loading && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'10px 0 8px' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => ask(s)} style={{
                  fontSize:11, padding:'5px 11px', borderRadius:20, cursor:'pointer',
                  border:`1px solid ${profile.color}33`, background:`${profile.color}08`,
                  color:'var(--text-2)', transition:'all 150ms',
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Risposta */}
          {loading && (
            <div style={{ display:'flex', gap:5, padding:'10px 0', alignItems:'center' }}>
              <span style={{ color:profile.color, fontSize:12 }}>Ambrogio sta pensando</span>
              {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:profile.color, animation:`bounce 1.2s ease ${i*0.2}s infinite` }} />)}
            </div>
          )}
          {answer && !loading && (
            <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--surface2)', fontSize:12, color:'var(--text-1)', lineHeight:1.7, marginBottom:8, marginTop:8 }}>
              {answer}
            </div>
          )}

          {/* Input libero */}
          <div style={{ display:'flex', gap:7, marginTop:8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && input.trim() && ask(input)}
              placeholder="Fai una domanda su questa pagina..."
              style={{
                flex:1, padding:'7px 11px', borderRadius:8, fontSize:12,
                border:`1px solid ${profile.color}33`, background:'var(--surface2)',
                color:'var(--text-1)', outline:'none', fontFamily:'inherit',
              }}
            />
            <button onClick={() => input.trim() && ask(input)} style={{
              padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer',
              background:profile.color, color:'white', fontSize:12, fontWeight:700,
            }}>↵</button>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}
