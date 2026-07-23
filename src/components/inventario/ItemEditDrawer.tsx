import { type FormEvent, useState } from 'react';
import type { InventarioItem } from '../../types/inventario';
import { ITEM_ESTADOS, getEstadoMeta } from '../../types/inventario';
import type { ItemEstadoValue } from '../../types/inventario';
import { useInventarioStore } from '../../store/inventarioStore';

interface Props {
  item: InventarioItem;
  estadoActual: ItemEstadoValue;
  canEditPlants: boolean;
  onClose: () => void;
}

export default function ItemEditDrawer({
  item,
  estadoActual,
  canEditPlants,
  onClose,
}: Props) {
  const guardarEdicion = useInventarioStore((s) => s.guardarEdicion);
  const [nombre, setNombre] = useState(item.nombre);
  const [precio, setPrecio] = useState(item.precio.toFixed(2));
  const [precioMayor, setPrecioMayor] = useState(item.precioMayor?.toFixed(2) ?? '');
  const [stockMinimo, setStockMinimo] = useState(String(item.stockMinimo));
  const [estado, setEstado] = useState<ItemEstadoValue>(estadoActual);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const errores = await guardarEdicion(item, {
        nombre: canEditPlants ? nombre.trim() : item.nombre,
        precio: parseFloat(precio) || item.precio,
        precioMayor: precioMayor ? parseFloat(precioMayor) : undefined,
        stockMinimo: parseInt(stockMinimo, 10) || item.stockMinimo,
        estado,
      });
      if (errores.length === 0) onClose();
    } catch (err) {
      console.error('[inventario] Error al guardar:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[90dvh] lg:w-full lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:shadow-2xl">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
        <div>
          <h2 className="text-base font-extrabold text-ceibo-green">Detalle del producto</h2>
          <p className="text-sm font-semibold text-ceibo-green-light">
            Stock actual: {item.stock} unidades
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 min-w-12 rounded-xl bg-gray-100 px-4 text-sm font-semibold active:scale-95"
        >
          Cerrar
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm">
          <p>
            <span className="text-gray-500">Categoría: </span>
            <span className="font-semibold">{item.categoria}</span>
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Sede: </span>
            <span className="font-semibold">{item.sede || '—'}</span>
          </p>
        </div>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={!canEditPlants}
            className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm disabled:bg-gray-100"
          />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Precio unitario</span>
          <input
            type="number"
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            disabled={!canEditPlants}
            className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm disabled:bg-gray-100"
          />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Precio mayorista</span>
          <input
            type="number"
            inputMode="decimal"
            value={precioMayor}
            onChange={(e) => setPrecioMayor(e.target.value)}
            disabled={!canEditPlants}
            className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm disabled:bg-gray-100"
          />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Stock mínimo (alerta)</span>
          <input
            type="number"
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value)}
            disabled={!canEditPlants}
            className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm disabled:bg-gray-100"
          />
        </label>

        <label className="mb-4 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Estado operativo</span>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as ItemEstadoValue)}
            className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm"
          >
            {ITEM_ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.icon} {e.label}
              </option>
            ))}
          </select>
          <span
            className="mt-1 inline-block w-fit rounded-md px-2 py-1 text-xs font-bold"
            style={{
              color: getEstadoMeta(estado).color,
              backgroundColor: `${getEstadoMeta(estado).color}18`,
            }}
          >
            {getEstadoMeta(estado).label}
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-auto min-h-12 w-full rounded-xl bg-ceibo-green p-4 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
