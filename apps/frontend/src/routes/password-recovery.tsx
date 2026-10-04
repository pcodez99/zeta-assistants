import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import axios from 'axios';
import { LockKeyhole, Mail, Loader2 } from 'lucide-react';
import { setAccessToken } from '../lib/api';

const inputClass = 'w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary';
const buttonClass = 'w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60';
function message(error: unknown) {
  if (axios.isAxiosError(error)) {
    const text = error.response?.data?.message;
    if (typeof text === 'string') return text;
  }
  return 'Impossibile contattare il server. Riprova tra poco.';
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await axios.post('/api/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-md p-6 space-y-6">
    <Mail className="h-10 w-10 text-primary" aria-hidden="true" />
    <h1 className="text-3xl font-bold">Password dimenticata?</h1>
    {sent ? <div role="status" className="space-y-3">
      <h2 className="font-semibold">Controlla la tua email</h2>
      <p>Se esiste un account associato a questo indirizzo, riceverai un link valido per 30 minuti. Controlla anche la posta indesiderata.</p>
      <button className="text-primary underline" onClick={() => setSent(false)}>Usa un altro indirizzo o richiedi un nuovo link</button>
    </div> : <form onSubmit={submit} className="space-y-4">
      <p className="text-muted-foreground">Inserisci l’indirizzo del tuo account: ti invieremo il link per scegliere una nuova password.</p>
      <label className="block space-y-2"><span>Email</span>
        <input className={inputClass} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
      </label>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <button className={buttonClass} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Invia il link</button>
    </form>}
    <Link to="/login" className="block text-primary underline">Torna al login</Link>
  </section>;
}

export function ResetPassword() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const validToken = /^[a-f0-9]{64}$/.test(token);

  useEffect(() => {
    // Keep the token out of navigation history and HTTP/referrer logs.
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitted.current) return;
    if (password !== confirmation) { setError('Le due password non coincidono.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('La password è troppo lunga: usa al massimo 72 byte.'); return; }
    submitted.current = true;
    setBusy(true); setError('');
    try {
      await axios.post('/api/auth/reset-password', { token, password });
      for (const key of ['refreshToken', 'sessionId', 'name', 'username']) localStorage.removeItem(key);
      setAccessToken(null);
      setPassword(''); setConfirmation(''); setDone(true);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); submitted.current = false; }
  }

  return <section className="mx-auto w-full max-w-md p-6 space-y-6">
    <LockKeyhole className="h-10 w-10 text-primary" aria-hidden="true" />
    <h1 className="text-3xl font-bold">Scegli una nuova password</h1>
    {done ? <div role="status" className="space-y-4"><p>Password aggiornata. Le sessioni precedenti sono state chiuse.</p><Link to="/login" className={buttonClass}>Accedi con la nuova password</Link></div>
      : !validToken ? <div role="alert" className="space-y-3"><p>Il link è incompleto o non valido.</p><Link to="/forgot-password" className="text-primary underline">Richiedi un nuovo link</Link></div>
      : <form onSubmit={submit} className="space-y-4">
        <p className="text-muted-foreground">Usa almeno 8 caratteri. Dopo il salvataggio dovrai accedere nuovamente.</p>
        <label className="block space-y-2"><span>Nuova password</span><input className={inputClass} type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
        <label className="block space-y-2"><span>Conferma password</span><input className={inputClass} type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>
        {error && <div role="alert"><p className="text-destructive">{error}</p><Link to="/forgot-password" className="text-primary underline">Richiedi un nuovo link</Link></div>}
        <button className={buttonClass} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salva la nuova password</button>
      </form>}
  </section>;
}
