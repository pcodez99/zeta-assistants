import React, { useState } from 'react';
import { api } from '../lib/api';
import { ShieldCheck, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    try {
      await api.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Errore nel cambio password.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Impostazioni Sistema</h1>
        <p className="text-muted-foreground">Consulta la connessione ESP32 e gestisci la sicurezza del tuo account</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ESP32 Configuration Card */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Configurazione Stazione Meteo ESP32</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            La stazione invia le misure al server tramite Wi-Fi. La dashboard mostra
            gli ultimi valori ricevuti e lo storico, anche fuori dalla rete di casa.
          </p>
          <p className="text-sm text-muted-foreground">
            La connessione Wi-Fi si configura nel programma dell’ESP32.
          </p>
        </div>

        {/* Change Password Card */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Sicurezza Account</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {pwError && (
              <div className="p-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="p-2 text-xs text-green-700 bg-green-100 border border-green-200 rounded-lg">
                Password aggiornata con successo!
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="currentPassword">
                Password Attuale
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="newPassword">
                Nuova Password (almeno 8 caratteri)
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              Aggiorna Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
