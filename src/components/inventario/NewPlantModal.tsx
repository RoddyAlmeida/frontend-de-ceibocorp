import { type FormEvent, useState } from 'react';
import type { CategoriaOption } from '../../types/inventario';
import { createPlant, createPlantSize, createStock } from '../../services/api';

interface SedeOption {
  id: string;
  name: string;
}

interface Props {
  isSuperAdmin: boolean;
  defaultHeadquarterId?: number;
  sedes: SedeOption[];
  categorias: CategoriaOption[];
  onClose: () => void;
  onCreated: () => void;
}

export default function NewPlantModal({
  isSuperAdmin,
  defaultHeadquarterId,
  sedes,
  categorias,
  onClose,
  onCreated,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [sedeId, setSedeId] = useState(
    isSuperAdmin
      ? String(defaultHeadquarterId ?? sedes[0]?.id ?? '')
      : String(defaultHeadquarterId ?? ''),
  );
  const [tamano, setTamano] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioMayor, setPrecioMayor] = useState('');
  const [stockInicial, setStockInicial] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiereTamano = Boolean(stockInicial && Number(stockInicial) > 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = nombre.trim();
    if (!name) return setError('El nombre es obligatorio');
    if (!categoriaId) return setError('Selecciona una categoría');

    const effectiveSedeId = isSuperAdmin ? sedeId : String(defaultHeadquarterId ?? '');
    if (!effectiveSedeId) return setError('Selecciona la sede del producto');

    const unitPrice = tamano.trim() ? Number(precio) : NaN;
    if (tamano.trim() && (!precio.trim() || !(unitPrice > 0))) {
      return setError('Si ingresas un tamaño, el precio unitario es obligatorio y mayor a 0');
    }

    const initialStock = stockInicial.trim() ? Number(stockInicial) : 0;
    if (!Number.isInteger(initialStock) || initialStock < 0) {
      return setError('El stock inicial debe ser un número entero mayor o igual a 0');
    }
    if (requiereTamano && !tamano.trim()) {
      return setError('Ingresa un tamaño para poder registrar el stock inicial');
    }

    setSaving(true);
    try {
      const plantRes = await createPlant({
        name,
        description: descripcion.trim() || undefined,
        category_id: Number(categoriaId),
        headquarter_id: Number(effectiveSedeId),
      });
      const plant = (plantRes as { data?: { id?: number } }).data ?? plantRes;
      const plantId = Number((plant as { id?: number }).id);

      if (tamano.trim() && plantId) {
        const sizeRes = await createPlantSize(plantId, {
          plant_id: plantId,
          size_name: tamano.trim(),
          unit_price: unitPrice,
          wholesale_price: precioMayor.trim() ? Number(precioMayor) : null,
        });
        const size = (sizeRes as { data?: { id?: number } }).data ?? sizeRes;
        const plantSizeId = Number((size as { id?: number }).id);

        if (initialStock > 0 && plantSizeId) {
          await createStock({
            plant_size_id: plantSizeId,
            headquarter_id: Number(effectiveSedeId),
            quantity: initialStock,
            status: 'available',
          });
        }
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error('[inventario] Error al crear producto:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-br from-ceibo-green to-ceibo-green-light p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <span className="text-lg">🌱</span>
          </div>
          <h2 className="flex-1 text-base font-extrabold text-white">Agregar producto</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <label className="mb-3 flex flex-col gap-1">
            <span className="text-xs font-bold text-green-900">Nombre *</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Guayaba"
              className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
            />
          </label>

          <label className="mb-3 flex flex-col gap-1">
            <span className="text-xs font-bold text-green-900">Categoría *</span>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {isSuperAdmin && (
            <label className="mb-3 flex flex-col gap-1">
              <span className="text-xs font-bold text-green-900">Sede *</span>
              <select
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
              >
                <option value="">Seleccionar sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="mb-3 flex flex-col gap-1">
            <span className="text-xs font-bold text-green-900">Descripción</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
            />
          </label>

          <div className="mb-3 rounded-xl bg-green-50 p-3">
            <p className="mb-2 text-[11px] font-bold text-green-800">
              Tamaño y precios (opcional)
            </p>
            <label className="mb-2 flex flex-col gap-1">
              <span className="text-xs font-bold text-green-900">Tamaño</span>
              <input
                value={tamano}
                onChange={(e) => setTamano(e.target.value)}
                placeholder="Ej. Mediano 60cm"
                className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-green-900">Precio unitario</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-green-900">Precio mayorista</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={precioMayor}
                  onChange={(e) => setPrecioMayor(e.target.value)}
                  placeholder="0.00"
                  className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
                />
              </label>
            </div>
          </div>

          <label className="mb-4 flex flex-col gap-1">
            <span className="text-xs font-bold text-green-900">Stock inicial</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={stockInicial}
              onChange={(e) => setStockInicial(e.target.value)}
              placeholder="0"
              className="min-h-11 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
            />
            <span className="text-[11px] text-gray-500">
              Requiere tamaño y precio para registrar stock inicial.
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border-2 border-green-300 py-3 text-xs font-semibold text-green-700 hover:bg-green-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] rounded-xl bg-ceibo-green py-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
