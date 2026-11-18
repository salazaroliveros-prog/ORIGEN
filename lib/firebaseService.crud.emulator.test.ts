/**
 * Pruebas de integración CRUD contra el emulador de Firebase.
 *
 * A diferencia de `firestore-emulator.test.ts` (que valida las reglas de
 * seguridad con `@firebase/rules-unit-testing`), este archivo ejercita las
 * funciones reales de `lib/firebaseService.ts`: las mismas que usa la UI.
 *
 * Reproduce los fallos que rompían la aplicación en producción:
 *  - Validación antes de agregar `companyId` / `authorId` (APU, asistencia,
 *    empleado): la validación fallaba siempre y el guardado nunca ocurría.
 *  - Campos con valor `undefined` en el payload: Firestore los rechaza con
 *    "Unsupported field value: undefined".
 *
 * Se ejecuta con `npm run test:firebase` (levanta Firestore + Storage).
 * No toca el proyecto real: el projectId es `demo-origen-erp-test`.
 */

import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { StockMovement } from '@/lib/domain/inventory';
import type {
  APUItem,
  AttendanceRecord,
  Employee,
  ExpenseRecord,
  FelInvoice,
  FelInvoiceItem,
  Machinery,
  Project,
  QuoteRecord,
} from '@/lib/types';

type FelInvoiceStored = FelInvoice & { items: FelInvoiceItem[] };

const PROJECT_ID = 'demo-origen-erp-test';
const EMULATOR_HOST = '127.0.0.1';
const TEST_EMAIL = 'crud-integration@test.com';
const TEST_PASSWORD = 'test123456';

