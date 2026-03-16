'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/roles';

const STORAGE_KEY = 'pmo_quickstart_seen';

interface Step {
  emoji: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  color: string;
}

const QUICK_START: Record<UserRole, { title: string; sub: string; steps: Step[] }> = {
  ceo: {
    title: 'Benvenuto, Direttore.',
    sub: 'Tre azioni per iniziare bene la giornata.',
    steps: [
      { emoji:'📊', title:'Controlla i KPI', description:'Vedi la salute di tutti i clienti in un colpo solo.', cta:'KPI Clienti →', href:'/clients/health', color:'#F26522' },
      { emoji:'💰', title:'Guarda il forecast', description:'Proiezione ricavi dei prossimi 3 mesi.', cta:'Forecast →', href:'/forecast', color:'#D4AF37' },
      { emoji:'⚡', title:'Chiedi ad Ambrogio', description:'Il tuo assistente AI conosce già i tuoi dati.', cta:'Ambrogio →', href:'/ambrogio', color:'#1E5EFF' },
    ],
  },
  account: {
    title: 'Pronto per i clienti?',
    sub: 'Parti da qui per gestire la tua giornata.',
    steps: [
      { emoji:'📅', title:'Scadenze oggi', description:'Cosa scade nelle prossime 48 ore.', cta:'Scadenze →', href:'/account', color:'#F26522' },
      { emoji:'👥', title:'Stato clienti', description:'Semaforo rapido — chi ha bisogno di attenzione.', cta:'Clienti →', href:'/clients/health', color:'#3b9eff' },
      { emoji:'📤', title:'Approvazioni pending', description:'Contenuti che aspettano risposta dal cliente.', cta:'Editoriale →', href:'/editorial', color:'#4ade80' },
    ],
  },
  smm: {
    title: 'Content time.',
    sub: 'Da qui governi tutto il piano editoriale.',
    steps: [
      { emoji:'📅', title:'Piano del mese', description:'Vedi e gestisci tutti i contenuti pianificati.', cta:'Piano Editoriale →', href:'/editorial', color:'#3b9eff' },
      { emoji:'✨', title:'Crea un contenuto', description:'Caption + hashtag + note visual con AI.', cta:'Nuovo contenuto →', href:'/editorial/new', color:'#4ade80' },
      { emoji:'📱', title:'Chiedi trend ad Ambrogio', description:'Cosa sta funzionando ora sui social.', cta:'Ambrogio SMM →', href:'/ambrogio', color:'#1E5EFF' },
    ],
  },
  designer: {
    title: 'Tutto pronto per creare.',
    sub: 'I brief ti aspettano.',
    steps: [
      { emoji:'🎨', title:'Brief creativi aperti', description:'Contenuti con note visual da produrre.', cta:'Editoriale →', href:'/editorial', color:'#a855f7' },
      { emoji:'🗂', title:'Asset cliente', description:'Loghi, brand kit, foto per ogni cliente.', cta:'Clienti →', href:'/clients', color:'#D4AF37' },
      { emoji:'🖼', title:'Canva Generator', description:'Genera grafiche, copertine e certificati.', cta:'Canva →', href:'/courses/canva', color:'#7C4DFF' },
    ],
  },
  pm: {
    title: 'Il cantiere è aperto.',
    sub: 'Controlla workload e budget prima di tutto.',
    steps: [
      { emoji:'✅', title:'Task in ritardo', description:'Chi è bloccato e cosa sbloccare subito.', cta:'Tracker →', href:'/tasks', color:'#f87171' },
      { emoji:'👥', title:'Workload team', description:'Chi è sovraccarico, chi ha spazio.', cta:'Workload →', href:'/team/workload', color:'#22c55e' },
      { emoji:'💼', title:'Alert budget', description:'Commesse vicine al limite ore.', cta:'Commesse →', href:'/deals', color:'#fbbf24' },
    ],
  },
};

