'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import type { Client, ClientAsset, AssetType } from '@/lib/types';

const ASSET_CONFIG: Record<AssetType, { icon: string; label: string; color: string }> = {
  logo:          { icon: '🔷', label: 'Logo',            color: '#3b9eff' },
  brand_kit:     { icon: '🎨', label: 'Brand Kit',       color: '#a855f7' },
  photo:         { icon: '📷', label: 'Fotografie',      color: '#F26522' },
  video:         { icon: '🎬', label: 'Video',           color: '#ef4444' },
  font:          { icon: '🔤', label: 'Font',            color: '#D4AF37' },
  color_palette: { icon: '🎨', label: 'Palette Colori',  color: '#ec4899' },
  template:      { icon: '📐', label: 'Template',        color: '#22c55e' },
  document:      { icon: '📄', label: 'Documenti',       color: '#6b7280' },
  other:         { icon: '📦', label: 'Altro',           color: '#8b5cf6' },
};

const ASSET_TYPES = Object.keys(ASSET_CONFIG) as AssetType[];

function genId() { return `AST${Date.now().toString(36).toUpperCase()}`; }

const EMPTY_FORM = {
  type:        'photo' as AssetType,
  name:        '',
  description: '',
  driveLink:   '',
  url:         '',
  version:     '',
  tags:        '',
  approved:    false,
};

