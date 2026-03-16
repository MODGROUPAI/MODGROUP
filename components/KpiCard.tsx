import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
  icon?: ReactNode;
  trend?: number;      // delta rispetto a 7gg fa (positivo = crescita)
  trendLabel?: string; // es "vs 7gg fa"
  trendInvert?: boolean; // se true, crescita = male (es. task in ritardo)
}

export function KpiCard({ label, value, sub, highlight, icon, trend, trendLabel = 'vs 7gg fa', trendInvert = false }: KpiCardProps) {
  const hasTrend = trend !== undefined && trend !== 0;
  const trendUp = trend !== undefined && trend > 0;
  // Se trendInvert: crescita è rossa, calo è verde
  const trendColor = hasTrend
    ? (trendUp !== trendInvert ? '#2ecc71' : '#e74c3c')
    : 'var(--text-3)';
  const trendArrow = trendUp ? '↑' : '↓';

  return (
    <div
      className="card relative overflow-hidden p-5"
      style={highlight ? {
        borderColor: 'rgba(242,101,34,0.4)',
        background: 'rgba(242,101,34,0.07)',
      } : {}}
    >
      {highlight && (
        <span className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, var(--brand), transparent)' }} />
      )}
      <div className="flex items-center justify-between mb-3">
        <p style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: '10px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: highlight ? 'var(--brand)' : 'var(--text-3)',
        }}>
          {label}
        </p>
        {icon && <span style={{ color: highlight ? 'var(--brand)' : 'var(--text-3)', opacity: 0.5 }}>{icon}</span>}
      </div>

      {/* Big number */}
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontWeight: 700,
        fontSize: '3.2rem',
        lineHeight: 1,
        letterSpacing: '0.02em',
        color: highlight ? 'var(--brand)' : 'var(--text-1)',
      }}>
        {value}
      </p>

      {/* Trend + sub */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {hasTrend && (
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: trendColor,
            background: `${trendColor}18`,
            padding: '2px 6px', borderRadius: 4,
            fontFamily: "'Montserrat',sans-serif",
            letterSpacing: '0.04em',
            animation: 'fadeUp 0.3s ease both',
          }}>
            {trendArrow} {Math.abs(trend!)} {trendLabel}
          </span>
        )}
        {trend === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'Montserrat',sans-serif" }}>
            = stabile
          </span>
        )}
        {sub && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </div>
  );
}
