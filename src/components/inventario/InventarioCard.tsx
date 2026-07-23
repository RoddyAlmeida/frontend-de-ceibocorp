import type { InventarioItem } from '../../types/inventario';
import { getEstadoMeta } from '../../types/inventario';

interface Props {
  item: InventarioItem;
  expanded: boolean;
  recuperacionCount: number;
  onToggle: () => void;
  onEntrada: () => void;
  onSalida: () => void;
  onRecuperacion?: () => void;
  onEditar: () => void;
  onKardex: () => void;
  canManageRecovery: boolean;
}

export default function InventarioCard({
  item,
  expanded,
  recuperacionCount,
  onToggle,
  onEntrada,
  onSalida,
  onRecuperacion,
  onEditar,
  onKardex,
  canManageRecovery,
}: Props) {
  const estado = getEstadoMeta(item.estado);
  const stockPct = item.stockMinimo > 0
    ? Math.min(100, (item.stock / item.stockMinimo) * 100)
    : 100;

  return (
    <article className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition-transform active:scale-[0.98]"
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg ${
            item.enAlerta ? 'bg-red-50' : 'bg-green-50'
          }`}
        >
          {item.enAlerta ? '⚠️' : '🌿'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-gray-900">{item.nombre}</h3>
            <span
              className="rounded-md px-2 py-0.5 text-xs font-bold"
              style={{ color: estado.color, backgroundColor: `${estado.color}18` }}
            >
              {estado.icon} {estado.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{item.categoria}</p>
          {item.sede && <p className="text-xs text-gray-400">{item.sede}</p>}
          {item.enAlerta && (
            <p className="mt-1 text-xs font-semibold text-red-500">
              Stock bajo: {item.stock}/{item.stockMinimo} mín.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`text-lg font-black ${
              item.enAlerta ? 'text-red-500' : 'text-ceibo-green'
            }`}
          >
            {item.stock}
          </span>
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full ${item.enAlerta ? 'bg-red-400' : 'bg-ceibo-green-light'}`}
              style={{ width: `${stockPct}%` }}
            />
          </div>
          {recuperacionCount > 0 && (
            <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs font-bold text-orange-600">
              {recuperacionCount} recup.
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Precio</p>
              <p className="font-bold text-gray-800">${item.precio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stock mínimo</p>
              <p className={`font-bold ${item.enAlerta ? 'text-red-500' : 'text-gray-800'}`}>
                {item.stockMinimo} un.
              </p>
            </div>
            {item.tipo && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Tamaño / tipo</p>
                <p className="font-semibold text-gray-800">{item.tipo}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionBtn label="Entrada" color="bg-blue-600" onClick={onEntrada} />
            <ActionBtn
              label="Salida"
              color="bg-red-500"
              onClick={onSalida}
              disabled={item.stock <= 0}
            />
            {canManageRecovery && onRecuperacion && (
              <ActionBtn label="Recup." color="bg-orange-500" onClick={onRecuperacion} />
            )}
            <ActionBtn label="Kardex" color="bg-ceibo-green" onClick={onKardex} />
            <ActionBtn label="Editar" color="bg-gray-700" onClick={onEditar} />
          </div>
        </div>
      )}
    </article>
  );
}

function ActionBtn({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 min-w-12 rounded-xl px-4 py-3 text-xs font-bold text-white transition-transform active:scale-95 disabled:opacity-40 ${color}`}
    >
      {label}
    </button>
  );
}
