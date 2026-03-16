'use client';

import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string; };
  secondary?: { label: string; href: string; };
  size?: 'sm' | 'md' | 'lg';
  // Messaggi con personalità MOD
  hint?: string;   // consiglio contestuale, es. "Premi ⌘K per creare subito"
  mood?: 'neutral' | 'positive' | 'alert';
}

// Messaggi motivazionali per ogni area
const EMPTY_HINTS: Record<string, string[]> = {
  tasks:     ["Nessun task? Giornata serena. Goditi il momento ☀️", "Inbox zero. Questo è il vero successo.", "Tabula rasa. Tutto è possibile."],
  clients:   ["Ogni grande cliente inizia da un primo incontro.", "Il prossimo cliente da sogno è a un preventivo di distanza.", "La pipeline non si riempie da sola — ma quasi, con MOD.PMO."],
  leads:     ["Nessun lead dormiente = nessuna opportunità persa.", "Il momento migliore per coltivare un lead era ieri. Il secondo migliore è adesso.", "Ogni lead è una storia che inizia."],
  editorial: ["Content is king. Ma prima di tutto, content must exist.", "La casella vuota è piena di possibilità.", "Un calendario vuoto è un invito a fare cose bellissime."],
  default:   ["Inizia da qui.", "Tutto pronto — tocca a te.", "Il sistema è pronto. I dati arriveranno."],
};

function getHint(category: string): string {
  const msgs = EMPTY_HINTS[category] ?? EMPTY_HINTS.default;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function EmptyState({ icon, title, description, action, secondary, size = 'md', hint, mood = 'neutral' }: EmptyStateProps) {
  const router = useRouter();
  const padding  = size === 'sm' ? '28px 20px' : size === 'lg' ? '72px 40px' : '48px 28px';
  const iconSize = size === 'sm' ? 38 : size === 'lg' ? 64 : 52;
  const titleFn  = size === 'sm' ? 15 : size === 'lg' ? 22 : 17;

  const accentColor = mood === 'positive' ? '#4ade80' : mood === 'alert' ? '#fbbf24' : 'var(--brand)';

  const handleAction = () => {
    if (action?.onClick) action.onClick();
    else if (action?.href) router.push(action.href);
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', textAlign:'center', padding,
      gap:14, animation:'fadeUp 0.35s ease both',
    }}>
      {/* Icon con alone colorato */}
      <div style={{ position:'relative', marginBottom:6 }}>
        <div style={{
          width: iconSize * 2.4, height: iconSize * 2.4, borderRadius:'50%',
          background:`radial-gradient(circle, ${accentColor}18 0%, transparent 72%)`,
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)', pointerEvents:'none',
        }} />
        <div style={{
          width: iconSize * 1.7, height: iconSize * 1.7, borderRadius:'50%',
          border:`1.5px dashed ${accentColor}30`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: iconSize * 0.65, position:'relative', zIndex:1,
          animation:'spin 20s linear infinite',
        }}>
          {icon}
        </div>
      </div>

      {/* Testo */}
      <div style={{ maxWidth:300 }}>
        <p style={{
          fontSize: titleFn, fontWeight:700, color:'var(--text-1)',
          fontFamily:"'Montserrat',sans-serif", marginBottom:7, lineHeight:1.35,
        }}>
          {title}
        </p>
        <p style={{ fontSize:14, color:'var(--text-3)', lineHeight:1.65, fontFamily:"'Montserrat',sans-serif" }}>
          {description}
        </p>
      </div>

      {/* Hint con personalità */}
      {hint && (
        <div style={{
          fontSize:12, color: accentColor, padding:'6px 14px', borderRadius:20,
          background:`${accentColor}10`, border:`1px solid ${accentColor}25`,
          fontStyle:'italic', maxWidth:280, lineHeight:1.5,
        }}>
          {hint}
        </div>
      )}

      {/* CTA */}
      {(action || secondary) && (
        <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap', justifyContent:'center' }}>
          {action && (
            <button onClick={handleAction} className="btn-primary" style={{ fontSize:13, padding:'8px 18px' }}>
              {action.label}
            </button>
          )}
          {secondary && (
            <button onClick={() => router.push(secondary.href)} className="btn-ghost" style={{ fontSize:13, padding:'8px 16px' }}>
              {secondary.label}
            </button>
          )}
        </div>
      )}

      {/* ⌘K hint */}
      <p style={{ fontSize:11, color:'var(--text-3)', marginTop:-4 }}>
        Premi <kbd style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'var(--surface3)', border:'1px solid var(--border2)', color:'var(--text-2)' }}>⌘K</kbd> per azioni rapide
      </p>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
