# Diagnóstico del Sistema de Autenticación

**Fecha**: 26 de Octubre 2026  
**Analista**: QA Engineer  
**Estado**: 🔍 En análisis

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
- `http://localhost:3000` - Deshabilitado en producción (debe ser reemplazado)
- `https://origen-one-kohl.vercel.app` - Dominio de producción

---

## 🔍 POSIBLES PROBLEMAS DE LOGIN

### 1. Dominio localhost no autorizado en Firebase
**Error probable**: `auth/unauthorized-domain`

**Causa**: 
- `localhost:3000` está en `ALLOWED_ORIGINS` en .env
- Pero podría no estar configurado en Firebase Authentication → Dominios autorizados

**Solución**:
1. Ir a Firebase Console → Authentication → Sign-in method
2. En Google, ir a Configuración de dominios autorizados
3. Agregar `http://localhost:3000` para desarrollo
4. Para producción, agregar `https://origen-one-kohl.vercel.app`

### 2. Cliente OAuth Web no configurado
**Error probable**: `auth/invalid-oauth-client-id`

**Causa**:
- El proyecto de Firebase podría no tener el cliente OAuth Web configurado
- El Client ID podría estar incorrecto

**Solución**:
1. Ir a Firebase Console → Authentication → Sign-in method → Google
2. Verificar que "Web Client SDK" esté habilitado
3. Copiar el Client ID correcto
4. Verificar que el Client Secret esté configurado

### 3. Popup bloqueado por navegador
**Error probable**: `auth/popup-blocked`

**Causa**:
- Bloqueador de popups del navegador
- Extensiones de seguridad

**Solución**:
- Deshabilitar bloqueador de popups para localhost:3000
- Deshabilitar extensiones de seguridad temporalmente

### 4. Credenciales de prueba no disponibles
**Estado**: No hay credenciales de prueba en .env

**Archivo .env actual**:
```
CORREO=your_email@example.com
PASWORD=your_password_here
```

**Solución**:
- Necesario crear un usuario de prueba en Firebase Authentication
- O usar autenticación con Google (más fácil para pruebas)

---

## ✅ ESTADO DE IMPLEMENTACIÓN

### Código de Autenticación
- ✅ `lib/firebaseAuth.ts` - Implementado correctamente
- ✅ `components/AuthDialog.tsx` - UI implementada
- ✅ Soporte para Google OAuth (signInWithPopup)
- ✅ Soporte para correo/contraseña (signInWithEmailAndPassword)
- ✅ Manejo de errores con mensajes en español

### Hook de Sesión
- ✅ `lib/hooks/useAuthSession.ts` - Implementado
- ✅ Suscripción a `onAuthStateChanged`
- ✅ Manejo de estados (loading, authenticated, unauthenticated, error)

### MainApp
- ✅ AuthDialog se muestra cuando `authStatus === 'unauthenticated'`
- ✅ Botón "Iniciar sesión" en banner cuando no hay sesión
- ✅ Manejo de errores de autenticación con mensajes al usuario

---

## 🔧 REQUISITOS PARA CORREGIR EL LOGIN

### 1. Configurar Dominios Autorizados en Firebase
```
1. Ir a: https://console.firebase.google.com/
2. Seleccionar proyecto: origen-erp-guatemala
3. Navegar a: Authentication → Sign-in method → Google
4. Ir a: Configuración de dominios autorizados
5. Agregar: http://localhost:3000
6. Agregar: https://origen-one-kohl.vercel.app
7. Guardar cambios
```

### 2. Verificar Cliente OAuth Web
```
1. En Firebase Console → Authentication → Sign-in method → Google
2. Verificar que "Web Client SDK" esté habilitado
3. Copiar el Client ID si es necesario
4. Verificar el Client Secret está configurado
```

### 3. Crear Usuario de Prueba (Opcional)
```
Opción A: Usar Google Auth (recomendado)
- Cuenta de Google real puede usarse para pruebas

Opción B: Crear usuario en Firebase Console
1. Firebase Console → Authentication → Users
2. Agregar usuario manualmente
3. Crear cuenta de prueba: test@origen-erp.com
4. Establecer contraseña temporal
5. Usar esas credenciales para pruebas
```

### 4. Deshabilitar Bloqueador de Popups
```
Chrome: Configuración → Privacidad y seguridad → Configuración del sitio → Bloqueo de ventanas emergentes
Firefox: Opciones → Privacidad y seguridad → Permisos → Bloquear ventanas emergentes
```

---

## 📝 CHECKLIST DE VERIFICACIÓN

- [ ] Dominio localhost:3000 agregado en Firebase Authentication
- [ ] Dominio vercel.app agregado en Firebase Authentication
- [ ] Cliente OAuth Web habilitado en Firebase
- [ ] Provider Google habilitado en Firebase
- [ ] Bloqueador de popups deshabilitado en navegador
- [ ] Usuario de prueba creado (opcional)
- [ ] Credenciales de prueba en .env (opcional)

---

## 🎯 PRÓXIMOS PASOS

1. Usuario debe configurar dominios en Firebase Console
2. Usuario debe probar login con Google (más fácil)
3. Si falla Google, revisar configuración OAuth
4. Si falla correo/contraseña, crear usuario de prueba
5. Documentar credenciales de prueba en .env.local (gitignored)

---

**Estado actual**: Esperando configuración de Firebase por parte del usuario.
