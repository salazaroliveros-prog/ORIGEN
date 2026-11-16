import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'demo-origen-erp-test';
const COMPANY_A = 'company-a';
const COMPANY_B = 'company-b';
const USERS = {
  owner: 'owner-a',
  manager: 'manager-a',
  finance: 'finance-a',
  fieldWorker: 'field-a',
  viewer: 'viewer-a',
  warehouseManager: 'warehouse-a',
  otherCompanyOwner: 'owner-b',
};

const projectScenarios = [
  {
    id: 'project-on-track',
    code: 'OBRA-001',
    name: 'Edificio en ruta',
    budgetTotal: 1_000_000,
    spentTotal: 250_000,
    progressPercent: 40,
  },
  {
    id: 'project-behind',
    code: 'OBRA-002',
    name: 'Bodega atrasada',
    budgetTotal: 2_000_000,
    spentTotal: 1_100_000,
    progressPercent: 30,
  },
  {
    id: 'project-over-budget',
    code: 'OBRA-003',
    name: 'Puente sobre presupuesto',
    budgetTotal: 500_000,
    spentTotal: 650_000,
    progressPercent: 80,
  },
];

let testEnvironment: RulesTestEnvironment;

function makeProject(
  id: string,
  companyId = COMPANY_A,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    code: `PR-${id}`,
    name: 'Proyecto de prueba sintético',
    client: 'Cliente de prueba',
    budgetTotal: 1_000_000,
    spentTotal: 250_000,
    progressPercent: 40,
    status: 'En Ejecución',
    companyId,
    ownerId: companyId,
    ...overrides,
  };
}

async function seedCompany(companyId: string, members: Record<string, string>) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'companies', companyId), {
      id: companyId,
      ownerId: companyId,
    });
    await Promise.all(
      Object.entries(members).map(([uid, role]) =>
        setDoc(doc(database, 'companies', companyId, 'members', uid), {
          uid,
          companyId,
          role,
        })
      )
    );
    await setDoc(doc(database, 'companySettings', companyId), {
      companyId,
      ownerId: companyId,
      legalName: 'Empresa de prueba',
      commercialName: 'Empresa de prueba',
    });
  });
}

async function seedProject(project: ReturnType<typeof makeProject>) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'projects', project.id), project);
  });
}

function expenseRecord(id: string, projectId: string, authorId: string, companyId = COMPANY_A) {
  return {
    id,
    companyId,
    projectId,
    date: '2026-11-08',
    category: 'Materiales',
    amount: 35_000,
    currency: 'GTQ',
    authorId,
  };
}

