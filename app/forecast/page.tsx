'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { localDateISO } from '@/lib/utils';

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function fmt(n: number) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtK(n: number) {
  if (n >= 1000) return `€${(n/1000).toFixed(1)}k`;
  return `€${fmt(n)}`;
}

export default function ForecastPage() {
  const { data } = useData();
  const today    = localDateISO();
  const now      = new Date();

  const [rate, setRate]           = useState(75);
  const [growthRate, setGrowthRate] = useState(5); // % crescita mensile attesa
  const [months, setMonths]       = useState(6);   // mesi da proiettare

  // ── Storico mensile reale ─────────────────────────────────────────────────
  const historicData = useMemo(() => {
    const map: Record<string, { hours: number; billableHours: number; revenue: number }> = {};
    data.timeLogs.forEach(l => {
      if (!l.date) return;
      const ym = l.date.slice(0, 7);
      if (!map[ym]) map[ym] = { hours: 0, billableHours: 0, revenue: 0 };
      map[ym].hours        += l.hours;
      if (l.billable) {
        map[ym].billableHours += l.hours;
        map[ym].revenue       += l.hours * rate;
      }
    });
    // Aggiungi ricavi da commesse per i mesi con dati
    data.deals.forEach(deal => {
      if (!deal.budgetEuro || !deal.statusDate) return;
      const ym = deal.statusDate.slice(0, 7);
      if (!map[ym]) map[ym] = { hours: 0, billableHours: 0, revenue: 0 };
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12); // ultimi 12 mesi
  }, [data.timeLogs, data.deals, rate]);

  // ── Media ultimi 3 mesi ───────────────────────────────────────────────────
  const last3 = historicData.slice(-3);
  const avgRevenue3m = last3.length > 0
    ? last3.reduce((s, [, v]) => s + v.revenue, 0) / last3.length
    : 0;
  const avgHours3m = last3.length > 0
    ? last3.reduce((s, [, v]) => s + v.hours, 0) / last3.length
    : 0;

  // ── Pipeline ponderata attiva ─────────────────────────────────────────────
  const pipelineValue = useMemo(() => {
    return data.pipeline
      .filter(p => !['Chiuso vinto','Chiuso perso'].includes(p.stage))
      .reduce((s, p) => s + (p.value ?? 0) * ((p.probability ?? 50) / 100), 0);
  }, [data.pipeline]);

  // ── Commesse attive (budget residuo) ─────────────────────────────────────
  const activeDealsValue = useMemo(() => {
    return data.deals.reduce((s, deal) => {
      if (!deal.budgetEuro) return s;
      const usedHrs = data.timeLogs
        .filter(l => l.clientName?.toLowerCase() === deal.companyName?.toLowerCase() || l.clientId === deal.clientId)
        .reduce((h, l) => h + l.hours, 0);
      const usedValue  = usedHrs * rate;
      const residual   = Math.max(0, deal.budgetEuro - usedValue);
      return s + residual;
    }, 0);
  }, [data.deals, data.timeLogs, rate]);

  // ── Proiezione mensile ────────────────────────────────────────────────────
  const projections = useMemo(() => {
    const base = avgRevenue3m > 0 ? avgRevenue3m : activeDealsValue / 3;
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const growth = Math.pow(1 + growthRate / 100, i);
      const projected = base * growth;
      // Aggiungi quota pipeline distribuita sui mesi
      const pipelineContrib = pipelineValue / months;
      const total = projected + pipelineContrib;
      return {
        ym,
        month: MONTHS_IT[d.getMonth()],
        year:  d.getFullYear(),
        base:  projected,
        pipeline: pipelineContrib,
        total,
        hours: total / rate,
      };
    });
  }, [avgRevenue3m, activeDealsValue, growthRate, months, pipelineValue, rate, now]);

  const totalForecast   = projections.reduce((s, p) => s + p.total, 0);
  const totalForecastH  = projections.reduce((s, p) => s + p.hours, 0);
  const maxBar = Math.max(...historicData.map(([,v]) => v.revenue), ...projections.map(p => p.total), 1);

  // ── Forecast per cliente (basato su ore storiche + budget residuo) ────────
  const clientForecast = useMemo(() => {
    return data.clients
      .filter(c => c.status === 'Attivo')
      .map(client => {
        const logs = data.timeLogs.filter(l =>
          l.clientName?.toLowerCase() === client.name.toLowerCase() || l.clientId === client.id
        );
        const deal = data.deals.find(d =>
          d.companyName?.toLowerCase() === client.name.toLowerCase() || d.clientId === client.id
        );
        const totalHrs   = logs.reduce((s, l) => s + l.hours, 0);
        const billableHrs = logs.filter(l => l.billable).reduce((s, l) => s + l.hours, 0);
        const revenueReal = billableHrs * rate;
        const budgetResidual = deal?.budgetEuro
          ? Math.max(0, deal.budgetEuro - revenueReal)
          : 0;
        const avg3m = (() => {
          const recent = logs
            .filter(l => l.date && l.date >= today.slice(0, 7).replace(/\d{2}$/, '01').slice(0, 7))
            .reduce((s, l) => s + l.hours, 0);
          return recent * rate / 3;
        })();
        return {
          id: client.id, name: client.name, sector: client.sector,
          revenueReal, budgetResidual, avg3m,
          forecastNext3m: Math.max(avg3m * 3, budgetResidual),
        };
      })
      .filter(c => c.revenueReal > 0 || c.budgetResidual > 0)
      .sort((a, b) => b.forecastNext3m - a.forecastNext3m);
  }, [data.clients, data.timeLogs, data.deals, rate, today]);

  const inputStyle: React.CSSProperties = {
    padding:'7px 12px', borderRadius:8, fontSize:14,
    border:'1px solid var(--border2)', background:'var(--surface2)',
    color:'var(--text-1)', outline:'none',
  };

  return (
    <div style={{ padding:'28px 28px 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:26, color:'var(--text-1)' }}>
            Forecast Ricavi
          </h1>
          <p style={{ fontSize:14, color:'var(--text-3)', marginTop:3 }}>
            Proiezione basata su storico ore, commesse attive e pipeline
          </p>
        </div>
        {/* Parametri */}
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'var(--text-3)' }}>Tariffa €/h</label>
            <input style={{ ...inputStyle, width:70, textAlign:'right' }} type="number" value={rate}
              onChange={e => setRate(parseFloat(e.target.value)||75)} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'var(--text-3)' }}>Crescita %/mese</label>
            <input style={{ ...inputStyle, width:60, textAlign:'right' }} type="number" value={growthRate}
              onChange={e => setGrowthRate(parseFloat(e.target.value)||0)} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'var(--text-3)' }}>Mesi</label>
            <select style={{ ...inputStyle, cursor:'pointer' }} value={months} onChange={e => setMonths(parseInt(e.target.value))}>
              {[3,6,9,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI sommario */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:28 }}>
        {[
          { label:`Media ultimi 3 mesi`, val:fmtK(avgRevenue3m), sub:`~${Math.round(avgHours3m)}h/mese`, color:'var(--text-1)' },
          { label:'Budget commesse residuo', val:fmtK(activeDealsValue), sub:`${data.deals.filter(d=>d.budgetEuro).length} commesse attive`, color:'#60a5fa' },
          { label:'Pipeline ponderata', val:fmtK(pipelineValue), sub:`${data.pipeline.filter(p=>!['Chiuso vinto','Chiuso perso'].includes(p.stage)).length} opportunità`, color:'var(--brand)' },
          { label:`Forecast ${months} mesi`, val:fmtK(totalForecast), sub:`~${Math.round(totalForecastH)}h previste`, color:'#4ade80' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{k.label}</p>
            <p style={{ fontSize:26, fontWeight:800, color:k.color, fontFamily:"'Cormorant Garamond',serif" }}>{k.val}</p>
            <p style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Grafico storico + proiezione ── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:'20px 24px', marginBottom:20 }}>
        <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:20 }}>
          📊 Storico + Proiezione
        </p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:200, overflowX:'auto', paddingBottom:4 }}>
          {/* Storico */}
          {historicData.map(([ym, v]) => {
            const h = (v.revenue / maxBar) * 180;
            const [y, m] = ym.split('-');
            const isCurrentMonth = ym === today.slice(0, 7);
            return (
              <div key={ym} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:48 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)' }}>{fmtK(v.revenue)}</div>
                <div style={{ width:36, height:Math.max(h, 4), borderRadius:'4px 4px 0 0',
                  background: isCurrentMonth ? 'var(--brand)' : 'rgba(242,101,34,0.3)',
                  border: isCurrentMonth ? '1px solid var(--brand)' : 'none',
                  transition:'height 300ms',
                }} title={`${MONTHS_FULL[parseInt(m)-1]} ${y}: €${fmt(v.revenue)}`} />
                <div style={{ fontSize:11, color: isCurrentMonth ? 'var(--brand)' : 'var(--text-3)', fontWeight: isCurrentMonth ? 700 : 400 }}>
                  {MONTHS_IT[parseInt(m)-1]}
                </div>
              </div>
            );
          })}

          {/* Separatore */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:24 }}>
            <div style={{ flex:1 }} />
            <div style={{ width:2, height:180, background:'var(--border2)', borderRadius:1 }} />
            <div style={{ fontSize:11, color:'var(--text-3)' }}>→</div>
          </div>

          {/* Proiezione */}
          {projections.map((p, i) => {
            const h = (p.total / maxBar) * 180;
            return (
              <div key={p.ym} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:48 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#4ade80' }}>{fmtK(p.total)}</div>
                <div style={{ width:36, height:Math.max(h, 4), borderRadius:'4px 4px 0 0', position:'relative', overflow:'hidden' }}>
                  {/* Base */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0,
                    height:`${(p.base/p.total)*100}%`, background:'rgba(74,222,128,0.3)',
                    border:'1px dashed rgba(74,222,128,0.5)', borderRadius:'4px 4px 0 0' }} />
                  {/* Pipeline */}
                  <div style={{ position:'absolute', bottom:`${(p.base/p.total)*100}%`, left:0, right:0,
                    height:`${(p.pipeline/p.total)*100}%`, background:'rgba(96,165,250,0.3)',
                    borderRadius:'4px 4px 0 0' }} />
                </div>
                <div style={{ fontSize:11, color:'#4ade80', fontWeight:600 }}>{p.month}</div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div style={{ display:'flex', gap:16, marginTop:12, fontSize:12, color:'var(--text-3)' }}>
          <span>🟠 Storico reale</span>
          <span style={{ color:'rgba(74,222,128,0.8)' }}>🟢 Proiezione base (trend ore)</span>
          <span style={{ color:'rgba(96,165,250,0.8)' }}>🔵 Quota pipeline</span>
        </div>
      </div>

      {/* ── Tabella proiezione dettaglio ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>📅 Proiezione mensile</p>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['Mese','Base','Pipeline','Totale','Ore'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projections.map((p, i) => (
                <tr key={p.ym} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding:'8px 14px', fontSize:14, fontWeight:600, color:'var(--text-1)' }}>{p.month} {p.year !== now.getFullYear() ? p.year : ''}</td>
                  <td style={{ padding:'8px 14px', fontSize:14, color:'var(--text-2)' }}>{fmtK(p.base)}</td>
                  <td style={{ padding:'8px 14px', fontSize:14, color:'#60a5fa' }}>{fmtK(p.pipeline)}</td>
                  <td style={{ padding:'8px 14px', fontSize:15, fontWeight:700, color:'#4ade80' }}>{fmtK(p.total)}</td>
                  <td style={{ padding:'8px 14px', fontSize:13, color:'var(--text-3)' }}>{Math.round(p.hours)}h</td>
                </tr>
              ))}
              <tr style={{ background:'var(--surface2)', borderTop:'2px solid var(--border)' }}>
                <td style={{ padding:'10px 14px', fontSize:14, fontWeight:700, color:'var(--text-1)' }}>TOTALE</td>
                <td colSpan={2} />
                <td style={{ padding:'10px 14px', fontSize:16, fontWeight:800, color:'#4ade80' }}>{fmtK(totalForecast)}</td>
                <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text-3)' }}>{Math.round(totalForecastH)}h</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Forecast per cliente */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>👥 Forecast per cliente</p>
            <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Basato su storico ore e budget residuo</p>
          </div>
          <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, maxHeight:340, overflowY:'auto' }}>
            {clientForecast.length === 0 ? (
              <p style={{ fontSize:14, color:'var(--text-3)', padding:'20px 0', textAlign:'center' }}>Nessun dato disponibile — importa il file Excel</p>
            ) : clientForecast.map(c => {
              const maxF = Math.max(...clientForecast.map(x => x.forecastNext3m), 1);
              return (
                <div key={c.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>{c.name}</p>
                      <p style={{ fontSize:12, color:'var(--text-3)' }}>{c.sector}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontSize:15, fontWeight:700, color:'var(--brand)' }}>{fmtK(c.forecastNext3m)}</p>
                      <p style={{ fontSize:11, color:'var(--text-3)' }}>prossimi 3 mesi</p>
                    </div>
                  </div>
                  <div style={{ height:5, borderRadius:3, background:'var(--surface2)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(c.forecastNext3m/maxF)*100}%`, background:'var(--brand)', borderRadius:3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Note metodologia */}
      <div style={{ padding:'14px 18px', borderRadius:12, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:13, color:'var(--text-3)', lineHeight:1.6 }}>
        <span style={{ fontWeight:700, color:'var(--text-2)' }}>📌 Metodologia: </span>
        Proiezione base = media ricavi ultimi 3 mesi × fattore crescita mensile {growthRate}% composto.
        Quota pipeline = valore pipeline ponderato (probabilità × valore) distribuito uniformemente sui {months} mesi.
        Tariffa: €{rate}/h per calcolo ore stimate. I valori sono stime indicative basate sui dati disponibili.
      </div>
    </div>
  );
}
