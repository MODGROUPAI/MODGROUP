'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import {
  GOD_FEATURES, GOD_USERS, isGodUser,
  getAllFeatureStates, saveGodFeatures,
} from '@/lib/godMode';
import { useRole } from '@/hooks/useRole';

const GROUPS = [...new Set(GOD_FEATURES.map(f => f.group))];

const GROUP_COLOR: Record<string, string> = {
  'Formazione':  '#F88379',
  'Commerciale': '#D4AF37',
  'Operativo':   '#60a5fa',
  'AI':          '#a855f7',
  'Condivisione':'#4ade80',
  'Sistema':     '#6b7280',
};

function Toggle({ on, onChange, color = '#4ade80', size = 'md' }: {
  on: boolean; onChange: () => void; color?: string; size?: 'sm' | 'md' | 'lg';
}) {
  const dims = { sm: [28,16,10,3], md: [40,22,14,3], lg: [52,28,18,4] }[size];
  return (
    <div onClick={onChange} style={{
      width: dims[0], height: dims[1], borderRadius: dims[1]/2, cursor: 'pointer', flexShrink: 0,
      background: on ? color : 'var(--surface3)',
      border: `1px solid ${on ? color : 'var(--border)'}`,
      position: 'relative', transition: 'all 200ms',
    }}>
      <div style={{
        position: 'absolute', top: dims[3], left: on ? dims[0] - dims[2] - dims[3] : dims[3],
        width: dims[2], height: dims[2], borderRadius: '50%',
        background: 'white', transition: 'left 200ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
      }} />
    </div>
  );
}

