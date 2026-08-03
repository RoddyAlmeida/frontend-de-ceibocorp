import type { Role } from '../types/role';

export interface RoleOption {
  id: number;
  value: Role;
  label: string;
}

/** IDs alineados con el backend / Flutter empleados_view.dart */
export const ROLE_OPTIONS: RoleOption[] = [
  { id: 1, value: 'super_admin', label: 'Super Admin' },
  { id: 2, value: 'admin', label: 'Administrador' },
  { id: 3, value: 'bodeguero', label: 'Bodeguero' },
];

export function roleOptionById(id: number): RoleOption | undefined {
  return ROLE_OPTIONS.find((r) => r.id === id);
}

export function roleOptionByValue(value: Role): RoleOption | undefined {
  return ROLE_OPTIONS.find((r) => r.value === value);
}

function normalizeRoleName(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'name' in raw) {
    return String((raw as { name: unknown }).name ?? '').toLowerCase();
  }
  return String(raw ?? '').toLowerCase();
}

export interface EmployeeLike {
  role_id?: number;
  role?: unknown;
  role_name?: string;
  headquarter_id?: number;
  headquarter?: { id?: number };
}

export const RolePolicy = {
  canAccessEmpleados(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin';
  },

  canActivateUsers(role: Role | null): boolean {
    return role === 'super_admin';
  },

  canAccessHistorialVentas(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin' || role === 'bodeguero';
  },

  canChooseEmployeeHeadquarter(role: Role | null): boolean {
    return role === 'super_admin';
  },

  canAssignSuperAdminRole(role: Role | null): boolean {
    return role === 'super_admin';
  },

  assignableRoles(actorRole: Role | null): RoleOption[] {
    if (actorRole === 'super_admin') return ROLE_OPTIONS;
    if (actorRole === 'admin') {
      return ROLE_OPTIONS.filter((r) => r.value === 'bodeguero');
    }
    return [];
  },

  canToggleEmployee(
    actorRole: Role | null,
    _actorHeadquarterId: number | undefined,
    employee: EmployeeLike,
  ): boolean {
    if (actorRole === 'super_admin') return true;
    if (actorRole === 'admin') {
      const roleName = normalizeRoleName(employee.role ?? employee.role_name);
      return roleName.includes('bodeguero');
    }
    return false;
  },

  canEditEmployee(actorRole: Role | null): boolean {
    return actorRole === 'admin' || actorRole === 'super_admin';
  },

  canEditEmployeeRole(actorRole: Role | null, employee: EmployeeLike): boolean {
    if (actorRole === 'super_admin') return true;
    if (actorRole === 'admin') {
      const roleName = normalizeRoleName(employee.role ?? employee.role_name);
      return roleName.includes('bodeguero');
    }
    return false;
  },

  canVoidSale(role: Role | null): boolean {
    return role === 'super_admin';
  },

  shouldScopeSalesToHeadquarter(role: Role | null): boolean {
    return role === 'admin' || role === 'bodeguero';
  },

  // ─── Transfers ───────────────────────────────────────────────────────────────

  canAccessTransfers(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin' || role === 'bodeguero';
  },

  canCreateTransfer(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin';
  },

  canChangeTransferStatus(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin';
  },

  canUploadEvidence(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin' || role === 'bodeguero';
  },

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  canAccessDashboard(role: Role | null): boolean {
    return role === 'super_admin';
  },

  // ─── Alerts ─────────────────────────────────────────────────────────────────

  canAccessAlerts(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin' || role === 'bodeguero';
  },

  canManageThresholds(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin';
  },

  canDeleteThreshold(role: Role | null): boolean {
    return role === 'super_admin';
  },

  // ─── Kardex ─────────────────────────────────────────────────────────────────

  canAccessKardex(role: Role | null): boolean {
    return role === 'admin' || role === 'super_admin' || role === 'bodeguero';
  },
};
