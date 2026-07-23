import { useState } from 'react';
import type { InventarioItem } from '../../types/inventario';

interface Props {
  item: InventarioItem;
  recuperacionActual: number;
  onMoverEnfermas: (cantidad: number) => Promise<void>;
  onReponerSanas: (cantidad: number) => Promise<void>;
  onClose: () => void;
}

export default function RecuperacionModal({
  item,
  recuperacionActual,
  onMoverEnfermas,
  onReponerSanas,
  onClose,
}: Props) {
  const [cantidad, setCantidad] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnfermas = async () => {
    setSaving(true);
    setError(null);
    try {
      await onMoverEnfermas(cantidad);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleSanas = async () => {
    setSaving(true);
    setError(null);
    try {
      await onReponerSanas(cantidad);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
      <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 lg:hidden" />
        <h2 className="text-base font-extrabold text-orange-600">Recuperación</h2>
        <p className="text-xs text-gray-500">Plantas dañadas o enfermas</p>
        <p className="mt-2 text-sm font-bold text-gray-800">{item.nombre}</p>

        <div className="mt-3 rounded-xl bg-orange-50 p-3 text-sm">
          <span className="font-semibold text-orange-700">En recuperación: </span>
          <span className="text-lg font-black text-orange-600">{recuperacionActual} un.</span>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Cantidad a mover</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCantidad((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold active:scale-95"
            >
              −
            </button>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
              className="min-h-12 flex-1 rounded-xl border border-gray-200 text-center text-lg font-bold"
            />
            <button
              type="button"
              onClick={() => setCantidad((q) => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold active:scale-95"
            >
              +
            </button>
          </div>
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={saving || item.stock === 0}
            onClick={handleEnfermas}
            className="min-h-12 flex-1 rounded-xl bg-orange-500 p-4 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-40"
          >
            ↓ Enfermas
          </button>
          <button
            type="button"
            disabled={saving || recuperacionActual === 0}
            onClick={handleSanas}
            className="min-h-12 flex-1 rounded-xl bg-ceibo-green p-4 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-40"
          >
            ↑ Sanas
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-12 w-full rounded-xl border-2 border-gray-200 p-4 text-sm font-semibold active:scale-95"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
