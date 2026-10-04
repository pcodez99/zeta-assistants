import React, { useEffect, useSyncExternalStore } from 'react';
import { Link, Outlet, useNavigate, useRouter } from '@tanstack/react-router';
import { useTheme } from '../context/theme';
import { getAccessToken, setAccessToken, subscribeAuth, api } from '../lib/api';
import { Sun, Moon, LogOut, CloudSun, Settings, Home } from 'lucide-react';

export const RootLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const isLoggedIn = !!useSyncExternalStore(subscribeAuth, getAccessToken);

  useEffect(() => {
    const handleAuthExpired = () => {
      navigate({ to: '/login' });
      router.invalidate();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [navigate, router]);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      try {
        await api.post('/auth/signout', { sessionId });
      } catch (err) {
        console.error('Logout failed', err);
      }
    }
    for (const key of ['refreshToken', 'sessionId', 'name', 'username']) localStorage.removeItem(key);
    setAccessToken(null);
    navigate({ to: '/login' });
    router.invalidate();
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="h-6 w-6 text-primary animate-pulse" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              MeteoStation
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <nav className="flex items-center gap-2 mr-2">
                <Link
                  to="/"
                  activeProps={{ className: 'bg-secondary text-primary' }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  activeProps={{ className: 'bg-secondary text-primary' }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Impostazioni
                </Link>
              </nav>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-secondary text-foreground/80 hover:text-foreground transition-all cursor-pointer"
              title="Cambia tema"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Logout Button */}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6 flex flex-col justify-center">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-4">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MeteoStation - Creato con React & NestJS
        </div>
      </footer>
    </div>
  );
};
