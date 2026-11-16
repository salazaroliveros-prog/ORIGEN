import type { APUItem, AttendanceRecord, Employee, FieldVisit } from '@/lib/types';
import { normalizeAPUItem } from './apu';

/**
 * Contexto de propiedad de los documentos del ERP.
 *
 * Los formularios de la UI no conocen `companyId`, `authorId`, `ownerId` ni
 * `createdBy`: esos campos los aporta la sesión y los exigen tanto los esquemas
 * de validación (`lib/validation/entity.schemas.ts`) como las reglas de
 * seguridad (`firestore.rules`).
 *
 * El orden importa: el registro debe quedar **completo antes de validarse**.
 * Validar el borrador (sin el contexto de propiedad) hace fallar siempre la
 * validación y el guardado nunca ocurre, sin que la UI diga por qué.
 */

/** Empleado con el contexto de propiedad listo para persistir. */
export type EmployeeWithOwnership = Employee & {
  companyId: string;
  ownerId: string;
  createdBy: string;
};

/** Registro de asistencia con el contexto de propiedad listo para persistir. */
export type AttendanceWithOwnership = AttendanceRecord & {
  companyId: string;
  authorId: string;
};

/**
 * Completa las partidas APU con el contexto de propiedad y normaliza sus
 * totales.
 *
 * `companyId`, `projectId` y `createdBy` los aporta la sesión, nunca el
 * formulario, y son obligatorios en `APUItemSchema`: por eso el registro se
 * completa **antes** de validar.
 */
export function buildAPUItemRecords(
  items: APUItem[],
  projectId: string,
  companyId: string,
  userId: string
): APUItem[] {
  return items.map((item) => {
    const normalized = normalizeAPUItem(item);
    return {
      ...normalized,
      companyId,
      projectId,
      createdBy: normalized.createdBy ?? userId,
      updatedBy: userId,
    };
  });
}

/**
 * Completa un registro de asistencia con `companyId` y `authorId`.
 *
 * Ambos son obligatorios en `AttendanceRecordSchema` y los aporta la sesión.
 */
export function buildAttendanceRecord(
  record: AttendanceRecord,
  companyId: string,
  userId: string
): AttendanceWithOwnership {
  return {
    ...record,
    companyId,
    authorId: userId,
  };
}

/**
 * Completa un empleado con `companyId`, `ownerId` y `createdBy`.
 *
 * `firestore.rules` exige que `ownerId` coincida con `companyId`; el valor lo
 * determina la sesión, no el formulario.
 */
export function buildEmployeeRecord(
  employee: Employee,
  companyId: string,
  userId: string
): EmployeeWithOwnership {
  return {
    ...employee,
    companyId,
    ownerId: companyId,
    createdBy: userId,
  };
}


/**
 * Merge a field visit without transferring original authorship on edits.
 * Firestore rules keep companyId and authorId immutable.
 */
export function mergeFieldVisitUpdate(
  existing: FieldVisit,
  updates: Partial<FieldVisit>,
  companyId: string,
  userId: string,
  updatedAt = new Date().toISOString()
): FieldVisit {
  return {
    ...existing,
    ...updates,
    id: existing.id,
    companyId: existing.companyId ?? companyId,
    authorId: existing.authorId ?? userId,
    updatedBy: userId,
    updatedAt,
  };
}

/** Merge attendance updates while preserving its original owner and author. */
export function mergeAttendanceUpdate(
  existing: AttendanceRecord,
  updates: Partial<AttendanceRecord>,
  companyId: string,
  userId: string,
  updatedAt = new Date().toISOString()
): AttendanceRecord {
  return {
    ...existing,
    ...updates,
    id: existing.id,
    companyId: existing.companyId ?? companyId,
    authorId: existing.authorId ?? userId,
    updatedBy: userId,
    updatedAt,
  };
}
