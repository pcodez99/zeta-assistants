import React, { useEffect } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { setAccessToken } from '../lib/api';
import { Loader2 } from 'lucide-react';

export const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
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

      router.invalidate().then(() => {
        navigate({ to: '/' });
      });
    } else {
      console.error('Google Auth callback missing parameters');
      navigate({ to: '/login' });
    }
  }, [navigate, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Autenticazione con Google in corso...</p>
    </div>
  );
};
