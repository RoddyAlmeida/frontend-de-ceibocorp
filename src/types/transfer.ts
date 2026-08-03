// ─── Status ──────────────────────────────────────────────────────────────────

export type TransferStatus =
  | 'pending'
  | 'approved'
  | 'in_transport'
  | 'completed'
  | 'rejected'
  | 'canceled'
  | 'damaged'
  | 'partial';

export interface TransferStatusMeta {
  value: TransferStatus;
  label: string;
  color: string;
  bgTailwind: string;
  textTailwind: string;
  icon: string;
}

export const TRANSFER_STATUSES: TransferStatusMeta[] = [
  { value: 'pending',      label: 'Pendiente',     color: '#F57F17', bgTailwind: 'bg-yellow-100',  textTailwind: 'text-yellow-700',  icon: '⏱' },
  { value: 'approved',     label: 'Aprobado',      color: '#1565C0', bgTailwind: 'bg-blue-100',   textTailwind: 'text-blue-700',    icon: '👍' },
  { value: 'in_transport', label: 'En transporte', color: '#6A1B9A', bgTailwind: 'bg-purple-100', textTailwind: 'text-purple-700',  icon: '🚚' },
  { value: 'completed',    label: 'Completado',    color: '#2E7D32', bgTailwind: 'bg-green-100',  textTailwind: 'text-green-700',   icon: '✅' },
  { value: 'rejected',     label: 'Rechazado',     color: '#B71C1C', bgTailwind: 'bg-red-100',    textTailwind: 'text-red-700',     icon: '❌' },
  { value: 'canceled',     label: 'Cancelado',     color: '#546E7A', bgTailwind: 'bg-gray-100',   textTailwind: 'text-gray-600',    icon: '🚫' },
  { value: 'damaged',      label: 'Dañado',        color: '#D84315', bgTailwind: 'bg-orange-100', textTailwind: 'text-orange-700',  icon: '⚠️' },
  { value: 'partial',      label: 'Parcial',       color: '#EF6C00', bgTailwind: 'bg-amber-100',  textTailwind: 'text-amber-700',   icon: '🔶' },
];

export function getTransferStatusMeta(status: string): TransferStatusMeta {
  const s = status.toLowerCase().trim() as TransferStatus;
  return TRANSFER_STATUSES.find((m) => m.value === s) ?? TRANSFER_STATUSES[0];
}

/** Display group: green (active), yellow (done), red (terminal) */
export type TransferDisplayGroup = 'green' | 'yellow' | 'red';

export function getTransferDisplayGroup(status: string): TransferDisplayGroup {
  const s = status.toLowerCase().trim();
  if (s === 'pending' || s === 'approved' || s === 'in_transport') return 'green';
  if (s === 'completed') return 'yellow';
  return 'red';
}

// ─── State machine (mirrors _TC.nextStates in Flutter) ───────────────────────

export function transferNextStates(
  currentStatus: string,
  isSuperAdmin: boolean,
  isAdmin: boolean,
): TransferStatus[] {
  if (!isSuperAdmin && !isAdmin) return [];
  const s = currentStatus.toLowerCase().trim();
  switch (s) {
    case 'pending':
      return ['approved', 'rejected', 'canceled'];
    case 'approved':
      return ['in_transport', 'canceled'];
    case 'in_transport':
      return ['completed', 'canceled', 'damaged', 'partial'];
    default:
      return [];
  }
}

// ─── Tabs (mirrors Flutter _tabs) ────────────────────────────────────────────

export interface TransferTab {
  label: string;
  status: TransferStatus | null;
}

