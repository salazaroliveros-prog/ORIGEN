import { initializeApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { toast } from 'react-hot-toast';

import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  getDoc,
  runTransaction,
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
  ProjectPhotoRecord,
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
  FelInvoice,
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
import { stripUndefined } from './utils/firestorePayload';
import {
  buildMachineryRecord,
  resolveMachineryUse,
  MACHINERY_DELETION_BLOCKED_MESSAGE,
} from './domain/machinery';
import {
  buildAPUItemRecords,
  buildAttendanceRecord,
  buildEmployeeRecord,
  mergeAttendanceUpdate,
  mergeFieldVisitUpdate,
} from './domain/ownership';
import {
  normalizeFelInvoiceItems,
  calculateFelInvoiceTotals,
  validateFelInvoice,
} from './domain/felInvoice';

const firebaseConfig = getFirebaseConfig();

// `throw` no se hace en tiempo de evaluación del módulo: este archivo
// también se importa desde rutas de servidor (vía `lib/apiMiddleware`) y
// Next.js lo evalúa durante el build (colección de datos de página) sin
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
// El modo emulador se decide SOLO por la variable pública, igual que
// `apiAuth.ts` y `storageRest.ts`. Antes exigía además `NODE_ENV=development`,
// lo que hacía imposible validar un build de producción contra los emuladores
// (el cliente se conectaba a Google con el projectId demo y el login fallaba).
// Si por error se activa en un despliegue real, la app apunta a 127.0.0.1 y
// falla de forma visible: no hay riesgo de escribir datos en otro proyecto.
const useFirebaseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const firebaseEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';

if (useFirebaseEmulators && process.env.NODE_ENV === 'production') {
  console.warn(
    '[firebase] NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true en un build de producción: la app usará los emuladores locales.'
  );
}

// Conexión directa a Firebase/Firestore sin capa intermedia de verificación de aplicaciones.

const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId?.trim() || '(default)';

/**
 * Firestore persistence for browser-based field work.
 *
 * The SDK stores local reads and queued writes in IndexedDB and coordinates
 * multiple tabs. On the server we keep the default memory instance. Browsers
 * where IndexedDB persistence is unavailable fall back to the memory cache;
 * this must never prevent the application from starting.
 */
function createFirestoreInstance(): ReturnType<typeof getFirestore> | null {
  if (!app) return null;
  if (typeof window === 'undefined') {
    return getFirestore(app, firestoreDatabaseId);
  }

  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firestoreDatabaseId
    );
  } catch (error) {
    console.warn(
      '[firebase] IndexedDB persistence is unavailable; falling back to the in-memory Firestore cache.',
      error
    );
    return getFirestore(app, firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
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
    // La propiedad no cambia al editar: si el documento ya existe se conservan
    // `ownerId`/`createdBy`. La lectura es best-effort: las reglas deniegan el
    // `get` de un documento inexistente, así que un fallo aquí significa
    // simplemente que el proyecto es nuevo.
    let existingProject: Project | null = null;
    try {
      const existingSnapshot = await getDoc(docRef);
      if (existingSnapshot.exists()) {
        existingProject = existingSnapshot.data() as Project;
      }
    } catch {
      existingProject = null;
    }

    await setDoc(
      docRef,
      stripUndefined({
        ...project,
        companyId,
        // La propiedad no cambia al editar: `firestore.rules` exige que
        // `ownerId` y `createdBy` conserven su valor original. Sobrescribirlos
        // con el usuario que edita hacía fallar cualquier actualización hecha
        // por alguien distinto del creador.
        ownerId: existingProject?.ownerId ?? project.ownerId ?? userId,
        createdBy: existingProject?.createdBy ?? project.createdBy ?? userId,
      }),
      { merge: true }
    );
    notifySyncEnd(true);
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
    const docRef = doc(db, 'projects', projectId);
    const existing = await getDoc(docRef);

    if (existing.exists()) {
      // `updateDoc` sólo toca los campos del cronograma: así `ownerId`,
      // `createdBy` y `companyId` conservan su valor y las reglas aceptan la
      // escritura aunque la haga un PM o un administrador distinto del dueño.
      await updateDoc(
        docRef,
        stripUndefined({
          ...schedule,
          updatedBy: userId,
        })
      );
    } else {
      // El proyecto aún no existe en Firestore (p. ej. datos locales): se crea
      // con los campos de propiedad, que las reglas exigen en la creación.
      await setDoc(
        docRef,
        stripUndefined({
          ...schedule,
          companyId,
          ownerId: userId,
          createdBy: userId,
          updatedBy: userId,
        }),
        { merge: true }
      );
    }
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeProjects(
  companyId: string,
  callback: (projects: Project[]) => void,
  onError?: (error: Error) => void
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
        onError?.(error);
        notifySyncEnd();
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    notifySyncEnd();
    onError?.(err instanceof Error ? err : new Error(String(err)));
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export async function saveProjectPhotoToFirestore(
  projectId: string,
  companyId: string,
  input: Pick<ProjectPhotoRecord, 'id' | 'filename' | 'storagePath' | 'uploadedAt' | 'size'>
): Promise<ProjectPhotoRecord> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(projectId) || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.id)) {
    throw new Error('La referencia del proyecto o de la foto no es válida.');
  }
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new Error('Debes iniciar sesión para guardar la foto del proyecto.');
  if (!companyId || !Number.isFinite(input.size) || input.size <= 0 || input.size > 10 * 1024 * 1024) {
    throw new Error('Los metadatos de la foto no son válidos.');
  }
  if (input.storagePath !== `projects/${projectId}/progress/${input.filename}`) {
    throw new Error('La ruta de la foto no corresponde al proyecto seleccionado.');
  }

  const record: ProjectPhotoRecord = { ...input, projectId, companyId, uploadedBy: userId };
  await setDoc(doc(getDbOrThrow(), 'projects', projectId, 'photos', input.id), stripUndefined(record));
  return record;
}

