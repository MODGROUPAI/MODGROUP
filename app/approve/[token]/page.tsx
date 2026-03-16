'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAppData, updateAppData } from '@/lib/store';
import type { EditorialContent } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram:'📸', Facebook:'👥', LinkedIn:'💼', TikTok:'🎵',
  YouTube:'▶️', Pinterest:'📌', Altro:'🌐',
};

export default function ApprovePage() {
  const { token } = useParams<{ token: string }>();
  const [content, setContent]   = useState<EditorialContent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [name, setName]         = useState('');
  const [submitted, setSubmitted] = useState<'approved' | 'changes_requested' | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const data = getAppData();
    if (!data) { setNotFound(true); return; }
    const found = data.editorialContent.find(c => c.approvalToken === token);
    if (!found) { setNotFound(true); return; }
    setContent(found);
    if (found.approvalStatus === 'approved') setSubmitted('approved');
    if (found.approvalStatus === 'changes_requested') setSubmitted('changes_requested');
  }, [token]);

  const respond = (action: 'approved' | 'changes_requested') => {
    if (!content) return;
    setLoading(true);
    const now = new Date().toISOString().slice(0, 10);
    const revision = {
      id: `REV${Date.now()}`,
      date: now,
      action,
      note: feedback || undefined,
      by: name || 'Cliente',
    };
    const updated: EditorialContent = {
      ...content,
      approvalStatus:      action,
      approvalRespondedAt: now,
      clientFeedback:      feedback || undefined,
      clientName2:         name || undefined,
      status:              action === 'approved' ? 'Approvato' : 'In revisione',
      revisionHistory:     [...(content.revisionHistory ?? []), revision],
    };
    const data = getAppData();
    if (data) {
      updateAppData({
        editorialContent: data.editorialContent.map(c =>
          c.id === content.id ? updated : c
        ),
      });
    }
    setSubmitted(action);
    setLoading(false);
  };

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', background:'#f9fafb' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <p style={{ fontSize:48, marginBottom:16 }}>🔗</p>
        <h1 style={{ fontSize:20, fontWeight:700, color:'#1a1a1a', marginBottom:8 }}>Link non valido</h1>
        <p style={{ color:'#888', fontSize:16 }}>Il link potrebbe essere scaduto o non corretto.</p>
      </div>
    </div>
  );

  if (!content) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <p style={{ color:'#888', fontFamily:'Arial,sans-serif' }}>Caricamento...</p>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', background:'#f9fafb' }}>
      <div style={{ textAlign:'center', padding:48, maxWidth:440 }}>
        <p style={{ fontSize:56, marginBottom:20 }}>{submitted === 'approved' ? '✅' : '💬'}</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a1a', marginBottom:12 }}>
          {submitted === 'approved' ? 'Contenuto approvato!' : 'Modifica richiesta inviata'}
        </h1>
        <p style={{ fontSize:17, color:'#888', lineHeight:1.6 }}>
          {submitted === 'approved'
            ? 'Grazie! Il tuo account manager MOD Group è stato notificato e procederà con la pubblicazione.'
            : 'Grazie per il feedback! Il team MOD Group lo riceverà e provvederà alle modifiche richieste.'}
        </p>
        <div style={{ marginTop:32, padding:'16px 20px', borderRadius:12, background:'#fff', border:'1px solid #e5e7eb' }}>
          <p style={{ fontSize:14, color:'#aaa' }}>MOD Group · modgroup.it</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:"'Helvetica Neue', Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#1a1a1a', padding:'18px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:17, fontWeight:900, color:'#fff', letterSpacing:'-0.5px' }}>
          MOD<span style={{ color:'#F26522' }}>.</span>Group
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'2px' }}>
          Richiesta di approvazione
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'40px 24px 60px' }}>

        {/* Intro */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#1a1a1a', marginBottom:8 }}>
            Revisione contenuto
          </h1>
          <p style={{ fontSize:17, color:'#666', lineHeight:1.6 }}>
            Il team MOD Group ti chiede di revisionare questo contenuto prima della pubblicazione.
            Puoi approvarlo o richiedere modifiche.
          </p>
        </div>

        {/* Card contenuto */}
        <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.08)' }}>

          {/* Header contenuto */}
          <div style={{ background:'#f9fafb', padding:'16px 24px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>{PLATFORM_EMOJI[content.platform] ?? '📄'}</span>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>{content.platform} · {content.format}</p>
              <p style={{ fontSize:14, color:'#888' }}>
                Data prevista: {content.scheduledDate}
                {content.clientName && ` · ${content.clientName}`}
              </p>
            </div>
            <div style={{ marginLeft:'auto' }}>
              <span style={{ fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:20, background:'rgba(251,191,36,0.15)', color:'#b45309' }}>
                In attesa di approvazione
              </span>
            </div>
          </div>

          {/* Caption */}
          {content.caption && (
            <div style={{ padding:'24px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                📝 Testo del post
              </p>
              <div style={{ padding:'16px 20px', borderRadius:10, background:'#f9fafb', border:'1px solid #f0f0f0', fontSize:17, color:'#1a1a1a', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                {content.caption}
              </div>
            </div>
          )}

          {/* Note visual */}
          {content.visualNotes && (
            <div style={{ padding:'0 24px 24px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                🎨 Note per il visual
              </p>
              <div style={{ padding:'14px 18px', borderRadius:10, background:'#fff7f3', border:'1px solid #fde8d8', fontSize:16, color:'#666', lineHeight:1.7 }}>
                {content.visualNotes}
              </div>
            </div>
          )}

          {/* Hashtag */}
          {content.tags && (
            <div style={{ padding:'0 24px 24px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                # Hashtag
              </p>
              <p style={{ fontSize:15, color:'#3b82f6', lineHeight:1.8 }}>{content.tags}</p>
            </div>
          )}

          {/* Link materiali */}
          {content.driveLink && (
            <div style={{ padding:'0 24px 24px' }}>
              <a href={content.driveLink} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:15, color:'#22c55e', textDecoration:'none', padding:'8px 16px', borderRadius:8, border:'1px solid rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.06)' }}>
                📁 Visualizza materiali grafici →
              </a>
            </div>
          )}
        </div>

        {/* Form risposta */}
        <div style={{ background:'#fff', borderRadius:16, padding:'28px', boxShadow:'0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'#1a1a1a', marginBottom:6 }}>La tua risposta</h2>
          <p style={{ fontSize:16, color:'#888', marginBottom:24 }}>
            Approva il contenuto o segnala le modifiche necessarie.
          </p>

          {/* Nome */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:14, fontWeight:600, color:'#666', display:'block', marginBottom:6 }}>
              Il tuo nome (opzionale)
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Es. Mario Rossi"
              style={{ width:'100%', padding:'11px 16px', borderRadius:10, border:'1px solid #e5e7eb', fontSize:16, outline:'none', boxSizing:'border-box' }} />
          </div>

          {/* Feedback */}
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:14, fontWeight:600, color:'#666', display:'block', marginBottom:6 }}>
              Note o richieste di modifica
            </label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Scrivi qui eventuali modifiche richieste o commenti sul contenuto..."
              rows={4}
              style={{ width:'100%', padding:'11px 16px', borderRadius:10, border:'1px solid #e5e7eb', fontSize:16, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          {/* Pulsanti */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <button onClick={() => respond('changes_requested')} disabled={loading}
              style={{ padding:'14px', borderRadius:12, border:'2px solid #f59e0b', background:'rgba(245,158,11,0.06)', color:'#b45309', fontWeight:700, fontSize:17, cursor:'pointer', transition:'all 150ms' }}>
              💬 Richiedi modifiche
            </button>
            <button onClick={() => respond('approved')} disabled={loading}
              style={{ padding:'14px', borderRadius:12, border:'none', background:'#22c55e', color:'white', fontWeight:700, fontSize:17, cursor:'pointer', boxShadow:'0 4px 16px rgba(34,197,94,0.3)', transition:'all 150ms' }}>
              ✅ Approvo il contenuto
            </button>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:24, fontSize:14, color:'#aaa' }}>
          MOD Group · modgroup.it — Questo link è riservato al cliente indicato.
        </p>
      </div>
    </div>
  );
}
