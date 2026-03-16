import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 700,
            fontSize: '2rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-1)',
            lineHeight: 1.05,
          }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-3)', letterSpacing: '0.04em' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
