'use client';

import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MOD.PMO Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', minHeight:'60vh', gap:16, padding:32, textAlign:'center',
        }}>
          <div style={{ fontSize:48 }}>⚠️</div>
          <p style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', fontFamily:"'Cormorant Garamond',serif" }}>
            Qualcosa è andato storto
          </p>
          <p style={{ fontSize:13, color:'var(--text-3)', maxWidth:400, lineHeight:1.7 }}>
            {this.state.error?.message ?? 'Errore sconosciuto'}
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={() => this.setState({ hasError:false, error:undefined })}
              style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'var(--brand)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}
            >
              🔄 Riprova
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{ padding:'10px 22px', borderRadius:10, border:'1px solid var(--border2)', background:'none', color:'var(--text-2)', cursor:'pointer', fontSize:13, fontWeight:600 }}
            >
              🏠 Torna alla home
            </button>
          </div>
          <p style={{ fontSize:11, color:'var(--text-3)' }}>
            I tuoi dati sono al sicuro — sono salvati localmente nel browser
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
