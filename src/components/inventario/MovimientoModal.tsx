import { type FormEvent, useState } from 'react';
import type { InventarioItem } from '../../types/inventario';

interface Props {
  item: InventarioItem;
  type: 'entry' | 'exit';
  onConfirm: (quantity: number, reason: string) => Promise<void>;
  onClose: () => void;
}

export default function MovimientoModal({ item, type, onConfirm, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEntrada = type === 'entry';
  const title = isEntrada ? 'Registrar entrada' : 'Registrar salida';
  const color = isEntrada ? 'bg-blue-600' : 'bg-red-500';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    if (!isEntrada && quantity > item.stock) {
      setError('Cantidad mayor al stock disponible');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(quantity, reason.trim() || (isEntrada ? 'Entrada de stock' : 'Salida de stock'));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:rounded-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 lg:hidden" />
        <h2 className="text-base font-extrabold text-ceibo-green">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{item.nombre}</p>
        <p className="text-sm font-semibold text-gray-700">Stock actual: {item.stock}</p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Cantidad</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold active:scale-95"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="min-h-12 flex-1 rounded-xl border border-gray-200 text-center text-lg font-bold"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold active:scale-95"
            >
              +
            </button>
          </div>
        </label>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Motivo (opcional)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Reposición, venta..."
            className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm"
          />
        </label>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-xl border-2 border-gray-200 p-4 text-sm font-semibold active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`min-h-12 flex-[2] rounded-xl p-4 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-60 ${color}`}
          >
            {saving ? 'Registrando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}
