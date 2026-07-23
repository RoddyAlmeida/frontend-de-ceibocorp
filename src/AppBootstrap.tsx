import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { registerUnauthorizedHandler } from './lib/sessionEvents';
import { useAuthStore } from './store/authStore';
import App from './App';

function AppBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const clearSession = useAuthStore((s) => s.clearSession);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
    });
  }, [clearSession]);

  useEffect(() => {
    hydrate().catch((err) => {
      console.error('[bootstrap] Error al hidratar la aplicación:', err);
    });
  }, [hydrate]);

  if (isHydrating) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-ceibo-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default AppBootstrap;
