'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// La dashboard condivisibile decodifica i dati dal token (base64 dei dati del cliente)
// e mostra una view pubblica senza accesso al resto dell'app

interface SharedData {
  clientName: string;
  sector?: string;
  responsible?: string;
  generatedAt: string;
  // Task
  openTasks: number;
  overdueTasks: number;
  completedTasks: number;
  dueSoonTasks: { title: string; dueDate: string }[];
  // Editoriale
  publishedThisMonth: number;
  plannedThisMonth: number;
  inReview: number;
  blocked: number;
  upcomingContent: { platform: string; format: string; scheduledDate: string; status: string }[];
  // Budget
  hoursLogged: number;
  budgetOre?: number;
  budgetEuro?: number;
  budgetPct?: number;
  // Stato
  health: 'green' | 'yellow' | 'red';
  healthLabel: string;
  notes?: string;
  // Branding
  accountName?: string;
}

const HEALTH_COLOR = { green:'#22c55e', yellow:'#f59e0b', red:'#ef4444' };
const HEALTH_BG    = { green:'#f0fdf4', yellow:'#fffbeb', red:'#fef2f2' };
const PLATFORM_EMOJI: Record<string,string> = {
  Instagram:'📸', Facebook:'👥', LinkedIn:'💼', TikTok:'🎵', YouTube:'▶️', Pinterest:'📌', Altro:'🌐',
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]   = useState<SharedData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const decoded = atob(decodeURIComponent(token));
      const parsed  = JSON.parse(decoded) as SharedData;
      setData(parsed);
    } catch {
      setError(true);
    }
  }, [token]);

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', background:'#f9fafb' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <p style={{ fontSize:48, marginBottom:16 }}>🔗</p>
        <h1 style={{ fontSize:20, fontWeight:700, color:'#1a1a1a', marginBottom:8 }}>Link non valido</h1>
        <p style={{ color:'#888', fontSize:16 }}>Il link potrebbe essere scaduto o non corretto.</p>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <p style={{ color:'#888', fontFamily:'Arial,sans-serif' }}>Caricamento...</p>
    </div>
  );

  const hc = HEALTH_COLOR[data.health];
  const hb = HEALTH_BG[data.health];
  const month = new Date().toLocaleDateString('it-IT', { month:'long', year:'numeric' });

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#1a1a1a', padding:'20px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-0.5px' }}>
            MOD<span style={{ color:'#F26522' }}>.</span>Group
          </div>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.2)' }} />
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'2px' }}>
            Report Cliente
          </div>
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>
          Aggiornato: {new Date(data.generatedAt).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 24px' }}>

        {/* Cliente header */}
        <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <h1 style={{ fontSize:28, fontWeight:800, color:'#1a1a1a', marginBottom:6 }}>{data.clientName}</h1>
              <p style={{ fontSize:16, color:'#888' }}>
                {[data.sector, data.responsible ? `Account: ${data.responsible}` : null].filter(Boolean).join(' · ')}
              </p>
              <p style={{ fontSize:14, color:'#aaa', marginTop:4 }}>{month}</p>
            </div>
            <div style={{ padding:'12px 20px', borderRadius:12, background:hb, border:`2px solid ${hc}33`, textAlign:'center' }}>
              <p style={{ fontSize:22, marginBottom:4 }}>{data.health==='green'?'✅':data.health==='yellow'?'🟡':'🔴'}</p>
              <p style={{ fontSize:14, fontWeight:700, color:hc }}>{data.healthLabel}</p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Task aperti',      val:data.openTasks,          sub: data.overdueTasks>0?`${data.overdueTasks} in ritardo`:'in regola', color: data.overdueTasks>0?'#ef4444':'#22c55e' },
            { label:'Completati',       val:data.completedTasks,     sub:'questo mese',       color:'#22c55e' },
            { label:'Pubblicati',       val:data.publishedThisMonth, sub:`su ${data.plannedThisMonth} pianificati`, color:'#3b82f6' },
            { label:'In revisione',     val:data.inReview,           sub:'in attesa feedback', color:'#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize:13, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{k.label}</p>
              <p style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</p>
              <p style={{ fontSize:13, color:'#aaa', marginTop:4 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Budget ore */}
        {data.budgetOre && (
          <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>⏱ Budget Ore</p>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:16, color:'#1a1a1a' }}>{data.hoursLogged.toFixed(1)}h lavorate su {data.budgetOre}h preventivate</span>
              <span style={{ fontSize:18, fontWeight:800, color: (data.budgetPct??0)>=90?'#ef4444':(data.budgetPct??0)>=70?'#f59e0b':'#22c55e' }}>
                {data.budgetPct}%
              </span>
            </div>
            <div style={{ height:10, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
              <div style={{
                height:'100%',
                width:`${Math.min(data.budgetPct??0,100)}%`,
                background: (data.budgetPct??0)>=90?'#ef4444':(data.budgetPct??0)>=70?'#f59e0b':'#22c55e',
                borderRadius:5, transition:'width 600ms ease',
              }} />
            </div>
            {data.budgetEuro && (
              <p style={{ fontSize:13, color:'#aaa', marginTop:8 }}>
                Budget economico: €{data.budgetEuro.toLocaleString('it-IT')}
              </p>
            )}
          </div>
        )}

        {/* Prossimi contenuti */}
        {data.upcomingContent.length > 0 && (
          <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>📅 Piano contenuti del mese</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {data.upcomingContent.map((c, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', borderRadius:10, background:'#f9fafb', border:'1px solid #f0f0f0' }}>
                  <span style={{ fontSize:20 }}>{PLATFORM_EMOJI[c.platform] ?? '📄'}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15, fontWeight:600, color:'#1a1a1a' }}>{c.platform} · {c.format}</p>
                    <p style={{ fontSize:13, color:'#888' }}>{c.scheduledDate}</p>
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, padding:'3px 10px', borderRadius:20,
                    background: c.status==='Pubblicato'?'#f0fdf4':c.status==='In revisione'?'#fffbeb':c.status==='Bloccato'?'#fef2f2':'#f1f5f9',
                    color:       c.status==='Pubblicato'?'#16a34a':c.status==='In revisione'?'#b45309':c.status==='Bloccato'?'#dc2626':'#64748b',
                  }}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task in scadenza */}
        {data.dueSoonTasks.length > 0 && (
          <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>📌 Attività in corso</p>
            {data.dueSoonTasks.map((t, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i<data.dueSoonTasks.length-1?'1px solid #f0f0f0':'none' }}>
                <span style={{ fontSize:15, color:'#1a1a1a' }}>{t.title}</span>
                <span style={{ fontSize:14, color:'#888' }}>Scadenza: {t.dueDate}</span>
              </div>
            ))}
          </div>
        )}

        {/* Note account */}
        {data.notes && (
          <div style={{ background:'#fff7f3', border:'2px solid #F26522', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'#F26522', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>📝 Note dal tuo account manager</p>
            <p style={{ fontSize:16, color:'#1a1a1a', lineHeight:1.7 }}>{data.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', padding:'24px 0', borderTop:'1px solid #e5e7eb' }}>
          <p style={{ fontSize:15, fontWeight:800, color:'#1a1a1a', marginBottom:4 }}>
            MOD<span style={{ color:'#F26522' }}>.</span>Group
          </p>
          <p style={{ fontSize:13, color:'#aaa' }}>
            {data.accountName ? `Il tuo account manager: ${data.accountName}` : 'modgroup.it'}
          </p>
          <p style={{ fontSize:12, color:'#ccc', marginTop:8 }}>
            Questo report è riservato e generato il {new Date(data.generatedAt).toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>
    </div>
  );
}
