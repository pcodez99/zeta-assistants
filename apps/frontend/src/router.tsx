import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { RootLayout } from './routes/root';
import { Dashboard } from './routes/dashboard';
import { Login } from './routes/login';
import { Register } from './routes/register';
import { SettingsPage } from './routes/settings';
import { GoogleCallback } from './routes/google-callback';
import { getAccessToken } from './lib/api';

// Create the root route
const rootRoute = createRootRoute({
  component: RootLayout,
});

// Auth Guards
const requireAuth = () => {
  if (!getAccessToken()) {
    throw redirect({
      to: '/login',
    });
  }
};

const redirectIfLoggedIn = () => {
  if (getAccessToken()) {
    throw redirect({
      to: '/',
    });
  }
};

// Define route hierarchy
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
  beforeLoad: requireAuth,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: redirectIfLoggedIn,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: Register,
  beforeLoad: redirectIfLoggedIn,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
  beforeLoad: requireAuth,
});

const googleCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/google/callback',
  component: GoogleCallback,
  beforeLoad: redirectIfLoggedIn,
});

// Assemble Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  settingsRoute,
  googleCallbackRoute,
]);

// Create Router instance
export const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
