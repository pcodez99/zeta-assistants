import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownRight, ArrowUpRight, Check, Clock3, Cpu, Download, Droplets, Expand, Gauge, Minimize, RefreshCw, Thermometer, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';

type Metric = 'temperature' | 'humidity' | 'pressure';
type Range = '24h' | '7d' | '30d';
interface Reading { id: string; temperature: number; humidity: number; pressure: number; createdAt: string }
const metrics = {
  temperature: { label: 'Temperatura', unit: '°C', color: '#ffad72', icon: Thermometer, digits: 1 },
  humidity: { label: 'Umidità', unit: '%', color: '#68d9ed', icon: Droplets, digits: 0 },
  pressure: { label: 'Pressione', unit: 'hPa', color: '#b3e2a0', icon: Gauge, digits: 1 },
} as const;
const metricKeys: Metric[] = ['temperature', 'humidity', 'pressure'];
const readMetric = (): Metric => {
  const saved = localStorage.getItem('zeta-metric');
  return metricKeys.includes(saved as Metric) ? saved as Metric : 'temperature';
};
const validReadings = (data: Reading[] | undefined) => (data ?? []).filter((reading) =>
  Number.isFinite(new Date(reading.createdAt).getTime()) && metricKeys.every((key) => Number.isFinite(reading[key]))
).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
const formatDate = (date: string) => new Date(date).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

