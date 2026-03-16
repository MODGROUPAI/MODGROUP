'use client';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';
import { callAI, getApiKey } from '@/lib/aiProvider';

import { useState, useCallback } from 'react';
import type { EditorialContent, Client } from '@/lib/types';

interface Props {
  content: EditorialContent;
  client?: Client;
  onClose: () => void;
  onSave: (updatedContent: EditorialContent) => void;
}

const MOODS = ['Lusso / Elegante','Caldo / Accogliente','Fresco / Estivo','Minimal / Clean','Vivace / Colorato','Drammatico / Dark','Naturale / Organico','Moderno / Tech'];
const REFS  = ['Foto prodotto','Foto ambiente','Ritratto / People','Dietro le quinte','User Generated Content','Grafica / Illustrazione','Mix foto + grafica'];

export function CreativeBriefModal({ content, client, onClose, onSave }: Props) {
  const [loading, setLoading]   = useState(false);
  const [brief, setBrief]       = useState('');
  const [copied, setCopied]     = useState(false);

  // Campi editabili del brief
  const [visualMood,    setVisualMood]    = useState('');
  const [visualRef,     setVisualRef]     = useState('');
  const [colorPalette,  setColorPalette]  = useState(client?.marketingBrief?.visualStyle ?? '');
  const [shootingNotes, setShootingNotes] = useState(content.visualNotes ?? '');
  const [formatSpec,    setFormatSpec]    = useState('');

  const mb = client?.marketingBrief;

  const generate = useCallback(async () => {
    setLoading(true);
    setBrief('');

    const systemPrompt = `Sei un art director creativo di un'agenzia di marketing italiana.
Scrivi brief creativi precisi e ispirati per il team di produzione (grafici, fotografi, videomaker).
Usa un linguaggio visivo concreto. Sii specifico su composizione, colori, atmosfera, testo in sovraimpressione.
Rispondi SOLO con il testo del brief, senza preamble.`;

    const userMsg = `Scrivi un brief creativo per questo contenuto social:

CLIENTE: ${client?.name ?? 'n.d.'} (settore: ${client?.sector ?? 'n.d.'})
PIATTAFORMA: ${content.platform}
FORMATO: ${content.format}
DATA PUBBLICAZIONE: ${content.scheduledDate}
TOPIC / TEMA: ${content.caption?.slice(0, 150) ?? content.visualNotes ?? 'n.d.'}

SPECIFICHE CREATIVE RICHIESTE:
${visualMood ? `- Mood visivo: ${visualMood}` : ''}
${visualRef ? `- Tipo di contenuto visivo: ${visualRef}` : ''}
${colorPalette ? `- Palette / stile colori: ${colorPalette}` : ''}
${shootingNotes ? `- Note di partenza: ${shootingNotes}` : ''}
${formatSpec ? `- Specifiche formato/dimensioni: ${formatSpec}` : ''}

${mb ? `BRAND GUIDELINES:
- Tono visivo: ${mb.visualStyle ?? 'n.d.'}
- Non mostrare/usare: ${mb.doNotSay ?? 'nessun vincolo'}
- Stile del brand: ${mb.toneOfVoice ?? 'n.d.'}` : ''}

Il brief deve includere:
1. **Concept visivo** — idea centrale in 1-2 righe
2. **Composizione** — inquadratura, soggetto principale, sfondo, elementi
3. **Colori e atmosfera** — palette specifica, mood, luce
4. **Testo in sovraimpressione** — font, posizione, copy da usare (se applicabile)
5. **Specifiche tecniche** — formato, aspect ratio, durata (se video/reel)
6. **Riferimenti stilistici** — 2-3 esempi o ispirazioni concrete
7. **Da evitare** — elementi specifici da non includere`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          contents: [{ role:'user', parts:[{ text:userMsg }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
        }),
      });
      const json = await res.json();
      setBrief(json.content?.[0]?.text ?? 'Errore nella generazione.');
    } catch {
      setBrief('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [content, client, mb, visualMood, visualRef, colorPalette, shootingNotes, formatSpec]);

  const handleSave = () => {
    const fullBrief = [
      brief,
      visualMood     ? `\nMood: ${visualMood}` : '',
      visualRef      ? `\nTipo visual: ${visualRef}` : '',
      colorPalette   ? `\nPalette: ${colorPalette}` : '',
    ].filter(Boolean).join('');

    onSave({
      ...content,
      visualNotes: fullBrief || shootingNotes,
      briefChecklist: {
        textApproved:     !!content.caption,
        materialsReady:   false,
        styleRef:         !!brief,
        formatConfirmed:  !!formatSpec,
      },
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 9, fontSize: 14,
    border: '1px solid var(--border2)', background: 'var(--surface2)',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  };

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500 }} onClick={onClose} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:501, width:'100%', maxWidth:680, maxHeight:'92vh', overflowY:'auto',
        background:'var(--surface)', border:'1px solid var(--border2)',
        borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
      }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)', marginBottom:3 }}>🎨 Brief Creativo</h2>
            <p style={{ fontSize:13, color:'var(--text-3)' }}>
              {content.platform} · {content.format} · {content.scheduledDate} · {client?.name}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>

        <div style={{ padding:'18px 24px', display:'flex', flexDirection:'column', gap:18 }}>

          {/* Caption preview */}
          {content.caption && (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>📝 Copy del post</p>
              <p style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.6 }}>{content.caption.slice(0, 200)}{content.caption.length > 200 ? '...' : ''}</p>
            </div>
          )}

          {/* Specifiche creative */}
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>🎯 Specifiche per l'AI</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Mood visivo</label>
                <select style={{ ...inputStyle, cursor:'pointer' }} value={visualMood} onChange={e => setVisualMood(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {MOODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Tipo visual</label>
                <select style={{ ...inputStyle, cursor:'pointer' }} value={visualRef} onChange={e => setVisualRef(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {REFS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Palette / colori brand</label>
                <input style={inputStyle} value={colorPalette} onChange={e => setColorPalette(e.target.value)} placeholder="Es. tonalità calde, beige, bianco..." />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Specifiche formato</label>
                <input style={inputStyle} value={formatSpec} onChange={e => setFormatSpec(e.target.value)} placeholder="Es. 9:16, 30 sec, sottotitoli..." />
              </div>
              <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Note aggiuntive per il creativo</label>
                <textarea style={{ ...inputStyle, minHeight:60, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
                  value={shootingNotes} onChange={e => setShootingNotes(e.target.value)}
                  placeholder="Es. usa location interna, evita persone, include logo in basso a destra..." />
              </div>
            </div>
          </div>

          {/* Genera */}
          <button onClick={generate} disabled={loading} style={{
            width:'100%', padding:'11px', borderRadius:10, fontSize:15, fontWeight:700, border:'none',
            cursor:loading?'wait':'pointer',
            background:loading?'var(--surface3)':'var(--brand)',
            color:loading?'var(--text-3)':'white',
            boxShadow:!loading?'0 4px 16px rgba(242,101,34,0.3)':'none',
          }}>
            {loading ? '⏳ Generazione brief...' : brief ? '🔄 Rigenera' : '✨ Genera brief creativo con AI'}
          </button>

          {/* Output brief */}
          {(loading || brief) && (
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--brand)' }}>🎨 Brief generato</p>
                {brief && !loading && (
                  <button onClick={() => { navigator.clipboard.writeText(brief); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                    style={{ fontSize:12, padding:'4px 12px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:copied?'#4ade80':'var(--text-3)', cursor:'pointer' }}>
                    {copied ? '✓ Copiato' : '📋 Copia'}
                  </button>
                )}
              </div>
              <div style={{ padding:'16px', minHeight:100 }}>
                {loading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[85,60,75,50,80,40,65].map((w,i) => (
                      <div key={i} style={{ height:11, borderRadius:5, background:'var(--surface3)', width:`${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{brief}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:10, position:'sticky', bottom:0, background:'var(--surface)' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, fontSize:14, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={!brief} style={{
            flex:1, padding:'9px', borderRadius:9, fontSize:14, fontWeight:700, border:'none',
            cursor:brief?'pointer':'not-allowed',
            background:brief?'var(--brand)':'var(--surface3)',
            color:brief?'white':'var(--text-3)',
          }}>
            💾 Salva brief nel contenuto
          </button>
        </div>
      </div>
    </>
  );
}
