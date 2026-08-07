import { useEffect, useState } from 'react';
import type { Empleado, EmpleadoFormData } from '../../types/empleado';
import { RolePolicy, type RoleOption } from '../../lib/rolePolicy';
import type { Role } from '../../types/role';

export interface SedeOption {
  id: number;
  name: string;
}

interface EmpleadoFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  empleado?: Empleado | null;
  sedes: SedeOption[];
  actorRole: Role;
  actorHeadquarterId?: number;
  assignableRoles: RoleOption[];
  canChooseHeadquarter: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: EmpleadoFormData) => Promise<void>;
}

const EMPTY_FORM: EmpleadoFormData = {
  name: '',
  last_name: '',
  id_card: '',
  address: '',
  email: '',
  password: '',
  password_confirmation: '',
  headquarter_id: null,
  role_id: null,
  isActive: true,
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmpleadoFormModal({
  open,
  mode,
  empleado,
  sedes,
  actorRole,
  actorHeadquarterId,
  assignableRoles,
  canChooseHeadquarter,
  saving,
  onClose,
  onSubmit,
}: EmpleadoFormModalProps) {
  const [form, setForm] = useState<EmpleadoFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canChangeRole = actorRole === 'super_admin';

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && empleado) {
      setForm({
        name: empleado.name,
        last_name: empleado.last_name,
        id_card: empleado.id_card,
        address: empleado.address,
        email: empleado.email,
        password: '',
        password_confirmation: '',
        headquarter_id: empleado.headquarter_id,
        role_id: empleado.role_id,
        isActive: empleado.isActive,
      });
    } else {
      const defaultHq = canChooseHeadquarter
        ? (sedes[0]?.id ?? actorHeadquarterId ?? null)
        : (actorHeadquarterId ?? null);
      const defaultRole = assignableRoles.find((r) => r.value === 'bodeguero')?.id
        ?? assignableRoles[0]?.id
        ?? null;
      setForm({
        ...EMPTY_FORM,
        headquarter_id: defaultHq,
        role_id: defaultRole,
      });
    }
    setErrors({});
  }, [open, mode, empleado, sedes, canChooseHeadquarter, actorHeadquarterId, assignableRoles]);

  if (!open) return null;

  const set = (patch: Partial<EmpleadoFormData>) => setForm((f) => ({ ...f, ...patch }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Nombre obligatorio';
    if (!form.last_name.trim()) next.last_name = 'Apellido obligatorio';
    if (!form.id_card.trim()) next.id_card = 'Cédula obligatoria';
    if (!form.address.trim()) next.address = 'Dirección obligatoria';
    if (!form.email.trim() || !validateEmail(form.email)) next.email = 'Email inválido';
    if (mode === 'create') {
      if (form.password.length < 8) next.password = 'Mínimo 8 caracteres';
      if (form.password !== form.password_confirmation) {
        next.password_confirmation = 'Las contraseñas no coinciden';
      }
    } else if (form.password && form.password.length < 8) {
      next.password = 'Mínimo 8 caracteres';
    }
    if (canChooseHeadquarter && !form.headquarter_id) {
      next.headquarter_id = 'Selecciona una sede';
    }
    if (!form.role_id) next.role_id = 'Selecciona un rol';
    if (
      form.role_id === 1 &&
      !RolePolicy.canAssignSuperAdminRole(actorRole)
    ) {
      next.role_id = 'No puedes asignar Super Admin';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await onSubmit(form);
    } catch (err) {
      console.error('[empleados] Error en formulario:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white lg:items-center lg:justify-center lg:bg-black/40 lg:p-4">
      <form
        onSubmit={handleSubmit}
        className="flex h-full min-h-0 flex-col bg-white lg:h-auto lg:max-h-[90vh] lg:w-full lg:max-w-lg lg:rounded-2xl lg:shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 lg:rounded-t-2xl">
          <h2 className="text-lg font-extrabold text-ceibo-green">
            {mode === 'create' ? 'Agregar empleado' : 'Editar empleado'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            <Field label="Nombre" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                className={inputClass(errors.name)}
              />
            </Field>
            <Field label="Apellido" error={errors.last_name}>
              <input
                value={form.last_name}
                onChange={(e) => set({ last_name: e.target.value })}
                className={inputClass(errors.last_name)}
              />
            </Field>
            <Field label="Cédula / ID" error={errors.id_card}>
              <input
                value={form.id_card}
                onChange={(e) => set({ id_card: e.target.value })}
                inputMode="numeric"
                className={inputClass(errors.id_card)}
              />
            </Field>
            <Field label="Dirección" error={errors.address}>
              <input
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                className={inputClass(errors.address)}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                className={inputClass(errors.email)}
              />
            </Field>
            <Field
              label={mode === 'create' ? 'Contraseña' : 'Contraseña (opcional)'}
              error={errors.password}
            >
              <input
                type="password"
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                className={inputClass(errors.password)}
                autoComplete={mode === 'create' ? 'new-password' : 'off'}
              />
            </Field>
            {mode === 'create' && (
              <Field label="Confirmar contraseña" error={errors.password_confirmation}>
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => set({ password_confirmation: e.target.value })}
                  className={inputClass(errors.password_confirmation)}
                  autoComplete="new-password"
                />
              </Field>
            )}

            {canChooseHeadquarter ? (
              <Field label="Sede" error={errors.headquarter_id}>
                <select
                  value={form.headquarter_id ?? ''}
                  onChange={(e) =>
                    set({ headquarter_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className={inputClass(errors.headquarter_id)}
                >
                  <option value="">Seleccionar sede</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Sede">
                <input
                  readOnly
                  value={sedes.find((s) => s.id === form.headquarter_id)?.name ?? 'Tu sede'}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600"
                />
              </Field>
            )}

            <Field label="Rol" error={errors.role_id}>
              <select
                value={form.role_id ?? ''}
                onChange={(e) => set({ role_id: e.target.value ? Number(e.target.value) : null })}
                disabled={!canChangeRole}
                className={`${inputClass(errors.role_id)} disabled:bg-gray-50 disabled:text-gray-500`}
              >
                <option value="">Seleccionar rol</option>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            {mode === 'edit' && (
              <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-3">
                <span className="text-sm font-semibold text-gray-700">Activo</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => set({ isActive: !form.isActive })}
                  className={[
                    'relative h-6 w-11 rounded-full transition-colors',
                    form.isActive ? 'bg-ceibo-green-light' : 'bg-gray-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                      form.isActive ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
              </label>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:rounded-b-2xl">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-ceibo-green-light py-3 text-sm font-bold text-white hover:bg-ceibo-green disabled:opacity-50"
          >
            {saving ? 'Guardando…' : mode === 'create' ? 'Registrar empleado' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputClass(error?: string) {
  return [
    'w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-ceibo-green-light focus:ring-2 focus:ring-ceibo-green-light/20',
    error ? 'border-red-300' : 'border-gray-200',
  ].join(' ');
}
