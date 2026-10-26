import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
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
import { getFirebaseConfig, hasFirebaseRuntimeConfig } from './config';
import { Project, FieldVisit, ExpenseRecord, AttendanceRecord, CompanySettings, Employee } from './types';
import { notifySyncStart, notifySyncEnd } from './hooks/useFirebaseSyncStatus';

const firebaseConfig = getFirebaseConfig();

if (!hasFirebaseRuntimeConfig()) {
  throw new Error('Firebase configuration is incomplete. Check the public Firebase environment variables.');
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
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId?.trim();
export const db = getFirestore(app, firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim();
if (firestoreEmulatorHost) {
  const separatorIndex = firestoreEmulatorHost.lastIndexOf(':');
  const host = separatorIndex < 0 ? firestoreEmulatorHost : firestoreEmulatorHost.slice(0, separatorIndex);
  const port = separatorIndex < 0 ? 8080 : Number(firestoreEmulatorHost.slice(separatorIndex + 1));
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST must be a hostname with an optional valid port.');
  }
  connectFirestoreEmulator(db, host, port);
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
    errMsg.includes('Disconnecting idle stream') || errMsg.includes('Timed out waiting for new targets');

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
  return new Error(serialized);
}

export async function saveProjectToFirestore(project: Project, userId: string) {
  const path = `projects/${project.id}`;
  notifySyncStart();
  try {
    const docRef = doc(db, 'projects', project.id);
    await setDoc(
      docRef,
      {
        ...project,
        ownerId: userId,
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
  userId: string
): Promise<boolean> {
  const path = `projects/${projectId}`;
  try {
    await setDoc(
      doc(db, 'projects', projectId),
      {
        ...schedule,
        ownerId: userId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeProjects(userId: string, callback: (projects: Project[]) => void): Unsubscribe {
  const path = 'projects';
  try {
    const q = query(collection(db, path), where('ownerId', '==', userId));
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

export async function deleteProjectFromFirestore(projectId: string) {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function deleteExpensesByProject(projectId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'expenses'),
      where('projectId', '==', projectId),
      where('authorId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `expenses/${projectId}`);
    return false;
  }
}

export async function deleteFieldVisitsByProject(projectId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'fieldVisits'),
      where('projectId', '==', projectId),
      where('authorId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `fieldVisits/${projectId}`);
    return false;
  }
}

export async function deleteAttendanceByProject(projectId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('projectId', '==', projectId),
      where('authorId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `attendance/${projectId}`);
    return false;
  }
}

export async function saveFieldVisitToFirestore(visit: FieldVisit, userId: string) {
  const path = `fieldVisits/${visit.id}`;
  try {
    const docRef = doc(db, 'fieldVisits', visit.id);
    await setDoc(
      docRef,
      {
        ...visit,
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

export function subscribeFieldVisits(userId: string, callback: (visits: FieldVisit[]) => void): Unsubscribe {
  const path = 'fieldVisits';
  try {
    const q = query(collection(db, path), where('authorId', '==', userId));
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

export async function saveExpenseToFirestore(expense: ExpenseRecord, userId: string) {
  const path = `expenses/${expense.id}`;
  try {
    const docRef = doc(db, 'expenses', expense.id);
    await setDoc(
      docRef,
      {
        ...expense,
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

export function subscribeExpenses(userId: string, callback: (expenses: ExpenseRecord[]) => void): Unsubscribe {
  const path = 'expenses';
  try {
    const q = query(collection(db, path), where('authorId', '==', userId));
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

export async function saveAttendanceToFirestore(record: AttendanceRecord, userId: string) {
  const path = `attendance/${record.id}`;
  try {
    const docRef = doc(db, 'attendance', record.id);
    await setDoc(
      docRef,
      {
        ...record,
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

export function subscribeAttendance(userId: string, callback: (records: AttendanceRecord[]) => void): Unsubscribe {
  const path = 'attendance';
  try {
    const q = query(collection(db, path), where('authorId', '==', userId));
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

export async function saveEmployeeToFirestore(employee: Employee, userId: string): Promise<boolean> {
  const path = `employees/${employee.id}`;
  try {
    await setDoc(
      doc(db, 'employees', employee.id),
      { ...employee, ownerId: userId },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeEmployees(userId: string, callback: (employees: Employee[]) => void): Unsubscribe {
  const path = 'employees';
  try {
    const q = query(collection(db, path), where('ownerId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Employee[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as Employee));
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

export async function saveCompanySettingsToFirestore(settings: CompanySettings, userId: string) {
  const path = `companySettings/${userId}`;
  try {
    const docRef = doc(db, 'companySettings', userId);
    await setDoc(
      docRef,
      {
        ...settings,
        ownerId: userId,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export function subscribeCompanySettings(userId: string, callback: (settings: CompanySettings | null) => void): Unsubscribe {
  const path = `companySettings/${userId}`;
  try {
    const docRef = doc(db, 'companySettings', userId);
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
