'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAppData, updateAppData } from '@/lib/store';
import { localDateISO } from '@/lib/utils';
import type {
  EditorialContent, ContentFormat, ContentPlatform, Client, TeamMember,
} from '@/lib/types';

// ── costanti ─────────────────────────────────────────────────────────────────

const PLATFORMS: ContentPlatform[] = ['Instagram','Facebook','LinkedIn','TikTok','YouTube','Pinterest','Altro'];
const FORMATS: ContentFormat[]     = ['Post','Reel','Story','Carousel','Video','UGC','Altro'];
const TONES = ['Professionale','Informale','Ironico','Emozionale','Educativo','Ispirante','Promozionale'];
const PLATFORM_EMOJI: Record<string, string> = {
  Instagram:'📸', Facebook:'👥', LinkedIn:'💼', TikTok:'🎵', YouTube:'▶️', Pinterest:'📌', Altro:'🌐',
};
const FORMAT_EMOJI: Record<string, string> = {
  Post:'🖼', Reel:'🎬', Story:'⭕', Carousel:'📎', Video:'📹', UGC:'👤', Altro:'📄',
};

// ── tipi ─────────────────────────────────────────────────────────────────────

type Mode = 'choose' | 'manual' | 'ai';

interface AIBrief {
  topic: string;
  tone: string;
  cta: string;
  keywords: string;
  extra: string;
}

interface FormState {
  clientName: string;
  clientId: string;
  platform: ContentPlatform;
  format: ContentFormat;
  scheduledDate: string;
  responsible: string;
  responsibleId: string;
  caption: string;
  visualNotes: string;
  driveLink: string;
  tags: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  clientName: '', clientId: '', platform: 'Instagram', format: 'Post',
  scheduledDate: localDateISO(), responsible: '', responsibleId: '',
  caption: '', visualNotes: '', driveLink: '', tags: '', notes: '',
});

const emptyBrief = (): AIBrief => ({
  topic: '', tone: 'Professionale', cta: '', keywords: '', extra: '',
});

// ── helpers UI ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, fontSize: 15, fontWeight: 500,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}{required && <span style={{ color: 'var(--brand)', marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

// ── PAGINA ────────────────────────────────────────────────────────────────────

