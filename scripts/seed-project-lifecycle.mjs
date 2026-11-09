import { randomUUID } from 'node:crypto';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => {
  const prefix = `--${name}=`;
  return argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
};

const target = option('target');
const runIdWasProvided = Boolean(option('run-id'));
const runId = option('run-id') || Date.now().toString(36);
const isApply = flag('apply');
const isCleanup = flag('cleanup');
const firebaseProjectId = option('firebase-project') || '';
const companyIdOption = option('company-id') || '';
const actorUidOption = option('actor-uid') || '';

if (!['emulator', 'live'].includes(target)) {
  throw new Error('Indica --target=emulator o --target=live. No se selecciona destino por defecto.');
}
if (!/^[a-z0-9-]{4,16}$/.test(runId)) {
  throw new Error('--run-id debe contener entre 4 y 16 caracteres: letras minúsculas, números o guiones.');
}
if (isCleanup && !runIdWasProvided) {
  throw new Error('--cleanup requiere --run-id explícito para limitar los borrados.');
}
if (isCleanup && !isApply) {
  throw new Error('--cleanup requiere también --apply.');
}
if (target === 'live' && (!firebaseProjectId || !companyIdOption)) {
  throw new Error(
    'Live requiere --firebase-project y --company-id; no se infieren del entorno.'
  );
}
if (target === 'live' && firebaseProjectId.startsWith('demo-')) {
  throw new Error('El destino live no puede usar un projectId demo-.');
}

const prefix = `qa-life-${runId}-${randomUUID()}`;
let companyId = target === 'emulator' ? companyIdOption || `${prefix}-workspace` : companyIdOption;
let actorUid = target === 'emulator' ? actorUidOption || 'qa-emulator-user' : actorUidOption;
const today = new Date();

function dateAtMonthOffset(offset, day = 15) {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, day))
    .toISOString()
    .slice(0, 10);
}

function daysAgo(days) {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days))
    .toISOString()
    .slice(0, 10);
}

const projectScenarios = [
  {
    key: 'planning',
    label: 'Planificación',
    name: 'Residencia QA - fase inicial',
    client: 'Cliente QA Residencial',
    budgetTotal: 450_000,
    spentTotal: 18_000,
    progressPercent: 0,
    status: 'Planificación',
    startOffset: 1,
    endOffset: 9,
    completedMilestones: 0,
    expectedProfitMarginPercent: 15,
    baseExpenses: [
      ['Permisos & Licencias', 12_000, 'Licencia de construccion'],
      ['Imprevistos', 6_000, 'Estudio inicial de suelos'],
    ],
  },
  {
    key: 'on-track',
    label: 'En ejecución - controlado',
    name: 'Edificio QA - avance en ruta',
    client: 'Cliente QA Comercial',
    budgetTotal: 1_200_000,
    spentTotal: 520_000,
    progressPercent: 55,
    status: 'En Ejecución',
    startOffset: -4,
    endOffset: 5,
    completedMilestones: 2,
    expectedProfitMarginPercent: 14,
    baseExpenses: [
      ['Materiales (Cementos, Hierro)', 200_000, 'Materiales de estructura'],
      ['Mano de Obra', 140_000, 'Mano de obra de obra gris'],
      ['Materiales (Cementos, Hierro)', 100_000, 'Acero y concreto'],
    ],
  },
  {
    key: 'over-budget',
    label: 'En ejecución - sobrecosto',
    name: 'Nave QA - escenario de sobrecosto',
    client: 'Cliente QA Industrial',
    budgetTotal: 850_000,
    spentTotal: 910_000,
    progressPercent: 30,
    status: 'En Ejecución',
    startOffset: -6,
    endOffset: 1,
    completedMilestones: 1,
    expectedProfitMarginPercent: 10,
    baseExpenses: [
      ['Materiales (Cementos, Hierro)', 300_000, 'Cimentaciones y anclajes'],
      ['Mano de Obra', 220_000, 'Cuadrilla de montaje'],
      ['Imprevistos', 260_000, 'Reproceso de prueba'],
    ],
  },
  {
    key: 'suspended',
    label: 'Suspendido - contingencia',
    name: 'Drenaje QA - frente suspendido',
    client: 'Entidad QA Civil',
    budgetTotal: 320_000,
    spentTotal: 50_000,
    progressPercent: 20,
    status: 'Suspendido',
    startOffset: -3,
    endOffset: 4,
    completedMilestones: 1,
    expectedProfitMarginPercent: 12,
    baseExpenses: [
      ['Materiales (Cementos, Hierro)', 25_000, 'Tuberia y accesorios'],
      ['Permisos & Licencias', 25_000, 'Permisos de ocupacion'],
    ],
  },
  {
    key: 'completed',
    label: 'Finalizado - cierre',
    name: 'Puente QA - proyecto finalizado',
    client: 'Entidad QA Publica',
    budgetTotal: 650_000,
    spentTotal: 620_000,
    progressPercent: 100,
    status: 'Finalizado',
    startOffset: -18,
    endOffset: -2,
    completedMilestones: 4,
    expectedProfitMarginPercent: 11,
    baseExpenses: [
      ['Materiales (Cementos, Hierro)', 220_000, 'Concreto y acero'],
      ['Mano de Obra', 180_000, 'Cuadrilla de construccion'],
      ['Imprevistos', 140_000, 'Cierre y pruebas de servicio'],
    ],
  },
];