export default function GodPage() {
  const router        = useRouter();
  const { data }      = useData();
  const { role }      = useRole();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking]     = useState(true);
  const [features, setFeatures]     = useState<Record<string, boolean>>({});
  const [saved, setSaved]           = useState(false);
  const [filter, setFilter]         = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [apiKey, setApiKey]             = useState('');
  const [apiKeySaved, setApiKeySaved]   = useState(false);
  const [showKey, setShowKey]           = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pmo_gemini_key') ?? '';
    setApiKey(stored);
  }, []);

  const saveApiKey = () => {
    localStorage.setItem('pmo_gemini_key', apiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  useEffect(() => {
    // Controlla autorizzazione
    const storedMemberId = localStorage.getItem('pmo_current_member');
    const member = data.teamMembers.find(m => m.id === storedMemberId);
    const auth = member ? isGodUser(member.fullName) : false;
    setAuthorized(auth);
    setChecking(false);
    if (auth) setFeatures(getAllFeatureStates());
  }, [data.teamMembers]);

  const toggle = (id: string) => {
    setFeatures(f => ({ ...f, [id]: !f[id] }));
    setSaved(false);
  };

  const toggleGroup = (group: string, val: boolean) => {
    const ids = GOD_FEATURES.filter(f => f.group === group).map(f => f.id);
    setFeatures(f => ({ ...f, ...Object.fromEntries(ids.map(id => [id, val])) }));
    setSaved(false);
  };

  const save = () => {
    saveGodFeatures(features);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const resetAll = () => {
    const defaults = Object.fromEntries(GOD_FEATURES.map(f => [f.id, f.defaultOn]));
    setFeatures(defaults);
    saveGodFeatures(defaults);
    setConfirmReset(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledCount  = Object.values(features).filter(Boolean).length;
  const disabledCount = GOD_FEATURES.length - enabledCount;

  const filteredFeatures = filter
    ? GOD_FEATURES.filter(f => f.label.toLowerCase().includes(filter.toLowerCase()) || f.description.toLowerCase().includes(filter.toLowerCase()))
    : GOD_FEATURES;

  // ── Auth check ──────────────────────────────────────────────────────────────
  if (checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', color:'var(--text-3)' }}>
      <p>Verifica accesso...</p>
    </div>
  );

  if (!authorized) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:16 }}>
      <div style={{ fontSize:64 }}>🔒</div>
      <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)' }}>Accesso negato</h1>
      <p style={{ fontSize:16, color:'var(--text-3)', textAlign:'center', maxWidth:320 }}>
        Questa area è riservata agli amministratori di sistema.<br/>
        Accesso consentito a: Mattia Brumana, Mario Valerio, Valentina Maccarelli.
      </p>
      <p style={{ fontSize:14, color:'var(--text-3)' }}>
        Seleziona il tuo profilo dal selettore in topbar, poi riprova.
      </p>
      <button onClick={() => router.push('/')} style={{ padding:'10px 24px', borderRadius:10, background:'var(--brand)', color:'white', border:'none', cursor:'pointer', fontWeight:700 }}>
        ← Torna alla home
      </button>
    </div>
  );

  // ── GOD MODE UI ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'28px 32px 80px', maxWidth:1000 }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <span style={{ fontSize:28 }}>⚡</span>
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:28, color:'var(--text-1)', lineHeight:1 }}>
              GOD Mode
            </h1>
            <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
              Controllo master di tutte le feature — solo per amministratori
            </p>
          </div>
        </div>

        {/* Status strip */}
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
          <div style={{ padding:'8px 16px', borderRadius:20, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)', fontSize:14, fontWeight:600, color:'#4ade80' }}>
            ✅ {enabledCount} attive
          </div>
          <div style={{ padding:'8px 16px', borderRadius:20, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', fontSize:14, fontWeight:600, color:'#f87171' }}>
            ⛔ {disabledCount} disabilitate
          </div>
          <div style={{ padding:'8px 16px', borderRadius:20, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:14, fontWeight:600, color:'var(--text-3)' }}>
            📦 {GOD_FEATURES.length} feature totali
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
        <input
          value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="🔍 Cerca feature..."
          style={{ padding:'9px 14px', borderRadius:9, fontSize:14, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text-1)', outline:'none', flex:1, maxWidth:300 }}
        />
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={() => setConfirmReset(true)} style={{ padding:'8px 16px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-3)', cursor:'pointer' }}>
            🔄 Reset defaults
          </button>
          <button onClick={save} style={{
            padding:'9px 24px', borderRadius:9, fontSize:15, fontWeight:700, border:'none',
            cursor:'pointer', background:saved?'#4ade80':'var(--brand)', color:'white', transition:'background 300ms',
            boxShadow: saved ? 'none' : '0 4px 16px rgba(242,101,34,0.3)',
          }}>
            {saved ? '✓ Salvato!' : '💾 Salva tutto'}
          </button>
        </div>
      </div>

      {/* ── Sezione API Keys ── */}
      <div style={{ background:'var(--surface)', border:'1px solid rgba(66,133,244,0.3)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'14px 20px', background:'rgba(66,133,244,0.06)', borderBottom:'1px solid rgba(66,133,244,0.2)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#4285F4' }} />
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>🔑 API Keys — AI Provider</p>
          <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:'rgba(66,133,244,0.15)', color:'#4285F4', fontWeight:700 }}>Gemini · Gratis</span>
        </div>
        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:18 }}>

          {/* Gemini — Primary */}
          <div style={{ padding:'16px', borderRadius:12, background:'rgba(66,133,244,0.05)', border:'1px solid rgba(66,133,244,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:14, fontWeight:800, color:'#4285F4' }}>Google Gemini</span>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'rgba(74,222,128,0.15)', color:'#4ade80', fontWeight:700 }}>✓ GRATUITO · PRIMARIO</span>
            </div>
            <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:10, lineHeight:1.6 }}>
              Ottieni su <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style={{ color:'#4285F4' }}>aistudio.google.com</a> → Get API Key → accedi con <strong>m.brumana@modgroup.it</strong>
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid rgba(66,133,244,0.3)', background:'var(--surface2)', color:'var(--text-1)', fontSize:13, outline:'none', fontFamily:'monospace' }}
              />
              <button onClick={() => setShowKey(s => !s)} style={{ padding:'9px 12px', borderRadius:8, border:'1px solid var(--border2)', background:'none', cursor:'pointer', fontSize:16, color:'var(--text-3)' }}>
                {showKey ? '🙈' : '👁'}
              </button>
              <button onClick={saveApiKey} style={{ padding:'9px 18px', borderRadius:8, border:'none', cursor:'pointer', background:apiKeySaved?'#4ade80':'#4285F4', color:'white', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>
                {apiKeySaved ? '✓ Salvata!' : '💾 Salva'}
              </button>
            </div>
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: apiKey ? '#4ade80' : '#f87171' }} />
              <span style={{ fontSize:12, color: apiKey ? '#4ade80' : '#f87171', fontWeight:600 }}>
                {apiKey ? `Gemini attivo — Ambrogio e MOD Briefing operativi · ${apiKey.slice(0,8)}...` : 'Key non configurata — funzioni AI disabilitate'}
              </span>
            </div>
          </div>

          {/* Claude — Fallback */}
          <div style={{ padding:'16px', borderRadius:12, background:'var(--surface2)', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-2)' }}>Anthropic Claude</span>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'var(--surface3)', color:'var(--text-3)', fontWeight:700 }}>FALLBACK — OPZIONALE</span>
            </div>
            <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.6 }}>
              Usato automaticamente solo se la key Gemini non è configurata.{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color:'#D4AF37' }}>console.anthropic.com</a>
            </p>
          </div>

          <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5 }}>
            🔒 Le key vengono salvate solo in locale su questo browser (localStorage) — non vengono mai trasmesse a server esterni.
          </p>
        </div>
      </div>

      {/* Feature per gruppo */}
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {GROUPS.map(group => {
          const groupFeatures = filteredFeatures.filter(f => f.group === group);
          if (groupFeatures.length === 0) return null;
          const color     = GROUP_COLOR[group] ?? 'var(--brand)';
          const allOn     = groupFeatures.every(f => features[f.id] !== false);
          const someOff   = groupFeatures.some(f => features[f.id] === false);

          return (
            <div key={group} style={{ background:'var(--surface)', border:`1px solid ${color}22`, borderRadius:16, overflow:'hidden' }}>

              {/* Header gruppo */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:`${color}08`, borderBottom:`1px solid ${color}22` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>{group}</p>
                  <span style={{ fontSize:13, color:'var(--text-3)', padding:'2px 8px', borderRadius:20, background:'var(--surface2)' }}>
                    {groupFeatures.filter(f => features[f.id] !== false).length}/{groupFeatures.length}
                  </span>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={() => toggleGroup(group, true)} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:`1px solid ${color}44`, background:`${color}08`, color, cursor:'pointer', fontWeight:600 }}>
                    Tutto ON
                  </button>
                  <button onClick={() => toggleGroup(group, false)} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.06)', color:'#f87171', cursor:'pointer', fontWeight:600 }}>
                    Tutto OFF
                  </button>
                </div>
              </div>

              {/* Feature del gruppo */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:0 }}>
                {groupFeatures.map((feature, fi) => {
                  const isOn = features[feature.id] !== false;
                  return (
                    <div key={feature.id} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
                      borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)',
                      background: isOn ? 'transparent' : 'rgba(248,113,113,0.03)',
                      transition:'background 150ms',
                    }}>
                      <span style={{ fontSize:20, flexShrink:0 }}>{feature.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:14, fontWeight:600, color: isOn ? 'var(--text-1)' : 'var(--text-3)', lineHeight:1.3 }}>
                          {feature.label}
                        </p>
                        <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2, lineHeight:1.3 }}>{feature.description}</p>
                      </div>
                      <Toggle on={isOn} onChange={() => toggle(feature.id)} color={color} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning se molte feature disabilitate */}
      {disabledCount > 5 && (
        <div style={{ marginTop:20, padding:'12px 16px', borderRadius:10, background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.3)', fontSize:14, color:'#fbbf24' }}>
          ⚠️ {disabledCount} feature disabilitate — ricorda di salvare per applicare le modifiche.
        </div>
      )}

      {/* Conferma reset */}
      {confirmReset && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={() => setConfirmReset(false)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:501, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, padding:'28px', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.7)', textAlign:'center' }}>
            <p style={{ fontSize:36, marginBottom:12 }}>🔄</p>
            <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Reset ai default?</h3>
            <p style={{ fontSize:15, color:'var(--text-3)', marginBottom:24 }}>
              Tutte le feature torneranno allo stato originale — tutto ON. Le modifiche attuali andranno perse.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmReset(false)} style={{ flex:1, padding:'10px', borderRadius:9, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer', fontWeight:600 }}>Annulla</button>
              <button onClick={resetAll} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'var(--brand)', color:'white', cursor:'pointer', fontWeight:700 }}>Conferma reset</button>
            </div>
          </div>
        </>
      )}

      {/* Salva in fondo */}
      <div style={{ position:'fixed', bottom:24, right:32, display:'flex', gap:10 }}>
        <button onClick={save} style={{
          padding:'12px 28px', borderRadius:12, fontSize:16, fontWeight:700, border:'none',
          cursor:'pointer', background:saved?'#4ade80':'var(--brand)', color:'white',
          boxShadow:saved?'none':'0 6px 24px rgba(242,101,34,0.4)', transition:'all 250ms',
        }}>
          {saved ? '✓ Salvato!' : '⚡ Salva GOD Mode'}
        </button>
      </div>
    </div>
  );
}
