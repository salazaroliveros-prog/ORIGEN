import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  deleteField,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFirebaseConfig, hasFirebaseRuntimeConfig } from './config';
import {
  Project,
  FieldVisit,
  ExpenseRecord,
  AttendanceRecord,
  CompanySettings,
  Employee,
  EmployeeDirectoryEntry,
  Machinery,
  MachineryLog,
  QuoteRecord,
  APUItem,
} from './types';
import { notifySyncStart, notifySyncEnd } from './hooks/useFirebaseSyncStatus';
import {
  validateExpenseRecord,
  validateAttendanceRecord,
  validateEmployee,
  validateAPUItem,
  validateQuoteRecord,
  validateMachinery,
} from './validation/entity.schemas';
import { validateProjectForm } from './validation/project.schema';

const firebaseConfig = getFirebaseConfig();

if (!hasFirebaseRuntimeConfig()) {
  throw new Error(
    'Firebase configuration is incomplete. Check the public Firebase environment variables.'
  );
}

const appConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId,
};

export const app = getApps().length === 0 ? initializeApp(appConfig) : getApps()[0];

const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim();
if (
  appCheckSiteKey &&
  typeof window !== 'undefined' &&
  !process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId?.trim();
export const db = getFirestore(app, firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim();
if (authEmulatorHost) {
  const emulatorUrl = authEmulatorHost.includes('://')
    ? authEmulatorHost
    : `http://${authEmulatorHost}`;
  const parsedEmulatorUrl = new URL(emulatorUrl);
  if (
    parsedEmulatorUrl.protocol !== 'http:' ||
    !parsedEmulatorUrl.hostname ||
    (parsedEmulatorUrl.port &&
      (!Number.isInteger(Number(parsedEmulatorUrl.port)) ||
        Number(parsedEmulatorUrl.port) < 1 ||
        Number(parsedEmulatorUrl.port) > 65535))
  ) {
    throw new Error('NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST must be an HTTP emulator URL.');
  }
  connectAuthEmulator(auth, parsedEmulatorUrl.origin, { disableWarnings: true });
}

const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim();
if (firestoreEmulatorHost) {
  const separatorIndex = firestoreEmulatorHost.lastIndexOf(':');
  const host =
    separatorIndex < 0 ? firestoreEmulatorHost : firestoreEmulatorHost.slice(0, separatorIndex);
  const port = separatorIndex < 0 ? 8080 : Number(firestoreEmulatorHost.slice(separatorIndex + 1));
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      'NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST must be a hostname with an optional valid port.'
    );
  }
  connectFirestoreEmulator(db, host, port);
}

// Initialize Firebase Storage
export const storage = getStorage(app);

const storageEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST?.trim();
if (storageEmulatorHost) {
  const emulatorUrl = storageEmulatorHost.includes('://')
    ? storageEmulatorHost
    : `http://${storageEmulatorHost}`;
  const parsedEmulatorUrl = new URL(emulatorUrl);
  if (
    parsedEmulatorUrl.protocol !== 'http:' ||
    !parsedEmulatorUrl.hostname ||
    (parsedEmulatorUrl.port &&
      (!Number.isInteger(Number(parsedEmulatorUrl.port)) ||
        Number(parsedEmulatorUrl.port) < 1 ||
        Number(parsedEmulatorUrl.port) > 65535))
  ) {
    throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST must be an HTTP emulator URL.');
  }
  connectStorageEmulator(
    storage,
    parsedEmulatorUrl.hostname,
    Number(parsedEmulatorUrl.port || 9199)
  );
}

