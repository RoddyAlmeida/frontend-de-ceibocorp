import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  getStockAlerts,
  getAlertThresholds,
  createAlertThreshold,
  updateAlertThreshold,
  deleteAlertThreshold,
  getCategories,
  getHeadquarters,
  type StockAlert,
  type AlertThreshold,
} from '../services/api';
import { RolePolicy } from '../lib/rolePolicy';

type Tab = 'alerts' | 'thresholds';
type Filter = 'active' | 'resolved' | 'all';

function severity(qty: number, min: number) {
  if (qty === 0) return { label: 'Crítica', color: '#B71C1C', bg: '#FFEBEE', border: '#EF9A9A' };
  if (qty <= min / 2) return { label: 'Alta', color: '#E65100', bg: '#FFF3E0', border: '#FFCC80' };
  return { label: 'Media', color: '#F57F17', bg: '#FFFDE7', border: '#FFF176' };
}

function thresholdLabel(t: AlertThreshold): string {
  if (t.type === 'category') {
    if (t.category?.name) return `Categoría: ${t.category.name}`;
    return 'Por categoría';
  }
  if (t.type === 'plant_size') {
    const plant = t.plant_size?.plant?.name ?? '';
    const size = t.plant_size?.size_name ?? '';
    const parts = [plant, size].filter(Boolean);
    return parts.length ? `Planta: ${parts.join(' ')}` : 'Por tamaño';
  }
  return 'Global';
}

interface Category { id: number; name: string }
interface Headquarter { id: number; name: string }

