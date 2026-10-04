import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

import { router } from './router';
import { ThemeProvider } from './context/theme';
import { setAccessToken } from './lib/api';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// Recover session if credentials exist in localStorage
const initializeApp = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const sessionId = localStorage.getItem('sessionId');

  if (refreshToken && sessionId && window.location.pathname !== '/auth/google/callback') {
    try {
      const { data } = await axios.post('/api/auth/refresh', {
        refresh: refreshToken,
        sessionId,
      }, { timeout: 10000 });
      setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    } catch (err) {
      console.warn('Session restoration failed:', err);
      for (const key of ['refreshToken', 'sessionId', 'name', 'username']) localStorage.removeItem(key);
    }
  }

  // Mount the React application
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
};

initializeApp();
