import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/empleados/ConfirmDialog';
import EmpleadoCard, { EmpleadoTable } from '../components/empleados/EmpleadoCard';
import EmpleadoFormModal, { type SedeOption } from '../components/empleados/EmpleadoFormModal';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { RolePolicy } from '../lib/rolePolicy';
import {
  activateUserWithRole,
  createEmployee,
  getEmployees,
  getHeadquarters,
  toggleEmployeeStatus,
  updateEmployee,
} from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Empleado, EmpleadoFormData, EmpleadoTab } from '../types/empleado';
import { parseEmpleado } from '../types/empleado';

function extractList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  return [];
}

export default function Empleados() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<EmpleadoTab>('todos');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Empleado | null>(null);

  const [confirmToggle, setConfirmToggle] = useState<Empleado | null>(null);
  const [toggling, setToggling] = useState(false);

  const [activating, setActivating] = useState<Empleado | null>(null);
  const [activateRoleId, setActivateRoleId] = useState<number>(3);
  const [activatingLoading, setActivatingLoading] = useState(false);

  const canChooseHq = RolePolicy.canChooseEmployeeHeadquarter(role);
  const assignableRoles = RolePolicy.assignableRoles(role);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadSedes = useCallback(async () => {
    try {
      const { data } = await getHeadquarters();
      const list = extractList(data).map((s) => ({
        id: s.id as number,
        name: String(s.name ?? 'Sin nombre'),
      }));
      setSedes(list);
    } catch (err) {
      console.error('[empleados] Error al cargar sedes:', err);
      showToast('No se pudieron cargar las sedes', 'err');
    }
  }, [showToast]);

  const loadEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getEmployees();
      const parsed = extractList(data).map(parseEmpleado);
      setEmpleados(parsed);
    } catch (err) {
      console.error('[empleados] Error al cargar empleados:', err);
      showToast(err instanceof Error ? err.message : 'Error al cargar empleados', 'err');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!role || !RolePolicy.canAccessEmpleados(role)) return;
    loadEmpleados();
    if (canChooseHq) loadSedes();
    else if (user?.headquarter_id) {
      setSedes([{ id: user.headquarter_id, name: 'Tu sede' }]);
    }
  }, [role, canChooseHq, user, loadEmpleados, loadSedes]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = empleados;

    if (tab === 'activos') list = list.filter((e) => e.isActive);
    else if (tab === 'inactivos') list = list.filter((e) => !e.isActive);
    else if (tab === 'pendientes') list = list.filter((e) => !e.isActive);

    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.last_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          `${e.name} ${e.last_name}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [empleados, tab, debouncedSearch]);

  const counts = useMemo(() => {
    const activos = empleados.filter((e) => e.isActive).length;
    const inactivos = empleados.length - activos;
    return { todos: empleados.length, activos, inactivos, pendientes: inactivos };
  }, [empleados]);

  const canToggleFor = useCallback(
    (emp: Empleado) =>
      RolePolicy.canToggleEmployee(role, user?.headquarter_id, {
        role_id: emp.role_id,
        role: emp.role,
        role_name: emp.roleLabel,
        headquarter_id: emp.headquarter_id,
      }),
    [role, user?.headquarter_id],
  );

  const canEditFor = useCallback(
    (emp: Empleado) =>
      RolePolicy.canEditEmployeeRole(role, {
        role_id: emp.role_id,
        role: emp.role,
        role_name: emp.roleLabel,
        headquarter_id: emp.headquarter_id,
      }),
    [role],
  );

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (emp: Empleado) => {
    setFormMode('edit');
    setEditing(emp);
    setFormOpen(true);
  };

  const handleSubmit = async (data: EmpleadoFormData) => {
    if (!role) return;
    setSaving(true);
    try {
      const hqId = canChooseHq ? data.headquarter_id : user?.headquarter_id;

      if (formMode === 'create') {
        if (!hqId || !data.role_id) {
          showToast('Sede y rol son obligatorios', 'err');
          return;
        }
        await createEmployee({
          name: data.name.trim(),
          last_name: data.last_name.trim(),
          id_card: data.id_card.trim(),
          address: data.address.trim(),
          email: data.email.trim(),
          password: data.password,
          password_confirmation: data.password_confirmation,
          headquarter_id: hqId,
          role_id: data.role_id,
        });
        showToast('Empleado registrado con éxito');
      } else if (editing) {
        const body: Record<string, unknown> = {
          name: data.name.trim(),
          last_name: data.last_name.trim(),
          id_card: data.id_card.trim(),
          address: data.address.trim(),
          email: data.email.trim(),
        };
        if (data.password) body.password = data.password;
        if (canChooseHq && data.headquarter_id) body.headquarter_id = data.headquarter_id;
        if (data.role_id) body.role_id = data.role_id;
        if (editing.isActive !== data.isActive) {
          body.status = data.isActive ? 'active' : 'inactive';
        }
        await updateEmployee(editing.id, body);
        showToast('Usuario actualizado');
      }
      setFormOpen(false);
      await loadEmpleados();
    } catch (err) {
      console.error('[empleados] Error al guardar:', err);
      showToast(err instanceof Error ? err.message : 'Error al guardar empleado', 'err');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const requestToggle = (emp: Empleado) => {
    if (!canToggleFor(emp)) return;
    if (emp.id === user?.id) {
      showToast('No puedes desactivar tu propia cuenta', 'err');
      return;
    }
    setConfirmToggle(emp);
  };

  const confirmToggleStatus = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    const nextActive = !confirmToggle.isActive;
    try {
      await toggleEmployeeStatus(confirmToggle.id, nextActive);
      showToast(nextActive ? 'Empleado activado' : 'Empleado desactivado');
      setConfirmToggle(null);
      await loadEmpleados();
    } catch (err) {
      console.error('[empleados] Error al cambiar estado:', err);
      showToast(err instanceof Error ? err.message : 'No se pudo actualizar el estado', 'err');
    } finally {
      setToggling(false);
    }
  };

  const requestActivate = (emp: Empleado) => {
    setActivating(emp);
    setActivateRoleId(assignableRoles[0]?.id ?? 3);
  };

  const confirmActivate = async () => {
    if (!activating) return;
    setActivatingLoading(true);
    try {
      await activateUserWithRole(activating.id, activateRoleId);
      showToast(`${activating.name} fue activado.`);
      setActivating(null);
      await loadEmpleados();
    } catch (err) {
      console.error('[empleados] Error al activar usuario:', err);
      showToast(err instanceof Error ? err.message : 'No se pudo activar el usuario', 'err');
    } finally {
      setActivatingLoading(false);
    }
  };

  if (!role || !RolePolicy.canAccessEmpleados(role)) {
    return null;
  }

  return (
    <div className="min-h-full bg-ceibo-bg">
      <div className="border-b border-gray-200 bg-white px-4 py-4 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-ceibo-green lg:text-2xl">
              Gestión de Personal
            </h1>
            <p className="text-xs text-gray-500">{filtered.length} empleados visibles</p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-ceibo-green-light sm:max-w-xs"
            />
            <button
              type="button"
              onClick={openCreate}
              className="shrink-0 rounded-xl bg-ceibo-green-light px-4 py-2.5 text-sm font-bold text-white hover:bg-ceibo-green"
            >
              + Agregar
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabChip
            label={`Todos (${counts.todos})`}
            active={tab === 'todos'}
            onClick={() => setTab('todos')}
          />
          <TabChip
            label={`Activos (${counts.activos})`}
            active={tab === 'activos'}
            onClick={() => setTab('activos')}
          />
          <TabChip
            label={`Inactivos (${counts.inactivos})`}
            active={tab === 'inactivos'}
            onClick={() => setTab('inactivos')}
            danger
          />
          {RolePolicy.canActivateUsers(role) && (
            <TabChip
              label={`Pendientes (${counts.pendientes})`}
              active={tab === 'pendientes'}
              onClick={() => setTab('pendientes')}
              accent
            />
          )}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="text-4xl">👥</p>
            <p className="mt-2 font-semibold">Sin resultados</p>
            <p className="text-sm">Intenta con otro filtro o búsqueda</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {filtered.map((emp) => (
                <EmpleadoCard
                  key={emp.id}
                  empleado={emp}
                  canToggle={canToggleFor(emp)}
                  canEdit={canEditFor(emp)}
                  onEdit={() => openEdit(emp)}
                  onToggle={() => requestToggle(emp)}
                  showActivate={tab === 'pendientes'}
                  onActivate={() => requestActivate(emp)}
                />
              ))}
            </div>
            <EmpleadoTable
              empleados={filtered}
              canToggleFor={canToggleFor}
              canEditFor={canEditFor}
              onEdit={openEdit}
              onToggle={requestToggle}
              showActivate={tab === 'pendientes'}
              onActivate={requestActivate}
            />
          </>
        )}
      </div>

      {toast && (
        <div
          className={[
            'fixed bottom-24 left-4 right-4 z-50 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm',
            toast.type === 'ok' ? 'bg-ceibo-green' : 'bg-red-600',
          ].join(' ')}
        >
          {toast.msg}
        </div>
      )}

      <EmpleadoFormModal
        open={formOpen}
        mode={formMode}
        empleado={editing}
        sedes={sedes}
        actorRole={role}
        actorHeadquarterId={user?.headquarter_id}
        assignableRoles={assignableRoles}
        canChooseHeadquarter={canChooseHq}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Desactivar empleado' : 'Activar empleado'}
        message={
          confirmToggle?.isActive
            ? `¿Desactivar a ${confirmToggle.name}? No podrá iniciar sesión hasta reactivarlo.`
            : `¿Reactivar a ${confirmToggle?.name}?`
        }
        confirmLabel={confirmToggle?.isActive ? 'Desactivar' : 'Activar'}
        variant={confirmToggle?.isActive ? 'danger' : 'default'}
        loading={toggling}
        onConfirm={confirmToggleStatus}
        onCancel={() => setConfirmToggle(null)}
      />

      {activating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-ceibo-green">Activar usuario</h3>
            <p className="mt-1 text-sm text-gray-500">
              Se activará a <span className="font-semibold">{activating.name} {activating.last_name}</span> con su rol por defecto.
            </p>

            <label className="mt-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ceibo-green">Rol</span>
                <span className="text-[10px] font-bold text-amber-600">Próximamente</span>
              </div>
              <select
                value={activateRoleId}
                disabled
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 outline-none"
              >
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400">
                La asignación de rol en la activación requiere un cambio en el backend.
              </span>
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setActivating(null)}
                disabled={activatingLoading}
                className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-600 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmActivate}
                disabled={activatingLoading}
                className="flex-1 rounded-xl bg-ceibo-green-light py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {activatingLoading ? 'Activando...' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabChip({
  label,
  active,
  onClick,
  danger,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full min-h-12 px-4 py-1.5 text-xs font-bold transition-colors',
        active
          ? danger
            ? 'bg-red-600 text-white'
            : accent
              ? 'bg-amber-500 text-white'
              : 'bg-ceibo-green-light text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