export function subscribeProjectPhotos(
  projectId: string,
  callback: (photos: ProjectPhotoRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `projects/${projectId}/photos`;
  try {
    return onSnapshot(
      collection(getDbOrThrow(), 'projects', projectId, 'photos'),
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(snapshot.docs.map((photo: QueryDocumentSnapshot<DocumentData>) => photo.data() as ProjectPhotoRecord)),
      (error: Error) => {
        const normalized = handleFirestoreError(error, OperationType.LIST, path);
        onError?.(normalized instanceof Error ? normalized : error);
      }
    );
  } catch (error) {
    const normalized = handleFirestoreError(error, OperationType.LIST, path);
    onError?.(normalized instanceof Error ? normalized : error as Error);
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
  _companyId: string
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
    // Un equipo con operaciones registradas no se borra: sus bitácoras y gastos
    // quedarían huérfanos y el costo de obra perdería trazabilidad.
    //
    // La consulta filtra por `companyId` además de por `machineryId`:
    //  1. `firestore.rules` solo permite listar `machineryLogs` cuando puede
    //     probar la pertenencia a la empresa (`resource.data.companyId`), y eso
    //     exige un filtro por ese campo en la consulta.
    //  2. Sin ese filtro la consulta recorrería las bitácoras de todas las
    //     empresas (filtrado en el cliente, no en el servidor).
    const logsSnap = await getDocs(
      query(
        collection(db, 'machineryLogs'),
        where('companyId', '==', companyId),
        where('machineryId', '==', machineryId),
        limit(1)
      )
    );
    if (!logsSnap.empty) {
      throw new Error(MACHINERY_DELETION_BLOCKED_MESSAGE);
    }
    await deleteDoc(doc(db, 'machinery', machineryId));
    return true;
  } catch (error) {
    notifySyncEnd();
    // El motivo de negocio se propaga para que la UI lo muestre tal cual.
    if (error instanceof Error && error.message === MACHINERY_DELETION_BLOCKED_MESSAGE) {
      throw error;
    }
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
      stripUndefined({
        ...visit,
        companyId,
        authorId: userId,
      }),
      { merge: true }
    );
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function updateFieldVisitToFirestore(
  visit: Partial<FieldVisit> & { id: string },
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `fieldVisits/${visit.id}`;
  try {
    const existing = await getDoc(doc(db, 'fieldVisits', visit.id));
    if (!existing.exists()) {
      console.error('Field visit not found', { visitId: visit.id });
      return false;
    }

    const mergedVisit = mergeFieldVisitUpdate(
      existing.data() as FieldVisit,
      visit,
      companyId,
      userId
    );

    const docRef = doc(db, 'fieldVisits', visit.id);
    await setDoc(docRef, stripUndefined(mergedVisit), { merge: true });
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteFieldVisitFromFirestore(visitId: string): Promise<boolean> {
  const path = `fieldVisits/${visitId}`;
  try {
    await deleteDoc(doc(db, 'fieldVisits', visitId));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export function subscribeFieldVisits(
  companyId: string,
  callback: (visits: FieldVisit[]) => void,
  onError?: (error: Error) => void
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
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    if (err instanceof Error) onError?.(err);
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
    await setDoc(docRef, stripUndefined(validation.data), { merge: true });
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
    await updateDoc(
      docRef,
      stripUndefined({
        ...validation.data,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      })
    );
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

export function subscribeExpenses(
  companyId: string,
  callback: (expenses: ExpenseRecord[]) => void,
  onError?: (error: Error) => void
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
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    if (err instanceof Error) onError?.(err);
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

  // El contexto de persistencia se agrega antes de validar: `companyId` y
  // `authorId` son obligatorios en el schema y los aporta el servidor.
  const recordWithOwnership = buildAttendanceRecord(record, companyId, userId);

  // Validar datos antes de guardar
  const validation = validateAttendanceRecord(recordWithOwnership);
  if (!validation.success) {
    console.error('Attendance validation failed:', validation.error);
    throw new Error(
      `Datos de asistencia inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const docRef = doc(db, 'attendance', record.id);
    await setDoc(docRef, stripUndefined(recordWithOwnership), { merge: true });
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function updateAttendanceToFirestore(
  record: Partial<AttendanceRecord> & { id: string },
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `attendance/${record.id}`;
  try {
    // Construir el registro completo con propiedad para validación
    const existing = await getDoc(doc(db, 'attendance', record.id));
    if (!existing.exists()) {
      console.error('Attendance record not found', { attendanceId: record.id });
      return false;
    }

    const recordWithOwnership = mergeAttendanceUpdate(
      existing.data() as AttendanceRecord,
      record,
      companyId,
      userId
    );

    // Validar datos antes de guardar
    const validation = validateAttendanceRecord(recordWithOwnership);
    if (!validation.success) {
      console.error('Attendance update validation failed:', validation.error);
      throw new Error(
        `Datos de asistencia inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }

    const docRef = doc(db, 'attendance', record.id);
    await setDoc(docRef, stripUndefined(recordWithOwnership), { merge: true });
    return true;
  } catch (err) {
    notifySyncEnd();
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeAttendance(
  companyId: string,
  callback: (records: AttendanceRecord[]) => void,
  onError?: (error: Error) => void
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
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    if (err instanceof Error) onError?.(err);
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

  // El contexto de persistencia se agrega antes de validar: `companyId`,
  // `ownerId` y `createdBy` los aporta el servidor y las reglas exigen que
  // `ownerId` coincida con `companyId`.
  const employeeWithOwnership = buildEmployeeRecord(employee, companyId, userId);

  // Validar datos antes de guardar
  const validation = validateEmployee(employeeWithOwnership);
  if (!validation.success) {
    console.error('Employee validation failed:', validation.error);
    throw new Error(
      `Datos de empleado inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'employees', employee.id), stripUndefined(employeeWithOwnership), {
      merge: true,
    });
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

export async function updateEmployeeToFirestore(
  employee: Partial<Employee> & { id: string },
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `employees/${employee.id}`;
  try {
    const existing = await getDoc(doc(db, 'employees', employee.id));
    if (!existing.exists()) {
      console.error('Employee not found', { employeeId: employee.id });
      return false;
    }

    const mergedEmployee: Employee = {
      ...(existing.data() as Employee),
      ...employee,
      updatedBy: userId,
    };

    const employeeWithOwnership = buildEmployeeRecord(mergedEmployee, companyId, userId);

    const validation = validateEmployee(employeeWithOwnership);
    if (!validation.success) {
      console.error('Employee update validation failed:', validation.error);
      throw new Error(
        `Datos de empleado inválidos: ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'employees', employee.id), stripUndefined(employeeWithOwnership), {
      merge: true,
    });
    batch.set(doc(db, 'employeeDirectory', employee.id), {
      id: employee.id,
      companyId,
      name: mergedEmployee.name,
      role: mergedEmployee.role,
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
  callback: (employees: Employee[]) => void,
  onError?: (error: Error) => void
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
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (err) {
    if (err instanceof Error) onError?.(err);
    notifySyncEnd();
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export function subscribeEmployeeDirectory(
  companyId: string,
  callback: (employees: EmployeeDirectoryEntry[]) => void,
  onError?: (error: Error) => void
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
      (error: Error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    if (error instanceof Error) onError?.(error);
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
      stripUndefined({
        ...settings,
        companyId,
        ownerId: companyId,
      }),
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
  callback: (settings: CompanySettings | null) => void,
  onError?: (error: Error) => void
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
        const normalized = handleFirestoreError(error, OperationType.GET, path);
        onError?.(normalized);
      }
    );
  } catch (err) {
    notifySyncEnd();
    const normalized = handleFirestoreError(err, OperationType.GET, path);
    onError?.(normalized);
    return () => {};
  }
}

export function subscribeQuotes(
  companyId: string,
  callback: (quotes: QuoteRecord[]) => void,
  onError?: (error: Error) => void
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
      (error: Error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    if (error instanceof Error) onError?.(error);
    notifySyncEnd();
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}
export function subscribeAPUItems(
  companyId: string,
  callback: (items: APUItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'apuItems';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map((item: QueryDocumentSnapshot<DocumentData>) => item.data() as APUItem)
        ),
      (error: Error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    if (error instanceof Error) onError?.(error);
    notifySyncEnd();
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Construye el registro APU completo que se persiste en Firestore.
 *
 * `companyId`, `projectId` y `createdBy` los agrega el servidor y son
 * obligatorios en `APUItemSchema`, por lo que el registro debe quedar
 * completo **antes** de validar: validar el borrador (sin esos campos)
 * hace fallar siempre la validación.
 *
 * @see lib/domain/ownership.ts
 */
export async function saveAPUItemsToFirestore(
  items: APUItem[],
  projectId: string,
  companyId: string,
  userId: string
): Promise<boolean> {
  if (items.length > 500) {
    throw new Error('No se pueden guardar más de 500 partidas APU en una operación.');
  }

  const records = buildAPUItemRecords(items, projectId, companyId, userId);

  // Validar cada item con Zod
  for (const record of records) {
    const validation = validateAPUItem(record);
    if (!validation.success) {
      console.error('APU Item validation failed:', validation.error);
      throw new Error(
        `Datos de partida APU inválidos (${record.code}): ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }
  }

  const path = 'apuItems';
  try {
    const batch = writeBatch(db);
    for (const record of records) {
      batch.set(doc(db, path, record.id), stripUndefined(record), { merge: true });
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

  const records = buildAPUItemRecords(items, projectId, companyId, userId);

  for (const record of records) {
    const validation = validateAPUItem(record);
    if (!validation.success) {
      console.error('APU Item validation failed:', validation.error);
      throw new Error(
        `Datos de partida APU inválidos (${record.code}): ${validation.error.issues.map((i) => i.message).join(', ')}`
      );
    }
  }

  const path = 'apuItems';
  try {
    const batch = writeBatch(db);
    for (const record of records) {
      batch.set(doc(db, path, record.id), stripUndefined(record), { merge: true });
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
    await setDoc(doc(db, 'quotes', quote.id), stripUndefined(quoteWithMeta), { merge: true });
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

export async function deleteQuoteFromFirestore(quoteId: string): Promise<boolean> {
  const path = `quotes/${quoteId}`;
  try {
    await deleteDoc(doc(db, 'quotes', quoteId));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export function subscribeMachinery(
  companyId: string,
  callback: (machinery: Machinery[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'machinery';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot: QuerySnapshot<DocumentData>) =>
        callback(
          snapshot.docs.map((item: QueryDocumentSnapshot<DocumentData>) => item.data() as Machinery)
        ),
      (error: Error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    if (error instanceof Error) onError?.(error);
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
  // El formulario no conoce la empresa: se completa aquí, antes de validar.
  const record = buildMachineryRecord(machinery, companyId, userId);
  const validation = validateMachinery(record);
  if (!validation.success) {
    console.error('Machinery validation failed:', validation.error);
    throw new Error(
      `Datos de maquinaria inválidos: ${validation.error.issues.map((issue) => issue.message).join(', ')}`
    );
  }

  try {
    await setDoc(doc(db, 'machinery', machinery.id), stripUndefined(record), { merge: true });
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
  const validation = validateMachinery({ ...machinery, status, companyId });
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

/**
 * Actualiza campos editables de maquinaria (nombre, modelo, placa, tarifa, etc.).
 * No permite cambiar id, companyId, createdBy ni status (usa updateMachineryStatusInFirestore para eso).
 */
export async function updateMachineryInFirestore(
  machinery: Machinery,
  data: Partial<Pick<Machinery, 'name' | 'model' | 'plateOrCode' | 'hourlyRateGTQ'>>,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `machinery/${machinery.id}`;

  // Construir objeto completo para validación (usar valores existentes para campos no enviados)
  const record: Machinery = {
    ...machinery,
    ...data,
    id: machinery.id,
    companyId,
    createdBy: machinery.createdBy ?? userId,
    updatedBy: userId,
  };

  const validation = validateMachinery(record);
  if (!validation.success) {
    console.error('Machinery update validation failed:', validation.error);
    throw new Error(
      `Datos de maquinaria inválidos: ${validation.error.issues.map((issue) => issue.message).join(', ')}`
    );
  }

  // Solo enviar los campos que el usuario realmente quiere cambiar (excluir protegidos: status, currentProjectId, currentHorometer)
  const updateFields: Partial<Machinery> = {};
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.model !== undefined) updateFields.model = data.model;
  if (data.plateOrCode !== undefined) updateFields.plateOrCode = data.plateOrCode;
  if (data.hourlyRateGTQ !== undefined) updateFields.hourlyRateGTQ = data.hourlyRateGTQ;
  updateFields.updatedBy = userId;

  try {
    await updateDoc(doc(db, 'machinery', machinery.id), stripUndefined(updateFields));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

export function subscribeMachineryLogs(
  companyId: string,
  callback: (logs: MachineryLog[]) => void,
  onError?: (error: Error) => void
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
      (error: Error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    if (error instanceof Error) onError?.(error);
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
    if (!companyId || !userId || !log.id || !machinery.id) {
      throw new Error('Falta el contexto de empresa, usuario, equipo o bitácora.');
    }

    const machineRef = doc(db, 'machinery', machinery.id);
    const logRef = doc(db, 'machineryLogs', log.id);
    const expenseId = `machine-${log.id}`;
    const expenseRef = doc(db, 'expenses', expenseId);

    // Read the authoritative meter and reserve both immutable IDs before
    // writing. Firestore retries the transaction if another use updates the
    // meter concurrently; a stale UI snapshot is rejected instead of winning.
    await runTransaction(db, async (transaction) => {
      const [machineSnapshot, logSnapshot, expenseSnapshot] = await Promise.all([
        transaction.get(machineRef),
        transaction.get(logRef),
        transaction.get(expenseRef),
      ]);

      if (!machineSnapshot.exists()) {
        throw new Error('La maquinaria ya no existe. Actualiza la lista e intenta nuevamente.');
      }
      const currentMachinery = machineSnapshot.data() as Machinery;
      if (currentMachinery.companyId !== companyId || currentMachinery.id !== machinery.id) {
        throw new Error('La maquinaria no pertenece a la empresa activa.');
      }
      if (currentMachinery.status === 'Mantenimiento') {
        throw new Error('No se puede registrar uso mientras el equipo está en mantenimiento.');
      }
      if (currentMachinery.currentHorometer !== machinery.currentHorometer) {
        throw new Error('El horómetro cambió desde que abriste el formulario. Actualiza los datos e intenta nuevamente.');
      }
      if (currentMachinery.status === 'En Obra' && currentMachinery.currentProjectId !== log.projectId) {
        throw new Error('La maquinaria sigue asignada a otro proyecto. Finaliza su uso antes de cambiarla de obra.');
      }
      if (log.machineryId !== currentMachinery.id) {
        throw new Error('La bitácora no corresponde al equipo seleccionado.');
      }
      if (logSnapshot.exists() || expenseSnapshot.exists()) {
        throw new Error('La bitácora o el gasto ya existen. No se repetirá el registro de esta operación.');
      }

      // Hours, amount and next meter reading are derived only from the
      // persisted equipment, never from a potentially stale client object.
      const normalized = resolveMachineryUse(log, currentMachinery);
      if (normalized.expense.id !== expenseId) {
        throw new Error('El identificador del gasto no coincide con la bitácora.');
      }

      const normalizedLog: MachineryLog = {
        ...log,
        ...normalized.log,
        expenseId,
        companyId,
        createdBy: userId,
      };
      const expense: ExpenseRecord = {
        ...normalized.expense,
        companyId,
        authorId: userId,
      };

      transaction.update(machineRef, {
        currentHorometer: normalized.nextHorometer,
        currentProjectId: normalized.machineryUpdate.currentProjectId,
        status: normalized.machineryUpdate.status,
        lastMachineryLogId: log.id,
        updatedBy: userId,
      });
      transaction.set(logRef, stripUndefined(normalizedLog));
      transaction.set(expenseRef, stripUndefined(expense));
    });
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.WRITE, logPath);
    return false;
  }
}

/**
 * Elimina un proyecto de Firestore.
 *
 * Debe llamarse DESPUÉS de verificar con `hasProjectDependencies` que no hay
 * dependencias (gastos, APU, cotizaciones, asistencia, logs de maquinaria).
 * Si se llama con dependencias activas, los documentos relacionados quedarán
 * huérfanos. La verificación previa es responsabilidad del llamador (hook/UI).
 */
export async function deleteProjectFromFirestore(
  projectId: string,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Guarda una factura FEL en Firestore.
 * Normaliza los ítems y calcula los totales antes de persistir.
 */
export async function saveFelInvoiceToFirestore(
  invoice: FelInvoice,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `felInvoices/${invoice.id}`;

  // Normalizar ítems y calcular totales antes de validar
  const normalizedItems = normalizeFelInvoiceItems(invoice.items);
  const totals = calculateFelInvoiceTotals(normalizedItems);

  const record: FelInvoice = {
    ...invoice,
    ...(normalizedItems.length > 0 && { items: normalizedItems }),
    companyId,
    authorId: userId,
    subtotalGTQ: totals.subtotalGTQ,
    taxAmountGTQ: totals.taxAmountGTQ,
    totalGTQ: totals.totalGTQ,
    createdAt: invoice.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Validar antes de guardar
  const validationErrors = validateFelInvoice(record);
  if (validationErrors.length > 0) {
    console.error('Factura FEL inválida:', validationErrors);
    throw new Error(`Datos de factura inválidos: ${validationErrors.join(', ')}`);
  }

  try {
    await setDoc(doc(db, 'felInvoices', invoice.id), stripUndefined(record), {
      merge: true,
    });
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Actualiza una factura FEL existente.
 */
export async function updateFelInvoiceToFirestore(
  invoice: FelInvoice,
  companyId: string,
  userId: string
): Promise<boolean> {
  const path = `felInvoices/${invoice.id}`;

  const normalizedItems = normalizeFelInvoiceItems(invoice.items);
  const totals = calculateFelInvoiceTotals(normalizedItems);

  const record: FelInvoice = {
    ...invoice,
    items: normalizedItems,
    companyId,
    authorId: invoice.authorId ?? userId,
    subtotalGTQ: totals.subtotalGTQ,
    taxAmountGTQ: totals.taxAmountGTQ,
    totalGTQ: totals.totalGTQ,
    updatedAt: new Date().toISOString(),
  };

  const validationErrors = validateFelInvoice(record);
  if (validationErrors.length > 0) {
    console.error('Factura FEL inválida:', validationErrors);
    throw new Error(`Datos de factura inválidos: ${validationErrors.join(', ')}`);
  }

  try {
    await updateDoc(doc(db, 'felInvoices', invoice.id), stripUndefined(record));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

/**
 * Elimina una factura FEL.
 */
export async function deleteFelInvoiceFromFirestore(invoiceId: string): Promise<boolean> {
  const path = `felInvoices/${invoiceId}`;
  try {
    await deleteDoc(doc(db, 'felInvoices', invoiceId));
    return true;
  } catch (error) {
    notifySyncEnd();
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Suscribe a las facturas FEL de una empresa.
 */
export function subscribeFelInvoices(
  companyId: string,
  callback: (invoices: FelInvoice[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'felInvoices';
  try {
    return onSnapshot(
      query(collection(db, path), where('companyId', '==', companyId)),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: FelInvoice[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) =>
          list.push(docSnap.data() as FelInvoice)
        );
        callback(list);
      },
      (error: Error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    if (error instanceof Error) onError?.(error);
    notifySyncEnd();
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}


/** Datos de contacto privados asociados exclusivamente al UID autenticado. */
export interface UserProfileRecord {
  uid: string;
  phoneNumber: string;
  updatedAt: string;
}

export async function getUserProfileFromFirestore(userId: string): Promise<UserProfileRecord | null> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    throw new Error('El identificador del usuario no es válido.');
  }
  const snapshot = await getDoc(doc(getDbOrThrow(), 'userProfiles', userId));
  if (!snapshot.exists()) return null;
  const profile = snapshot.data() as UserProfileRecord;
  if (profile.uid !== userId) {
    throw new Error('El perfil privado no coincide con el usuario autenticado.');
  }
  return profile;
}

export async function saveUserProfileToFirestore(
  userId: string,
  input: { phoneNumber: string }
): Promise<UserProfileRecord> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    throw new Error('El identificador del usuario no es válido.');
  }
  if (typeof input.phoneNumber !== 'string' || input.phoneNumber.trim().length > 32) {
    throw new Error('El teléfono debe tener máximo 32 caracteres.');
  }

  const profile: UserProfileRecord = {
    uid: userId,
    phoneNumber: input.phoneNumber.trim(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(getDbOrThrow(), 'userProfiles', userId), stripUndefined(profile), { merge: true });
  return profile;
}
