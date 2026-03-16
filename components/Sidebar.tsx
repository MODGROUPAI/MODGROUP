'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { ALL_SECTIONS } from '@/lib/permissions';
import { useData } from '@/hooks/useData';
import { isGodUser } from '@/lib/godMode';
import { localDateISO } from '@/lib/utils';
import Link from 'next/link';

// ── Palette icone stile Canva ─────────────────────────────────────────────────
const ICON_COLORS: Record<string, { bg: string; emoji: string }> = {
  // Overview
  '/ambrogio':       { bg:'#1E5EFF', emoji:'⚡' },
  '/briefing':       { bg:'#F26522', emoji:'🎙' },
  '/daily':          { bg:'#F26522', emoji:'☀️' },
  '/':               { bg:'#22c55e', emoji:'📊' },
  '/tasks':          { bg:'#f87171', emoji:'✅' },
  '/calendar':       { bg:'#60a5fa', emoji:'📅' },
  '/clients/health': { bg:'#a855f7', emoji:'🎯' },
  // Commerciale
  '/leads':          { bg:'#F26522', emoji:'🎯' },
  '/pipeline':       { bg:'#D4AF37', emoji:'📈' },
  '/quotes':         { bg:'#22c55e', emoji:'📄' },
  '/clients':        { bg:'#3b9eff', emoji:'👥' },
  '/clients/agenda': { bg:'#60a5fa', emoji:'🗓' },
  '/onboarding':     { bg:'#4ade80', emoji:'➕' },
  '/deals':          { bg:'#fbbf24', emoji:'💼' },
  '/retainers':      { bg:'#D4AF37', emoji:'📑' },
  // Operativo
  '/account':        { bg:'#F26522', emoji:'📅' },
  '/editorial':      { bg:'#3b9eff', emoji:'📱' },
  '/editorial/new':  { bg:'#4ade80', emoji:'✨' },
  '/editorial/plan': { bg:'#60a5fa', emoji:'🤖' },
  '/report':         { bg:'#a855f7', emoji:'📋' },
  '/timetracking':   { bg:'#fbbf24', emoji:'⏱' },
  '/profitability':  { bg:'#22c55e', emoji:'💰' },
  '/forecast':       { bg:'#1E5EFF', emoji:'🔮' },
  '/suppliers':      { bg:'#6b7280', emoji:'🤝' },
  '/team':           { bg:'#F88379', emoji:'👤' },
  '/team/workload':  { bg:'#F88379', emoji:'⚖️' },
  // Formazione
  '/courses':        { bg:'#F88379', emoji:'🎓' },
  '/remodel':        { bg:'#1E5EFF', emoji:'🌐' },
  '/courses/newsletter': { bg:'#F26522', emoji:'📬' },
  '/courses/canva':  { bg:'#7C4DFF', emoji:'🎨' },
  // Strumenti
  '/templates':      { bg:'#6b7280', emoji:'🗂' },
  '/newsletter':     { bg:'#3b9eff', emoji:'📰' },
  '/contacts':       { bg:'#22c55e', emoji:'📒' },
  '/no-go':          { bg:'#f87171', emoji:'🚫' },
  '/archive':        { bg:'#6b7280', emoji:'📦' },
  '/ai':             { bg:'#a855f7', emoji:'🧠' },
  '/settings':       { bg:'#374151', emoji:'🔐' },
};

function getIcon(href: string) {
  return ICON_COLORS[href] ?? { bg:'#6b7280', emoji:'•' };
}

