'use client';
import { GEMINI_MODEL } from '@/lib/gemini';
import { callAI, callAIStream, getActiveProvider, getApiKey } from '@/lib/aiProvider';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '@/hooks/useData';
import { useRole } from '@/hooks/useRole';
import { localDateISO } from '@/lib/utils';
import { getAmbrogioProfile, buildAmbrogioContext } from '@/lib/ambrogio';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  searching?: boolean; // sta cercando sul web
}

interface SearchRequest {
  query: string;
  resolve: (approved: boolean) => void;
}

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:4, padding:'4px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:7, height:7, borderRadius:'50%', background:'var(--text-3)',
          animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0);opacity:0.4}
          50%{transform:translateY(-5px);opacity:1}
        }
      `}</style>
    </div>
  );
}

export default function AmbrogioPage() {
  const { data }   = useData();
  const { role }   = useRole();
  const profile    = getAmbrogioProfile(role);
  const today      = localDateISO();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [apiKey, setApiKeyState]      = useState('');

  useEffect(() => {
    const k = getApiKey();
    setApiKeyState(k);
  }, []);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [searchReq, setSearchReq]     = useState<SearchRequest | null>(null);
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0 });
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Scroll automatico
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  // Messaggio di benvenuto
  useEffect(() => {
    const welcome: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Buongiorno! Sono il **${profile.fullName}**, il tuo ${profile.title} personale.\n\nHo accesso ai dati aggiornati di MOD Group — clienti, task, piano editoriale${role === 'ceo' ? ', corsi Remodel' : ''}. Chiedimi pure qualsiasi cosa.`,
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
  }, [role]);

  // Funzione di invio con gestione web search e gate
  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    // Costruisci contesto dati
    const context = buildAmbrogioContext({
      clients:          data.clients,
      tasks:            data.tasks,
      deals:            data.deals,
      leads:            data.leads,
      editorialContent: data.editorialContent,
      courses:          data.courses,
      timeLogs:         data.timeLogs,
    }, role, today);

    // Storia conversazione per API
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    const GURL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`;

    const gCall = async (sys: string, msgs: {role:string; content:string}[], maxTok=800, useSearch=false): Promise<string> => {
      const body: Record<string,unknown> = {
        system_instruction: { parts:[{ text: sys }] },
        contents: msgs.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts:[{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: maxTok, temperature: 0.7 },
      };
      if (useSearch) body.tools = [{ googleSearch:{} }];
      const r = await fetch(GURL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      return d.candidates?.[0]?.content?.parts?.map((p:{text?:string}) => p.text ?? '').join('') ?? '';
    };

    try {
      // Step 1: Determina se serve web search
      const planText = await gCall(
        `Sei un router. Rispondi SOLO con JSON: {"needsWeb": true/false, "searchQuery": "query"}.
needsWeb = true solo se la domanda richiede notizie/trend/dati recenti da internet.
Per dati interni (clienti, task, budget) needsWeb = false.`,
        [{ role:'user', content: userText }], 80
      );
      let needsWeb = false;
      let searchQuery = '';
      try {
        const s = planText.indexOf('{'); const e = planText.lastIndexOf('}');
        const plan = JSON.parse(planText.slice(s, e+1));
        needsWeb    = plan.needsWeb && profile.canWebSearch;
        searchQuery = plan.searchQuery ?? '';
      } catch {}

      // Step 2: Web search se necessario
      let webResults = '';
      if (needsWeb && searchQuery) {
        const approved = await new Promise<boolean>(resolve => {
          setSearchReq({ query: searchQuery, resolve });
        });
        setSearchReq(null);

        if (approved) {
          setMessages(m => [...m, {
            id: `search${Date.now()}`, role:'assistant',
            content: `🔍 Ricerca in corso: "${searchQuery}"...`,
            timestamp: new Date().toISOString(), searching: true,
          }]);

          webResults = await gCall(
            'Cerca le informazioni richieste e riassumi in 3-5 punti concreti in italiano.',
            [{ role:'user', content: `Cerca: ${searchQuery}` }], 500, true
          );

          setMessages(m => m.filter(msg => !msg.searching));
        }
      }

      // Step 3: Risposta principale
      const systemWithContext = `${profile.systemPrompt}

DATI ATTUALI MOD GROUP:
${context}
${webResults ? `\nRISULTATI RICERCA WEB:\n${webResults}` : ''}

Rispondi in italiano in modo conciso e diretto. Usa markdown per formattare (grassetto, liste).
Non inventare dati — usa solo quelli forniti nel contesto.`;

      const reply = await gCall(
        systemWithContext,
        [...history, { role:'user', content: userText }],
        800
      );

      setMessages(m => [...m, {
        id: `a${Date.now()}`, role:'assistant',
        content: reply || 'Non ho capito. Puoi riformulare?',
        timestamp: new Date().toISOString(),
      }]);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setMessages(m => [...m, {
        id: `err${Date.now()}`, role:'assistant',
        content: `❌ Errore: ${msg}

