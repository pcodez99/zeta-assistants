import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, Outlet, useNavigate, useRouter } from '@tanstack/react-router';
import { useTheme } from '../context/theme';
import { getAccessToken, setAccessToken, subscribeAuth, api } from '../lib/api';
import { Sun, Moon, LogOut, Settings, LayoutDashboard, Search, X, ArrowRight } from 'lucide-react';

export const RootLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const isLoggedIn = !!useSyncExternalStore(subscribeAuth, getAccessToken);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleAuthExpired = () => { navigate({ to: '/login' }); router.invalidate(); };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [navigate, router]);
  useEffect(() => {
    if (!isLoggedIn) return;
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen((open) => !open); }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isLoggedIn]);
  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) { try { await api.post('/auth/signout', { sessionId }); } catch (err) { console.error('Logout failed', err); } }
    for (const key of ['refreshToken', 'sessionId', 'name', 'username']) localStorage.removeItem(key);
    setAccessToken(null); setPaletteOpen(false); navigate({ to: '/login' }); router.invalidate();
  };
  const commands = [{ label: 'Panoramica', icon: LayoutDashboard, action: () => navigate({ to: '/' }) }, { label: 'Impostazioni', icon: Settings, action: () => navigate({ to: '/settings' }) }, { label: theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro', icon: theme === 'dark' ? Sun : Moon, action: toggleTheme }];
  return <div className="min-h-screen flex flex-col">
    <header className="zeta-topbar"><div className="container flex h-16 items-center justify-between gap-3"><Link to="/" className="zeta-brand" aria-label="zeta-assistant, vai alla panoramica"><span className="zeta-logo">Z</span><span>zeta<span className="text-primary">-</span>assistant</span></Link><div className="flex items-center gap-2">{isLoggedIn && <button className="zeta-search" onClick={() => setPaletteOpen(true)} aria-label="Apri comandi rapidi"><Search size={16}/><span className="hidden sm:inline">Cerca un comando</span><kbd className="hidden sm:inline">⌘ K</kbd></button>}<button onClick={toggleTheme} className="zeta-icon-button" aria-label={theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro'}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>{isLoggedIn && <button onClick={handleLogout} className="zeta-icon-button" aria-label="Esci" title="Esci"><LogOut size={18}/></button>}</div></div></header>
    <div className="container flex flex-1 gap-8">{isLoggedIn && <aside className="hidden md:flex w-48 shrink-0 flex-col py-8"><div className="eyebrow mb-5">WORKSPACE</div><nav className="space-y-1" aria-label="Navigazione principale"><Link to="/" activeProps={{ className: 'active' }} className="zeta-nav-link"><LayoutDashboard size={18}/> Panoramica</Link><Link to="/settings" activeProps={{ className: 'active' }} className="zeta-nav-link"><Settings size={18}/> Impostazioni</Link></nav><div className="mt-auto border-t border-border pt-5"><div className="eyebrow">STAZIONE 01</div><p className="mt-2 text-xs text-muted-foreground">Monitoraggio ambientale</p></div></aside>}<main className={`flex-1 min-w-0 py-7 sm:py-9 ${isLoggedIn ? 'pb-24 md:pb-9' : 'flex items-center justify-center'}`}><Outlet/></main></div>
    {isLoggedIn && <nav className="zeta-mobile-nav md:hidden" aria-label="Navigazione mobile"><Link to="/" activeProps={{ className: 'active' }}><LayoutDashboard size={20}/><span>Panoramica</span></Link><Link to="/settings" activeProps={{ className: 'active' }}><Settings size={20}/><span>Impostazioni</span></Link></nav>}
    {paletteOpen && <div className="palette-backdrop" onMouseDown={() => setPaletteOpen(false)}><div className="palette-dialog" role="dialog" aria-modal="true" aria-label="Comandi rapidi" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b border-border p-4"><Search size={19} className="text-primary"/><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca un comando…" aria-label="Cerca un comando" className="flex-1 bg-transparent outline-none text-sm"/><button onClick={() => setPaletteOpen(false)} aria-label="Chiudi"><X size={18}/></button></div><div className="p-2">{commands.filter((command) => command.label.toLowerCase().includes(search.toLowerCase())).map((command) => <button key={command.label} className="palette-command" onClick={() => { command.action(); setPaletteOpen(false); setSearch(''); }}><command.icon size={17}/>{command.label}<ArrowRight size={15} className="ml-auto opacity-50"/></button>)}{!commands.some((command) => command.label.toLowerCase().includes(search.toLowerCase())) && <p className="p-4 text-sm text-muted-foreground">Nessun comando trovato.</p>}</div><p className="border-t border-border p-3 text-xs text-muted-foreground">Esc per chiudere · ⌘K / Ctrl K per aprire</p></div></div>}
  </div>;
};
