import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseConfig } from './config';
import { playNotificationChime } from './notificationService';

export interface ProjectAlert {
  id: string;
  projectId: string;
  projectName: string;
  type: 'new_report_assigned' | 'signature_required' | 'urgent_inspection' | 'general';
  title: string;
  message: string;
  capatazName?: string;
  capatazDpi?: string;
  reportCode?: string;
  timestamp: string;
  read: boolean;
  signatureRequired: boolean;
  status: 'Pendiente' | 'Firmado' | 'Revisado';
  targetRole?: string;
}

const firebaseConfig = getFirebaseConfig();

const appConfig = {
  apiKey: firebaseConfig.apiKey || 'demo-api-key',
  authDomain: firebaseConfig.authDomain || 'demo-project.firebaseapp.com',
  projectId: firebaseConfig.projectId || 'demo-project',
  storageBucket: firebaseConfig.storageBucket || 'demo-project.firebasestorage.app',
  messagingSenderId: firebaseConfig.messagingSenderId || '000000000000',
  appId: firebaseConfig.appId || '1:000000000000:web:demo',
};

const app = getApps().length === 0 ? initializeApp(appConfig) : getApps()[0];
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId?.trim();
const db = getFirestore(app, firestoreDatabaseId);

export async function isFcmSupportedInBrowser(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && (await isSupported());
}

/**
 * Requests push notification permission and acquires FCM Registration Token.
 * Persists token to Firestore database for capataces targeting.
 */
export async function requestFcmPushToken(capatazName: string = 'Don Mario Cifuentes'): Promise<{
  granted: boolean;
  token?: string;
  message: string;
}> {
  if (typeof window === 'undefined') {
    return { granted: false, message: 'Servidor SSR no soporta notificaciones web.' };
  }

  if (!('Notification' in window)) {
    return { granted: false, message: 'Su navegador no soporta notificaciones Push HTML5.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        granted: false,
        message: 'Permiso denegado. Active las notificaciones en la configuración de su navegador.',
      };
    }

    // Register FCM Service Worker if available
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[FCM] Service worker registrado:', swRegistration);
      } catch (swErr) {
        console.warn('[FCM] No se pudo registrar service worker nativo, utilizando simulador en primer plano:', swErr);
      }
    }

    let fcmToken = '';
    const fcmSupported = await isSupported();

    if (fcmSupported) {
      try {
        const messaging = getMessaging(app);
        fcmToken = await getToken(messaging, {
          vapidKey: 'BD1234567890_DEMO_VAPID_KEY_CONSTRUCTERP_GUATEMALA',
          serviceWorkerRegistration: swRegistration,
        });
      } catch (err) {
        console.warn('[FCM] Fallback a token local por entorno de previsualización:', err);
        fcmToken = `fcm-capataz-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }
    } else {
      fcmToken = `fcm-capataz-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Save FCM Token record in Firestore
    const tokenDocRef = doc(db, 'fcm_tokens', fcmToken);
    await setDoc(
      tokenDocRef,
      {
        token: fcmToken,
        capatazName,
        role: 'Capataz General de Obra',
        platform: 'Web App FCM Mobile',
        updatedAt: new Date().toISOString(),
        active: true,
      },
      { merge: true }
    );

    return {
      granted: true,
      token: fcmToken,
      message: '¡Notificaciones Push de Firebase FCM activadas correctamente para el Capataz!',
    };
  } catch (error) {
    console.error('[FCM] Error al solicitar permisos push:', error);
    return {
      granted: false,
      message: 'Error al activar notificaciones Push. Intente de nuevo.',
    };
  }
}

/**
 * Sends a new push notification alert to capataces when a field report is assigned or signature is required.
 * Writes record to Firestore collection `/project_alerts` and triggers browser push notification.
 */
export async function sendCapatazProjectAlert(alertData: Omit<ProjectAlert, 'id' | 'timestamp' | 'read' | 'status'>): Promise<string> {
  const alertId = `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  const fullAlert: ProjectAlert = {
    ...alertData,
    id: alertId,
    timestamp,
    read: false,
    status: alertData.signatureRequired ? 'Pendiente' : 'Revisado',
  };

  try {
    // Write alert doc to Firestore
    const alertRef = doc(db, 'project_alerts', alertId);
    await setDoc(alertRef, fullAlert);

    // Trigger local push notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(`🏗️ ${fullAlert.title}`, {
          body: `${fullAlert.message} (Obra: ${fullAlert.projectName})`,
          icon: '/assets/branding/icon-192x192.png',
          badge: '/assets/branding/icon-192x192.png',
          tag: alertId,
          vibrate: [200, 100, 200],
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.debug('Push notification trigger fallback:', err);
      }
    }

    // Play chime sound for high-priority alerts
    playNotificationChime();

    return alertId;
  } catch (err) {
    console.error('Error saving FCM project alert to Firestore:', err);
    return alertId;
  }
}

/**
 * Real-time listener for Firestore project alerts.
 */
export function subscribeCapatazAlerts(callback: (alerts: ProjectAlert[]) => void) {
  const alertsQuery = query(collection(db, 'project_alerts'), orderBy('timestamp', 'desc'), limit(20));

  return onSnapshot(
    alertsQuery,
    (snapshot) => {
      const list: ProjectAlert[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ProjectAlert);
      });
      callback(list);
    },
    (error) => {
      console.warn('Error listening to project_alerts snapshot:', error);
      // Fallback initial demo alerts
      callback(INITIAL_DEMO_ALERTS);
    }
  );
}

/**
 * Marks an alert as read / signed in Firestore.
 */
export async function markAlertAsSigned(alertId: string, signerName: string) {
  try {
    const alertRef = doc(db, 'project_alerts', alertId);
    await updateDoc(alertRef, {
      read: true,
      status: 'Firmado',
      signedBy: signerName,
      signedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update alert status in Firestore:', err);
  }
}

export const INITIAL_DEMO_ALERTS: ProjectAlert[] = [
  {
    id: 'alt-101',
    projectId: 'p1',
    projectName: 'Torre Residencial Vista Hermosa IV',
    type: 'signature_required',
    title: 'Firma Requerida: Vaciado de Concreto Losa Nivel 4',
    message: 'El residente de obra ha cargado el reporte de vaciado con prueba de slump test. Se requiere su firma digital en la bitácora.',
    capatazName: 'Don Mario Cifuentes',
    capatazDpi: '2489 10293 0101',
    reportCode: 'BIT-2026-088',
    timestamp: new Date().toISOString(),
    read: false,
    signatureRequired: true,
    status: 'Pendiente',
  },
  {
    id: 'alt-102',
    projectId: 'p2',
    projectName: 'Bodegas Logísticas Intercentro',
    type: 'new_report_assigned',
    title: 'Nuevo Reporte de Campo Asignado: Compactación',
    message: 'Se le ha asignado la inspección técnica de subrasante y paso de rodillo vibratorio en el patio de maniobras.',
    capatazName: 'Esteban Morales',
    reportCode: 'REP-2026-042',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true,
    signatureRequired: false,
    status: 'Revisado',
  },
];