export default function NewContentPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>('choose');
  const [form, setForm]       = useState<FormState>(emptyForm());
  const [brief, setBrief]     = useState<AIBrief>(emptyBrief());
  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam]       = useState<TeamMember[]>([]);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // AI state
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiCopy, setAiCopy]               = useState('');
  const [aiVisual, setAiVisual]           = useState('');
  const [aiTags, setAiTags]               = useState('');
  const [aiApplied, setAiApplied]         = useState(false);

  useEffect(() => {
    const data = getAppData();
    if (data) { setClients(data.clients ?? []); setTeam(data.teamMembers ?? []); }
  }, []);

  const setF = (k: keyof FormState, v: string) => setForm(s => ({ ...s, [k]: v }));
  const setB = (k: keyof AIBrief, v: string)   => setBrief(s => ({ ...s, [k]: v }));

  // ── Genera con AI ────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!brief.topic.trim()) return;
    setAiLoading(true);
    setAiCopy(''); setAiVisual(''); setAiTags('');

    const client = clients.find(c => c.id === form.clientId);
    const mb = client?.marketingBrief;
    const briefContext = mb ? `
Brief marketing cliente:
- Valori brand: ${mb.brandValues || 'n.d.'}
- Tono di voce: ${mb.toneOfVoice || 'n.d.'}
- NON dire/mostrare: ${mb.doNotSay || 'nessun vincolo'}
- Stile visivo: ${mb.visualStyle || 'n.d.'}
- Target: ${[mb.targetAge, mb.targetInterests].filter(Boolean).join(' · ') || 'n.d.'}
- Differenziatori: ${mb.differentiators || 'n.d.'}
- Formati che funzionano: ${mb.topFormats || 'n.d.'}
- Argomenti evergreen: ${mb.topTopics || 'n.d.'}` : '';
    const systemPrompt = `Sei un esperto social media manager italiano. Rispondi SOLO in JSON valido, senza markdown, senza backtick. Formato esatto:
{"copy":"...","visual":"...","tags":"..."}
- copy: caption completo pronto da pubblicare, con emoji appropriate, tono ${brief.tone}
- visual: descrizione creativa della foto/video da produrre (2-3 righe)
- tags: 10-15 hashtag pertinenti separati da spazio`;

    const userMsg = `Cliente: ${client?.name ?? form.clientName}
Settore: ${client?.sector ?? 'non specificato'}
Piattaforma: ${form.platform}
Formato: ${form.format}
Tema/argomento: ${brief.topic}
Tono: ${brief.tone}
CTA desiderata: ${brief.cta || 'non specificata'}
Parole chiave: ${brief.keywords || 'nessuna'}
Note aggiuntive: ${brief.extra || 'nessuna'}${briefContext ? '\n\n' + briefContext : ''}`;

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

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(text);
      setAiCopy(parsed.copy ?? '');
      setAiVisual(parsed.visual ?? '');
      setAiTags(parsed.tags ?? '');
    } catch {
      setAiCopy('Errore nella generazione. Riprova o inserisci il copy manualmente.');
    } finally {
      setAiLoading(false);
    }
  }, [brief, form, clients]);

  // Applica output AI al form
  const applyAI = () => {
    setF('caption', aiCopy);
    setF('visualNotes', aiVisual);
    setF('tags', aiTags);
    setAiApplied(true);
    setMode('manual'); // passa alla modalità manuale per revisione
  };

  // ── Salva nel piano editoriale ────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.clientName || !form.caption.trim()) return;
    setSaving(true);

    const newContent: EditorialContent = {
      id:            `EC${Date.now().toString(36).toUpperCase()}`,
      clientId:      form.clientId || undefined,
      clientName:    form.clientName,
      platform:      form.platform,
      format:        form.format,
      scheduledDate: form.scheduledDate,
      status:        'Da fare',
      caption:       form.caption,
      visualNotes:   form.visualNotes || undefined,
      driveLink:     form.driveLink || undefined,
      responsible:   form.responsible || undefined,
      responsibleId: form.responsibleId || undefined,
      tags:          form.tags || undefined,
      notes:         form.notes || undefined,
      briefChecklist: { textApproved: false, materialsReady: false, styleRef: false, formatConfirmed: false },
    };

    const data = getAppData();
    updateAppData({ editorialContent: [...(data?.editorialContent ?? []), newContent] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push('/editorial'), 1500);
  };

  const canSave = !!form.clientName && !!form.caption.trim();

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (saved) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Contenuto salvato!</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Reindirizzamento al piano editoriale...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Nuovo Contenuto</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Crea un post per il piano editoriale</p>
        </div>
      </div>

      {/* ── STEP 0: Scegli modalità ── */}
      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 8 }}>Come vuoi creare il contenuto?</p>

          <div onClick={() => setMode('manual')} style={{
            padding: '24px', borderRadius: 16, cursor: 'pointer', transition: 'all 150ms',
            border: '1px solid var(--border2)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', gap: 20,
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          >
            <span style={{ fontSize: 36 }}>✍️</span>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Inserimento manuale</p>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Scrivi il copy e le note creative direttamente. Controllo totale sul contenuto.</p>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 18 }}>→</span>
          </div>

          <div onClick={() => setMode('ai')} style={{
            padding: '24px', borderRadius: 16, cursor: 'pointer', transition: 'all 150ms',
            border: '1px solid var(--border2)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', gap: 20,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'rgba(242,101,34,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <span style={{ fontSize: 36 }}>🤖</span>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Genera con AI</p>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Inserisci un brief e Claude genera copy, note visual e hashtag. Poi revisioni e salvi.</p>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 18 }}>→</span>
          </div>
        </div>
      )}

      {/* ── MODALITÀ AI ── */}
      {mode === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Dati base */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>📋 Contesto</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Cliente" required>
                <select style={selectStyle} value={form.clientId} onChange={e => {
                  const c = clients.find(cl => cl.id === e.target.value);
                  setF('clientId', e.target.value);
                  setF('clientName', c?.name ?? '');
                }}>
                  <option value="">Seleziona...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Piattaforma">
                <select style={selectStyle} value={form.platform} onChange={e => setF('platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_EMOJI[p]} {p}</option>)}
                </select>
              </Field>
              <Field label="Formato">
                <select style={selectStyle} value={form.format} onChange={e => setF('format', e.target.value)}>
                  {FORMATS.map(f => <option key={f} value={f}>{FORMAT_EMOJI[f]} {f}</option>)}
                </select>
              </Field>
              <Field label="Data pubblicazione">
                <input style={inputStyle} type="date" value={form.scheduledDate} onChange={e => setF('scheduledDate', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Brief AI */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>🤖 Brief per l'AI</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Tema / argomento" required>
                <input style={inputStyle} value={brief.topic} onChange={e => setB('topic', e.target.value)}
                  placeholder="Es. Apertura stagione estiva, lancio nuovo menu, offerta weekend..." autoFocus />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Tono di voce">
                  <select style={selectStyle} value={brief.tone} onChange={e => setB('tone', e.target.value)}>
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="CTA desiderata">
                  <input style={inputStyle} value={brief.cta} onChange={e => setB('cta', e.target.value)}
                    placeholder="Es. Prenota ora, Scopri di più..." />
                </Field>
              </div>
              <Field label="Parole chiave da includere">
                <input style={inputStyle} value={brief.keywords} onChange={e => setB('keywords', e.target.value)}
                  placeholder="Es. estate, relax, esclusivo..." />
              </Field>
              <Field label="Note aggiuntive">
                <textarea style={{ ...textareaStyle, minHeight: 70 }} value={brief.extra} onChange={e => setB('extra', e.target.value)}
                  placeholder="Dettagli specifici, vincoli, riferimenti..." />
              </Field>
            </div>

            <button
              onClick={handleGenerate}
              disabled={aiLoading || !brief.topic.trim() || !form.clientName}
              style={{
                marginTop: 16, width: '100%', padding: '12px', borderRadius: 10,
                fontSize: 16, fontWeight: 700, cursor: aiLoading || !brief.topic.trim() ? 'not-allowed' : 'pointer',
                border: 'none',
                background: aiLoading || !brief.topic.trim() ? 'var(--surface3)' : 'var(--brand)',
                color: aiLoading || !brief.topic.trim() ? 'var(--text-3)' : 'white',
                transition: 'all 150ms',
              }}
            >
              {aiLoading ? '⏳ Generazione in corso...' : '✨ Genera contenuto'}
            </button>
          </div>

          {/* Output AI */}
          {(aiCopy || aiLoading) && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(242,101,34,0.3)', borderRadius: 16, padding: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', marginBottom: 16 }}>✨ Contenuto generato</p>

              {aiLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[80, 60, 40].map((w, i) => (
                    <div key={i} style={{ height: 14, borderRadius: 7, background: 'var(--surface2)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>📝 Copy</p>
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', fontSize: 15, color: 'var(--text-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {aiCopy}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🎨 Note visual</p>
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', fontSize: 15, color: 'var(--text-1)', lineHeight: 1.6 }}>
                      {aiVisual}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🏷️ Hashtag</p>
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', fontSize: 14, color: '#60a5fa', lineHeight: 1.8 }}>
                      {aiTags}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={handleGenerate} style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                      🔄 Rigenera
                    </button>
                    <button onClick={applyAI} style={{ flex: 2, padding: '9px', borderRadius: 9, fontSize: 14, fontWeight: 700, border: 'none', background: 'var(--brand)', color: 'white', cursor: 'pointer' }}>
                      ✓ Usa questo contenuto →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODALITÀ MANUALE (+ revisione AI) ── */}
      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {aiApplied && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(242,101,34,0.08)', border: '1px solid rgba(242,101,34,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✨</span>
              <p style={{ fontSize: 14, color: 'var(--brand)' }}>Contenuto AI applicato — revisionalo prima di salvare.</p>
              <button onClick={() => { setAiApplied(false); setMode('ai'); }} style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Torna all'AI
              </button>
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>📋 Informazioni base</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Cliente" required>
                  <select style={selectStyle} value={form.clientId} onChange={e => {
                    const c = clients.find(cl => cl.id === e.target.value);
                    setF('clientId', e.target.value);
                    setF('clientName', c?.name ?? '');
                  }}>
                    <option value="">Seleziona...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Piattaforma">
                <select style={selectStyle} value={form.platform} onChange={e => setF('platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_EMOJI[p]} {p}</option>)}
                </select>
              </Field>
              <Field label="Formato">
                <select style={selectStyle} value={form.format} onChange={e => setF('format', e.target.value)}>
                  {FORMATS.map(f => <option key={f} value={f}>{FORMAT_EMOJI[f]} {f}</option>)}
                </select>
              </Field>
              <Field label="Data pubblicazione">
                <input style={inputStyle} type="date" value={form.scheduledDate} onChange={e => setF('scheduledDate', e.target.value)} />
              </Field>
              <Field label="Responsabile">
                <select style={selectStyle} value={form.responsibleId} onChange={e => {
                  const m = team.find(t => t.id === e.target.value);
                  setF('responsibleId', e.target.value);
                  setF('responsible', m?.fullName ?? '');
                }}>
                  <option value="">Non assegnato</option>
                  {team.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>✍️ Contenuto</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Caption / Copy" required>
                <textarea style={textareaStyle} value={form.caption} onChange={e => setF('caption', e.target.value)}
                  placeholder="Scrivi il testo del post..." />
                <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>{form.caption.length} caratteri</p>
              </Field>
              <Field label="Note visual / Brief creativo">
                <textarea style={{ ...textareaStyle, minHeight: 80 }} value={form.visualNotes}
                  onChange={e => setF('visualNotes', e.target.value)}
                  placeholder="Descrivi l'immagine o il video da produrre..." />
              </Field>
              <Field label="Hashtag">
                <input style={inputStyle} value={form.tags} onChange={e => setF('tags', e.target.value)}
                  placeholder="#hashtag1 #hashtag2 #hashtag3" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Link Drive (materiali)">
                  <input style={inputStyle} value={form.driveLink} onChange={e => setF('driveLink', e.target.value)}
                    placeholder="https://drive.google.com/..." />
                </Field>
                <Field label="Note interne">
                  <input style={inputStyle} value={form.notes} onChange={e => setF('notes', e.target.value)}
                    placeholder="Note per il team..." />
                </Field>
              </div>
            </div>
          </div>

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setMode('choose')} style={{ padding: '11px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
              ← Indietro
            </button>
            {!aiApplied && (
              <button onClick={() => setMode('ai')} style={{ padding: '11px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid rgba(242,101,34,0.4)', background: 'rgba(242,101,34,0.06)', color: 'var(--brand)', cursor: 'pointer' }}>
                🤖 Usa AI
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, fontSize: 16, fontWeight: 700,
                border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                background: canSave ? 'var(--brand)' : 'var(--surface3)',
                color: canSave ? 'white' : 'var(--text-3)',
                boxShadow: canSave ? '0 4px 16px rgba(242,101,34,0.35)' : 'none',
                transition: 'all 150ms',
              }}
            >
              {saving ? '⏳ Salvo...' : '💾 Salva nel piano editoriale'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
