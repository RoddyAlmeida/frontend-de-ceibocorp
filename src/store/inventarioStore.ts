import { create } from 'zustand';
import {
  createStockMovement,
  getCategories,
  getHeadquarters,
  getStockAlerts,
  getStockMovementsByStock,
  getStocksPaged,
  updateAlertThreshold,
  updatePlant,
  updatePlantSize,
  updateStock,
} from '../services/api';
import { useAuthStore } from './authStore';
import {
  loadEstadosLocales,
  loadRecuperacionLocales,
  saveEstadosLocales,
  saveRecuperacionLocales,
} from '../lib/inventarioPersistence';
import { extractPaginatedList, parseInventarioItem, toTitleCase } from '../lib/inventarioParser';
import type {
  CategoriaOption,
  InventarioFilters,
  InventarioItem,
  ItemEstadoValue,
  StockMovement,
} from '../types/inventario';
import { DEFAULT_INVENTARIO_FILTERS as DEFAULT_FILTERS } from '../types/inventario';

const PAGE_SIZE = 10;
const PAGE_SIZE_LOCAL_FILTER = 100;

interface SedeOption {
  id: string;
  name: string;
}

interface InventarioState {
  items: InventarioItem[];
  sedes: SedeOption[];
  categorias: CategoriaOption[];
  filters: InventarioFilters;
  paginaActual: number;
  totalPaginas: number;
  totalItems: number;
  loading: boolean;
  loadingMore: boolean;
  fetchingPage: number | null;
  error: string | null;
  toast: string | null;
  selectedItemId: string | null;
  estadosLocales: Record<string, ItemEstadoValue>;
  recuperacionLocales: Record<string, number>;
  initialized: boolean;

