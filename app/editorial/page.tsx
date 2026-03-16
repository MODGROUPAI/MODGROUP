'use client';
import { useRouter } from 'next/navigation';

import { useState, useMemo, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useData } from '@/hooks/useData';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { localDateISO } from '@/lib/utils';
import type { EditorialContent, ContentFormat, ContentStatus, ContentPlatform } from '@/lib/types';
import { approvalGate } from '@/lib/approvalGate';
import { CreativeBriefModal } from '@/components/CreativeBriefModal';

const PLATFORMS: ContentPlatform[] = ['Instagram','Facebook','LinkedIn','TikTok','YouTube','Pinterest','Altro'];
const FORMATS: ContentFormat[] = ['Post','Reel','Story','Carousel','Video','UGC','Altro'];
const STATUSES: ContentStatus[] = ['Da fare','In produzione','Bloccato','In revisione','Approvato','Pubblicato','Rimandato'];
const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const STATUS_STYLE: Record<ContentStatus, { bg: string; color: string }> = {
  'Da fare':       { bg: 'rgba(120,120,120,0.15)', color: 'var(--text-3)' },
  'In produzione': { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'Bloccato':      { bg: 'rgba(231,76,60,0.15)',   color: '#fca5a5' },
  'In revisione':  { bg: 'rgba(245,197,24,0.15)',  color: '#fde68a' },
  'Approvato':     { bg: 'rgba(46,204,113,0.15)',  color: '#4ade80' },
  'Pubblicato':    { bg: 'rgba(46,204,113,0.25)',  color: '#22c55e' },
  'Rimandato':     { bg: 'rgba(231,76,60,0.15)',   color: '#f87171' },
};

const PLATFORM_EMOJI: Record<ContentPlatform, string> = {
  'Instagram':'📸','Facebook':'👥','LinkedIn':'💼','TikTok':'🎵','YouTube':'▶️','Pinterest':'📌','Altro':'🌐'
};

const FORMAT_EMOJI: Record<ContentFormat, string> = {
  'Post':'🖼','Reel':'🎬','Story':'⭕','Carousel':'📎','Video':'📹','UGC':'👤','Altro':'📄'
};

const EMPTY_FORM = (): Omit<EditorialContent,'id'> => ({
  clientName: '', platform: 'Instagram', format: 'Post',
  scheduledDate: localDateISO(), status: 'Da fare',
  caption: '', visualNotes: '', driveLink: '', responsible: '',
  approvedBy: '', notes: '', tags: '', blockedReason: '',
  briefChecklist: { textApproved: false, materialsReady: false, styleRef: false, formatConfirmed: false },
});

type ViewMode = 'griglia' | 'lista' | 'kanban';

export default function EditorialPage() {
  const router = useRouter();
  const { data, update } = useData();
  const { user } = useCurrentUser();
  const [myQueueOnly, setMyQueueOnly] = useState(false);
  const [copiedWA, setCopiedWA] = useState<string|null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('griglia');
  const [filterClient, setFilterClient] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [modal, setModal] = useState<EditorialContent | null | 'new'>(null);
  const [form, setForm] = useState<Omit<EditorialContent,'id'>>(EMPTY_FORM());
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [briefContent, setBriefContent] = useState<EditorialContent | null>(null);

  const today = localDateISO();
  const content = data.editorialContent ?? [];
  const clientNames = [...new Set(data.clients.map(c => c.name).filter(Boolean))];
  const teamNames = [...new Set(data.teamMembers.map(t => t.fullName).filter(Boolean))];

  // Mesi disponibili per il filtro
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    for (let i = -1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    content.forEach(c => { if (c.scheduledDate) months.add(c.scheduledDate.slice(0,7)); });
    return [...months].sort();
  }, [content]);

  const filtered = useMemo(() => content.filter(c => {
    if (myQueueOnly && user && c.responsible !== user.name) return false;
    if (filterClient && c.clientName !== filterClient) return false;
    if (filterPlatform && c.platform !== filterPlatform) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterMonth && !c.scheduledDate.startsWith(filterMonth)) return false;
    return true;
  }).sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate)), [content, myQueueOnly, user, filterClient, filterPlatform, filterStatus, filterMonth]);

  // KPI mese corrente
  const monthContent = content.filter(c => c.scheduledDate.startsWith(filterMonth));
  const kpi = {
    total: monthContent.length,
    published: monthContent.filter(c => c.status === 'Pubblicato').length,
    waiting: monthContent.filter(c => c.status === 'In revisione').length,
    todo: monthContent.filter(c => c.status === 'Da fare' || c.status === 'In produzione').length,
    blocked: monthContent.filter(c => c.status === 'Bloccato').length,
  };

  // Alert: in revisione da più di 2 giorni
  const waitingAlert = content.filter(c => {
    if (c.status === 'Bloccato') return true; // bloccati sempre in alert
    if (c.status !== 'In revisione') return false;
    if (!c.waitingSince) return false;
    const diff = (new Date(today).getTime() - new Date(c.waitingSince).getTime()) / 86400000;
    return diff >= 2;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── Approvazione contenuti ────────────────────────────────────────────────

  const sendForApproval = (item: EditorialContent) => {
    if (!approvalGate({
      action: 'Invia contenuto per approvazione cliente',
      recipient: item.clientName,
      warnings: [
        'Il cliente riceverà un link per vedere e approvare questo contenuto',
        `Contenuto: ${item.platform} ${item.format} del ${item.scheduledDate}`,
      ],
    })) return;
    const token = item.id + '-' + Date.now().toString(36);
    const now   = new Date().toISOString().slice(0, 10);
    const revision = { id: 'REV' + Date.now(), date: now, action: 'sent_for_approval' as const, by: 'Team MOD' };
    const updated = {
      ...item,
      approvalToken:        token,
      approvalRequestedAt:  now,
      approvalStatus:       'pending' as const,
      status:               'In revisione' as const,
      revisionHistory:      [...(item.revisionHistory ?? []), revision],
    };
    update({ editorialContent: (data.editorialContent ?? []).map(e => e.id === item.id ? updated : e) });
    const url = window.location.origin + '/approve/' + token;
    navigator.clipboard.writeText(url);
    alert('Link di approvazione copiato!\n\n' + url + '\n\nInvialo al cliente via email o WhatsApp.');
  };

  const getApprovalBadge = (item: EditorialContent) => {
    if (!item.approvalStatus) return null;
    const map = {
      pending:           { label: '⏳ In attesa',    color: '#fbbf24' },
      approved:          { label: '✅ Approvato',     color: '#4ade80' },
      changes_requested: { label: '💬 Modifiche',     color: '#f87171' },
    };
    return map[item.approvalStatus] ?? null;
  };


  const copyWhatsApp = useCallback((item: EditorialContent) => {
    const msg = `✅ *Contenuto approvato!*

` +
      `📱 *${item.platform}* — ${item.format}
` +
      `👤 Cliente: ${item.clientName}
` +
      `📅 Data: ${item.scheduledDate}
` +
      (item.caption ? `
💬 Caption:
${item.caption}
` : '') +
      (item.driveLink ? `
📁 Materiali: ${item.driveLink}
` : '') +
      `
_Approvato da ${item.approvedBy || 'team MOD'}_`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedWA(item.id);
      setTimeout(() => setCopiedWA(null), 2000);
    });
  }, []);

  const openNew = () => {
    setForm({ ...EMPTY_FORM(), clientName: filterClient || '' });
    setModal('new');
  };

  const openEdit = (item: EditorialContent) => {
    const { id, ...rest } = item;
    setForm(rest);
    setModal(item);
  };

  const handleSave = () => {
    if (!form.clientName || !form.scheduledDate) return;
    const now = localDateISO();
    const saved: EditorialContent = {
      id: modal === 'new' ? `EC${Date.now()}` : (modal as EditorialContent).id,
      ...form,
      waitingSince: form.status === 'In revisione'
        ? (modal !== 'new' && (modal as EditorialContent).status === 'In revisione'
            ? (modal as EditorialContent).waitingSince
            : now)
        : undefined,
    };
    const exists = content.find(c => c.id === saved.id);
    update({ editorialContent: exists
      ? content.map(c => c.id === saved.id ? saved : c)
      : [saved, ...content]
    });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    update({ editorialContent: content.filter(c => c.id !== id) });
    setDeleteId(null);
    if (modal !== 'new' && (modal as EditorialContent)?.id === id) setModal(null);
  };

  const quickStatus = (id: string, status: ContentStatus) => {
    update({ editorialContent: content.map(c => c.id === id
      ? { ...c, status, waitingSince: status === 'In revisione' ? (c.waitingSince ?? today) : undefined,
          publishedDate: status === 'Pubblicato' ? today : c.publishedDate }
      : c
    )});
  };

  // ── Vista griglia (per cliente/data) ─────────────────────────────────────
  const byClient = useMemo(() => {
    const map: Record<string, EditorialContent[]> = {};
    filtered.forEach(c => {
      if (!map[c.clientName]) map[c.clientName] = [];
      map[c.clientName].push(c);
    });
    return map;
  }, [filtered]);

  // Giorni del mese per griglia calendario
  const [mYear, mMonthIdx] = filterMonth.split('-').map(Number);
  const daysInMonth = new Date(mYear, mMonthIdx, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) =>
    `${filterMonth}-${String(i+1).padStart(2,'0')}`
  );

  const monthLabel = (() => {
    const [y, m] = filterMonth.split('-');
    return `${MONTHS[parseInt(m)-1]} ${y}`;
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <PageHeader title="Piano Editoriale" description={`${monthLabel} · ${kpi.total} contenuti pianificati`} />
        <button onClick={() => router.push('/editorial/new')}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white flex items-center gap-2"
          style={{ background: 'var(--brand)' }}>
          + Nuovo contenuto
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Totale', val: kpi.total, color: 'var(--text-1)' },
          { label: 'Pubblicati', val: kpi.published, color: '#22c55e' },
          { label: 'In revisione', val: kpi.waiting, color: '#fde68a' },
          { label: 'Da fare / WIP', val: kpi.todo, color: '#60a5fa' },
          ...(kpi.blocked > 0 ? [{ label: '🚫 Bloccati', val: kpi.blocked, color: '#fca5a5' }] : []),
        ].map(k => (
          <div key={k.label} className="card px-4 py-3">
            <p className="label mb-1">{k.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: k.color, fontFamily: 'Cormorant Garamond, serif' }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Alert attesa */}
      {waitingAlert.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.25)' }}>
          <span style={{ color: '#f5c518' }}>⏳</span>
          <span className="text-sm" style={{ color: '#fde68a' }}>
            {waitingAlert.length === 1
              ? `"${waitingAlert[0].clientName}" — 1 contenuto in attesa approvazione da oltre 2 giorni`
              : `${waitingAlert.length} contenuti in attesa approvazione da oltre 2 giorni`}
          </span>
        </div>
      )}

      {/* Filtri + view toggle */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Mese */}
        <select className="input" style={{ width: 'auto', fontSize: 14 }}
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {availableMonths.map(m => {
            const [y, mo] = m.split('-');
            return <option key={m} value={m}>{MONTHS[parseInt(mo)-1]} {y}</option>;
          })}
        </select>

        {/* Cliente */}
        <select className="input" style={{ width: 'auto', fontSize: 14 }}
          value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">Tutti i clienti</option>
          {clientNames.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Piattaforma */}
        <select className="input" style={{ width: 'auto', fontSize: 14 }}
          value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">Tutte le piattaforme</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_EMOJI[p]} {p}</option>)}
        </select>

        {/* Stato */}
        <select className="input" style={{ width: 'auto', fontSize: 14 }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tutti gli stati</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface2)' }}>
          {(['griglia','lista','kanban'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all"
              style={{
                background: viewMode === v ? 'var(--brand)' : 'transparent',
                color: viewMode === v ? '#fff' : 'var(--text-3)',
              }}>
              {v === 'griglia' ? '📅 Griglia' : v === 'lista' ? '☰ Lista' : '⬛ Kanban'}
            </button>
          ))}
        </div>
      </div>

      {/* ── VISTA GRIGLIA (calendario per cliente) ── */}
      {viewMode === 'griglia' && (
        <div className="overflow-x-auto">
          {Object.keys(byClient).length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-3xl mb-3">📅</p>
              <p className="font-medium mb-1" style={{ color: 'var(--text-1)' }}>Nessun contenuto per questo mese</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>Inizia a pianificare i contenuti per i tuoi clienti</p>
              <button onClick={() => router.push('/editorial/new')} className="rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--brand)' }}>+ Primo contenuto</button>
            </div>
          ) : (
            <table style={{ minWidth: `${daysInMonth * 48 + 160}px`, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 text-left px-3 py-2 text-xs" style={{ background: 'var(--surface)', color: 'var(--text-3)', fontWeight: 700, minWidth: 140, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    Cliente
                  </th>
                  {monthDays.map(day => {
                    const d = parseInt(day.split('-')[2]);
                    const dow = new Date(day+'T12:00:00').getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    const isToday = day === today;
                    return (
                      <th key={day} className="text-center px-0.5 py-2"
                        style={{
                          width: 44, minWidth: 44, fontSize: 12, fontWeight: isToday ? 800 : 500,
                          color: isToday ? 'var(--brand)' : isWeekend ? 'var(--text-3)' : 'var(--text-2)',
                          background: isToday ? 'rgba(200,81,26,0.07)' : 'var(--surface)',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: isToday ? '1px solid rgba(200,81,26,0.3)' : '1px solid var(--border)',
                        }}>
                        <div style={{ opacity: 0.5, fontSize: 11, letterSpacing: '0.06em' }}>
                          {['D','L','M','M','G','V','S'][dow]}
                        </div>
                        {d}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byClient).map(([clientName, items]) => (
                  <tr key={clientName}>
                    <td className="sticky left-0 z-10 px-3 py-2 text-sm font-semibold"
                      style={{ background: 'var(--surface)', color: 'var(--text-1)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', maxWidth: 140 }}>
                      <span className="truncate block">{clientName}</span>
                    </td>
                    {monthDays.map(day => {
                      const dayItems = items.filter(i => i.scheduledDate === day);
                      const isToday = day === today;
                      return (
                        <td key={day} className="align-top p-0.5"
                          style={{
                            borderBottom: '1px solid var(--border)',
                            borderLeft: isToday ? '1px solid rgba(200,81,26,0.2)' : '1px solid var(--border)',
                            background: isToday ? 'rgba(200,81,26,0.03)' : 'transparent',
                            verticalAlign: 'top',
                            minWidth: 44,
                          }}>
                          <div className="flex flex-col gap-0.5">
                            {dayItems.map(item => {
                              const st = STATUS_STYLE[item.status];
                              return (
                                <button key={item.id} onClick={() => openEdit(item)}
                                  title={`${item.platform} · ${item.format}\n${item.caption || ''}`}
                                  className="w-full rounded text-left truncate transition-opacity hover:opacity-80"
                                  style={{ background: st.bg, padding: '2px 4px', fontSize: 11, lineHeight: '14px', color: st.color }}>
                                  {PLATFORM_EMOJI[item.platform]} {FORMAT_EMOJI[item.format]}
                                </button>
                              );
                            })}
                            {/* Click su cella vuota = nuovo contenuto per quel giorno/cliente */}
                            <button onClick={() => { setForm({ ...EMPTY_FORM(), clientName, scheduledDate: day }); setModal('new'); }}
                              className="w-full rounded opacity-0 hover:opacity-100 transition-opacity"
                              style={{ background: 'rgba(200,81,26,0.08)', fontSize: 11, padding: '2px 4px', color: 'var(--brand)' }}>
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── VISTA LISTA ── */}
      {viewMode === 'lista' && (
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nessun contenuto. Clicca "+ Nuovo contenuto" per iniziare.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Data','Cliente','Piattaforma','Formato','Stato','Responsabile','Drive',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ color: 'var(--text-3)', fontWeight: 600, fontSize: 13, background: 'var(--surface2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const st = STATUS_STYLE[item.status];
                  const isLate = item.scheduledDate < today && item.status !== 'Pubblicato' && item.status !== 'Rimandato';
                  const isWaiting2d = item.status === 'In revisione' && item.waitingSince &&
                    (new Date(today).getTime() - new Date(item.waitingSince).getTime()) / 86400000 >= 2;
                  return (
                    <tr key={item.id}
                      onClick={() => openEdit(item)}
                      className="cursor-pointer transition-colors group"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isLate ? 'rgba(231,76,60,0.05)' : isWaiting2d ? 'rgba(245,197,24,0.05)' : 'transparent',
                      }}>
                      <td className="px-4 py-3 font-medium" style={{ color: isLate ? '#f87171' : 'var(--text-1)', whiteSpace: 'nowrap' }}>
                        {item.scheduledDate.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-1)' }}>{item.clientName}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>{PLATFORM_EMOJI[item.platform]} {item.platform}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>{FORMAT_EMOJI[item.format]} {item.format}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: st.bg, color: st.color }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{item.responsible || '—'}</td>
                      <td className="px-4 py-3">
                        {item.driveLink
                          ? <a href={item.driveLink} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ color: '#4ade80', background: 'rgba(46,204,113,0.1)' }}>↗ Drive</a>
                          : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Quick status buttons */}
                          {item.status !== 'Pubblicato' && (
                            <button onClick={() => quickStatus(item.id, 'Pubblicato')}
                              title="Segna come pubblicato"
                              className="rounded-lg px-2 py-1 text-xs font-medium"
                              style={{ background: 'rgba(46,204,113,0.15)', color: '#4ade80' }}>✓ Pub</button>
                          )}
                          <button onClick={() => setDeleteId(item.id)}
                            className="rounded-lg p-1.5"
                            style={{ background: 'var(--surface3)', color: 'var(--text-3)' }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── VISTA KANBAN (per stato) ── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-3 gap-3" style={{ gridTemplateColumns: 'repeat(6,1fr)', overflowX: 'auto' }}>
          {STATUSES.map(status => {
            const col = filtered.filter(c => c.status === status);
            const st = STATUS_STYLE[status];
            return (
              <div key={status} className="rounded-xl p-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', minWidth: 180 }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold" style={{ color: st.color }}>{status}</span>
                  <span className="text-xs rounded-full px-2 py-0.5" style={{ background: st.bg, color: st.color }}>{col.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {col.map(item => (
                    <button key={item.id} onClick={() => openEdit(item)}
                      className="w-full text-left rounded-xl p-3 transition-opacity hover:opacity-80"
                      style={{ background: 'var(--surface)', border: `1px solid var(--border2)` }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span style={{ fontSize: 15 }}>{PLATFORM_EMOJI[item.platform]}</span>
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{item.clientName}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>
                        {FORMAT_EMOJI[item.format]} {item.format} · {item.scheduledDate.split('-').reverse().join('/')}
                      </p>
                      {item.caption && <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{item.caption}</p>}
                      {item.driveLink && (
                        <a href={item.driveLink} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs mt-1 inline-block px-1.5 py-0.5 rounded"
                          style={{ color: '#4ade80', background: 'rgba(46,204,113,0.1)' }}>↗ Drive</a>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FORM ── */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>
                {modal === 'new' ? '+ Nuovo contenuto' : 'Modifica contenuto'}
              </h2>
              <div className="flex items-center gap-2">
                {modal !== 'new' && (
                  <button onClick={() => setDeleteId((modal as EditorialContent).id)}
                    className="rounded-lg px-3 py-1.5 text-xs"
                    style={{ background: 'rgba(231,76,60,0.1)', color: '#f87171' }}>🗑 Elimina</button>
                )}
                <button onClick={() => setModal(null)} style={{ color: 'var(--text-3)', fontSize: 20 }}>✕</button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto grid grid-cols-2 gap-4">
              {/* Cliente */}
              <div>
                <label className="label">Cliente *</label>
                <input className="input" list="ec-clients" value={form.clientName}
                  onChange={e => set('clientName', e.target.value)} placeholder="Nome cliente" />
                <datalist id="ec-clients">{clientNames.map(c => <option key={c} value={c} />)}</datalist>
              </div>

              {/* Data */}
              <div>
                <label className="label">Data pianificata *</label>
                <input className="input" type="date" value={form.scheduledDate}
                  onChange={e => set('scheduledDate', e.target.value)} />
              </div>

              {/* Piattaforma */}
              <div>
                <label className="label">Piattaforma</label>
                <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_EMOJI[p]} {p}</option>)}
                </select>
              </div>

              {/* Formato */}
              <div>
                <label className="label">Formato</label>
                <select className="input" value={form.format} onChange={e => set('format', e.target.value)}>
                  {FORMATS.map(f => <option key={f} value={f}>{FORMAT_EMOJI[f]} {f}</option>)}
                </select>
              </div>

              {/* Stato */}
              <div>
                <label className="label">Stato</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Responsabile */}
              <div>
                <label className="label">Responsabile</label>
                <input className="input" list="ec-team" value={form.responsible || ''}
                  onChange={e => set('responsible', e.target.value)} placeholder="Chi crea il contenuto" />
                <datalist id="ec-team">{teamNames.map(t => <option key={t} value={t} />)}</datalist>
              </div>

              {/* Motivo blocco - visibile solo se Bloccato */}
              {form.status === 'Bloccato' && (
                <div className="col-span-2">
                  <label className="label" style={{ color: '#fca5a5' }}>🚫 Cosa manca / motivo blocco</label>
                  <input className="input" value={(form as any).blockedReason || ''}
                    onChange={e => set('blockedReason', e.target.value)}
                    placeholder="Es: manca il testo approvato, attendere foto del cliente..."
                    style={{ borderColor: 'rgba(252,165,165,0.4)' }} />
                </div>
              )}

              {/* Drive Link */}
              <div className="col-span-2">
                <label className="label">Link Google Drive (materiali)</label>
                <input className="input" type="url" value={form.driveLink || ''}
                  onChange={e => set('driveLink', e.target.value)} placeholder="https://drive.google.com/..." />
              </div>

              {/* Caption */}
              <div className="col-span-2">
                <label className="label">Caption / Testo</label>
                <textarea className="input resize-none" rows={3} value={form.caption || ''}
                  onChange={e => set('caption', e.target.value)} placeholder="Testo del post..." />
              </div>

              {/* Brief visivo */}
              <div className="col-span-2">
                <label className="label">Brief visivo</label>
                <textarea className="input resize-none" rows={2} value={form.visualNotes || ''}
                  onChange={e => set('visualNotes', e.target.value)} placeholder="Indicazioni per foto/video, palette, mood..." />
              </div>

              {/* Brief checklist */}
              <div className="col-span-2">
                <label className="label">Checklist brief</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { key: 'textApproved',    label: '✍️ Testo approvato' },
                    { key: 'materialsReady',  label: '🖼 Materiali ricevuti' },
                    { key: 'styleRef',        label: '🎨 Riferimento stilistico' },
                    { key: 'formatConfirmed', label: '📐 Formato confermato' },
                  ] as const).map(({ key, label }) => {
                    const checked = (form as any).briefChecklist?.[key] ?? false;
                    return (
                      <button key={key}
                        onClick={() => set('briefChecklist', { ...((form as any).briefChecklist ?? {}), [key]: !checked })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${checked ? 'rgba(46,204,113,0.4)' : 'var(--border2)'}`,
                          background: checked ? 'rgba(46,204,113,0.08)' : 'var(--surface2)',
                          color: checked ? '#4ade80' : 'var(--text-2)',
                          fontSize: 14, fontWeight: 500, transition: 'all 150ms',
                          textAlign: 'left',
                        }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${checked ? '#4ade80' : 'var(--border2)'}`,
                          background: checked ? '#4ade80' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: 'white', transition: 'all 150ms',
                        }}>
                          {checked ? '✓' : ''}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="label">Tag / Hashtag</label>
                <input className="input" value={form.tags || ''}
                  onChange={e => set('tags', e.target.value)} placeholder="#brand #prodotto" />
              </div>

              {/* Approvato da */}
              <div>
                <label className="label">Approvato da</label>
                <input className="input" value={form.approvedBy || ''}
                  onChange={e => set('approvedBy', e.target.value)} placeholder="Nome referente cliente" />
              </div>

              {/* Note */}
              <div className="col-span-2">
                <label className="label">Note interne</label>
                <textarea className="input resize-none" rows={2} value={form.notes || ''}
                  onChange={e => set('notes', e.target.value)} placeholder="Note operative..." />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Quick status nel footer */}
              {modal !== 'new' && (
                <div className="flex gap-2 flex-wrap">
                  {(['In revisione','Approvato','Pubblicato'] as ContentStatus[]).map(s => {
                    const st = STATUS_STYLE[s];
                    const active = form.status === s;
                    return (
                      <button key={s} onClick={() => set('status', s)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
                        style={{ background: active ? st.bg : 'var(--surface3)', color: active ? st.color : 'var(--text-3)', border: active ? `1px solid ${st.color}44` : '1px solid transparent' }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                {modal !== 'new' && (modal as EditorialContent).approvalStatus && (() => {
                  const badge = getApprovalBadge(modal as EditorialContent);
                  return badge ? (
                    <span style={{ padding:'6px 14px', borderRadius:10, fontSize:13, fontWeight:700, color:badge.color, background:badge.color+'18', border:`1px solid ${badge.color}44` }}>
                      {badge.label}
                      {(modal as EditorialContent).clientFeedback && (
                        <span style={{ display:'block', fontSize:12, fontWeight:400, marginTop:2, color:'var(--text-3)' }}>
                          "{(modal as EditorialContent).clientFeedback}"
                        </span>
                      )}
                    </span>
                  ) : null;
                })()}
                {modal !== 'new' && !['Pubblicato'].includes(form.status) && (
                  <button onClick={() => sendForApproval(modal as EditorialContent)}
                    style={{ padding:'8px 14px', borderRadius:10, fontSize:13, fontWeight:700, border:'1px solid rgba(74,222,128,0.4)', background:'rgba(74,222,128,0.06)', color:'#4ade80', cursor:'pointer' }}>
                    📤 Invia approvazione
                  </button>
                )}
                {modal !== 'new' && form.status === 'Approvato' && (
                  <button onClick={() => copyWhatsApp(modal as EditorialContent)}
                    style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      border: '1px solid rgba(37,211,102,0.4)',
                      background: copiedWA === (modal as EditorialContent)?.id ? 'rgba(37,211,102,0.15)' : 'transparent',
                      color: '#25d366', cursor: 'pointer', transition: 'all 150ms',
                    }}>
                    {copiedWA === (modal as EditorialContent)?.id ? '✅ Copiato!' : '📱 Copia per WhatsApp'}
                  </button>
                )}
                <button onClick={() => setModal(null)}
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{ border: '1px solid var(--border2)', color: 'var(--text-3)' }}>
                  Annulla
                </button>
                <button onClick={handleSave}
                  disabled={!form.clientName || !form.scheduledDate}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: 'var(--brand)' }}>
                  {modal === 'new' ? 'Crea' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-80 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}>
            <p className="font-medium mb-2" style={{ color: 'var(--text-1)' }}>Eliminare questo contenuto?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>L'operazione non è reversibile.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="rounded-xl px-4 py-2 text-sm"
                style={{ border: '1px solid var(--border2)', color: 'var(--text-3)' }}>Annulla</button>
              <button onClick={() => handleDelete(deleteId)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white"
                style={{ background: '#e74c3c' }}>Elimina</button>
            </div>
          </div>
        </div>
      )}
      {briefContent && (
        <CreativeBriefModal
          content={briefContent}
          client={data.clients.find(c => c.name === briefContent.clientName || c.id === briefContent.clientId)}
          onClose={() => setBriefContent(null)}
          onSave={(updated) => {
            update({ editorialContent: (data.editorialContent ?? []).map(e => e.id === updated.id ? updated : e) });
            setBriefContent(null);
          }}
        />
      )}
    </div>
  );
}
