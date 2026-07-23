import type { Venta } from '../../types/venta';
import {
  formatFechaVenta,
  nombreProductoVenta,
  ventaIsAnulada,
  ventaTotal,
} from '../../types/venta';

interface VentaCardProps {
  venta: Venta;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDetail: () => void;
}

export default function VentaCard({
  venta,
  expanded,
  onToggleExpand,
  onOpenDetail,
}: VentaCardProps) {
  const total = ventaTotal(venta);
  const anulada = ventaIsAnulada(venta);
  const titulo = venta.customer_name || venta.description || 'Sin descripción';

  return (
    <article className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-500">
              #{venta.id} · {formatFechaVenta(venta.created_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge anulada={anulada} saleType={venta.sale_type} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-blue-600">${total.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">{expanded ? '▲' : '▼'} detalle</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 text-sm">
          {venta.user?.name && (
            <p className="text-xs text-gray-500">
              <span className="font-semibold">Vendedor:</span> {venta.user.name}
            </p>
          )}
          {venta.headquarter?.name && (
            <p className="mt-1 text-xs text-gray-500">
              <span className="font-semibold">Sede:</span> {venta.headquarter.name}
            </p>
          )}
          <p className="mt-2 text-xs font-semibold text-gray-600">
            {venta.sale_details.length} producto(s)
          </p>
          <ul className="mt-1 space-y-1">
            {venta.sale_details.slice(0, 4).map((d, i) => (
              <li key={d.id ?? i} className="text-xs text-gray-600">
                {nombreProductoVenta(d)} · {d.quantity} × ${d.price.toFixed(2)}
              </li>
            ))}
            {venta.sale_details.length > 4 && (
              <li className="text-xs text-gray-400">+{venta.sale_details.length - 4} más…</li>
            )}
          </ul>
          <button
            type="button"
            onClick={onOpenDetail}
            className="mt-3 w-full rounded-lg bg-blue-50 py-2 text-xs font-bold text-blue-700"
          >
            Ver detalle completo
          </button>
        </div>
      )}
    </article>
  );
}

function StatusBadge({
  anulada,
  saleType,
}: {
  anulada: boolean;
  saleType: Venta['sale_type'];
}) {
  if (anulada) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
        Anulada
      </span>
    );
  }
  return (
    <span
      className={[
        'rounded-full px-2 py-0.5 text-[10px] font-bold',
        saleType === 'wholesale'
          ? 'bg-orange-100 text-orange-700'
          : 'bg-green-100 text-green-700',
      ].join(' ')}
    >
      {saleType === 'wholesale' ? 'Por mayor' : 'Retail'}
    </span>
  );
}

interface VentaTableProps {
  ventas: Venta[];
  onRowClick: (venta: Venta) => void;
}

export function VentaTable({ ventas, onRowClick }: VentaTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Folio</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Vendedor</th>
            <th className="px-4 py-3">Sede</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => {
            const total = ventaTotal(v);
            const anulada = ventaIsAnulada(v);
            return (
              <tr
                key={v.id}
                onClick={() => onRowClick(v)}
                className="cursor-pointer border-b border-gray-50 hover:bg-blue-50/30"
              >
                <td className="px-4 py-3 font-semibold text-gray-800">#{v.id}</td>
                <td className="px-4 py-3 text-gray-600">{formatFechaVenta(v.created_at)}</td>
                <td className="px-4 py-3 text-gray-800">
                  {v.customer_name || v.description || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{v.user?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{v.headquarter?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  {anulada ? (
                    <span className="text-xs font-bold text-red-600">Anulada</span>
                  ) : (
                    <span className="text-xs font-bold text-green-600">Activa</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-blue-600">
                  ${total.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function VentaCardList({
  ventas,
  expandedId,
  onToggleExpand,
  onOpenDetail,
}: {
  ventas: Venta[];
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  onOpenDetail: (venta: Venta) => void;
}) {
  return (
    <div className="space-y-3 lg:hidden">
      {ventas.map((v) => (
        <VentaCard
          key={v.id}
          venta={v}
          expanded={expandedId === v.id}
          onToggleExpand={() => onToggleExpand(v.id)}
          onOpenDetail={() => onOpenDetail(v)}
        />
      ))}
    </div>
  );
}