export async function testConnection(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Inicia sesión para validar la conexión con Firestore.');
  }

  try {
    await getDocs(query(collection(db, 'projects'), where('ownerId', '==', user.uid), limit(1)));
    return true;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.LIST, 'projects');
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): Error {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isKnownIdleWarning =
    errMsg.includes('Disconnecting idle stream') ||
    errMsg.includes('Timed out waiting for new targets');

  if (isKnownIdleWarning) {
    console.debug('Firestore idle stream disconnected:', errMsg);
    return new Error(errMsg);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serialized);

  // Mostrar notificación al usuario si estamos en el navegador
  if (typeof window !== 'undefined') {
    // Import dinámico para evitar problemas en SSR
    import('react-hot-toast')
      .then(({ toast }) => {
        const isPermissionError =
          errMsg.includes('permission-denied') ||
          errMsg.includes('Missing or insufficient permissions');
        const isNetworkError = errMsg.includes('network') || errMsg.includes('unavailable');
        const isAuthError = errMsg.includes('unauthenticated') || errMsg.includes('unauthorized');

        let userMessage = 'Error de conexión con la base de datos';
        if (isPermissionError) {
          userMessage = 'No tienes permisos para realizar esta acción';
        } else if (isNetworkError) {
          userMessage = 'Error de red. Verifica tu conexión a internet';
        } else if (isAuthError) {
          userMessage = 'Sesión expirada. Inicia sesión nuevamente';
        }

        toast.error(userMessage, {
          duration: 5000,
          position: 'top-center',
        });
      })
      .catch(() => {
        // Fallback si toast no está disponible
        console.warn('Toast notification not available');
      });
  }

  return new Error(serialized);
}

