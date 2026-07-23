export type Role = 'super_admin' | 'admin' | 'bodeguero';

const VALID_ROLES: Role[] = ['super_admin', 'admin', 'bodeguero'];

export function parseRole(raw: unknown): Role {
  const str =
    typeof raw === 'object' && raw !== null
      ? String((raw as { name: unknown }).name ?? '')
      : String(raw ?? '');

  const normalized = str.toLowerCase().replace(/-/g, '_').trim();

  if (normalized.includes('bodeguero')) return 'bodeguero';
  if (normalized === 'super_admin' || normalized.replace(/_/g, '') === 'superadmin') {
    return 'super_admin';
  }
  if (normalized === 'admin' || normalized.includes('admin')) return 'admin';

  console.error('[auth] Rol desconocido recibido del backend:', str);
  throw new Error(`Rol no reconocido: ${str}`);
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.includes(value as Role);
}

export function getDefaultRouteForRole(role: Role): string {
  switch (role) {
    case 'bodeguero':
      return '/inventario';
    case 'admin':
    case 'super_admin':
      return '/ventas/nueva';
  }
}

export function computeRoleFlags(role: Role | null) {
  return {
    isBodeguero: role === 'bodeguero',
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    canEditPlants: role !== 'bodeguero',
  };
}
