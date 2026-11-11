import { initializeApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { toast } from 'react-hot-toast';

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
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
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

// `throw` no se hace en tiempo de evaluación del módulo: este archivo
// también se importa desde rutas de servidor (`app/api/upload-project-photo`)
// y Next.js lo evalúa durante el build (colección de datos de página) sin
// variables de entorno en el entorno de CI. Lanzar aquí rompe el build.
// En su lugar se registra el problema y la inicialización se omite hasta
// que haya configuración válida (ver `initializeFirebase`).
const firebaseConfigured = hasFirebaseRuntimeConfig();

if (!firebaseConfigured) {
  console.error(
    '[firebaseService] Firebase configuration is incomplete. ' +
      'Check the public Firebase environment variables.'
  );
}

function initializeFirebase() {
  if (!firebaseConfigured) {
    throw new Error(
      'Firebase configuration is incomplete. Check the public Firebase environment variables.'
    );
  }
  return initializeApp(appConfig);
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

const hasExistingFirebaseApp = getApps().length > 0;
// Sin configuración válida no se inicializa la app: los consumidores
// deben comprobar `firebaseConfigured` antes de usar `app`/`db`/`auth`.
// Cuando no hay configuración, `app` queda en `null` y cualquier uso
// posterior lanza el error de configuración (ver `initializeFirebase`).
export const app: ReturnType<typeof initializeApp> | null = hasExistingFirebaseApp
  ? getApps()[0]
  : firebaseConfigured
    ? initializeFirebase()
    : null;

function getAppOrThrow(): ReturnType<typeof initializeApp> {
  if (!app) {
    // Lanza si no hay configuración válida.
    initializeFirebase();
  }
  return app as ReturnType<typeof initializeApp>;
}

/**
 * Devuelve la instancia de Auth o lanza si no hay configuración
 * válida. Los consumidores de `auth`/`db`/`storage` deben usar esta
 * función en lugar de acceder a los valores exportados directamente,
 * ya que estos pueden ser `null` cuando falta la configuración.
 */
export function getAuthOrThrow(): NonNullable<typeof auth> {
  if (!auth) {
    throw new Error(
      'Firebase configuration is incomplete. Check the public Firebase environment variables.'
    );
  }
  return auth;
}

/**
 * Devuelve la instancia de Firestore o lanza si no hay configuración
 * válida. Ver `getAuthOrThrow`.
 */
export function getDbOrThrow(): NonNullable<typeof db> {
  if (!db) {
    throw new Error(
      'Firebase configuration is incomplete. Check the public Firebase environment variables.'
    );
  }
  return db;
}

/**
 * Devuelve la instancia de Storage o lanza si no hay configuración
 * válida. Ver `getAuthOrThrow`.
 */
export function getStorageOrThrow(): NonNullable<typeof storage> {
  if (!storage) {
    throw new Error(
      'Firebase configuration is incomplete. Check the public Firebase environment variables.'
    );
  }
  return storage;
}
const isNewFirebaseApp = !hasExistingFirebaseApp;
const useFirebaseEmulators =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const firebaseEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';

// Conexión directa a Firebase/Firestore sin capa intermedia de verificación de aplicaciones.

const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId?.trim();
// Sin configuración válida (`app === null`) no se crean `db`/`auth`:
// los deja en `null` y cualquier uso posterior lanza el error de
// configuración al intentar acceder a ellos.
export const db = app ? getFirestore(app, firestoreDatabaseId || '(default)') : null;
export const auth = app ? getAuth(app) : null;

if (useFirebaseEmulators && isNewFirebaseApp && auth && db) {
  connectAuthEmulator(auth, `http://${firebaseEmulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, firebaseEmulatorHost, 8080);
}

// Inicializar Firebase App Check con reCAPTCHA Enterprise (solo en cliente)
// En desarrollo (localhost) usa el debug token de Firebase Console para evitar
// bloqueos de App Check enforcement en el plan Spark.
// En producción (Vercel) usa la clave de reCAPTCHA Enterprise configurada.
if (!useFirebaseEmulators && typeof window !== 'undefined' && firebaseConfig.appCheckRecaptchaKey) {
  try {
    // Configurar debug token para desarrollo local si está disponible en .env.local
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN
    ) {
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
        process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
    }

    initializeAppCheck(getAppOrThrow(), {
      provider: new ReCaptchaEnterpriseProvider(firebaseConfig.appCheckRecaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn('Firebase App Check initialization failed:', error);
    // No bloquear el login si App Check falla
  }
}

// Initialize Firebase Storage
export const storage = app ? getStorage(app) : null;

if (useFirebaseEmulators && isNewFirebaseApp && storage) {
  connectStorageEmulator(storage, firebaseEmulatorHost, 9199);
}

export async function testConnection(): Promise<boolean> {
  if (!auth || !db) return false;
  const user = auth.currentUser;
  if (!user) {
    return false;
  }

  try {
    await getDocs(query(collection(db, 'projects'), where('ownerId', '==', user.uid), limit(1)));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.LIST, 'projects');
    return false;
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

  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
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
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`origen.project.${project.code}`, project.id);
    }
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function getProjectByCode(code: string): Promise<Project | null> {
  try {
    const q = query(collection(db, 'projects'), where('code', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Project;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'projects');
    return null;
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
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) => {
        notifySyncStart();
        const list: Project[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) =>
          list.push(docSnap.data() as Project)
        );
        callback(list);
        notifySyncEnd();
      },
      (error: Error) => {
        notifySyncEnd();
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
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
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export async function deleteEmployeeFromFirestore(
  employeeId: string,
  companyId: string
): Promise<boolean> {
  const path = `employees/${employeeId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'employees', employeeId));
    batch.delete(doc(db, 'employeeDirectory', employeeId));
    await batch.commit();
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export async function deleteMachineryFromFirestore(
  machineryId: string,
  companyId: string
): Promise<boolean> {
  const path = `machinery/${machineryId}`;
  try {
    await deleteDoc(doc(db, 'machinery', machineryId));
    return true;
  } catch (error) {
    notifySyncEnd();
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
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: FieldVisit[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) =>
          list.push(docSnap.data() as FieldVisit)
        );
        callback(list);
      },
      (error: Error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
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
  const expenseWithOwnership = { ...expense, companyId, authorId: userId };

  // Agregar el contexto de persistencia antes de validar el registro.
  const validation = validateExpenseRecord(expenseWithOwnership);
  if (!validation.success) {
    console.error('Expense validation failed:', validation.error);
    throw new Error(
      `Datos de gasto inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const docRef = doc(db, 'expenses', expense.id);
    await setDoc(docRef, validation.data, { merge: true });
    return true;
  } catch (err) {
    notifySyncEnd();
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
    notifySyncEnd();
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
  const expenseWithOwnership = {
    ...expense,
    companyId,
    authorId: expense.authorId ?? userId,
  };

  const validation = validateExpenseRecord(expenseWithOwnership);
  if (!validation.success) {
    console.error('Expense validation failed:', validation.error);
    throw new Error(
      `Datos de gasto inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const docRef = doc(db, 'expenses', expense.id);
    await updateDoc(docRef, {
      ...validation.data,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: ExpenseRecord[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) =>
          list.push(docSnap.data() as ExpenseRecord)
        );
        callback(list);
      },
      (error: Error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
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
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) =>
          list.push(docSnap.data() as AttendanceRecord)
        );
        callback(list);
      },
      (error: Error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
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
    notifySyncEnd();
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
  const existingIds = new Set(
    existing.docs.map((item: QueryDocumentSnapshot<DocumentData>) => item.id)
  );
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
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: Employee[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) =>
          list.push(docSnap.data() as Employee)
        );
        callback(list);
        void createMissingEmployeeDirectoryEntries(list, companyId).catch((error: unknown) => {
          handleFirestoreError(error, OperationType.WRITE, `employeeDirectory/${companyId}`);
        });
      },
      (error: Error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map(
            (item: QueryDocumentSnapshot<DocumentData>) => item.data() as EmployeeDirectoryEntry
          )
        ),
      (error: Error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    notifySyncEnd();
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
    notifySyncEnd();
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
      (docSnap: QueryDocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as CompanySettings);
        } else {
          callback(null);
        }
      },
      (error: Error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map(
            (item: QueryDocumentSnapshot<DocumentData>) => item.data() as QuoteRecord
          )
        ),
      (error: Error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map(
            (item: QueryDocumentSnapshot<DocumentData>) => item.data() as APUItem
          )
        ),
      (error: Error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    notifySyncEnd();
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
    notifySyncEnd();
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function saveAPUItemsToFirestoreServer(
  items: APUItem[],
  projectId: string,
  companyId: string,
  userId: string
): Promise<boolean> {
  if (items.length > 500) {
    throw new Error('No se pueden guardar más de 500 partidas APU en una operación.');
  }

  for (const item of items) {
    const validation = validateAPUItem(item);
    if (!validation.success) {
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
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export async function updateProjectFields(
  projectId: string,
  fields: Partial<Pick<Project, 'apuBudgetTotal' | 'apuBudgetVarianceGTQ'>>
): Promise<boolean> {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), fields);
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

export async function saveQuoteToFirestore(
  quote: QuoteRecord,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `quotes/${quote.id}`;

  // Agregar metadatos antes de validar (los campos son requeridos por el schema)
  const quoteWithMeta = { ...quote, companyId, createdBy: userId, updatedBy: userId };

  // Validar datos antes de guardar
  const validation = validateQuoteRecord(quoteWithMeta);
  if (!validation.success) {
    console.error('Quote validation failed:', validation.error);
    throw new Error(
      `Datos de cotización inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    await setDoc(doc(db, 'quotes', quote.id), quoteWithMeta, { merge: true });
    return true;
  } catch (error) {
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map(
            (item: QueryDocumentSnapshot<DocumentData>) => item.data() as Machinery
          )
        ),
      (error: Error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    notifySyncEnd();
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
    notifySyncEnd();
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
    notifySyncEnd();
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
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map(
            (item: QueryDocumentSnapshot<DocumentData>) => item.data() as MachineryLog
          )
        ),
      (error: Error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    notifySyncEnd();
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
      supplier: machinery.name,
      nitSupplier: 'CF',
      facturaNumber: `FAC-${log.id}`,
      amount: log.costGTQ,
      currency: 'GTQ',
      paymentMethod: 'Pendiente',
      approvalStatus: 'Pendiente',
      machineryLogId: log.id,
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
    notifySyncEnd();
    handleFirestoreError(error, OperationType.WRITE, logPath);
    return false;
  }
}
