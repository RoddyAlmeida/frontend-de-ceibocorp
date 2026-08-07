import type { Empleado } from '../../types/empleado';
import { empleadoDisplayName, empleadoInitials } from '../../types/empleado';

function roleBadgeColor(label: string): string {
  const r = label.toLowerCase();
  if (r.includes('super')) return 'bg-purple-100 text-purple-700';
  if (r.includes('admin')) return 'bg-blue-100 text-blue-700';
  if (r.includes('bode')) return 'bg-slate-100 text-slate-700';
  return 'bg-green-100 text-green-700';
}

function avatarGradient(label: string): string {
  const r = label.toLowerCase();
  if (r.includes('super')) return 'from-purple-500 to-purple-700';
  if (r.includes('admin')) return 'from-blue-500 to-blue-700';
  if (r.includes('bode')) return 'from-slate-500 to-slate-700';
  return 'from-green-500 to-green-700';
}

interface EmpleadoCardProps {
  empleado: Empleado;
  canToggle: boolean;
  canEdit?: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onActivate?: () => void;
  showActivate?: boolean;
}

export default function EmpleadoCard({
  empleado,
  canToggle,
  canEdit = true,
  onEdit,
  onToggle,
  onActivate,
  showActivate,
}: EmpleadoCardProps) {
  const name = empleadoDisplayName(empleado);

  return (
    <div
      className={[
        'rounded-2xl border bg-white p-4 shadow-sm',
        empleado.isActive ? 'border-green-100' : 'border-gray-200 opacity-90',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-extrabold text-white ${avatarGradient(empleado.roleLabel)}`}
        >
          {empleadoInitials(empleado)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900">{name}</p>
          <p className="truncate text-xs text-gray-500">{empleado.email}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${roleBadgeColor(empleado.roleLabel)}`}
          >
            {empleado.roleLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2">
          {showActivate && !empleado.isActive ? (
            <span className="text-[10px] font-extrabold tracking-wide text-amber-600">
              PENDIENTE
            </span>
          ) : (
            <span
              className={`text-[10px] font-extrabold tracking-wide ${empleado.isActive ? 'text-ceibo-green-light' : 'text-gray-400'}`}
            >
              {empleado.isActive ? 'ACTIVO' : 'INACTIVO'}
            </span>
          )}
          {canToggle && !showActivate && (
            <button
              type="button"
              role="switch"
              aria-checked={empleado.isActive}
              onClick={onToggle}
              className={[
                'relative h-6 w-11 rounded-full transition-colors',
                empleado.isActive ? 'bg-ceibo-green-light' : 'bg-gray-200',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  empleado.isActive ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showActivate && onActivate && !empleado.isActive && (
            <button
              type="button"
              onClick={onActivate}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
            >
              Activar
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmpleadoTableProps {
  empleados: Empleado[];
  canToggleFor: (emp: Empleado) => boolean;
  canEditFor?: (emp: Empleado) => boolean;
  onEdit: (emp: Empleado) => void;
  onToggle: (emp: Empleado) => void;
  onActivate?: (emp: Empleado) => void;
  showActivate?: boolean;
}

export function EmpleadoTable({
  empleados,
  canToggleFor,
  canEditFor,
  onEdit,
  onToggle,
  onActivate,
  showActivate,
}: EmpleadoTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Empleado</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Sede</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((emp) => (
            <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${avatarGradient(emp.roleLabel)}`}
                  >
                    {empleadoInitials(emp)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{empleadoDisplayName(emp)}</p>
                    <p className="text-xs text-gray-500">{emp.id_card}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{emp.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${roleBadgeColor(emp.roleLabel)}`}
                >
                  {emp.roleLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{emp.headquarterName}</td>
              <td className="px-4 py-3">
                {showActivate && !emp.isActive ? (
                  <span className="text-xs font-bold text-amber-600">Pendiente</span>
                ) : (
                  <span
                    className={`text-xs font-bold ${emp.isActive ? 'text-ceibo-green-light' : 'text-gray-400'}`}
                  >
                    {emp.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {showActivate && onActivate && !emp.isActive && (
                    <button
                      type="button"
                      onClick={() => onActivate(emp)}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                    >
                      Activar
                    </button>
                  )}
                  {canToggleFor(emp) && !showActivate && (
                    <button
                      type="button"
                      onClick={() => onToggle(emp)}
                      className={
                        emp.isActive
                          ? 'rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50'
                          : 'rounded-lg bg-ceibo-green-light px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90'
                      }
                    >
                      {emp.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                  {(canEditFor?.(emp) ?? true) && (
                    <button
                      type="button"
                      onClick={() => onEdit(emp)}
                      className="rounded-lg bg-ceibo-green-light/10 px-3 py-1.5 text-xs font-semibold text-ceibo-green-light hover:bg-ceibo-green-light/20"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