const employees = [
  { key: 'worker-01', name: 'QA Personal - Capataz', role: 'Capataz', dailyRateGTQ: 250, igssAffiliated: true },
  { key: 'worker-02', name: 'QA Personal - Albanil', role: 'Albañil', dailyRateGTQ: 200, igssAffiliated: true },
  { key: 'worker-03', name: 'QA Personal - Ayudante', role: 'Ayudante', dailyRateGTQ: 150, igssAffiliated: false },
  { key: 'worker-04', name: 'QA Personal - Electricista', role: 'Electricista', dailyRateGTQ: 225, igssAffiliated: true },
].map((employee, index) => ({
  ...employee,
  id: `${prefix}-${employee.key}`,
  companyId,
  ownerId: companyId,
  createdBy: actorUid,
  phone: `+502 5550-00${String(index + 1).padStart(2, '0')}`,
  hireDate: dateAtMonthOffset(-12 - index, 1),
}));

const projects = projectScenarios.map((scenario, index) => {
  const id = `${prefix}-project-${scenario.key}`;
  const startDate = dateAtMonthOffset(scenario.startOffset, 1);
  const endDate = dateAtMonthOffset(scenario.endOffset, 28);
  const weights = [15, 25, 30, 30];
  const phaseNames = ['Preliminares', 'Cimentacion', 'Estructura', 'Acabados y entrega'];
  const milestones = weights.map((weightPercent, milestoneIndex) => {
    const completed = milestoneIndex < scenario.completedMilestones;
    const targetOffset = scenario.startOffset + milestoneIndex * 2;
    return {
      id: `${id}-milestone-${milestoneIndex + 1}`,
      projectId: id,
      title: `${phaseNames[milestoneIndex]} - ${scenario.label}`,
      phase: phaseNames[milestoneIndex],
      targetDate: dateAtMonthOffset(targetOffset, 15),
      completed,
      completedAt: completed ? dateAtMonthOffset(targetOffset, 20) : undefined,
      progress: completed ? 100 : Math.min(75, Math.max(0, scenario.progressPercent)),
      weightPercent,
      description: `Hito de QA sintetico para ${scenario.label}`,
      deliverable: `Acta de ${phaseNames[milestoneIndex].toLowerCase()}`,
    };
  });
  const scheduleTasks = milestones.map((milestone, taskIndex) => ({
    id: `${id}-task-${taskIndex + 1}`,
    projectId: id,
    name: milestone.title,
    phase: milestone.phase,
    startDate: dateAtMonthOffset(scenario.startOffset + taskIndex * 2, 1),
    endDate: milestone.targetDate,
    progress: milestone.progress,
    criticalPath: taskIndex === 1 || taskIndex === 2,
    predecessors: taskIndex === 0 ? [] : [`${id}-task-${taskIndex}`],
    completed: milestone.completed,
    assignedTo: employees[taskIndex % employees.length].id,
    weightPercent: milestone.weightPercent,
    milestoneId: milestone.id,
  }));

  return {
    id,
    companyId,
    code: `Q${runId.toUpperCase()}-P${index + 1}`,
    name: scenario.name,
    client: scenario.client,
    clientNit: 'CF',
    clientPhone: '+502 5550-0100',
    clientEmail: `qa-${scenario.key}@example.test`,
    clientAddress: 'Direccion sintetica para pruebas, Guatemala',
    location: 'Zona de pruebas, Guatemala',
    municipality: 'Guatemala',
    department: 'Guatemala',
    budgetTotal: scenario.budgetTotal,
    spentTotal: scenario.spentTotal,
    progressPercent: scenario.progressPercent,
    startDate,
    endDate,
    status: scenario.status,
    lat: 14.6133,
    lng: -90.4875,
    ownerId: actorUid,
    createdBy: actorUid,
    expectedProfitMarginPercent: scenario.expectedProfitMarginPercent,
    scheduleMilestones: milestones,
    scheduleTasks,
  };
});

