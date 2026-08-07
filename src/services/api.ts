import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { triggerUnauthorized } from '../lib/sessionEvents';
import { parseUser } from '../types/user';
import type { User } from '../types/user';

const TOKEN_KEY = 'api_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = (): void => localStorage.removeItem(TOKEN_KEY);

const baseURL = import.meta.env.VITE_API_URL as string;

if (!baseURL) {
  console.error('[api] VITE_API_URL no está definida en el archivo .env');
}

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function handleUnauthorized(configUrl?: string) {
  const isAuthEndpoint =
    configUrl?.includes('/login') || configUrl?.includes('/register');

  if (isAuthEndpoint) return;

  console.warn('[api] Sesión expirada o token inválido (401). Cerrando sesión.');
  triggerUnauthorized();
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('[api] Tiempo de espera agotado:', error.config?.url);
      return Promise.reject(new Error('Tiempo de espera agotado'));
    }

    if (!error.response) {
      console.error('[api] Error de red:', error.message);
      return Promise.reject(new Error('Error de red'));
    }

    const { status, data, config } = error.response;

    if (status === 401) {
      handleUnauthorized(config?.url);
    }

    const message = data?.message ?? `Error ${status}`;
    console.error(`[api] ${config?.method?.toUpperCase()} ${config?.url} → ${status}:`, message);

    const apiError = new Error(message) as Error & {
      status?: number;
      errors?: Record<string, string[]>;
    };
    apiError.status = status;
    apiError.errors = data?.errors;
    return Promise.reject(apiError);
  },
);

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data } = await api.post('/login', { email, password });
  const token = data.token ?? data.access_token;
  if (token) setAuthToken(token);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/me');
  return parseUser(data);
}

export async function resolveUserHeadquarter(user: User): Promise<number | undefined> {
  if (user.headquarter_id) return user.headquarter_id;
  if (user.role === 'super_admin') return undefined;
  try {
    const { data } = await api.get('/users');
    const list: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>).data)
        ? ((data as Record<string, unknown>).data as Record<string, unknown>[])
        : [];
    const self = list.find((u) => (u as Record<string, unknown>).id === user.id);
    if (!self) return undefined;
    const raw = self as Record<string, unknown>;
    const rawHq = raw.headquarter;
    const hqId =
      (raw.headquarter_id as number | undefined) ??
      (typeof rawHq === 'object' && rawHq !== null
        ? ((rawHq as Record<string, unknown>).id as number | undefined)
        : undefined);
    return hqId;
  } catch {
    return undefined;
  }
}

export async function logout() {
  try {
    await api.post('/logout');
  } catch (err) {
    console.error('[api] Error en logout:', err);
    throw err;
  } finally {
    clearAuthToken();
  }
}

export async function register(payload: {
  name: string;
  last_name: string;
  id_card: string;
  address: string;
  email: string;
  password: string;
  password_confirmation: string;
  headquarter_id?: number;
}) {
  const { data } = await api.post('/register', payload);
  return data;
}

export function loadTokenFromStorage(): string | null {
  return getToken();
}

// ─── Plants ─────────────────────────────────────────────────────────────────

export const getPlants = () => api.get('/plants');
export const updatePlantStock = (plantId: number, stock: number) =>
  api.put(`/plants/${plantId}`, { stock });
export const createPlant = (body: Record<string, unknown>) => api.post('/plants', body);
export const updatePlant = (id: number, body: Record<string, unknown>) =>
  api.put(`/plants/${id}`, body);
export const updatePlantSize = (id: number, body: Record<string, unknown>) =>
  api.put(`/plant-sizes/${id}`, body);

// ─── Stocks ─────────────────────────────────────────────────────────────────

export const getStocks = (params?: Record<string, string>) =>
  api.get('/stocks', { params });
export const getPlantStocksGlobal = () => api.get('/stocks');
export const getByUrl = (url: string) => api.get(url);
export const getStocksPage = (page: number, perPage = 15) =>
  api.get('/stocks', { params: { page, per_page: perPage } });
export const getStocksPaged = (params: {
  page?: number;
  perPage?: number;
  search?: string;
  headquarterId?: string;
  status?: string;
  categoryId?: string;
}) =>
  api.get('/stocks', {
    params: {
      page: params.page ?? 1,
      per_page: params.perPage ?? 10,
      ...(params.search && { search: params.search }),
      ...(params.headquarterId && { headquarter_id: params.headquarterId }),
      ...(params.status && { status: params.status }),
      ...(params.categoryId && { category_id: params.categoryId }),
    },
  });
export const updateStock = (id: number, body: Record<string, unknown>) =>
  api.put(`/stocks/${id}`, body);
export const createStock = (body: Record<string, unknown>) =>
  api.post('/stocks', body);
export const getStockMovementsByStock = (stockId: number) =>
  api.get(`/stocks/${stockId}/movements`);

// ─── Kardex / Stock Movements ───────────────────────────────────────────────

