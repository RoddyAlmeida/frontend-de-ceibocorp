import { create } from 'zustand';
import {
  getTransfers,
  getTransfer,
  createTransfer,
  updateTransferStatus,
  uploadTransferImages,
} from '../services/api';
import type { CreateTransferPayload, TransferStatusChangePayload } from '../services/api';
import type { Transfer, TransferStatus } from '../types/transfer';
import { parseTransfer } from '../types/transfer';

interface TrasladosState {
  transfers: Transfer[];
  selectedTransfer: Transfer | null;
  activeTab: TransferStatus | null;
  search: string;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  toast: string | null;

  setActiveTab: (tab: TransferStatus | null) => void;
  setSearch: (q: string) => void;
  fetchTransfers: (headquarterId?: number) => Promise<void>;
  fetchTransferDetail: (id: number) => Promise<void>;
  selectTransfer: (t: Transfer | null) => void;
  createNewTransfer: (payload: CreateTransferPayload) => Promise<void>;
  changeStatus: (
    transferId: number,
    payload: TransferStatusChangePayload,
    images?: File[],
  ) => Promise<void>;
  clearToast: () => void;
  reset: () => void;
}

function extractList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const inner = d.data;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  return [];
}

export const useTrasladosStore = create<TrasladosState>((set, get) => ({
  transfers: [],
  selectedTransfer: null,
  activeTab: null,
  search: '',
  loading: false,
  detailLoading: false,
  error: null,
  toast: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearch: (q) => set({ search: q }),

  fetchTransfers: async (headquarterId?: number) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = {};
      if (headquarterId) params.headquarter_id = String(headquarterId);
      const { data } = await getTransfers(params);
      const list = extractList(data).map(parseTransfer);
      set({ transfers: list, loading: false });
    } catch (err) {
      console.error('[traslados] Error al cargar traslados:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al cargar traslados',
        loading: false,
      });
    }
  },

  fetchTransferDetail: async (id) => {
    set({ detailLoading: true });
    try {
      const { data } = await getTransfer(id);
      const transfer = parseTransfer(data as Record<string, unknown>);
      set({ selectedTransfer: transfer, detailLoading: false });
    } catch (err) {
      console.error('[traslados] Error al cargar detalle:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al cargar detalle',
        detailLoading: false,
      });
    }
  },

  selectTransfer: (t) => set({ selectedTransfer: t }),

  createNewTransfer: async (payload) => {
    set({ loading: true, error: null });
    try {
      await createTransfer(payload as unknown as Record<string, unknown>);
      set({ toast: 'Traslado creado correctamente', loading: false });
      await get().fetchTransfers();
    } catch (err) {
      console.error('[traslados] Error al crear traslado:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al crear traslado',
        loading: false,
      });
      throw err;
    }
  },

  changeStatus: async (transferId, payload, images) => {
    set({ error: null });
    try {
      await updateTransferStatus(
        transferId,
        payload as unknown as Record<string, unknown>,
      );

      if (images && images.length > 0) {
        await uploadTransferImages(transferId, images);
      }

      set({ toast: 'Traslado actualizado' });
      await get().fetchTransfers();

      const sel = get().selectedTransfer;
      if (sel && sel.id === transferId) {
        await get().fetchTransferDetail(transferId);
      }
    } catch (err) {
      console.error('[traslados] Error al cambiar estado:', err);
      set({
        error: err instanceof Error ? err.message : 'Error al cambiar estado',
      });
      throw err;
    }
  },

  clearToast: () => set({ toast: null }),
  reset: () =>
    set({
      transfers: [],
      selectedTransfer: null,
      activeTab: null,
      search: '',
      loading: false,
      detailLoading: false,
      error: null,
      toast: null,
    }),
}));
