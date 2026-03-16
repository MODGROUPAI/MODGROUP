import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { ImportExport } from '@/components/ImportExport';
import { DriveSyncWidget } from '@/components/DriveSyncWidget';
import { QuitButton } from '@/components/QuitButton';
import { GlobalSearch } from '@/components/GlobalSearch';
import { BustSVG } from '@/components/BustSVG';
import { PageShell } from '@/components/PageShell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalShortcuts } from '@/components/GlobalShortcuts';
import { TodayDate } from '@/components/TodayDate';
import { UserPicker } from '@/components/UserPicker';
import { AlertBell } from '@/components/AlertBell';
import { RoleSelector } from '@/components/RoleSelector';
import { QuickStart } from '@/components/QuickStart';
import { DailyRoutine } from '@/components/DailyRoutine';
import { ServiceWorkerRegister } from '@/components/ServiceWorker';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'PMO — MOD Group',
  description: 'Gestionale interno MOD Group.',
};

export const viewport = {
  themeColor: '#F26522',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" style={{ fontFamily: "'Montserrat', -apple-system, sans-serif" }}>
      <body>
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>

          {/* ── Top bar ── */}
          <header
            className="grain relative sticky top-0 z-40 flex items-center justify-between px-6 py-2.5"
            style={{
              background: 'rgba(14,15,19,0.92)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* Left: wordmark */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md text-white font-display text-sm shrink-0 home-logo-btn"
                    style={{ background: 'var(--brand)', letterSpacing: 0, cursor:'pointer', transition:'opacity 150ms' }}
                    title="Torna alla Home"
                  >
                    M
                  </div>
                  <span
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 800,
                      fontSize: 16,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--text-1)',
                    }}
                  >
                    MOD<span style={{ color: 'var(--brand)' }}>.</span>PMO
                  </span>
                </a>
              </div>
              <div
                className="hidden md:block h-4 w-px"
                style={{ background: 'var(--border2)' }}
              />
              <TodayDate />
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2.5">
              <UserPicker />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <GlobalSearch />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <span
                className="hidden md:flex items-center gap-1 text-xs rounded-lg px-2 py-1 cursor-default select-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                title="Premi N per aggiungere un task rapido"
              >
                <span style={{ color: 'var(--brand)', fontWeight: 700 }}>N</span> nuovo task
              </span>
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <ThemeToggle />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <ImportExport />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <RoleSelector />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <AlertBell />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <DriveSyncWidget />
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <a href="https://www.modgroup.it" target="_blank" rel="noopener noreferrer" className="modgroup-link"
                style={{
                  fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
                  border: '1px solid rgba(242,101,34,0.4)', color: 'var(--brand)',
                  background: 'rgba(242,101,34,0.06)', textDecoration: 'none',
                  letterSpacing: '0.05em', transition: 'all 150ms', whiteSpace: 'nowrap',
                }}

              >
                modgroup.it ↗
              </a>
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <QuitButton />
            </div>
          </header>

          {/* ── Body ── */}
          <div className="flex flex-1 overflow-hidden" style={{ display:'flex', flex:1, overflow:'hidden' }}>
            {/* Sidebar */}
            <aside
              className="shrink-0 flex flex-col py-4 px-2"
              style={{
                borderRight: '1px solid var(--border)',
                background: 'var(--surface)',
                minHeight: 'calc(100vh - 45px)',
                width: '216px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingLeft: '6px',
                paddingRight: '6px',
                overflowY: 'auto',
                overflowX: 'hidden',
                height: 'calc(100vh - 44px)',
              }}
            >
              <Sidebar />
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 overflow-y-auto" style={{ flex:1, minWidth:0, overflowY:'auto' }}>
              <div className="px-8 py-7 page-enter">
                <ErrorBoundary>
                  <PageShell>{children}</PageShell>
                </ErrorBoundary>
                <QuickStart />
                <DailyRoutine />
                <ServiceWorkerRegister />
              </div>
            </main>
          </div>

          {/* ── Busto ghost fisso — si adatta al tema ── */}
          <div
            aria-hidden
            className="bust-decoration"
            style={{
              position: 'fixed',
              bottom: '-60px',
              right: '-40px',
              width: 380,
              pointerEvents: 'none',
              zIndex: 0,
              opacity: 0.09,
              color: 'var(--text-1)',
            }}
          >
            <BustSVG style={{ width: '100%', height: 'auto' }} />
          </div>

          {/* Global keyboard shortcuts */}
          <GlobalShortcuts />
        </div>
      </body>
    </html>
  );
}
