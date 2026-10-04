import React, { useEffect, useRef } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { setAccessToken } from '../lib/api';
import { Loader2 } from 'lucide-react';

export const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const sessionId = params.get('sessionId');
    const name = params.get('name');
    const username = params.get('username');

    if (accessToken && refreshToken && sessionId) {
      setAccessToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('sessionId', sessionId);
      if (name) localStorage.setItem('name', name);
      if (username) localStorage.setItem('username', username);

      window.history.replaceState(window.history.state, '', window.location.pathname);
      void navigate({ to: '/', replace: true }).then(() => router.invalidate());
    } else {
      console.error('Google Auth callback missing parameters');
      void navigate({ to: '/login', replace: true });
    }
  }, [navigate, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Autenticazione con Google in corso...</p>
    </div>
  );
};
