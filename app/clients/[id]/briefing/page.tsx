'use client';
import { getApiKey } from '@/lib/aiProvider';
import { gemini, tryParseJSON , GEMINI_MODEL } from '@/lib/gemini';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';

export default function PreMeetingBriefingPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { data } = useData();
  const today   = localDateISO();

  const client  = data.clients.find(c => c.id === id);

  const [loading, setLoading]   = useState(false);
  const [briefing, setBriefing] = useState('');
  const [copied, setCopied]     = useState(false);
  const [meetingType, setMeetingType] = useState('call mensile');
  const [customNotes, setCustomNotes] = useState('');

  // Aggrega tutti i dati del cliente
  const tasks     = data.tasks.filter(t =>
    t.clientId === id || t.clientName?.toLowerCase() === client?.name?.toLowerCase()
  );
  const deal      = data.deals.find(d =>
    d.clientId === id || d.companyName?.toLowerCase() === client?.name?.toLowerCase()
  );
  const timeLogs  = data.timeLogs.filter(l =>
    l.clientId === id || l.clientName?.toLowerCase() === client?.name?.toLowerCase()
  );
  const editorial = (data.editorialContent ?? []).filter(e =>
    e.clientId === id || e.clientName?.toLowerCase() === client?.name?.toLowerCase()
  );
  const mb = client?.marketingBrief;

  // KPI derivati
  const openTasks    = tasks.filter(t => !t.isCompleted);
  const overdue      = openTasks.filter(t => t.dueDate && t.dueDate < today);
  const dueSoon      = openTasks.filter(t => t.dueDate && t.dueDate >= today &&
    Math.round((new Date(t.dueDate).getTime() - new Date(today).getTime()) / 86400000) <= 7
  );
  const completedTasks = tasks.filter(t => t.isCompleted);
  const totalHours   = timeLogs.reduce((s, l) => s + l.hours, 0);
  const budgetOre    = deal?.budgetOre ?? 0;
  const budgetPct    = budgetOre > 0 ? Math.round((totalHours / budgetOre) * 100) : null;
  const thisMonth    = today.slice(0, 7);
  const editMonth    = editorial.filter(e => e.scheduledDate?.startsWith(thisMonth));
  const published    = editMonth.filter(e => e.status === 'Pubblicato').length;
  const inReview     = editMonth.filter(e => e.status === 'In revisione').length;
  const blocked      = editMonth.filter(e => e.status === 'Bloccato').length;
  const planned      = editMonth.filter(e => e.status === 'Da fare' || e.status === 'In produzione').length;

  const generateBriefing = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setBriefing('');

    const systemPrompt = `Sei un account manager esperto di un'agenzia di marketing italiana. 
Genera un briefing pre-riunione professionale e conciso in italiano.
Usa emoji appropriati per strutturare il documento.
Sii diretto, pratico e orientato all'azione.
Rispondi SOLO con il testo del briefing, senza preamble.`;

    const userMsg = `Genera un briefing pre-riunione per:

CLIENTE: ${client.name}
SETTORE: ${client.sector || 'n.d.'}
TIPO RIUNIONE: ${meetingType}
DATA: ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
RESPONSABILE ACCOUNT: ${client.responsible || 'n.d.'}

--- DATI OPERATIVI ---
Task aperti: ${openTasks.length} (di cui ${overdue.length} in ritardo, ${dueSoon.length} in scadenza questa settimana)
Task completati: ${completedTasks.length}
${overdue.length > 0 ? `Task in ritardo: ${overdue.map(t => `"${t.title}" (scaduto ${t.dueDate})`).join(', ')}` : ''}
${dueSoon.length > 0 ? `Task in scadenza: ${dueSoon.map(t => `"${t.title}" (${t.dueDate})`).join(', ')}` : ''}

--- PIANO EDITORIALE (${thisMonth}) ---
Pubblicati: ${published}
In revisione (approvazione cliente): ${inReview}
Bloccati: ${blocked}
In produzione / Da fare: ${planned}
${blocked > 0 ? `Contenuti bloccati: ${editMonth.filter(e=>e.status==='Bloccato').map(e=>`"${e.caption?.slice(0,40) || e.format}" su ${e.platform} - motivo: ${e.blockedReason || 'non specificato'}`).join('; ')}` : ''}

--- BUDGET E ORE ---
Ore lavorate: ${totalHours.toFixed(1)}h ${budgetOre > 0 ? `su ${budgetOre}h budget (${budgetPct}%)` : '(nessun budget definito)'}
${budgetPct !== null && budgetPct >= 80 ? `⚠️ ATTENZIONE: budget ore al ${budgetPct}%` : ''}
${deal ? `Commessa: ${deal.jobType} - Stato: ${deal.status}` : 'Nessuna commessa attiva'}

--- BRIEF MARKETING CLIENTE ---
${mb ? `
Obiettivo social: ${mb.socialGoal || 'n.d.'}
KPI target: ${mb.kpiTarget || 'n.d.'}
Frequenza desiderata: ${mb.contentFrequency || 'n.d.'}
Tono di voce: ${mb.toneOfVoice || 'n.d.'}
` : 'Brief marketing non ancora compilato.'}

--- NOTE AGGIUNTIVE ACCOUNT ---
${customNotes || 'Nessuna nota aggiuntiva.'}

Il briefing deve includere:
1. Stato generale del cliente (semaforo + frase sintetica)
2. Priorità operative da discutere
3. Piano editoriale: situazione e punti aperti
4. Budget e ore: stato e eventuali alert
5. Domande/punti da chiarire con il cliente
6. Azioni post-riunione suggerite`;

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
      setBriefing(json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Errore nella generazione.');
    } catch {
      setBriefing('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [client, meetingType, customNotes, openTasks, overdue, dueSoon, completedTasks, totalHours, budgetOre, budgetPct, thisMonth, editMonth, published, inReview, blocked, planned, deal, mb, today]);

  if (!client) return (
    <div style={{ padding: 40, color: 'var(--text-3)' }}>Cliente non trovato.</div>
  );

  const inputStyle: React.CSSProperties = {
    padding: '9px 13px', borderRadius: 9, fontSize: 14,
    border: '1px solid var(--border2)', background: 'var(--surface2)',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-1)' }}>Brief Pre-Riunione</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>{client.name} · generato da AI in base ai dati aggiornati</p>
        </div>
      </div>

      {/* Setup */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>⚙️ Parametri riunione</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo riunione</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={meetingType} onChange={e => setMeetingType(e.target.value)}>
              {['call mensile', 'riunione strategica', 'presentazione risultati', 'allineamento operativo', 'onboarding', 'review trimestrale'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note per l'AI (opzionale)</label>
            <input style={inputStyle} value={customNotes} onChange={e => setCustomNotes(e.target.value)}
              placeholder="Es. cliente ha chiesto aggiornamento su campagna X, discutere rinnovo contratto..." />
          </div>
        </div>
      </div>

      {/* KPI snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Task aperti', val: openTasks.length, sub: overdue.length > 0 ? `${overdue.length} in ritardo` : 'in regola', color: overdue.length > 0 ? '#f87171' : '#4ade80' },
          { label: 'In scadenza', val: dueSoon.length, sub: 'entro 7 giorni', color: dueSoon.length > 0 ? '#fbbf24' : 'var(--text-3)' },
          { label: 'Pubblicati', val: published, sub: `${thisMonth.slice(5)} · ${inReview} in revisione`, color: '#60a5fa' },
          { label: 'Budget ore', val: budgetPct !== null ? `${budgetPct}%` : '—', sub: `${totalHours.toFixed(1)}h lavorate`, color: budgetPct !== null && budgetPct >= 80 ? '#f87171' : '#4ade80' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: "'Cormorant Garamond',serif" }}>{k.val}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Genera */}
      <button
        onClick={generateBriefing}
        disabled={loading}
        style={{
          width: '100%', padding: '13px', borderRadius: 12, fontSize: 16, fontWeight: 700,
          border: 'none', cursor: loading ? 'wait' : 'pointer', marginBottom: 20,
          background: loading ? 'var(--surface3)' : 'var(--brand)',
          color: loading ? 'var(--text-3)' : 'white',
          boxShadow: loading ? 'none' : '0 4px 20px rgba(242,101,34,0.35)',
          transition: 'all 150ms',
        }}
      >
        {loading ? '⏳ Generazione briefing...' : briefing ? '🔄 Rigenera briefing' : '✨ Genera briefing con AI'}
      </button>

      {/* Output */}
      {(loading || briefing) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>
              📄 Briefing — {client.name} · {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            </p>
            {briefing && !loading && (
              <button
                onClick={() => { navigator.clipboard.writeText(briefing); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', background: copied ? 'rgba(74,222,128,0.1)' : 'none', color: copied ? '#4ade80' : 'var(--text-2)', cursor: 'pointer' }}
              >
                {copied ? '✓ Copiato!' : '📋 Copia'}
              </button>
            )}
          </div>

          {/* Contenuto */}
          <div style={{ padding: '24px', minHeight: 200 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[95, 70, 85, 55, 75, 60, 80].map((w, i) => (
                  <div key={i} style={{ height: 13, borderRadius: 6, background: 'var(--surface2)', width: `${w}%`, opacity: 1 - i * 0.08 }} />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 15, color: 'var(--text-1)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {briefing}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
