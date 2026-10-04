import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  Thermometer, Droplets, Gauge, RefreshCw, Cpu, Activity, 
  Calendar, CloudSun, CheckCircle, XCircle, Loader2
} from 'lucide-react';

interface HistoricalReading {
  id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  createdAt: string;
}

export const Dashboard: React.FC = () => {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const { data: latest, isFetching: liveLoading, isError: liveError, refetch: fetchLiveReading } = useQuery<{ reading: HistoricalReading | null }>({
    queryKey: ['weather-latest'],
    queryFn: async () => (await api.get('/weather/latest')).data,
    refetchInterval: 10000,
  });
  const liveData = latest?.reading ?? null;
  const isRecent = liveData && Date.now() - new Date(liveData.createdAt).getTime() < 10 * 60 * 1000;
  const lastReadingLabel = liveData
    ? `Ricevuto: ${new Date(liveData.createdAt).toLocaleString('it-IT')}`
    : 'In attesa del primo invio';

  const { data: history, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useQuery<HistoricalReading[]>({
    queryKey: ['history', range],
    queryFn: async () => (await api.get(`/weather/history?range=${range}`)).data,
    refetchInterval: 60000,
  });

  // Format date for chart X-Axis
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      if (range === '24h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: '2-digit' });
    } catch {
      return tickItem;
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'temperature') return [`${value}°C`, 'Temperatura'];
    if (name === 'humidity') return [`${value}%`, 'Umidità'];
    if (name === 'pressure') return [`${value} hPa`, 'Pressione'];
    return [value, name];
  };

  const name = localStorage.getItem('name') || 'Utente';

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Greetings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Ciao, <span className="text-primary">{name}</span>!
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-green-500" />
            Dashboard stazione meteorologica
          </p>
        </div>

        {/* ESP32 Status Badge */}
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span>ESP32:</span>
          </div>
          {liveError ? (
            <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <XCircle className="h-3.5 w-3.5" />
              Server non raggiungibile
            </div>
          ) : isRecent ? (
            <div className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
              <CheckCircle className="h-3.5 w-3.5 animate-pulse" />
              Dati recenti
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
              <XCircle className="h-3.5 w-3.5" />
              {liveData ? 'Dati non aggiornati' : 'In attesa di dati'}
            </div>
          )}
          <button
            onClick={() => {
              fetchLiveReading();
              refetchHistory();
            }}
            className="p-1.5 hover:bg-secondary rounded-lg text-foreground/75 cursor-pointer"
            title="Aggiorna dati"
            disabled={liveLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time metrics grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Temp Card */}
        <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <Thermometer className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-muted-foreground">Temperatura</span>
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
              <Thermometer className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">
              {liveData ? liveData.temperature.toFixed(1) : '--'}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">°C</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{lastReadingLabel}</p>
        </div>

        {/* Humidity Card */}
        <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <Droplets className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-muted-foreground">Umidità</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Droplets className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">
              {liveData ? liveData.humidity.toFixed(0) : '--'}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{lastReadingLabel}</p>
        </div>

        {/* Pressure Card */}
        <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <Gauge className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-muted-foreground">Pressione Atmosferica</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Gauge className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">
              {liveData ? liveData.pressure.toFixed(1) : '--'}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">hPa</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{lastReadingLabel}</p>
        </div>
      </div>

      {/* Historical charts panel */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Trend Storico Sensori</h2>
          </div>

          {/* Time range selector */}
          <div className="flex bg-secondary p-1 rounded-xl text-xs font-semibold">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  range === r 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {r === '24h' ? '24 Ore' : r === '7d' ? '7 Giorni' : '30 Giorni'}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : historyError ? (
          <p role="alert">Impossibile caricare lo storico. Riprova tra poco.</p>
        ) : history && history.length > 0 ? (
          <div className="space-y-8">
            {/* Chart 1: Temperature & Humidity */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Temperatura e Umidità</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="createdAt" 
                      tickFormatter={formatXAxis} 
                      stroke="var(--color-muted-foreground)" 
                      fontSize={11}
                    />
                    <YAxis yAxisId="left" stroke="#f97316" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'var(--color-border)' }}
                      formatter={formatTooltip}
                    />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTemp)" 
                    />
                    <Area 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorHum)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Pressure */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Pressione Atmosferica</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="createdAt" 
                      tickFormatter={formatXAxis} 
                      stroke="var(--color-muted-foreground)" 
                      fontSize={11}
                    />
                    <YAxis domain={['auto', 'auto']} stroke="#10b981" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'var(--color-border)' }}
                      formatter={formatTooltip}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pressure" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[250px] text-center p-6 border border-dashed border-border rounded-xl bg-card/50">
            <CloudSun className="h-12 w-12 text-muted-foreground mb-3 animate-pulse" />
            <h3 className="font-semibold mb-1">Nessun dato storico trovato</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Lo storico apparirà dopo il primo invio della stazione meteo al server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
