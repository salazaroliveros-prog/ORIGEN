/**
 * Utilidades para preparar payloads destinedos a Firestore.
 */

/**
 * Indica si el valor es un objeto plano (no un `Date`, `Map`, clase de
 * Firestore, etc.) al que se le puede recorrer sus propiedades.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Elimina las propiedades cuyo valor es `undefined`.
 *
 * El SDK web de Firestore rechaza los campos con valor `undefined`
 * ("Unsupported field value: undefined"), y tanto Zod (`safeParse`) como los
 * formularios del ERP construyen objetos con claves opcionales presentes pero
 * sin valor (por ejemplo `receiptPhotoUrl: url || undefined`). Sin este
 * saneamiento, escrituras perfectamente válidas fallan al llegar al cliente.
 *
 * El recorrido es recursivo para que también se limpien los objetos anidados
 * (por ejemplo `receiptCoords`) y los elementos de un arreglo (por ejemplo
 * `auditTrail`). Los valores `null` se conservan: son válidos en Firestore.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      result[key] = stripUndefined(item);
    }
    return result as unknown as T;
  }

  return value;
}
