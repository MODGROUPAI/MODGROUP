'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import type { MarketingBrief } from '@/lib/types';

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, fontSize: 15, fontWeight: 500,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
};

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span> {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>{hint}</p>}
      {children}
    </div>
  );
}

const EMPTY: MarketingBrief = {
  brandValues: '', toneOfVoice: '', doNotSay: '', visualStyle: '',
  targetAge: '', targetInterests: '', targetPainPoints: '', targetGeo: '',
  socialGoal: '', kpiTarget: '', contentFrequency: '',
  competitors: '', competitorStrengths: '', differentiators: '',
  topFormats: '', topTopics: '', seasonality: '', extraNotes: '',
};

const GOALS = ['Brand Awareness', 'Lead Generation', 'Prenotazioni / Vendite', 'Community Building', 'Fidelizzazione', 'Lancio prodotto', 'Altro'];
const FREQUENCIES = ['1 post/settimana', '2-3 post/settimana', '1 post/giorno', '2+ post/giorno', 'Da definire'];

export default function MarketingBriefPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { data, update } = useData();

  const client = data.clients.find(c => c.id === id);
  const [brief, setBrief] = useState<MarketingBrief>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    if (client?.marketingBrief) {
      setBrief({ ...EMPTY, ...client.marketingBrief });
    }
  }, [client]);

  // Calcola completezza
  useEffect(() => {
    const fields = Object.keys(EMPTY) as (keyof MarketingBrief)[];
    const filled = fields.filter(k => brief[k] && String(brief[k]).trim().length > 0);
    setCompleteness(Math.round((filled.length / fields.length) * 100));
  }, [brief]);

  const set = (k: keyof MarketingBrief, v: string) => {
    setSaved(false);
    setBrief(s => ({ ...s, [k]: v }));
  };

  const handleSave = async () => {
    setSaving(true);
    const clients = data.clients.map(c =>
      c.id === id ? { ...c, marketingBrief: { ...brief, updatedAt: localDateISO() } } : c
    );
    update({ clients });
    setSaving(false);
    setSaved(true);
  };

  if (!client) return (
    <div style={{ padding: 40, color: 'var(--text-3)' }}>Cliente non trovato.</div>
  );

  const completenessColor = completeness < 40 ? '#f87171' : completeness < 70 ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>←</button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Indagine Marketing</h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>{client.name} · Brief permanente per la produzione contenuti</p>
          </div>
        </div>

        {/* Completeness badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completeness}%`, background: completenessColor, borderRadius: 3, transition: 'width 300ms' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: completenessColor }}>{completeness}%</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>completezza brief</span>
        </div>
      </div>

      {/* Ultimo aggiornamento */}
      {client.marketingBrief?.updatedAt && (
        <div style={{ marginBottom: 20, padding: '8px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#4ade80' }}>✓ Ultimo aggiornamento: {client.marketingBrief.updatedAt}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Brand identity */}
        <Section title="Brand Identity" emoji="🎨">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Valori del brand" hint="Cosa rappresenta questo brand?">
              <textarea style={textareaStyle} value={brief.brandValues ?? ''} onChange={e => set('brandValues', e.target.value)}
                placeholder="Es. autenticità, sostenibilità, lusso accessibile..." />
            </Field>
            <Field label="Tono di voce" hint="Come comunica il brand?">
              <textarea style={textareaStyle} value={brief.toneOfVoice ?? ''} onChange={e => set('toneOfVoice', e.target.value)}
                placeholder="Es. professionale ma caldo, ironico, ispirazionale..." />
            </Field>
            <Field label="Cosa NON dire/mostrare" hint="Vincoli di comunicazione">
              <textarea style={textareaStyle} value={brief.doNotSay ?? ''} onChange={e => set('doNotSay', e.target.value)}
                placeholder="Es. non usare prezzi, evitare certi topic, no competitor..." />
            </Field>
            <Field label="Stile visivo" hint="Mood, colori, riferimenti estetici">
              <textarea style={textareaStyle} value={brief.visualStyle ?? ''} onChange={e => set('visualStyle', e.target.value)}
                placeholder="Es. colori caldi, fotografie naturali, no filtri pesanti..." />
            </Field>
          </div>
        </Section>

        {/* Target */}
        <Section title="Target Audience" emoji="🎯">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Fascia d'età">
              <input style={inputStyle} value={brief.targetAge ?? ''} onChange={e => set('targetAge', e.target.value)}
                placeholder="Es. 30-55 anni, prevalentemente donne" />
            </Field>
            <Field label="Geografia target">
              <input style={inputStyle} value={brief.targetGeo ?? ''} onChange={e => set('targetGeo', e.target.value)}
                placeholder="Es. Italia Nord, turisti europei, internazionale" />
            </Field>
            <Field label="Interessi e stili di vita" hint="Chi è il cliente del cliente?">
              <textarea style={textareaStyle} value={brief.targetInterests ?? ''} onChange={e => set('targetInterests', e.target.value)}
                placeholder="Es. viaggi di lusso, wellness, enogastronomia, famiglie..." />
            </Field>
            <Field label="Bisogni e pain points" hint="Cosa cerca / cosa lo frustra?">
              <textarea style={textareaStyle} value={brief.targetPainPoints ?? ''} onChange={e => set('targetPainPoints', e.target.value)}
                placeholder="Es. cerca esperienze autentiche, non vuole turismo di massa..." />
            </Field>
          </div>
        </Section>

        {/* Obiettivi */}
        <Section title="Obiettivi Social" emoji="📈">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Obiettivo principale">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={brief.socialGoal ?? ''} onChange={e => set('socialGoal', e.target.value)}>
                <option value="">Seleziona...</option>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Frequenza pubblicazione desiderata">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={brief.contentFrequency ?? ''} onChange={e => set('contentFrequency', e.target.value)}>
                <option value="">Seleziona...</option>
                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="KPI e metriche da monitorare" hint="Follower, reach, engagement, click, conversioni...">
                <input style={inputStyle} value={brief.kpiTarget ?? ''} onChange={e => set('kpiTarget', e.target.value)}
                  placeholder="Es. +500 follower/mese, engagement >3%, 10 lead/mese" />
              </Field>
            </div>
          </div>
        </Section>

        {/* Competitor */}
        <Section title="Analisi Competitor" emoji="🔍">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Competitor principali">
              <textarea style={textareaStyle} value={brief.competitors ?? ''} onChange={e => set('competitors', e.target.value)}
                placeholder="Nomi e profili social dei competitor da monitorare" />
            </Field>
            <Field label="Cosa fanno bene i competitor">
              <textarea style={textareaStyle} value={brief.competitorStrengths ?? ''} onChange={e => set('competitorStrengths', e.target.value)}
                placeholder="Es. video girati bene, community attiva, offerte chiare..." />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Cosa differenzia questo cliente" hint="Il vantaggio competitivo da comunicare">
                <textarea style={{ ...textareaStyle, minHeight: 70 }} value={brief.differentiators ?? ''} onChange={e => set('differentiators', e.target.value)}
                  placeholder="Es. unica location, chef stellato, servizio personalizzato..." />
              </Field>
            </div>
          </div>
        </Section>

        {/* Contenuto */}
        <Section title="Strategia Contenuto" emoji="📅">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Formati che funzionano meglio" hint="Basato su storico o intuizione">
              <input style={inputStyle} value={brief.topFormats ?? ''} onChange={e => set('topFormats', e.target.value)}
                placeholder="Es. Reel dietro le quinte, Carousel con tips, Stories..." />
            </Field>
            <Field label="Argomenti evergreen del brand">
              <input style={inputStyle} value={brief.topTopics ?? ''} onChange={e => set('topTopics', e.target.value)}
                placeholder="Es. territorio, team, ospiti, piatti, eventi..." />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Stagionalità ed eventi rilevanti" hint="Date, periodi, ricorrenze importanti per il brand">
                <textarea style={{ ...textareaStyle, minHeight: 70 }} value={brief.seasonality ?? ''} onChange={e => set('seasonality', e.target.value)}
                  placeholder="Es. apertura aprile, picco luglio-agosto, Natale, fiere di settore..." />
              </Field>
            </div>
          </div>
        </Section>

        {/* Note libere */}
        <Section title="Note aggiuntive" emoji="📝">
          <textarea style={{ ...textareaStyle, minHeight: 100 }} value={brief.extraNotes ?? ''} onChange={e => set('extraNotes', e.target.value)}
            placeholder="Tutto quello che non rientra nelle categorie sopra — istruzioni speciali, preferenze del cliente, appunti dall'onboarding..." />
        </Section>

        {/* Bottone salva */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ padding: '11px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            ← Torna al cliente
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, fontSize: 16, fontWeight: 700,
              border: 'none', cursor: saving ? 'wait' : 'pointer',
              background: saved ? 'rgba(74,222,128,0.15)' : 'var(--brand)',
              color: saved ? '#4ade80' : 'white',
              boxShadow: saved ? 'none' : '0 4px 16px rgba(242,101,34,0.35)',
              transition: 'all 200ms',
            }}
          >
            {saving ? '⏳ Salvo...' : saved ? '✓ Salvato' : '💾 Salva indagine marketing'}
          </button>
        </div>
      </div>
    </div>
  );
}