const apuItems = [];
for (const project of projects) {
  for (const [index, item] of [
    { description: 'Excavacion y nivelacion QA', unit: 'm3', quantity: 100, material: 0, labor: 85, equipment: 40 },
    { description: 'Concreto estructural QA', unit: 'm3', quantity: 24, material: 950, labor: 320, equipment: 80 },
  ].entries()) {
    const totalUnitCostGTQ = item.material + item.labor + item.equipment;
    apuItems.push({
      id: `${project.id}-apu-${index + 1}`,
      companyId,
      projectId: project.id,
      createdBy: actorUid,
      code: `QA-${index + 1}`,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      materialUnitCostGTQ: item.material,
      laborUnitCostGTQ: item.labor,
      equipmentUnitCostGTQ: item.equipment,
      totalUnitCostGTQ,
      totalPriceGTQ: totalUnitCostGTQ * item.quantity,
      department: project.department,
    });
  }
}

const baseExpenses = [];
for (const scenario of projectScenarios) {
  const project = projects.find((item) => item.name === scenario.name);
  for (const [index, [category, amount, description]] of scenario.baseExpenses.entries()) {
    baseExpenses.push({
      id: `${prefix}-expense-${scenario.key}-${index + 1}`,
      companyId,
      authorId: actorUid,
      projectId: project.id,
      date: daysAgo(Math.max(0, 10 - index * 3)),
      category,
      description: `${description} - QA`,
      supplier: 'Proveedor sintetico de prueba',
      nitSupplier: 'CF',
      facturaNumber: `QA-${runId}-${scenario.key}-${index + 1}`,
      amount,
      currency: 'GTQ',
      paymentMethod: index % 2 === 0 ? 'Transferencia BI' : 'Efectivo',
      approvalStatus: 'Aprobado',
      approvedBy: actorUid,
      approvedAt: new Date().toISOString(),
    });
  }
}

const machinery = [
  {
    id: `${prefix}-machine-01`, companyId, createdBy: actorUid,
    name: 'Excavadora QA', model: 'QA-2026', plateOrCode: `QA-${runId}-M1`,
    hourlyRateGTQ: 1_000, currentHorometer: 1_160, status: 'Disponible',
  },
  {
    id: `${prefix}-machine-02`, companyId, createdBy: actorUid,
    name: 'Compactadora QA', model: 'QA-2026', plateOrCode: `QA-${runId}-M2`,
    hourlyRateGTQ: 1_000, currentHorometer: 730, status: 'En Obra',
    currentProjectId: projects[2].id,
  },
];