Verifica che la API key Gemini sia configurata correttamente in GOD Mode.`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, data, role, today, profile]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // Renderer markdown semplice
  const renderContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/<li>.*<\/li>/g, m => `<ul style="margin:6px 0;padding-left:18px">${m}</ul>`)
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 48px)', background:'var(--surface2)' }}>

      {/* Header Ambrogio */}
      <div style={{
        padding:'16px 24px', background:'var(--surface)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:14, flexShrink:0,
      }}>
        <div style={{
          width:44, height:44, borderRadius:'50%', flexShrink:0,
          background:`${profile.color}20`, border:`2px solid ${profile.color}`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
        }}>
          {profile.avatar}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:17, fontWeight:700, color:'var(--text-1)', lineHeight:1.2 }}>{profile.fullName}</p>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>{profile.title} · MOD Group</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80' }} />
          <span style={{ fontSize:13, color:'var(--text-3)' }}>Online</span>
          {(sessionTokens.input + sessionTokens.output) > 0 && (
            <span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, background:'var(--surface2)', color:'var(--text-3)', border:'1px solid var(--border)', marginLeft:4 }}
              title={`Input: ${sessionTokens.input.toLocaleString()} · Output: ${sessionTokens.output.toLocaleString()}`}>
              ~{((sessionTokens.input + sessionTokens.output) / 1000).toFixed(1)}k token
            </span>
          )}
          {profile.canWebSearch && (
            <span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, background:'rgba(96,165,250,0.1)', color:'#60a5fa', border:'1px solid rgba(96,165,250,0.2)', marginLeft:6 }}>
              🌐 Web
            </span>
          )}
        </div>
      </div>

      {/* Thread messaggi */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Domande suggerite */}
        {messages.length <= 1 && (
          <div style={{ marginBottom:8 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
              Puoi chiedermi...
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {profile.suggestedQuestions.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} style={{
                  fontSize:14, padding:'7px 14px', borderRadius:20, cursor:'pointer',
                  border:`1px solid ${profile.color}44`, background:`${profile.color}08`,
                  color:'var(--text-2)', transition:'all 150ms', textAlign:'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${profile.color}15`; e.currentTarget.style.color = profile.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${profile.color}08`; e.currentTarget.style.color = 'var(--text-2)'; }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            display:'flex', gap:10,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems:'flex-start',
          }}>
            {/* Avatar */}
            <div style={{
              width:32, height:32, borderRadius:'50%', flexShrink:0,
              background: msg.role === 'user' ? 'var(--brand)' : `${profile.color}20`,
              border: msg.role === 'assistant' ? `1.5px solid ${profile.color}` : 'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: msg.role === 'user' ? 13 : 16,
              fontWeight: msg.role === 'user' ? 800 : 400,
              color: msg.role === 'user' ? 'white' : profile.color,
            }}>
              {msg.role === 'user' ? 'Tu' : profile.avatar}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth:'78%',
              padding:'10px 14px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user' ? `${profile.color}18` : 'var(--surface)',
              border: `1px solid ${msg.role === 'user' ? profile.color+'33' : 'var(--border)'}`,
              fontSize:15, color:'var(--text-1)', lineHeight:1.7,
            }}>
              {msg.searching ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>🔍</span>
                  <span style={{ color:'var(--text-3)', fontSize:14 }}>{msg.content}</span>
                  <TypingDots />
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
              )}
              <p style={{ fontSize:11, color:'var(--text-3)', marginTop:4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && !messages.some(m => m.searching) && (
          <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:`${profile.color}20`, border:`1.5px solid ${profile.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              {profile.avatar}
            </div>
            <div style={{ padding:'12px 16px', borderRadius:'4px 16px 16px 16px', background:'var(--surface)', border:'1px solid var(--border)' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Gate autorizzazione web search */}
      {searchReq && (
        <div style={{
          position:'absolute', bottom:100, left:'50%', transform:'translateX(-50%)',
          background:'var(--surface)', border:`2px solid ${profile.color}`,
          borderRadius:16, padding:'16px 20px', maxWidth:480, width:'90%',
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:100,
        }}>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>
            🌐 Richiesta ricerca web
          </p>
          <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:6 }}>
            Dott. Ambrogio vuole cercare:
          </p>
          <div style={{ padding:'8px 12px', borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', marginBottom:14 }}>
            <p style={{ fontSize:15, fontWeight:600, color:'var(--text-1)' }}>"{searchReq.query}"</p>
          </div>
          <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:14 }}>
            Autorizzi la ricerca su internet?
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => searchReq.resolve(false)} style={{ flex:1, padding:'9px', borderRadius:9, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer', fontWeight:600, fontSize:14 }}>
              ✗ No, rispondi senza
            </button>
            <button onClick={() => searchReq.resolve(true)} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:profile.color, color:'white', cursor:'pointer', fontWeight:700, fontSize:14 }}>
              ✓ Autorizza ricerca
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding:'14px 20px', background:'var(--surface)', borderTop:'1px solid var(--border)',
        flexShrink:0, position:'relative',
      }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Chiedi a ${profile.fullName}...`}
            disabled={loading || !!searchReq}
            style={{
              flex:1, minHeight:44, maxHeight:120, padding:'10px 14px',
              borderRadius:12, fontSize:15, fontFamily:'inherit', lineHeight:1.5,
              border:`1px solid ${input ? profile.color+'66' : 'var(--border2)'}`,
              background:'var(--surface2)', color:'var(--text-1)', outline:'none',
              resize:'none', transition:'border 150ms',
              opacity: loading || !!searchReq ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || !!searchReq}
            style={{
              width:44, height:44, borderRadius:12, border:'none', flexShrink:0,
              cursor:input.trim()&&!loading?'pointer':'not-allowed',
              background:input.trim()&&!loading?profile.color:'var(--surface3)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 150ms',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input.trim()&&!loading?'white':'var(--text-3)'} strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim()&&!loading?'white':'var(--text-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize:11, color:'var(--text-3)', marginTop:6, textAlign:'center' }}>
          Invio per inviare · Shift+Invio per nuova riga
          {profile.canWebSearch && ' · Le ricerche web richiedono la tua autorizzazione'}
        </p>
      </div>
    </div>
  );
}
