import { useEffect, useState } from 'react';
import { useTrasladosStore } from '../store/trasladosStore';
import { useAuthStore } from '../store/authStore';
import { RolePolicy } from '../lib/rolePolicy';
import {
  TRANSFER_TABS,
  transferNextStates,
  matchesTransferTab,
  matchesTransferSearch,
} from '../types/transfer';
import type { Transfer, TransferStatus } from '../types/transfer';
import TransferCard from '../components/traslados/TransferCard';
import TransferDetailPanel from '../components/traslados/TransferDetailPanel';
import StatusChangeDialog from '../components/traslados/StatusChangeDialog';
import NewTransferDialog from '../components/traslados/NewTransferDialog';

export default function Traslados() {
  const role = useAuthStore((s) => s.role);
  const {
    transfers,
    selectedTransfer,
    activeTab,
    search,
    loading,
    error,
    toast,
    setActiveTab,
    setSearch,
    fetchTransfers,
    fetchTransferDetail,
    selectTransfer,
    createNewTransfer,
    changeStatus,
    clearToast,
  } = useTrasladosStore();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    transferId: number;
    nextStatus: string;
  } | null>(null);

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const canCreate = RolePolicy.canCreateTransfer(role);
  const canChangeStatus = RolePolicy.canChangeTransferStatus(role);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 3000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  const filtered = transfers.filter(
    (t) => matchesTransferTab(t.status, activeTab) && matchesTransferSearch(t, search),
  );

  const handleStatusChangeClick = (transferId: number, nextStatus: string) => {
    if (!canChangeStatus) return;
    setStatusChangeTarget({ transferId, nextStatus });
  };

  const handleStatusChangeConfirm = async (
    _status: TransferStatus,
    body: {
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
    },
    images: File[],
  ) => {
    if (!statusChangeTarget) return;
    try {
      await changeStatus(statusChangeTarget.transferId, body, images);
      setStatusChangeTarget(null);
    } catch {
      // error handled in store
    }
  };

  const handleOpenDetail = (transfer: Transfer) => {
    selectTransfer(transfer);
    fetchTransferDetail(transfer.id);
  };

  const targetTransfer = statusChangeTarget
    ? transfers.find((t) => t.id === statusChangeTarget.transferId)
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <h1 className="flex-1 text-lg font-extrabold text-white">
            Traslados
          </h1>
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <button
              type="button"
              onClick={() => fetchTransfers()}
              className="rounded-lg min-h-12 min-w-12 p-1.5 text-white/80 hover:bg-white/10"
            >
              ↻
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowNewDialog(true)}
              className="rounded-lg bg-white/20 min-h-12 min-w-12 p-1.5 text-white hover:bg-white/30"
              title="Nuevo traslado"
            >
              +
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-3 rounded-xl bg-white">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por sede, descripción..."
            className="w-full rounded-xl px-3 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Tabs */}
        <div className="-mb-3 flex gap-1 overflow-x-auto pb-3">
          {TRANSFER_TABS.map((tab) => {
            const isActive = activeTab === tab.status;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveTab(tab.status)}
                className={`shrink-0 rounded-lg min-h-12 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-green-800'
                    : 'text-white/60 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 pb-24 pt-4">
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {loading && transfers.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <span className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
            <p className="text-sm text-gray-500">Cargando traslados...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <span className="mb-3 text-5xl text-gray-200">🔄</span>
            <p className="text-sm text-gray-500">Sin traslados</p>
            <button
              type="button"
              onClick={() => fetchTransfers()}
              className="mt-2 text-xs font-semibold text-green-600"
            >
              Actualizar
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((t) => {
              const nexts = canChangeStatus
                ? transferNextStates(t.status, isSuperAdmin, isAdmin)
                : [];
              return (
                <TransferCard
                  key={t.id}
                  transfer={t}
                  nextStates={nexts}
                  onStatusChange={handleStatusChangeClick}
                  onOpenDetail={handleOpenDetail}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedTransfer && (
        <TransferDetailPanel
          transfer={selectedTransfer}
          onStatusChange={handleStatusChangeClick}
          onClose={() => selectTransfer(null)}
        />
      )}

      {/* Status change dialog */}
      {statusChangeTarget && targetTransfer && (
        <StatusChangeDialog
          transfer={targetTransfer}
          nextStatus={statusChangeTarget.nextStatus}
          onConfirm={handleStatusChangeConfirm}
          onClose={() => setStatusChangeTarget(null)}
        />
      )}

      {/* New transfer dialog */}
      {showNewDialog && (
        <NewTransferDialog
          currentHqId={useAuthStore.getState().user?.headquarterId}
          onCrear={createNewTransfer}
          onClose={() => setShowNewDialog(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
