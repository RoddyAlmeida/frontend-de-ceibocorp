import * as XLSX from 'xlsx';
import type { Venta } from '../types/venta';
import { formatFechaVenta, nombreProductoVenta, ventaTotal } from '../types/venta';

export function exportVentasToXlsx(ventas: Venta[], filename = 'historial-ventas.xlsx') {
  const rows = ventas.map((v) => {
    const productos = v.sale_details
      .map((d) => `${nombreProductoVenta(d)} x${d.quantity}`)
      .join('; ');
    return {
      Folio: v.id,
      Fecha: formatFechaVenta(v.created_at),
      Cliente: v.customer_name,
      Cédula: v.customer_id_card ?? '',
      Tipo: v.sale_type === 'wholesale' ? 'Por mayor' : 'Retail',
      Total: ventaTotal(v),
      Estado: v.deleted_at ? 'Anulada' : 'Activa',
      Vendedor: v.user?.name ?? '',
      Sede: v.headquarter?.name ?? '',
      Productos: productos,
      Descripción: v.description ?? '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  XLSX.writeFile(wb, filename);
}