  init: (opts: {
    isSuperAdmin: boolean;
    headquarterId?: number;
    headquarterName?: string;
  }) => Promise<void>;
  setSearch: (search: string) => void;
  applyFilters: (partial: Partial<InventarioFilters>) => Promise<void>;
  clearFilters: () => Promise<void>;
  fetchPage: (page: number, opts?: { append?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  selectItem: (id: string | null) => void;
  changeEstado: (item: InventarioItem, nuevo: ItemEstadoValue) => Promise<void>;
  registrarMovimiento: (
    item: InventarioItem,
    type: 'entry' | 'exit',
    quantity: number,
    reason: string,
  ) => Promise<void>;
  moverARecuperacion: (item: InventarioItem, cantidad: number) => Promise<void>;
  repuestoDesdeRecuperacion: (item: InventarioItem, cantidad: number) => Promise<void>;
  guardarEdicion: (
    item: InventarioItem,
    data: {
      nombre: string;
      precio: number;
      precioMayor?: number;
      stockMinimo: number;
      estado: ItemEstadoValue;
    },
  ) => Promise<string[]>;
  fetchKardexByStock: (stockId: string) => Promise<StockMovement[]>;
  fetchStockAlerts: () => Promise<unknown[]>;
  clearToast: () => void;
  reset: () => void;
}

function applyLocalFilters(
  items: InventarioItem[],
  filters: InventarioFilters,
  recuperacionLocales: Record<string, number>,
): InventarioItem[] {
  let result = items;

  if (filters.soloAlertas) {
    result = result.filter((i) => i.enAlerta);
  }

  if (filters.soloRecuperacion) {
    result = result.filter((i) => (recuperacionLocales[i.id] ?? 0) > 0);
  }

  return result;
}

function reconcileEstadosFromServer(
  rawItems: Record<string, unknown>[],
  estadosLocales: Record<string, ItemEstadoValue>,
): {
  items: InventarioItem[];
  estadosLocales: Record<string, ItemEstadoValue>;
  hadConflict: boolean;
} {
  const nextEstados = { ...estadosLocales };
  let hadConflict = false;

  const items = rawItems.map((raw) => {
    const item = parseInventarioItem(raw);
    const local = nextEstados[item.id];

    if (local != null) {
      if (local !== item.estado) {
        hadConflict = true;
      }
      delete nextEstados[item.id];
    }

    return item;
  });

  if (hadConflict || Object.keys(nextEstados).length !== Object.keys(estadosLocales).length) {
    void saveEstadosLocales(nextEstados);
  }

  return { items, estadosLocales: nextEstados, hadConflict };
}

export const useInventarioStore = create<InventarioState>((set, get) => ({
  items: [],
  sedes: [],
  categorias: [],
  filters: { ...DEFAULT_FILTERS },
  paginaActual: 1,
  totalPaginas: 1,
  totalItems: 0,
  loading: false,
  loadingMore: false,
  fetchingPage: null,
  error: null,
  toast: null,
  selectedItemId: null,
  estadosLocales: {},
  recuperacionLocales: {},
  initialized: false,

  init: async ({ isSuperAdmin, headquarterId, headquarterName }) => {
    set({ loading: true, error: null });
    try {
      const [estadosLocales, recuperacionLocales] = await Promise.all([
        loadEstadosLocales(),
        loadRecuperacionLocales(),
      ]);

      let sedes: SedeOption[] = [];
      let categorias: CategoriaOption[] = [];
      try {
        const [hqRes, catRes] = await Promise.all([getHeadquarters(), getCategories()]);
        const hqList = Array.isArray(hqRes.data) ? hqRes.data : [];
        sedes = hqList
          .map((h: Record<string, unknown>) => ({
            id: String(h.id ?? ''),
            name: String(h.name ?? h.nombre ?? ''),
          }))
          .filter((s) => s.id && s.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        const catList = Array.isArray(catRes.data) ? catRes.data : [];
        categorias = catList
          .map((c: Record<string, unknown>) => ({
            id: String(c.id ?? ''),
            name: String(c.name ?? c.nombre ?? ''),
          }))
          .filter((c) => c.id && c.name)
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (err) {
        console.error('[inventario] Error al cargar sedes/categorías:', err);
      }

      let filters = { ...DEFAULT_FILTERS };

      if (!isSuperAdmin && headquarterId != null) {
        const hqId = String(headquarterId);
        const sede =
          headquarterName ??
          sedes.find((s) => s.id === hqId)?.name ??
          null;
        if (sede) {
          filters = {
            ...filters,
            sede,
            headquarterId: hqId,
          };
        }
      }

      set({
        estadosLocales,
        recuperacionLocales,
        sedes,
        categorias,
        filters,
        initialized: true,
      });

      await get().fetchPage(1);
    } catch (err) {
      console.error('[inventario] Error en init:', err);
      set({
        error: err instanceof Error ? err.message : 'No se pudo inicializar inventario',
        loading: false,
      });
    }
  },

  setSearch: (search) => {
    set((s) => ({ filters: { ...s.filters, search } }));
  },

  applyFilters: async (partial) => {
    const filters = { ...get().filters, ...partial };
    set({ filters });
    await get().fetchPage(1);
  },

  clearFilters: async () => {
    const { filters } = get();
    const keepSede =
      filters.headquarterId && filters.sede
        ? { sede: filters.sede, headquarterId: filters.headquarterId }
        : { sede: null, headquarterId: null };

    set({
      filters: {
        ...DEFAULT_FILTERS,
        ...keepSede,
      },
      selectedItemId: null,
    });
    await get().fetchPage(1);
  },

  fetchPage: async (page, opts) => {
    const { filters, estadosLocales, recuperacionLocales, fetchingPage } = get();
    if (fetchingPage !== null) {
      console.warn('[inventario] fetchPage ignorado: ya hay una petición en curso (página', fetchingPage, ')');
      return;
    }

    const append = opts?.append ?? false;
    const localFilterActive = filters.soloAlertas || filters.soloRecuperacion;
    const perPage = localFilterActive ? PAGE_SIZE_LOCAL_FILTER : PAGE_SIZE;
    const searchApi = filters.search.trim()
      ? toTitleCase(filters.search.trim())
      : undefined;

    set({
      fetchingPage: page,
      loading: !append,
      loadingMore: append,
      error: null,
    });

    try {
      const { data } = await getStocksPaged({
        page,
        perPage,
        search: searchApi,
        headquarterId: filters.headquarterId ?? undefined,
        status: filters.estado ?? undefined,
        categoryId: filters.categoryId ?? undefined,
      });

      const { items: rawItems, total, lastPage } = extractPaginatedList(data);
      const reconciled = reconcileEstadosFromServer(rawItems, estadosLocales);
      const parsed = applyLocalFilters(
        reconciled.items,
        filters,
        recuperacionLocales,
      );

      const prevItems = append ? get().items : [];

      set({
        items: append ? [...prevItems, ...parsed] : parsed,
        estadosLocales: reconciled.estadosLocales,
        paginaActual: page,
        totalPaginas: lastPage,
        totalItems: localFilterActive ? parsed.length : total,
        loading: false,
        loadingMore: false,
        fetchingPage: null,
        ...(reconciled.hadConflict && {
          toast: 'Tu vista se actualizó con los datos del servidor',
        }),
      });
    } catch (err) {
      console.error('[inventario] Error al cargar página:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al cargar inventario',
        loading: false,
        loadingMore: false,
        fetchingPage: null,
      });
    }
  },

  loadMore: async () => {
    const { paginaActual, totalPaginas, fetchingPage, loading, loadingMore } = get();
    if (fetchingPage !== null || loading || loadingMore) return;
    if (paginaActual >= totalPaginas) return;
    await get().fetchPage(paginaActual + 1, { append: true });
  },

  refresh: async () => {
    await get().fetchPage(1);
  },

  selectItem: (id) => set({ selectedItemId: id }),

  changeEstado: async (item, nuevo) => {
    const prevEstado = item.estado;
    const estadosLocales = { ...get().estadosLocales, [item.id]: nuevo };

    set({
      estadosLocales,
      items: get().items.map((it) =>
        it.id === item.id ? { ...it, estado: nuevo } : it,
      ),
    });

    try {
      await updateStock(parseInt(item.id, 10), { status: nuevo });
      const nextEstados = { ...get().estadosLocales };
      delete nextEstados[item.id];
      await saveEstadosLocales(nextEstados);
      set({ estadosLocales: nextEstados, toast: 'Estado actualizado' });
    } catch (err) {
      console.error('[inventario] Error al cambiar estado:', err);
      const reverted = { ...get().estadosLocales };
      reverted[item.id] = prevEstado;
      set({
        estadosLocales: reverted,
        items: get().items.map((it) =>
          it.id === item.id ? { ...it, estado: prevEstado } : it,
        ),
        error: err instanceof Error ? err.message : 'Error al cambiar estado',
      });
    }
  },

  registrarMovimiento: async (item, type, quantity, reason) => {
    set({ loading: true, error: null });
    try {
      const { data } = await createStockMovement({
        stock_id: parseInt(item.id, 10),
        type,
        quantity,
        reason,
      });
      const qBefore = data.quantity_before as number | undefined;
      const qAfter = data.quantity_after as number | undefined;
      const delta =
        qBefore != null && qAfter != null
          ? qAfter - qBefore
          : type === 'entry'
            ? quantity
            : -quantity;
      const nuevoStock = Math.max(0, item.stock + delta);

      set({
        items: get().items.map((it) =>
          it.id === item.id ? { ...it, stock: nuevoStock } : it,
        ),
        toast: 'Movimiento registrado',
        loading: false,
      });
    } catch (err) {
      console.error('[inventario] Error al registrar movimiento:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al registrar movimiento',
        loading: false,
      });
      throw err;
    }
  },

  moverARecuperacion: async (item, cantidad) => {
    if (cantidad > item.stock) {
      set({ error: 'Cantidad mayor al stock disponible' });
      return;
    }
    try {
      const { data } = await createStockMovement({
        stock_id: parseInt(item.id, 10),
        type: 'exit',
        quantity: cantidad,
        reason: 'Movimiento a recuperación',
      });
      const qBefore = data.quantity_before as number | undefined;
      const qAfter = data.quantity_after as number | undefined;
      const delta = qBefore != null && qAfter != null ? qAfter - qBefore : -cantidad;
      const nuevoStock = Math.max(0, item.stock + delta);
      const recuperacionLocales = {
        ...get().recuperacionLocales,
        [item.id]: (get().recuperacionLocales[item.id] ?? 0) + cantidad,
      };
      await saveRecuperacionLocales(recuperacionLocales);
      set({
        recuperacionLocales,
        items: get().items.map((it) =>
          it.id === item.id ? { ...it, stock: nuevoStock } : it,
        ),
        toast: `Se movieron ${cantidad} un. a recuperación`,
      });
    } catch (err) {
      console.error('[inventario] Error al mover a recuperación:', err);
      set({
        error: err instanceof Error ? err.message : 'Error en recuperación',
      });
      throw err;
    }
  },

  repuestoDesdeRecuperacion: async (item, cantidad) => {
    const actuales = get().recuperacionLocales[item.id] ?? 0;
    if (cantidad > actuales) {
      set({ error: 'Cantidad excede las en recuperación' });
      return;
    }
    try {
      const { data } = await createStockMovement({
        stock_id: parseInt(item.id, 10),
        type: 'entry',
        quantity: cantidad,
        reason: 'Repuesto desde recuperación',
      });
      const qBefore = data.quantity_before as number | undefined;
      const qAfter = data.quantity_after as number | undefined;
      const delta = qBefore != null && qAfter != null ? qAfter - qBefore : cantidad;
      const nuevoStock = Math.max(0, item.stock + delta);
      const recuperacionLocales = {
        ...get().recuperacionLocales,
        [item.id]: actuales - cantidad,
      };
      await saveRecuperacionLocales(recuperacionLocales);
      set({
        recuperacionLocales,
        items: get().items.map((it) =>
          it.id === item.id ? { ...it, stock: nuevoStock } : it,
        ),
        toast: `Repuesto ${cantidad} un. a stock principal`,
      });
    } catch (err) {
      console.error('[inventario] Error al repostar desde recuperación:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al repostar stock',
      });
      throw err;
    }
  },

  guardarEdicion: async (item, data) => {
    const { canEditPlants, role } = useAuthStore.getState();
    const errores: string[] = [];
    const estadoActual = get().estadosLocales[item.id] ?? item.estado;

    const triedRestrictedEdit =
      (item.plantId && data.nombre.trim() && data.nombre !== item.nombre) ||
      data.precio !== item.precio ||
      data.precioMayor !== item.precioMayor ||
      data.stockMinimo !== item.stockMinimo;

    if (!canEditPlants && triedRestrictedEdit) {
      const msg =
        'No tienes permiso para editar nombre, precios o umbrales. Solo administradores pueden modificar estos campos.';
      console.error('[inventario] guardarEdicion bloqueado por rol:', role);
      set({ error: msg });
      throw new Error(msg);
    }

    try {
      if (canEditPlants) {
        if (item.plantId && data.nombre.trim() && data.nombre !== item.nombre) {
          try {
            await updatePlant(parseInt(item.plantId, 10), { name: data.nombre.trim() });
          } catch (err) {
            console.error('[inventario] Error al actualizar nombre:', err);
            errores.push(`Nombre: ${err instanceof Error ? err.message : 'Error'}`);
          }
        }

        const preciosCambiaron =
          data.precio !== item.precio || data.precioMayor !== item.precioMayor;

        if (item.plantSizeId && preciosCambiaron) {
          try {
            const body: Record<string, number> = { unit_price: data.precio };
            if (data.precioMayor != null) body.wholesale_price = data.precioMayor;
            await updatePlantSize(parseInt(item.plantSizeId, 10), body);
          } catch (err) {
            console.error('[inventario] Error al actualizar precios:', err);
            errores.push(`Precios: ${err instanceof Error ? err.message : 'Error'}`);
          }
        }

        if (item.thresholdId && data.stockMinimo !== item.stockMinimo) {
          try {
            await updateAlertThreshold(parseInt(item.thresholdId, 10), {
              min_quantity: data.stockMinimo,
            });
          } catch (err) {
            console.error('[inventario] Error al actualizar umbral:', err);
            errores.push(`Stock mínimo: ${err instanceof Error ? err.message : 'Error'}`);
          }
        }
      }

      if (data.estado !== estadoActual) {
        await get().changeEstado(item, data.estado);
      }

      set({
        items: get().items.map((it) =>
          it.id === item.id
            ? {
                ...it,
                ...(canEditPlants && {
                  nombre: data.nombre.trim() || it.nombre,
                  precio: data.precio,
                  precioMayor: data.precioMayor,
                  stockMinimo: data.stockMinimo,
                  enAlerta: it.stock <= data.stockMinimo,
                }),
                estado: data.estado,
              }
            : it,
        ),
        toast: errores.length === 0 ? 'Producto actualizado' : undefined,
        error: errores.length > 0 ? errores.join(' | ') : null,
      });

      return errores;
    } catch (err) {
      console.error('[inventario] Error al guardar edición:', err);
      throw err;
    }
  },

  fetchKardexByStock: async (stockId) => {
    try {
      const { data } = await getStockMovementsByStock(parseInt(stockId, 10));
      const list = Array.isArray(data) ? data : (data as { data?: StockMovement[] })?.data ?? [];
      return list as StockMovement[];
    } catch (err) {
      console.error('[inventario] Error al cargar kardex del item:', err);
      throw err;
    }
  },

  fetchStockAlerts: async () => {
    try {
      const { data } = await getStockAlerts();
      return Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
    } catch (err) {
      console.error('[inventario] Error al cargar alertas de stock:', err);
      throw err;
    }
  },

  clearToast: () => set({ toast: null }),

  reset: () =>
    set({
      items: [],
      sedes: [],
      categorias: [],
      filters: { ...DEFAULT_FILTERS },
      paginaActual: 1,
      totalPaginas: 1,
      totalItems: 0,
      loading: false,
      loadingMore: false,
      fetchingPage: null,
      error: null,
      toast: null,
      selectedItemId: null,
      estadosLocales: {},
      recuperacionLocales: {},
      initialized: false,
    }),
}));