export default function ClientAssetsPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { data, update } = useData();
  const today = localDateISO();

  const client = data.clients.find(c => c.id === id);
  const assets = client?.assets ?? [];

  const [modal, setModal]     = useState<ClientAsset | 'new' | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState<AssetType | ''>('');
  const [search, setSearch]   = useState('');
  const [currentUser]         = useState(data.teamMembers[0]?.fullName ?? 'Team MOD');

  if (!client) return (
    <div style={{ padding: 40, color: 'var(--text-3)' }}>
      Cliente non trovato.
      <button onClick={() => router.push('/clients')} style={{ marginLeft: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>← Clienti</button>
    </div>
  );

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const filtered = assets.filter(a => {
    if (filterType && a.type !== filterType) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return [a.name, a.description, a.version, ...(a.tags ?? [])].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  const typeCounts = ASSET_TYPES.reduce((acc, t) => ({ ...acc, [t]: assets.filter(a => a.type === t).length }), {} as Record<AssetType, number>);

  const openNew = () => { setForm(EMPTY_FORM); setModal('new'); };
  const openEdit = (a: ClientAsset) => {
    setForm({ type: a.type, name: a.name, description: a.description ?? '', driveLink: a.driveLink ?? '', url: a.url ?? '', version: a.version ?? '', tags: (a.tags ?? []).join(', '), approved: a.approved ?? false });
    setModal(a);
  };

  const saveAsset = () => {
    if (!form.name.trim()) return;
    const asset: ClientAsset = {
      id:           modal !== 'new' && modal ? modal.id : genId(),
      type:         form.type,
      name:         form.name.trim(),
      description:  form.description || undefined,
      driveLink:    form.driveLink || undefined,
      url:          form.url || undefined,
      version:      form.version || undefined,
      tags:         form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      approved:     form.approved,
      uploadedAt:   modal !== 'new' && modal ? modal.uploadedAt : today,
      uploadedBy:   modal !== 'new' && modal ? modal.uploadedBy : currentUser,
    };
    const newAssets = modal !== 'new' && modal
      ? assets.map(a => a.id === modal.id ? asset : a)
      : [asset, ...assets];
    const updatedClient: Client = { ...client, assets: newAssets };
    update({ clients: data.clients.map(c => c.id === id ? updatedClient : c) });
    setModal(null);
  };

  const deleteAsset = (assetId: string) => {
    if (!confirm('Eliminare questo asset?')) return;
    const updatedClient: Client = { ...client, assets: assets.filter(a => a.id !== assetId) };
    update({ clients: data.clients.map(c => c.id === id ? updatedClient : c) });
  };

  const toggleApproved = (assetId: string) => {
    const newAssets = assets.map(a => a.id === assetId ? { ...a, approved: !a.approved } : a);
    update({ clients: data.clients.map(c => c.id === id ? { ...c, assets: newAssets } : c) });
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 13px', borderRadius: 9, fontSize: 14,
    border: '1px solid var(--border2)', background: 'var(--surface2)',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  };

  return (
    <div style={{ padding: '28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button onClick={() => router.push(`/clients/${id}`)}
            style={{ fontSize: 14, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'block' }}>
            ← {client.name}
          </button>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 24, color: 'var(--text-1)' }}>
            🗂️ Asset Creativi
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>
            {assets.length} asset · {assets.filter(a => a.approved).length} approvati
          </p>
        </div>
        <button onClick={openNew} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', background: 'var(--brand)', color: 'white', cursor: 'pointer' }}>
          + Aggiungi asset
        </button>
      </div>

      {/* KPI per tipo */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setFilterType('')} style={{
          padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: filterType === '' ? 'var(--brand)' : 'var(--surface2)',
          color: filterType === '' ? 'white' : 'var(--text-3)',
        }}>
          Tutti ({assets.length})
        </button>
        {ASSET_TYPES.filter(t => typeCounts[t] > 0).map(t => {
          const cfg = ASSET_CONFIG[t];
          return (
            <button key={t} onClick={() => setFilterType(filterType === t ? '' : t)} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              border: `1px solid ${filterType === t ? cfg.color : 'var(--border)'}`,
              background: filterType === t ? cfg.color + '20' : 'transparent',
              color: filterType === t ? cfg.color : 'var(--text-3)',
            }}>
              {cfg.icon} {cfg.label} ({typeCounts[t]})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Cerca asset..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Griglia asset */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🗂️</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
            {assets.length === 0 ? 'Nessun asset ancora' : 'Nessun risultato'}
          </p>
          <p style={{ fontSize: 15 }}>{assets.length === 0 ? 'Aggiungi loghi, foto, brand kit e materiali del cliente' : 'Prova a cambiare i filtri'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {filtered.map(asset => {
            const cfg = ASSET_CONFIG[asset.type];
            return (
              <div key={asset.id} style={{
                background: 'var(--surface)', border: `1px solid ${asset.approved ? 'rgba(74,222,128,0.3)' : 'var(--border2)'}`,
                borderRadius: 14, overflow: 'hidden', transition: 'border 150ms',
              }}>
                {/* Striscia colore tipo */}
                <div style={{ height: 4, background: cfg.color }} />

                <div style={{ padding: '16px' }}>
                  {/* Header card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: cfg.color + '15', color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {asset.approved && (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                            ✓ Approvato
                          </span>
                        )}
                        {asset.version && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '1px 6px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                            {asset.version}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asset.name}
                      </p>
                    </div>
                  </div>

                  {asset.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 10 }}>{asset.description}</p>
                  )}

                  {/* Tags */}
                  {asset.tags && asset.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {asset.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                    Aggiunto il {asset.uploadedAt}{asset.uploadedBy ? ` da ${asset.uploadedBy}` : ''}
                  </p>

                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {asset.driveLink && (
                      <a href={asset.driveLink} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.06)', color: '#4ade80', textDecoration: 'none' }}>
                        📁 Drive
                      </a>
                    )}
                    {asset.url && (
                      <a href={asset.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.06)', color: '#60a5fa', textDecoration: 'none' }}>
                        🔗 Link
                      </a>
                    )}
                    <button onClick={() => toggleApproved(asset.id)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                        border: `1px solid ${asset.approved ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
                        background: asset.approved ? 'rgba(74,222,128,0.06)' : 'none',
                        color: asset.approved ? '#4ade80' : 'var(--text-3)' }}>
                      {asset.approved ? '✓ Approv.' : 'Approva'}
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(asset)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 7, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteAsset(asset.id)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 7, border: '1px solid rgba(248,113,113,0.3)', background: 'none', color: '#f87171', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500 }} onClick={() => setModal(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 501, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{modal === 'new' ? '+ Nuovo asset' : 'Modifica asset'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Tipo asset */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Tipo asset</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {ASSET_TYPES.map(t => {
                    const cfg = ASSET_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setF('type', t)} style={{
                        padding: '8px 6px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        border: `1px solid ${form.type === t ? cfg.color : 'var(--border)'}`,
                        background: form.type === t ? cfg.color + '15' : 'transparent',
                        color: form.type === t ? cfg.color : 'var(--text-3)',
                        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 150ms',
                      }}>
                        <span>{cfg.icon}</span>{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {[
                { label: 'Nome *', key: 'name', placeholder: 'Es. Logo principale, Foto hotel estate 2025...' },
                { label: 'Descrizione', key: 'description', placeholder: 'Note sull\'asset...' },
                { label: 'Link Google Drive', key: 'driveLink', placeholder: 'https://drive.google.com/...' },
                { label: 'URL esterno', key: 'url', placeholder: 'https://...' },
                { label: 'Versione', key: 'version', placeholder: 'Es. v2.0, 2025, definitivo...' },
                { label: 'Tag (separati da virgola)', key: 'tags', placeholder: 'Es. estate, instagram, colori brand' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  <input style={inputStyle} value={(form as unknown as Record<string,string>)[key]} onChange={e => setF(key, e.target.value)} placeholder={placeholder} />
                </div>
              ))}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-2)' }}>
                <input type="checkbox" checked={form.approved} onChange={e => setF('approved', e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                Asset approvato dal cliente
              </label>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 18px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: '1px solid var(--border2)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>Annulla</button>
              <button onClick={saveAsset} disabled={!form.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 15, fontWeight: 700, border: 'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', background: form.name.trim() ? 'var(--brand)' : 'var(--surface3)', color: form.name.trim() ? 'white' : 'var(--text-3)' }}>
                {modal === 'new' ? 'Aggiungi asset' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