const machineryLogScenarios = [
  { project: projects[1], machine: machinery[0], hours: 80, fuel: 45 },
  { project: projects[2], machine: machinery[1], hours: 130, fuel: 70 },
  { project: projects[4], machine: machinery[0], hours: 80, fuel: 40 },
];
const machineryLogs = machineryLogScenarios.map(({ project, machine, hours, fuel }, index) => {
  const id = `${prefix}-machine-log-${index + 1}`;
  return {
    id,
    companyId,
    createdBy: actorUid,
    expenseId: `machine-${id}`,
    machineryId: machine.id,
    machineryName: machine.name,
    projectId: project.id,
    date: daysAgo(5 + index),
    hoursWorked: hours,
    operatorName: employees[index % employees.length].name,
    fuelGallons: fuel,
    costGTQ: hours * machine.hourlyRateGTQ,
  };
});
const machineryExpenses = machineryLogs.map((log) => ({
  id: log.expenseId,
  companyId,
  authorId: actorUid,
  machineryLogId: log.id,
  projectId: log.projectId,
  date: log.date,
  category: 'Maquinaria y Combustible',
  description: `${log.machineryName}: ${log.hoursWorked} horas QA`,
  supplier: log.machineryName,
  nitSupplier: 'CF',
  facturaNumber: `FAC-${log.id}`,
  amount: log.costGTQ,
  currency: 'GTQ',
  paymentMethod: 'Pendiente',
  approvalStatus: 'Pendiente',
}));
const expenses = [...baseExpenses, ...machineryExpenses];

const attendance = [];
for (const [employeeIndex, employee] of employees.entries()) {
  const project = projects[[1, 2, 3, 4][employeeIndex]];
  for (let dayIndex = 0; dayIndex < 3; dayIndex += 1) {
    attendance.push({
      id: `${prefix}-attendance-${employeeIndex + 1}-${dayIndex + 1}`,
      companyId,
      authorId: actorUid,
      projectId: project.id,
      projectName: project.name,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      date: daysAgo(dayIndex),
      status: dayIndex === 2 && employeeIndex === 2 ? 'Permiso' : 'Presente',
      overtimeHours: dayIndex === 1 ? 2 : 0,
      checkInTime: '07:00',
    });
  }
}

const fieldVisits = projects.slice(1).map((project, index) => ({
  id: `${prefix}-visit-${index + 1}`,
  companyId,
  authorId: actorUid,
  projectId: project.id,
  projectName: project.name,
  date: daysAgo(index),
  foremanName: employees[0].name,
  notes: `Visita de supervision QA para escenario ${project.status}.`,
  weather: index === 1 ? 'Lluvia Moderada' : 'Nublado',
  workersCount: 4,
  status: 'Autorizado',
}));

const quotes = projects.map((project, index) => {
  const itemAmount = Math.round(project.budgetTotal * 0.1);
  return {
    id: `${project.id}-quote`,
    companyId,
    projectId: project.id,
    clientName: project.client,
    clientNit: 'CF',
    clientPhone: '+502 5550-0200',
    clientEmail: `cotizacion-${runId}-${index + 1}@example.test`,
    clientAddress: project.location,
    date: daysAgo(2),
    validUntil: dateAtMonthOffset(1, 15),
    items: [
      { description: 'Obra preliminar QA', qty: 1, unit: 'global', unitPriceGTQ: itemAmount },
      { description: 'Estructura y acabados QA', qty: 1, unit: 'global', unitPriceGTQ: itemAmount * 2 },
    ],
    totalGTQ: itemAmount * 3,
    status: index === 4 ? 'Aceptada' : 'Borrador',
    subtotalGTQ: itemAmount * 3,
    discountPercent: 0,
    taxPercent: 12,
    taxGTQ: Math.round(itemAmount * 3 * 0.12),
    createdBy: actorUid,
  };
});