export function QuickStart() {
  const { role } = useRole();
  const router   = useRouter();
  const [show, setShow]       = useState(false);
  const [step, setStep]       = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    const seenRoles = seen ? JSON.parse(seen) : [];
    if (!seenRoles.includes(role)) {
      setTimeout(() => setShow(true), 600); // delay per non sovrapporre al login
    }
  }, [role]);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => {
      const seen = localStorage.getItem(STORAGE_KEY);
      const seenRoles = seen ? JSON.parse(seen) : [];
      if (!seenRoles.includes(role)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...seenRoles, role]));
      }
      setShow(false);
      setClosing(false);
    }, 250);
  };

  const goToStep = (href: string) => {
    dismiss();
    router.push(href);
  };

  if (!show) return null;

  const cfg   = QUICK_START[role];
  const steps = cfg.steps;
  const current = steps[step];

  return (
    <>
      {/* Overlay semi-trasparente */}
      <div onClick={dismiss} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
        zIndex:1000, backdropFilter:'blur(4px)',
        opacity: closing ? 0 : 1, transition:'opacity 250ms',
      }} />

      {/* Card centrale */}
      <div style={{
        position:'fixed', bottom:32, right:32, zIndex:1001,
        width:340, background:'var(--surface)',
        border:'1px solid var(--border2)', borderRadius:20,
        boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
        overflow:'hidden',
        opacity: closing ? 0 : 1,
        transform: closing ? 'translateY(16px)' : 'translateY(0)',
        transition:'all 250ms ease',
        animation:'fadeUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ padding:'20px 22px 16px', borderBottom:'1px solid var(--border)', position:'relative' }}>
          <button onClick={dismiss} style={{
            position:'absolute', top:16, right:16,
            background:'none', border:'none', color:'var(--text-3)',
            cursor:'pointer', fontSize:18, lineHeight:1,
          }}>×</button>
          <p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)', fontFamily:"'Cormorant Garamond',serif", marginBottom:3 }}>
            {cfg.title}
          </p>
          <p style={{ fontSize:12, color:'var(--text-3)' }}>{cfg.sub}</p>
          {/* Step dots */}
          <div style={{ display:'flex', gap:5, marginTop:12 }}>
            {steps.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{
                height:3, flex:1, borderRadius:2, cursor:'pointer',
                background: i <= step ? current.color : 'var(--surface3)',
                transition:'background 300ms',
              }} />
            ))}
          </div>
        </div>

        {/* Step corrente */}
        <div style={{ padding:'18px 22px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
            <div style={{
              width:48, height:48, borderRadius:12, flexShrink:0,
              background:`${current.color}18`, border:`1px solid ${current.color}33`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
            }}>
              {current.emoji}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>{current.title}</p>
              <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>{current.description}</p>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            {step < steps.length - 1 ? (
              <>
                <button onClick={() => setStep(s => s + 1)} style={{
                  flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer',
                  background:current.color, color:'white', fontSize:13, fontWeight:700,
                }}>
                  Avanti →
                </button>
                <button onClick={() => goToStep(current.href)} style={{
                  padding:'9px 14px', borderRadius:9, cursor:'pointer', fontSize:12,
                  border:`1px solid ${current.color}44`, background:`${current.color}08`,
                  color:current.color, fontWeight:600,
                }}>
                  {current.cta}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => goToStep(current.href)} style={{
                  flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer',
                  background:current.color, color:'white', fontSize:13, fontWeight:700,
                }}>
                  {current.cta}
                </button>
                <button onClick={dismiss} style={{
                  padding:'9px 14px', borderRadius:9, cursor:'pointer', fontSize:12,
                  border:'1px solid var(--border2)', background:'none',
                  color:'var(--text-3)', fontWeight:600,
                }}>
                  Fatto
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 22px 14px', display:'flex', justifyContent:'center' }}>
          <button onClick={dismiss} style={{
            fontSize:11, color:'var(--text-3)', background:'none',
            border:'none', cursor:'pointer', textDecoration:'underline',
          }}>
            Non mostrare più per questo ruolo
          </button>
        </div>
      </div>
    </>
  );
}
