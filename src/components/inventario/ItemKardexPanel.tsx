import { useEffect, useState } from 'react';
import type { InventarioItem, StockMovement } from '../../types/inventario';
import { useInventarioStore } from '../../store/inventarioStore';

interface Props {
  item: InventarioItem;
  onClose: () => void;
}

function movementColor(type?: string) {
  switch (type) {
    case 'entry':
      return 'text-green-700 bg-green-50';
    case 'exit':
      return 'text-red-600 bg-red-50';
    case 'in_stock':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function movementLabel(type?: string) {
  switch (type) {
    case 'entry':
      return 'ENTRADA';
    case 'exit':
      return 'SALIDA';
    case 'in_stock':
      return 'AJUSTE';
    default:
      return 'MOVIMIENTO';
  }
}

function formatFecha(raw?: string) {
  if (!raw) return '—';
  try {
    const dt = new Date(raw);
    return dt.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export default function ItemKardexPanel({ item, onClose }: Props) {
  const fetchKardex = useInventarioStore((s) => s.fetchKardexByStock);
  const [movs, setMovs] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchKardex(item.id);
        const sorted = [...data].sort((a, b) => {
          const da = new Date(a.created_at ?? 0).getTime();
          const db = new Date(b.created_at ?? 0).getTime();
          return db - da;
        });
        setMovs(sorted);
      } catch (err) {
        console.error('[kardex] Error:', err);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el kardex');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [item.id, fetchKardex]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:h-[80dvh] lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:shadow-2xl">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
        <div>
          <h2 className="text-base font-extrabold text-ceibo-green">Kardex</h2>
          <p className="truncate text-sm text-gray-500">{item.nombre}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 min-w-12 rounded-xl bg-gray-100 px-4 text-sm font-semibold active:scale-95"
        >
          Cerrar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && movs.length === 0 && (
          <p className="text-center text-sm text-gray-400">Sin movimientos registrados</p>
        )}

        <ul className="flex w-full flex-col gap-3">
          {movs.map((m, i) => {
            const type = m.type?.toString();
            const qty = m.quantity ?? 0;
            const sign =
              type === 'entry' ? `+${qty}` : type === 'exit' ? `-${qty}` : `${qty}`;
            const sede = m.stock?.headquarter?.name ?? '—';
            const usuario = m.user?.name ?? '—';

            return (
              <li
                key={m.id ?? i}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${movementColor(type)}`}
                    >
                      {movementLabel(type)}
                    </span>
                    <p className="mt-2 text-xs text-gray-500">{formatFecha(m.created_at)}</p>
                    <p className="text-xs text-gray-500">Sede: {sede}</p>
                    <p className="text-xs text-gray-500">Usuario: {usuario}</p>
                    {(m.reason || m.description) && (
                      <p className="mt-1 text-xs text-gray-600">
                        {m.reason ?? m.description}
                      </p>
                    )}
                    {m.quantity_before != null && m.quantity_after != null && (
                      <p className="mt-2 text-sm font-semibold text-ceibo-green">
                        Stock: {m.quantity_before} → {m.quantity_after}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400">CANTIDAD</p>
                    <p className="text-xl font-black text-ceibo-green">{sign}</p>
                    <p className="text-xs text-gray-500">unidades</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