export async function saveProjectToFirestore(project: Project, companyId: string, userId: string) {
  const path = `projects/${project.id}`;
  const validation = validateProjectForm(project);
  if (!validation.success) {
    console.error('Project validation failed:', validation.error);
    throw new Error(
      `Datos de proyecto inválidos: ${validation.error.issues.map((issue) => issue.message).join(', ')}`
    );
  }

  notifySyncStart();
  try {
    const docRef = doc(db, 'projects', project.id);
    await setDoc(
      docRef,
      {
        ...project,
        companyId,
        ownerId: userId,
        createdBy: project.createdBy ?? userId,
      },
      { merge: true }
    );
    notifySyncEnd();
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function saveProjectScheduleToFirestore(
  projectId: string,
  schedule: Partial<
    Pick<Project, 'scheduleTasks' | 'scheduleMilestones' | 'taskReminders' | 'progressPercent'>
  >,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `projects/${projectId}`;
  try {
    await setDoc(
      doc(db, 'projects', projectId),
      {
        ...schedule,
        companyId,
        ownerId: userId,
        updatedBy: userId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeProjects(
  companyId: string,
  callback: (projects: Project[]) => void
): Unsubscribe {
  const path = 'projects';
  try {
    const q = query(collection(db, path), where('companyId', '==', companyId));
    return onSnapshot(
      q,
      (snapshot) => {
        notifySyncStart();
        const list: Project[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as Project));
        callback(list);
        notifySyncEnd();
      },
      (error) => {
        notifySyncEnd();
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export async function deleteAttendanceFromFirestore(attendanceId: string): Promise<boolean> {
  const path = `attendance/${attendanceId}`;
  try {
    await deleteDoc(doc(db, 'attendance', attendanceId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export async function saveFieldVisitToFirestore(
  visit: FieldVisit,
  companyId: string,
  userId: string
) {
  const path = `fieldVisits/${visit.id}`;
  try {
    const docRef = doc(db, 'fieldVisits', visit.id);
    await setDoc(
      docRef,
      {
        ...visit,
        companyId,
        authorId: userId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeFieldVisits(
  companyId: string,
  callback: (visits: FieldVisit[]) => void
): Unsubscribe {
  const path = 'fieldVisits';
  try {
    const q = query(collection(db, path), where('companyId', '==', companyId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FieldVisit[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as FieldVisit));
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveExpenseToFirestore(
  expense: ExpenseRecord,
  companyId: string,
  userId: string
) {
  const path = `expenses/${expense.id}`;

  // Validar datos antes de guardar
  const validation = validateExpenseRecord(expense);
  if (!validation.success) {
    console.error('Expense validation failed:', validation.error);
    throw new Error(
      `Datos de gasto inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const docRef = doc(db, 'expenses', expense.id);
    await setDoc(
      docRef,
      {
        ...expense,
        companyId,
        authorId: userId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteExpenseFromFirestore(expenseId: string): Promise<boolean> {
  const path = `expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function updateExpenseToFirestore(
  expense: ExpenseRecord,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `expenses/${expense.id}`;

  // Validar datos antes de guardar
  const validation = validateExpenseRecord(expense);
  if (!validation.success) {
    console.error('Expense validation failed:', validation.error);
    throw new Error(
      `Datos de gasto inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const docRef = doc(db, 'expenses', expense.id);
    await updateDoc(docRef, {
      ...expense,
      companyId,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

export function subscribeExpenses(
  companyId: string,
  callback: (expenses: ExpenseRecord[]) => void
): Unsubscribe {
  const path = 'expenses';
  try {
    const q = query(collection(db, path), where('companyId', '==', companyId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: ExpenseRecord[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as ExpenseRecord));
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveAttendanceToFirestore(
  record: AttendanceRecord,
  companyId: string,
  userId: string
) {
  const path = `attendance/${record.id}`;

  // Validar datos antes de guardar
  const validation = validateAttendanceRecord(record);
  if (!validation.success) {
    console.error('Attendance validation failed:', validation.error);
    throw new Error(
      `Datos de asistencia inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const docRef = doc(db, 'attendance', record.id);
    await setDoc(
      docRef,
      {
        ...record,
        companyId,
        authorId: userId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeAttendance(
  companyId: string,
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe {
  const path = 'attendance';
  try {
    const q = query(collection(db, path), where('companyId', '==', companyId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as AttendanceRecord));
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveEmployeeToFirestore(
  employee: Employee,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `employees/${employee.id}`;

  // Validar datos antes de guardar
  const validation = validateEmployee(employee);
  if (!validation.success) {
    console.error('Employee validation failed:', validation.error);
    throw new Error(
      `Datos de empleado inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'employees', employee.id),
      { ...employee, companyId, ownerId: companyId, createdBy: userId },
      { merge: true }
    );
    batch.set(doc(db, 'employeeDirectory', employee.id), {
      id: employee.id,
      companyId,
      name: employee.name,
      role: employee.role,
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

async function createMissingEmployeeDirectoryEntries(
  employees: Employee[],
  companyId: string
): Promise<void> {
  if (employees.length === 0) return;
  const existing = await getDocs(
    query(collection(db, 'employeeDirectory'), where('companyId', '==', companyId))
  );
  const existingIds = new Set(existing.docs.map((item) => item.id));
  const missing = employees.filter((employee) => !existingIds.has(employee.id));

  for (let offset = 0; offset < missing.length; offset += 450) {
    const batch = writeBatch(db);
    for (const employee of missing.slice(offset, offset + 450)) {
      const entry: EmployeeDirectoryEntry = {
        id: employee.id,
        companyId,
        name: employee.name,
        role: employee.role,
      };
      batch.set(doc(db, 'employeeDirectory', employee.id), entry);
    }
    await batch.commit();
  }
}

export function subscribeEmployees(
  companyId: string,
  callback: (employees: Employee[]) => void
): Unsubscribe {
  const path = 'employees';
  try {
    const q = query(collection(db, path), where('companyId', '==', companyId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Employee[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as Employee));
        callback(list);
        void createMissingEmployeeDirectoryEntries(list, companyId).catch((error: unknown) => {
          handleFirestoreError(error, OperationType.WRITE, `employeeDirectory/${companyId}`);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export function subscribeEmployeeDirectory(
  companyId: string,
  callback: (employees: EmployeeDirectoryEntry[]) => void
): Unsubscribe {
  const path = 'employeeDirectory';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as EmployeeDirectoryEntry)),
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveCompanySettingsToFirestore(settings: CompanySettings, companyId: string) {
  const path = `companySettings/${companyId}`;
  try {
    const docRef = doc(db, 'companySettings', companyId);
    await setDoc(
      docRef,
      {
        ...settings,
        companyId,
        ownerId: companyId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeCompanySettings(
  companyId: string,
  callback: (settings: CompanySettings | null) => void
): Unsubscribe {
  const path = `companySettings/${companyId}`;
  try {
    const docRef = doc(db, 'companySettings', companyId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as CompanySettings);
        } else {
          callback(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return () => {};
  }
}

export function subscribeQuotes(
  companyId: string,
  callback: (quotes: QuoteRecord[]) => void
): Unsubscribe {
  const path = 'quotes';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as QuoteRecord)),
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export function subscribeAPUItems(
  companyId: string,
  callback: (items: APUItem[]) => void
): Unsubscribe {
  const path = 'apuItems';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as APUItem)),
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveAPUItemsToFirestore(
  items: APUItem[],
  projectId: string,
  companyId: string,
  userId: string
): Promise<boolean> {
  if (items.length > 500) {
    throw new Error('No se pueden guardar más de 500 partidas APU en una operación.');
  }

  // Validar cada item con Zod
  for (const item of items) {
    const validation = validateAPUItem(item);
    if (!validation.success) {
      console.error('APU Item validation failed:', validation.error);
      throw new Error(
        `Datos de partida APU inválidos (${item.code}): ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }
  }

  const path = 'apuItems';
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      batch.set(
        doc(db, path, item.id),
        { ...item, companyId, projectId, createdBy: item.createdBy ?? userId, updatedBy: userId },
        { merge: true }
      );
    }
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteAPUItemFromFirestore(itemId: string): Promise<boolean> {
  const path = `apuItems/${itemId}`;
  try {
    await deleteDoc(doc(db, 'apuItems', itemId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export async function saveQuoteToFirestore(
  quote: QuoteRecord,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `quotes/${quote.id}`;

  // Validar datos antes de guardar
  const validation = validateQuoteRecord(quote);
  if (!validation.success) {
    console.error('Quote validation failed:', validation.error);
    throw new Error(
      `Datos de cotización inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    await setDoc(
      doc(db, 'quotes', quote.id),
      { ...quote, companyId, createdBy: userId, updatedBy: userId },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function updateQuoteStatusInFirestore(
  quote: QuoteRecord,
  status: QuoteRecord['status'],
  companyId: string,
  userId: string
): Promise<boolean> {
  return saveQuoteToFirestore({ ...quote, status }, companyId, userId);
}

export function subscribeMachinery(
  companyId: string,
  callback: (machinery: Machinery[]) => void
): Unsubscribe {
  const path = 'machinery';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as Machinery)),
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveMachineryToFirestore(
  machinery: Machinery,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `machinery/${machinery.id}`;
  const validation = validateMachinery(machinery);
  if (!validation.success) {
    console.error('Machinery validation failed:', validation.error);
    throw new Error(
      `Datos de maquinaria inválidos: ${validation.error.issues.map((issue) => issue.message).join(', ')}`
    );
  }

  try {
    await setDoc(
      doc(db, 'machinery', machinery.id),
      { ...machinery, companyId, createdBy: machinery.createdBy ?? userId },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function updateMachineryStatusInFirestore(
  machinery: Machinery,
  status: Machinery['status'],
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `machinery/${machinery.id}`;
  const validation = validateMachinery({ ...machinery, status });
  if (!validation.success) {
    console.error('Machinery status validation failed:', validation.error);
    throw new Error(
      `Estado de maquinaria inválido: ${validation.error.issues.map((issue) => issue.message).join(', ')}`
    );
  }

  try {
    await updateDoc(doc(db, 'machinery', machinery.id), {
      status,
      updatedBy: userId,
      ...(status === 'Disponible' ? { currentProjectId: deleteField() } : {}),
      companyId,
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

export function subscribeMachineryLogs(
  companyId: string,
  callback: (logs: MachineryLog[]) => void
): Unsubscribe {
  const path = 'machineryLogs';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as MachineryLog)),
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function recordMachineryUse(
  log: MachineryLog,
  machinery: Machinery,
  companyId: string,
  userId: string
): Promise<boolean> {
  const logPath = `machineryLogs/${log.id}`;
  try {
    const batch = writeBatch(db);
    const nextHorometer = machinery.currentHorometer + log.hoursWorked;
    const expenseId = `machine-${log.id}`;
    const expense: ExpenseRecord = {
      id: expenseId,
      projectId: log.projectId,
      date: log.date,
      category: 'Maquinaria y Combustible',
      description: `${log.machineryName}: ${log.hoursWorked} horas de operación`,
      supplier: 'Operación interna',
      nitSupplier: 'CF',
      facturaNumber: 'SIN-FACTURA',
      amount: log.costGTQ,
      currency: 'GTQ',
      paymentMethod: 'Pendiente',
      approvalStatus: 'Pendiente',
    };

    batch.set(doc(db, 'machineryLogs', log.id), {
      ...log,
      companyId,
      createdBy: userId,
      expenseId,
    });
    batch.set(
      doc(db, 'machinery', machinery.id),
      {
        ...machinery,
        companyId,
        currentHorometer: nextHorometer,
        currentProjectId: log.projectId,
        status: 'En Obra',
      },
      { merge: true }
    );
    batch.set(doc(db, 'expenses', expenseId), {
      ...expense,
      companyId,
      authorId: userId,
    });
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, logPath);
    return false;
  }
}
