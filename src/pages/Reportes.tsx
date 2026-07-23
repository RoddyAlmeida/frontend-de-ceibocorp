import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getDashboard,
  getSales,
  getStockAlerts,
  getStockMovements,
  getHeadquarters,
  getUsers,
  createHeadquarter,
} from '../services/api';

interface DashboardData {
  inventario: number;
  alertas: number;
  ingresos: number;
  egresos: number;
  ventas: { count: number; total: number };
  movimientos: number;
}

interface DialogState {
  type: string;
  items: unknown[];
  loading: boolean;
}

export default function Reportes() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  // Super admin sections
  const [sedes, setSedes] = useState<{ id: number; name: string; address?: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [showSedeDialog, setShowSedeDialog] = useState(false);
  const [sedeForm, setSedeForm] = useState({ name: '', address: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashRes] = await Promise.all([getDashboard()]);
        const d = dashRes.data;
        setData({
          inventario: d?.inventario ?? 0,
          alertas: d?.alertas ?? 0,
          ingresos: d?.ingresos ?? 0,
          egresos: d?.egresos ?? 0,
          ventas: { count: d?.ventas?.count ?? 0, total: d?.ventas?.total ?? 0 },
          movimientos: d?.movimientos ?? 0,
        });
      } catch (err) {
        console.error('[reportes] Error al cargar dashboard:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    Promise.all([
      getHeadquarters().catch(() => ({ data: [] })),
      getUsers().catch(() => ({ data: [] })),
    ]).then(([hqRes, usrRes]) => {
      const hqList = Array.isArray(hqRes.data) ? hqRes.data : (hqRes.data?.data ?? []);
      setSedes(hqList.map((h: Record<string, unknown>) => ({ id: Number(h.id ?? 0), name: String(h.name ?? ''), address: String(h.address ?? '') })));
      const usrList = Array.isArray(usrRes.data) ? usrRes.data : (usrRes.data?.data ?? []);
      setUsers(usrList.slice(0, 5).map((u: Record<string, unknown>) => ({ id: Number(u.id ?? 0), name: String(u.name ?? ''), email: String(u.email ?? '') })));
    });
  }, [isSuperAdmin]);

  const openDialog = async (type: string) => {
    setDialog({ type, items: [], loading: true });
    try {
      let items: unknown[] = [];
      if (type === 'Alertas') {
        const res = await getStockAlerts({ status: 'active', per_page: '100' });
        items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } else if (type === 'Ingresos') {
        const res = await getStockMovements({ type: 'entry' });
        items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } else if (type === 'Egresos') {
        const res = await getStockMovements({ type: 'exit' });
        items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } else if (type === 'Ventas') {
        const res = await getSales();
        items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } else if (type === 'TopPlantas') {
        const res = await getStockMovements();
        items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      }
      setDialog({ type, items, loading: false });
    } catch (err) {
      console.error(`[reportes] Error al cargar ${type}:`, err);
      setDialog({ type, items: [], loading: false });
    }
  };

  const navigateTo = (target: string) => {
    setDialog(null);
    if (target === 'Inventario') navigate('/inventario');
    else if (target === 'Kardex') navigate('/kardex');
    else if (target === 'Alertas') navigate('/alertas-stock');
    else if (target === 'Ventas') navigate('/ventas/historial');
  };

  const handleCreateSede = async () => {
    if (!sedeForm.name.trim()) return;
    setSaving(true);
    try {
      await createHeadquarter({ name: sedeForm.name.trim(), address: sedeForm.address.trim(), phone: sedeForm.phone.trim() });
      const res = await getHeadquarters();
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setSedes(list.map((h: Record<string, unknown>) => ({ id: Number(h.id ?? 0), name: String(h.name ?? ''), address: String(h.address ?? '') })));
      setShowSedeDialog(false);
      setSedeForm({ name: '', address: '', phone: '' });
    } catch (err) {
      console.error('[reportes] Error al crear sede:', err);
    } finally {
      setSaving(false);
    }
  };

  const kpis = data
    ? [
        { label: 'Inventario', value: String(data.inventario), sub: 'productos', icon: '📦', color: '#1B5E20', nav: 'Inventario' },
        { label: 'Alertas', value: String(data.alertas), sub: 'stock bajo', icon: '⚠️', color: '#F57F17', nav: 'Alertas' },
        { label: 'Ingresos', value: String(data.ingresos), sub: 'unidades entrada', icon: '📈', color: '#2E7D32', nav: 'Ingresos' },
        { label: 'Egresos', value: String(data.egresos), sub: 'unidades salida', icon: '📉', color: '#546E7A', nav: 'Egresos' },
        { label: 'Ventas', value: String(data.ventas.count), sub: `$${data.ventas.total.toLocaleString()} total`, icon: '🛒', color: '#1565C0', nav: 'Ventas' },
        { label: 'Mov. Stock', value: String(data.movimientos), sub: 'movimientos', icon: '🔄', color: '#00695C', nav: 'TopPlantas' },
      ]
    : [];

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-4 pb-4 pt-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h1 className="text-lg font-extrabold text-white">Dashboard</h1>
        </div>
        {user && <p className="text-xs text-white/70">Hola, {user.name} 👋</p>}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
        )}

        {!loading && data && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:max-w-3xl lg:mx-auto">
              {kpis.map((kpi) => (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => kpi.nav === 'Inventario' || kpi.nav === 'Alertas' || kpi.nav === 'Kardex' || kpi.nav === 'Ventas'
                    ? navigateTo(kpi.nav)
                    : openDialog(kpi.nav)}
                  className="flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="mb-2 text-2xl">{kpi.icon}</span>
                  <p className="text-2xl font-extrabold" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-xs font-semibold text-gray-700">{kpi.label}</p>
                  <p className="text-[11px] text-gray-400">{kpi.sub}</p>
                </button>
              ))}
            </div>

            {/* Super Admin sections */}
            {isSuperAdmin && (
              <div className="mt-6 max-w-3xl lg:mx-auto">
                {/* Sedes */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-green-800">Sedes</h2>
                    <button
                      type="button"
                      onClick={() => setShowSedeDialog(true)}
                      className="rounded-lg bg-green-700 px-3 py-3 text-[11px] font-bold text-white hover:bg-green-800"
                    >
                      + Crear Sede
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sedes.map((s) => (
                      <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                        <span className="mb-1 text-2xl">📍</span>
                        <p className="text-xs font-bold text-gray-800">{s.name}</p>
                        {s.address && <p className="text-[11px] text-gray-500">{s.address}</p>}
                      </div>
                    ))}
                    {sedes.length === 0 && <p className="col-span-2 py-4 text-center text-xs text-gray-400">Sin sedes</p>}
                  </div>
                </div>

                {/* Últimos usuarios */}
                {users.length > 0 && (
                  <div className="mb-4">
                    <h2 className="mb-2 text-sm font-extrabold text-green-800">Últimos usuarios</h2>
                    <div className="space-y-1">
                      {users.map((u) => (
                        <div key={u.id} className="flex min-h-12 items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                          <span className="min-w-0 truncate font-semibold text-gray-700">{u.name}</span>
                          <span className="ml-2 shrink-0 truncate text-gray-400">{u.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog */}
      {dialog && (
        <DialogModal
          type={dialog.type}
          items={dialog.items}
          loading={dialog.loading}
          onNavigate={navigateTo}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Create Sede Dialog */}
      {showSedeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="mb-3 text-sm font-extrabold text-green-800">Crear Sede</h3>
            <input type="text" value={sedeForm.name} onChange={(e) => setSedeForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre *" className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none" />
            <input type="text" value={sedeForm.address} onChange={(e) => setSedeForm((f) => ({ ...f, address: e.target.value }))} placeholder="Dirección" className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none" />
            <input type="text" value={sedeForm.phone} onChange={(e) => setSedeForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Teléfono" className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:outline-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowSedeDialog(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCreateSede} disabled={!sedeForm.name.trim() || saving} className="flex-1 rounded-xl bg-green-700 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Creando...' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DialogModal({ type, items, loading, onNavigate, onClose }: { type: string; items: unknown[]; loading: boolean; onNavigate: (t: string) => void; onClose: () => void }) {
  const title = type === 'TopPlantas' ? 'Top 3 Plantas con más Movimiento' : type === 'Ingresos' ? 'Últimos Ingresos' : type === 'Egresos' ? 'Últimos Egresos' : `Detalle: ${type}`;
  const navTarget = type === 'Ingresos' || type === 'Egresos' ? 'Kardex' : type === 'Ventas' ? 'Ventas' : type === 'Alertas' ? 'Alertas' : null;

  const renderItems = () => {
    if (loading) return <div className="flex justify-center py-8"><span className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" /></div>;
    if (items.length === 0) return <p className="py-6 text-center text-xs text-gray-400">Sin datos</p>;

    if (type === 'TopPlantas') {
      const counts: Record<string, number> = {};
      for (const m of items) {
        const o = m as Record<string, unknown>;
        const stock = o.stock as Record<string, unknown> | undefined;
        const ps = stock?.plant_size as Record<string, unknown> | undefined;
        const plant = ps?.plant as Record<string, unknown> | undefined;
        const name = String(plant?.name ?? ps?.name ?? 'Planta');
        counts[name] = (counts[name] ?? 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return sorted.map(([name, count], i) => (
        <div key={name} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2.5">
          <span className="text-xs font-bold text-green-800">#{i + 1} {name}</span>
          <span className="text-xs text-green-700">{count} movs</span>
        </div>
      ));
    }

    if (type === 'Alertas') {
      return items.slice(0, 20).map((a, i) => {
        const o = a as Record<string, unknown>;
        const name = String(((o.plant_size as Record<string, unknown>)?.plant as Record<string, unknown>)?.name ?? o.plant_name ?? 'Producto');
        const qty = Number(o.quantity ?? 0);
        const sev = qty === 0 ? 'Crítica' : qty <= Number(o.min_quantity ?? 0) / 2 ? 'Alta' : 'Media';
        const sevColor = qty === 0 ? 'text-red-700' : qty <= Number(o.min_quantity ?? 0) / 2 ? 'text-orange-700' : 'text-yellow-700';
        return (
          <div key={i} className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2">
            <span className="text-xs text-gray-700">{name} — {qty} uds</span>
            <span className={`text-[11px] font-bold ${sevColor}`}>{sev}</span>
          </div>
        );
      });
    }

    if (type === 'Ventas') {
      return items.slice(0, 20).map((v, i) => {
        const o = v as Record<string, unknown>;
        return (
          <div key={i} className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
            <span className="text-xs text-gray-700">{String(o.customer_name ?? 'Cliente')}</span>
            <span className="text-xs font-bold text-blue-700">${Number(o.total ?? 0).toLocaleString()}</span>
          </div>
        );
      });
    }

    if (type === 'Ingresos' || type === 'Egresos') {
      return items.slice(0, 20).map((m, i) => {
        const o = m as Record<string, unknown>;
        const stock = o.stock as Record<string, unknown> | undefined;
        const ps = stock?.plant_size as Record<string, unknown> | undefined;
        const plant = ps?.plant as Record<string, unknown> | undefined;
        const name = String(plant?.name ?? ps?.name ?? 'Producto');
        return (
          <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-700">{name}</span>
            <span className={`text-xs font-bold ${type === 'Ingresos' ? 'text-green-700' : 'text-red-700'}`}>
              {type === 'Ingresos' ? '+' : '-'}{Number(o.quantity ?? 0)}
            </span>
          </div>
        );
      });
    }

    return null;
  };

  const navLabel = type === 'TopPlantas' ? 'Ver Kardex completo' : type === 'Alertas' ? 'Ver alertas de stock' : type === 'Ventas' ? 'Ver todas las ventas' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-extrabold text-green-800">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto p-3">{renderItems()}</div>
        <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cerrar</button>
          {navLabel && navTarget && (
            <button type="button" onClick={() => onNavigate(navTarget)} className="flex-1 rounded-xl bg-green-700 py-2.5 text-xs font-bold text-white">{navLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}
