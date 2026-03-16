'use client';

import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { useRole } from '@/hooks/useRole';
import { localDateISO } from '@/lib/utils';
import { WeeklyAgenda } from '@/components/WeeklyAgenda';
import { AmbrogioInline } from '@/components/AmbrogioInline';
import { TodayDate } from '@/components/TodayDate';

// ─── Design tokens (evidence-based: NN/g, WCAG 2.2, Apple HIG) ───────────────
// Contrast ratios: text on surface ≥ 7:1, accent ≥ 4.5:1
// Accent: max 3 colors, muted except alerts
// Alert palette: red=immediate, yellow=attention, green=ok, blue=info
// Spacing: 24px chunk gap, 16px inner, 8px tight

const T = {
  gap:    24,   // chunk separator
  inner:  18,   // card padding
  tight:  10,   // between related items
  radius: 14,   // card border radius
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

/** KPI card — max 5 above fold per NN/g Miller's law */
function KpiCard({
  label, value, trend, sub, color = 'var(--text-1)', onClick,
}: {
  label: string; value: string | number; trend?: { val: number; label: string };
  sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: T.radius,
        padding: `${T.inner}px`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color === 'var(--text-1)' ? 'var(--brand)' : color)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Label — small, uppercase, low contrast intentionally (secondary) */}
      <p style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10,
      }}>
        {label}
      </p>

      {/* Value — large, high contrast (primary) */}
      <p style={{
        fontSize: 32, fontWeight: 800, color, lineHeight: 1,
        fontFamily: "'Cormorant Garamond', serif", marginBottom: sub || trend ? 8 : 0,
      }}>
        {value}
      </p>

      {/* Trend sparkline pill */}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: trend.val >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            color: trend.val >= 0 ? '#4ade80' : '#f87171',
          }}>
            {trend.val >= 0 ? '↑' : '↓'} {Math.abs(trend.val)}%
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{trend.label}</span>
        </div>
      )}

      {/* Sub-label */}
      {sub && !trend && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4 }}>{sub}</p>
      )}
    </div>
  );
}

