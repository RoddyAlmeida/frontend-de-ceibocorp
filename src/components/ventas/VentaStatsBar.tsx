import type { Venta } from '../../types/venta';
import { ventaTotal } from '../../types/venta';

interface VentaStatsBarProps {
  ventas: Venta[];
}

export default function VentaStatsBar({ ventas }: VentaStatsBarProps) {
  let totalMoney = 0;
  let units = 0;

  for (const v of ventas) {
    totalMoney += ventaTotal(v);
    for (const d of v.sale_details) {
      units += d.quantity;
    }
  }

  return (
    <div className="border-b border-gray-100 bg-white px-4 py-3 lg:px-8">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Ventas" value={String(ventas.length)} color="text-ceibo-green-light" />
        <Stat label="Total" value={`$${totalMoney.toFixed(2)}`} color="text-blue-600" />
        <Stat label="Unidades" value={String(units)} color="text-orange-600" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase ${color}`}>{label}</p>
      <p className={`text-sm font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
