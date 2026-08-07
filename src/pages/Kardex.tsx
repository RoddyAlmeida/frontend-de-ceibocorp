import { useEffect, useState, useCallback } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAuthStore } from '../store/authStore';
import {
  getStockMovements,
  createStockMovement,
  getStocks,
  type StockMovement,
} from '../services/api';

type FilterType = 'all' | 'entry' | 'exit';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  entry: { label: 'Entrada', color: '#1B5E20', bg: '#E8F5E9' },
  exit: { label: 'Salida', color: '#B71C1C', bg: '#FFEBEE' },
  in_stock: { label: 'Ajuste', color: '#00695C', bg: '#E0F2F1' },
};

function formatInputDate(v: string) {
  const [y, m, d] = v.split('-');
  return y && m && d ? `${d}/${m}/${y}` : v;
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex flex-1 items-center min-h-12 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-teal-500/40">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <span className={`pointer-events-none px-3 text-[11px] ${value ? 'text-gray-900' : 'text-gray-400'}`}>
        {value ? formatInputDate(value) : 'dd/mm/aaaa'}
      </span>
    </div>
  );
}

export default function Kardex() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'entry' as 'entry' | 'exit', stock_id: '', quantity: '1', reason: '' });
  const [saving, setSaving] = useState(false);

  // Stock list for autocomplete
  const [stocks, setStocks] = useState<{ id: number; name: string; quantity: number }[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const debouncedStockSearch = useDebouncedValue(stockSearch, 300);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.type = filter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (!isSuperAdmin && user?.headquarter_id) {
        params.headquarter_id = String(user.headquarter_id);
      }
      const res = await getStockMovements(params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setMovements(list);
    } catch (err) {
      console.error('[kardex] Error al cargar movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, dateFrom, dateTo, isSuperAdmin, user?.headquarter_id]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // Load stocks for autocomplete
  useEffect(() => {
    if (!showForm) return;
    const q = debouncedStockSearch || undefined;
    getStocks(q ? { search: q } : {}).then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setStocks(list.map((s: Record<string, unknown>) => {
        const ps = s.plant_size as Record<string, unknown> | undefined;
        const plant = ps?.plant as Record<string, unknown> | undefined;
        const name = String(plant?.name ?? ps?.name ?? 'Producto');
        const id = Number(s.id ?? 0);
        const qty = Number(s.quantity ?? 0);
        return { id, name, quantity: qty };
      }));
    }).catch(() => setStocks([]));
  }, [showForm, debouncedStockSearch]);

  const filteredMovements = movements.filter((m) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const stock = m.stock as Record<string, unknown> | undefined;
    const ps = stock?.plant_size as Record<string, unknown> | undefined;
    const plant = ps?.plant as Record<string, unknown> | undefined;
    const name = String(plant?.name ?? ps?.name ?? '');
    return name.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!form.stock_id || Number(form.quantity) <= 0) return;
    setSaving(true);
    try {
      await createStockMovement({
        stock_id: Number(form.stock_id),
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason || null,
      });
      setShowForm(false);
      setForm({ type: 'entry', stock_id: '', quantity: '1', reason: '' });
      setStockSearch('');
      loadMovements();
    } catch (err) {
      console.error('[kardex] Error al crear movimiento:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-700 to-teal-600 px-4 pb-4 pt-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h1 className="text-lg font-extrabold text-white">Kardex</h1>
        </div>
        <p className="text-xs text-white/70">Movimientos de inventario</p>
      </div>

      {/* Filters */}
      <div className="mx-4 mt-3 space-y-2">
        {/* Type chips */}
        <div className="flex gap-2">
          {[
            { value: 'all' as const, label: 'Todos' },
            { value: 'entry' as const, label: 'Entradas' },
            { value: 'exit' as const, label: 'Salidas' },
          ].map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)} className={`rounded-full min-h-12 px-3 py-1.5 text-[11px] font-bold transition-colors ${filter === f.value ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {/* Date range */}
        <div className="flex gap-2">
          <DateField value={dateFrom} onChange={setDateFrom} />
          <DateField value={dateTo} onChange={setDateTo} />
        </div>
        {/* Search */}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por producto..." className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
      </div>

      {/* Movements list */}
      <div className="flex-1 px-4 pt-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          </div>
        ) : filteredMovements.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-400">Sin movimientos</p>
        ) : (
          <div className="space-y-2">
            {filteredMovements.map((m) => {
              const stock = m.stock as Record<string, unknown> | undefined;
              const ps = stock?.plant_size as Record<string, unknown> | undefined;
              const plant = ps?.plant as Record<string, unknown> | undefined;
              const name = String(plant?.name ?? ps?.name ?? 'Producto');
              const tc = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.entry;
              const date = m.created_at ? new Date(m.created_at as string) : null;
              const dateStr = date ? date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
              const timeStr = date ? date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
              const qtyBefore = m.quantity_before ?? null;
              const qtyAfter = m.quantity_after ?? null;
              return (
                <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">{name}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: tc.color, backgroundColor: tc.bg }}>{tc.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-extrabold ${m.type === 'exit' ? 'text-red-600' : m.type === 'entry' ? 'text-green-600' : 'text-teal-600'}`}>
                      {m.type === 'exit' ? '-' : '+'}{Number(m.quantity ?? 0)}
                    </span>
                    {qtyBefore != null && qtyAfter != null && (
                      <span className="text-[11px] text-gray-400">{qtyBefore} → {qtyAfter}</span>
                    )}
                  </div>
                  {m.reason && <p className="mt-1 text-[11px] text-gray-400">Motivo: {String(m.reason)}</p>}
                  <p className="text-[11px] text-gray-300">{dateStr} {timeStr}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button type="button" onClick={() => setShowForm(true)} className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-lg hover:bg-teal-700 lg:bottom-6 lg:hidden">
        +
      </button>
      <button type="button" onClick={() => setShowForm(true)} className="hidden lg:flex lg:fixed lg:bottom-6 lg:right-6 lg:z-40 lg:h-14 lg:w-14 lg:items-center lg:justify-center lg:rounded-full lg:bg-teal-600 lg:text-2xl lg:text-white lg:shadow-lg lg:hover:bg-teal-700">
        +
      </button>

      {/* Create form dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="mb-3 text-sm font-extrabold text-teal-800">Registrar Movimiento</h3>

            {/* Type */}
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Tipo</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'entry' | 'exit' }))} className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none">
              <option value="entry">Entrada</option>
              <option value="exit">Salida</option>
            </select>

            {/* Product search */}
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Producto</label>
            <div className="relative mb-2">
              <input type="text" value={stockSearch} onChange={(e) => { setStockSearch(e.target.value); setShowStockDropdown(true); }} onFocus={() => setShowStockDropdown(true)} placeholder="Buscar producto..." className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none" />
              {showStockDropdown && stocks.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {stocks.map((s) => (
                    <button key={s.id} type="button" onClick={() => { setForm((f) => ({ ...f, stock_id: String(s.id) })); setStockSearch(s.name); setShowStockDropdown(false); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50">
                      <span className="font-semibold text-gray-700">{s.name}</span>
                      <span className="text-gray-400">{s.quantity} uds</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Cantidad</label>
            <input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none" />

            {/* Reason */}
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Motivo (opcional)</label>
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} className="mb-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none" />

        <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCreate} disabled={!form.stock_id || Number(form.quantity) <= 0 || saving} className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