export const TRANSFER_TABS: TransferTab[] = [
  { label: 'Todos',       status: null },
  { label: 'Pendiente',   status: 'pending' },
  { label: 'Aprobado',    status: 'approved' },
  { label: 'En tránsito', status: 'in_transport' },
  { label: 'Completado',  status: 'completed' },
  { label: 'Rechazado',   status: 'rejected' },
  { label: 'Cancelado',   status: 'canceled' },
  { label: 'Dañado',      status: 'damaged' },
  { label: 'Parcial',     status: 'partial' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TransferPlantRef {
  id: number;
  name: string;
}

export interface TransferPlantSize {
  id: number;
  size_name: string;
  name: string;
  plant: TransferPlantRef;
}

export interface TransferDetail {
  id: number;
  plant_size_id: number;
  quantity: number;
  description: string;
  plant_size: TransferPlantSize | null;
}

export interface TransferHeadquarter {
  id: number;
  name: string;
}

export interface TransferUser {
  id: number;
  name: string;
}

export interface TransferImage {
  id: number;
  description: string;
  url: string;
  image_url?: string;
  created_at: string;
  user?: TransferUser | null;
}

export interface Transfer {
  id: number;
  description: string;
  status: TransferStatus;
  from_headquarter: TransferHeadquarter | null;
  to_headquarter: TransferHeadquarter | null;
  user: TransferUser | null;
  created_at: string;
  updated_at: string;
  details: TransferDetail[];
  transfer_images?: TransferImage[];
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function str(v: unknown, fallback = ''): string {
  return v != null ? String(v) : fallback;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseHq(raw: unknown): TransferHeadquarter | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return { id: num(o.id), name: str(o.name, 'Sin sede') };
}

function parseUser(raw: unknown): TransferUser | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return { id: num(o.id), name: str(o.name, 'Sin usuario') };
}

function parsePlantSize(raw: unknown): TransferPlantSize | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const plantRaw = o.plant;
  const plant: TransferPlantRef =
    plantRaw != null && typeof plantRaw === 'object'
      ? { id: num((plantRaw as Record<string, unknown>).id), name: str((plantRaw as Record<string, unknown>).name, 'Planta') }
      : { id: 0, name: str(plantRaw, 'Planta') };
  return {
    id: num(o.id),
    size_name: str(o.size_name ?? o.name, 'Talla'),
    name: str(o.name),
    plant,
  };
}

function parseDetail(raw: unknown): TransferDetail {
  if (raw == null || typeof raw !== 'object') {
    return { id: 0, plant_size_id: 0, quantity: 0, description: '', plant_size: null };
  }
  const o = raw as Record<string, unknown>;
  return {
    id: num(o.id),
    plant_size_id: num(o.plant_size_id),
    quantity: num(o.quantity),
    description: str(o.description),
    plant_size: parsePlantSize(o.plant_size),
  };
}

function parseImage(raw: unknown): TransferImage | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const url = str(o.url ?? o.image_url);
  if (!url) return null;
  return {
    id: num(o.id),
    description: str(o.description),
    url,
    image_url: str(o.image_url) || undefined,
    created_at: str(o.created_at),
    user: parseUser(o.user),
  };
}

function parseStatus(raw: unknown): TransferStatus {
  const s = str(raw, 'pending').toLowerCase().trim();
  switch (s) {
    case 'approved':     return 'approved';
    case 'in_transport': return 'in_transport';
    case 'completed':    return 'completed';
    case 'rejected':     return 'rejected';
    case 'canceled':     return 'canceled';
    case 'damaged':      return 'damaged';
    case 'partial':      return 'partial';
    default:             return 'pending';
  }
}

export function parseTransfer(raw: Record<string, unknown>): Transfer {
  return {
    id: num(raw.id),
    description: str(raw.description),
    status: parseStatus(raw.status),
    from_headquarter: parseHq(raw.from_headquarter),
    to_headquarter: parseHq(raw.to_headquarter),
    user: parseUser(raw.user),
    created_at: str(raw.created_at),
    updated_at: str(raw.updated_at),
    details: Array.isArray(raw.details)
      ? raw.details.map(parseDetail)
      : [],
    transfer_images: Array.isArray(raw.images)
      ? raw.images.map(parseImage).filter((x): x is TransferImage => x != null)
      : undefined,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function transferPlantName(detail: TransferDetail): string {
  const plant = detail.plant_size?.plant?.name ?? 'Planta';
  const size = detail.plant_size?.size_name ?? detail.plant_size?.name ?? '';
  return size ? `${plant} (${size})` : plant;
}

export function transferStatusLabel(status: string): string {
  return getTransferStatusMeta(status).label;
}

export function transferStatusColor(status: string): string {
  return getTransferStatusMeta(status).color;
}

// ─── Tabs for status change dialog ───────────────────────────────────────────

export interface StatusChangeOption {
  status: TransferStatus;
  label: string;
  color: string;
  needsDescription: boolean;
  needsImages: boolean;
  needsQuantityDetails: boolean;
  needsDamagedDecision: boolean;
}

export function getStatusChangeOptions(nextStatuses: TransferStatus[]): StatusChangeOption[] {
  return nextStatuses.map((status) => ({
    status,
    label: transferStatusLabel(status),
    color: transferStatusColor(status),
    needsDescription: status === 'canceled' || status === 'damaged' || status === 'partial',
    needsImages: status === 'damaged' || status === 'partial',
    needsQuantityDetails: status === 'partial' || status === 'damaged',
    needsDamagedDecision: status === 'damaged',
  }));
}

// ─── Transfer tab filtering ──────────────────────────────────────────────────

export function matchesTransferTab(transferStatus: string, tabStatus: TransferStatus | null): boolean {
  if (tabStatus == null) return true;
  return transferStatus.toLowerCase().trim() === tabStatus;
}

export function matchesTransferSearch(
  t: Transfer,
  query: string,
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const from = t.from_headquarter?.name ?? '';
  const to = t.to_headquarter?.name ?? '';
  return (
    t.description.toLowerCase().includes(q) ||
    from.toLowerCase().includes(q) ||
    to.toLowerCase().includes(q) ||
    String(t.id).includes(q)
  );
}
