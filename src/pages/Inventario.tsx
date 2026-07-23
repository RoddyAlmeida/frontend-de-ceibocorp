import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useInventarioStore } from '../store/inventarioStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import InventarioCard from '../components/inventario/InventarioCard';
import InventarioFiltersPanel from '../components/inventario/InventarioFilters';
import ItemEditDrawer from '../components/inventario/ItemEditDrawer';
import ItemKardexPanel from '../components/inventario/ItemKardexPanel';
import MovimientoModal from '../components/inventario/MovimientoModal';
import RecuperacionModal from '../components/inventario/RecuperacionModal';
import type { InventarioItem } from '../types/inventario';
import { getEstadoMeta } from '../types/inventario';

type ModalState =
  | { type: 'movimiento'; item: InventarioItem; movType: 'entry' | 'exit' }
  | { type: 'recuperacion'; item: InventarioItem }
  | { type: 'editar'; item: InventarioItem }
  | { type: 'kardex'; item: InventarioItem }
  | null;

export default function Inventario() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const canEditPlants = useAuthStore((s) => s.canEditPlants);
  const canManageRecovery = isAdmin || isSuperAdmin;

  const {
    items,
    sedes,
    categorias,
    filters,
    totalItems,
    paginaActual,
    totalPaginas,
    loading,
    loadingMore,
    fetchingPage,
    error,
    toast,
    selectedItemId,
    estadosLocales,
    recuperacionLocales,
    initialized,
    init,
    setSearch,
    applyFilters,
    clearFilters,
    fetchPage,
    loadMore,
    refresh,
    selectItem,
    registrarMovimiento,
    moverARecuperacion,
    repuestoDesdeRecuperacion,
    clearToast,
  } = useInventarioStore();

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastSearchRef = useRef('');

  useEffect(() => {
    if (!initialized && user) {
      init({
        isSuperAdmin,
        headquarterId: user.headquarter_id,
      }).catch((err) => {
        console.error('[inventario] Error en init desde página:', err);
      });
    }
  }, [initialized, user, isSuperAdmin, init]);

  useEffect(() => {
    if (!initialized) return;
    const norm = debouncedSearch.trim().toLowerCase();
    if (norm === lastSearchRef.current) return;
    lastSearchRef.current = norm;
    setSearch(debouncedSearch);
    fetchPage(1).catch((err) => {
      console.error('[inventario] Error en búsqueda:', err);
    });
  }, [debouncedSearch, initialized, setSearch, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const state = useInventarioStore.getState();
        if (state.fetchingPage !== null || state.loading || state.loadingMore) return;
        if (state.paginaActual >= state.totalPaginas) return;
        loadMore().catch((err) => {
          console.error('[inventario] Error al cargar más:', err);
        });
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, items.length, loading, loadingMore, fetchingPage, paginaActual, totalPaginas]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(clearToast, 3000);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  const getEstadoActual = useCallback(
    (item: InventarioItem) => estadosLocales[item.id] ?? item.estado,
    [estadosLocales],
  );

  const handleApplyFilters = async (partial: Parameters<typeof applyFilters>[0]) => {
    await applyFilters(partial);
    setShowFilters(false);
  };

  return (
    <div className="flex w-full min-w-0 flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-ceibo-green to-ceibo-green-light px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-extrabold">
              {loading && !items.length ? 'Cargando...' : `Inventario · ${totalItems} productos`}
            </h1>
            {filters.sede && (
              <p className="text-xs text-white/80">{filters.sede}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => refresh().catch(console.error)}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-white/15 p-3 text-sm font-semibold transition-transform active:scale-95"
            aria-label="Recargar"
          >
            ↻
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre..."
            className="min-h-12 w-full flex-1 rounded-xl border-0 px-4 text-sm text-gray-900 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-white/20 px-4 text-sm font-bold transition-transform active:scale-95 lg:hidden"
          >
            Filtros
          </button>
        </div>

        {/* Quick chips móvil */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          <QuickChip
            label="Alertas"
            active={filters.soloAlertas}
            onClick={() => applyFilters({ soloAlertas: !filters.soloAlertas })}
            activeClass="bg-red-500 text-white"
          />
          <QuickChip
            label="En Recup."
            active={filters.soloRecuperacion}
            onClick={() => applyFilters({ soloRecuperacion: !filters.soloRecuperacion })}
            activeClass="bg-orange-500 text-white"
          />
        </div>
      </header>

      {/* Toast / error */}
      {toast && (
        <div className="mx-4 mt-3 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white">
          {toast}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {(filters.soloAlertas || filters.soloRecuperacion) && paginaActual < totalPaginas && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Los filtros de alertas y recuperación se aplican sobre cada página cargada. Puede haber más
          resultados en páginas siguientes — sigue desplazándote para cargar más.
        </div>
      )}

      <div className="flex w-full min-w-0 flex-1 gap-4 p-4">
        {/* Filtros desktop */}
        <div className="hidden lg:block">
          <InventarioFiltersPanel
            filters={filters}
            sedes={sedes}
            categorias={categorias}
            isSuperAdmin={isSuperAdmin}
            lockedSede={filters.sede}
            onApply={handleApplyFilters}
            onClear={() => clearFilters()}
          />
        </div>

        {/* Lista */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {loading && items.length === 0 ? (
            <div className="flex justify-center p-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              soloAlertas={filters.soloAlertas}
              hasFilters={
                !!searchInput ||
                !!filters.estado ||
                filters.soloRecuperacion
              }
              onClear={() => {
                setSearchInput('');
                lastSearchRef.current = '';
                clearFilters();
              }}
              onRefresh={() => refresh()}
            />
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 lg:hidden">
                {items.map((item) => (
                  <InventarioCard
                    key={item.id}
                    item={{ ...item, estado: getEstadoActual(item) }}
                    expanded={selectedItemId === item.id}
                    recuperacionCount={recuperacionLocales[item.id] ?? 0}
                    onToggle={() =>
                      selectItem(selectedItemId === item.id ? null : item.id)
                    }
                    onEntrada={() =>
                      setModal({ type: 'movimiento', item, movType: 'entry' })
                    }
                    onSalida={() =>
                      setModal({ type: 'movimiento', item, movType: 'exit' })
                    }
                    onRecuperacion={
                      canManageRecovery
                        ? () => setModal({ type: 'recuperacion', item })
                        : undefined
                    }
                    onEditar={() => setModal({ type: 'editar', item })}
                    onKardex={() => setModal({ type: 'kardex', item })}
                    canManageRecovery={canManageRecovery}
                  />
                ))}
              </div>

              {/* Desktop: tabla */}
              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white lg:block">
                <table className="w-full min-w-full text-sm">
                  <thead className="bg-ceibo-green text-left text-xs font-bold uppercase text-white">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Sede</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const estado = getEstadoActual(item);
                      const meta = getEstadoMeta(estado);
                      return (
                        <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <p className="font-bold">{item.nombre}</p>
                            {item.enAlerta && (
                              <p className="text-xs font-semibold text-red-500">
                                ⚠ {item.stock}/{item.stockMinimo} mín.
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-gray-600">{item.categoria}</td>
                          <td className="p-3 text-gray-600">{item.sede}</td>
                          <td className="p-3 text-center text-lg font-black text-ceibo-green">
                            {item.stock}
                          </td>
                          <td className="p-3">
                            <span
                              className="rounded-md px-2 py-1 text-xs font-bold"
                              style={{
                                color: meta.color,
                                backgroundColor: `${meta.color}18`,
                              }}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <TableBtn
                                label="+"
                                onClick={() =>
                                  setModal({ type: 'movimiento', item, movType: 'entry' })
                                }
                              />
                              <TableBtn
                                label="−"
                                onClick={() =>
                                  setModal({ type: 'movimiento', item, movType: 'exit' })
                                }
                                disabled={item.stock <= 0}
                              />
                              <TableBtn
                                label="K"
                                onClick={() => setModal({ type: 'kardex', item })}
                              />
                              <TableBtn
                                label="✎"
                                onClick={() => setModal({ type: 'editar', item })}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4 w-full" />
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-ceibo-green-light border-t-transparent" />
                </div>
              )}
              {paginaActual >= totalPaginas && items.length > 0 && (
                <p className="py-2 text-center text-xs text-gray-400">
                  Fin del inventario · página {paginaActual} de {totalPaginas}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filters sheet */}
      {showFilters && (
        <InventarioFiltersPanel
          mobile
          filters={filters}
          sedes={sedes}
          categorias={categorias}
          isSuperAdmin={isSuperAdmin}
          lockedSede={filters.sede}
          onApply={handleApplyFilters}
          onClear={() => {
            setSearchInput('');
            lastSearchRef.current = '';
            clearFilters();
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Modals */}
      {modal?.type === 'movimiento' && (
        <MovimientoModal
          item={modal.item}
          type={modal.movType}
          onConfirm={(qty, reason) =>
            registrarMovimiento(modal.item, modal.movType, qty, reason)
          }
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'recuperacion' && (
        <RecuperacionModal
          item={modal.item}
          recuperacionActual={recuperacionLocales[modal.item.id] ?? 0}
          onMoverEnfermas={(qty) => moverARecuperacion(modal.item, qty)}
          onReponerSanas={(qty) => repuestoDesdeRecuperacion(modal.item, qty)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'editar' && (
        <ItemEditDrawer
          item={modal.item}
          estadoActual={getEstadoActual(modal.item)}
          canEditPlants={canEditPlants}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'kardex' && (
        <ItemKardexPanel item={modal.item} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function QuickChip({
  label,
  active,
  onClick,
  activeClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-transform active:scale-95 ${
        active ? activeClass : 'bg-white/20 text-white'
      }`}
    >
      {label}
    </button>
  );
}

function TableBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 min-w-12 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold transition-transform active:scale-95 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function EmptyState({
  soloAlertas,
  hasFilters,
  onClear,
  onRefresh,
}: {
  soloAlertas: boolean;
  hasFilters: boolean;
  onClear: () => void;
  onRefresh: () => void;
}) {
  if (soloAlertas) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-4xl">🌿</p>
        <p className="text-base font-bold text-green-600">¡Sin alertas de stock!</p>
        <p className="text-sm text-gray-500">Todos los productos tienen stock suficiente.</p>
        <button
          type="button"
          onClick={onClear}
          className="min-h-12 rounded-xl bg-ceibo-green px-6 py-3 text-sm font-bold text-white active:scale-95"
        >
          Ver todo el inventario
        </button>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-base font-bold text-gray-600">Sin resultados</p>
        <p className="text-sm text-gray-500">Ningún producto coincide con los filtros.</p>
        <button
          type="button"
          onClick={onClear}
          className="min-h-12 rounded-xl border-2 border-ceibo-green px-6 py-3 text-sm font-bold text-ceibo-green active:scale-95"
        >
          Limpiar filtros
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <p className="text-base font-bold text-gray-600">No hay productos en el inventario</p>
      <button
        type="button"
        onClick={onRefresh}
        className="min-h-12 rounded-xl bg-ceibo-green px-6 py-3 text-sm font-bold text-white active:scale-95"
      >
        Recargar
      </button>
    </div>
  );
}
