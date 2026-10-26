import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { app, auth, db } from './firebaseService';
import { playNotificationChime } from './notificationService';

export interface ProjectAlert {
  id: string;
  ownerId: string;
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

  const user = auth.currentUser;
  if (!user) {
    return { granted: false, message: 'Inicie sesión antes de activar las notificaciones.' };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    return {
      granted: false,
      message: 'Falta configurar NEXT_PUBLIC_FIREBASE_VAPID_KEY para activar las notificaciones.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        granted: false,
        message: 'Permiso denegado. Active las notificaciones en la configuración de su navegador.',
      };
    }

    if (!(await isSupported())) {
      return { granted: false, message: 'Este navegador no soporta Firebase Cloud Messaging.' };
    }

    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    if (!fcmToken) {
      throw new Error('Firebase no devolvió un token de registro válido.');
    }

    // Save FCM Token record in Firestore
    const tokenDocRef = doc(db, 'fcm_tokens', fcmToken);
    await setDoc(
      tokenDocRef,
      {
        token: fcmToken,
        ownerId: user.uid,
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
      message:
        error instanceof Error
          ? `No se pudieron activar las notificaciones: ${error.message}`
          : 'No se pudieron activar las notificaciones. Intente de nuevo.',
    };
  }
}

/**
 * Sends a new push notification alert to capataces when a field report is assigned or signature is required.
 * Writes record to Firestore collection `/project_alerts` and triggers browser push notification.
 */
export async function sendCapatazProjectAlert(
  alertData: Omit<ProjectAlert, 'id' | 'ownerId' | 'timestamp' | 'read' | 'status'>
): Promise<string> {
  const ownerId = auth.currentUser?.uid;
  if (!ownerId) {
    throw new Error('Inicie sesión antes de crear una alerta.');
  }

  const alertRef = doc(collection(db, 'project_alerts'));
  const alertId = alertRef.id;
  const timestamp = new Date().toISOString();

  const fullAlert: ProjectAlert = {
    ...alertData,
    id: alertId,
    ownerId,
    timestamp,
    read: false,
    status: alertData.signatureRequired ? 'Pendiente' : 'Revisado',
  };

  await setDoc(alertRef, fullAlert);

  // Trigger local push notification if granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(`🏗️ ${fullAlert.title}`, {
        body: `${fullAlert.message} (Obra: ${fullAlert.projectName})`,
        icon: '/assets/branding/icon-192x192.png',
        badge: '/assets/branding/icon-192x192.png',
        tag: alertId,
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
}

/**
 * Real-time listener for Firestore project alerts.
 */
export function subscribeCapatazAlerts(callback: (alerts: ProjectAlert[]) => void) {
  let unsubscribeSnapshot: (() => void) | undefined;
  const unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = undefined;

      if (!user) {
        callback([]);
        return;
      }

      const alertsQuery = query(
        collection(db, 'project_alerts'),
        where('ownerId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      unsubscribeSnapshot = onSnapshot(
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
          callback([]);
        }
      );
    },
    (error) => {
      console.warn('Error listening to Firebase authentication state for project alerts:', error);
      callback([]);
    }
  );

  return () => {
    unsubscribeAuth();
    unsubscribeSnapshot?.();
  };
}

/**
 * Marks an alert as read / signed in Firestore.
 */
export async function markAlertAsSigned(alertId: string, signerName: string) {
  if (!auth.currentUser) {
    throw new Error('Inicie sesión antes de firmar una alerta.');
  }
  const alertRef = doc(db, 'project_alerts', alertId);
  await updateDoc(alertRef, {
    read: true,
    status: 'Firmado',
    signedBy: signerName,
    signedAt: new Date().toISOString(),
  });
}
