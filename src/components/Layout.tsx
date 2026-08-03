import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { Role } from '../types/role';
import { useAuthStore } from '../store/authStore';
import { useInventarioStore } from '../store/inventarioStore';
import { useTrasladosStore } from '../store/trasladosStore';
import { getStockAlerts } from '../services/api';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/ventas/nueva', label: 'Ventas', icon: '💰', roles: ['admin', 'super_admin'] },
  { to: '/ventas/historial', label: 'Historial', icon: '🧾', roles: ['admin', 'super_admin', 'bodeguero'] },
  { to: '/inventario', label: 'Inventario', icon: '📦', roles: ['bodeguero', 'admin', 'super_admin'] },
  { to: '/traslados', label: 'Traslados', icon: '🔄', roles: ['admin', 'super_admin', 'bodeguero'] },
  { to: '/kardex', label: 'Kardex', icon: '📋', roles: ['admin', 'super_admin', 'bodeguero'] },
  { to: '/alertas-stock', label: 'Alertas', icon: '⚠️', roles: ['admin', 'super_admin', 'bodeguero'] },
  { to: '/empleados', label: 'Empleados', icon: '👥', roles: ['admin', 'super_admin'] },
  { to: '/reportes', label: 'Reportes', icon: '📊', roles: ['super_admin'] },
];

function bottomNavClassName(isActive: boolean) {
  return [
    'flex flex-1 min-w-max flex-col items-center justify-center gap-1 rounded-xl p-2 text-xs font-semibold transition-colors',
    isActive ? 'text-ceibo-sale' : 'text-gray-500',
  ].join(' ');
}

export default function Layout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const logout = useAuthStore((s) => s.logout);

  const [alertCount, setAlertCount] = useState(0);

  const loadAlertCount = useCallback(async () => {
    try {
      const params: Record<string, string> = { status: 'active' };
      if (!isSuperAdmin && user?.headquarter_id) {
        params.headquarter_id = String(user.headquarter_id);
      }
      const res = await getStockAlerts(params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setAlertCount(list.length);
    } catch {
      setAlertCount(0);
    }
  }, [isSuperAdmin, user?.headquarter_id]);

  useEffect(() => {
    loadAlertCount();
    const t = window.setInterval(loadAlertCount, 60000);
    return () => window.clearInterval(t);
  }, [loadAlertCount]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role),
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('[layout] Error al cerrar sesión:', err);
    } finally {
      useInventarioStore.getState().reset();
      useTrasladosStore.getState().reset();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-ceibo-bg">
      {/* Sidebar — lg+ */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="border-b border-gray-100 p-6">
          <h1 className="text-lg font-extrabold text-ceibo-green">Ceibo Corp</h1>
          {user && (
            <p className="mt-1 truncate text-xs text-gray-500">
              {user.name} · {role}
            </p>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-ceibo-sale/10 text-ceibo-sale'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                ].join(' ')
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.to === '/alertas-stock' && alertCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 p-4 text-sm font-semibold text-red-500 hover:bg-red-50"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header móvil */}
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div>
            <h1 className="text-base font-extrabold text-ceibo-green">Ceibo Corp</h1>
            {user && (
              <p className="text-xs text-gray-500">{user.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            Salir
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* Bottom nav — móvil/tablet */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto border-t border-gray-200 bg-white px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => bottomNavClassName(isActive)}>
              <span className="relative text-xl">
                {item.icon}
                {item.to === '/alertas-stock' && alertCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
