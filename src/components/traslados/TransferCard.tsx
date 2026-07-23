import { useState } from 'react';
import type { Transfer } from '../../types/transfer';
import {
  getTransferStatusMeta,
  getTransferDisplayGroup,
  transferPlantName,
} from '../../types/transfer';

interface Props {
  transfer: Transfer;
  nextStates: string[];
  onStatusChange: (transferId: number, nextStatus: string) => void;
  onOpenDetail: (transfer: Transfer) => void;
}

const DISPLAY_GROUP_STYLE: Record<string, string> = {
  green:  'border-l-emerald-400',
  yellow: 'border-l-yellow-400',
  red:    'border-l-red-400',
};

export default function TransferCard({
  transfer,
  nextStates,
  onStatusChange,
  onOpenDetail,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const meta = getTransferStatusMeta(transfer.status);
  const group = getTransferDisplayGroup(transfer.status);
  const borderClass = DISPLAY_GROUP_STYLE[group] ?? 'border-l-gray-300';
  const from = transfer.from_headquarter?.name ?? 'Sin sede';
  const to = transfer.to_headquarter?.name ?? 'Sin sede';
  const fecha = transfer.created_at?.substring(0, 10) ?? '';
  const details = transfer.details ?? [];

  return (
    <div
      className={`mb-2.5 rounded-xl border border-gray-200 border-l-4 ${borderClass} bg-white shadow-sm`}
    >
      {/* Header row — tappable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        {/* Status icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${meta.color}14` }}
        >
          <span className="text-base">{meta.icon}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <span className="truncate">{from}</span>
            <span className="text-gray-400">→</span>
            <span className="truncate">{to}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
            >
              {meta.icon} {meta.label}
            </span>
            <span className="text-[11px] text-gray-400">
              #{transfer.id} · {fecha}
            </span>
          </div>
          {transfer.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
              {transfer.description}
            </p>
          )}
        </div>

        {/* Chevron */}
        <span className="text-lg text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-2.5">
          {/* Products */}
          {details.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-bold text-green-800">
                Productos ({details.length})
              </p>
              <div className="space-y-1">
                {details.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <span className="text-green-500">🌿</span>
                      {transferPlantName(d)}
                    </span>
                    <span className="font-bold text-green-700">
                      {d.quantity} un.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status change buttons */}
          {nextStates.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-gray-600">
                Cambiar estado
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nextStates.map((ns) => {
                  const nsMeta = getTransferStatusMeta(ns);
                  return (
                    <button
                      key={ns}
                      type="button"
                      onClick={() => onStatusChange(transfer.id, ns)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: nsMeta.color }}
                    >
                      {nsMeta.icon} {nsMeta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* View detail button */}
          <button
            type="button"
            onClick={() => onOpenDetail(transfer)}
            className="mt-3 w-full rounded-lg border border-green-200 bg-green-50 py-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
          >
            Ver detalle completo
          </button>
        </div>
      )}
    </div>
  );
}
