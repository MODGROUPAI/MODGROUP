'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { Search, X, ArrowRight, Hash, Clock } from 'lucide-react';

type ResultType = 'task' | 'client' | 'lead' | 'deal' | 'quote' | 'supplier' | 'team' | 'pipeline' | 'contact';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
}

const TYPE_CONFIG: Record<ResultType, { label: string; color: string; emoji: string }> = {
  task:     { label: 'Task',       color: '#60a5fa', emoji: '✅' },
  client:   { label: 'Cliente',    color: '#4ade80', emoji: '🏢' },
  lead:     { label: 'Lead',       color: '#facc15', emoji: '🎯' },
  deal:     { label: 'Commessa',   color: '#fb923c', emoji: '💼' },
  quote:    { label: 'Preventivo', color: '#a78bfa', emoji: '📄' },
  supplier: { label: 'Fornitore',  color: '#34d399', emoji: '🤝' },
  team:     { label: 'Team',       color: '#f472b6', emoji: '👤' },
  pipeline: { label: 'Pipeline',   color: '#38bdf8', emoji: '📈' },
  contact:  { label: 'Contatto',   color: '#94a3b8', emoji: '📇' },
};

const RECENT_KEY = 'pmo_search_recent';
const MAX_RECENT = 5;

function getRecent(): SearchResult[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(result: SearchResult) {
  const prev = getRecent().filter(r => r.id !== result.id).slice(0, MAX_RECENT - 1);
  localStorage.setItem(RECENT_KEY, JSON.stringify([result, ...prev]));
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

// ── Azioni dirette ⌘K ─────────────────────────────────────────────────────────
interface QuickAction {
  id: string;
  label: string;
  description: string;
  emoji: string;
  color: string;
  href?: string;
  action?: () => void;
  shortcut?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id:'new-task',      label:'Nuovo task',           description:'Crea task veloce',             emoji:'✅', color:'#60a5fa', href:'/tasks' },
  { id:'new-content',   label:'Nuovo contenuto',      description:'Post, reel, storia...',         emoji:'✨', color:'#4ade80', href:'/editorial/new' },
  { id:'new-client',    label:'Nuovo cliente',         description:'Avvia onboarding',              emoji:'🏢', color:'#F26522', href:'/onboarding' },
  { id:'new-quote',     label:'Nuovo preventivo',     description:'Genera preventivo',             emoji:'📄', color:'#a855f7', href:'/quotes' },
  { id:'ai-planner',   label:'Pianificatore AI',      description:'Genera piano editoriale mese',  emoji:'🤖', color:'#3b9eff', href:'/editorial/plan' },
  { id:'ambrogio',     label:'Chiedi ad Ambrogio',    description:'Apri assistente AI',            emoji:'⚡', color:'#1E5EFF', href:'/ambrogio' },
  { id:'dashboard',    label:'Dashboard',             description:'Torna alla home',               emoji:'📊', color:'#22c55e', href:'/' },
  { id:'daily',        label:'Daily Brief',           description:'Agenda del giorno',             emoji:'☀️', color:'#F26522', href:'/daily' },
  { id:'retainers',    label:'Retainer',              description:'Contratti ricorrenti',          emoji:'📑', color:'#D4AF37', href:'/retainers' },
  { id:'god',          label:'GOD Mode',              description:'Controllo feature app',         emoji:'⚡', color:'#fbbf24', href:'/god' },
  { id:'settings',     label:'Accessi team',          description:'Gestione permessi',             emoji:'🔐', color:'#6b7280', href:'/settings' },
  { id:'forecast',     label:'Forecast ricavi',       description:'Proiezione entrate',            emoji:'🔮', color:'#1E5EFF', href:'/forecast' },
  { id:'report',       label:'Report mensile',        description:'KPI e analisi clienti',         emoji:'📋', color:'#a855f7', href:'/report' },
];

export function GlobalSearch() {
  const router = useRouter();
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Build index ──────────────────────────────────────────────
  const allResults = useMemo((): SearchResult[] => {
    const res: SearchResult[] = [];

    data.tasks.forEach(t => res.push({
      id: `task_${t.id}`, type: 'task',
      title: t.title,
      subtitle: t.clientName ?? undefined,
      meta: t.dueDate ? `Scade ${t.dueDate}` : t.status,
      href: '/tasks',
    }));

    data.clients.forEach(c => res.push({
      id: `client_${c.id}`, type: 'client',
      title: c.name,
      subtitle: c.sector ?? undefined,
      meta: c.status,
      href: '/clients',
    }));

    data.leads.forEach(l => res.push({
      id: `lead_${l.id}`, type: 'lead',
      title: l.companyName,
      subtitle: l.serviceType ?? undefined,
      meta: l.statusContact,
      href: '/leads',
    }));

    data.deals.forEach(d => res.push({
      id: `deal_${d.id}`, type: 'deal',
      title: d.companyName,
      subtitle: d.jobType ?? undefined,
      meta: d.status,
      href: '/deals',
    }));

    (data.quotes ?? []).forEach(q => res.push({
      id: `quote_${q.id}`, type: 'quote',
      title: `${q.quoteNumber} — ${q.companyName}`,
      subtitle: q.serviceType ?? undefined,
      meta: q.status,
      href: '/quotes',
    }));

    data.suppliers.forEach(s => res.push({
      id: `sup_${s.id}`, type: 'supplier',
      title: s.name,
      subtitle: s.category ?? undefined,
      meta: s.contactName ?? undefined,
      href: '/suppliers',
    }));

    data.teamMembers.forEach(m => res.push({
      id: `team_${m.id}`, type: 'team',
      title: m.fullName,
      subtitle: m.role ?? undefined,
      meta: m.email ?? undefined,
      href: '/team',
    }));

    data.pipeline.forEach(p => res.push({
      id: `pipe_${p.id}`, type: 'pipeline',
      title: p.companyName,
      subtitle: p.serviceType ?? undefined,
      meta: p.stage,
      href: '/pipeline',
    }));

    data.hotelContacts.forEach(c => res.push({
      id: `hc_${c.id}`, type: 'contact',
      title: c.contactName ?? c.propertyName,
      subtitle: c.propertyName,
      meta: c.role ?? undefined,
      href: '/contacts',
    }));

    return res;
  }, [data]);

  // ── Filter ───────────────────────────────────────────────────
  // Filtra azioni rapide
  const filteredActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS.slice(0, 6); // mostra prime 6 di default
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter(a =>
      a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allResults
      .filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q) ||
        r.meta?.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [allResults, query]);

  const recent = useMemo(() => (open && !query.trim() ? getRecent() : []), [open, query]);
  const displayed = query.trim() ? results : recent;

  // ── Keyboard shortcut ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // ── Arrow key nav ────────────────────────────────────────────
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, displayed.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && displayed[selected]) navigate(displayed[selected]);
  }, [displayed, selected]); // eslint-disable-line

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const navigate = useCallback((result: SearchResult) => {
    saveRecent(result);
    router.push(result.href);
    setOpen(false);
    setQuery('');
  }, [router]);

  const runAction = useCallback((action: QuickAction) => {
    if (action.href) router.push(action.href);
    if (action.action) action.action();
    setOpen(false);
    setQuery('');
  }, [router]);

  // ── Group by type ────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<ResultType, SearchResult[]>();
    displayed.forEach(r => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return map;
  }, [displayed]);

  // flat index for keyboard nav
  const flat = displayed;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setQuery(''); setSelected(0); }}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors"
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border2)',
          color: 'var(--text-muted)',
          minWidth: 200,
        }}
      >
        <Search size={13} />
        <span className="flex-1 text-left text-xs">Cerca...</span>
        <kbd
          className="hidden sm:flex items-center gap-0.5 text-xs rounded px-1.5 py-0.5"
          style={{ background: 'var(--surface3)', color: 'var(--text-muted)', fontSize: 12 }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full flex flex-col"
            style={{
              maxWidth: 600,
              maxHeight: '70vh',
              background: 'var(--surface)',
              border: '1px solid var(--border2)',
              borderRadius: 18,
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <Search size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKey}
                placeholder="Cerca task, clienti, lead, preventivi..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)', caretColor: 'var(--brand)' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
              <kbd
                className="text-xs rounded px-1.5 py-0.5 shrink-0"
                style={{ background: 'var(--surface3)', color: 'var(--text-muted)', fontSize: 12 }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1">
              {displayed.length === 0 && query.trim() && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Hash size={24} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Nessun risultato per "<span style={{ color: 'var(--text-primary)' }}>{query}</span>"
                  </p>
                </div>
              )}

              {/* Quick Actions — sempre visibili */}
              <div style={{ padding:'12px 14px 8px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:8 }}>
                  ⚡ Azioni rapide
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                  {filteredActions.map(action => (
                    <button key={action.id} onClick={() => runAction(action)} style={{
                      display:'flex', alignItems:'center', gap:9, padding:'8px 11px',
                      borderRadius:9, border:`1px solid ${action.color}22`,
                      background:`${action.color}08`, cursor:'pointer', textAlign:'left',
                      transition:'all 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${action.color}16`; e.currentTarget.style.borderColor = `${action.color}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${action.color}08`; e.currentTarget.style.borderColor = `${action.color}22`; }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{action.emoji}</span>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{action.label}</p>
                        <p style={{ fontSize:10, color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {filteredActions.length === 0 && query.trim() && (
                  <p style={{ fontSize:12, color:'var(--text-3)', textAlign:'center', padding:'12px 0' }}>Nessuna azione per "{query}"</p>
                )}
              </div>

              {/* Recent */}
              {!query.trim() && recent.length > 0 && (
                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-center gap-1.5 px-2 mb-1">
                    <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Recenti
                    </span>
                  </div>
                  {recent.map((r, i) => {
                    const cfg = TYPE_CONFIG[r.type];
                    const isSelected = i === selected;
                    return (
                      <button
                        key={r.id}
                        data-idx={i}
                        onClick={() => navigate(r)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                        style={{ background: isSelected ? 'var(--surface3)' : 'transparent' }}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <span className="text-base w-5 shrink-0 text-center">{cfg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                          {r.subtitle && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                        {isSelected && <ArrowRight size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search results grouped */}
              {query.trim() && flat.length > 0 && (
                <div className="px-3 py-2">
                  <div className="flex items-center gap-1.5 px-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {flat.length} risultati
                    </span>
                  </div>
                  {Array.from(grouped.entries()).map(([type, items]) => {
                    const cfg = TYPE_CONFIG[type];
                    return (
                      <div key={type} className="mb-2">
                        <div className="flex items-center gap-1.5 px-2 py-1">
                          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: cfg.color, opacity: 0.8 }}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        </div>
                        {items.map(r => {
                          const globalIdx = flat.indexOf(r);
                          const isSelected = globalIdx === selected;
                          return (
                            <button
                              key={r.id}
                              data-idx={globalIdx}
                              onClick={() => navigate(r)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                              style={{ background: isSelected ? 'var(--surface3)' : 'transparent' }}
                              onMouseEnter={() => setSelected(globalIdx)}
                            >
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: 'var(--text-primary)' }}
                                  dangerouslySetInnerHTML={{ __html: highlight(r.title, query) }}
                                />
                                {r.subtitle && (
                                  <p
                                    className="text-xs truncate"
                                    style={{ color: 'var(--text-muted)' }}
                                    dangerouslySetInnerHTML={{ __html: highlight(r.subtitle, query) }}
                                  />
                                )}
                              </div>
                              {r.meta && (
                                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{r.meta}</span>
                              )}
                              {isSelected && <ArrowRight size={13} style={{ color: 'var(--brand)' }} />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div
              className="flex items-center gap-4 px-4 py-2.5 shrink-0"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {[['↑↓', 'naviga'], ['↵', 'apri'], ['ESC', 'chiudi']].map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className="text-xs rounded px-1.5 py-0.5" style={{ background: 'var(--surface3)', fontSize: 12 }}>{key}</kbd>
                  <span className="text-xs">{label}</span>
                </div>
              ))}
              <span className="ml-auto text-xs">{allResults.length} elementi indicizzati</span>
            </div>
          </div>
        </div>
      )}

      {/* Highlight style */}
      <style>{`
        mark {
          background: rgba(200,81,26,0.3);
          color: var(--brand);
          border-radius: 2px;
          padding: 0 1px;
        }
      `}</style>
    </>
  );
}