/** Alert item — preattentive color coding */
function Alert({ text, level }: { text: string; level: 'red' | 'yellow' | 'blue' }) {
  const cfg = {
    red:    { color: '#f87171', bg: 'rgba(248,113,113,0.07)', icon: '●' },
    yellow: { color: '#fbbf24', bg: 'rgba(251,191,36,0.07)',  icon: '●' },
    blue:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  icon: '●' },
  }[level];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 9,
      background: cfg.bg, borderLeft: `3px solid ${cfg.color}`,
    }}>
      <span style={{ color: cfg.color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>{cfg.icon}</span>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

/** Quick action — max 4 per gruppo, raggruppate per area funzionale */
function QA({ icon, label, onClick, accent = 'var(--brand)' }: {
  icon: string; label: string; onClick: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap',
        border: `1px solid ${accent}33`, background: `${accent}08`,
        fontSize: 14, fontWeight: 600, color: accent, transition: 'all 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${accent}16`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${accent}08`; }}
    >
      <span style={{ fontSize: 17 }}>{icon}</span>
      {label}
    </button>
  );
}

/** Card contenitore con titolo */
function Section({ title, children, action }: {
  title: string; children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: T.radius,
      padding: T.inner,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{title}</p>
        {action && (
          <button onClick={action.onClick} style={{ fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** Header pagina uniforme */
function HomeHeader({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: T.gap }}>
      <TodayDate />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <span style={{ fontSize: 24 }}>{emoji}</span>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 700, fontSize: 26, color: 'var(--text-1)', lineHeight: 1.1,
          }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ─── HOME CEO ─────────────────────────────────────────────────────────────────
// Principio NN/g: executive view = 3-5s story, whitespace heavy, trends not just numbers
function HomeCEO() {
  const { data } = useData();
  const router   = useRouter();
  const today    = localDateISO();

  // 5 KPI primari (Miller's 7±2)
  const activeClients  = data.clients.filter(c => c.status === 'Attivo').length;
  const pipeline       = data.pipeline.filter(p => !['Chiuso vinto','Chiuso perso'].includes(p.stage))
                             .reduce((s, p) => s + (p.value ?? 0) * ((p.probability ?? 50) / 100), 0);
  const totalH         = data.timeLogs.reduce((s, l) => s + l.hours, 0);
  const billableH      = data.timeLogs.filter(l => l.billable).reduce((s, l) => s + l.hours, 0);
  const utilization    = totalH > 0 ? Math.round((billableH / totalH) * 100) : 0;
  const overdue        = data.tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate < today).length;
  const activeLeads    = data.leads.filter(l => l.statusContact !== 'Chiuso' && l.statusContact !== 'Inattivo').length;

  // Alert (solo quelli azionabili — riduce cognitive load)
  const alerts: { text: string; level: 'red' | 'yellow' | 'blue' }[] = [];
  if (overdue > 0)         alerts.push({ text: `${overdue} task in ritardo — richiedono attenzione immediata`, level: 'red' });
  if (utilization < 60)    alerts.push({ text: `Utilizzo team al ${utilization}% — sotto soglia ottimale (70%)`, level: 'yellow' });
  if (activeLeads >= 3)    alerts.push({ text: `${activeLeads} lead attivi in pipeline`, level: 'blue' });

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1100 }}>
      <HomeHeader emoji="👔" title="Direzione" sub="Panoramica strategica MOD Group" />

      {/* Chunk 1 — KPI primari: 5 card, layout 3+2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: T.tight, marginBottom: T.gap }}>
        <KpiCard label="Clienti attivi"     value={activeClients}
          color="var(--brand)" onClick={() => router.push('/clients')} />
        <KpiCard label="Pipeline ponderata" value={`€${Math.round(pipeline / 1000)}k`}
          color="#60a5fa" onClick={() => router.push('/leads/pipeline')} />
        <KpiCard label="Utilizzo team"      value={`${utilization}%`}
          sub="ore fatturabili / totali"
          color={utilization >= 70 ? '#4ade80' : utilization >= 50 ? '#fbbf24' : '#f87171'}
          onClick={() => router.push('/team/workload')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.tight, marginBottom: T.gap }}>
        <KpiCard label="Task in ritardo"    value={overdue}
          color={overdue === 0 ? '#4ade80' : '#f87171'}
          sub={overdue === 0 ? 'tutto in ordine' : 'richiedono azione'}
          onClick={() => router.push('/tasks')} />
        <KpiCard label="Lead attivi"        value={activeLeads}
          color="var(--text-1)" onClick={() => router.push('/leads')} />
      </div>

      {/* Chunk 2 — Alert + Quick actions (2 colonne) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.gap, marginBottom: T.gap }}>
        <Section title="⚠️ Alert prioritari">
          {alerts.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>✅ Nessun alert — tutto in ordine</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => <Alert key={i} {...a} />)}
              </div>
          }
        </Section>

        <Section title="⚡ Azioni strategiche">
          {/* Raggruppate per area — max 4, poi separatore */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="📊" label="KPI Clienti"   onClick={() => router.push('/clients/health')} />
              <QA icon="💰" label="Forecast"       onClick={() => router.push('/forecast')} />
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="📈" label="Redditività"    onClick={() => router.push('/profitability')} />
              <QA icon="📋" label="Report mensile" onClick={() => router.push('/report')} />
            </div>
          </div>
        </Section>
      </div>

      {/* Chunk 3 — Agenda (progressive disclosure) */}
      <WeeklyAgenda />
    </div>
  );
}

// ─── HOME SMM ─────────────────────────────────────────────────────────────────
// Principio NN/g: operational view = task immediati first, then metrics
function HomeSMM() {
  const { data } = useData();
  const router   = useRouter();
  const today    = localDateISO();
  const thisMonth = today.slice(0, 7);

  const editorial     = data.editorialContent ?? [];
  const thisMonthEd   = editorial.filter(e => e.scheduledDate?.startsWith(thisMonth));
  const published     = thisMonthEd.filter(e => e.status === 'Pubblicato').length;
  const toApprove     = editorial.filter(e => e.approvalStatus === 'pending').length;
  const changesReq    = editorial.filter(e => e.approvalStatus === 'changes_requested').length;
  const todayContent  = editorial.filter(e => e.scheduledDate === today);

  // Progressione mensile
  const monthPct = thisMonthEd.length > 0 ? Math.round((published / thisMonthEd.length) * 100) : 0;

  const alerts: { text: string; level: 'red' | 'yellow' | 'blue' }[] = [];
  if (changesReq > 0)          alerts.push({ text: `${changesReq} contenuti con modifiche richieste dal cliente`, level: 'red' });
  if (toApprove > 0)           alerts.push({ text: `${toApprove} contenuti in attesa di approvazione`, level: 'yellow' });
  if (todayContent.length > 0) alerts.push({ text: `${todayContent.length} contenuti schedulati per oggi`, level: 'blue' });

  const PLATFORM_ICON: Record<string, string> = {
    Instagram: '📸', Facebook: '👥', LinkedIn: '💼',
    TikTok: '🎵', YouTube: '▶️', Pinterest: '📌', Altro: '🌐',
  };

  // Prossimi 5 contenuti
  const upcoming = editorial
    .filter(e => e.status !== 'Pubblicato' && e.scheduledDate >= today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 5);

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1100 }}>
      <HomeHeader emoji="📱" title="Social Media" sub="Piano editoriale e contenuti" />

      {/* Chunk 1 — 4 KPI (Miller's law: max 5) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: T.tight, marginBottom: T.gap }}>
        <KpiCard
          label="Pubblicati / Pianificati"
          value={`${published} / ${thisMonthEd.length}`}
          sub={`${monthPct}% del mese completato`}
          color={monthPct >= 60 ? '#4ade80' : '#fbbf24'}
          onClick={() => router.push('/editorial')}
        />
        <KpiCard
          label="In attesa approvazione"
          value={toApprove}
          color={toApprove > 0 ? '#fbbf24' : '#4ade80'}
          onClick={() => router.push('/editorial')}
        />
        <KpiCard
          label="Modifiche richieste"
          value={changesReq}
          color={changesReq > 0 ? '#f87171' : '#4ade80'}
          onClick={() => router.push('/editorial')}
        />
        <KpiCard
          label="Oggi"
          value={todayContent.length}
          sub="contenuti schedulati"
          onClick={() => router.push('/editorial')}
        />
      </div>

      {/* Chunk 2 — Barra progresso mensile */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: T.radius, padding: T.inner, marginBottom: T.gap,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>📅 Progresso mensile</p>
          <span style={{ fontSize: 13, fontWeight: 700, color: monthPct >= 60 ? '#4ade80' : '#fbbf24' }}>{monthPct}%</span>
        </div>
        {/* Barra — visual immediato, riduce cognitive load vs tabella */}
        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%',
            width: `${monthPct}%`,
            background: monthPct >= 70 ? '#4ade80' : monthPct >= 40 ? '#fbbf24' : '#f87171',
            borderRadius: 4, transition: 'width 400ms ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Pubblicati', val: published,                     color: '#4ade80' },
            { label: 'Da fare',    val: thisMonthEd.length - published, color: 'var(--text-3)' },
          ].map(k => (
            <span key={k.label} style={{ fontSize: 13, color: k.color }}>
              <strong>{k.val}</strong> {k.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chunk 3 — Alert + Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.gap, marginBottom: T.gap }}>
        <Section title="⚠️ Alert">
          {alerts.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>✅ Nessun alert</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => <Alert key={i} {...a} />)}
              </div>
          }
        </Section>

        <Section title="⚡ Azioni rapide">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="📅" label="Piano editoriale"  onClick={() => router.push('/editorial')} />
              <QA icon="✨" label="Nuovo contenuto AI" onClick={() => router.push('/editorial/new')} />
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="📆" label="Pianificatore AI"  onClick={() => router.push('/editorial/plan')} />
              <QA icon="🎨" label="Canva"             onClick={() => router.push('/courses/canva')} accent="#7C4DFF" />
            </div>
          </div>
        </Section>
      </div>

      {/* Chunk 4 — Prossimi contenuti (progressive disclosure) */}
      {upcoming.length > 0 && (
        <Section
          title={`📋 Prossimi contenuti (${upcoming.length})`}
          action={{ label: 'Vedi tutti →', onClick: () => router.push('/editorial') }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map(c => (
              <div key={c.id}
                onClick={() => router.push('/editorial')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', borderRadius: 9,
                  background: 'var(--surface2)', cursor: 'pointer', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{PLATFORM_ICON[c.platform] ?? '📄'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.clientName}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.platform} · {c.format}</p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{c.scheduledDate}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  background: c.approvalStatus === 'approved'          ? 'rgba(74,222,128,0.12)'  :
                              c.approvalStatus === 'changes_requested' ? 'rgba(248,113,113,0.12)' :
                              c.approvalStatus === 'pending'           ? 'rgba(251,191,36,0.12)'  : 'var(--surface3)',
                  color:      c.approvalStatus === 'approved'          ? '#4ade80'  :
                              c.approvalStatus === 'changes_requested' ? '#f87171'  :
                              c.approvalStatus === 'pending'           ? '#fbbf24'  : 'var(--text-3)',
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── HOME ACCOUNT MANAGER ─────────────────────────────────────────────────────
function HomeAccount() {
  const { data } = useData();
  const router   = useRouter();
  const today    = localDateISO();

  const myClients      = data.clients.filter(c => c.status === 'Attivo');
  const openTasks      = data.tasks.filter(t => !t.isCompleted);
  const overdue        = openTasks.filter(t => t.dueDate && t.dueDate < today);
  const pendingApprove = (data.editorialContent ?? []).filter(e => e.approvalStatus === 'pending').length;
  const changesReq     = (data.editorialContent ?? []).filter(e => e.approvalStatus === 'changes_requested').length;
  const hotLeads       = data.leads.filter(l => l.quoteSent && l.statusContact !== 'Chiuso').length;

  const alerts: { text: string; level: 'red' | 'yellow' | 'blue' }[] = [];
  if (overdue.length > 0)      alerts.push({ text: `${overdue.length} task scaduti`, level: 'red' });
  if (changesReq > 0)          alerts.push({ text: `${changesReq} contenuti con modifiche richieste`, level: 'red' });
  if (pendingApprove > 0)      alerts.push({ text: `${pendingApprove} contenuti in attesa approvazione`, level: 'yellow' });
  if (hotLeads > 0)            alerts.push({ text: `${hotLeads} preventivi inviati in attesa risposta`, level: 'blue' });

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1100 }}>
      <HomeHeader emoji="🤝" title="Account Manager" sub="Clienti, scadenze e approvazioni" />

      {/* 4 KPI primari */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: T.tight, marginBottom: T.gap }}>
        <KpiCard label="Clienti attivi"          value={myClients.length}    color="var(--brand)"  onClick={() => router.push('/clients')} />
        <KpiCard label="Task aperti"             value={openTasks.length}    color={overdue.length > 0 ? '#f87171' : 'var(--text-1)'} sub={overdue.length > 0 ? `${overdue.length} in ritardo` : 'in ordine'} onClick={() => router.push('/tasks')} />
        <KpiCard label="In attesa approvazione"  value={pendingApprove}      color={pendingApprove > 0 ? '#fbbf24' : '#4ade80'} onClick={() => router.push('/editorial')} />
        <KpiCard label="Modifiche richieste"     value={changesReq}          color={changesReq > 0 ? '#f87171' : '#4ade80'}     onClick={() => router.push('/editorial')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.gap, marginBottom: T.gap }}>
        <Section title="⚠️ Alert">
          {alerts.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>✅ Tutto in ordine</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{alerts.map((a, i) => <Alert key={i} {...a} />)}</div>}
        </Section>

        <Section title="⚡ Azioni rapide">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="📅" label="Scadenze"       onClick={() => router.push('/account')} />
              <QA icon="👥" label="KPI clienti"    onClick={() => router.push('/clients/health')} />
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="📤" label="Piano editoriale" onClick={() => router.push('/editorial')} />
              <QA icon="📄" label="Preventivo"       onClick={() => router.push('/quotes')} accent="#4ade80" />
            </div>
          </div>
        </Section>
      </div>

      {/* Semaforo clienti — visual immediato */}
      <Section title="👥 Stato clienti"
        action={{ label: 'Vista completa →', onClick: () => router.push('/clients/health') }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {myClients.slice(0, 10).map(c => {
            const hasOverdue = data.tasks.some(t => t.clientName === c.name && !t.isCompleted && t.dueDate && t.dueDate < today);
            const color = hasOverdue ? '#f87171' : '#4ade80';
            return (
              <button key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                style={{
                  fontSize: 14, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                  border: `1px solid ${color}44`, background: `${color}0d`, color,
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                {hasOverdue ? '●' : '●'} {c.name}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ─── HOME DESIGNER ────────────────────────────────────────────────────────────
function HomeDesigner() {
  const { data } = useData();
  const router   = useRouter();
  const today    = localDateISO();

  const editorial    = data.editorialContent ?? [];
  const needsBrief   = editorial.filter(e => e.status !== 'Pubblicato' && !e.visualNotes).length;
  const inReview     = editorial.filter(e => e.status === 'In revisione').length;
  const approved     = editorial.filter(e => e.approvalStatus === 'approved').length;
  const overdueTasks = data.tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate < today).length;

  const alerts: { text: string; level: 'red' | 'yellow' | 'blue' }[] = [];
  if (overdueTasks > 0) alerts.push({ text: `${overdueTasks} task in ritardo`, level: 'red' });
  if (inReview > 0)     alerts.push({ text: `${inReview} contenuti con feedback — da revisionare`, level: 'yellow' });
  if (approved > 0)     alerts.push({ text: `${approved} contenuti approvati — pronti da produrre`, level: 'blue' });
  if (needsBrief > 0)   alerts.push({ text: `${needsBrief} contenuti senza note visual`, level: 'yellow' });

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1100 }}>
      <HomeHeader emoji="🎨" title="Graphic Designer" sub="Asset, brief creativi e produzioni" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: T.tight, marginBottom: T.gap }}>
        <KpiCard label="Task aperti"         value={data.tasks.filter(t=>!t.isCompleted).length} color={overdueTasks>0?'#f87171':'var(--text-1)'} onClick={()=>router.push('/tasks')} />
        <KpiCard label="In revisione"         value={inReview}    color={inReview>0?'#fbbf24':'#4ade80'} onClick={()=>router.push('/editorial')} />
        <KpiCard label="Approvati"            value={approved}    color="#4ade80"  onClick={()=>router.push('/editorial')} />
        <KpiCard label="Senza brief visual"   value={needsBrief}  color={needsBrief>0?'#fbbf24':'#4ade80'} onClick={()=>router.push('/editorial')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.gap }}>
        <Section title="⚠️ Alert">
          {alerts.length === 0 ? <p style={{ fontSize:14, color:'var(--text-3)' }}>✅ Tutto ok</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{alerts.map((a,i)=><Alert key={i} {...a}/>)}</div>}
        </Section>
        <Section title="⚡ Azioni rapide">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="🎨" label="Brief creativi"  onClick={()=>router.push('/editorial')} />
              <QA icon="🖼️" label="Canva Generator" onClick={()=>router.push('/courses/canva')} accent="#7C4DFF" />
            </div>
            <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <QA icon="🗂️" label="Asset clienti"  onClick={()=>router.push('/clients')} />
              <QA icon="✅" label="Tracker task"    onClick={()=>router.push('/tasks')} accent="#4ade80" />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── HOME PROJECT MANAGER ─────────────────────────────────────────────────────
function HomePM() {
  const { data } = useData();
  const router   = useRouter();
  const today    = localDateISO();

  const allOpen     = data.tasks.filter(t => !t.isCompleted);
  const overdue     = allOpen.filter(t => t.dueDate && t.dueDate < today);
  const budgetAlert = data.deals.filter(d => {
    if (!d.budgetOre) return false;
    const used = data.timeLogs.filter(l => l.clientName === d.companyName).reduce((s,l)=>s+l.hours,0);
    return used / d.budgetOre >= (d.alertThreshold ?? 80) / 100;
  }).length;

  const tasksByMember: Record<string, number> = {};
  allOpen.forEach(t => { if (t.responsible) tasksByMember[t.responsible] = (tasksByMember[t.responsible] ?? 0) + 1; });
  const maxLoad = Math.max(...Object.values(tasksByMember), 1);

  const alerts: { text: string; level: 'red' | 'yellow' | 'blue' }[] = [];
  if (overdue.length > 0)  alerts.push({ text: `${overdue.length} task in ritardo`, level: 'red' });
  if (budgetAlert > 0)     alerts.push({ text: `${budgetAlert} commesse vicine al limite budget`, level: 'yellow' });

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1100 }}>
      <HomeHeader emoji="📋" title="Project Manager" sub="Workload, budget e timeline" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: T.tight, marginBottom: T.gap }}>
        <KpiCard label="Task totali aperti"  value={allOpen.length}     color="var(--text-1)"  onClick={()=>router.push('/tasks')} />
        <KpiCard label="In ritardo"           value={overdue.length}     color={overdue.length>0?'#f87171':'#4ade80'} sub={overdue.length===0?'in ordine':undefined} onClick={()=>router.push('/tasks')} />
        <KpiCard label="Commesse attive"      value={data.deals.length}  color="var(--brand)"   onClick={()=>router.push('/deals')} />
        <KpiCard label="Alert budget"         value={budgetAlert}        color={budgetAlert>0?'#fbbf24':'#4ade80'} onClick={()=>router.push('/profitability')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.gap, marginBottom: T.gap }}>
        <Section title="⚠️ Alert">
          {alerts.length === 0 ? <p style={{ fontSize:14, color:'var(--text-3)' }}>✅ Tutto ok</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{alerts.map((a,i)=><Alert key={i} {...a}/>)}</div>}
        </Section>
        <Section title="⚡ Azioni rapide">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', gap:8 }}>
              <QA icon="📋" label="Task"        onClick={()=>router.push('/tasks')} />
              <QA icon="👥" label="Workload"    onClick={()=>router.push('/team/workload')} />
            </div>
            <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />
            <div style={{ display:'flex', gap:8 }}>
              <QA icon="💰" label="Redditività" onClick={()=>router.push('/profitability')} />
              <QA icon="⏱️" label="Time log"    onClick={()=>router.push('/timetracking')} accent="#60a5fa" />
            </div>
          </div>
        </Section>
      </div>

      {/* Workload barre — visual immediato */}
      {Object.keys(tasksByMember).length > 0 && (
        <Section title="👥 Workload team">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {Object.entries(tasksByMember).sort((a,b)=>b[1]-a[1]).map(([name, count]) => {
              const pct   = (count / maxLoad) * 100;
              const color = count > 5 ? '#f87171' : count > 3 ? '#fbbf24' : '#4ade80';
              return (
                <div key={name}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:14, color:'var(--text-1)' }}>{name}</span>
                    <span style={{ fontSize:13, fontWeight:700, color }}>{count} task</span>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:'var(--surface2)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 300ms' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── HOME TRAINER ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role } = useRole();
  // Renderizza SOLO la home del ruolo attivo — gli altri non vengono montati
  switch (role) {
    case 'ceo':      return <HomeCEO />;
    case 'account':  return <HomeAccount />;
    case 'smm':      return <HomeSMM />;
    case 'designer': return <HomeDesigner />;
    case 'pm':       return <HomePM />;
    default:         return <HomeCEO />;
  }
}
