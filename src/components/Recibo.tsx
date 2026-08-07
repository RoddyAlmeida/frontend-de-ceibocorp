import { nombreProductoVenta, formatFechaVenta } from '../types/venta';

const EMPRESA = {
  nombre: 'CEIBO CORP',
  ruc: '0999999999001',
  direccion: 'Av. Principal s/n, Santo Domingo de los Tsáchilas, Ecuador',
};

interface ReciboDetail {
  quantity: number;
  price: number;
  plant_size?: {
    plant?: { name?: string };
    size_name?: string;
    name?: string;
  };
}

interface ReciboVenta {
  id?: number | string;
  created_at?: string;
  customer_name?: string;
  total?: number;
  amount?: number;
  sale_details?: ReciboDetail[];
  details?: ReciboDetail[];
  user?: { name?: string; last_name?: string };
  headquarter?: { name?: string };
}

interface ReciboProps {
  venta: ReciboVenta;
  sellerName?: string;
  sedeName?: string;
  showSede?: boolean;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}

function parseNum(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val)) || 0;
}

function parseIntSafe(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return parseInt(String(val), 10) || 0;
}

function calcTotal(venta: ReciboVenta): number {
  if (venta.total != null) return parseNum(venta.total);
  if (venta.amount != null) return parseNum(venta.amount);
  const details = venta.sale_details ?? venta.details ?? [];
  return details.reduce((s, d) => s + parseNum(d.price) * parseIntSafe(d.quantity), 0);
}

export function Recibo({ venta, sellerName, sedeName, showSede, innerRef }: ReciboProps) {
  const details = venta.sale_details ?? venta.details ?? [];
  const total = calcTotal(venta);
  const sede = sedeName ?? venta.headquarter?.name;

  return (
    <div
      ref={innerRef}
      className="w-full rounded-xl bg-white p-4 font-mono text-xs text-gray-800 shadow-md"
    >
      <h2 className="text-center text-lg font-black text-ceibo-green">{EMPRESA.nombre}</h2>
      {showSede && sede && (
        <p className="text-center text-[11px] text-gray-600">{sede}</p>
      )}
      <p className="text-center text-[11px] text-gray-600">RUC: {EMPRESA.ruc}</p>

      <p className="mt-2 text-center text-[10px] italic leading-tight text-gray-400">
        Documento sin validez tributaria, no reemplaza factura electrónica.
      </p>

      <hr className="my-3 border-dashed border-gray-300" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <p>
          <span className="text-gray-500">N.° de nota: </span>
          <span className="font-semibold">{venta.id ?? '—'}</span>
        </p>
        <p>
          <span className="text-gray-500">Fecha: </span>
          <span className="font-semibold">{formatFechaVenta(venta.created_at ?? null)}</span>
        </p>
        {sellerName && (
          <p>
            <span className="text-gray-500">Vendedor: </span>
            <span className="font-semibold">{sellerName}</span>
          </p>
        )}
        <p>
          <span className="text-gray-500">Cliente: </span>
          <span className="font-semibold">{venta.customer_name ?? 'Consumidor Final'}</span>
        </p>
      </div>

      <hr className="my-3 border-dashed border-gray-300" />

      <table className="mt-1 w-full border-collapse text-[11px] leading-[1.6]">
        <thead>
          <tr className="text-[10px] font-bold text-gray-500">
            <th className="pb-1 text-left">Producto</th>
            <th className="w-10 pb-1 text-right">Cant.</th>
            <th className="w-16 pb-1 text-right">P.unit.</th>
            <th className="w-16 pb-1 text-right">Subt.</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d, i) => {
            const qty = parseIntSafe(d.quantity);
            const price = parseNum(d.price);
            return (
              <tr key={i}>
                <td className="max-w-0 truncate py-1.5 font-semibold">{nombreProductoVenta(d)}</td>
                <td className="py-1.5 text-right">{qty}</td>
                <td className="py-1.5 text-right">${price.toFixed(2)}</td>
                <td className="py-1.5 text-right font-bold">${(price * qty).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr className="my-3 border-dashed border-gray-300" />

      <div className="flex w-full justify-end">
        <span className="text-lg font-black text-ceibo-green">${total.toFixed(2)}</span>
      </div>

      <hr className="my-3 border-dashed border-gray-300" />

      <p className="text-center text-[9px] text-gray-400">
        Comprobante interno de venta — sin validez ante el SRI
      </p>
    </div>
  );
}
