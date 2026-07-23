import { ITEM_ESTADOS } from '../../types/inventario';
import type { CategoriaOption, InventarioFilters } from '../../types/inventario';

interface SedeOption {
  id: string;
  name: string;
}

interface Props {
  filters: InventarioFilters;
  sedes: SedeOption[];
  categorias: CategoriaOption[];
  isSuperAdmin: boolean;
  lockedSede?: string | null;
  onApply: (partial: Partial<InventarioFilters>) => void;
  onClear: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

export default function InventarioFiltersPanel({
  filters,
  sedes,
  categorias,
  isSuperAdmin,
  lockedSede,
  onApply,
  onClear,
  mobile,
  onClose,
}: Props) {
  const content = (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ceibo-green">Filtros</h2>
        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 min-w-12 rounded-lg px-3 text-sm font-semibold text-gray-500 active:scale-95"
          >
            Cerrar
          </button>
        )}
      </div>

      {/* Sede */}
      <label className="flex w-full flex-col gap-1">
        <span className="text-xs font-bold text-gray-600">Sede</span>
        {isSuperAdmin ? (
          <select
            value={filters.headquarterId ?? ''}
            onChange={(e) => {
              const sede = sedes.find((s) => s.id === e.target.value);
              onApply({
                headquarterId: e.target.value || null,
                sede: sede?.name ?? null,
              });
            }}
            className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="min-h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {lockedSede ?? filters.sede ?? 'Mi sede'}
          </div>
        )}
      </label>

      {/* Estado */}
      <label className="flex w-full flex-col gap-1">
        <span className="text-xs font-bold text-gray-600">Estado</span>
        <select
          value={filters.estado ?? ''}
          onChange={(e) => onApply({ estado: e.target.value || null })}
          className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm"
        >
          <option value="">Todos</option>
          {ITEM_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </label>

      {/* Categoría — filtrado en servidor vía category_id */}
      {categorias.length > 0 && (
        <label className="flex w-full flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Categoría</span>
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => onApply({ categoryId: e.target.value || null })}
            className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <ToggleChip
          label="Solo alertas de stock"
          active={filters.soloAlertas}
          onClick={() => onApply({ soloAlertas: !filters.soloAlertas })}
          color="border-red-300 bg-red-50 text-red-600"
        />
        <ToggleChip
          label="En recuperación"
          active={filters.soloRecuperacion}
          onClick={() => onApply({ soloRecuperacion: !filters.soloRecuperacion })}
          color="border-orange-300 bg-orange-50 text-orange-600"
        />
      </div>

      <button
        type="button"
        onClick={onClear}
        className="min-h-12 w-full rounded-xl border-2 border-ceibo-green p-4 text-sm font-semibold text-ceibo-green transition-transform active:scale-95"
      >
        Limpiar filtros
      </button>
    </div>
  );

  if (mobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
          {content}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-full rounded-xl border border-gray-200 bg-white p-4 lg:w-64 lg:shrink-0">
      {content}
    </aside>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 w-full rounded-xl border-2 p-4 text-left text-sm font-semibold transition-transform active:scale-95 ${
        active ? color : 'border-gray-200 bg-white text-gray-600'
      }`}
    >
      {label}
    </button>
  );
}
