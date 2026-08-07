import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSale, getHeadquarters, getPlantSizes, getStocksByHeadquarter } from '../services/api';
import { downloadReceiptAsImage } from '../lib/receiptImage';
import type { CreateSalePayload } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Recibo } from '../components/Recibo';

type SaleType = 'retail' | 'wholesale';

interface CartItem {
  plantSizeId: number;
  nombre: string;
  precio: number;
  sellableQuantity: number;
  quantity: number;
}

interface SaleData {
  id?: number | string;
  created_at?: string;
  customer_name?: string;
  customer_id_card?: string;
  total?: number;
  amount?: number;
  sale_details?: { quantity: number; price: number; plant_size?: { plant?: { name?: string }; size_name?: string; name?: string } }[];
  details?: { quantity: number; price: number; plant_size?: { plant?: { name?: string }; size_name?: string; name?: string } }[];
}

// ─── Helpers (traducidos de nueva_venta_view.dart) ──────────────────────────

function sizeName(ps: Record<string, unknown>): string {
  const sd =
    ps.plant_size && typeof ps.plant_size === 'object'
      ? (ps.plant_size as Record<string, unknown>)
      : ps;
  const plant = sd.plant as Record<string, unknown> | undefined;
  const pName = plant?.name?.toString() ?? '';
  const sName = (sd.size_name ?? sd.name)?.toString() ?? '';
  if (pName && sName) return `${pName} (${sName})`;
  return pName || sName || 'Producto';
}

function unitPrice(ps: Record<string, unknown>, tipo: SaleType): number {
  const sd =
    ps.plant_size && typeof ps.plant_size === 'object'
      ? (ps.plant_size as Record<string, unknown>)
      : ps;
  const raw =
    tipo === 'wholesale'
      ? (sd.wholesale_price ?? sd.unit_price)
      : (sd.unit_price ?? sd.wholesale_price);
  if (typeof raw === 'number') return raw;
  return parseFloat(String(raw ?? 0)) || 0;
}