export const getKardex = (params?: Record<string, string>) =>
  api.get('/kardex', { params });
export const createStockMovement = (body: Record<string, unknown>) =>
  api.post('/stock-movements', body);
export const postKardex = (data: Record<string, unknown>) =>
  api.post('/stock-movements', data);
export const getStockMovements = (params?: Record<string, string>) =>
  api.get('/stock-movements', { params });

// ─── Headquarters ───────────────────────────────────────────────────────────

export const getHeadquarters = () => api.get('/headquarters');
export const getPublicHeadquarters = () =>
  axios.get(`${baseURL}/public/headquarters`, {
    headers: { Accept: 'application/json' },
  });
export const createHeadquarter = (body: Record<string, unknown>) =>
  api.post('/headquarters', body);
export const updateHeadquarter = (id: number, body: Record<string, unknown>) =>
  api.put(`/headquarters/${id}`, body);
export const deleteHeadquarter = (id: number) =>
  api.delete(`/headquarters/${id}`);
export const getStocksByHeadquarter = (
  hqId: number,
  params?: Record<string, string>,
) => api.get(`/headquarters/${hqId}/stocks`, { params });
export const getSalesByHeadquarter = (hqId: number) =>
  api.get(`/headquarters/${hqId}/sales`);

// ─── Users ──────────────────────────────────────────────────────────────────

export const getUsers = () => api.get('/users');
export const getRoles = () => api.get('/roles');
export const toggleUserStatus = (userId: number, isActive: boolean) =>
  api.put(`/users/${userId}`, { status: isActive ? 'active' : 'inactive' });
export const updateUser = (userId: number, body: Record<string, unknown>) =>
  api.patch(`/users/${userId}`, body);
export const updateUserStatus = (userId: number, status: 'active' | 'inactive') =>
  api.patch(`/users/${userId}`, { status });

export interface CreateEmployeePayload {
  name: string;
  last_name: string;
  id_card: string;
  address: string;
  email: string;
  password: string;
  password_confirmation: string;
  headquarter_id?: number;
  role_id?: number;
}

export async function createEmployee(payload: CreateEmployeePayload) {
  const { data } = await api.post('/register', payload);
  return data;
}

export interface UpdateEmployeePayload {
  name?: string;
  last_name?: string;
  id_card?: string;
  address?: string;
  email?: string;
  password?: string;
  headquarter_id?: number;
  role_id?: number;
  status?: 'active' | 'inactive';
  is_active?: boolean;
}

export async function updateEmployee(userId: number, payload: UpdateEmployeePayload) {
  const { data } = await api.patch(`/users/${userId}`, payload);
  return data;
}

export async function toggleEmployeeStatus(userId: number, active: boolean) {
  const { data } = await api.put(`/users/${userId}`, {
    status: active ? 'active' : 'inactive',
  });
  return data;
}

// ─── Stock Alerts / Thresholds / Movements ──────────────────────────────────

export interface StockAlert {
  id: number;
  stock_id: number;
  status: string;
  quantity_at_alert: number;
  created_at: string;
  resolved_at: string | null;
  stock: {
    id: number;
    quantity: number;
    sellable_quantity?: number;
    plant_size: {
      id: number;
      size_name: string;
      plant: { id: number; name: string };
    };
    headquarter: { id: number; name: string };
  };
  threshold: {
    id: number;
    type: string;
    min_quantity: number;
  };
}

export interface AlertThreshold {
  id: number;
  type: 'category' | 'plant_size' | 'global';
  category_id?: number;
  headquarter_id?: number;
  min_quantity: number;
  active: boolean;
  description?: string;
  category?: { id: number; name: string };
  headquarter?: { id: number; name: string };
  plant_size?: { id: number; size_name: string; plant?: { id: number; name: string } };
  created_at?: string;
}

export interface StockMovement {
  id: number;
  type: 'entry' | 'exit' | 'in_stock';
  quantity: number;
  quantity_before?: number;
  quantity_after?: number;
  reason?: string;
  stock?: { id: number; plant_size?: { id: number; name: string; plant?: { id: number; name: string } } };
  created_at?: string;
}

// ─── Sales ──────────────────────────────────────────────────────────────────

export interface SaleDetailPayload {
  plant_size_id: number;
  quantity: number;
  price: number;
}

export interface CreateSalePayload {
  headquarter_id?: number;
  sale_type: 'retail' | 'wholesale';
  customer_name: string;
  customer_id_card: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  description: string;
  details: SaleDetailPayload[];
}

export const getSales = () => api.get('/sales');
export const getSalesPaged = (params?: {
  page?: number;
  perPage?: number;
  search?: string;
  from?: string;
  to?: string;
}) =>
  api.get('/sales', {
    params: {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 25,
      ...(params?.search && { search: params.search }),
      ...(params?.from && { from: params.from }),
      ...(params?.to && { to: params.to }),
    },
  });
