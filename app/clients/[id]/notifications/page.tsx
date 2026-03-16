'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/useData';
import { DEFAULT_NOTIFICATION_RULES, CHANNEL_CONFIG, buildNotificationText } from '@/lib/notificationRules';
import { approvalGate } from '@/lib/approvalGate';
import type { NotificationRule, NotificationChannel, ClientNotificationSettings } from '@/lib/types';

const inputStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text-1)', outline: 'none', width: '100%',
};

function Toggle({ on, onChange, color = 'var(--brand)' }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <div onClick={onChange} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
      background: on ? color : 'var(--surface3)',
      border: `1px solid ${on ? color : 'var(--border)'}`,
      position: 'relative', flexShrink: 0, transition: 'all 200ms',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 20 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: 'white', transition: 'left 200ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

export default function ClientNotificationsPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { data, update } = useData();

  const client = data.clients.find(c => c.id === id);

  const defaultSettings: ClientNotificationSettings = {
    whatsappNumber: client?.phone ?? '',
    email:          client?.email ?? '',
    enabled:        false,
    rules:          DEFAULT_NOTIFICATION_RULES.map(r => ({ ...r })),
  };

  const [settings, setSettings] = useState<ClientNotificationSettings>(
    client?.notifications ?? defaultSettings
  );
  const [saved, setSaved]       = useState(false);
  const [testRule, setTestRule] = useState<string | null>(null);
  const [testMsg, setTestMsg]   = useState('');

  useEffect(() => {
    if (client?.notifications) setSettings(client.notifications);
  }, [client]);

  if (!client) return (
    <div style={{ padding: 40, color: 'var(--text-3)' }}>
      Cliente non trovato.
      <button onClick={() => router.push('/clients')} style={{ marginLeft: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>← Clienti</button>
    </div>
  );

  const saveSettings = () => {
    update({ clients: data.clients.map(c => c.id === id ? { ...c, notifications: settings } : c) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleMaster = () => setSettings(s => ({ ...s, enabled: !s.enabled }));

  const toggleRule = (ruleId: string) => {
    setSettings(s => ({
      ...s,
      rules: s.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r),
    }));
  };

  const setRuleChannel = (ruleId: string, channel: NotificationChannel) => {
    setSettings(s => ({
      ...s,
      rules: s.rules.map(r => r.id === ruleId ? { ...r, channel } : r),
    }));
  };

  const setRuleTemplate = (ruleId: string, tmpl: string) => {
    setSettings(s => ({
      ...s,
      rules: s.rules.map(r => r.id === ruleId ? { ...r, templateOverride: tmpl } : r),
    }));
  };

  const previewMessage = (rule: NotificationRule) => {
    if (!rule.templateOverride) return '(Template predefinito — verrà usato il testo standard)';
    return buildNotificationText(rule.templateOverride, {
      clientName:    client.name,
      platform:      'Instagram',
      approvalLink:  `${typeof window !== 'undefined' ? window.location.origin : ''}/approve/ESEMPIO`,
      taskTitle:     'Consegna report mensile',
      campaignName:  'Campagna Estate 2025',
    });
  };

  const sendTest = (rule: NotificationRule) => {
    if (!approvalGate({
      action: `Test notifica: ${rule.label}`,
      recipient: rule.channel === 'whatsapp' ? settings.whatsappNumber : settings.email,
      warnings: ['Questo invierà un messaggio reale al cliente'],
    })) return;

    const msg = previewMessage(rule);
    if (rule.channel === 'whatsapp' && settings.whatsappNumber) {
      const tel = settings.whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    } else if (rule.channel === 'email' && settings.email) {
      navigator.clipboard.writeText(msg);
      alert('Testo copiato — incollalo in un\'email per testare.');
    }
    setTestRule(null);
  };

  const enabledCount = settings.rules.filter(r => r.enabled).length;

  return (
    <div style={{ padding: '28px 28px 60px', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.push(`/clients/${id}`)}
          style={{ fontSize: 14, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'block' }}>
          ← {client.name}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 24, color: 'var(--text-1)' }}>
              🔔 Notifiche Cliente
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>
              {client.name} · {enabledCount} notifiche attive
            </p>
          </div>
          <button onClick={saveSettings} style={{
            padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none',
            cursor: 'pointer', background: saved ? '#4ade80' : 'var(--brand)', color: 'white', transition: 'background 300ms',
          }}>
            {saved ? '✓ Salvato!' : '💾 Salva'}
          </button>
        </div>
      </div>

      {/* Master switch */}
      <div style={{
        background: 'var(--surface)', border: `2px solid ${settings.enabled ? 'rgba(74,222,128,0.4)' : 'var(--border2)'}`,
        borderRadius: 14, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
            {settings.enabled ? '🔔 Notifiche attive' : '🔕 Notifiche disabilitate'}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>
            {settings.enabled
              ? `${enabledCount} regole attive — le notifiche partiranno automaticamente`
              : 'Nessuna notifica partirà verso il cliente finché non abiliti questo switch'}
          </p>
        </div>
        <Toggle on={settings.enabled} onChange={toggleMaster} color="#4ade80" />
      </div>

      {/* Contatti */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>📋 Contatti per le notifiche</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📱 WhatsApp (con prefisso, es. +39...)
            </label>
            <input style={inputStyle} value={settings.whatsappNumber ?? ''} onChange={e => setSettings(s => ({ ...s, whatsappNumber: e.target.value }))} placeholder="+39 333 123 4567" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📧 Email notifiche
            </label>
            <input style={inputStyle} type="email" value={settings.email ?? ''} onChange={e => setSettings(s => ({ ...s, email: e.target.value }))} placeholder="cliente@example.com" />
          </div>
        </div>
      </div>

      {/* Regole */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {settings.rules.map(rule => {
          const ch   = CHANNEL_CONFIG[rule.channel];
          const isExpanded = testRule === rule.id;
          return (
            <div key={rule.id} style={{
              background: 'var(--surface)', border: `1px solid ${rule.enabled ? ch.color + '44' : 'var(--border2)'}`,
              borderRadius: 12, overflow: 'hidden', opacity: !settings.enabled && rule.enabled ? 0.7 : 1,
            }}>
              {/* Header regola */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                <Toggle on={rule.enabled} onChange={() => toggleRule(rule.id)} color={ch.color} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{rule.label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    {/* Selezione canale */}
                    {(['whatsapp', 'email'] as NotificationChannel[]).map(ch2 => (
                      <button key={ch2} onClick={() => setRuleChannel(rule.id, ch2)} style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
                        border: `1px solid ${rule.channel === ch2 ? CHANNEL_CONFIG[ch2].color + '66' : 'var(--border)'}`,
                        background: rule.channel === ch2 ? CHANNEL_CONFIG[ch2].color + '15' : 'transparent',
                        color: rule.channel === ch2 ? CHANNEL_CONFIG[ch2].color : 'var(--text-3)',
                      }}>
                        {CHANNEL_CONFIG[ch2].icon} {CHANNEL_CONFIG[ch2].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {rule.enabled && (
                    <button onClick={() => setTestRule(isExpanded ? null : rule.id)} style={{
                      fontSize: 12, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${ch.color}44`, background: `${ch.color}08`, color: ch.color,
                    }}>
                      {isExpanded ? 'Chiudi' : '✏️ Personalizza'}
                    </button>
                  )}
                </div>
              </div>

              {/* Pannello espanso — template + test */}
              {isExpanded && (
                <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                        Testo messaggio (usa {'{clientName}'}, {'{platform}'}, {'{approvalLink}'}, {'{taskTitle}'})
                      </label>
                      <textarea
                        value={rule.templateOverride ?? ''}
                        onChange={e => setRuleTemplate(rule.id, e.target.value)}
                        style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                        placeholder="Lascia vuoto per usare il testo predefinito"
                      />
                    </div>

                    {/* Preview */}
                    <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Anteprima</p>
                      <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{previewMessage(rule)}</p>
                    </div>

                    {/* Test */}
                    <button onClick={() => sendTest(rule)} style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none',
                      cursor: 'pointer', background: ch.color, color: 'white',
                      alignSelf: 'flex-start',
                    }}>
                      {ch.icon} Invia test a {rule.channel === 'whatsapp' ? (settings.whatsappNumber || 'nessun numero') : (settings.email || 'nessuna email')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Avviso finale */}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-2)' }}>📌 Nota:</strong> Le notifiche automatiche partono solo quando abiliti sia il master switch che la singola regola. Ogni invio reale richiede conferma esplicita tramite il gate di approvazione. Puoi disabilitare tutto in qualsiasi momento con il master switch in cima.
      </div>
    </div>
  );
}
