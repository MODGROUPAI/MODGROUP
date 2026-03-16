'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO, addDaysISO } from '@/lib/utils';
import type { Retainer, RetainerStatus, RetainerPayment, RetainerBillingCycle } from '@/lib/types';

const STATUS_CFG: Record<RetainerStatus, { color: string; bg: string; label: string }> = {
  'Attivo':      { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   label: '✅ Attivo' },
  'In scadenza': { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   label: '⚠️ In scadenza' },
  'Sospeso':     { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   label: '⏸ Sospeso' },
  'Terminato':   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: '⏹ Terminato' },
  'Bozza':       { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: '📝 Bozza' },
};

const BILLING_LABELS: Record<RetainerBillingCycle, string> = {
  'Mensile': '12×/anno', 'Bimestrale': '6×/anno',
  'Trimestrale': '4×/anno', 'Annuale': '1×/anno',
};

function genId(p: string) { return `${p}${Date.now().toString(36).toUpperCase()}`; }

const EMPTY: Omit<Retainer, 'id' | 'createdAt' | 'payments'> = {
  clientName: '', title: '', serviceType: 'Social Media Management',
  status: 'Bozza', billingCycle: 'Mensile', monthlyValue: 0,
  hoursIncluded: undefined, startDate: localDateISO(),
  endDate: undefined, autoRenew: true, renewalNoticeDays: 30,
  responsible: '', driveLink: '', notes: '',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};

