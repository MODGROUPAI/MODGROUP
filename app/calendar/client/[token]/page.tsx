'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAppData } from '@/lib/store';
import type { Client, EditorialContent, Task } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram:'📸', Facebook:'👥', LinkedIn:'💼',
  TikTok:'🎵', YouTube:'▶️', Pinterest:'📌', Altro:'🌐',
};

const STATUS_COLOR: Record<string, string> = {
  'Pubblicato':   '#4ade80',
  'In revisione': '#fbbf24',
  'Approvato':    '#60a5fa',
  'Da fare':      '#9ca3af',
  'In produzione':'#a78bfa',
  'Bloccato':     '#f87171',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_IT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

interface CalendarData {
  client: Client;
  editorial: EditorialContent[];
  tasks: Task[];
}

export default function ClientCalendarPage() {
  const { token }  = useParams<{ token: string }>();
  const [calData, setCalData] = useState<CalendarData | null>(null);
  const [error, setError]     = useState(false);
  const [month, setMonth]     = useState(new Date().getMonth());
  const [year, setYear]       = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const data = getAppData();
    if (!data) { setError(true); return; }
    const client = data.clients.find(c => c.sharedCalendarToken === token && c.sharedCalendar);
    if (!client) { setError(true); return; }
    const settings = client.calendarSettings ?? {
      showTasks: false,
      showCaption: false,
      visibleStatuses: ['Pubblicato', 'Approvato'],
    };
    const allEditorial = (data.editorialContent ?? []).filter(e =>
      e.clientId === client.id || e.clientName?.toLowerCase() === client.name.toLowerCase()
    );
    const editorial = allEditorial.filter(e => settings.visibleStatuses.includes(e.status));
    const tasks = settings.showTasks
      ? data.tasks.filter(t =>
          (t.clientId === client.id || t.clientName?.toLowerCase() === client.name.toLowerCase()) &&
          !t.isCompleted)
      : [];
    setCalData({ client, editorial, tasks });
  }, [token]);

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', background:'#f9fafb' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <p style={{ fontSize:48, marginBottom:16 }}>📅</p>
        <h1 style={{ fontSize:20, fontWeight:700, color:'#1a1a1a', marginBottom:8 }}>Calendario non disponibile</h1>
        <p style={{ color:'#888', fontSize:16 }}>Il link potrebbe essere scaduto o il calendario non è attivo.</p>
      </div>
    </div>
  );

  if (!calData) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <p style={{ color:'#888', fontFamily:'Arial,sans-serif' }}>Caricamento...</p>
    </div>
  );

  const { client, editorial, tasks } = calData;
  const today     = new Date().toISOString().slice(0, 10);
  const daysCount = getDaysInMonth(year, month);
  const firstDay  = getFirstDayOfMonth(year, month);
  const monthStr  = `${year}-${String(month + 1).padStart(2, '0')}`;

  const getDateStr = (day: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const editorialByDate: Record<string, EditorialContent[]> = {};
  editorial.filter(e => e.scheduledDate?.startsWith(monthStr)).forEach(e => {
    if (!editorialByDate[e.scheduledDate]) editorialByDate[e.scheduledDate] = [];
    editorialByDate[e.scheduledDate].push(e);
  });

  const tasksByDate: Record<string, Task[]> = {};
  tasks.filter(t => t.dueDate?.startsWith(monthStr)).forEach(t => {
    if (!tasksByDate[t.dueDate!]) tasksByDate[t.dueDate!] = [];
    tasksByDate[t.dueDate!].push(t);
  });

  const selectedDateStr = selected;
  const selectedContent = selectedDateStr ? (editorialByDate[selectedDateStr] ?? []) : [];
  const selectedTasks   = selectedDateStr ? (tasksByDate[selectedDateStr] ?? []) : [];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#1a1a1a', padding:'18px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#fff', letterSpacing:'-0.5px' }}>
            MOD<span style={{ color:'#F26522' }}>.</span>Group
          </div>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.2)' }} />
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'2px' }}>
            Calendario
          </div>
        </div>
        <div style={{ fontSize:15, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>{client.name}</div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px' }}>

        {/* Header mese */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <button onClick={prevMonth} style={{ width:36, height:36, borderRadius:9, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#1a1a1a' }}>{MONTHS_IT[month]} {year}</h2>
          <button onClick={nextMonth} style={{ width:36, height:36, borderRadius:9, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>→</button>
        </div>

        {/* Griglia calendario */}
        <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', marginBottom:20 }}>
          {/* Header giorni */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #f0f0f0' }}>
            {DAYS_IT.map(d => (
              <div key={d} style={{ padding:'10px 0', textAlign:'center', fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'1px' }}>{d}</div>
            ))}
          </div>

          {/* Celle giorni */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e${i}`} style={{ minHeight:80, borderRight:'1px solid #f5f5f5', borderBottom:'1px solid #f5f5f5', background:'#fafafa' }} />
            ))}
            {Array.from({ length: daysCount }, (_, i) => {
              const day     = i + 1;
              const dateStr = getDateStr(day);
              const isToday = dateStr === today;
              const dayContent = editorialByDate[dateStr] ?? [];
              const dayTasks   = tasksByDate[dateStr] ?? [];
              const isSelected = selected === dateStr;

              return (
                <div key={day}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  style={{
                    minHeight:80, padding:'6px', cursor:'pointer', transition:'background 150ms',
                    borderRight:`${(firstDay+i)%7<6?'1':'0'}px solid #f5f5f5`,
                    borderBottom:'1px solid #f5f5f5',
                    background: isSelected ? '#fff3ed' : isToday ? '#fff9f5' : '#fff',
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{
                      fontSize:14, fontWeight:isToday?800:400,
                      color:isToday?'#F26522':'#1a1a1a',
                      width:24, height:24, borderRadius:'50%',
                      background:isToday?'rgba(242,101,34,0.1)':'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {day}
                    </span>
                  </div>

                  {/* Contenuti editoriali */}
                  {dayContent.slice(0,2).map((c, ci) => (
                    <div key={ci} style={{
                      marginBottom:2, padding:'2px 5px', borderRadius:4, fontSize:11, fontWeight:600,
                      background:`${STATUS_COLOR[c.status] ?? '#9ca3af'}18`,
                      color: STATUS_COLOR[c.status] ?? '#9ca3af',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>
                      {PLATFORM_EMOJI[c.platform] ?? '📄'} {c.format}
                    </div>
                  ))}
                  {dayContent.length > 2 && (
                    <div style={{ fontSize:11, color:'#888' }}>+{dayContent.length-2} altri</div>
                  )}

                  {/* Task scadenze */}
                  {dayTasks.slice(0,1).map((t, ti) => (
                    <div key={ti} style={{
                      marginBottom:2, padding:'2px 5px', borderRadius:4, fontSize:11,
                      background:'rgba(96,165,250,0.1)', color:'#3b82f6',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>
                      📌 {t.title.slice(0, 14)}{t.title.length > 14 ? '…' : ''}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dettaglio giorno selezionato */}
        {selected && (selectedContent.length > 0 || selectedTasks.length > 0) && (
          <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', marginBottom:20 }}>
            <h3 style={{ fontSize:18, fontWeight:800, color:'#1a1a1a', marginBottom:16 }}>
              {new Date(selected+'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}
            </h3>

            {selectedContent.length > 0 && (
              <>
                <p style={{ fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Contenuti</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {selectedContent.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'#f9fafb', border:'1px solid #f0f0f0' }}>
                      <span style={{ fontSize:20 }}>{PLATFORM_EMOJI[c.platform] ?? '📄'}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:15, fontWeight:600, color:'#1a1a1a' }}>{c.platform} · {c.format}</p>
                        {c.caption && client.calendarSettings?.showCaption !== false && true && <p style={{ fontSize:14, color:'#666', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>{c.caption.slice(0,80)}{c.caption.length>80?'...':''}</p>}
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background:`${STATUS_COLOR[c.status]??'#9ca3af'}15`,
                        color: STATUS_COLOR[c.status] ?? '#9ca3af' }}>
                        {c.status}
                      </span>
                      {/* Pulsante approva se in attesa */}
                      {c.approvalStatus === 'pending' && c.approvalToken && (
                        <a href={`/approve/${c.approvalToken}`}
                          style={{ fontSize:13, padding:'5px 12px', borderRadius:8, background:'#F26522', color:'white', textDecoration:'none', fontWeight:700, whiteSpace:'nowrap' }}>
                          Rivedi →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedTasks.length > 0 && (
              <>
                <p style={{ fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Scadenze</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {selectedTasks.map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderRadius:9, background:'rgba(96,165,250,0.05)', border:'1px solid rgba(96,165,250,0.2)' }}>
                      <span style={{ fontSize:16 }}>📌</span>
                      <p style={{ fontSize:15, color:'#1a1a1a', flex:1 }}>{t.title}</p>
                      <span style={{ fontSize:13, color:'#3b82f6', fontWeight:600 }}>{t.priority}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Legenda */}
        <div style={{ background:'#fff', borderRadius:12, padding:'14px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Legenda</p>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {Object.entries(STATUS_COLOR).map(([status, color]) => (
              <div key={status} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:`${color}30`, border:`1px solid ${color}` }} />
                <span style={{ fontSize:13, color:'#666' }}>{status}</span>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:3, background:'rgba(96,165,250,0.15)', border:'1px solid #3b82f6' }} />
              <span style={{ fontSize:13, color:'#666' }}>Scadenza task</span>
            </div>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:24, fontSize:14, color:'#aaa' }}>
          Calendario condiviso da MOD Group · modgroup.it
        </p>
      </div>
    </div>
  );
}
