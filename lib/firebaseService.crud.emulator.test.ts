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
import type {
  APUItem,
  AttendanceRecord,
  Employee,
  ExpenseRecord,
  Machinery,
  Project,
  QuoteRecord,
} from '@/lib/types';

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


});