// ── Gruppi navigazione ────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href:'/ambrogio',       label:'Dott. Ambrogio' },
      { href:'/briefing',       label:'MOD Briefing' },
      { href:'/daily',          label:'Daily Brief' },
      { href:'/',               label:'Dashboard' },
      { href:'/tasks',          label:'Tracker' },
      { href:'/calendar',       label:'Calendario' },
      { href:'/clients/health', label:'KPI Clienti' },
    ],
  },
  {
    label: 'Commerciale',
    items: [
      { href:'/leads',           label:'Lead' },
      { href:'/pipeline',        label:'Pipeline' },
      { href:'/quotes',          label:'Preventivi' },
      { href:'/clients',         label:'Clienti' },
      { href:'/clients/agenda',  label:'Agenda' },
      { href:'/onboarding',      label:'Nuovo Cliente' },
      { href:'/deals',           label:'Commesse' },
      { href:'/retainers',       label:'Retainer' },
    ],
  },
  {
    label: 'Operativo',
    items: [
      { href:'/account',         label:'Scadenze' },
      { href:'/editorial',       label:'Editoriale' },
      { href:'/editorial/new',   label:'Nuovo Post' },
      { href:'/editorial/plan',  label:'AI Planner' },
      { href:'/report',          label:'Report' },
      { href:'/timetracking',    label:'Time Track' },
      { href:'/profitability',   label:'Redditività' },
      { href:'/forecast',        label:'Forecast' },
      { href:'/suppliers',       label:'Fornitori' },
      { href:'/team',            label:'Team' },
    ],
  },
  {
    label: 'Formazione',
    items: [
      { href:'/courses',             label:'Corsi' },
      { href:'/remodel',             label:'Re Model' },
      { href:'/courses/canva',       label:'Canva Generator' },
      { href:'/courses/newsletter',  label:'News Remodel' },
    ],
  },
  {
    label: 'Strumenti',
    items: [
      { href:'/templates',   label:'Template' },
      { href:'/newsletter',  label:'News Team' },
      { href:'/contacts',    label:'Rubrica' },
      { href:'/no-go',       label:'No Go' },
      { href:'/archive',     label:'Archivio' },
      { href:'/ai',          label:'Agent AI' },
      { href:'/settings',    label:'Accessi' },
    ],
  },
];

const SECTION_PATHS = Object.fromEntries(
  ALL_SECTIONS.map(s => [s.path, s.key])
);