beforeAll(async () => {
  const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST;
  const configuredProject = process.env.GCLOUD_PROJECT;
  if (
    configuredProject !== PROJECT_ID ||
    emulatorAddress !== '127.0.0.1:8080'
  ) {
    throw new Error(
      'Estas pruebas solo se ejecutan en Firestore Emulator con projectId demo-origen-erp-test.'
    );
  }

  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await seedCompany(COMPANY_A, {
    [USERS.owner]: 'owner',
    [USERS.manager]: 'project_manager',
    [USERS.finance]: 'finance',
    [USERS.fieldWorker]: 'field_worker',
    [USERS.viewer]: 'viewer',
    [USERS.warehouseManager]: 'warehouse_manager',
  });
  await seedCompany(COMPANY_B, { [USERS.otherCompanyOwner]: 'owner' });
});

  it('isolates supplier records and restricts supplier maintenance to purchasing roles', async () => {
    const finance = testEnvironment.authenticatedContext(USERS.finance).firestore();
    const viewer = testEnvironment.authenticatedContext(USERS.viewer).firestore();
    const supplier = {
      id: 'supplier-secure', companyId: COMPANY_A, name: 'Proveedor de prueba',
      nit: '1234567-8', active: true, createdBy: USERS.finance,
    };
    await assertSucceeds(setDoc(doc(finance, 'suppliers', supplier.id), supplier));
    await assertFails(setDoc(doc(viewer, 'suppliers', 'supplier-viewer'), {
      ...supplier, id: 'supplier-viewer',
    }));
    const foreignOwner = testEnvironment.authenticatedContext(USERS.otherCompanyOwner).firestore();
    await assertFails(getDoc(doc(foreignOwner, 'suppliers', supplier.id)));
  });

  it('allows warehouse managers to maintain catalogs but blocks stock movements pending atomic writes', async () => {
    await seedProject(makeProject('inventory-project'));
    const manager = testEnvironment.authenticatedContext(USERS.warehouseManager).firestore();
    const warehouse = {
      id: 'warehouse-project', companyId: COMPANY_A, projectId: 'inventory-project',
      name: 'Bodega de obra', type: 'project', active: true, createdBy: USERS.warehouseManager,
    };
    const item = {
      id: 'item-cement', companyId: COMPANY_A, name: 'Cemento 42.5 kg',
      unit: 'saco', reorderLevel: 10, active: true, createdBy: USERS.warehouseManager,
    };
    await assertSucceeds(setDoc(doc(manager, 'warehouses', warehouse.id), warehouse));
    await assertSucceeds(setDoc(doc(manager, 'inventoryItems', item.id), item));
    const movement = {
      id: 'movement-opening', companyId: COMPANY_A, projectId: 'inventory-project',
      warehouseId: warehouse.id, itemId: item.id, kind: 'opening',
      quantity: 50, unitCostGTQ: 78, occurredAt: '2026-11-16T08:00:00.000Z',
      createdBy: USERS.warehouseManager,
    };
    await assertFails(setDoc(doc(manager, 'stockMovements', movement.id), movement));
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'stockMovements', movement.id), movement);
    });
    await assertFails(setDoc(doc(manager, 'stockMovements', movement.id), {
      ...movement, quantity: 500,
    }));
    await assertFails(deleteDoc(doc(manager, 'stockMovements', movement.id)));
  });

  it('requires a purchase receipt movement, balance, and order update in one atomic write', async () => {
    await seedProject(makeProject('receipt-project'));
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'suppliers', 'receipt-supplier'), {
        id: 'receipt-supplier', companyId: COMPANY_A, name: 'Proveedor recepción',
        nit: 'CF', active: true, createdBy: USERS.owner,
      });
      await setDoc(doc(database, 'inventoryItems', 'receipt-cement'), {
        id: 'receipt-cement', companyId: COMPANY_A, name: 'Cemento', unit: 'saco',
        reorderLevel: 2, active: true, createdBy: USERS.owner,
      });
      await setDoc(doc(database, 'warehouses', 'receipt-warehouse'), {
        id: 'receipt-warehouse', companyId: COMPANY_A, projectId: 'receipt-project',
        name: 'Bodega recepción', type: 'project', active: true, createdBy: USERS.owner,
      });
      await setDoc(doc(database, 'purchaseOrders', 'receipt-order'), {
        id: 'receipt-order', companyId: COMPANY_A, projectId: 'receipt-project',
        supplierId: 'receipt-supplier', number: 'OC-REC-001', status: 'approved',
        currency: 'GTQ',
        lines: [{ itemId: 'receipt-cement', description: 'Cemento', unit: 'saco',
          quantity: 10, receivedQuantity: 0, unitPriceGTQ: 75 }],
        subtotalGTQ: 750, discountGTQ: 0, taxPercent: 12, taxGTQ: 90, totalGTQ: 840,
        requestedBy: USERS.finance, approvedBy: USERS.finance,
        createdAt: '2026-11-16T08:00:00.000Z', updatedAt: '2026-11-16T08:00:00.000Z',
      });
    });

    const database = testEnvironment.authenticatedContext(USERS.warehouseManager).firestore();
    const movement = {
      id: 'rec_receipt-order_receipt-1', companyId: COMPANY_A,
      projectId: 'receipt-project', itemId: 'receipt-cement',
      warehouseId: 'receipt-warehouse', kind: 'purchase_receipt',
      quantity: 4, unitCostGTQ: 75, occurredAt: '2026-11-16T10:00:00.000Z',
      referenceId: 'receipt-order', balanceId: 'bal_receipt-warehouse_receipt-cement',
      receiptNumber: 'receipt-1', createdBy: USERS.warehouseManager,
    };
    const balance = {
      id: movement.balanceId, companyId: COMPANY_A, warehouseId: 'receipt-warehouse',
      itemId: 'receipt-cement', quantity: 4, averageUnitCostGTQ: 75,
      reorderLevel: 2, createdBy: USERS.warehouseManager,
      createdAt: '2026-11-16T10:00:00.000Z',
      updatedAt: '2026-11-16T10:00:00.000Z', lastMovementId: movement.id,
    };
    const orderRef = doc(database, 'purchaseOrders', 'receipt-order');
    const movementRef = doc(database, 'stockMovements', movement.id);
    const balanceRef = doc(database, 'inventoryBalances', balance.id);

    await assertFails(setDoc(movementRef, movement));
    await assertSucceeds(runTransaction(database, async (transaction: Transaction) => {
      transaction.set(movementRef, movement);
      transaction.set(balanceRef, balance);
      transaction.update(orderRef, {
        lines: [{ itemId: 'receipt-cement', description: 'Cemento', unit: 'saco',
          quantity: 10, receivedQuantity: 4, unitPriceGTQ: 75 }],
        status: 'partially_received',
        updatedAt: '2026-11-16T10:00:00.000Z',
        lastReceiptMovementId: movement.id,
      });
    }));

    const secondMovement = {
      ...movement,
      id: 'rec_receipt-order_receipt-2',
      quantity: 6,
      occurredAt: '2026-11-16T11:00:00.000Z',
      receiptNumber: 'receipt-2',
    };
    const secondBalance = {
      ...balance,
      quantity: 10,
      averageUnitCostGTQ: 75,
      updatedAt: '2026-11-16T11:00:00.000Z',
      lastMovementId: secondMovement.id,
    };
    const secondOrderUpdate = {
      lines: [{ itemId: 'receipt-cement', description: 'Cemento', unit: 'saco',
        quantity: 10, receivedQuantity: 10, unitPriceGTQ: 75 }],
      status: 'received',
      updatedAt: '2026-11-16T11:00:00.000Z',
      lastReceiptMovementId: secondMovement.id,
    };
    await assertFails(runTransaction(database, async (transaction: Transaction) => {
      transaction.set(doc(database, 'stockMovements', secondMovement.id), secondMovement);
      transaction.set(balanceRef, { ...secondBalance, averageUnitCostGTQ: 999 });
      transaction.update(orderRef, secondOrderUpdate);
    }));
    await assertSucceeds(runTransaction(database, async (transaction: Transaction) => {
      transaction.set(doc(database, 'stockMovements', secondMovement.id), secondMovement);
      transaction.set(balanceRef, secondBalance);
      transaction.update(orderRef, secondOrderUpdate);
    }));
  });

  it('allows finance to create purchase orders and subcontracts only for same-company references', async () => {
    await seedProject(makeProject('procurement-project'));
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'suppliers', 'supplier-procurement'), {
        id: 'supplier-procurement', companyId: COMPANY_A, name: 'Proveedor QA',
        nit: 'CF', active: true, createdBy: USERS.owner,
      });
      await setDoc(doc(context.firestore(), 'inventoryItems', 'cement'), {
        id: 'cement', companyId: COMPANY_A, name: 'Cemento', unit: 'saco',
        reorderLevel: 10, active: true, createdBy: USERS.owner,
      });
    });
    const finance = testEnvironment.authenticatedContext(USERS.finance).firestore();
    const order = {
      id: 'purchase-order-qa', companyId: COMPANY_A, projectId: 'procurement-project',
      supplierId: 'supplier-procurement', number: 'OC-QA-001', status: 'draft',
      currency: 'GTQ',
      lines: [{ itemId: 'cement', description: 'Cemento', unit: 'saco', quantity: 10,
        receivedQuantity: 0, unitPriceGTQ: 75 }],
      subtotalGTQ: 750, discountGTQ: 0, taxPercent: 12, taxGTQ: 90, totalGTQ: 840,
      requestedBy: USERS.finance, createdAt: '2026-11-16T08:00:00.000Z',
      updatedAt: '2026-11-16T08:00:00.000Z',
    };
    await assertSucceeds(setDoc(doc(finance, 'purchaseOrders', order.id), order));
    await assertFails(setDoc(doc(finance, 'purchaseOrders', 'wrong-subtotal'), {
      ...order, id: 'wrong-subtotal', subtotalGTQ: 900, taxGTQ: 108, totalGTQ: 1008,
    }));
    await assertFails(setDoc(doc(finance, 'purchaseOrders', 'wrong-tax'), {
      ...order, id: 'wrong-tax', taxGTQ: 120, totalGTQ: 870,
    }));
    await assertFails(setDoc(doc(finance, 'purchaseOrders', 'discount-over-subtotal'), {
      ...order, id: 'discount-over-subtotal', discountGTQ: 800, taxGTQ: 0, totalGTQ: -50,
    }));
    await assertSucceeds(setDoc(doc(finance, 'purchaseOrders', order.id), {
      status: 'approved',
      approvedBy: USERS.finance,
      updatedAt: '2026-11-16T09:00:00.000Z',
    }, { merge: true }));
    await assertFails(setDoc(doc(finance, 'purchaseOrders', order.id), {
      status: 'received',
      updatedAt: '2026-11-16T09:30:00.000Z',
      lastReceiptMovementId: 'forged-receipt',
      lines: [{ ...order.lines[0], receivedQuantity: 10 }],
    }, { merge: true }));
    await assertFails(setDoc(doc(finance, 'purchaseOrders', 'multi-line-order'), {
      ...order,
      id: 'multi-line-order',
      lines: [...order.lines, { ...order.lines[0], itemId: 'cement', description: 'Segundo renglón' }],
      subtotalGTQ: 1500,
      taxGTQ: 180,
      totalGTQ: 1680,
    }));
    const contract = {
      id: 'subcontract-qa', companyId: COMPANY_A, projectId: 'procurement-project',
      supplierId: 'supplier-procurement', contractNumber: 'SUB-QA-001',
      description: 'Instalación eléctrica de prueba', startDate: '2026-11-01',
      endDate: '2026-12-31', amountGTQ: 100000, paidGTQ: 0,
      status: 'draft', createdBy: USERS.finance,
    };
    await assertSucceeds(setDoc(doc(finance, 'subcontracts', contract.id), contract));
    await assertFails(setDoc(doc(finance, 'subcontracts', contract.id), {
      ...contract, paidGTQ: 1000, status: 'active',
    }, { merge: true }));
    await assertFails(setDoc(doc(finance, 'purchaseOrders', 'foreign-order'), {
      ...order, id: 'foreign-order', projectId: 'foreign-project',
    }));
  });