export default function AlertasStock() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const canManage = RolePolicy.canManageThresholds(role);
  const canDelete = RolePolicy.canDeleteThreshold(role);

  const [tab, setTab] = useState<Tab>('alerts');
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [headquarters, setHeadquarters] = useState<Headquarter[]>([]);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ type: 'category' as 'category' | 'plant_size' | 'global', category_id: null as number | null, headquarter_id: null as number | null, min_quantity: 10, description: '', active: true });
  const [saving, setSaving] = useState(false);

  // Edit form
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ min_quantity: 10, description: '' });

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams: Record<string, string> = {};
      if (!isSuperAdmin && user?.headquarter_id) {
        baseParams.headquarter_id = String(user.headquarter_id);
      }
      let list: StockAlert[];
      if (filter === 'all') {
        const [activeRes, resolvedRes] = await Promise.all([
          getStockAlerts({ ...baseParams, status: 'active' }),
          getStockAlerts({ ...baseParams, status: 'resolved' }),
        ]);
        const active = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data?.data ?? []);
        const resolved = Array.isArray(resolvedRes.data) ? resolvedRes.data : (resolvedRes.data?.data ?? []);
        list = [...active, ...resolved];
      } else {
        const res = await getStockAlerts({ ...baseParams, status: filter });
        list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      }
      setAlerts(list);
    } catch (err) {
      console.error('[alertas] Error al cargar alertas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  }, [filter, user?.headquarter_id, isSuperAdmin]);

  const loadThresholds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (!isSuperAdmin && user?.headquarter_id) {
        params.headquarter_id = String(user.headquarter_id);
      }
      const res = await getAlertThresholds(params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setThresholds(list);
    } catch (err) {
      console.error('[alertas] Error al cargar umbrales:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar umbrales');
    } finally {
      setLoading(false);
    }
  }, [user?.headquarter_id, isSuperAdmin]);

  useEffect(() => {
    loadThresholds();
  }, [loadThresholds]);

  useEffect(() => {
    if (tab === 'alerts') loadAlerts();
  }, [tab, loadAlerts]);

  // Load reference data for form
  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      getCategories().catch(() => ({ data: [] })),
      getHeadquarters().catch(() => ({ data: [] })),
    ]).then(([catRes, hqRes]) => {
      const catList = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data ?? []);
      setCategories(catList.map((c: Record<string, unknown>) => ({ id: Number(c.id ?? 0), name: String(c.name ?? '') })));
      const hqList = Array.isArray(hqRes.data) ? hqRes.data : (hqRes.data?.data ?? []);
      setHeadquarters(hqList.map((h: Record<string, unknown>) => ({ id: Number(h.id ?? 0), name: String(h.name ?? '') })));
    });
  }, [showCreate]);

  const handleToggleActive = async (t: AlertThreshold) => {
    try {
      await updateAlertThreshold(t.id, { active: !t.active });
      loadThresholds();
    } catch (err) {
      console.error('[alertas] Error al cambiar estado:', err);
    }
  };

  const handleCreate = async () => {
    if (createForm.min_quantity < 0) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: createForm.type,
        min_quantity: createForm.min_quantity,
        active: createForm.active,
      };
      if (createForm.type === 'category' && createForm.category_id != null) body.category_id = createForm.category_id;
      if (createForm.headquarter_id != null) body.headquarter_id = createForm.headquarter_id;
      if (createForm.description.trim()) body.description = createForm.description.trim();
      await createAlertThreshold(body);
      setShowCreate(false);
      setCreateForm({ type: 'category', category_id: null, headquarter_id: null, min_quantity: 10, description: '', active: true });
      loadThresholds();
    } catch (err) {
      console.error('[alertas] Error al crear umbral:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editingId == null || editForm.min_quantity < 0) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { min_quantity: editForm.min_quantity };
      if (editForm.description.trim()) body.description = editForm.description.trim();
      await updateAlertThreshold(editingId, body);
      setShowEdit(false);
      setEditingId(null);
      loadThresholds();
    } catch (err) {
      console.error('[alertas] Error al editar umbral:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteThreshold = async (id: number) => {
    if (!confirm('¿Eliminar este umbral?')) return;
    try {
      await deleteAlertThreshold(id);
      loadThresholds();
    } catch (err) {
      console.error('[alertas] Error al eliminar umbral:', err);
    }
  };

  const openEdit = (t: AlertThreshold) => {
    setEditingId(t.id);
    setEditForm({ min_quantity: t.min_quantity, description: t.description ?? '' });
    setShowEdit(true);
  };

  const openCreate = () => {
    setCreateForm({ type: 'category', category_id: null, headquarter_id: null, min_quantity: 10, description: '', active: true });
    setShowCreate(true);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const plantName = a.stock?.plant_size?.plant?.name ?? '';
    return plantName.toLowerCase().includes(q);
  });

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-500 px-4 pb-4 pt-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <h1 className="text-lg font-extrabold text-white">Alertas de Stock</h1>
        </div>
        <p className="text-xs text-white/70">Control de umbrales y alertas</p>
      </div>

      {/* Tabs */}
      <div className="mx-4 mt-3 flex rounded-xl border border-gray-200 bg-white p-0.5">
        <button type="button" onClick={() => setTab('alerts')} className={`flex-1 min-h-12 rounded-lg py-2 text-xs font-bold transition-colors ${tab === 'alerts' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          Alertas ({alerts.length})
        </button>
        <button type="button" onClick={() => setTab('thresholds')} className={`flex-1 min-h-12 rounded-lg py-2 text-xs font-bold transition-colors ${tab === 'thresholds' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          Umbrales ({thresholds.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-3">
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
        )}

        {/* ─── Alerts Tab ───────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {(['active', 'resolved', 'all'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${filter === f ? 'bg-amber-600 text-white' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {f === 'active' ? 'Activas' : f === 'resolved' ? 'Resueltas' : 'Todas'}
                </button>
              ))}
            </div>
            <div className="mb-3">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <p className="py-10 text-center text-xs text-gray-400">Sin alertas</p>
            ) : (
              <div className="space-y-2">
                {filteredAlerts.map((a) => {
                  const qty = a.stock?.sellable_quantity ?? a.stock?.quantity ?? 0;
                  const min = a.threshold?.min_quantity ?? 1;
                  const s = severity(qty, min);
                  const plantName = a.stock?.plant_size?.plant?.name ?? 'Producto';
                  const sizeName = a.stock?.plant_size?.size_name;
                  const name = sizeName ? `${plantName} (${sizeName})` : plantName;
                  const sede = a.stock?.headquarter?.name;
                  const resolved = a.resolved_at != null;
                  return (
                    <div key={a.id} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: s.border }}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-bold text-gray-800">{name}</span>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: s.color, backgroundColor: s.bg }}>{s.label}</span>
                      </div>
                      {sede && <p className="mb-1 text-[11px] text-gray-400">📍 {sede}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">
                          Stock: <span className="font-bold" style={{ color: s.color }}>{qty}</span> | Mín: {min}
                          {resolved && <span className="ml-2 text-green-600 font-bold">✓ Resuelta</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Thresholds Tab ───────────────────────────────────────────── */}
        {tab === 'thresholds' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
              </div>
            ) : thresholds.length === 0 ? (
              <p className="py-10 text-center text-xs text-gray-400">Sin umbrales configurados</p>
            ) : (
              <div className="space-y-2">
                {thresholds.map((t) => {
                  const desc = t.description ?? '';
                  return (
                    <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-bold text-gray-800">{thresholdLabel(t)}</span>
                        {canManage && (
                          <Switch activeColor="#F57F17" checked={t.active} onChange={() => handleToggleActive(t)} />
                        )}
                      </div>
                      {desc && <p className="mb-1 text-[11px] text-gray-400">{desc}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">Mín: {t.min_quantity} uds</span>
                        <div className="flex gap-1">
                          {canManage && (
                            <button type="button" onClick={() => openEdit(t)} className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                              Editar
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" onClick={() => handleDeleteThreshold(t.id)} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100">
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB — create threshold */}
      {tab === 'thresholds' && canManage && (
        <button type="button" onClick={openCreate} className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-2xl text-white shadow-lg hover:bg-amber-700 lg:bottom-6">
          +
        </button>
      )}

      {/* ─── Create Threshold Dialog ──────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-1 text-sm font-extrabold text-amber-800">Nuevo umbral de alerta</div>
            <p className="mb-4 text-[11px] text-gray-400">Cuando el stock baje del mínimo se generará una alerta automática.</p>

            {/* Tipo de umbral */}
            <Label>Tipo de umbral</Label>
            <select value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as 'category' | 'plant_size' | 'global', category_id: null }))} className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40">
              <option value="category">Por categoría</option>
              <option value="plant_size">Por tamaño de planta</option>
              <option value="global">Global (todos los productos)</option>
            </select>

            {/* Categoría — only when type == category */}
            {createForm.type === 'category' && categories.length > 0 && (
              <>
                <Label>Categoría</Label>
                <select value={createForm.category_id ?? ''} onChange={(e) => setCreateForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : null }))} className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </>
            )}

            {/* Sede — always visible */}
            <Label>Sede (opcional)</Label>
            <select value={createForm.headquarter_id ?? ''} onChange={(e) => setCreateForm((f) => ({ ...f, headquarter_id: e.target.value ? Number(e.target.value) : null }))} className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40">
              <option value="">Todas las sedes</option>
              {headquarters.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            {/* Cantidad mínima */}
            <Label>Cantidad mínima</Label>
            <input type="number" min={0} value={createForm.min_quantity} onChange={(e) => setCreateForm((f) => ({ ...f, min_quantity: Number(e.target.value) }))} placeholder="Ej: 10" className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40" />

            {/* Descripción */}
            <Label>Descripción (opcional)</Label>
            <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Notas del umbral" className="mb-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40" />

            {/* Activar al crear */}
            <label className="mb-4 flex items-center justify-between text-xs font-semibold text-gray-700">
              Activar al crear
              <Switch activeColor="#F57F17" checked={createForm.active} onChange={() => setCreateForm((f) => ({ ...f, active: !f.active }))} />
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCreate} disabled={saving} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar umbral'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Threshold Dialog ────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-amber-800">
              Editar umbral
            </div>
            <p className="mb-4 text-[11px] text-gray-400">
              {editingId != null ? thresholdLabel(thresholds.find((t) => t.id === editingId) ?? ({ type: 'global', min_quantity: 0 } as AlertThreshold)) : ''}
            </p>

            <Label>Cantidad mínima</Label>
            <input type="number" min={0} value={editForm.min_quantity} onChange={(e) => setEditForm((f) => ({ ...f, min_quantity: Number(e.target.value) }))} className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40" />

            <Label>Descripción (opcional)</Label>
            <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Notas del umbral" className="mb-4 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40" />

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowEdit(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleEdit} disabled={saving} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-semibold text-gray-500">{children}</label>;
}

function Switch({ checked, onChange, activeColor = '#F57F17' }: { checked: boolean; onChange: () => void; activeColor?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      style={{ backgroundColor: checked ? activeColor : '#D1D5DB' }}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}