function sellableStock(ps: Record<string, unknown>): number {
  const raw = ps.sellable_quantity;
  if (typeof raw === 'number') return raw;
  return parseInt(String(raw ?? 0), 10) || 0;
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function NuevaVenta() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [saleType, setSaleType] = useState<SaleType>('retail');
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<Record<number, CartItem>>({});
  const [ventaCompletada, setVentaCompletada] = useState<SaleData | null>(null);

  const [cliente, setCliente] = useState('');
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');

  const [selectedHqId, setSelectedHqId] = useState<number | null>(null);
  const [headquarters, setHeadquarters] = useState<{ id: number; name: string }[]>([]);

  const reciboRef = useRef<HTMLDivElement>(null);

  const cargarProductos = useCallback(async (hqId?: number | null) => {
    setLoading(true);
    setError(null);
    setProducts([]);
    try {
      let data: unknown;
      const effectiveHq = hqId ?? user?.headquarter_id;
      if (effectiveHq) {
        const res = await getStocksByHeadquarter(effectiveHq, { per_page: '9999' });
        data = res.data;
      } else {
        const res = await getPlantSizes();
        data = res.data;
      }
      const list = Array.isArray(data) ? data : (data as { data: unknown[] })?.data ?? [];
      setProducts(list as Record<string, unknown>[]);
    } catch (err) {
      console.error('[ventas] Error al cargar productos:', err);
      setError('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  }, [user?.headquarter_id]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Reload products when super_admin changes sede; cart clears so nothing from the previous sede can be sold
  useEffect(() => {
    if (!isSuperAdmin) return;
    setCarrito({});
    cargarProductos(selectedHqId);
  }, [isSuperAdmin, selectedHqId, cargarProductos]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    getHeadquarters()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setHeadquarters(list.map((h: Record<string, unknown>) => ({ id: Number(h.id ?? 0), name: String(h.name ?? '') })));
      })
      .catch(() => setHeadquarters([]));
  }, [isSuperAdmin]);

  const letters = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (sellableStock(p) <= 0) return;
      const n = sizeName(p).trim();
      if (n) set.add(n[0].toUpperCase());
    });
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products
      .filter((p) => sellableStock(p) > 0)
      .sort((a, b) => sizeName(a).localeCompare(sizeName(b)));

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => sizeName(p).toLowerCase().includes(q));
    if (activeLetter) {
      list = list.filter((p) => sizeName(p)[0]?.toUpperCase() === activeLetter);
    }
    return list;
  }, [products, search, activeLetter]);

  const cartItems = Object.values(carrito);
  const total = cartItems.reduce((s, i) => s + i.precio * i.quantity, 0);
  const isWholesale = saleType === 'wholesale';
  const effectiveHqId = selectedHqId ?? user?.headquarter_id ?? null;
  const sedeActiva = headquarters.find((h) => h.id === effectiveHqId)?.name;

  const agregarAlCarrito = (ps: Record<string, unknown>) => {
    const id = (ps.plant_size_id ?? ps.id) as number;
    if (!id || carrito[id]) return;
    const psHq = ps.headquarter_id != null ? Number(ps.headquarter_id) : null;
    const activeHq = selectedHqId ?? user?.headquarter_id ?? null;
    if (activeHq != null && psHq != null && psHq !== activeHq) return;
    setCarrito((prev) => ({
      ...prev,
      [id]: {
        plantSizeId: id,
        nombre: sizeName(ps),
        precio: unitPrice(ps, saleType),
        sellableQuantity: sellableStock(ps),
        quantity: 1,
      },
    }));
  };

  const incrementar = (id: number) => {
    setCarrito((prev) => {
      const item = prev[id];
      if (!item || item.quantity >= item.sellableQuantity) return prev;
      return { ...prev, [id]: { ...item, quantity: item.quantity + 1 } };
    });
  };

  const decrementar = (id: number) => {
    setCarrito((prev) => {
      const item = prev[id];
      if (!item) return prev;
      if (item.quantity <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...item, quantity: item.quantity - 1 } };
    });
  };

  const quitarDelCarrito = (id: number) => {
    setCarrito((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const actualizarPrecio = (id: number, raw: string) => {
    const p = parseFloat(raw);
    if (isNaN(p) || p < 0) return;
    setCarrito((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return { ...prev, [id]: { ...item, precio: p } };
    });
  };

  const descargarRecibo = useCallback(async (venta: SaleData) => {
    const el = reciboRef.current;
    if (!el) return;
    try {
      await downloadReceiptAsImage(el, `recibo-ceibocorp-${venta.id ?? Date.now()}.png`);
    } catch (err) {
      console.error('[ventas] Error al descargar recibo:', err);
    }
  }, []);

  const guardarVenta = async () => {
    setError(null);

    if (cartItems.length === 0) {
      setError('Agrega al menos un producto al carrito');
      return;
    }

    if (isWholesale) {
      if (!nombre.trim()) return setError('El nombre del cliente es obligatorio en ventas por mayor');
      if (!cedula.trim()) return setError('La cédula es obligatoria en ventas por mayor');
      if (!telefono.trim()) return setError('El teléfono es obligatorio en ventas por mayor');
      if (!direccion.trim()) return setError('La dirección es obligatoria en ventas por mayor');
    }

    if (isSuperAdmin && !selectedHqId) {
      return setError('Selecciona una sede para registrar la venta');
    }

    if (cartItems.some((i) => i.precio <= 0)) {
      setError('Todos los precios deben ser mayores a 0');
      return;
    }

    const customerName = isWholesale ? nombre.trim() : cliente.trim() || 'Consumidor Final';
    const customerIdCard = isWholesale ? cedula.trim() : '9999999999';

    const body: CreateSalePayload = {
      headquarter_id: isSuperAdmin ? (selectedHqId ?? undefined) : user?.headquarter_id,
      sale_type: saleType,
      customer_name: customerName,
      customer_id_card: customerIdCard,
      ...(email.trim() && { customer_email: email.trim() }),
      ...(isWholesale && {
        customer_phone: telefono.trim(),
        customer_address: direccion.trim(),
      }),
      description: isWholesale ? `${customerName} - ${customerIdCard}` : customerName,
      details: cartItems.map((i) => ({
        plant_size_id: i.plantSizeId,
        quantity: i.quantity,
        price: i.precio,
      })),
    };

    setSaving(true);
    try {
      const { data } = await createSale(body);
      const venta: SaleData = data;
      setVentaCompletada(venta);
      setCarrito({});
      setCliente('');
      setNombre('');
      setCedula('');
      setTelefono('');
      setDireccion('');
      await cargarProductos();
    } catch (err) {
      const e = err as Error & { errors?: Record<string, string[]> };
      console.error('[ventas] Error al registrar venta:', e);
      const detalle = e.errors
        ? Object.values(e.errors).flat().join('\n')
        : '';
      setError(detalle ? `${e.message}\n${detalle}` : e.message);
    } finally {
      setSaving(false);
    }
  };

  const nuevaVenta = () => {
    setVentaCompletada(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-ceibo-bg">
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
          <p className="text-sm text-gray-500">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (ventaCompletada) {
    return (
      <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-ceibo-bg">
        <header className="bg-gradient-to-br from-ceibo-sale to-blue-700 px-4 py-4 text-white">
          <h1 className="text-lg font-extrabold">Venta Registrada</h1>
          <p className="text-xs text-white/80">El recibo se puede descargar o enviar por correo</p>
        </header>

        <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <Recibo
            venta={ventaCompletada}
            sellerName={user ? `${user.name} ${user.last_name ?? ''}`.trim() : undefined}
            sedeName={headquarters.find((h) => h.id === (selectedHqId ?? user?.headquarter_id))?.name}
            showSede={isSuperAdmin}
            innerRef={reciboRef}
          />

          <button
            type="button"
            onClick={() => descargarRecibo(ventaCompletada)}
            className="w-full rounded-xl bg-ceibo-sale p-4 text-sm font-bold text-white"
          >
            Descargar recibo
          </button>

          <button
            type="button"
            onClick={nuevaVenta}
            className="w-full rounded-xl border-2 border-ceibo-sale p-4 text-sm font-semibold text-ceibo-sale"
          >
            Nueva venta
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-ceibo-bg">
      {/* Header */}
      <header className="shrink-0 bg-gradient-to-br from-ceibo-sale to-blue-700 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <h1 className="text-lg font-extrabold">Registrar Venta</h1>
        {cartItems.length > 0 && (
          <p className="text-xs text-white/80">
            {cartItems.length} producto(s) · ${total.toFixed(2)}
          </p>
        )}
      </header>

      {/* Body */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 pb-28">
        {error && (
          <div className="w-full rounded-xl bg-red-50 p-4 text-sm text-red-600 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Tipo de venta */}
        <section className="w-full">
          <p className="mb-2 text-xs font-bold text-ceibo-green">Tipo de venta</p>
          <div className="flex w-full gap-2">
            {(['retail', 'wholesale'] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setSaleType(tipo)}
                className={`min-h-12 flex-1 rounded-xl p-4 text-sm font-semibold transition-colors ${
                  saleType === tipo
                    ? 'bg-ceibo-sale text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                {tipo === 'retail' ? 'Retail' : 'Por Mayor'}
              </button>
            ))}
          </div>
        </section>

        {/* Cliente */}
        <section className="flex w-full flex-col gap-3">
          {isWholesale ? (
            <>
              <Field label="Nombre *" value={nombre} onChange={setNombre} placeholder="Nombre completo" />
              <Field label="Cédula *" value={cedula} onChange={setCedula} placeholder="Número de cédula" />
              <Field label="Teléfono *" value={telefono} onChange={setTelefono} placeholder="Teléfono" type="tel" />
              <Field label="Dirección *" value={direccion} onChange={setDireccion} placeholder="Dirección completa" />
            </>
          ) : (
            <Field
              label="Cliente (opcional)"
              value={cliente}
              onChange={setCliente}
              placeholder="Consumidor Final por defecto"
            />
          )}
          <Field label="Email (opcional)" value={email} onChange={setEmail} placeholder="cliente@correo.com" type="email" />
        </section>

        {/* Sede — super_admin only */}
        {isSuperAdmin && (
          <section className="w-full">
            <p className="mb-2 text-xs font-bold text-ceibo-green">Sede *</p>
            <select
              value={selectedHqId ?? ''}
              onChange={(e) => setSelectedHqId(e.target.value ? Number(e.target.value) : null)}
              className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
            >
              <option value="">Seleccionar sede…</option>
              {headquarters.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </section>
        )}

        {/* Productos */}
        <section className="w-full min-w-0">
          {isSuperAdmin && !selectedHqId ? (
            <div className="flex w-full flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8">
              <p className="text-3xl text-gray-300">📍</p>
              <p className="mt-2 text-sm font-semibold text-gray-500">Selecciona una sede para ver el inventario disponible</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ceibo-green">Productos</p>
                  {effectiveHqId && (
                    <p className="truncate text-xs text-gray-500">
                      Inventario de: {sedeActiva ?? `Sede #${effectiveHqId}`}
                    </p>
                  )}
                </div>
                {cartItems.length > 0 && (
                  <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-ceibo-sale">
                    {cartItems.length} en carrito
                  </span>
                )}
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveLetter(null);
            }}
            placeholder="Buscar producto..."
            className="mb-2 min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
          />

          {letters.length > 0 && (
            <div className="mb-2 flex w-full gap-1 overflow-x-auto pb-1">
              {letters.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setActiveLetter(activeLetter === l ? null : l);
                    setSearch('');
                  }}
                  className={`flex h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    activeLetter === l ? 'bg-ceibo-sale text-white' : 'bg-blue-50 text-ceibo-sale'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <ul className="max-h-56 overflow-y-auto overflow-x-hidden">
              {loading ? (
                <li className="p-6 text-center text-sm text-gray-400">Cargando productos...</li>
              ) : filtered.length === 0 ? (
                <li className="p-6 text-center text-sm text-gray-400">Sin resultados</li>
              ) : (
                filtered.map((ps) => {
                  const id = (ps.plant_size_id ?? ps.id) as number;
                  const inCart = !!carrito[id];
                  const stock = sellableStock(ps);
                  const price = unitPrice(ps, saleType);

                  return (
                    <li
                      key={id}
                      className="flex min-h-14 w-full items-center gap-2 border-b border-gray-100 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{sizeName(ps)}</p>
                        <p className="text-xs text-gray-500">Stock: {stock}</p>
                      </div>
                      {inCart ? (
                        <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-ceibo-sale">
                          En carrito
                        </span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold text-ceibo-sale">${price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => agregarAlCarrito(ps)}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-ceibo-sale"
                            aria-label="Agregar"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
            </>
          )}
        </section>

        {/* Carrito */}
        <section className="w-full min-w-0">
          <p className="mb-2 text-sm font-bold text-ceibo-green">Carrito</p>

          {cartItems.length === 0 ? (
            <div className="flex w-full flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
              <p className="text-3xl text-gray-300">🛒</p>
              <p className="mt-2 text-sm text-gray-400">Carrito vacío</p>
              <p className="text-xs text-gray-400">Selecciona productos de la lista</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-100">
                {cartItems.map((item) => {
                  const maxReached = item.quantity >= item.sellableQuantity;
                  return (
                    <li key={item.plantSizeId} className="flex w-full flex-col gap-2 p-3">
                      <p className="truncate text-sm font-semibold">{item.nombre}</p>
                      <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <QtyBtn onClick={() => decrementar(item.plantSizeId)} label="−" />
                          <span className="min-w-8 text-center text-sm font-bold text-ceibo-sale">
                            {item.quantity}
                          </span>
                          <QtyBtn
                            onClick={() => incrementar(item.plantSizeId)}
                            disabled={maxReached}
                            label="+"
                          />
                        </div>
                        <input
                          type="number"
                          inputMode="decimal"
                          defaultValue={item.precio.toFixed(2)}
                          onBlur={(e) => actualizarPrecio(item.plantSizeId, e.target.value)}
                          className="h-12 w-full max-w-[6rem] rounded-lg border border-gray-200 px-2 text-center text-sm font-semibold"
                        />
                        <span className="text-sm font-bold text-ceibo-sale">
                          ${(item.precio * item.quantity).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => quitarDelCarrito(item.plantSizeId)}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500"
                          aria-label="Quitar"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex w-full items-center justify-between border-t border-blue-100 bg-blue-50/50 px-4 py-3">
                <span className="text-sm font-extrabold text-ceibo-sale">TOTAL</span>
                <span className="text-xl font-black text-ceibo-sale">${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer fijo */}
      <footer className="fixed bottom-20 left-0 right-0 flex gap-3 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:bottom-0 lg:left-64">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="min-h-12 flex-1 rounded-xl border-2 border-ceibo-sale p-4 text-sm font-semibold text-ceibo-sale"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardarVenta}
          disabled={saving}
          className="min-h-12 flex-[2] rounded-xl bg-ceibo-sale p-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving
            ? 'Guardando...'
            : `Registrar${cartItems.length ? ` · $${total.toFixed(2)}` : ''}`}
        </button>
      </footer>
    </div>
  );
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-xs font-bold text-ceibo-green">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-ceibo-sale"
      />
    </label>
  );
}

function QtyBtn({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-ceibo-sale disabled:opacity-40"
    >
      {label}
    </button>
  );
}
