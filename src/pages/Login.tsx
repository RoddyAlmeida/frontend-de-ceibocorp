import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { login, getMe } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getDefaultRouteForRole } from '../types/role';
import { parseUser } from '../types/user';

export default function Login() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const role = useAuthStore((s) => s.role);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isHydrating && isAuthenticated && role) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const data = await login(trimmedEmail, trimmedPassword);
      const token = data.token ?? data.access_token;
      if (token) setToken(token);

      const user = data.user ? parseUser(data.user) : await getMe();
      setUser(user);

      navigate(getDefaultRouteForRole(user.role), { replace: true });
    } catch (err) {
      const e = err as Error & { errors?: Record<string, string[]> };
      console.error('[login] Error al iniciar sesión:', e);
      const detalle = e.errors
        ? Object.values(e.errors).flat().join(', ')
        : '';
      setError(detalle || e.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-ceibo-bg lg:flex-row">
      {/* Panel branding — visible en lg+ */}
      <div className="hidden w-full flex-col items-center justify-center bg-gradient-to-br from-ceibo-green to-[#284030] p-8 text-white lg:flex lg:w-1/2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl">
          🌿
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">Ceibo Corp</h1>
        <p className="mt-2 text-center text-sm text-white/75">
          Sistema de gestión de inventario
        </p>
      </div>

      {/* Formulario */}
      <div className="flex w-full flex-1 flex-col items-center justify-center p-4 lg:w-1/2 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ceibo-green/10 text-3xl">
                🌿
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-ceibo-green">Bienvenido</h2>
            <p className="mt-1 text-sm text-gray-500">Inicia sesión para continuar</p>
          </div>

          {error && (
            <div className="mb-4 w-full rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <label className="flex w-full flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
              />
            </label>

            <label className="flex w-full flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Contraseña</span>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-ceibo-sale"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-xs text-gray-400"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-12 w-full rounded-xl bg-ceibo-sale p-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-ceibo-green hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
