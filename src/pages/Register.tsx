import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { register, getPublicHeadquarters } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [headquarterId, setHeadquarterId] = useState<number | null>(null);
  const [sedes, setSedes] = useState<{ id: number; name: string }[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getPublicHeadquarters()
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : raw?.data;
        if (Array.isArray(list)) {
          setSedes(
            list.map((s: Record<string, unknown>) => ({
              id: s.id as number,
              name: String(s.name ?? 'Sin nombre'),
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  if (!isHydrating && isAuthenticated) {
    return <Navigate to="/ventas/nueva" replace />;
  }

  if (success) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-ceibo-bg p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ceibo-green/10 text-3xl">
            ✓
          </div>
          <h2 className="text-xl font-extrabold text-ceibo-green">Solicitud enviada</h2>
          <p className="mt-2 text-sm text-gray-500">
            Tu cuenta está pendiente de aprobación. Un administrador revisará tu solicitud y te
            activará pronto.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl bg-ceibo-sale px-6 py-3 text-sm font-bold text-white"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !name.trim() ||
      !lastName.trim() ||
      !idCard.trim() ||
      !address.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        last_name: lastName.trim(),
        id_card: idCard.trim(),
        address: address.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
        ...(headquarterId ? { headquarter_id: headquarterId } : {}),
      });
      setSuccess(true);
    } catch (err) {
      const e = err as Error & { errors?: Record<string, string[]> };
      const detalle = e.errors
        ? Object.values(e.errors).flat().join(', ')
        : '';
      setError(detalle || e.message || 'No se pudo registrar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-ceibo-bg lg:flex-row">
      <div className="hidden w-full flex-col items-center justify-center bg-gradient-to-br from-ceibo-green to-[#284030] p-8 text-white lg:flex lg:w-1/2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl">
          🌿
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">Ceibo Corp</h1>
        <p className="mt-2 text-center text-sm text-white/75">Crea tu cuenta para comenzar</p>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center p-4 lg:w-1/2 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ceibo-green/10 text-3xl">
                🌿
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-ceibo-green">Crear cuenta</h2>
            <p className="mt-1 text-sm text-gray-500">Regístrate para solicitar acceso al sistema</p>
          </div>

          {error && (
            <div className="mb-4 w-full rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-ceibo-green">Nombre *</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan"
                  autoComplete="given-name"
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-ceibo-green">Apellido *</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Pérez"
                  autoComplete="family-name"
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Cédula / RUC *</span>
              <input
                type="text"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                placeholder="1712345678"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Dirección *</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Principal s/n"
                autoComplete="street-address"
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Correo electrónico *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
              />
            </label>

            {sedes.length > 0 && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-ceibo-green">Sede (opcional)</span>
                <select
                  value={headquarterId ?? ''}
                  onChange={(e) =>
                    setHeadquarterId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
                >
                  <option value="">Sin sede preferida</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Contraseña *</span>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
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

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-ceibo-green">Confirmar contraseña *</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-12 w-full rounded-xl bg-ceibo-sale p-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-ceibo-green hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
