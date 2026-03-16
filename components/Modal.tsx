'use client';
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  onDelete?: () => void;
  children: ReactNode;
  wide?: boolean;
  full?: boolean;
}

export function Modal({ title, onClose, onSave, saveLabel = 'Salva', saveDisabled, onDelete, children, wide, full }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col max-h-[90vh]"
        style={{
          maxWidth: full ? 960 : wide ? 720 : 520,
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {/* Footer */}
        {onSave && (
          <div
            className="flex justify-between items-center gap-2 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Elimina
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost text-sm">Annulla</button>
              <button onClick={onSave} disabled={saveDisabled} className="btn-primary text-sm">{saveLabel}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
  full?: boolean;
}
export function Field({ label, children, className = '', full }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? 'col-span-2' : ''} ${className}`}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
