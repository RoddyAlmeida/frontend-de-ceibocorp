import type { InventarioItem, ItemEstadoValue } from '../types/inventario';
import { parseItemEstado } from '../types/inventario';

function toDouble(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v)) || 0;
}

export function toTitleCase(text: string): string {
  if (!text.trim()) return text;
  return text
    .split(' ')
    .map((word) => {
      if (!word) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function parseInventarioItem(raw: Record<string, unknown>): InventarioItem {
  const id = String(raw.id ?? '');
  let stock = 0;
  let nombre = '';
  let categoria = '';
  let tipo = '';
  let sede = '';
  let precio = 0;
  let precioMayor: number | undefined;
  let plantId: string | undefined;
  let plantSizeId: string | undefined;
  let thresholdId: string | undefined;
  let minQty: number | undefined;

  const ps = raw.plant_size;
  if (ps && typeof ps === 'object') {
    const plantSize = ps as Record<string, unknown>;
    plantSizeId = plantSize.id?.toString();
    precio = toDouble(plantSize.unit_price);
    if (plantSize.wholesale_price != null) {
      precioMayor = toDouble(plantSize.wholesale_price);
    }
    tipo = String(plantSize.size_name ?? plantSize.name ?? '');

    const plant = plantSize.plant;
    if (plant && typeof plant === 'object') {
      const p = plant as Record<string, unknown>;
      plantId = p.id?.toString();
      nombre = String(p.name ?? '');
      const cat = p.category;
      if (cat && typeof cat === 'object') {
        categoria = String((cat as Record<string, unknown>).name ?? '');
      }
      if (!tipo) tipo = String(p.type ?? '');
    }

    if (!nombre) {
      nombre = tipo || String(plantSize.name ?? 'Sin nombre');
    }
  }

  if (!nombre) nombre = String(raw.name ?? 'Sin nombre');

  stock = parseInt(String(raw.quantity ?? raw.stock ?? 0), 10) || 0;

  const hq = raw.headquarter;
  if (hq && typeof hq === 'object') {
    sede = String((hq as Record<string, unknown>).name ?? '');
  }

  const alert = raw.alert_threshold;
  if (alert && typeof alert === 'object') {
    const a = alert as Record<string, unknown>;
    minQty = parseInt(String(a.min_quantity ?? ''), 10) || undefined;
    thresholdId = a.id?.toString();
  }

  const stockMinimo = minQty ?? 10;
  const enAlerta = minQty != null ? stock <= minQty : false;

  const rawStatus = String(raw.status ?? raw.estado ?? '');
  const estado: ItemEstadoValue = parseItemEstado(
    rawStatus.length > 0 ? rawStatus : null,
  );

  return {
    id,
    nombre,
    categoria: categoria || 'Sin categoría',
    tipo,
    precio,
    precioMayor,
    stock,
    stockMinimo,
    sede,
    estado,
    enAlerta,
    plantId,
    plantSizeId,
    thresholdId,
  };
}

export function extractPaginatedList(decoded: unknown): {
  items: Record<string, unknown>[];
  total: number;
  lastPage: number;
} {
  if (Array.isArray(decoded)) {
    return { items: decoded as Record<string, unknown>[], total: decoded.length, lastPage: 1 };
  }

  if (decoded && typeof decoded === 'object') {
    const d = decoded as Record<string, unknown>;
    const data = d.data;
    if (Array.isArray(data)) {
      const meta = d.meta as Record<string, unknown> | undefined;
      const total = parseInt(
        String(meta?.total ?? d.total ?? data.length),
        10,
      );
      const lastPage = parseInt(
        String(meta?.last_page ?? d.last_page ?? 1),
        10,
      );
      return {
        items: data as Record<string, unknown>[],
        total: Number.isNaN(total) ? data.length : total,
        lastPage: Number.isNaN(lastPage) || lastPage < 1 ? 1 : lastPage,
      };
    }
  }

  return { items: [], total: 0, lastPage: 1 };
}