export const Dashboard: React.FC = () => {
  const [range, setRange] = useState<Range>('24h');
  const [metric, setMetric] = useState<Metric>(readMetric);
  const [ambient, setAmbient] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 10000); return () => window.clearInterval(timer); }, []);
  const latestQuery = useQuery<{ reading: Reading | null }>({ queryKey: ['weather-latest'], queryFn: async () => (await api.get('/weather/latest')).data, refetchInterval: 10000 });
  const historyQuery = useQuery<Reading[]>({ queryKey: ['history', range], queryFn: async () => (await api.get(`/weather/history?range=${range}`)).data, refetchInterval: 60000 });
  const history = useMemo(() => validReadings(historyQuery.data), [historyQuery.data]);
  const live = latestQuery.data?.reading;
  const liveValid = live && Number.isFinite(new Date(live.createdAt).getTime()) && metricKeys.every((key) => Number.isFinite(live[key]));
  const age = liveValid ? now - new Date(live.createdAt).getTime() : Infinity;
  const current = liveValid && age >= 0 && age < 10 * 60 * 1000;
  const status = latestQuery.isError ? 'Connessione non disponibile' : !liveValid ? 'In attesa della stazione' : current ? 'Stazione online' : 'Letture non aggiornate';
  const selected = metrics[metric];
  const first = history[0];
  const last = history.at(-1);
  const delta = first && last && first.id !== last.id ? last[metric] - first[metric] : null;
  const values = history.map((reading) => reading[metric]);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const briefing = latestQuery.isError ? 'Non riesco a raggiungere la stazione. Riprova tra poco.' : !liveValid ? 'Il briefing sarà disponibile dopo la prima lettura.' : !current ? `Ultima lettura ricevuta il ${formatDate(live.createdAt)}. Attendo nuovi dati.` : delta === null ? 'La stazione è attiva. Servono almeno due letture per descrivere il trend.' : Math.abs(delta) < (metric === 'pressure' ? 0.5 : 0.2) ? `${selected.label} stabile nel periodo selezionato.` : `${selected.label} in ${delta > 0 ? 'aumento' : 'diminuzione'} di ${Math.abs(delta).toFixed(selected.digits)} ${selected.unit} nel periodo selezionato.`;
  const changeMetric = (next: Metric) => { setMetric(next); localStorage.setItem('zeta-metric', next); };
  const refresh = () => { setNow(Date.now()); void latestQuery.refetch(); void historyQuery.refetch(); };
  const exportCsv = () => {
    if (!history.length) return;
    const rows = ['data_ora,temperatura_c,umidita_percento,pressione_hpa', ...history.map((r) => `${new Date(r.createdAt).toISOString()},${r.temperature},${r.humidity},${r.pressure}`)];
    const url = URL.createObjectURL(new Blob(['\uFEFF', rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `zeta-assistant-${range}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className={ambient ? 'ambient-mode space-y-7' : 'space-y-7'}>
    <section className="zeta-heading flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="eyebrow"><span className="signal-dot" /> LIVE ENVIRONMENT / 01</div><h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Panoramica meteo<span className="text-primary">.</span></h1><p className="mt-2 text-sm text-muted-foreground">La tua stazione, in tempo reale.</p></div>
      <div className="flex flex-wrap items-center gap-2"><button className="zeta-action" onClick={refresh} aria-label="Aggiorna dati"><RefreshCw size={16} className={latestQuery.isFetching ? 'animate-spin' : ''} /> Aggiorna</button><button className="zeta-action" onClick={() => setAmbient(!ambient)} aria-label={ambient ? 'Esci dalla modalità ambiente' : 'Apri modalità ambiente'}>{ambient ? <Minimize size={16} /> : <Expand size={16} />} <span className="hidden sm:inline">{ambient ? 'Esci' : 'Ambiente'}</span></button></div>
    </section>
    <section className="zeta-status" aria-live="polite"><div className="flex items-center gap-3"><div className={`status-orb ${current ? 'is-online' : ''}`}><Cpu size={18} /></div><div><p className="font-semibold text-sm">{status}</p><p className="text-xs text-muted-foreground">{liveValid ? `Ultimo segnale · ${formatDate(live.createdAt)}` : 'ESP32 · nessuna lettura disponibile'}</p></div></div><span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{current ? '● Sincronizzato' : '○ Da verificare'}</span></section>
    <section className="grid gap-4 md:grid-cols-3" aria-label="Letture correnti">{metricKeys.map((key) => { const item = metrics[key]; const Icon = item.icon; const val = liveValid ? live[key] : null; return <button key={key} onClick={() => changeMetric(key)} className={`metric-card text-left ${metric === key ? 'is-selected' : ''}`} style={{ '--metric-color': item.color } as React.CSSProperties} aria-pressed={metric === key}><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{item.label}</span><Icon size={20} style={{ color: item.color }} /></div><div className="mt-6 flex items-baseline gap-2"><strong className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums">{val === null ? '—' : val.toFixed(item.digits)}</strong><span className="text-sm text-muted-foreground">{item.unit}</span></div><div className="mt-6 flex items-center justify-between text-xs text-muted-foreground"><span>{current ? 'Lettura attuale' : 'Ultima lettura'}</span><span className="font-mono">{val === null ? 'NO DATA' : 'ESP32 / LIVE'}</span></div></button>; })}</section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]">
      <div className="zeta-panel min-w-0"><div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow">ANALISI / 02</div><h2 className="mt-2 text-xl font-semibold">Andamento {selected.label.toLowerCase()}</h2></div><div className="range-control" aria-label="Periodo grafico">{(['24h', '7d', '30d'] as const).map((r) => <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={range === r ? 'active' : ''}>{r}</button>)}</div></div>
        {historyQuery.isLoading ? <div className="chart-empty">Caricamento storico…</div> : historyQuery.isError ? <div className="chart-empty" role="alert">Impossibile caricare lo storico.</div> : history.length ? <div className="mt-6 h-[280px] sm:h-[340px] w-full" role="img" aria-label={`Grafico ${selected.label.toLowerCase()} degli ultimi ${range}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 10, right: 8, bottom: 0, left: -24 }}><defs><linearGradient id="zetaChart" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={selected.color} stopOpacity={0.28}/><stop offset="100%" stopColor={selected.color} stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 6"/><XAxis dataKey="createdAt" tickFormatter={(value: string) => range === '24h' ? new Date(value).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" minTickGap={25}/><YAxis tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']}/><Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value) => [`${Number(value).toFixed(selected.digits)} ${selected.unit}`, selected.label]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }}/><Area type="monotone" dataKey={metric} stroke={selected.color} strokeWidth={2.5} fill="url(#zetaChart)" dot={false} activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer></div> : <div className="chart-empty"><Activity size={26}/><span>Lo storico apparirà dopo il primo invio.</span></div>}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">{[['Minimo', min], ['Massimo', max], ['Media', mean]].map(([label, value]) => <div key={label as string}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value === null ? '—' : `${(value as number).toFixed(selected.digits)} ${selected.unit}`}</p></div>)}<div><p className="text-xs text-muted-foreground">Variazione</p><p className="mt-1 flex items-center gap-1 text-lg font-semibold tabular-nums">{delta === null ? '—' : <>{delta >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}{Math.abs(delta).toFixed(selected.digits)} {selected.unit}</>}</p></div></div>
      </div>
      <div className="flex flex-col gap-4"><div className="zeta-panel flex-1"><div className="eyebrow">ZETA INSIGHT / 03</div><div className="insight-mark mt-7">✳</div><h2 className="mt-5 text-xl font-semibold">Briefing della stazione</h2><p className="mt-3 text-sm leading-7 text-muted-foreground" aria-live="polite">{briefing}</p><div className="mt-8 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">{current ? <Check size={15} className="text-primary"/> : <TriangleAlert size={15}/>} Elaborato dalle letture disponibili</div></div><div className="zeta-panel"><div className="eyebrow">ARCHIVIO / 04</div><div className="mt-4 flex items-center justify-between gap-3"><div><p className="font-semibold">Esporta letture</p><p className="mt-1 text-xs text-muted-foreground">{history.length} campioni · {range}</p></div><button className="zeta-icon-button" onClick={exportCsv} disabled={!history.length} aria-label="Scarica letture CSV" title="Scarica CSV"><Download size={18}/></button></div></div></div>
    </section>
    <footer className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14}/> Aggiornamento automatico ogni 10 secondi. I dati storici si aggiornano ogni minuto.</footer>
  </div>;
};
