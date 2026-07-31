export interface SaleDetail {
  id?: number;
  plant_size_id?: number;
  quantity: number;
  price: number;
  plant_size?: {
    size_name?: string;
    name?: string;
    plant?: { name?: string };
  };
}

export interface Venta {
  id: number;
  total: number;
  customer_name: string;
  customer_id_card?: string;
  customer_phone?: string;
  customer_address?: string;
  description?: string;
  sale_type: 'retail' | 'wholesale';
  created_at: string;
  deleted_at?: string | null;
  deleted_reason?: string | null;
  user?: { name?: string; last_name?: string };
  headquarter?: { name?: string };
  sale_details: SaleDetail[];
}

export function parseVenta(raw: Record<string, unknown>): Venta {
  const detailsRaw =
    (raw.sale_details as unknown[]) ?? (raw.details as unknown[]) ?? [];

  return {
    id: raw.id as number,
    total: parseMoney(raw.total ?? raw.amount),
    customer_name: String(raw.customer_name ?? 'Consumidor Final'),
    customer_id_card: raw.customer_id_card as string | undefined,
    customer_phone: raw.customer_phone as string | undefined,
    customer_address: raw.customer_address as string | undefined,
    description: raw.description as string | undefined,
    sale_type: (raw.sale_type as 'retail' | 'wholesale') ?? 'retail',
    created_at: String(raw.created_at ?? ''),
    deleted_at: raw.deleted_at as string | null | undefined,
    deleted_reason: raw.deleted_reason as string | null | undefined,
    user: raw.user as Venta['user'],
    headquarter: raw.headquarter as Venta['headquarter'],
    sale_details: detailsRaw.map((d) => {
      const item = d as Record<string, unknown>;
      return {
        id: item.id as number | undefined,
        plant_size_id: item.plant_size_id as number | undefined,
        quantity: parseInt(String(item.quantity ?? 0), 10),
        price: parseMoney(item.price),
        plant_size: item.plant_size as SaleDetail['plant_size'],
      };
    }),
  };
}

export function parseMoney(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
}

export function ventaTotal(venta: Venta): number {
  if (venta.total > 0) return venta.total;
  return venta.sale_details.reduce((sum, d) => sum + d.price * d.quantity, 0);
}

export function ventaIsAnulada(venta: Venta): boolean {
  return venta.deleted_at != null && venta.deleted_at !== '';
}

export function nombreProductoVenta(d: SaleDetail): string {
  const ps = d.plant_size;
  if (!ps) return 'Producto';
  const pName = ps.plant?.name ?? '';
  const sName = ps.size_name ?? ps.name ?? '';
  if (pName && sName) return `${pName} (${sName})`;
  return pName || sName || 'Producto';
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatFechaVenta(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    const h = String(dt.getHours()).padStart(2, '0');
    const m = String(dt.getMinutes()).padStart(2, '0');
    return `${dt.getDate()} ${MESES[dt.getMonth()]} ${dt.getFullYear()} ${h}:${m}`;
  } catch {
    return raw;
  }
}

export function formatFechaCorta(raw: string): string {
  try {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toISOString().slice(0, 10);
  } catch {
    return raw;
  }
}
