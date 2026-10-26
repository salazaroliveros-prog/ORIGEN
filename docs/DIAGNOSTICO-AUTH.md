# Diagnóstico del Sistema de Autenticación

**Fecha**: 26 de Octubre 2026  
**Analista**: QA Engineer  
**Estado**: ✅ CORREGIDO

---

## 📊 CONFIGURACIÓN ACTUAL

### Firebase Configuration (.env)
- **Project ID**: origen-erp-guatemala
- **Auth Domain**: origen-erp-guatemala.firebaseapp.com
- **API Key**: AIzaSyDJ2pF5j_1jwuKFqYPoglDX9vFUw2g5YHI
- **App ID**: 1:893831571998:web:4e38903eeb0dff05011c0f
- **Storage Bucket**: origen-erp-guatemala.firebasestorage.app
- **Messaging Sender ID**: 893831571998

### Dominios Autorizados
- `http://localhost:3000` - Para desarrollo
- `https://origen-one-kohl.vercel.app` - Dominio de producción

---

## ❌ PROBLEMA IDENTIFICADO Y CORREGIDO

### Error Original
**Mensaje**: `auth/internal-error`  
**Causa Raíz**: El archivo `firebase-applet-config.json` estaba vacío y el código de configuración (`lib/config.ts`) lo importaba, resultando en una configuración de Firebase incompleta (valores vacíos).

### Solución Aplicada
**Archivo modificado**: `lib/config.ts`

**Cambios**:
1. Eliminado el import de `firebase-applet-config.json`
2. Configuración ahora usa directamente las variables de entorno `NEXT_PUBLIC_FIREBASE_*`
3. Agregado logging para diagnosticar configuración incompleta
4. El archivo JSON ya no afecta la configuración

**Código corregido**:
```typescript
// Usar directamente variables de entorno - ignorar archivo JSON
export const firebaseRuntimeConfig: FirebaseRuntimeConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || '',
};
```

---

## ✅ VERIFICACIÓN DE LOGIN

### Requisitos para que el login funcione

#### 1. Variables de entorno configuradas
Las variables deben estar en:
- ✅ `.env` local (para desarrollo)
- ✅ Vercel Environment Variables (para producción)
- ✅ GitHub Secrets (para CI)

#### 2. Dominios autorizados en Firebase Console
Ir a Firebase Console → Authentication → Sign-in method → Google → Configuración de dominios autorizados

Deben incluir:
- `http://localhost:3000` (desarrollo)
- `https://origen-one-kohl.vercel.app` (producción)

#### 3. Provider Google habilitado
- Firebase Console → Authentication → Sign-in method
- Google debe estar habilitado
- Web Client SDK debe estar activo

#### 4. Bloqueador de popups deshabilitado
- Deshabilitar bloqueador de popups en el navegador para localhost:3000

---

## 🔍 POSIBLES PROBLEMAS RESTANTES

### 1. Dominio no autorizado
**Error**: `auth/unauthorized-domain`  
**Solución**: Agregar dominio en Firebase Console

### 2. Cliente OAuth incorrecto
**Error**: `auth/invalid-oauth-client-id`  
**Solución**: Verificar Client ID en Firebase Console

### 3. Popup bloqueado
**Error**: `auth/popup-blocked`  
**Solución**: Deshabilitar bloqueador de popups

---

## 📝 ESTADO DE IMPLEMENTACIÓN

### Código de Autenticación
- ✅ `lib/firebaseAuth.ts` - Implementado correctamente
- ✅ `components/AuthDialog.tsx` - UI implementada
- ✅ Soporte para Google OAuth (signInWithPopup)
- ✅ Soporte para correo/contraseña (signInWithEmailAndPassword)
- ✅ Manejo de errores con mensajes en español
- ✅ `lib/config.ts` - Corregido para usar variables de entorno

### Hook de Sesión
- ✅ `lib/hooks/useAuthSession.ts` - Implementado
- ✅ Suscripción a `onAuthStateChanged`
- ✅ Manejo de estados (loading, authenticated, unauthenticated, error)

### MainApp
- ✅ AuthDialog se muestra cuando `authStatus === 'unauthenticated'`
- ✅ Botón "Iniciar sesión" en banner cuando no hay sesión
- ✅ Manejo de errores de autenticación con mensajes al usuario

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **COMPLETADO**: Corregir configuración de Firebase
2. ✅ **COMPLETADO**: Commit y push de corrección
3. 🔄 PENDIENTE: Usuario debe probar login en http://localhost:3000
4. 🔄 PENDIENTE: Verificar que Vercel despliegue con la corrección
5. 🔄 PENDIENTE: Actualizar workflow de CI manualmente (ver ACTUALIZAR-WORKFLOW.md)

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [x] Variables de entorno en .env local
- [x] Variables de entorno en Vercel
- [x] Variables de entorno en GitHub Secrets
- [x] Configuración corregida para usar variables de entorno
- [ ] Dominio localhost:3000 agregado en Firebase Authentication
- [ ] Dominio vercel.app agregado en Firebase Authentication
- [ ] Cliente OAuth Web habilitado en Firebase
- [ ] Provider Google habilitado en Firebase
- [ ] Login con Google probado exitosamente
- [ ] Login con correo/contraseña probado exitosamente
- [ ] Workflow de CI actualizado manualmente

---

**Estado actual**: Configuración corregida. Usuario debe probar login y configurar dominios en Firebase Console.
