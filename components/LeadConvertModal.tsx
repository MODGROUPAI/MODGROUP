'use client';

import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import type { Lead, Client, Deal } from '@/lib/types';

interface Props {
  lead: Lead;
  onClose: () => void;
  onDone: (clientId: string) => void;
}

const SECTORS   = ['Hospitality', 'Food & Beverage', 'Retail', 'Real Estate', 'Fashion', 'Wellness', 'Turismo', 'Altro'];
const JOB_TYPES = ['Social Media Management', 'Advertising', 'Content Creation', 'Branding', 'Web', 'Consulenza', 'Altro'];
const DEAL_STATUSES = ['In corso', 'Approvato', 'In attesa', 'Proposta'];

function genId(p: string) { return `${p}${Date.now().toString(36).toUpperCase()}`; }

const inputStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 9, fontSize: 14, fontWeight: 500,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export function LeadConvertModal({ lead, onClose, onDone }: Props) {
  const { data, update } = useData();
  const today = localDateISO();

  const [saving, setSaving] = useState(false);

  // Dati cliente — pre-compilati dal lead
  const [clientName,    setClientName]    = useState(lead.companyName);
  const [sector,        setSector]        = useState('');
  const [city,          setCity]          = useState('');
  const [contactName,   setContactName]   = useState(lead.companyName);
  const [contactRole,   setContactRole]   = useState('');
  const [email,         setEmail]         = useState(lead.email ?? '');
  const [phone,         setPhone]         = useState(lead.phone ?? '');
  const [driveLink,     setDriveLink]     = useState(lead.driveLink ?? '');

  // Dati commessa — pre-compilati dal lead
  const [jobType,        setJobType]       = useState(lead.serviceType ?? '');
  const [dealStatus,     setDealStatus]    = useState('In corso');
  const [projectLeaderId, setPLId]         = useState(lead.responsibleId ?? '');
  const [budgetEuro,     setBudgetEuro]    = useState('');
  const [budgetOre,      setBudgetOre]     = useState('');
  const [startDate,      setStartDate]     = useState(today);

  const leader = data.teamMembers.find(m => m.id === projectLeaderId);

  const handleSave = async () => {
    setSaving(true);
    const clientId = genId('CLI');
    const dealId   = genId('DEAL');

    const newClient: Client = {
      id: clientId, name: clientName, sector, city,
      contactName, contactRole, email, phone,
      driveLink: driveLink || undefined,
      startDate: today, status: 'Attivo', statusDate: today,
      responsible:   leader?.fullName,
      responsibleId: projectLeaderId || undefined,
      convertedFromLeadId: lead.id,
    };

    const newDeal: Deal = {
      id: dealId, clientId, companyName: clientName,
      jobType, status: dealStatus,
      projectLeader:   leader?.fullName,
      projectLeaderId: projectLeaderId || undefined,
      budgetEuro:  budgetEuro ? parseFloat(budgetEuro) : undefined,
      budgetOre:   budgetOre  ? parseFloat(budgetOre)  : undefined,
      alertThreshold: 80, statusDate: today,
      originLeadId: lead.id,
    };

    // Aggiorna lead: segna come convertito
    const updatedLeads = data.leads.map(l =>
      l.id === lead.id
        ? { ...l, statusContact: 'Chiuso', convertedToClientId: clientId, convertedToDealId: dealId, statusDate: today }
        : l
    );

    update({
      clients: [newClient, ...data.clients],
      deals:   [newDeal,   ...data.deals],
      leads:   updatedLeads,
    });

    setSaving(false);
    onDone(clientId);
  };

  const canSave = clientName.trim() && jobType;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500 }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 501, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>Converti Lead in Cliente</h2>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
              I dati del lead sono già precompilati. Controlla, integra e conferma.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Lead summary */}
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(242,101,34,0.06)', border: '1px solid rgba(242,101,34,0.2)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Lead di origine</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{lead.companyName}</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {[lead.source, lead.serviceType, lead.statusContact].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Dati cliente */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>👤 Dati cliente</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome azienda *</label>
                <input style={inputStyle} value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>
              {[
                { label: 'Settore', el: <select style={selectStyle} value={sector} onChange={e => setSector(e.target.value)}><option value="">Seleziona...</option>{SECTORS.map(s=><option key={s}>{s}</option>)}</select> },
                { label: 'Città',   el: <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="Milano" /> },
                { label: 'Contatto principale', el: <input style={inputStyle} value={contactName} onChange={e => setContactName(e.target.value)} /> },
                { label: 'Ruolo',   el: <input style={inputStyle} value={contactRole} onChange={e => setContactRole(e.target.value)} placeholder="Marketing Manager" /> },
                { label: 'Email',   el: <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} /> },
                { label: 'Telefono', el: <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /> },
                { label: 'Cartella Drive', el: <input style={inputStyle} value={driveLink} onChange={e => setDriveLink(e.target.value)} placeholder="https://drive.google.com/..." /> },
              ].map(({ label, el }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  {el}
                </div>
              ))}
            </div>
          </div>

          {/* Dati commessa */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>📋 Commessa</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Tipo di lavoro *', el: <select style={selectStyle} value={jobType} onChange={e => setJobType(e.target.value)}><option value="">Seleziona...</option>{JOB_TYPES.map(j=><option key={j}>{j}</option>)}</select> },
                { label: 'Stato commessa',   el: <select style={selectStyle} value={dealStatus} onChange={e => setDealStatus(e.target.value)}>{DEAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select> },
                { label: 'Project Leader',   el: <select style={selectStyle} value={projectLeaderId} onChange={e => setPLId(e.target.value)}><option value="">Nessuno</option>{data.teamMembers.map(m=><option key={m.id} value={m.id}>{m.fullName} — {m.role}</option>)}</select> },
                { label: 'Data inizio',      el: <input style={inputStyle} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /> },
                { label: 'Budget €',         el: <input style={inputStyle} type="number" value={budgetEuro} onChange={e => setBudgetEuro(e.target.value)} placeholder="0" /> },
                { label: 'Budget ore',       el: <input style={inputStyle} type="number" value={budgetOre}  onChange={e => setBudgetOre(e.target.value)}  placeholder="0" /> },
              ].map(({ label, el }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  {el}
                </div>
              ))}
            </div>
          </div>

          {/* Riepilogo conversione */}
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
              ✓ Verrà creato: cliente "{clientName}" + commessa "{jobType || '—'}" · il lead verrà segnato come Chiuso
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 15, fontWeight: 700,
              border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed',
              background: canSave ? 'var(--brand)' : 'var(--surface3)',
              color: canSave ? 'white' : 'var(--text-3)',
              boxShadow: canSave ? '0 4px 16px rgba(242,101,34,0.35)' : 'none',
            }}
          >
            {saving ? '⏳ Salvo...' : '🚀 Converti in Cliente'}
          </button>
        </div>
      </div>
    </>
  );
}
