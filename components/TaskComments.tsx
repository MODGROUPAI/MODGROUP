'use client';

import { useState, useRef, useEffect } from 'react';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';
import type { Task, TaskComment } from '@/lib/types';

interface Props {
  task: Task;
  onClose?: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1)   return 'adesso';
  if (diff < 60)  return `${diff}min fa`;
  if (diff < 1440) return `${Math.floor(diff/60)}h fa`;
  return d.toLocaleDateString('it-IT', { day:'numeric', month:'short' });
}

function parseText(text: string) {
  // Evidenzia @menzioni
  return text.replace(/@(\w[\w\s]*?)(?=\s|$|[,.])/g, (match, name) =>
    `<span style="color:#60a5fa;font-weight:600">${match}</span>`
  );
}

export function TaskComments({ task, onClose }: Props) {
  const { data, update } = useData();
  const [text, setText]         = useState('');
  const [editId, setEditId]     = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const currentUser = data.teamMembers[0]?.fullName ?? 'Team MOD';
  const comments    = task.comments ?? [];

  const teamNames = data.teamMembers.map(m => m.fullName);
  const filteredMentions = mentionQuery
    ? teamNames.filter(n => n.toLowerCase().includes(mentionQuery.toLowerCase()))
    : teamNames;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleInput = (val: string) => {
    setText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentions(true); setMentionQuery('');
    } else if (lastAt !== -1 && !val.slice(lastAt+1).includes(' ')) {
      setShowMentions(true); setMentionQuery(val.slice(lastAt+1));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + '@' + name + ' ';
    setText(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const sendComment = () => {
    if (!text.trim()) return;
    const mentions = [...text.matchAll(/@([\w\s]+?)(?=\s|$|[,.])/g)].map(m => m[1].trim());
    const comment: TaskComment = {
      id:        `CMT${Date.now().toString(36).toUpperCase()}`,
      taskId:    task.id,
      author:    currentUser,
      text:      text.trim(),
      createdAt: new Date().toISOString(),
      mentions:  mentions.length ? mentions : undefined,
    };
    const updatedTask: Task = { ...task, comments: [...comments, comment] };
    update({ tasks: data.tasks.map(t => t.id === task.id ? updatedTask : t) });
    setText('');
    setShowMentions(false);
  };

  const saveEdit = () => {
    if (!editText.trim() || !editId) return;
    const updatedComments = comments.map(c =>
      c.id === editId ? { ...c, text: editText.trim(), edited: true } : c
    );
    update({ tasks: data.tasks.map(t => t.id === task.id ? { ...t, comments: updatedComments } : t) });
    setEditId(null);
  };

  const deleteComment = (id: string) => {
    const updatedComments = comments.filter(c => c.id !== id);
    update({ tasks: data.tasks.map(t => t.id === task.id ? { ...t, comments: updatedComments } : t) });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', minHeight: 64, padding: '10px 14px',
    borderRadius: 10, fontSize: 15, fontFamily: 'inherit', lineHeight: 1.6,
    border: '1px solid var(--border2)', background: 'var(--surface2)',
    color: 'var(--text-1)', outline: 'none', resize: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>💬 Commenti</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', padding: '2px 8px', borderRadius: 20, background: 'var(--surface2)' }}>
            {comments.length} messaggi
          </span>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>×</button>}
        </div>
      </div>

      {/* Thread commenti */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>💬</p>
            <p style={{ fontSize: 15 }}>Nessun commento ancora</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Usa @ per menzionare un collega</p>
          </div>
        ) : comments.map(c => {
          const isMe = c.author === currentUser;
          const isEditing = editId === c.id;
          return (
            <div key={c.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? 'var(--brand)' : 'var(--surface3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isMe ? 'white' : 'var(--text-2)', flexShrink: 0 }}>
                {c.author.charAt(0).toUpperCase()}
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '75%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isMe ? 'var(--brand)' : 'var(--text-2)' }}>{c.author}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatTime(c.createdAt)}</span>
                  {c.edited && <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>modificato</span>}
                </div>

                {isEditing ? (
                  <div>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      style={{ ...inputStyle, minHeight: 48, fontSize: 14 }} autoFocus />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <button onClick={() => setEditId(null)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>Annulla</button>
                      <button onClick={saveEdit} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 7, border: 'none', background: 'var(--brand)', color: 'white', cursor: 'pointer' }}>Salva</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', borderRadius: isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px', background: isMe ? 'rgba(242,101,34,0.12)' : 'var(--surface2)', border: `1px solid ${isMe ? 'rgba(242,101,34,0.2)' : 'var(--border)'}`, fontSize: 15, color: 'var(--text-1)', lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: parseText(c.text) }} />
                )}

                {/* Azioni hover */}
                {!isEditing && isMe && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditId(c.id); setEditText(c.text); }}
                      style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}>
                      ✏️ modifica
                    </button>
                    <button onClick={() => deleteComment(c.id)}
                      style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>

        {/* Dropdown menzioni */}
        {showMentions && filteredMentions.length > 0 && (
          <div style={{ position: 'absolute', bottom: '100%', left: 18, right: 18, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10 }}>
            {filteredMentions.slice(0, 5).map(name => (
              <button key={name} onClick={() => insertMention(name)}
                style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {name.charAt(0)}
                </div>
                {name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
              placeholder="Scrivi un commento... usa @ per menzionare"
              style={{ ...inputStyle, minHeight: 44, paddingRight: 40 }}
            />
            <span style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 12, color: 'var(--text-3)' }}>⏎</span>
          </div>
          <button onClick={sendComment} disabled={!text.trim()}
            style={{ width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0, cursor: text.trim() ? 'pointer' : 'not-allowed', background: text.trim() ? 'var(--brand)' : 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={text.trim() ? 'white' : 'var(--text-3)'} strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={text.trim() ? 'white' : 'var(--text-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>Invio per inviare · Shift+Invio per nuova riga</p>
      </div>
    </div>
  );
}