export default function RetainersPage() {
  const { data, update } = useData();
  const router = useRouter();
  const today  = localDateISO();

  const retainers = data.retainers ?? [];

  const [modal, setModal]   = useState<Retainer | 'new' | null>(null);
  const [payModal, setPayModal] = useState<Retainer | null>(null);
  const [form, setForm]     = useState<typeof EMPTY>(EMPTY);
  const [filterStatus, setFilterStatus] = useState<RetainerStatus | ''>('');
  const [search, setSearch] = useState('');
  const [newPay, setNewPay] = useState({ dueDate: today, amount: '', invoiceNumber: '', notes: '' });

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calcola status in scadenza (entro 30gg)
  const enriched = useMemo(() => retainers.map(r => {
    let status = r.status;
    if (r.status === 'Attivo' && r.endDate) {
      const daysLeft = Math.round((new Date(r.endDate).getTime() - new Date(today).getTime()) / 86400000);
      if (daysLeft <= (r.renewalNoticeDays ?? 30) && daysLeft > 0) status = 'In scadenza';
      if (daysLeft <= 0) status = 'Terminato';
    }
    return { ...r, status };
  }), [retainers, today]);

  const filtered = useMemo(() => enriched.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return [r.clientName, r.title, r.serviceType].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  }), [enriched, filterStatus, search]);

  // KPI
  const activeRetainers = enriched.filter(r => r.status === 'Attivo' || r.status === 'In scadenza');
  const mrr             = activeRetainers.reduce((s, r) => s + r.monthlyValue, 0);
  const arr             = mrr * 12;
  const expiringSoon    = enriched.filter(r => r.status === 'In scadenza').length;
  const pendingPayments = retainers.reduce((s, r) => s + r.payments.filter(p => !p.paid).length, 0);

  const openNew = () => {
    setForm({ ...EMPTY, startDate: today });
    setModal('new');
  };

  const openEdit = (r: Retainer) => {
    const { id, createdAt, payments, ...rest } = r;
    setForm(rest as typeof EMPTY);
    setModal(r as Retainer);
  };

  const saveRetainer = () => {
    if (!form.clientName.trim() || !form.title.trim()) return;
    const now = today;
    if (modal === 'new') {
      const r: Retainer = {
        id: genId('RET'), ...form,
        monthlyValue: Number(form.monthlyValue) || 0,
        hoursIncluded: form.hoursIncluded ? Number(form.hoursIncluded) : undefined,
        payments: [], createdAt: now,
      };
      update({ retainers: [r, ...retainers] });
    } else if (modal && typeof modal !== 'string') {
      const updated: Retainer = {
        ...modal, ...form,
        monthlyValue: Number(form.monthlyValue) || 0,
        hoursIncluded: form.hoursIncluded ? Number(form.hoursIncluded) : undefined,
        updatedAt: now,
      };
      update({ retainers: retainers.map(r => r.id === updated.id ? updated : r) });
    }
    setModal(null);
  };

  const deleteRetainer = (id: string) => {
    if (!confirm('Eliminare questo retainer?')) return;
    update({ retainers: retainers.filter(r => r.id !== id) });
  };

  // Pagamenti
  const addPayment = () => {
    if (!payModal || !newPay.amount) return;
    const payment: RetainerPayment = {
      id: genId('PAY'), dueDate: newPay.dueDate,
      amount: Number(newPay.amount), paid: false,
      invoiceNumber: newPay.invoiceNumber || undefined,
      notes: newPay.notes || undefined,
    };
    update({ retainers: retainers.map(r => r.id === payModal.id ? { ...r, payments: [...r.payments, payment] } : r) });
    setNewPay({ dueDate: today, amount: '', invoiceNumber: '', notes: '' });
  };

  const togglePaid = (retainerId: string, payId: string) => {
    update({ retainers: retainers.map(r => r.id === retainerId
      ? { ...r, payments: r.payments.map(p => p.id === payId ? { ...p, paid: !p.paid, paidDate: !p.paid ? today : undefined } : p) }
      : r)
    });
  };

  const generatePayments = (r: Retainer) => {
    if (!confirm(`Genera scadenze di pagamento per ${r.title}?`)) return;
    const start  = new Date(r.startDate);
    const end    = r.endDate ? new Date(r.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const step   = r.billingCycle === 'Mensile' ? 1 : r.billingCycle === 'Bimestrale' ? 2 : r.billingCycle === 'Trimestrale' ? 3 : 12;
    const payments: RetainerPayment[] = [];
    for (let i = 0; i < months; i += step) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      if (d > end) break;
      payments.push({
        id: genId('PAY'), dueDate: d.toISOString().slice(0, 10),
        amount: r.monthlyValue * step, paid: false,
      });
    }
    update({ retainers: retainers.map(x => x.id === r.id ? { ...x, payments: [...x.payments, ...payments] } : x) });
  };

  const fmt = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 0 });

  return (
    <div style={{ padding: '28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>
            📑 Contratti & Retainer
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>
            {activeRetainers.length} attivi · MRR €{fmt(mrr)} · ARR €{fmt(arr)}
          </p>
        </div>
        <button onClick={openNew} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', background: 'var(--brand)', color: 'white', cursor: 'pointer' }}>
          + Nuovo Retainer
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'MRR',               val: `€${fmt(mrr)}`,   color: '#4ade80', sub: 'ricorrente mensile' },
          { label: 'ARR',               val: `€${fmt(arr)}`,   color: 'var(--brand)', sub: 'ricorrente annuale' },
          { label: 'In scadenza',        val: expiringSoon,     color: expiringSoon > 0 ? '#fbbf24' : 'var(--text-1)', sub: 'entro preavviso' },
          { label: 'Pagamenti in attesa',val: pendingPayments,  color: pendingPayments > 0 ? '#f87171' : '#4ade80', sub: 'da incassare' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 }}>{k.val}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, maxWidth: 260 }} placeholder="Cerca cliente, titolo..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as RetainerStatus | '')}>
          <option value="">Tutti gli stati</option>
          {(Object.keys(STATUS_CFG) as RetainerStatus[]).map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); }} style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Reset</button>
        )}
      </div>

      {/* Lista retainer */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📑</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
            {retainers.length === 0 ? 'Nessun retainer ancora' : 'Nessun risultato'}
          </p>
          <p style={{ fontSize: 15 }}>{retainers.length === 0 ? 'Aggiungi i contratti ricorrenti dei tuoi clienti' : 'Prova altri filtri'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const cfg          = STATUS_CFG[r.status];
            const paidCount    = r.payments.filter(p => p.paid).length;
            const unpaidAmount = r.payments.filter(p => !p.paid).reduce((s, p) => s + p.amount, 0);
            const paidAmount   = r.payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);

            return (
              <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${r.status === 'In scadenza' ? '#fbbf2444' : 'var(--border2)'}`, borderRadius: 14, padding: '18px 20px', borderLeft: `4px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', padding: '2px 8px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                        {r.billingCycle} · {BILLING_LABELS[r.billingCycle]}
                      </span>
                      {r.autoRenew && <span style={{ fontSize: 11, color: '#60a5fa', padding: '2px 7px', borderRadius: 20, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>🔄 Auto-rinnovo</span>}
                    </div>
                    <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{r.title}</p>
                    <p style={{ fontSize: 14, color: 'var(--text-3)' }}>{r.clientName} · {r.serviceType}</p>
                    {r.responsible && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>👤 {r.responsible}</p>}
                  </div>

                  {/* Valore */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 800, color: 'var(--brand)', lineHeight: 1 }}>€{fmt(r.monthlyValue)}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>/mese</p>
                    {r.hoursIncluded && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>⏱ {r.hoursIncluded}h incluse</p>}
                  </div>

                  {/* Date */}
                  <div style={{ flexShrink: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Dal: <strong style={{ color: 'var(--text-2)' }}>{r.startDate}</strong></p>
                    {r.endDate
                      ? <p style={{ fontSize: 13, color: r.status === 'In scadenza' ? '#fbbf24' : 'var(--text-3)' }}>Al: <strong>{r.endDate}</strong></p>
                      : <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Tempo indeterminato</p>}
                  </div>

                  {/* Pagamenti mini */}
                  {r.payments.length > 0 && (
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3 }}>Pagamenti</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#4ade80' }}>€{fmt(paidAmount)} incassati</p>
                      {unpaidAmount > 0 && <p style={{ fontSize: 13, color: '#f87171' }}>€{fmt(unpaidAmount)} attesi</p>}
                    </div>
                  )}

                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => setPayModal(r)} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.06)', color: '#4ade80', cursor: 'pointer' }}>
                      💳 Pagamenti
                    </button>
                    {r.payments.length === 0 && (
                      <button onClick={() => generatePayments(r)} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.06)', color: '#60a5fa', cursor: 'pointer' }}>
                        📅 Genera scadenze
                      </button>
                    )}
                    {r.driveLink && (
                      <a href={r.driveLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.3)', background: 'none', color: '#4ade80', textDecoration: 'none' }}>📁</a>
                    )}
                    <button onClick={() => openEdit(r)} style={{ fontSize: 13, padding: '5px 9px', borderRadius: 7, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteRetainer(r.id)} style={{ fontSize: 13, padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(248,113,113,0.3)', background: 'none', color: '#f87171', cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal nuovo/modifica retainer ── */}
      {modal !== null && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500 }} onClick={() => setModal(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 501, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{modal === 'new' ? '+ Nuovo Retainer' : 'Modifica Retainer'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Cliente *',        key: 'clientName',      full: true,  placeholder: 'Nome cliente' },
                { label: 'Titolo contratto *',key: 'title',          full: true,  placeholder: 'Es. SMM Mensile, ADV Retainer' },
              ].map(({ label, key, full, placeholder }) => (
                <div key={key} style={{ gridColumn: full ? '1/-1' : 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  <input style={inputStyle} value={(form as unknown as Record<string,string>)[key] ?? ''} onChange={e => setF(key, e.target.value)} placeholder={placeholder} />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo servizio</label>
                <input style={inputStyle} value={form.serviceType} onChange={e => setF('serviceType', e.target.value)} placeholder="Social Media, ADV..." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stato</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => setF('status', e.target.value)}>
                  {(Object.keys(STATUS_CFG) as RetainerStatus[]).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valore mensile €</label>
                <input style={inputStyle} type="number" value={form.monthlyValue} onChange={e => setF('monthlyValue', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ore incluse</label>
                <input style={inputStyle} type="number" value={form.hoursIncluded ?? ''} onChange={e => setF('hoursIncluded', e.target.value)} placeholder="Es. 20" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ciclo fatturazione</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.billingCycle} onChange={e => setF('billingCycle', e.target.value)}>
                  {(['Mensile','Bimestrale','Trimestrale','Annuale'] as RetainerBillingCycle[]).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data inizio</label>
                <input style={inputStyle} type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data fine (opz.)</label>
                <input style={inputStyle} type="date" value={form.endDate ?? ''} onChange={e => setF('endDate', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preavviso disdetta (giorni)</label>
                <input style={inputStyle} type="number" value={form.renewalNoticeDays ?? 30} onChange={e => setF('renewalNoticeDays', parseInt(e.target.value))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsabile</label>
                <input style={inputStyle} value={form.responsible ?? ''} onChange={e => setF('responsible', e.target.value)} list="team-ret" />
                <datalist id="team-ret">{data.teamMembers.map(m => <option key={m.id} value={m.fullName} />)}</datalist>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Link contratto Drive</label>
                <input style={inputStyle} value={form.driveLink ?? ''} onChange={e => setF('driveLink', e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-2)' }}>
                  <input type="checkbox" checked={form.autoRenew} onChange={e => setF('autoRenew', e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                  Rinnovo automatico
                </label>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 18px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>Annulla</button>
              <button onClick={saveRetainer} disabled={!form.clientName.trim() || !form.title.trim()} style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 15, fontWeight: 700, border: 'none', cursor: form.clientName.trim() ? 'pointer' : 'not-allowed', background: form.clientName.trim() ? 'var(--brand)' : 'var(--surface3)', color: form.clientName.trim() ? 'white' : 'var(--text-3)' }}>
                {modal === 'new' ? '+ Crea retainer' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal pagamenti ── */}
      {payModal !== null && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500 }} onClick={() => setPayModal(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 501, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>💳 Pagamenti</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{payModal.clientName} — {payModal.title}</p>
              </div>
              <button onClick={() => setPayModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Lista pagamenti */}
              {payModal.payments.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', padding: '16px' }}>Nessuna scadenza. Aggiungi manualmente o usa "Genera scadenze".</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...payModal.payments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 9, background: p.paid ? 'rgba(74,222,128,0.06)' : p.dueDate < today ? 'rgba(248,113,113,0.06)' : 'var(--surface2)', border: `1px solid ${p.paid ? 'rgba(74,222,128,0.2)' : p.dueDate < today ? 'rgba(248,113,113,0.2)' : 'var(--border)'}` }}>
                      <input type="checkbox" checked={p.paid} onChange={() => togglePaid(payModal.id, p.id)} style={{ accentColor: '#4ade80', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>€{fmt(p.amount)}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Scadenza: {p.dueDate}{p.paidDate ? ` · Pagato: ${p.paidDate}` : ''}{p.invoiceNumber ? ` · Fattura: ${p.invoiceNumber}` : ''}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: p.paid ? '#4ade80' : p.dueDate < today ? '#f87171' : 'var(--text-3)' }}>
                        {p.paid ? '✓ Incassato' : p.dueDate < today ? '⚠ Scaduto' : 'In attesa'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Aggiungi pagamento */}
              <div style={{ padding: '14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>+ Aggiungi pagamento</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scadenza</label>
                    <input style={inputStyle} type="date" value={newPay.dueDate} onChange={e => setNewPay(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Importo €</label>
                    <input style={inputStyle} type="number" value={newPay.amount} onChange={e => setNewPay(p => ({ ...p, amount: e.target.value }))} placeholder={String(payModal.monthlyValue)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>N° fattura</label>
                    <input style={inputStyle} value={newPay.invoiceNumber} onChange={e => setNewPay(p => ({ ...p, invoiceNumber: e.target.value }))} placeholder="FAT-2025-001" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note</label>
                    <input style={inputStyle} value={newPay.notes} onChange={e => setNewPay(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <button onClick={addPayment} disabled={!newPay.amount} style={{ padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: newPay.amount ? 'pointer' : 'not-allowed', background: newPay.amount ? 'var(--brand)' : 'var(--surface3)', color: newPay.amount ? 'white' : 'var(--text-3)' }}>
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
