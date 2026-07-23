import type { ItemEstadoValue } from '../types/inventario';

const ESTADOS_KEY = 'inv_estados_v4';
const RECUPERACION_KEY = 'inv_recuperacion_v1';

export async function loadEstadosLocales(): Promise<Record<string, ItemEstadoValue>> {
  try {
    const raw = localStorage.getItem(ESTADOS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const result: Record<string, ItemEstadoValue> = {};
    for (const [k, v] of Object.entries(parsed)) {
      result[k] = v as ItemEstadoValue;
    }
    return result;
  } catch (err) {
    console.error('[inventario] Error al cargar estados locales:', err);
    return {};
  }
}

export async function saveEstadosLocales(map: Record<string, ItemEstadoValue>): Promise<void> {
  try {
    localStorage.setItem(ESTADOS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('[inventario] Error al guardar estados locales:', err);
  }
}

export async function loadRecuperacionLocales(): Promise<Record<string, number>> {
  try {
    const raw = localStorage.getItem(RECUPERACION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      result[k] = parseInt(String(v), 10) || 0;
    }
    return result;
  } catch (err) {
    console.error('[inventario] Error al cargar recuperación local:', err);
    return {};
  }
}

export async function saveRecuperacionLocales(map: Record<string, number>): Promise<void> {
  try {
    localStorage.setItem(RECUPERACION_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('[inventario] Error al guardar recuperación local:', err);
  }
}
