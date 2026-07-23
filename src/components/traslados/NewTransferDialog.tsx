import { useEffect, useMemo, useState } from 'react';
import type { CreateTransferPayload } from '../../services/api';
import { getHeadquarters, getPlantSizes } from '../../services/api';

interface Sede { id: number; name: string }
interface PlantSize { id: number; name: string; size_name?: string; plant?: { name?: string } }

interface Props {
  currentHqId?: number;
  onCrear: (payload: CreateTransferPayload) => Promise<void>;
  onClose: () => void;
}

function sizeDisplayName(ps: PlantSize): string {
  const plantName = ps.plant?.name ?? '';
  const sizeName = ps.size_name ?? ps.name ?? '';
  return plantName ? `${plantName} (${sizeName})` : sizeName || 'Sin nombre';
}

export default function NewTransferDialog({
  currentHqId,
  onCrear,
  onClose,
}: Props) {
  const [fromHqId, setFromHqId] = useState<number | null>(currentHqId ?? null);
  const [toHqId, setToHqId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [allSizes, setAllSizes] = useState<PlantSize[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([getHeadquarters(), getPlantSizes()])
      .then(([hqRes, psRes]) => {
        if (cancelled) return;
        const hqList = Array.isArray(hqRes.data) ? hqRes.data : (hqRes.data?.data ?? []);
        setSedes(
          hqList
            .map((h: Record<string, unknown>) => ({
              id: Number(h.id ?? 0),
              name: String(h.name ?? ''),
            }))
            .filter((s: Sede) => s.id && s.name),
        );
        const psList = Array.isArray(psRes.data) ? psRes.data : (psRes.data?.data ?? []);
        setAllSizes(psList as PlantSize[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [selectedProducts, setSelectedProducts] = useState<
    { id: number; qty: number; name: string }[]
  >([]);

  const filteredSizes = useMemo(() => {
    const q = search.toLowerCase();
    const sorted = [...allSizes].sort((a, b) =>
      sizeDisplayName(a).localeCompare(sizeDisplayName(b)),
    );
    if (!q) return sorted;
    return sorted.filter((s) => sizeDisplayName(s).toLowerCase().includes(q));
  }, [allSizes, search]);

  const toggleProduct = (ps: PlantSize) => {
    const id = ps.id;
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (exists) return prev.filter((p) => p.id !== id);
      return [...prev, { id, qty: 1, name: sizeDisplayName(ps) }];
    });
  };

  const updateQty = (psId: number, qty: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === psId ? { ...p, qty } : p)),
    );
  };

  const removeProduct = (psId: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== psId));
  };

  const canSubmit =
    fromHqId != null &&
    toHqId != null &&
    fromHqId !== toHqId &&
    selectedProducts.length > 0 &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit || fromHqId == null || toHqId == null) return;
    setSaving(true);
    try {
      await onCrear({
        from_headquarter_id: fromHqId,
        to_headquarter_id: toHqId,
        status: 'pending',
        description: description.trim() || 'Traslado desde panel',
        details: selectedProducts.map((p) => ({
          plant_size_id: p.id,
          quantity: p.qty,
          description: '',
        })),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const excludedDestinations = fromHqId != null ? [fromHqId] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-br from-green-800 to-green-600 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <span className="text-lg">🔄</span>
          </div>
          <h2 className="flex-1 text-base font-extrabold text-white">
            Nuevo Traslado
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Sede Origen */}
          <FieldLabel text="Sede Origen *" />
          <select
            value={fromHqId ?? ''}
            onChange={(e) => setFromHqId(e.target.value ? Number(e.target.value) : null)}
            className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-green-400 focus:outline-none"
          >
            <option value="">Seleccionar origen</option>
            {sedes
              .filter((s) => !excludedDestinations.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {/* Sede Destino */}
          <FieldLabel text="Sede Destino *" />
          <select
            value={toHqId ?? ''}
            onChange={(e) => setToHqId(e.target.value ? Number(e.target.value) : null)}
            className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-green-400 focus:outline-none"
          >
            <option value="">Seleccionar destino</option>
            {sedes
              .filter((s) => !excludedDestinations.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {/* Descripción */}
          <FieldLabel text="Descripción (opcional)" />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Motivo del traslado"
            className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-green-400 focus:outline-none"
          />

          {/* Product header */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-green-900">
              Productos a trasladar *
            </p>
            {selectedProducts.length > 0 && (
              <span className="rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                {selectedProducts.length} seleccionados
              </span>
            )}
          </div>

          {/* Product search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre (A-Z)"
            className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-green-400 focus:outline-none"
          />

          {/* Product list */}
          <div className="mb-3 max-h-56 overflow-y-auto rounded-xl border border-gray-200">
            {filteredSizes.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">
                Sin resultados
              </p>
            ) : (
              filteredSizes.map((ps) => {
                const selected = selectedProducts.find((p) => p.id === ps.id);
                return (
                  <label
                    key={ps.id}
                    className={`flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-0 ${
                      selected ? 'bg-green-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleProduct(ps)}
                      className="h-4 w-4 rounded accent-green-600"
                    />
                    <span
                      className={`flex-1 text-xs ${
                        selected
                          ? 'font-bold text-green-800'
                          : 'text-gray-700'
                      }`}
                    >
                      {sizeDisplayName(ps)}
                    </span>
                    {selected && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (selected.qty > 1) updateQty(ps.id, selected.qty - 1);
                            else removeProduct(ps.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={selected.qty}
                          min={1}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (n > 0) updateQty(ps.id, n);
                          }}
                          className="h-6 w-10 rounded border-0 bg-transparent text-center text-xs font-bold text-green-700"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            updateQty(ps.id, selected.qty + 1);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Summary */}
          {selectedProducts.length > 0 && (
            <div className="rounded-xl bg-green-50 p-3">
              <p className="mb-1.5 text-[11px] font-bold text-green-800">
                Resumen del traslado
              </p>
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 py-0.5">
                  <span className="text-[11px] text-green-600">🌿</span>
                  <span className="flex-1 text-[11px] text-gray-700">
                    {p.name}
                  </span>
                  <span className="text-[11px] font-bold text-green-700">
                    {p.qty} un.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border-2 border-green-300 py-3 text-xs font-semibold text-green-700 hover:bg-green-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-[2] rounded-xl bg-green-700 py-3 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Enviando...' : 'Crear Traslado'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <p className="mb-1 text-xs font-bold text-green-900">{text}</p>
  );
}
