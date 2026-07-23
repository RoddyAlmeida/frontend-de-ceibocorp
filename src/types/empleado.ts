import { parseRole, type Role } from './role';

export type EmpleadoTab = 'todos' | 'activos' | 'inactivos';

export interface Empleado {
  id: number;
  name: string;
  last_name: string;
  id_card: string;
  address: string;
  email: string;
  role_id: number;
  role: Role;
  roleLabel: string;
  headquarter_id: number;
  headquarterName: string;
  status: 'active' | 'inactive';
  isActive: boolean;
}

export interface EmpleadoFormData {
  name: string;
  last_name: string;
  id_card: string;
  address: string;
  email: string;
  password: string;
  password_confirmation: string;
  headquarter_id: number | null;
  role_id: number | null;
  isActive: boolean;
}

export function isEmpleadoActive(raw: Record<string, unknown>): boolean {
  return (
    raw.status === 'active' ||
    raw.is_active === 1 ||
    raw.is_active === true
  );
}

export function parseEmpleado(raw: Record<string, unknown>): Empleado {
  const roleObj = raw.role;
  const roleId =
    (raw.role_id as number | undefined) ??
    (typeof roleObj === 'object' && roleObj !== null
      ? ((roleObj as { id?: number }).id ?? 3)
      : 3);

  const hqObj = raw.headquarter;
  const headquarterId =
    (raw.headquarter_id as number | undefined) ??
    (typeof hqObj === 'object' && hqObj !== null
      ? ((hqObj as { id?: number }).id ?? 0)
      : 0);

  const role = parseRole(roleObj ?? raw.role_name ?? roleId);
  const active = isEmpleadoActive(raw);

  let roleLabel = 'Sin rol';
  if (typeof roleObj === 'object' && roleObj !== null && 'name' in roleObj) {
    const name = String((roleObj as { name: string }).name);
    if (name === 'super_admin') roleLabel = 'Super Admin';
    else if (name === 'admin') roleLabel = 'Administrador';
    else if (name.includes('bodeguero')) roleLabel = 'Bodeguero';
    else roleLabel = name;
  } else if (role === 'super_admin') roleLabel = 'Super Admin';
  else if (role === 'admin') roleLabel = 'Administrador';
  else if (role === 'bodeguero') roleLabel = 'Bodeguero';

  const hqName =
    typeof hqObj === 'object' && hqObj !== null && 'name' in hqObj
      ? String((hqObj as { name: string }).name)
      : '—';

  return {
    id: raw.id as number,
    name: String(raw.name ?? ''),
    last_name: String(raw.last_name ?? ''),
    id_card: String(raw.id_card ?? ''),
    address: String(raw.address ?? ''),
    email: String(raw.email ?? ''),
    role_id: roleId,
    role,
    roleLabel,
    headquarter_id: headquarterId,
    headquarterName: hqName,
    status: active ? 'active' : 'inactive',
    isActive: active,
  };
}

export function empleadoDisplayName(emp: Empleado): string {
  const full = `${emp.name} ${emp.last_name}`.trim();
  return full || emp.name || 'Sin nombre';
}

export function empleadoInitials(emp: Empleado): string {
  const parts = empleadoDisplayName(emp).trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}
