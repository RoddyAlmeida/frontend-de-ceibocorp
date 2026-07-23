import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '../types/role';
import { getDefaultRouteForRole } from '../types/role';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const role = useAuthStore((s) => s.role);

  if (isHydrating) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-ceibo-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    console.warn(
      `[ProtectedRoute] Rol "${role}" no tiene acceso. Redirigiendo a ruta por defecto.`,
    );
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <Outlet />;
}
