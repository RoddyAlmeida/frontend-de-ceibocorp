import { useRef, useState } from 'react';
import type { Transfer, TransferDetail, TransferStatus } from '../../types/transfer';
import {
  getTransferStatusMeta,
  getStatusChangeOptions,
} from '../../types/transfer';

interface Props {
  transfer: Transfer;
  nextStatus: string;
  onConfirm: (
    status: TransferStatus,
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
  ) => Promise<void>;
  onClose: () => void;
}

interface DetailQuantities {
  received_quantity: number;
  quantity_good: number;
  quantity_recovery: number;
  quantity_discarded: number;
  original_total: number;
}

function initQuantities(details: TransferDetail[]): Record<number, DetailQuantities> {
  const map: Record<number, DetailQuantities> = {};
  for (const d of details) {
    map[d.id] = {
      received_quantity: d.quantity,
      quantity_good: d.quantity,
      quantity_recovery: 0,
      quantity_discarded: 0,
      original_total: d.quantity,
    };
  }
  return map;
}

export default function StatusChangeDialog({
  transfer,
  nextStatus,
  onConfirm,
  onClose,
}: Props) {
  const meta = getTransferStatusMeta(nextStatus);
  const options = getStatusChangeOptions([nextStatus as TransferStatus])[0];
  const [description, setDescription] = useState('');
  const [decision, setDecision] = useState<'accept' | 'reject'>('accept');
  const [quantities, setQuantities] = useState(() =>
    initQuantities(transfer.details),
  );
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQty = (
    detailId: number,
    field: keyof DetailQuantities,
    value: number,
  ) => {
    setQuantities((prev) => ({
      ...prev,
      [detailId]: { ...prev[detailId], [field]: value },
    }));
  };

  const canSubmit = () => {
    if (options.needsDescription && !description.trim()) return false;
    if (options.needsImages && images.length === 0) return false;
    if (options.needsDamagedDecision && decision === 'accept') {
      for (const d of transfer.details) {
        const q = quantities[d.id];
        if (q) {
          const sum = q.quantity_good + q.quantity_recovery + q.quantity_discarded;
          if (sum > q.original_total) return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSaving(true);
    try {
      const body: {
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
      } = { status: nextStatus };

      if (description.trim()) body.description = description.trim();

      if (options.needsDamagedDecision) {
        body.decision = decision;
        if (decision === 'accept') {
          body.details = transfer.details.map((d) => {
            const q = quantities[d.id];
            return {
              id: d.id,
              quantity_good: q?.quantity_good ?? 0,
              quantity_recovery: q?.quantity_recovery ?? 0,
              quantity_discarded: q?.quantity_discarded ?? 0,
            };
          });
        }
      } else if (nextStatus === 'partial') {
        body.details = transfer.details.map((d) => {
          const q = quantities[d.id];
          return {
            id: d.id,
            received_quantity: q?.received_quantity ?? 0,
          };
        });
      }

      await onConfirm(nextStatus as TransferStatus, body, images);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div
          className="flex items-center gap-3 p-4"
          style={{ backgroundColor: `${meta.color}14` }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <span className="text-lg">{meta.icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold" style={{ color: meta.color }}>
              Cambiar a {meta.label}
            </p>
            <p className="text-[11px] text-gray-500">
              Traslado #{transfer.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* Damaged decision */}
          {options.needsDamagedDecision && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold text-gray-700">
                ¿Qué desea hacer con los daños?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('accept')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    decision === 'accept'
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('reject')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    decision === 'reject'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  Rechazar
                </button>
              </div>
              {decision === 'reject' && (
                <p className="mt-1.5 text-[11px] italic text-red-600">
                  Al rechazar, el traslado se cancelará automáticamente.
                </p>
              )}
            </div>
          )}

          {/* Quantity details — partial or damaged+accept */}
          {options.needsQuantityDetails &&
            (!options.needsDamagedDecision || decision === 'accept') && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold" style={{ color: meta.color }}>
                  {nextStatus === 'partial'
                    ? 'Cantidades Recibidas'
                    : 'Detalle de Daños'}
                </p>
                <div className="space-y-3">
                  {transfer.details.map((d) => {
                    const q = quantities[d.id];
                    if (!q) return null;
                    const plant =
                      d.plant_size?.plant?.name ?? 'Planta';
                    const size =
                      d.plant_size?.size_name ??
                      d.plant_size?.name ??
                      '';
                    return (
                      <div
                        key={d.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <p className="text-xs font-bold text-gray-800">
                          {plant} ({size})
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          Enviado: {d.quantity} unidades
                        </p>
                        <div className="mt-2 space-y-2">
                          {nextStatus === 'partial' ? (
                            <QtyInput
                              label="Cant. Recibida"
                              value={q.received_quantity}
                              max={q.original_total}
                              color={meta.color}
                              onChange={(v) =>
                                updateQty(d.id, 'received_quantity', v)
                              }
                            />
                          ) : (
                            <>
                              <QtyInput
                                label="Buen estado"
                                value={q.quantity_good}
                                max={q.original_total}
                                color="#2E7D32"
                                onChange={(v) =>
                                  updateQty(d.id, 'quantity_good', v)
                                }
                              />
                              <QtyInput
                                label="Para Recuperación"
                                value={q.quantity_recovery}
                                max={q.original_total}
                                color="#F57F17"
                                onChange={(v) =>
                                  updateQty(d.id, 'quantity_recovery', v)
                                }
                              />
                              <QtyInput
                                label="Descartado"
                                value={q.quantity_discarded}
                                max={q.original_total}
                                color="#B71C1C"
                                onChange={(v) =>
                                  updateQty(d.id, 'quantity_discarded', v)
                                }
                              />
                              <p className="text-[11px] font-bold text-gray-500">
                                Total:{' '}
                                {q.quantity_good +
                                  q.quantity_recovery +
                                  q.quantity_discarded}{' '}
                                / {q.original_total}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Description */}
          {options.needsDescription && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-bold text-gray-600">
                Motivo / descripción del cambio *
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Stock verificado, llegó incompleto..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-green-400 focus:outline-none"
              />
            </div>
          )}

          {/* Optional description for statuses that don't require it */}
          {!options.needsDescription && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-bold text-gray-600">
                Descripción (opcional)
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Motivo del cambio..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-green-400 focus:outline-none"
              />
            </div>
          )}

          {/* Images — for damaged/partial */}
          {options.needsImages && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: meta.color }}>
                  Fotos de evidencia *
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-green-600 hover:text-green-700"
                >
                  + Añadir
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleImageAdd}
                className="hidden"
              />
              {images.length === 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-xs font-bold text-red-600">
                    Es obligatorio adjuntar fotos para este estado
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imagePreviews.map((src, idx) => (
                    <div key={src} className="relative shrink-0">
                      <img
                        src={src}
                        alt={`Evidencia ${idx + 1}`}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canSubmit()}
            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: meta.color }}
          >
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Qty input ───────────────────────────────────────────────────────────────

function QtyInput({
  label,
  value,
  max,
  color,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => value > 0 && onChange(value - 1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: `${color}14`, color }}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={0}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0 && n <= max) onChange(n);
          }}
          className="h-7 w-10 rounded-md border-0 bg-transparent text-center text-xs font-bold"
          style={{ color }}
        />
        <button
          type="button"
          onClick={() => value < max && onChange(value + 1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: `${color}14`, color }}
        >
          +
        </button>
      </div>
    </div>
  );
}