export function Sidebar() {
  const path       = usePathname();
  const router     = useRouter();
  const { data }   = useData();
  const { canAccess } = usePermissions();
  const [open, setOpen]   = useState<Set<string>>(new Set(['Overview']));
  const [isGod, setIsGod] = useState(false);
  const today = localDateISO();

  useEffect(() => {
    const memberId = localStorage.getItem('pmo_current_member');
    const member   = data.teamMembers.find((m: {id:string;fullName:string}) => m.id === memberId);
    setIsGod(member ? isGodUser(member.fullName) : false);
  }, [data.teamMembers]);

  // Auto-apri gruppo della pagina attiva
  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      if (g.items.some(i => i.href === path)) {
        setOpen(prev => new Set([...prev, g.label]));
      }
    });
  }, [path]);

  // Badge contatori
  const overdueTasks    = data.tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate < today).length;
  const editorialWaiting = (data.editorialContent ?? []).filter(e => e.approvalStatus === 'pending' || e.approvalStatus === 'changes_requested').length;
  const hotLeads        = data.leads.filter(l => l.quoteSent && l.statusContact !== 'Chiuso').length;
  const budgetAlert     = data.deals.filter(d => {
    if (!d.budgetOre) return false;
    const used = data.timeLogs.filter(l => l.clientName === d.companyName).reduce((s,l)=>s+l.hours,0);
    return used/d.budgetOre >= (d.alertThreshold??80)/100;
  }).length;

  const BADGES: Record<string, number> = {
    '/tasks':    overdueTasks,
    '/editorial':editorialWaiting,
    '/leads':    hotLeads,
    '/deals':    budgetAlert,
  };

  const toggle = (label: string) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <nav style={{ display:'flex', flexDirection:'column', height:'100%', gap:0, overflowX:'hidden', overflowY:'auto' }}>
      <div style={{ flex:1, overflowX:'hidden', paddingBottom:8 }}>
        {NAV_GROUPS.map(group => {
          const isOpen   = open.has(group.label);
          const isActive = group.items.some(i => i.href === path);
          const filtered = group.items.filter(item => {
            const key = SECTION_PATHS[item.href];
            return !key || canAccess(key);
          });
          if (filtered.length === 0) return null;

          return (
            <div key={group.label} style={{ marginBottom:4 }}>
              {/* Header gruppo */}
              <button onClick={() => toggle(group.label)} style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'7px 10px', border:'none', cursor:'pointer', borderRadius:8,
                background:'transparent', transition:'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{
                  fontSize:10, fontWeight:800, letterSpacing:'0.12em',
                  textTransform:'uppercase', color: isActive && !isOpen ? 'var(--brand)' : 'var(--text-3)',
                  fontFamily:"'Montserrat',sans-serif",
                }}>
                  {group.label}
                </span>
                <span style={{
                  fontSize:10, color:'var(--text-3)',
                  transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)',
                  transition:'transform 200ms', display:'inline-block',
                }}>▾</span>
              </button>

              {/* Grid Canva-style */}
              {isOpen && (
                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(3,1fr)',
                  gap:6, padding:'4px 4px 8px',
                }}>
                  {filtered.map(item => {
                    const ic     = getIcon(item.href);
                    const active = path === item.href;
                    const badge  = BADGES[item.href] ?? 0;

                    return (
                      <Link key={item.href} href={item.href} style={{ textDecoration:'none' }}>
                        <div style={{
                          display:'flex', flexDirection:'column', alignItems:'center',
                          gap:5, padding:'10px 4px 8px', borderRadius:14, cursor:'pointer',
                          background: active ? `${ic.bg}18` : 'transparent',
                          border: active ? `2px solid ${ic.bg}66` : '2px solid transparent',
                          transition:'all 150ms', position:'relative',
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            e.currentTarget.style.background = `${ic.bg}10`;
                            e.currentTarget.style.borderColor = `${ic.bg}44`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }
                        }}>
                          {/* Cerchio icona stile Canva */}
                          <div style={{
                            width:46, height:46, borderRadius:'50%',
                            background: active ? ic.bg : `${ic.bg}cc`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:20, flexShrink:0,
                            boxShadow: active ? `0 4px 14px ${ic.bg}55` : 'none',
                            transition:'all 150ms',
                          }}>
                            {ic.emoji}
                          </div>

                          {/* Label */}
                          <span style={{
                            fontSize:11, fontWeight: active ? 700 : 500,
                            color: active ? ic.bg : 'var(--text-2)',
                            textAlign:'center', lineHeight:1.2,
                            wordBreak:'break-word', maxWidth:'100%',
                            fontFamily:"'Montserrat',sans-serif",
                          }}>
                            {item.label}
                          </span>

                          {/* Badge */}
                          {badge > 0 && (
                            <div style={{
                              position:'absolute', top:6, right:6,
                              width:16, height:16, borderRadius:'50%',
                              background:'#f87171', color:'white',
                              fontSize:9, fontWeight:800,
                              display:'flex', alignItems:'center', justifyContent:'center',
                            }}>
                              {badge > 9 ? '9+' : badge}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom: GOD Mode + versione */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, paddingBottom:4 }}>
        {isGod && (
          <Link href="/god" style={{ textDecoration:'none' }}>
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:12, marginBottom:6, cursor:'pointer',
              background: path === '/god' ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.06)',
              border:`1px solid rgba(251,191,36,${path==='/god'?'0.5':'0.25'})`,
              transition:'all 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = path==='/god'?'rgba(251,191,36,0.15)':'rgba(251,191,36,0.06)'}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#fbbf24', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>⚡</div>
              <div>
                <p style={{ fontSize:12, fontWeight:800, color:'#fbbf24', lineHeight:1.2, fontFamily:"'Montserrat',sans-serif" }}>GOD Mode</p>
                <p style={{ fontSize:10, color:'var(--text-3)' }}>Controllo feature</p>
              </div>
            </div>
          </Link>
        )}
        <p style={{ fontSize:10, color:'var(--text-3)', textAlign:'center', paddingBottom:4 }}>
          v1.0 · <span style={{ color:'var(--brand)' }}>modgroup.it</span>
        </p>
      </div>
    </nav>
  );
}
