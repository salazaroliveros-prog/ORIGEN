import { OfflineQueueItem, OfflineQueuePayload } from './types';

const PREFIX = 'constructerp_';

export function saveOfflineData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
  } catch {
    console.error('Error saving offline data');
  }
}

export function loadOfflineData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(`${PREFIX}${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function getOfflineQueue(): OfflineQueueItem[] {
  const queue = loadOfflineData<OfflineQueueItem[]>('offline_queue', []);
  // `localStorage` puede contener datos de versiones anteriores con
  // formas distintas a `OfflineQueueItem` (p. ej. entradas sin
  // `payload`). Se descartan las que no cumplen el contrato en lugar
  // de propagarlas a los consumidores y romper en runtime.
  return queue.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.type === 'string' &&
      typeof item.description === 'string' &&
      item.payload !== undefined &&
      item.payload !== null
  );
}

export function addOfflineAction(
  type: 'attendance' | 'progress' | 'fieldVisit',
  payload: OfflineQueuePayload,
  description: string
): OfflineQueueItem {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    timestamp: new Date().toLocaleString('es-GT'),
    description,
    payload,
    synced: false,
  };
  const updated = [newItem, ...queue];
  saveOfflineData('offline_queue', updated);
  return newItem;
}

export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue();
  const updated = queue.filter((item) => item.id !== id);
  saveOfflineData('offline_queue', updated);
}

export function clearOfflineQueue(): void {
  saveOfflineData('offline_queue', []);
}

let isProcessingOfflineQueue = false;

export async function processOfflineQueue(
  handler: (item: OfflineQueueItem) => Promise<boolean> | boolean
): Promise<{ processed: number; remaining: number }> {
  // Evita que dos eventos de reconexión procesen simultáneamente el mismo lote.
  if (isProcessingOfflineQueue) {
    return { processed: 0, remaining: getOfflineQueue().length };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, remaining: 0 };

  isProcessingOfflineQueue = true;
  let processedCount = 0;

  try {
    for (const item of queue) {
      // Una acción puede haber sido retirada mientras esperaba su turno.
      if (!getOfflineQueue().some((current) => current.id === item.id)) continue;

      try {
        const success = await handler(item);
        if (success) {
          // Lee la cola actual antes de retirar el elemento: conserva acciones
          // nuevas añadidas mientras la sincronización estaba en curso.
          removeOfflineAction(item.id);
          processedCount++;
        }
      } catch (err) {
        console.error('Failed to sync item:', item, err);
      }
    }
  } finally {
    isProcessingOfflineQueue = false;
  }

  return { processed: processedCount, remaining: getOfflineQueue().length };
}

export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[ConstructERP SW] Service Worker registrado:', reg.scope);
          }
        })
        .catch((err) => {
          console.warn('[ConstructERP SW] Registro de Service Worker omitido:', err);
        });
    });
  }
}
