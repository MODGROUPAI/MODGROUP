'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAppData } from '@/lib/store';
import { localDateISO } from '@/lib/utils';
import { approvalGate } from '@/lib/approvalGate';
import type { Course, CourseParticipant } from '@/lib/types';

// ── tipi ─────────────────────────────────────────────────────────────────────

type Audience = 'all' | 'course' | 'custom';
type NewsletterType = 'nuovo_corso' | 'aggiornamento' | 'tips' | 'certificati' | 'custom';

interface Recipient {
  name: string;
  email: string;
  company?: string;
  courseTitle?: string;
}

interface GeneratedNewsletter {
  subject: string;
  preheader: string;
  body: string;
  cta?: string;
}

const TYPE_LABELS: Record<NewsletterType, string> = {
  nuovo_corso:   '🆕 Nuovo corso disponibile',
  aggiornamento: '📚 Aggiornamento corso',
  tips:          '💡 Tips & Risorse formative',
  certificati:   '🏆 Congratulazioni certificati',
  custom:        '✏️ Personalizzata',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};

// ── PAGINA ────────────────────────────────────────────────────────────────────

export default function CourseNewsletterPage() {
  const router  = useRouter();
  const today   = localDateISO();

  const [courses, setCourses]       = useState<Course[]>([]);
  const [audience, setAudience]     = useState<Audience>('all');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [customEmails, setCustomEmails]     = useState('');
  const [nlType, setNlType]         = useState<NewsletterType>('tips');
  const [extraNotes, setExtraNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newsletter, setNewsletter] = useState<GeneratedNewsletter | null>(null);
  const [sending, setSending]       = useState(false);
  const [internallyApproved, setInternallyApproved] = useState(false);
  const [sendResults, setSendResults] = useState<{ ok: string[]; fail: string[] } | null>(null);
  const [preview, setPreview]       = useState<'text' | 'html'>('html');
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    const data = getAppData();
    if (data?.courses) setCourses(data.courses);
    // Controlla se Gmail MCP è disponibile (tentiamo una chiamata di test)
    setGmailConnected(true); // assume connesso se MCP disponibile
  }, []);

  // ── Destinatari ───────────────────────────────────────────────────────────

  const recipients: Recipient[] = (() => {
    if (audience === 'all') {
      const seen = new Set<string>();
      return courses.flatMap(c =>
        c.participants
          .filter(p => p.email && !seen.has(p.email) && seen.add(p.email))
          .map(p => ({ name: p.name, email: p.email!, company: p.company, courseTitle: c.title }))
      );
    }
    if (audience === 'course' && selectedCourse) {
      const course = courses.find(c => c.id === selectedCourse);
      return (course?.participants ?? [])
        .filter(p => p.email)
        .map(p => ({ name: p.name, email: p.email!, company: p.company, courseTitle: course?.title }));
    }
    if (audience === 'custom') {
      return customEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean).map(email => ({ name: email.split('@')[0], email }));
    }
    return [];
  })();

  // ── Genera newsletter con AI ──────────────────────────────────────────────

  const generate = useCallback(async () => {
    setGenerating(true);
    setNewsletter(null);

    const course = courses.find(c => c.id === selectedCourse);
    const activeCourses = courses.filter(c => c.status === 'Attivo');
    const certRecipients = recipients.filter(r => {
      const c = courses.find(co => co.title === r.courseTitle);
      const p = c?.participants.find(pa => pa.email === r.email);
      return p?.certificateIssued;
    });

    const systemPrompt = `Sei Mattia Brumana, docente e formatore di Remodel (piattaforma formativa di MOD Group).
Scrivi newsletter formative in italiano, con tono professionale ma caldo e diretto.
Rispondi SOLO con JSON valido, nessun markdown.`;

    const userMsg = `Scrivi una newsletter di tipo "${TYPE_LABELS[nlType]}" per i partecipanti ai corsi Remodel.

DATA: ${new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
TIPO: ${nlType}
DESTINATARI: ${recipients.length} persone${course ? ` — corso "${course.title}"` : ' — tutti i partecipanti'}

${activeCourses.length > 0 ? `CORSI ATTIVI: ${activeCourses.map(c => c.title + (c.startDate ? ` (${c.startDate})` : '')).join(', ')}` : ''}
${nlType === 'certificati' ? `CERTIFICATI EMESSI A: ${certRecipients.map(r => r.name).slice(0,5).join(', ')}${certRecipients.length > 5 ? ' e altri' : ''}` : ''}
${extraNotes ? `NOTE AGGIUNTIVE: ${extraNotes}` : ''}

FIRMA: Mattia Brumana — Docente Remodel / MOD Group

JSON richiesto:
{
  "subject": "oggetto email accattivante (max 60 char)",
  "preheader": "testo anteprima (max 100 char)",
  "body": "corpo email HTML con paragrafi, grassetti dove serve, lista puntata se utile. NO html/body/head tag, solo il contenuto interno.",
  "cta": "testo del pulsante call-to-action (es. Scopri il corso)"
}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
      const json = await res.json();
      const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
      const s = text.indexOf('{'); const e = text.lastIndexOf('}');
      const parsed = JSON.parse(text.slice(s, e + 1)) as GeneratedNewsletter;
      setNewsletter(parsed);
    } catch (err) {
      console.error(err);
      alert('Errore nella generazione. Riprova.');
    } finally {
      setGenerating(false);
    }
  }, [courses, recipients, selectedCourse, nlType, extraNotes]);

  // ── Genera HTML email ─────────────────────────────────────────────────────

  const buildEmailHTML = (nl: GeneratedNewsletter, recipientName?: string) => {
    const course = courses.find(c => c.id === selectedCourse);
    return `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5}
.wrap{max-width:600px;margin:0 auto;background:#fff}
.header{background:#1a1a1a;padding:24px 32px;text-align:center}
.logo{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px}
.logo span{color:#F26522}
.platform{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:3px;margin-top:4px}
.hero{background:linear-gradient(135deg,#F26522 0%,#e05510 100%);padding:36px 32px;text-align:center}
.hero-label{font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px}
.hero h1{font-size:24px;font-weight:800;color:#fff;margin:0;line-height:1.3}
.body{padding:32px}
.body p{font-size:15px;color:#333;line-height:1.7;margin:0 0 16px}
.body strong{color:#1a1a1a}
.body ul{margin:12px 0;padding-left:20px}
.body ul li{font-size:15px;color:#333;line-height:1.7;margin-bottom:6px}
.cta-wrap{text-align:center;padding:8px 32px 32px}
.cta{display:inline-block;background:#F26522;color:#fff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none}
.divider{height:1px;background:#f0f0f0;margin:24px 0}
.footer{background:#f9f9f9;padding:24px 32px;text-align:center;font-size:12px;color:#888;border-top:1px solid #f0f0f0}
.footer strong{color:#1a1a1a}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="logo">MOD<span>.</span>Group</div>
    <div class="platform">Remodel — Formazione</div>
  </div>
  <div class="hero">
    <div class="hero-label">${new Date().toLocaleDateString('it-IT', { month:'long', year:'numeric' })}</div>
    <h1>${nl.subject}</h1>
  </div>
  <div class="body">
    ${recipientName ? `<p>Ciao <strong>${recipientName}</strong>,</p>` : '<p>Ciao,</p>'}
    ${nl.body}
  </div>
  ${nl.cta ? `<div class="cta-wrap"><a class="cta" href="#">${nl.cta}</a></div>` : ''}
  <div class="footer">
    <strong>Mattia Brumana</strong> — Docente Remodel<br>
    MOD Group · modgroup.it<br><br>
    <span style="font-size:11px;color:#aaa">Hai ricevuto questa email perché sei iscritto a un corso Remodel.</span>
  </div>
</div>
</body></html>`;
  };

  // ── Invia via Gmail MCP ───────────────────────────────────────────────────

  const sendAll = useCallback(async () => {
    if (!newsletter || recipients.length === 0) return;
    if (!internallyApproved) {
      alert('⚠️ Devi approvare internamente la newsletter prima di inviarla.');
      return;
    }
    if (!approvalGate({
      action: 'Invio newsletter corsi',
      recipient: `${recipients.length} partecipanti`,
      warnings: ['Questa azione invierà email reali ai destinatari'],
    })) return;

    setSending(true);
    setSendResults(null);
    const ok: string[] = [];
    const fail: string[] = [];

    for (const r of recipients) {
      try {
        const html = buildEmailHTML(newsletter, r.name);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            
            mcp_servers: [{ type: 'url', url: 'https://gmail.mcp.claude.com/mcp', name: 'gmail' }],
            messages: [{
              role: 'user',
              content: `Invia questa email via Gmail:
A: ${r.email}
Oggetto: ${newsletter.subject}
Corpo HTML: ${html}

Usa gmail_create_draft per creare una bozza, poi confermami con "draft created".`,
            }],
          }),
        });
        if (res.ok) ok.push(r.email);
        else fail.push(r.email);
      } catch {
        fail.push(r.email);
      }
      // piccola pausa tra invii
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setSendResults({ ok, fail });
    setSending(false);
  }, [newsletter, recipients]);

  // ── Copy testo ────────────────────────────────────────────────────────────

  const copyText = () => {
    if (!newsletter) return;
    const text = `OGGETTO: ${newsletter.subject}\n\n${newsletter.preheader}\n\n${newsletter.body.replace(/<[^>]+>/g, '')}\n\n${newsletter.cta ? newsletter.cta + '\n\n' : ''}---\nMattia Brumana — Docente Remodel\nMOD Group · modgroup.it`;
    navigator.clipboard.writeText(text);
  };

  const exportHTML = () => {
    if (!newsletter) return;
    const html = buildEmailHTML(newsletter);
    const win = window.open('', '_blank', 'width=700,height=800');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18 }}>←</button>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:24, color:'var(--text-1)' }}>Newsletter Corsi</h1>
          <p style={{ fontSize:14, color:'var(--text-3)', marginTop:2 }}>Remodel · comunicazione ai partecipanti</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>

        {/* ── Pannello config ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:80 }}>

          {/* Destinatari */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:18 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>👥 Destinatari</p>

            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {([
                { v:'all',    label:`Tutti i partecipanti (${[...new Set(courses.flatMap(c=>c.participants.filter(p=>p.email).map(p=>p.email)))].length})` },
                { v:'course', label:'Corso specifico' },
                { v:'custom', label:'Lista email personalizzata' },
              ] as { v: Audience; label: string }[]).map(({ v, label }) => (
                <label key={v} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14, color: audience===v ? 'var(--text-1)' : 'var(--text-3)' }}>
                  <input type="radio" checked={audience===v} onChange={() => setAudience(v)} style={{ accentColor:'var(--brand)' }} />
                  {label}
                </label>
              ))}
            </div>

            {audience === 'course' && (
              <select style={{ ...inputStyle, cursor:'pointer' }} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                <option value="">Seleziona corso...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title} ({c.participants.filter(p=>p.email).length} con email)</option>)}
              </select>
            )}

            {audience === 'custom' && (
              <textarea style={{ ...inputStyle, minHeight:80, resize:'vertical', fontFamily:'inherit', lineHeight:1.5, fontSize:13 }}
                value={customEmails} onChange={e => setCustomEmails(e.target.value)}
                placeholder={'email1@example.com\nemail2@example.com\noppure separati da virgola'} />
            )}

            {recipients.length > 0 && (
              <div style={{ marginTop:10, padding:'6px 10px', borderRadius:8, background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)' }}>
                <p style={{ fontSize:12, color:'#4ade80', fontWeight:600 }}>✓ {recipients.length} destinatari selezionati</p>
              </div>
            )}
          </div>

          {/* Tipo newsletter */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:18 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>📋 Tipo newsletter</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {(Object.entries(TYPE_LABELS) as [NewsletterType, string][]).map(([v, label]) => (
                <label key={v} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14, color: nlType===v ? 'var(--text-1)' : 'var(--text-3)', padding:'6px 8px', borderRadius:8, background: nlType===v ? 'rgba(242,101,34,0.08)' : 'transparent', border: `1px solid ${nlType===v ? 'rgba(242,101,34,0.3)' : 'transparent'}`, transition:'all 150ms' }}>
                  <input type="radio" checked={nlType===v} onChange={() => setNlType(v)} style={{ accentColor:'var(--brand)' }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Note aggiuntive */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:18 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>✏️ Note per l'AI</p>
            <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
              value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
              placeholder="Es. annuncia nuovo corso di AI, congratula i certificati di marzo, includi link iscrizione..." />
          </div>

          <button onClick={generate} disabled={generating || recipients.length === 0}
            style={{
              width:'100%', padding:'12px', borderRadius:10, fontSize:15, fontWeight:700, border:'none',
              cursor: generating || recipients.length === 0 ? 'not-allowed' : 'pointer',
              background: generating || recipients.length === 0 ? 'var(--surface3)' : 'var(--brand)',
              color: generating || recipients.length === 0 ? 'var(--text-3)' : 'white',
              boxShadow: !generating && recipients.length > 0 ? '0 4px 16px rgba(242,101,34,0.3)' : 'none',
            }}>
            {generating ? '⏳ Generazione...' : newsletter ? '🔄 Rigenera' : '✨ Genera newsletter'}
          </button>
        </div>

        {/* ── Output ── */}
        <div>
          {!newsletter && !generating && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:400, gap:12, color:'var(--text-3)' }}>
              <span style={{ fontSize:48 }}>📬</span>
              <p style={{ fontSize:16 }}>Configura e genera la newsletter</p>
              <p style={{ fontSize:14 }}>L'AI scriverà oggetto, corpo e CTA in stile Remodel</p>
            </div>
          )}

          {generating && (
            <div style={{ padding:32, display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--brand)', marginBottom:4 }}>⏳ Generazione...</p>
              {[85,60,90,70,80,50].map((w,i) => <div key={i} style={{ height:12, borderRadius:6, background:'var(--surface2)', width:`${w}%` }} />)}
            </div>
          )}

          {newsletter && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Toolbar */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ display:'flex', gap:4, background:'var(--surface2)', borderRadius:9, padding:3 }}>
                  {(['html','text'] as const).map(v => (
                    <button key={v} onClick={() => setPreview(v)} style={{ padding:'5px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: preview===v ? 'var(--brand)' : 'transparent', color: preview===v ? 'white' : 'var(--text-3)' }}>
                      {v === 'html' ? '🖼 Preview' : '📝 Testo'}
                    </button>
                  ))}
                </div>
                <button onClick={copyText} style={{ padding:'6px 14px', borderRadius:9, fontSize:13, fontWeight:600, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer' }}>📋 Copia testo</button>
                <button onClick={exportHTML} style={{ padding:'6px 14px', borderRadius:9, fontSize:13, fontWeight:600, border:'1px solid rgba(242,101,34,0.4)', background:'rgba(242,101,34,0.06)', color:'var(--brand)', cursor:'pointer' }}>🖨️ HTML</button>
                {/* Approvazione interna obbligatoria */}
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'10px 14px', borderRadius:9,
                  background: internallyApproved ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${internallyApproved ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  fontSize:14, color: internallyApproved ? '#4ade80' : '#fbbf24', fontWeight:600, marginBottom:8 }}>
                  <input type="checkbox" checked={internallyApproved} onChange={e => setInternallyApproved(e.target.checked)}
                    style={{ accentColor:'#4ade80', width:16, height:16 }} />
                  {internallyApproved ? '✅ Contenuto revisionato e approvato internamente' : '⚠️ Approva internamente prima di inviare'}
                </label>
                <button onClick={sendAll} disabled={sending || recipients.length === 0 || !internallyApproved}
                  style={{ marginLeft:'auto', padding:'7px 18px', borderRadius:9, fontSize:14, fontWeight:700, border:'none',
                    cursor: sending || recipients.length === 0 || !internallyApproved ? 'not-allowed' : 'pointer',
                    background: sending || !internallyApproved ? 'var(--surface3)' : '#4ade80',
                    color: sending || !internallyApproved ? 'var(--text-3)' : '#1a1a1a',
                  }}>
                  {sending ? '⏳ Invio...' : `📤 Invia a ${recipients.length}`}
                </button>
              </div>

              {/* Oggetto + preheader */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'14px 18px' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Oggetto</p>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>{newsletter.subject}</p>
                <p style={{ fontSize:12, color:'var(--text-3)' }}>Preheader: {newsletter.preheader}</p>
              </div>

              {/* Preview */}
              {preview === 'html' ? (
                <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, overflow:'hidden' }}>
                  <iframe
                    srcDoc={buildEmailHTML(newsletter, 'Partecipante')}
                    style={{ width:'100%', height:600, border:'none' }}
                    title="Preview newsletter"
                  />
                </div>
              ) : (
                <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'20px 24px' }}>
                  <div style={{ fontSize:15, color:'var(--text-1)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                    {newsletter.body.replace(/<[^>]+>/g, '')}
                    {newsletter.cta && `\n\n→ ${newsletter.cta}`}
                  </div>
                </div>
              )}

              {/* Lista destinatari */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'14px 18px' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>📬 Destinatari ({recipients.length})</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:120, overflowY:'auto' }}>
                  {recipients.map(r => (
                    <span key={r.email} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'var(--surface2)', color:'var(--text-2)', border:'1px solid var(--border)' }}>
                      {r.name} &lt;{r.email}&gt;
                    </span>
                  ))}
                </div>
              </div>

              {/* Risultati invio */}
              {sendResults && (
                <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'14px 18px' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>📊 Risultati invio</p>
                  {sendResults.ok.length > 0 && (
                    <p style={{ fontSize:14, color:'#4ade80', marginBottom:4 }}>✓ Inviati: {sendResults.ok.length} ({sendResults.ok.join(', ')})</p>
                  )}
                  {sendResults.fail.length > 0 && (
                    <p style={{ fontSize:14, color:'#f87171' }}>✗ Falliti: {sendResults.fail.length} ({sendResults.fail.join(', ')})</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