const dataset = {
  projects,
  apuItems,
  quotes,
  expenses,
  employees,
  employeeDirectory: employees.map(({ id, name, role }) => ({ id, companyId, name, role })),
  attendance,
  fieldVisits,
  machinery,
  machineryLogs,
};

function allDocumentEntries() {
  return Object.entries(dataset).flatMap(([collectionName, documents]) =>
    documents.map((document) => ({ collectionName, document }))
  );
}

function bindAuthenticatedIdentity(authenticatedUid) {
  const previousCompanyId = companyId;
  const previousActorUid = actorUid;
  actorUid = authenticatedUid;
  if (target === 'emulator' && !companyIdOption) companyId = authenticatedUid;

  function replaceValues(value) {
    if (Array.isArray(value)) {
      value.forEach(replaceValues);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
      if (value[key] === previousCompanyId) value[key] = companyId;
      else if (value[key] === previousActorUid) value[key] = actorUid;
      else replaceValues(value[key]);
    }
  }

  allDocumentEntries().forEach(({ document }) => replaceValues(document));
}

function printSummary() {
  console.log(`Destino solicitado: ${target}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Empresa: ${companyId}`);
  console.log('Escenarios:');
  for (const [index, project] of projects.entries()) {
    const projectExpenses = expenses
      .filter((expense) => expense.projectId === project.id)
      .reduce((total, expense) => total + expense.amount, 0);
    const estimatedBillings = project.scheduleMilestones.reduce(
      (total, milestone) => total + Math.round((project.budgetTotal * milestone.weightPercent) / 100),
      0
    );
    console.log(
      `  ${index + 1}. ${project.status} | ${project.name} | presupuesto Q${project.budgetTotal} | egresos Q${projectExpenses} | ingresos proyectados Q${estimatedBillings}`
    );
  }
  console.log('Documentos por coleccion:');
  for (const [collectionName, documents] of Object.entries(dataset)) {
    console.log(`  ${collectionName}: ${documents.length}`);
  }
  console.log(
    'La planilla no se persiste como coleccion: employees + attendance son los insumos para calcularla en la app.'
  );
}

function assertLoopbackEmulatorHost(value, expectedPort, variableName) {
  const [host, port] = (value || '').split(':');
  if (!['localhost', '127.0.0.1'].includes(host) || port !== String(expectedPort)) {
    throw new Error(`${variableName} debe apuntar al emulador local en el puerto ${expectedPort}.`);
  }
}

async function prepareFirebaseEnvironment() {
  const nextEnv = await import('@next/env');
  const loadEnvConfig = nextEnv.default.loadEnvConfig;
  loadEnvConfig(process.cwd());

  const isEmulator = target === 'emulator';
  const projectId = isEmulator ? 'demo-origen-erp-test' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (isEmulator) {
    assertLoopbackEmulatorHost('127.0.0.1:8080', 8080, 'Firestore Emulator');
    assertLoopbackEmulatorHost('127.0.0.1:9099', 9099, 'Auth Emulator');
  } else {
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      throw new Error('Live fue solicitado, pero hay variables de emulador activas. Cancelo para evitar ambiguedad.');
    }
    if (option('confirm-project') !== firebaseProjectId || firebaseProjectId !== projectId) {
      throw new Error('Live requiere --confirm-project igual al Firebase project ID de la configuracion actual.');
    }
  }

  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para autenticar el seed.');
  }
  if (!projectId || !process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
    throw new Error('Falta la configuracion publica de Firebase en el entorno.');
  }

  const [appSdk, authSdk, firestoreSdk] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = appSdk.initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (isEmulator ? 'demo-api-key' : ''),
    authDomain: isEmulator ? 'localhost' : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  }, `lifecycle-seed-${runId}`);
  const auth = authSdk.getAuth(app);
  const db = firestoreSdk.getFirestore(
    app,
    process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID?.trim() || '(default)'
  );

  if (isEmulator) {
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    firestoreSdk.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  let credential;
  if (isEmulator) {
    try {
      credential = await authSdk.createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error?.code !== 'auth/email-already-in-use') throw error;
      credential = await authSdk.signInWithEmailAndPassword(auth, email, password);
    }
  } else {
    credential = await authSdk.signInWithEmailAndPassword(auth, email, password);
  }
  const authenticatedUid = credential.user.uid;
  if (actorUidOption && actorUidOption !== authenticatedUid) {
    throw new Error('--actor-uid no coincide con el UID de E2E_ADMIN_EMAIL.');
  }
  bindAuthenticatedIdentity(authenticatedUid);

  if (!isEmulator) {
    const companySnapshot = await firestoreSdk.getDoc(firestoreSdk.doc(db, 'companies', companyId));
    const memberSnapshot = await firestoreSdk.getDoc(
      firestoreSdk.doc(db, 'companies', companyId, 'members', authenticatedUid)
    );
    const role = memberSnapshot.data()?.role;
    if (!companySnapshot.exists() || !memberSnapshot.exists() || !['owner', 'admin'].includes(role)) {
      throw new Error('La empresa/miembro no existe o el usuario no tiene rol owner/admin. No se escribe nada.');
    }
  }

  return { app, auth, db, firestoreSdk, projectId, actorUid: authenticatedUid };
}

