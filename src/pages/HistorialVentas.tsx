import { useCallback, useEffect, useState } from 'react';
import { VentaCardList, VentaTable } from '../components/ventas/VentaCard';
import VentaDetalleDrawer from '../components/ventas/VentaDetalleDrawer';
import VentaStatsBar from '../components/ventas/VentaStatsBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { exportVentasToXlsx } from '../lib/exportVentasXlsx';
import { RolePolicy } from '../lib/rolePolicy';
import { getHeadquarters, getSalesByHeadquarterPaged, getSalesPaged } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Venta } from '../types/venta';
import { parseVenta } from '../types/venta';

const PER_PAGE = 25;

interface PaginatedMeta {
  currentPage: number;
  lastPage: number;
  total: number;
}

function extractPage(data: unknown): { items: Record<string, unknown>[]; meta: PaginatedMeta } {
  if (Array.isArray(data)) {
    return {
      items: data as Record<string, unknown>[],
      meta: { currentPage: 1, lastPage: 1, total: data.length },
    };
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const items = (obj.data as unknown[]) ?? [];
    const current = (obj.current_page as number) ?? 1;
    const last = (obj.last_page as number) ?? 1;
    const total = (obj.total as number) ?? items.length;
    return {
      items: items as Record<string, unknown>[],
      meta: { currentPage: current, lastPage: last, total },
    };
  }
  return { items: [], meta: { currentPage: 1, lastPage: 1, total: 0 } };
}

export default function HistorialVentas() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginatedMeta>({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailVenta, setDetailVenta] = useState<Venta | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [selectedHqId, setSelectedHqId] = useState<number | null>(null);
  const [headquarters, setHeadquarters] = useState<{ id: number; name: string }[]>([]);

  const scopeToHq = RolePolicy.shouldScopeSalesToHeadquarter(role);
  const isSuperAdmin = RolePolicy.canManageThresholds(role);
  const hqId = user?.headquarter_id;

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    getHeadquarters()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setHeadquarters(list.map((h: Record<string, unknown>) => ({ id: Number(h.id ?? 0), name: String(h.name ?? '') })));
      })
      .catch(() => setHeadquarters([]));
  }, [isSuperAdmin]);

  const fetchParams = useCallback(
    () => ({
      search: debouncedSearch.trim() || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [debouncedSearch, fromDate, toDate],
  );

  const loadVentas = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const params = { page: pageNum, perPage: PER_PAGE, ...fetchParams() };

        let response;
        if (scopeToHq && hqId) {
          response = await getSalesByHeadquarterPaged(hqId, params);
        } else if (isSuperAdmin && selectedHqId) {
          response = await getSalesByHeadquarterPaged(selectedHqId, params);
        } else {
          response = await getSalesPaged(params);
        }

        const { items, meta: m } = extractPage(response.data);
        setVentas(items.map(parseVenta));
        setMeta(m);
        setPage(m.currentPage);
      } catch (err) {
        console.error('[historial-ventas] Error al cargar ventas:', err);
        showToast(err instanceof Error ? err.message : 'Error al cargar ventas', 'err');
        setVentas([]);
        setMeta({ currentPage: 1, lastPage: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    },
    [scopeToHq, hqId, isSuperAdmin, selectedHqId, fetchParams, showToast],
  );

  useEffect(() => {
    if (!role || !RolePolicy.canAccessHistorialVentas(role)) return;
    loadVentas(1);
  }, [role, debouncedSearch, fromDate, toDate, selectedHqId, loadVentas]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const allVentas: Venta[] = [];
      let pageNum = 1;
      let lastPage = 1;

      do {
        const params = { page: pageNum, perPage: 100, ...fetchParams() };
        let response;
        if (scopeToHq && hqId) {
          response = await getSalesByHeadquarterPaged(hqId, params);
        } else if (isSuperAdmin && selectedHqId) {
          response = await getSalesByHeadquarterPaged(selectedHqId, params);
        } else {
          response = await getSalesPaged(params);
        }
        const { items, meta: m } = extractPage(response.data);
        allVentas.push(...items.map(parseVenta));
        lastPage = m.lastPage;
        pageNum++;
      } while (pageNum <= lastPage);

      if (!allVentas.length) {
        showToast('No hay ventas para exportar', 'err');
        return;
      }
      exportVentasToXlsx(allVentas);
      showToast(`Excel descargado (${allVentas.length} registros)`);
    } catch (err) {
      console.error('[historial-ventas] Error al exportar:', err);
      showToast('No se pudo exportar el archivo', 'err');
    } finally {
      setExporting(false);
    }
  };

  if (!role || !RolePolicy.canAccessHistorialVentas(role)) {
    return null;
  }

  return (
    <div className="min-h-full bg-ceibo-bg">
      <div className="bg-gradient-to-br from-ceibo-green to-ceibo-green-light px-4 py-4 text-white lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold lg:text-xl">Historial de Ventas</h1>
            <p className="text-xs text-white/80">{meta.total} registros</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadVentas(page)}
              className="rounded-lg bg-white/20 px-3 py-3 text-xs font-semibold hover:bg-white/30"
            >
              ↻
            </button>
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setShowActions((s) => !s)}
                className="rounded-lg bg-white/20 px-3 py-3 text-xs font-semibold"
              >
                ⋮
              </button>
              {showActions && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      handleExport();
                      setShowActions(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Exportar Excel
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="hidden rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/30 lg:block"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar folio, cliente o total…"
            className="w-full rounded-xl border-0 px-3 py-2.5 text-sm text-gray-900 outline-none"
          />
          {isSuperAdmin && (
            <select
              value={selectedHqId ?? ''}
              onChange={(e) => setSelectedHqId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border-0 px-3 py-2.5 text-sm text-gray-900"
            >
              <option value="">Todas las sedes</option>
              {headquarters.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold text-white/80">Desde</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border-0 px-2 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold text-white/80">Hasta</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border-0 px-2 py-2 text-sm text-gray-900"
              />
            </label>
          </div>
        </div>
      </div>

      {!loading && ventas.length > 0 && <VentaStatsBar ventas={ventas} />}

      <div className="px-4 pb-20 pt-4 lg:px-8 lg:pb-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
          </div>
        ) : ventas.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="text-4xl">🧾</p>
            <p className="mt-2 font-semibold">Sin ventas registradas</p>
          </div>
        ) : (
          <>
            <VentaCardList
              ventas={ventas}
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              onOpenDetail={setDetailVenta}
            />
            <VentaTable ventas={ventas} onRowClick={setDetailVenta} />
          </>
        )}

        {meta.lastPage > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadVentas(page - 1)}
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {page} de {meta.lastPage}
            </span>
            <button
              type="button"
              disabled={page >= meta.lastPage || loading}
              onClick={() => loadVentas(page + 1)}
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={[
            'fixed bottom-24 left-4 right-4 z-50 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm',
            toast.type === 'ok' ? 'bg-ceibo-green' : 'bg-red-600',
          ].join(' ')}
        >
          {toast.msg}
        </div>
      )}

      <VentaDetalleDrawer
        venta={detailVenta}
        role={role}
        onClose={() => setDetailVenta(null)}
        onAnulada={() => loadVentas(page)}
        onToast={showToast}
      />
    </div>
  );
}
