export type ItemEstadoValue =
  | 'available'
  | 'pending_arrival'
  | 'exit_slope'
  | 'pending_registration'
  | 'in_transportation'
  | 'not_available';

export interface ItemEstadoMeta {
  value: ItemEstadoValue;
  label: string;
  color: string;
  icon: string;
}

export const ITEM_ESTADOS: ItemEstadoMeta[] = [
  { value: 'available', label: 'Disponible', color: '#2E7D32', icon: '✓' },
  { value: 'pending_arrival', label: 'Pendiente de llegada', color: '#00838F', icon: '⏳' },
  { value: 'exit_slope', label: 'Pendiente de salida', color: '#F57F17', icon: '⏱' },
  { value: 'pending_registration', label: 'Pendiente de registrar', color: '#0288D1', icon: '📝' },
  { value: 'in_transportation', label: 'En transporte', color: '#6A1B9A', icon: '🚚' },
  { value: 'not_available', label: 'No disponible', color: '#B71C1C', icon: '✕' },
];

export function parseItemEstado(raw?: string | null): ItemEstadoValue {
  const v = (raw ?? '').toLowerCase().trim();
  switch (v) {
    case 'available':
    case 'disponible':
      return 'available';
    case 'pending_arrival':
    case 'pendiente de llegada':
      return 'pending_arrival';
    case 'pending_exit':
    case 'exit_slope':
    case 'pendiente de salida':
      return 'exit_slope';
    case 'pending_registration':
    case 'pendiente de registrar':
      return 'pending_registration';
    case 'in_transportation':
    case 'in_transport':
    case 'en transporte':
      return 'in_transportation';
    case 'not_available':
    case 'no disponible':
      return 'not_available';
    default:
      return 'available';
  }
}

export function getEstadoMeta(value: ItemEstadoValue): ItemEstadoMeta {
  return ITEM_ESTADOS.find((e) => e.value === value) ?? ITEM_ESTADOS[0];
}

export interface InventarioItem {
  id: string;
  nombre: string;
  categoria: string;
  tipo: string;
  precio: number;
  precioMayor?: number;
  stock: number;
  stockMinimo: number;
  sede: string;
  estado: ItemEstadoValue;
  enAlerta: boolean;
  plantId?: string;
  plantSizeId?: string;
  thresholdId?: string;
}

export interface InventarioFilters {
  sede: string | null;
  headquarterId: string | null;
  categoryId: string | null;
  estado: string | null;
  soloAlertas: boolean;
  soloRecuperacion: boolean;
  search: string;
}

export const DEFAULT_INVENTARIO_FILTERS: InventarioFilters = {
  sede: null,
  headquarterId: null,
  categoryId: null,
  estado: null,
  soloAlertas: false,
  soloRecuperacion: false,
  search: '',
};

export interface CategoriaOption {
  id: string;
  name: string;
}

export interface StockMovement {
  id?: number | string;
  type?: string;
  quantity?: number;
  quantity_before?: number;
  quantity_after?: number;
  reason?: string;
  description?: string;
  created_at?: string;
  user?: { name?: string };
  stock?: {
    headquarter?: { name?: string };
    plant_size?: {
      plant?: { name?: string };
      size_name?: string;
      name?: string;
    };
  };
}