async function main() {
  if (!isApply) {
    printSummary();
    console.log('\nDry-run: no se inicializo Firebase ni se escribieron datos. Usa --apply para continuar.');
    return;
  }

  const environment = await prepareFirebaseEnvironment();
  printSummary();
  const { db, firestoreSdk, actorUid } = environment;
  let createdDocumentCount = 0;
  const manifestRef = firestoreSdk.doc(db, 'qa_runs', runId);
  let createdDocumentIds = [];

  async function createEntries(entries) {
    if (entries.length > 450) {
      throw new Error('La transaccion excede el limite seguro de 450 documentos.');
    }
    const references = entries.map(({ collectionName, document }) =>
      firestoreSdk.doc(db, `${collectionName}/${document.id}`)
    );
    await firestoreSdk.runTransaction(db, async (transaction) => {
      const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
      const existingIndex = snapshots.findIndex((snapshot) => snapshot.exists());
      if (existingIndex >= 0) {
        throw new Error(`El documento ${references[existingIndex].path} ya existe; no se sobrescribe.`);
      }
      references.forEach((reference, index) => transaction.set(reference, entries[index].document));
    });
    createdDocumentCount += entries.length;
  }

  async function createDataEntries(entries) {
    if (entries.length > 450) {
      throw new Error('La transaccion excede el limite seguro de 450 documentos.');
    }
    const batch = firestoreSdk.writeBatch(db);
    const documentIds = entries.map(({ collectionName, document }) => {
      const reference = firestoreSdk.doc(db, `${collectionName}/${document.id}`);
      batch.set(reference, document);
      return reference.path;
    });
    const nextDocumentIds = [...createdDocumentIds, ...documentIds];
    batch.update(manifestRef, {
      createdDocumentIds: nextDocumentIds,
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();
    createdDocumentIds = nextDocumentIds;
    createdDocumentCount += entries.length;
  }

  if (target === 'emulator' && !companyIdOption) {
    const companyRef = firestoreSdk.doc(db, 'companies', companyId);
    const companySnapshot = await firestoreSdk.getDoc(companyRef);
    if (!companySnapshot.exists()) {
      await createEntries([
        {
          collectionName: 'companies',
          document: {
            id: companyId,
            ownerId: actorUid,
            legalName: `Constructora QA ${runId}`,
            commercialName: `Empresa QA ${runId}`,
            companyName: `Empresa QA ${runId}`,
          },
        },
      ]);
    } else if (companySnapshot.data()?.ownerId !== actorUid) {
      throw new Error('La empresa tecnica existente no pertenece al usuario autenticado.');
    }

    const memberRef = firestoreSdk.doc(db, 'companies', companyId, 'members', actorUid);
    const memberSnapshot = await firestoreSdk.getDoc(memberRef);
    if (!memberSnapshot.exists()) {
      await createEntries([
        {
          collectionName: `companies/${companyId}/members`,
          document: {
            id: actorUid,
            uid: actorUid,
            companyId,
            email: process.env.E2E_ADMIN_EMAIL,
            role: 'owner',
            joinedAt: new Date().toISOString(),
          },
        },
      ]);
    } else if (memberSnapshot.data()?.role !== 'owner' && memberSnapshot.data()?.role !== 'admin') {
      throw new Error('La empresa tecnica existente no tiene un rol owner/admin para el usuario.');
    }
  } else {
    const memberSnapshot = await firestoreSdk.getDoc(
      firestoreSdk.doc(db, 'companies', companyId, 'members', actorUid)
    );
    if (!memberSnapshot.exists() || !['owner', 'admin'].includes(memberSnapshot.data()?.role)) {
      throw new Error('La empresa no contiene una membresia owner/admin para el actor. No se escribe nada.');
    }
  }

  await firestoreSdk.runTransaction(db, async (transaction) => {
    const existingManifest = await transaction.get(manifestRef);
    if (existingManifest.exists()) {
      throw new Error(`El runId ${runId} ya esta reservado; elige otro ID.`);
    }
    transaction.set(manifestRef, {
      id: runId,
      companyId,
      createdBy: actorUid,
      createdDocumentIds,
      createdAt: new Date().toISOString(),
    });
  });

  await createDataEntries(projects.map((document) => ({ collectionName: 'projects', document })));
  await createDataEntries(machinery.map((document) => ({ collectionName: 'machinery', document })));
  const dependentEntries = allDocumentEntries().filter(
    ({ collectionName }) => !['projects', 'machinery'].includes(collectionName)
  );
  await createDataEntries(dependentEntries);

  console.log(`\nSe crearon ${createdDocumentCount} documentos en Firebase ${environment.projectId}.`);
  console.log(`Para borrar solo este dataset: repite los parametros con --run-id=${runId} --cleanup --apply.`);
}

async function cleanup() {
  const environment = await prepareFirebaseEnvironment();
  const { db, firestoreSdk, actorUid } = environment;
  const manifestRef = firestoreSdk.doc(db, 'qa_runs', runId);
  const manifestSnapshot = await firestoreSdk.getDoc(manifestRef);
  if (!manifestSnapshot.exists()) {
    throw new Error(`No existe el manifiesto del run ${runId}; no se intentara borrar por prefijo.`);
  }
  const manifest = manifestSnapshot.data();
  if (manifest.companyId !== companyId || manifest.createdBy !== actorUid) {
    throw new Error('El manifiesto no pertenece a la empresa y usuario autenticados.');
  }

  let remainingDocumentIds = [...manifest.createdDocumentIds];
  while (remainingDocumentIds.length > 0) {
    const chunk = remainingDocumentIds.slice(0, 450);
    const batch = firestoreSdk.writeBatch(db);
    for (const documentPath of chunk) batch.delete(firestoreSdk.doc(db, documentPath));
    const nextDocumentIds = remainingDocumentIds.slice(chunk.length);
    batch.update(manifestRef, {
      createdDocumentIds: nextDocumentIds,
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();
    remainingDocumentIds = nextDocumentIds;
  }
  await firestoreSdk.deleteDoc(manifestRef);
  console.log(`Se eliminaron ${manifest.createdDocumentIds.length} IDs del run ${runId}; no se tocaron otros documentos.`);
  if (target === 'emulator' && !companyIdOption) {
    console.log(`Se conserva la empresa tecnica ${companyId} y su owner en el Auth Emulator.`);
  }
}

(isCleanup ? cleanup() : main()).catch((error) => {
  console.error('Falló el seed de ciclo de vida:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});