const app = initializeApp({
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.appspot.com`,
  appId: '1:000000000000:web:demo',
  messagingSenderId: '000000000000',
});

const db = getFirestore(app);
const auth = getAuth(app);

connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });

// La app de Firebase se inicializa **antes** de importar `firebaseService`
// para que el módulo reutilice esta instancia (y no cree otra) y para que
// las conexiones al emulador queden activas.
const service = await import('@/lib/firebaseService');
const inventoryService = await import('@/lib/inventoryFirestoreService');

let companyId: string;
let userId: string;

/** IDs con formato válido para `isValidId` de `firestore.rules`. */
const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function waitFor<T>(
  subscribe: (callback: (value: T) => void) => () => void,
  predicate: (value: T) => boolean,
  timeoutMs = 10_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsubscribe?.();
      reject(new Error('Timeout esperando la actualización de Firestore'));
    }, timeoutMs);

    unsubscribe = subscribe((value) => {
      if (!predicate(value)) return;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(value);
    });
  });
}

/**
 * Verifica que un documento quedó persistido.
 *
 * La lectura se hace por suscripción (que es como la UI lee los datos) y
 * después con un `getDoc` puntual.
 *
 * El orden importa: el emulador de Firestore evalúa `existing()` como `null`
 * para un documento recién escrito si todavía no se ejecutó ninguna consulta
 * de lista sobre esa colección, y la regla `allow get` falla con
 * "Null value error". La suscripción ejecuta esa consulta de lista y deja el
 * documento visible para la lectura puntual posterior.
 */
async function expectPersisted<T extends { id: string }>(
  collectionName: string,
  id: string,
  subscribe: (callback: (items: T[]) => void) => () => void
): Promise<Record<string, unknown>> {
  const items = await waitFor(subscribe, (list) => list.some((item) => item.id === id));
  expect(
    items.some((item) => item.id === id),
    `El documento ${id} no apareció en la suscripción de ${collectionName}`
  ).toBe(true);

  const snap = await getDoc(doc(db, collectionName, id));
  expect(snap.exists(), `El documento ${collectionName}/${id} no existe en Firestore`).toBe(true);
  return snap.data() as Record<string, unknown>;
}

/**
 * Verifica que un documento ya no está disponible.
 *
 * El emulador deniega el `get` de un documento inexistente (la regla consulta
 * `existing()`, que es `null`), así que se aceptan las dos formas observables
 * de "ya no está": error de permisos o documento ausente.
 */
async function expectRemoved(collectionName: string, id: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    expect(snap.exists(), `El documento ${collectionName}/${id} sigue existiendo`).toBe(false);
  } catch (error) {
    const code = (error as { code?: string }).code;
    expect(
      code === 'permission-denied' || code === 'not-found',
      `Error inesperado al leer ${collectionName}/${id}: ${String(error)}`
    ).toBe(true);
  }
}

/**
 * Crea un proyecto y verifica que se persistió.
 *
 * Todos los módulos de la prueba dependen de un proyecto existente de la
 * misma empresa: `firestore.rules` valida esa relación con
 * `isProjectInCompany`.
 */
async function createProject(code: string, name: string): Promise<string> {
  const projectId = uniqueId('proj');
  const created = await service.saveProjectToFirestore(
    {
      id: projectId,
      code,
      name,
      client: 'Cliente de integración',
      location: 'Zona 1, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: 500_000,
      spentTotal: 0,
      progressPercent: 0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'Planificación',
      lat: 14.6133,
      lng: -90.4875,
    },
    companyId,
    userId
  );
  expect(created, `No se pudo crear el proyecto ${code}`).toBe(true);

  const stored = await expectPersisted<Project>('projects', projectId, (cb) =>
    service.subscribeProjects(companyId, cb)
  );
  expect(stored.companyId).toBe(companyId);
  expect(stored.ownerId).toBe(userId);
  return projectId;
}

beforeAll(async () => {
  // El usuario se crea una sola vez; si ya existe (emulador persistente) se
  // inicia sesión.
  try {
    await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  } catch (error) {
    const code = (error as { code?: string }).code;
    const alreadyExists =
      code === 'auth/email-already-exists' ||
      code === 'auth/email-already-in-use' ||
      code === 'auth/invalid-credential';
    if (!alreadyExists) {
      throw error;
    }
    await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  }

  const credential = auth.currentUser;
  if (!credential) throw new Error('No se pudo autenticar en el emulador de Auth');
  userId = credential.uid;
  companyId = userId;

  // La empresa debe existir antes que la membresía: `firestore.rules` exige
  // que el propietario cree su propia empresa y luego su membresía.
  await setDoc(
    doc(db, 'companies', companyId),
    {
      id: companyId,
      name: 'Empresa CRUD Integration',
      ownerId: companyId,
      createdAt: new Date().toISOString(),
      dataSchemaVersion: 1,
    },
    { merge: true }
  );

  const membershipRef = doc(db, 'companies', companyId, 'members', companyId);
  const membership = await getDoc(membershipRef);
  if (!membership.exists()) {
    await setDoc(membershipRef, {
      companyId,
      uid: companyId,
      email: TEST_EMAIL,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
  }
});

afterAll(async () => {
  try {
    await auth.signOut();
  } catch {
    // El cierre de sesión es best-effort: no debe enmascarar fallos previos.
  }
});

describe('firebaseService CRUD contra el emulador', () => {
  it('guarda, lee y actualiza un proyecto', async () => {
    const projectId = uniqueId('proj');
    const project = {
      id: projectId,
      code: 'CRUD-001',
      name: 'Proyecto de integración CRUD',
      client: 'Cliente de integración',
      location: 'Zona 1, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: 500_000,
      spentTotal: 0,
      progressPercent: 0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'Planificación' as const,
      lat: 14.6133,
      lng: -90.4875,
    };

    await expect(service.saveProjectToFirestore(project, companyId, userId)).resolves.toBe(true);

    const stored = await expectPersisted<Project>('projects', projectId, (cb) =>
      service.subscribeProjects(companyId, cb)
    );
    expect(stored.name).toBe(project.name);
    expect(stored.companyId).toBe(companyId);
    expect(stored.ownerId).toBe(userId);

    // Actualización: cambiar el presupuesto exige conservar id, ownerId y
    // companyId (reglas de `firestore.rules`).
    await expect(
      service.saveProjectToFirestore(
        { ...project, budgetTotal: 750_000, status: 'En Ejecución' },
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const updated = await expectPersisted<Project>('projects', projectId, (cb) =>
      service.subscribeProjects(companyId, cb)
    );
    expect(updated.budgetTotal).toBe(750_000);
    expect(updated.status).toBe('En Ejecución');
  });

  it('guarda un renglón APU sin campos de propiedad en el formulario', async () => {
    const projectId = await createProject('CRUD-APU', 'Proyecto para renglones APU');

    const itemId = uniqueId('apu');
    // El formulario NO conoce companyId / projectId / createdBy: los aporta
    // `saveAPUItemsToFirestore`. Antes de la corrección, la validación Zod
    // se ejecutaba sobre este borrador y fallaba siempre.
    await expect(
      service.saveAPUItemsToFirestore(
        [
          {
            id: itemId,
            code: 'APU-CRUD',
            description: 'Concreto reforzado para prueba de integración',
            unit: 'm3',
            quantity: 2,
            materialUnitCostGTQ: 200,
            laborUnitCostGTQ: 100,
            equipmentUnitCostGTQ: 50,
            totalUnitCostGTQ: 350,
            totalPriceGTQ: 700,
          },
        ],
        projectId,
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const stored = await expectPersisted<APUItem>('apuItems', itemId, (cb) =>
      service.subscribeAPUItems(companyId, cb)
    );
    expect(stored.code).toBe('APU-CRUD');
    expect(stored.companyId).toBe(companyId);
    expect(stored.projectId).toBe(projectId);
    expect(stored.createdBy).toBe(userId);
    expect(stored.totalPriceGTQ).toBe(700);

    await expect(service.deleteAPUItemFromFirestore(itemId)).resolves.toBe(true);
    await expectRemoved('apuItems', itemId);
  });

  it('guarda un gasto con campos opcionales vacíos', async () => {
    const projectId = await createProject('CRUD-GTO', 'Proyecto para gastos');

    const expenseId = uniqueId('ex');
    // `receiptPhotoUrl: undefined` es exactamente lo que produce el formulario
    // cuando no hay foto: Firestore lo rechaza ("Unsupported field value").
    await expect(
      service.saveExpenseToFirestore(
        {
          id: expenseId,
          projectId,
          date: '2026-06-15',
          category: 'Materiales',
          description: 'Gasto de integración CRUD',
          supplier: 'Proveedor de integración',
          amount: 1500,
          currency: 'GTQ',
          paymentMethod: 'Efectivo',
          receiptPhotoUrl: undefined,
          receiptPhotoDate: undefined,
        } as never,
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const stored = await expectPersisted<ExpenseRecord>('expenses', expenseId, (cb) =>
      service.subscribeExpenses(companyId, cb)
    );
    expect(stored.amount).toBe(1500);
    expect(stored.authorId).toBe(userId);
    expect(stored.description).toBe('Gasto de integración CRUD');
    // El campo `undefined` no debe llegar al documento.
    expect(stored.receiptPhotoUrl).toBeUndefined();

    await expect(
      service.updateExpenseToFirestore(
        {
          id: expenseId,
          projectId,
          date: '2026-06-15',
          category: 'Materiales',
          description: 'Gasto actualizado por integración',
          supplier: 'Proveedor de integración',
          amount: 2500,
          currency: 'GTQ',
          paymentMethod: 'Efectivo',
        } as never,
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const updated = await expectPersisted<ExpenseRecord>('expenses', expenseId, (cb) =>
      service.subscribeExpenses(companyId, cb)
    );
    expect(updated.amount).toBe(2500);
    expect(updated.description).toBe('Gasto actualizado por integración');

    await expect(service.deleteExpenseFromFirestore(expenseId)).resolves.toBe(true);
    await expectRemoved('expenses', expenseId);
  });

  it('guarda y elimina un registro de asistencia', async () => {
    const projectId = await createProject('CRUD-ASIS', 'Proyecto para asistencia');

    const attendanceId = uniqueId('att');
    // El formulario de asistencia tampoco conoce companyId / authorId.
    await expect(
      service.saveAttendanceToFirestore(
        {
          id: attendanceId,
          projectId,
          date: '2026-06-15',
          employeeId: uniqueId('emp'),
          employeeName: 'Albañil de integración',
          status: 'Presente',
          overtimeHours: 0,
        } as never,
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const stored = await expectPersisted<AttendanceRecord>('attendance', attendanceId, (cb) =>
      service.subscribeAttendance(companyId, cb)
    );
    expect(stored.authorId).toBe(userId);
    expect(stored.companyId).toBe(companyId);
    expect(stored.employeeName).toBe('Albañil de integración');

    await expect(service.deleteAttendanceFromFirestore(attendanceId)).resolves.toBe(true);
    await expectRemoved('attendance', attendanceId);
  });

  it('guarda y elimina un empleado', async () => {
    const employeeId = uniqueId('emp');
    await expect(
      service.saveEmployeeToFirestore(
        {
          id: employeeId,
          name: 'Empleado de integración CRUD',
          role: 'Albañil',
          dailyRateGTQ: 250,
          igssAffiliated: true,
          phone: '5555-1234',
          dpi: '1234567890123',
        } as never,
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const stored = await expectPersisted<Employee>('employees', employeeId, (cb) =>
      service.subscribeEmployees(companyId, cb)
    );
    expect(stored.name).toBe('Empleado de integración CRUD');
    expect(stored.ownerId).toBe(companyId);
    expect(stored.createdBy).toBe(userId);

    await expect(service.deleteEmployeeFromFirestore(employeeId, companyId)).resolves.toBe(true);
    await expectRemoved('employees', employeeId);
  });

  it('guarda maquinaria y cambia su estado', async () => {
    const machineryId = uniqueId('mach');
    await expect(
      service.saveMachineryToFirestore(
        {
          id: machineryId,
          name: 'Excavadora de integración',
          model: 'CAT-320',
          plateOrCode: 'CRUD-EQ',
          status: 'Disponible',
          hourlyRateGTQ: 300,
          currentHorometer: 0,
        } as never,
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const stored = await expectPersisted<Machinery>('machinery', machineryId, (cb) =>
      service.subscribeMachinery(companyId, cb)
    );
    expect(stored.name).toBe('Excavadora de integración');
    expect(stored.companyId).toBe(companyId);
    expect(stored.status).toBe('Disponible');

    await expect(
      service.updateMachineryStatusInFirestore(
        {
          id: machineryId,
          name: 'Excavadora de integración',
          model: 'CAT-320',
          plateOrCode: 'CRUD-EQ',
          status: 'Disponible',
          hourlyRateGTQ: 300,
          currentHorometer: 0,
        } as never,
        'Mantenimiento',
        companyId,
        userId
      )
    ).resolves.toBe(true);

    const updated = await expectPersisted<Machinery>('machinery', machineryId, (cb) =>
      service.subscribeMachinery(companyId, cb)
    );
    expect(updated.status).toBe('Mantenimiento');

    // El borrado consulta las bitácoras del equipo. La consulta debe filtrar
    // por `companyId`: sin ese filtro, `firestore.rules` la deniega y la
    // operación recorrería datos de otras empresas.
    await expect(service.deleteMachineryFromFirestore(machineryId, companyId)).resolves.toBe(true);
    await expectRemoved('machinery', machineryId);
  });

  it('guarda una cotización y cambia su estado a aceptada', async () => {
    const projectId = await createProject('CRUD-COT', 'Proyecto para cotizaciones');

    const quoteId = uniqueId('quote');
    const quote = {
      id: quoteId,
      projectId,
      clientName: 'Cliente de integración',
      clientNit: '123456789',
      date: '2026-06-15',
      validUntil: '2026-07-15',
      items: [{ description: 'Trabajo de prueba', qty: 1, unit: 'Global', unitPriceGTQ: 5000 }],
      totalGTQ: 5000,
      status: 'Borrador' as const,
    };

    await expect(service.saveQuoteToFirestore(quote, companyId, userId)).resolves.toBe(true);

    const stored = await expectPersisted<QuoteRecord>('quotes', quoteId, (cb) =>
      service.subscribeQuotes(companyId, cb)
    );
    expect(stored.clientName).toBe('Cliente de integración');
    expect(stored.createdBy).toBe(userId);
    expect(stored.status).toBe('Borrador');

    await expect(
      service.updateQuoteStatusInFirestore(quote, 'Aceptada', companyId, userId)
    ).resolves.toBe(true);

    const updated = await expectPersisted<QuoteRecord>('quotes', quoteId, (cb) =>
      service.subscribeQuotes(companyId, cb)
    );
    expect(updated.status).toBe('Aceptada');

    await expect(service.deleteQuoteFromFirestore(quoteId)).resolves.toBe(true);
    await expectRemoved('quotes', quoteId);
  });

  it('persiste proveedores, bodegas y artículos con ownership de empresa', async () => {
    const projectId = await createProject('INV-CATALOG', 'Proyecto para inventario');
    const supplier = await inventoryService.createSupplierToFirestore(
      { name: 'Proveedor de materiales QA', nit: '1234567-8', active: true },
      companyId,
      userId
    );
    const warehouse = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega de proyecto QA', type: 'project', projectId, active: true },
      companyId,
      userId
    );
    const item = await inventoryService.createInventoryItemToFirestore(
      { name: 'Cemento uso general QA', unit: 'saco', reorderLevel: 12, active: true },
      companyId,
      userId
    );

    const storedSupplier = await expectPersisted('suppliers', supplier.id, (callback) =>
      inventoryService.subscribeSuppliers(companyId, callback)
    );
    const storedWarehouse = await expectPersisted('warehouses', warehouse.id, (callback) =>
      inventoryService.subscribeWarehouses(companyId, callback)
    );
    const storedItem = await expectPersisted('inventoryItems', item.id, (callback) =>
      inventoryService.subscribeInventoryItems(companyId, callback)
    );

    expect(storedSupplier).toMatchObject({ companyId, createdBy: userId, nit: '1234567-8' });
    expect(storedWarehouse).toMatchObject({ companyId, createdBy: userId, projectId, type: 'project' });
    expect(storedItem).toMatchObject({ companyId, createdBy: userId, unit: 'saco', reorderLevel: 12 });
  });

  it('registra inventario inicial de forma atómica, inmutable e idempotente', async () => {
    const warehouse = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega general apertura QA', type: 'general', active: true },
      companyId,
      userId
    );
    const item = await inventoryService.createInventoryItemToFirestore(
      { name: 'Block para apertura QA', unit: 'unidad', reorderLevel: 20, active: true },
      companyId,
      userId
    );
    const input = {
      movementId: uniqueId('OPENING'),
      itemId: item.id,
      warehouseId: warehouse.id,
      quantity: 125,
      unitCostGTQ: 4.75,
      reference: 'INVENTARIO-INICIAL-2026',
      notes: 'Conteo físico inicial de bodega',
      companyId,
      userId,
    };

    const opening = await inventoryService.recordOpeningStockToFirestore(input);
    expect(opening.alreadyProcessed).toBe(false);
    expect(opening.movement).toMatchObject({
      kind: 'opening',
      companyId,
      itemId: item.id,
      warehouseId: warehouse.id,
      quantity: 125,
      unitCostGTQ: 4.75,
      referenceId: input.reference,
      createdBy: userId,
    });
    expect(opening.movement.projectId).toBeUndefined();
    expect(opening.balance).toMatchObject({
      companyId,
      itemId: item.id,
      warehouseId: warehouse.id,
      quantity: 125,
      averageUnitCostGTQ: 4.75,
      reorderLevel: 20,
      lastMovementId: input.movementId,
    });

    const retry = await inventoryService.recordOpeningStockToFirestore(input);
    expect(retry.alreadyProcessed).toBe(true);
    expect(retry.balance.quantity).toBe(125);

    await expect(inventoryService.recordOpeningStockToFirestore({
      ...input,
      quantity: 126,
    })).rejects.toThrow('ID del movimiento inicial ya fue utilizado');

    await expect(inventoryService.recordOpeningStockToFirestore({
      ...input,
      movementId: uniqueId('OPENING-SECOND'),
    })).rejects.toThrow('ya tiene historial');

    const stored = await expectPersisted<StockMovement>('stockMovements', input.movementId, (callback) =>
      inventoryService.subscribeStockMovements(companyId, callback)
    );
    expect(stored).toMatchObject({ kind: 'opening', referenceId: input.reference, quantity: 125 });
  });

  it('registra ajustes de inventario de entrada y salida con promedio, atomicidad e idempotencia', async () => {
    const warehouse = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega ajustes QA', type: 'general', active: true },
      companyId,
      userId
    );
    const item = await inventoryService.createInventoryItemToFirestore(
      { name: 'Cemento ajustes QA', unit: 'saco', reorderLevel: 3, active: true },
      companyId,
      userId
    );
    await inventoryService.recordOpeningStockToFirestore({
      movementId: uniqueId('OPEN-ADJ'),
      itemId: item.id,
      warehouseId: warehouse.id,
      quantity: 10,
      unitCostGTQ: 75,
      reference: 'APERTURA-AJUSTES',
      companyId,
      userId,
    });

    const incomingInput = {
      movementId: uniqueId('ADJ-IN'),
      itemId: item.id,
      warehouseId: warehouse.id,
      kind: 'adjustment_in' as const,
      quantity: 5,
      unitCostGTQ: 90,
      reference: 'CONTEO-MAYOR-001',
      reason: 'Conteo físico encontró cinco sacos adicionales',
      companyId,
      userId,
    };
    const incoming = await inventoryService.adjustInventoryStockToFirestore(incomingInput);
    expect(incoming.alreadyProcessed).toBe(false);
    expect(incoming.movement).toMatchObject({
      kind: 'adjustment_in',
      quantity: 5,
      unitCostGTQ: 90,
      referenceId: incomingInput.reference,
      notes: incomingInput.reason,
    });
    expect(incoming.balance).toMatchObject({
      quantity: 15,
      averageUnitCostGTQ: 80,
      reorderLevel: 3,
      lastMovementId: incomingInput.movementId,
    });

    const incomingRetry = await inventoryService.adjustInventoryStockToFirestore(incomingInput);
    expect(incomingRetry.alreadyProcessed).toBe(true);
    expect(incomingRetry.balance.quantity).toBe(15);

    const outgoingInput = {
      movementId: uniqueId('ADJ-OUT'),
      itemId: item.id,
      warehouseId: warehouse.id,
      kind: 'adjustment_out' as const,
      quantity: 3,
      reference: 'CONTEO-MENOR-001',
      reason: 'Conteo físico encontró tres sacos dañados no utilizables',
      companyId,
      userId,
    };
    const outgoing = await inventoryService.adjustInventoryStockToFirestore(outgoingInput);
    expect(outgoing.alreadyProcessed).toBe(false);
    expect(outgoing.movement).toMatchObject({
      kind: 'adjustment_out',
      quantity: 3,
      unitCostGTQ: 80,
      referenceId: outgoingInput.reference,
      notes: outgoingInput.reason,
    });
    expect(outgoing.balance).toMatchObject({
      quantity: 12,
      averageUnitCostGTQ: 80,
      reorderLevel: 3,
      lastMovementId: outgoingInput.movementId,
    });

    const outgoingRetry = await inventoryService.adjustInventoryStockToFirestore(outgoingInput);
    expect(outgoingRetry.alreadyProcessed).toBe(true);
    expect(outgoingRetry.balance.quantity).toBe(12);

    await expect(inventoryService.adjustInventoryStockToFirestore({
      ...outgoingInput,
      quantity: 4,
    })).rejects.toThrow('ID del movimiento de ajuste ya fue utilizado');

    await expect(inventoryService.adjustInventoryStockToFirestore({
      ...outgoingInput,
      movementId: uniqueId('ADJ-OVERDRAW'),
      quantity: 99,
    })).rejects.toThrow('Existencia insuficiente');
  });

  it('crea órdenes de compra y subcontratos solo con referencias existentes de la empresa', async () => {
    const projectId = await createProject('PROCUREMENT-CRUD', 'Proyecto para abastecimiento');
    const supplier = await inventoryService.createSupplierToFirestore(
      { name: 'Proveedor OC QA', nit: 'CF', active: true },
      companyId,
      userId
    );
    const item = await inventoryService.createInventoryItemToFirestore(
      { name: 'Acero de refuerzo QA', unit: 'quintal', reorderLevel: 5, active: true },
      companyId,
      userId
    );

    const order = await inventoryService.createPurchaseOrderToFirestore(
      {
        projectId,
        supplierId: supplier.id,
        number: 'OC-CRUD-QA-001',
        status: 'draft',
        currency: 'GTQ',
        lines: [
          {
            itemId: item.id,
            description: 'Acero de refuerzo',
            unit: 'quintal',
            quantity: 4,
            unitPriceGTQ: 425,
          },
        ],
        subtotalGTQ: 1700,
        discountGTQ: 0,
        taxPercent: 12,
        taxGTQ: 204,
        totalGTQ: 1904,
      },
      companyId,
      userId
    );
    const contract = await inventoryService.createSubcontractToFirestore(
      {
        projectId,
        supplierId: supplier.id,
        contractNumber: 'SUB-CRUD-QA-001',
        description: 'Instalación de estructura metálica de prueba',
        startDate: '2026-11-16',
        endDate: '2026-12-31',
        amountGTQ: 25_000,
        paidGTQ: 0,
        status: 'draft',
      },
      companyId,
      userId
    );

    const storedOrder = await expectPersisted('purchaseOrders', order.id, (callback) =>
      inventoryService.subscribePurchaseOrders(companyId, callback)
    );
    const storedContract = await expectPersisted('subcontracts', contract.id, (callback) =>
      inventoryService.subscribeSubcontracts(companyId, callback)
    );

    expect(storedOrder).toMatchObject({
      companyId,
      projectId,
      supplierId: supplier.id,
      requestedBy: userId,
      currency: 'GTQ',
      taxGTQ: 204,
      totalGTQ: 1904,
    });
    expect(storedContract).toMatchObject({
      companyId,
      projectId,
      supplierId: supplier.id,
      createdBy: userId,
      amountGTQ: 25_000,
    });
  });

  it('registra salidas y traslados de inventario atómicos e idempotentes', async () => {
    const projectId = await createProject('INV-MOVEMENTS', 'Proyecto para movimientos');
    const supplier = await inventoryService.createSupplierToFirestore(
      { name: 'Proveedor movimientos QA', nit: 'CF', active: true }, companyId, userId
    );
    const item = await inventoryService.createInventoryItemToFirestore(
      { name: 'Mortero movimientos QA', unit: 'saco', reorderLevel: 2, active: true }, companyId, userId
    );
    const source = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega de obra movimientos QA', type: 'project', projectId, active: true }, companyId, userId
    );
    const destination = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega general movimientos QA', type: 'general', active: true }, companyId, userId
    );
    const order = await inventoryService.createPurchaseOrderToFirestore({
      projectId, supplierId: supplier.id, number: uniqueId('OC-MOV'), status: 'draft', currency: 'GTQ',
      lines: [{ itemId: item.id, description: item.name, unit: item.unit, quantity: 5, unitPriceGTQ: 50 }],
      subtotalGTQ: 250, discountGTQ: 0, taxPercent: 12, taxGTQ: 30, totalGTQ: 280,
    }, companyId, userId);
    await inventoryService.approvePurchaseOrderToFirestore(order.id, companyId, userId);
    const receipt = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 0, warehouseId: source.id, quantity: 5,
      receiptNumber: 'MOV-RECEIPT', companyId, userId,
    });
    expect(receipt.balance.quantity).toBe(5);

    const movementId = uniqueId('ISSUE');
    const issueInput = {
      movementId, projectId, itemId: item.id, warehouseId: source.id, quantity: 2,
      reference: 'VALE-MOV-001', notes: 'Consumo de prueba', companyId, userId,
    };
    const issue = await inventoryService.recordProjectStockIssueToFirestore(issueInput);
    expect(issue.alreadyProcessed).toBe(false);
    expect(issue.balance.quantity).toBe(3);
    const issueRetry = await inventoryService.recordProjectStockIssueToFirestore(issueInput);
    expect(issueRetry.alreadyProcessed).toBe(true);
    await expect(inventoryService.recordProjectStockIssueToFirestore({
      ...issueInput,
      quantity: 1,
    })).rejects.toThrow('La referencia de salida ya fue utilizada');
    await expect(inventoryService.recordProjectStockIssueToFirestore({
      ...issueInput, movementId: uniqueId('ISSUE-OVER'), quantity: 4, reference: 'VALE-MOV-OVER',
    })).rejects.toThrow('Existencia insuficiente');

    const transferId = uniqueId('TRANSFER');
    const transferInput = {
      transferId, itemId: item.id, fromWarehouseId: source.id, toWarehouseId: destination.id,
      quantity: 1, notes: 'Traslado de prueba', companyId, userId,
    };
    const transfer = await inventoryService.transferInventoryBetweenWarehousesToFirestore(transferInput);
    expect(transfer.alreadyProcessed).toBe(false);
    expect(transfer.sourceBalance.quantity).toBe(2);
    expect(transfer.destinationBalance.quantity).toBe(1);
    expect(transfer.destinationBalance.averageUnitCostGTQ).toBe(50);
    const transferRetry = await inventoryService.transferInventoryBetweenWarehousesToFirestore(transferInput);
    expect(transferRetry.alreadyProcessed).toBe(true);
    await expect(inventoryService.transferInventoryBetweenWarehousesToFirestore({
      ...transferInput,
      quantity: 2,
    })).rejects.toThrow('El ID del traslado ya fue utilizado');

    const destinationBalanceId = `bal_${destination.id}_${item.id}`;
    const storedDestination = await expectPersisted('inventoryBalances', destinationBalanceId, (callback) =>
      inventoryService.subscribeInventoryBalances(companyId, callback)
    );
    expect(storedDestination).toMatchObject({
      companyId, warehouseId: destination.id, itemId: item.id,
      quantity: 1, averageUnitCostGTQ: 50, lastMovementId: `tr_${transferId}_in`,
    });
    // El saldo remanente es 2. Una nueva operación no puede consumir más
    // de lo disponible ni dejar movimientos/saldos parcialmente escritos.
    const overdrawnTransferId = uniqueId('TRANSFER-OVERDRAW');
    await expect(inventoryService.transferInventoryBetweenWarehousesToFirestore({
      transferId: overdrawnTransferId,
      itemId: item.id,
      fromWarehouseId: source.id,
      toWarehouseId: destination.id,
      quantity: 3,
      companyId,
      userId,
    })).rejects.toThrow('Existencia insuficiente');

    const finalBalances = await waitFor<Array<{ id: string; quantity: number; averageUnitCostGTQ: number }>>(
      (callback) => inventoryService.subscribeInventoryBalances(companyId, callback),
      (records) => {
        const sourceBalance = records.find((balance) => balance.id === `bal_${source.id}_${item.id}`);
        const destinationBalance = records.find((balance) => balance.id === `bal_${destination.id}_${item.id}`);
        return sourceBalance?.quantity === 2 && destinationBalance?.quantity === 1;
      }
    );
    expect(finalBalances.find((balance) => balance.id === `bal_${source.id}_${item.id}`))
      .toMatchObject({ quantity: 2, averageUnitCostGTQ: 50 });
    expect(finalBalances.find((balance) => balance.id === `bal_${destination.id}_${item.id}`))
      .toMatchObject({ quantity: 1, averageUnitCostGTQ: 50 });

    const movementsAfterRejectedTransfer = await waitFor<StockMovement[]>(
      (callback) => inventoryService.subscribeStockMovements(companyId, callback),
      (records) => !records.some((movement) => movement.referenceId === overdrawnTransferId)
    );
    expect(movementsAfterRejectedTransfer.some((movement) => movement.referenceId === overdrawnTransferId)).toBe(false);

  });

  it('rechaza una orden con más de dos renglones antes de escribir en Firestore', async () => {
    const lines = [0, 1, 2].map((index) => ({
      itemId: `item-${index + 1}`,
      description: `Material ${index + 1}`,
      unit: 'unidad',
      quantity: 1,
      unitPriceGTQ: 10 + index,
    }));
    await expect(inventoryService.createPurchaseOrderToFirestore({
      projectId: 'project-three-lines',
      supplierId: 'supplier-three-lines',
      number: uniqueId('OC-THREE'),
      status: 'draft',
      currency: 'GTQ',
      lines,
      subtotalGTQ: 33,
      discountGTQ: 0,
      taxPercent: 12,
      taxGTQ: 3.96,
      totalGTQ: 36.96,
    }, companyId, userId)).rejects.toThrow('entre 1 y 2');
  });
  it('registra pagos de subcontratos con fecha real, atomicidad, idempotencia y límite de saldo', async () => {
    const projectId = await createProject('SUB-PAYMENTS', 'Proyecto para pagos de subcontrato');
    const supplier = await inventoryService.createSupplierToFirestore(
      { name: 'Proveedor pagos QA', nit: 'CF', active: true }, companyId, userId
    );
    const contract = await inventoryService.createSubcontractToFirestore({
      projectId, supplierId: supplier.id, contractNumber: uniqueId('SUB-PAY'),
      description: 'Subcontrato de prueba para pagos', startDate: '2026-11-16',
      endDate: '2026-12-31', amountGTQ: 1000, paidGTQ: 0, status: 'active',
    }, companyId, userId);

    await expect(inventoryService.registerSubcontractPaymentToFirestore({
      contractId: contract.id, amountGTQ: 100, paymentDate: '2026-02-31',
      reference: 'INVALID-DATE', paymentMethod: 'Efectivo', companyId, userId,
    })).rejects.toThrow('fecha real');

    const input = {
      contractId: contract.id, amountGTQ: 350, paymentDate: '2026-11-16',
      reference: 'BANK-TRANSFER-350', paymentMethod: 'Transferencia BI' as const,
      notes: 'Pago de prueba', companyId, userId,
    };
    const firstPayment = await inventoryService.registerSubcontractPaymentToFirestore(input);
    expect(firstPayment.alreadyProcessed).toBe(false);
    expect(firstPayment.contract.paidGTQ).toBe(350);

    const storedPayment = await getDoc(doc(db, 'subcontractPayments', firstPayment.payment.id));
    expect(storedPayment.exists()).toBe(true);
    expect(storedPayment.data()).toMatchObject({
      companyId, contractId: contract.id, amountGTQ: 350,
      paymentDate: '2026-11-16', reference: 'BANK-TRANSFER-350',
      paymentMethod: 'Transferencia BI', createdBy: userId,
    });

    const storedExpense = await expectPersisted<ExpenseRecord>(
      'expenses',
      firstPayment.expense.id,
      (callback) => service.subscribeExpenses(companyId, callback)
    );
    expect(storedExpense).toMatchObject({
      id: firstPayment.payment.id,
      subcontractPaymentId: firstPayment.payment.id,
      paymentReference: 'BANK-TRANSFER-350',
      companyId,
      projectId,
      authorId: userId,
      date: '2026-11-16',
      category: 'Subcontratos',
      amount: 350,
      currency: 'GTQ',
      paymentMethod: 'Transferencia BI',
      supplier: 'Proveedor pagos QA',
      nitSupplier: 'CF',
    });

    const retry = await inventoryService.registerSubcontractPaymentToFirestore(input);
    expect(retry.alreadyProcessed).toBe(true);
    expect(retry.contract.paidGTQ).toBe(350);
    expect(retry.expense.id).toBe(firstPayment.expense.id);
    const storedExpensesAfterRetry = await new Promise<ExpenseRecord[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout esperando el egreso del pago de subcontrato'));
      }, 10_000);
      const unsubscribe = service.subscribeExpenses(companyId, (records) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(records);
      });
    });
    expect(storedExpensesAfterRetry.filter((expense) => expense.subcontractPaymentId === firstPayment.payment.id)).toHaveLength(1);

    await expect(inventoryService.registerSubcontractPaymentToFirestore({
      ...input, amountGTQ: 700, reference: 'BANK-TRANSFER-700',
    })).rejects.toThrow('supera el saldo pendiente');
  });

  it('aprueba y recibe una OC con saldo atómico, costo promedio e idempotencia', async () => {
    const projectId = await createProject('INV-RECEIPT', 'Proyecto para recepción atómica');
    const supplier = await inventoryService.createSupplierToFirestore(
      { name: 'Proveedor recepción QA', nit: 'CF', active: true },
      companyId,
      userId
    );
    const item = await inventoryService.createInventoryItemToFirestore(
      { name: 'Cemento recepción QA', unit: 'saco', reorderLevel: 3, active: true },
      companyId,
      userId
    );
    const warehouse = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega recepción QA', type: 'project', projectId, active: true },
      companyId,
      userId
    );
    const order = await inventoryService.createPurchaseOrderToFirestore(
      {
        projectId,
        supplierId: supplier.id,
        number: uniqueId('OC-RECEIPT'),
        status: 'draft',
        currency: 'GTQ',
        lines: [{
          itemId: item.id,
          description: item.name,
          unit: item.unit,
          quantity: 4,
          unitPriceGTQ: 425,
        }],
        subtotalGTQ: 1700,
        discountGTQ: 0,
        taxPercent: 12,
        taxGTQ: 204,
        totalGTQ: 1904,
      },
      companyId,
      userId
    );

    const approved = await inventoryService.approvePurchaseOrderToFirestore(
      order.id,
      companyId,
      userId
    );
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe(userId);

    const partial = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id,
      lineIndex: 0,
      warehouseId: warehouse.id,
      quantity: 2,
      receiptNumber: 'RCV-001',
      companyId,
      userId,
    });
    expect(partial.alreadyProcessed).toBe(false);
    expect(partial.order.status).toBe('partially_received');
    expect(partial.order.lines[0].receivedQuantity).toBe(2);
    expect(partial.balance.quantity).toBe(2);
    expect(partial.balance.averageUnitCostGTQ).toBe(425);

    const completed = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id,
      lineIndex: 0,
      warehouseId: warehouse.id,
      quantity: 2,
      receiptNumber: 'RCV-002',
      companyId,
      userId,
    });
    expect(completed.alreadyProcessed).toBe(false);
    expect(completed.order.status).toBe('received');
    expect(completed.order.lines[0].receivedQuantity).toBe(4);
    expect(completed.balance.quantity).toBe(4);
    expect(completed.balance.averageUnitCostGTQ).toBe(425);

    const retry = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id,
      lineIndex: 0,
      warehouseId: warehouse.id,
      quantity: 2,
      receiptNumber: 'RCV-002',
      companyId,
      userId,
    });
    expect(retry.alreadyProcessed).toBe(true);
    expect(retry.balance.quantity).toBe(4);

    const balanceId = `bal_${warehouse.id}_${item.id}`;
    const movementId = `rec_${order.id}_0_RCV-002`;
    const storedBalance = await expectPersisted('inventoryBalances', balanceId, (callback) =>
      inventoryService.subscribeInventoryBalances(companyId, callback)
    );
    const storedMovement = await expectPersisted('stockMovements', movementId, (callback) =>
      inventoryService.subscribeStockMovements(companyId, callback)
    );
    expect(storedBalance).toMatchObject({
      companyId,
      warehouseId: warehouse.id,
      itemId: item.id,
      quantity: 4,
      averageUnitCostGTQ: 425,
      lastMovementId: movementId,
    });
    expect(storedMovement).toMatchObject({
      companyId,
      warehouseId: warehouse.id,
      itemId: item.id,
      quantity: 2,
      referenceId: order.id,
      receiptNumber: 'RCV-002',
    });

    await expect(
      inventoryService.receivePurchaseOrderToWarehouse({
        orderId: order.id,
        lineIndex: 0,
        warehouseId: warehouse.id,
        quantity: 1,
        receiptNumber: 'RCV-003',
        companyId,
        userId,
      })
    ).rejects.toThrow();
  });



  it('recibe órdenes de dos renglones en entregas parciales independientes', async () => {
    const projectId = await createProject('INV-MULTILINE', 'Proyecto para recepción multi-renglón');
    const supplier = await inventoryService.createSupplierToFirestore(
      { name: 'Proveedor multi-renglón QA', nit: 'CF', active: true },
      companyId,
      userId
    );
    const cement = await inventoryService.createInventoryItemToFirestore(
      { name: 'Cemento multi-renglón QA', unit: 'saco', reorderLevel: 2, active: true },
      companyId,
      userId
    );
    const steel = await inventoryService.createInventoryItemToFirestore(
      { name: 'Acero multi-renglón QA', unit: 'quintal', reorderLevel: 1, active: true },
      companyId,
      userId
    );
    const warehouse = await inventoryService.createWarehouseToFirestore(
      { name: 'Bodega multi-renglón QA', type: 'project', projectId, active: true },
      companyId,
      userId
    );

    const order = await inventoryService.createPurchaseOrderToFirestore({
      projectId,
      supplierId: supplier.id,
      number: uniqueId('OC-MULTILINE'),
      status: 'draft',
      currency: 'GTQ',
      lines: [
        {
          itemId: cement.id,
          description: cement.name,
          unit: cement.unit,
          quantity: 4,
          unitPriceGTQ: 425,
        },
        {
          itemId: steel.id,
          description: steel.name,
          unit: steel.unit,
          quantity: 10,
          unitPriceGTQ: 80,
        },
      ],
      subtotalGTQ: 2500,
      discountGTQ: 0,
      taxPercent: 12,
      taxGTQ: 300,
      totalGTQ: 2800,
    }, companyId, userId);

    const approved = await inventoryService.approvePurchaseOrderToFirestore(
      order.id,
      companyId,
      userId
    );
    expect(approved.status).toBe('approved');

    const cementPartial = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 0, warehouseId: warehouse.id, quantity: 2,
      receiptNumber: 'ML-CEMENT-01', companyId, userId,
    });
    expect(cementPartial.order.status).toBe('partially_received');
    expect(cementPartial.order.lines.map((line) => line.receivedQuantity)).toEqual([2, 0]);
    expect(cementPartial.balance.quantity).toBe(2);
    expect(cementPartial.balance.averageUnitCostGTQ).toBe(425);

    const steelPartial = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 1, warehouseId: warehouse.id, quantity: 5,
      receiptNumber: 'ML-STEEL-01', companyId, userId,
    });
    expect(steelPartial.order.status).toBe('partially_received');
    expect(steelPartial.order.lines.map((line) => line.receivedQuantity)).toEqual([2, 5]);
    expect(steelPartial.balance.quantity).toBe(5);
    expect(steelPartial.balance.averageUnitCostGTQ).toBe(80);

    const cementComplete = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 0, warehouseId: warehouse.id, quantity: 2,
      receiptNumber: 'ML-CEMENT-02', companyId, userId,
    });
    expect(cementComplete.order.status).toBe('partially_received');
    expect(cementComplete.order.lines.map((line) => line.receivedQuantity)).toEqual([4, 5]);

    const steelComplete = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 1, warehouseId: warehouse.id, quantity: 5,
      receiptNumber: 'ML-STEEL-02', companyId, userId,
    });
    expect(steelComplete.order.status).toBe('received');
    expect(steelComplete.order.lines.map((line) => line.receivedQuantity)).toEqual([4, 10]);
    expect(steelComplete.balance.quantity).toBe(10);
    expect(steelComplete.balance.averageUnitCostGTQ).toBe(80);

    const retry = await inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 1, warehouseId: warehouse.id, quantity: 5,
      receiptNumber: 'ML-STEEL-02', companyId, userId,
    });
    expect(retry.alreadyProcessed).toBe(true);
    expect(retry.order.status).toBe('received');

    await expect(inventoryService.receivePurchaseOrderToWarehouse({
      orderId: order.id, lineIndex: 1, warehouseId: warehouse.id, quantity: 1,
      receiptNumber: 'ML-STEEL-03', companyId, userId,
    })).rejects.toThrow();

    const cementBalanceId = `bal_${warehouse.id}_${cement.id}`;
    const steelBalanceId = `bal_${warehouse.id}_${steel.id}`;
    const storedCement = await expectPersisted('inventoryBalances', cementBalanceId, (callback) =>
      inventoryService.subscribeInventoryBalances(companyId, callback)
    );
    const storedSteel = await expectPersisted('inventoryBalances', steelBalanceId, (callback) =>
      inventoryService.subscribeInventoryBalances(companyId, callback)
    );
    expect(storedCement).toMatchObject({
      companyId, warehouseId: warehouse.id, itemId: cement.id,
      quantity: 4, averageUnitCostGTQ: 425,
    });
    expect(storedSteel).toMatchObject({
      companyId, warehouseId: warehouse.id, itemId: steel.id,
      quantity: 10, averageUnitCostGTQ: 80,
    });
  });



  it('guarda, actualiza y elimina una factura FEL', async () => {
      const projectId = await createProject('CRUD-FEL', 'Proyecto para facturas FEL');
      const invoiceId = uniqueId('fel');
  
      // La tasa viaja en porcentaje (12), como la ingresa el formulario, y debe
      // normalizarse a fracción (0.12) antes de calcular: el IVA es el 12 %.
      const invoice = {
        id: invoiceId,
        projectId,
        dteNumber: 'FAC-001-000000001',
        serie: 'F',
        correlativo: '000000001',
        date: '2026-06-15',
        status: 'Emitida' as const,
        paymentMethod: 'Transferencia BI' as const,
        emisor: {
          nit: '123456789',
          nombre: 'Materiales La Unión',
          direccion: 'Zona 1, Guatemala',
          correo: 'ventas@launion.com',
        },
        receptor: {
          nit: 'CF',
          nombre: 'Constructora Origen',
          direccion: 'Zona 10, Guatemala',
          correo: 'compras@origen.gt',
        },
        items: [
          {
            id: 'item-1',
            description: 'Block de concreto',
            quantity: 10,
            unit: 'Und',
            unitPriceGTQ: 25,
            totalPriceGTQ: 0,
            taxRate: 12,
            taxAmountGTQ: 0,
          },
        ],
        subtotalGTQ: 0,
        taxAmountGTQ: 0,
        totalGTQ: 0,
      };
  
      await expect(service.saveFelInvoiceToFirestore(invoice, companyId, userId)).resolves.toBe(true);
  
      const stored = await expectPersisted<FelInvoiceStored>('felInvoices', invoiceId, (cb) =>
        service.subscribeFelInvoices(companyId, cb)
      );
      expect(stored.companyId).toBe(companyId);
      expect(stored.authorId).toBe(userId);
      expect(stored.subtotalGTQ).toBe(250);
      expect(stored.taxAmountGTQ).toBe(30);
      expect(stored.totalGTQ).toBe(280);
      const storedItems = stored.items as unknown as FelInvoiceItem[];
      expect(storedItems[0]?.taxRate).toBe(0.12);
  
      // Anular la factura: la regla exige que id, companyId y authorId no cambien.
      await expect(
        service.updateFelInvoiceToFirestore(
          {
            ...(stored as unknown as FelInvoice),
            status: 'Anulada',
          },
          companyId,
          userId
        )
      ).resolves.toBe(true);
  
      const updated = await expectPersisted<FelInvoiceStored>('felInvoices', invoiceId, (cb) =>
        service.subscribeFelInvoices(companyId, cb)
      );
      expect(updated.status).toBe('Anulada');
      expect(updated.authorId).toBe(userId);
      expect(updated.companyId).toBe(companyId);
      expect(updated.totalGTQ).toBe(280);
  
      await expect(service.deleteFelInvoiceFromFirestore(invoiceId)).resolves.toBe(true);
      await expectRemoved('felInvoices', invoiceId);
  });
});
