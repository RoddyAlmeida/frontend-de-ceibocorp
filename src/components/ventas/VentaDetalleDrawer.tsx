import { useState } from 'react';
import { RolePolicy } from '../../lib/rolePolicy';
import { deleteSale } from '../../services/api';
import type { Role } from '../../types/role';
import type { Venta } from '../../types/venta';
import {
  formatFechaVenta,
  nombreProductoVenta,
  ventaIsAnulada,
  ventaTotal,
} from '../../types/venta';

interface VentaDetalleDrawerProps {
  venta: Venta | null;
  role: Role | null;
  onClose: () => void;
  onAnulada: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export default function VentaDetalleDrawer({
  venta,
  role,
  onClose,
  onAnulada,
  onToast,
}: VentaDetalleDrawerProps) {
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  if (!venta) return null;

  const total = ventaTotal(venta);
  const anulada = ventaIsAnulada(venta);
  const canVoid = RolePolicy.canVoidSale(role) && !anulada;

  const handlePrint = () => {
    const html = buildReceiptHtml(venta, total);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      console.error('[ventas] No se pudo crear iframe para imprimir');
      onToast('No se pudo abrir la impresión', 'err');
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => {
      iframe.contentWindow?.print();
      iframe.remove();
    }, 300);
  };

  const handleVoid = async () => {
    const reason = voidReason.trim();
    if (!reason) return;
    setVoiding(true);
    try {
      await deleteSale(venta.id, reason);
      onToast('Venta anulada');
      setVoidOpen(false);
      setVoidReason('');
      onAnulada();
      onClose();
    } catch (err) {
      console.error('[ventas] Error al anular venta:', err);
      onToast(err instanceof Error ? err.message : 'Error al anular venta', 'err');
    } finally {
      setVoiding(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex flex-col bg-black/40 lg:items-end lg:justify-stretch">
        <button
          type="button"
          aria-label="Cerrar"
          className="flex-1 lg:hidden"
          onClick={onClose}
        />
        <div className="flex max-h-[92vh] min-h-0 flex-col rounded-t-2xl bg-white lg:h-full lg:max-h-none lg:w-full lg:max-w-lg lg:rounded-none lg:shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Venta #{venta.id}</h2>
              <p className="text-xs text-gray-500">{formatFechaVenta(venta.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
              <span className="text-sm font-bold text-blue-800">Total</span>
              <span className="text-xl font-extrabold text-blue-700">${total.toFixed(2)}</span>
            </div>

            {anulada && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                Venta anulada
                {venta.deleted_reason ? `: ${venta.deleted_reason}` : ''}
              </div>
            )}

            <InfoRow label="Cliente" value={venta.customer_name} />
            {venta.customer_id_card && (
              <InfoRow label="Cédula" value={venta.customer_id_card} />
            )}
            {venta.description && <InfoRow label="Descripción" value={venta.description} />}
            {venta.user?.name && <InfoRow label="Vendedor" value={venta.user.name} />}
            {venta.headquarter?.name && <InfoRow label="Sede" value={venta.headquarter.name} />}

            <h3 className="mb-2 mt-4 text-sm font-bold text-ceibo-green">
              Productos ({venta.sale_details.length})
            </h3>
            <div className="space-y-2">
              {venta.sale_details.length === 0 ? (
                <p className="text-sm text-gray-500">Sin detalle de productos</p>
              ) : (
                venta.sale_details.map((d, i) => (
                  <div
                    key={d.id ?? i}
                    className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {nombreProductoVenta(d)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {d.quantity} × ${d.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-bold text-blue-700">
                      ${(d.quantity * d.price).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Imprimir recibo
            </button>
            {canVoid && (
              <button
                type="button"
                onClick={() => setVoidOpen(true)}
                className="w-full rounded-xl border border-red-200 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                Anular venta
              </button>
            )}
          </div>
        </div>
      </div>

      {voidOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Anular venta</h3>
            <p className="mt-1 text-sm text-gray-600">Indica el motivo de la anulación.</p>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-400"
              placeholder="Motivo de la anulación…"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setVoidOpen(false)}
                disabled={voiding}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={voiding || !voidReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {voiding ? 'Anulando…' : 'Anular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="shrink-0 text-gray-500">{label}:</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReceiptHtml(venta: Venta, total: number): string {
  const rows = venta.sale_details
    .map(
      (d) =>
        `<tr><td style="text-align:center">${d.quantity}</td><td>${escapeHtml(nombreProductoVenta(d))}</td><td style="text-align:right">$${d.price.toFixed(2)}</td><td style="text-align:right">$${(d.quantity * d.price).toFixed(2)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:Courier New,monospace;font-size:12px;padding:8px}
  h1{text-align:center;font-size:18px} table{width:100%;border-collapse:collapse}
  th,td{padding:4px 2px} th{border-bottom:1px dashed #999}
  </style></head><body>
  <h1>CEIBO CORP</h1>
  <h2 style="text-align:center">Nota de Venta #${venta.id}</h2>
  <p style="text-align:center">${formatFechaVenta(venta.created_at)}</p>
  <p><b>Cliente:</b> ${escapeHtml(venta.customer_name)}</p>
  <p><b>Cédula:</b> ${escapeHtml(venta.customer_id_card ?? '—')}</p>
  <table><tr><th>Cant</th><th>Producto</th><th>P.Unit</th><th>Subtotal</th></tr>${rows}
  <tr><td colspan="3" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right"><b>$${total.toFixed(2)}</b></td></tr></table>
  <p style="text-align:center;margin-top:12px">Gracias por su compra</p>
  </body></html>`;
}
