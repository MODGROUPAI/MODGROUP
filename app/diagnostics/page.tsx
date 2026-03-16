'use client';
import { GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { useData } from '@/hooks/useData';
import { getApiKey } from '@/lib/aiProvider';
import { isGodUser } from '@/lib/godMode';

type CheckStatus = 'ok' | 'warn' | 'error' | 'checking' | 'idle';

interface Check {
  id: string; label: string; description: string; category: string;
  status: CheckStatus; detail?: string; fix?: string; fixUrl?: string;
}

const S_COLOR: Record<CheckStatus, string> = { ok:'#4ade80', warn:'#fbbf24', error:'#f87171', checking:'#60a5fa', idle:'#555' };
const S_ICON:  Record<CheckStatus, string> = { ok:'✅', warn:'⚠️', error:'❌', checking:'⏳', idle:'○' };

export default function DiagnosticsPage() {
  const { role } = useRole();
  const currentMember = (() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('pmo_current_member') ?? 'null'); } catch { return null; }
  })();
  const { data } = useData();
  const [checks, setChecks]           = useState<Check[]>([]);
  const [running, setRunning]         = useState(false);
  const [lastRun, setLastRun]         = useState<string|null>(null);
  const [filter, setFilter]           = useState<CheckStatus|'all'>('all');
  const [geminiTest, setGeminiTest]   = useState<'idle'|'testing'|'ok'|'error'>('idle');
  const [geminiMsg, setGeminiMsg]     = useState('');

  const buildChecks = (): Check[] => {
    const geminiKey = typeof window !== 'undefined' ? localStorage.getItem('pmo_gemini_key') ?? '' : '';
    const claudeKey = typeof window !== 'undefined' ? localStorage.getItem('pmo_anthropic_key') ?? '' : '';
    const lsOk = (() => { try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return true; } catch { return false; } })();
    const storageKB = (() => { try { let t=0; for(const k of Object.keys(localStorage)) if(k.startsWith('pmo_')) t+=(localStorage.getItem(k)??'').length; return Math.round(t/1024); } catch { return 0; } })();

    return [
      // AI
      { id:'gemini_key', label:'Gemini API Key', description:'Necessaria per Ambrogio e MOD Briefing', category:'AI',
        status: geminiKey ? 'ok' : claudeKey ? 'warn' : 'error',
        detail: geminiKey ? `Key configurata: ${geminiKey.slice(0,8)}...` : claudeKey ? 'Usa Claude come fallback — aggiungi la key Gemini (gratuita)' : 'Nessuna API key — Ambrogio e MOD Briefing non funzionano',
        fix: !geminiKey ? 'GOD Mode → API Keys → incolla la key Gemini da aistudio.google.com' : undefined, fixUrl: !geminiKey ? '/god' : undefined },
      { id:'gemini_format', label:'Formato key Gemini', description:'La key deve iniziare con AIzaSy', category:'AI',
        status: !geminiKey ? 'idle' : geminiKey.startsWith('AIzaSy') ? 'ok' : 'error',
        detail: !geminiKey ? 'Nessuna key presente' : geminiKey.startsWith('AIzaSy') ? 'Formato corretto ✓' : `Formato non valido: inizia con "${geminiKey.slice(0,6)}"`,
        fix: geminiKey && !geminiKey.startsWith('AIzaSy') ? 'Ricopia la key da aistudio.google.com — deve iniziare con "AIzaSy"' : undefined, fixUrl:'/god' },

      // Login
      { id:'user_logged', label:'Utente loggato', description:'Un membro del team è selezionato', category:'Login',
        status: currentMember ? 'ok' : 'warn',
        detail: currentMember ? `Loggato come: ${currentMember.fullName} (${role})` : 'Nessun utente — clicca il tuo nome in alto a destra',
        fix: !currentMember ? 'Clicca sull\'avatar in alto a destra per selezionare il tuo profilo' : undefined },
      { id:'god_access', label:'Accesso GOD Mode', description:'Solo Mattia, Mario e Valentina', category:'Login',
        status: currentMember ? (isGodUser(currentMember.fullName) ? 'ok' : 'idle') : 'idle',
        detail: currentMember ? (isGodUser(currentMember.fullName) ? `${currentMember.fullName} ha accesso GOD Mode ✓` : `${currentMember.fullName} non ha accesso GOD Mode`) : 'Fai il login per verificare' },

      // Dati
      { id:'team', label:'Team configurato', description:'Membri del team presenti', category:'Dati',
        status: data.teamMembers.length > 0 ? 'ok' : 'warn',
        detail: data.teamMembers.length > 0 ? `${data.teamMembers.length} membri: ${data.teamMembers.map(m=>m.fullName).join(', ')}` : 'Nessun membro — il team dovrebbe essere pre-caricato',
        fix: data.teamMembers.length === 0 ? 'Svuota il localStorage e ricarica per ripristinare i dati di default' : undefined },
      { id:'clients', label:'Clienti presenti', description:'Almeno un cliente attivo', category:'Dati',
        status: data.clients.length > 0 ? 'ok' : 'warn',
        detail: data.clients.length > 0 ? `${data.clients.length} clienti caricati` : 'Nessun cliente — importa da Excel o crea il primo cliente',
        fix: data.clients.length === 0 ? 'Vai su Clienti → Onboarding oppure importa da Excel' : undefined, fixUrl: data.clients.length===0 ? '/onboarding' : undefined },
      { id:'localstorage', label:'LocalStorage', description:'Il browser salva i dati', category:'Dati',
        status: lsOk ? 'ok' : 'error',
        detail: lsOk ? 'LocalStorage funzionante ✓' : 'LocalStorage non disponibile — i dati non vengono salvati',
        fix: !lsOk ? 'Assicurati di non essere in modalità privata/incognito' : undefined },
      { id:'storage_size', label:'Spazio storage usato', description:'Dati PMO nel browser', category:'Dati',
        status: storageKB > 4000 ? 'warn' : 'ok',
        detail: `Dati PMO: ~${storageKB} KB su ~5000 KB disponibili`,
        fix: storageKB > 4000 ? 'Esporta i dati in Excel e considera di svuotare il localStorage' : undefined },

      // Drive
      { id:'drive_links', label:'Drive link clienti', description:'Cartelle Drive collegate ai clienti', category:'Drive',
        status: (() => { if(data.clients.length===0) return 'idle'; const w=data.clients.filter(c=>c.driveLink).length; return w===data.clients.length?'ok':'warn'; })(),
        detail: (() => { const t=data.clients.length; const w=data.clients.filter(c=>c.driveLink).length; if(t===0) return 'Nessun cliente'; const missing=data.clients.filter(c=>!c.driveLink).map(c=>c.name).join(', '); return `${w}/${t} clienti con Drive${missing?` — Mancanti: ${missing}`:''}` })(),
        fix: 'Scheda cliente → pulsante 📁 Drive → incolla il link della cartella Google Drive' },

      // App
      { id:'sw', label:'Service Worker (PWA)', description:'App installabile su telefono', category:'App',
        status: typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'ok' : 'warn',
        detail: typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'Service Worker attivo — app installabile su iPhone/Android' : 'Service Worker non supportato da questo browser' },
      { id:'pwa', label:'PWA installata', description:'Aperta come app nativa', category:'App',
        status: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches ? 'ok' : 'idle',
        detail: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches ? 'App aperta in modalità standalone ✓' : 'App aperta nel browser — non ancora installata',
        fix: 'iPhone: Safari → condividi ↑ → Aggiungi alla schermata Home | Android: Chrome → menu ⋮ → Aggiungi alla schermata' },
      { id:'online', label:'Connessione internet', description:'Necessaria per le funzioni AI', category:'App',
        status: typeof window !== 'undefined' && navigator.onLine ? 'ok' : 'warn',
        detail: typeof window !== 'undefined' && navigator.onLine ? 'Online ✓ — tutte le funzioni AI disponibili' : 'Offline — funzioni AI non disponibili, dati locali sì' },
    ];
  };

  const runDiagnostics = () => {
    setRunning(true);
    setChecks(buildChecks().map(c => ({ ...c, status:'checking' as CheckStatus })));
    setTimeout(() => { setChecks(buildChecks()); setLastRun(new Date().toLocaleTimeString('it-IT')); setRunning(false); }, 900);
  };

  const testGemini = async () => {
    const key = getApiKey();
    if (!key) { setGeminiTest('error'); setGeminiMsg('Nessuna API key configurata'); return; }
    setGeminiTest('testing'); setGeminiMsg('Invio richiesta a Gemini...');
    try {
      const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{role:'user',parts:[{text:'Rispondi solo con: OK'}]}], generationConfig:{maxOutputTokens:10} }),
      });
      const d = await res.json();
      if (d.error) { setGeminiTest('error'); setGeminiMsg(`Errore API: ${d.error.message}`); return; }
      const reply = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '(vuoto)';
      setGeminiTest('ok'); setGeminiMsg(`Gemini risponde: "${reply.trim()}" — connessione funzionante ✅`);
    } catch (e:unknown) { setGeminiTest('error'); setGeminiMsg(`Errore: ${e instanceof Error ? e.message : 'sconosciuto'}`); }
  };

  useEffect(() => { runDiagnostics(); }, []);

  const categories = [...new Set(checks.map(c => c.category))];
  const filtered   = filter === 'all' ? checks : checks.filter(c => c.status === filter);
  const summary    = { ok:checks.filter(c=>c.status==='ok').length, warn:checks.filter(c=>c.status==='warn').length, error:checks.filter(c=>c.status==='error').length };
  const overall: CheckStatus = summary.error > 0 ? 'error' : summary.warn > 0 ? 'warn' : 'ok';

  return (
    <div style={{ padding:'28px 32px 80px', maxWidth:820 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:28, color:'var(--text-1)' }}>🔧 Diagnostica</h1>
          <p style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>Stato sistema MOD.PMO{lastRun && ` · Ultimo controllo: ${lastRun}`}</p>
        </div>
        <button onClick={runDiagnostics} disabled={running} style={{ padding:'10px 22px', borderRadius:10, border:'1px solid var(--border2)', background:running?'var(--surface2)':'var(--brand)', color:running?'var(--text-3)':'white', cursor:running?'default':'pointer', fontSize:13, fontWeight:700 }}>
          {running ? '⏳ Controllo...' : '🔄 Riesegui'}
        </button>
      </div>

      {/* Sommario */}
      {!running && checks.length > 0 && (
        <div style={{ padding:'16px 20px', borderRadius:14, marginBottom:24, background:`${S_COLOR[overall]}10`, border:`2px solid ${S_COLOR[overall]}44`, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <span style={{ fontSize:28 }}>{S_ICON[overall]}</span>
          <p style={{ flex:1, fontSize:15, fontWeight:700, color:S_COLOR[overall] }}>
            {overall==='ok' ? 'Tutto funziona correttamente' : overall==='warn' ? `${summary.warn} avvis${summary.warn===1?'o':'i'} — funziona con limitazioni` : `${summary.error} error${summary.error===1?'e':'i'} critic${summary.error===1?'o':'i'} da risolvere`}
          </p>
          <div style={{ display:'flex', gap:16 }}>
            {([['ok','✅','OK'],['warn','⚠️','Avvisi'],['error','❌','Errori']] as [string,string,string][]).map(([s,icon,label]) => (
              <div key={s} style={{ textAlign:'center' }}>
                <p style={{ fontSize:20, fontWeight:800, color:S_COLOR[s as CheckStatus] }}>{summary[s as 'ok'|'warn'|'error']}</p>
                <p style={{ fontSize:10, color:'var(--text-3)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtri */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {(['all','error','warn','ok'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:filter===f?(f==='all'?'var(--brand)':S_COLOR[f]):'var(--surface2)', color:filter===f?'white':'var(--text-3)' }}>
            {f==='all'?'Tutti':f==='error'?'❌ Errori':f==='warn'?'⚠️ Avvisi':'✅ OK'}
          </button>
        ))}
      </div>

      {/* Checks */}
      {categories.map(cat => {
        const catChecks = filtered.filter(c => c.category === cat);
        if (!catChecks.length) return null;
        return (
          <div key={cat} style={{ marginBottom:20 }}>
            <p style={{ fontSize:11, fontWeight:800, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:8 }}>{cat}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {catChecks.map(check => (
                <div key={check.id} style={{ background:'var(--surface)', border:`1px solid ${S_COLOR[check.status]}33`, borderLeft:`3px solid ${S_COLOR[check.status]}`, borderRadius:10, padding:'12px 16px', opacity:check.status==='idle'?0.5:1 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <span style={{ fontSize:16, marginTop:1, flexShrink:0 }}>{S_ICON[check.status]}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{check.label}</p>
                        <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:`${S_COLOR[check.status]}15`, color:S_COLOR[check.status], fontWeight:700 }}>{check.status.toUpperCase()}</span>
                      </div>
                      <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:check.detail?4:0 }}>{check.description}</p>
                      {check.detail && <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>{check.detail}</p>}
                      {check.fix && (
                        <div style={{ marginTop:8, padding:'8px 12px', borderRadius:7, background:`${S_COLOR[check.status]}08`, border:`1px dashed ${S_COLOR[check.status]}44` }}>
                          <p style={{ fontSize:11, color:S_COLOR[check.status], fontWeight:600, marginBottom:3 }}>💡 Come risolvere</p>
                          <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>{check.fix}</p>
                          {check.fixUrl && <a href={check.fixUrl} style={{ display:'inline-block', marginTop:4, fontSize:11, color:S_COLOR[check.status], fontWeight:700, textDecoration:'none' }}>→ Vai alla pagina ↗</a>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Test live Gemini */}
      <div style={{ marginTop:28, background:'var(--surface)', border:'1px solid rgba(66,133,244,0.3)', borderRadius:14, padding:'20px 22px' }}>
        <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:6 }}>🧪 Test API Gemini in tempo reale</p>
        <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:14 }}>Invia una richiesta reale a Gemini per verificare che la key funzioni davvero.</p>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={testGemini} disabled={geminiTest==='testing'} style={{ padding:'10px 22px', borderRadius:10, border:'none', cursor:geminiTest==='testing'?'default':'pointer', background:geminiTest==='ok'?'#4ade80':geminiTest==='error'?'#f87171':'#4285F4', color:'white', fontSize:13, fontWeight:700 }}>
            {geminiTest==='testing'?'⏳ Testing...':geminiTest==='ok'?'✅ Funziona!':geminiTest==='error'?'❌ Riprova':'🧪 Testa connessione Gemini'}
          </button>
          {geminiMsg && <p style={{ fontSize:12, color:'var(--text-2)', flex:1 }}>{geminiMsg}</p>}
        </div>
      </div>

      {/* Info sistema */}
      <div style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:11, color:'var(--text-3)', lineHeight:1.8 }}>
        <strong style={{ color:'var(--text-2)' }}>Info sistema:</strong>{' '}
        Ruolo: {role} · Clienti: {data.clients.length} · Task: {data.tasks.length} · Team: {data.teamMembers.length} ·{' '}
        Storage: {(() => { try { let t=0; for(const k of Object.keys(localStorage)) if(k.startsWith('pmo_')) t+=(localStorage.getItem(k)??'').length; return `~${Math.round(t/1024)}KB`; } catch { return 'N/A'; } })()}
      </div>
    </div>
  );
}