export const getSalesByHeadquarterPaged = (
  hqId: number,
  params?: {
    page?: number;
    perPage?: number;
    search?: string;
    from?: string;
    to?: string;
  },
) =>
  api.get(`/headquarters/${hqId}/sales`, {
    params: {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 25,
      ...(params?.search && { search: params.search }),
      ...(params?.from && { from: params.from }),
      ...(params?.to && { to: params.to }),
    },
  });

/** Alias semántico — el backend expone empleados en GET /users (Flutter empleados_view.dart) */
export const getEmployees = () => api.get('/users');
export const createSale = (body: CreateSalePayload) => api.post('/sales', body);
export const deleteSale = (id: number, reason: string) =>
  api.delete(`/sales/${id}`, { data: { deleted_reason: reason } });

/**
 * Descarga el PDF del recibo de una venta (mismo template que el del correo).
 * Se hace con fetch directo para obtener un Blob (necesita header Authorization).
 */
export async function getSaleReceiptPdf(
  saleId: number,
): Promise<Blob> {
  const token = getToken();
  const resp = await fetch(`${baseURL}/sales/${saleId}/receipt-pdf`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.message ?? `Error ${resp.status}`);
  }
  return resp.blob();
}

// ─── Categories ─────────────────────────────────────────────────────────────

export const getCategories = () => api.get('/categories');
export const createCategory = (body: Record<string, unknown>) =>
  api.post('/categories', body);
export const updateCategory = (id: number, body: Record<string, unknown>) =>
  api.put(`/categories/${id}`, body);

// ─── Plant Sizes ────────────────────────────────────────────────────────────

export const getPlantSizes = () => api.get('/plant-sizes');
export const getPlantSizesByPlant = (plantId: number) =>
  api.get(`/plants/${plantId}/sizes`);
export const getStocksByPlant = (plantId: number) =>
  api.get(`/plants/${plantId}/stocks`);
export const createPlantSize = (plantId: number, body: Record<string, unknown>) =>
  api.post(`/plants/${plantId}/sizes`, body);
export const deletePlantSize = (id: number) => api.delete(`/plant-sizes/${id}`);

// ─── Transfers ──────────────────────────────────────────────────────────────

export const getTransfers = (params?: Record<string, string>) =>
  api.get('/transfers', {
    params: { ...params, _t: Date.now().toString() },
  });
export const getTransfer = (id: number) => api.get(`/transfers/${id}`);
export const createTransfer = (body: Record<string, unknown>) =>
  api.post('/transfers', body);
export const updateTransferStatus = (
  id: number,
  body: Record<string, unknown>,
  config?: AxiosRequestConfig,
) => {
  const status = body.status;
  return api.post(`/transfers/${id}/status`, body, {
    ...config,
    params: status != null ? { status: String(status) } : undefined,
  });
};
export const getTransferImages = (id: number) => api.get(`/transfers/${id}/images`);

/**
 * Multipart upload — one file per request, matching Flutter's uploadTransferImage.
 * Field name: images[]. No extra fields. Sends Authorization header only.
 * Loops sequentially if multiple files are provided.
 */
export async function uploadTransferImages(
  transferId: number,
  files: File[],
): Promise<unknown> {
  const token = getToken();
  let lastResult: unknown = null;

  for (const file of files) {
    const fd = new FormData();
    fd.append('images[]', file);

    const resp = await fetch(`${baseURL}/transfers/${transferId}/images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body?.message ?? `Error ${resp.status}`);
    }
    lastResult = await resp.json();
  }

  return lastResult;
}

export interface CreateTransferPayload {
  from_headquarter_id: number;
  to_headquarter_id: number;
  description: string;
  status: 'pending';
  details: { plant_size_id: number; quantity: number; description?: string }[];
}

export interface TransferStatusChangePayload {
  status: string;
  description?: string;
  decision?: 'accept' | 'reject';
  details?: {
    id: number;
    received_quantity?: number;
    quantity_good?: number;
    quantity_recovery?: number;
    quantity_discarded?: number;
  }[];
}

// ─── Stock Alerts ───────────────────────────────────────────────────────────

export const getStockAlerts = (params?: Record<string, string>) =>
  api.get('/stock-alerts', { params });
export const getStockAlert = (id: number) => api.get(`/stock-alerts/${id}`);

// ─── Alert Thresholds ───────────────────────────────────────────────────────

export const getAlertThresholds = (params?: Record<string, string>) =>
  api.get('/alert-thresholds', { params });
export const getAlertThreshold = (id: number) => api.get(`/alert-thresholds/${id}`);
export const createAlertThreshold = (body: Record<string, unknown>) =>
  api.post('/alert-thresholds', body);
export const updateAlertThreshold = (id: number, body: Record<string, unknown>) =>
  api.put(`/alert-thresholds/${id}`, body);
export const deleteAlertThreshold = (id: number) =>
  api.delete(`/alert-thresholds/${id}`);

// ─── Dashboard ──────────────────────────────────────────────────────────────

export const getDashboard = () => api.get('/dashboard');
