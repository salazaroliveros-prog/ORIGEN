import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDocFromServer,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseConfig, hasFirebaseRuntimeConfig } from './config';
import { Project, FieldVisit, ExpenseRecord, AttendanceRecord, CompanySettings } from './types';

const firebaseConfig = getFirebaseConfig();

const appConfig = {
  apiKey: firebaseConfig.apiKey || 'demo-api-key',
  authDomain: firebaseConfig.authDomain || 'demo-project.firebaseapp.com',
  projectId: firebaseConfig.projectId || 'demo-project',
  storageBucket: firebaseConfig.storageBucket || 'demo-project.firebasestorage.app',
  messagingSenderId: firebaseConfig.messagingSenderId || '000000000000',
  appId: firebaseConfig.appId || '1:000000000000:web:demo',
  measurementId: firebaseConfig.measurementId || '',
};

const app = getApps().length === 0 ? initializeApp(appConfig) : getApps()[0];
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId?.trim();

export const db = getFirestore(app, firestoreDatabaseId || undefined);
export const auth = getAuth(app);

if (!hasFirebaseRuntimeConfig()) {
  console.warn('Firebase runtime config is not fully configured. Using safe demo defaults until environment variables are injected.');
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline.');
    }
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
        const list: Project[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as Project));
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