afterAll(async () => {
  await testEnvironment?.cleanup();
});

describe('Firestore Emulator: aislamiento y escenarios de obra', () => {
  it('permite resolver membresías y configuración de empresa al iniciar sesión', async () => {
    const database = testEnvironment.authenticatedContext(USERS.owner).firestore();

    const memberships = await getDocs(
      query(collectionGroup(database, 'members'), where('uid', '==', USERS.owner))
    );
    expect(memberships.docs).toHaveLength(1);
    expect(memberships.docs[0].data()).toMatchObject({
      uid: USERS.owner,
      companyId: COMPANY_A,
      role: 'owner',
    });

    const settings = await getDoc(doc(database, 'companySettings', COMPANY_A));
    expect(settings.exists()).toBe(true);
    expect(settings.data()).toMatchObject({
      companyId: COMPANY_A,
      ownerId: COMPANY_A,
      legalName: 'Empresa de prueba',
    });
  });

  it('impide que un administrador elimine el documento raíz de su empresa', async () => {
    const database = testEnvironment.authenticatedContext(USERS.owner).firestore();
    const companyRef = doc(database, 'companies', COMPANY_A);

    await assertSucceeds(getDoc(companyRef));
    await assertFails(deleteDoc(companyRef));
    await assertSucceeds(getDoc(companyRef));
  });

  it('reserva un ID de run QA una sola vez y permite actualizar solo su manifiesto', async () => {
    const database = testEnvironment.authenticatedContext(USERS.owner).firestore();
    const manifestRef = doc(database, 'qa_runs', 'qa-run-exclusive');
    const manifest = {
      id: 'qa-run-exclusive',
      companyId: COMPANY_A,
      createdBy: USERS.owner,
      createdDocumentIds: [],
      createdAt: new Date().toISOString(),
    };

    await assertSucceeds(getDoc(manifestRef));
    await assertSucceeds(setDoc(manifestRef, manifest));
    await assertFails(setDoc(manifestRef, { ...manifest, createdAt: '2026-11-08T00:00:00.000Z' }));
    await assertSucceeds(
      setDoc(manifestRef, { createdDocumentIds: ['projects/qa-only-project'] }, { merge: true })
    );
    await assertSucceeds(deleteDoc(manifestRef));
  });

  it('completa el ciclo CRUD de un proyecto para un usuario miembro', async () => {
    const database = testEnvironment.authenticatedContext(USERS.manager).firestore();
    const project = makeProject('project-crud', COMPANY_A, { ownerId: USERS.manager });
    const projectRef = doc(database, 'projects', project.id);

    await assertSucceeds(setDoc(projectRef, project));
    await assertSucceeds(getDoc(projectRef));
    await assertSucceeds(setDoc(projectRef, { budgetTotal: 1_250_000 }, { merge: true }));
    expect((await getDoc(projectRef)).data()?.budgetTotal).toBe(1_250_000);
    await assertSucceeds(deleteDoc(projectRef));
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      expect((await getDoc(doc(context.firestore(), 'projects', project.id))).exists()).toBe(false);
    });
  });

  it('permite persistir escenarios con avance, gasto acumulado y sobrecosto legítimo', async () => {
    const database = testEnvironment.authenticatedContext(USERS.manager).firestore();

    for (const scenario of projectScenarios) {
      const project = makeProject(scenario.id, COMPANY_A, {
        ...scenario,
        ownerId: USERS.manager,
      });
      await assertSucceeds(setDoc(doc(database, 'projects', scenario.id), project));
      const stored = await getDoc(doc(database, 'projects', scenario.id));
      expect(stored.data()).toMatchObject({
        budgetTotal: scenario.budgetTotal,
        spentTotal: scenario.spentTotal,
        progressPercent: scenario.progressPercent,
      });
    }
  });

  it('rechaza avances fuera de 0-100 y montos negativos en el servidor', async () => {
    const database = testEnvironment.authenticatedContext(USERS.manager).firestore();
    const invalidProjects = [
      makeProject('negative-progress', COMPANY_A, { progressPercent: -1 }),
      makeProject('excess-progress', COMPANY_A, { progressPercent: 101 }),
      makeProject('negative-budget', COMPANY_A, { budgetTotal: -1 }),
      makeProject('negative-spent', COMPANY_A, { spentTotal: -1 }),
    ];

    for (const project of invalidProjects) {
      await assertFails(setDoc(doc(database, 'projects', project.id), project));
    }
  });

  it('permite a finanzas registrar un gasto solo dentro de su empresa y proyecto', async () => {
    await seedProject(makeProject('project-a'));
    await seedProject(makeProject('project-b', COMPANY_B));
    const database = testEnvironment.authenticatedContext(USERS.finance).firestore();

    await assertSucceeds(
      setDoc(
        doc(database, 'expenses', 'expense-valid'),
        expenseRecord('expense-valid', 'project-a', USERS.finance)
      )
    );
    await assertFails(
      setDoc(
        doc(database, 'expenses', 'expense-cross-company'),
        expenseRecord('expense-cross-company', 'project-b', USERS.finance)
      )
    );
    await assertFails(
      setDoc(doc(database, 'expenses', 'expense-negative'), {
        ...expenseRecord('expense-negative', 'project-a', USERS.finance),
        amount: -1,
      })
    );
  });

  it('vincula el gasto de maquinaria a un log y evita referencias entre empresas', async () => {
    await seedProject(makeProject('machine-project'));
    await seedProject(makeProject('foreign-machine-project', COMPANY_B));
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'machinery', 'machine-1'), {
        id: 'machine-1',
        companyId: COMPANY_A,
        createdBy: USERS.owner,
        name: 'Excavadora de prueba',
        model: 'QA-1',
        plateOrCode: 'QA-M1',
        hourlyRateGTQ: 150,
        currentHorometer: 100,
        status: 'Disponible',
      });
    });

    const database = testEnvironment.authenticatedContext(USERS.fieldWorker).firestore();
    const log = {
      id: 'machine-log-1',
      companyId: COMPANY_A,
      createdBy: USERS.fieldWorker,
      expenseId: 'machine-machine-log-1',
      machineryId: 'machine-1',
      machineryName: 'Excavadora de prueba',
      projectId: 'machine-project',
      date: '2026-11-08',
      hoursWorked: 2,
      operatorName: 'Operador de prueba',
      fuelGallons: 0,
      costGTQ: 300,
    };
    const expense = {
      id: log.expenseId,
      companyId: COMPANY_A,
      authorId: USERS.fieldWorker,
      machineryLogId: log.id,
      projectId: log.projectId,
      date: log.date,
      category: 'Maquinaria y Combustible',
      description: 'Uso de maquinaria de prueba',
      supplier: 'Excavadora de prueba',
      nitSupplier: 'CF',
      facturaNumber: `FAC-${log.id}`,
      amount: log.costGTQ,
      currency: 'GTQ',
      paymentMethod: 'Pendiente',
      approvalStatus: 'Pendiente',
    };

    const batch = writeBatch(database);
    batch.set(doc(database, 'machineryLogs', log.id), log);
    batch.set(doc(database, 'expenses', expense.id), expense);
    await assertSucceeds(batch.commit());

    await assertFails(
      setDoc(doc(database, 'expenses', 'forged-machine-expense'), {
        ...expense,
        id: 'forged-machine-expense',
        machineryLogId: 'missing-log',
      })
    );
    await assertFails(
      setDoc(doc(database, 'machineryLogs', 'cross-company-log'), {
        ...log,
        id: 'cross-company-log',
        projectId: 'foreign-machine-project',
      })
    );
  });

  it('rechaza acceso de otra empresa y escrituras de un rol viewer', async () => {
    await seedProject(makeProject('private-project-a'));
    const otherCompany = testEnvironment
      .authenticatedContext(USERS.otherCompanyOwner)
      .firestore();
    const viewer = testEnvironment.authenticatedContext(USERS.viewer).firestore();

    await assertFails(getDoc(doc(otherCompany, 'projects', 'private-project-a')));
    await assertFails(
      setDoc(
        doc(viewer, 'projects', 'viewer-project'),
        makeProject('viewer-project')
      )
    );
  });

  it('lee los tres proyectos de la empresa y calcula indicadores solo con sus datos', async () => {
    for (const scenario of projectScenarios) {
      await seedProject(makeProject(scenario.id, COMPANY_A, scenario));
    }
    await seedProject(makeProject('other-company-project', COMPANY_B));

    const database = testEnvironment.authenticatedContext(USERS.manager).firestore();
    const result = await getDocs(
      query(collection(database, 'projects'), where('companyId', '==', COMPANY_A))
    );
    const projects = result.docs.map(
      (snapshot: QueryDocumentSnapshot<DocumentData>) => snapshot.data()
    );
    const totalBudget = projects.reduce(
      (sum: number, project: DocumentData) => sum + Number(project.budgetTotal),
      0
    );
    const totalSpent = projects.reduce(
      (sum: number, project: DocumentData) => sum + Number(project.spentTotal),
      0
    );
    const averagePhysicalProgress =
      projects.reduce(
        (sum: number, project: DocumentData) => sum + Number(project.progressPercent),
        0
      ) / projects.length;

    expect(projects).toHaveLength(3);
    expect(totalBudget).toBe(3_500_000);
    expect(totalSpent).toBe(2_000_000);
    expect((totalSpent / totalBudget) * 100).toBeCloseTo(57.14, 2);
    expect(averagePhysicalProgress).toBe(50);
  });
});