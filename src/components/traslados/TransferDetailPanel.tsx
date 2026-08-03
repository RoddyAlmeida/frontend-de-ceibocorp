import { useCallback, useEffect, useRef, useState } from 'react';
import type { Transfer, TransferImage } from '../../types/transfer';
import {
  getTransferStatusMeta,
  getTransferDisplayGroup,
  transferPlantName,
} from '../../types/transfer';
import { useAuthStore } from '../../store/authStore';
import { RolePolicy } from '../../lib/rolePolicy';
import { transferNextStates } from '../../types/transfer';
import { getTransferImages, uploadTransferImages } from '../../services/api';

interface Props {
  transfer: Transfer;
  onStatusChange: (transferId: number, nextStatus: string) => void;
  onClose: () => void;
}

export default function TransferDetailPanel({
  transfer,
  onStatusChange,
  onClose,
}: Props) {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const canUploadEvidence = RolePolicy.canUploadEvidence(role);

  const nextStates = transferNextStates(transfer.status, isSuperAdmin, isAdmin);
  const meta = getTransferStatusMeta(transfer.status);
  const group = getTransferDisplayGroup(transfer.status);
  const from = transfer.from_headquarter?.name ?? 'Sin sede';
  const to = transfer.to_headquarter?.name ?? 'Sin sede';
  const fecha = transfer.created_at?.substring(0, 10) ?? '';
  const details = transfer.details ?? [];

  // Evidence upload
  const [evidenceImages, setEvidenceImages] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Evidence gallery — cargada desde GET /transfers/{id}/images (plural)
  const [images, setImages] = useState<TransferImage[]>(transfer.transfer_images ?? []);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    setImagesError(null);
    try {
      const res = await getTransferImages(transfer.id);
      const list = Array.isArray(res.data) ? res.data : [];
      setImages(list);
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : 'Error al cargar evidencias');
    } finally {
      setImagesLoading(false);
    }
  }, [transfer.id]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleEvidenceAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setEvidenceImages((p) => [...p, ...files]);
    setEvidencePreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeEvidence = (idx: number) => {
    URL.revokeObjectURL(evidencePreviews[idx]);
    setEvidenceImages((p) => p.filter((_, i) => i !== idx));
    setEvidencePreviews((p) => p.filter((_, i) => i !== idx));
  };

  const handleUploadEvidence = async () => {
    if (evidenceImages.length === 0) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      await uploadTransferImages(transfer.id, evidenceImages);
      setUploadMsg('Evidencia subida correctamente');
      setEvidenceImages([]);
      setEvidencePreviews([]);
      setEvidenceDesc('');
      loadImages();
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Error al subir evidencia');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div
          className={`flex items-center gap-3 p-4 ${
            group === 'green'
              ? 'bg-gradient-to-r from-emerald-700 to-emerald-500'
              : group === 'yellow'
                ? 'bg-gradient-to-r from-green-700 to-green-500'
                : 'bg-gradient-to-r from-red-700 to-red-500'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            ←
          </button>
          <div className="flex-1">
            <h2 className="text-base font-extrabold text-white">
              Traslado #{transfer.id}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white"
              >
                {meta.icon} {meta.label}
              </span>
              <span className="text-[11px] text-white/70">{fecha}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Route */}
          <SectionTitle text="Ruta" />
          <div className="mb-4 flex items-center gap-2 overflow-hidden rounded-xl bg-gray-50 p-3">
            <span className="text-sm">📍</span>
            <span className="min-w-0 truncate text-xs font-bold text-gray-800">{from}</span>
            <span className="shrink-0 text-gray-400">→</span>
            <span className="min-w-0 truncate text-xs font-bold text-gray-800">{to}</span>
          </div>

          {/* Description */}
          {transfer.description && (
            <>
              <SectionTitle text="Descripción" />
              <p className="mb-4 text-xs text-gray-600">
                {transfer.description}
              </p>
            </>
          )}

          {/* Products */}
          {details.length > 0 && (
            <>
              <SectionTitle text={`Productos (${details.length})`} />
              <div className="mb-4 space-y-1.5">
                {details.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-1.5 text-xs text-gray-700">
                      <span className="text-green-500">🌿</span>
                      {transferPlantName(d)}
                    </span>
                    <span className="text-xs font-bold text-green-700">
                      {d.quantity} un.
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Evidence gallery — GET /transfers/{id}/images */}
          {imagesLoading ? (
            <p className="mb-4 py-2 text-center text-[11px] text-gray-400">
              Cargando evidencias…
            </p>
          ) : imagesError ? (
            <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-600">
              {imagesError}
            </p>
          ) : images.length > 0 ? (
            <>
              <SectionTitle text={`Evidencia (${images.length})`} />
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <img
                      src={img.url}
                      alt={img.description ?? `Evidencia ${img.id}`}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  </a>
                ))}
              </div>
            </>
          ) : null}

          {/* Upload evidence — gated by canUploadEvidence */}
          {canUploadEvidence && (
            <>
              <SectionTitle text="Subir evidencia" />
              <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-600">Fotos</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold text-green-600"
                  >
                    + Añadir
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleEvidenceAdd}
                  className="hidden"
                />
                {evidencePreviews.length > 0 ? (
                  <div className="mb-2 flex gap-2 overflow-x-auto">
                    {evidencePreviews.map((src, idx) => (
                      <div key={src} className="relative shrink-0">
                        <img
                          src={src}
                          alt={`Evidencia ${idx + 1}`}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEvidence(idx)}
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-center text-[11px] text-gray-400">
                    Sin fotos seleccionadas
                  </p>
                )}
                <input
                  type="text"
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="mb-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleUploadEvidence}
                  disabled={evidenceImages.length === 0 || uploading}
                  className="w-full rounded-lg bg-green-700 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir evidencia'}
                </button>
                {uploadMsg && (
                  <p
                    className={`mt-1.5 text-center text-[11px] font-bold ${
                      uploadMsg.includes('Error') ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {uploadMsg}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer: status change buttons */}
        {nextStates.length > 0 && (
          <div className="border-t border-gray-100 p-4">
            <p className="mb-2 text-xs font-bold text-gray-600">
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
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: nsMeta.color }}
                  >
                    {nsMeta.icon} {nsMeta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <p className="mb-1.5 text-xs font-bold text-green-800">{text}</p>
  );
}
