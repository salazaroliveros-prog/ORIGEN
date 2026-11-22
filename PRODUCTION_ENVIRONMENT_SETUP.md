# Configuración de Entorno de Producción

**Fecha:** 2026-11-21  
**Estado:** Documentación creada - Requiere configuración manual en Vercel

---

## Variables de Entorno Requeridas para Producción

### Firebase Configuration (CRITICAL)

Estas variables ya están configuradas en el proyecto, pero deben verificarse en Vercel:

```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=origen-erp-guatemala
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDJ2pF5j_1jwuKFqYPoglDX9vFUw2g5YHI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=origen-erp-guatemala.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:893831571998:web:4e38903eeb0dff05011c0f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=origen-erp-guatemala.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=893831571998
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-EBE081ELJT
NEXT_PUBLIC_FIREBASE_VAPID_KEY=VQM_3H5g7l8s0pEwVd1dZX0euCB6jO18Ekyu8I7WvWc
NEXT_PUBLIC_FIRESTORE_DATABASE_ID=(default)
```

### Security Variables (CRITICAL)

```bash
PRIMARY_ADMIN_EMAIL=salazaroliveros@gmail.com
DEFAULT_AUTH_EMAIL=salazaroliveros@gmail.com
DEFAULT_AUTH_PASSWORD=<password-seguro-producción>
ALLOWED_ORIGINS=https://origen-one-kohl.vercel.app,https://tu-dominio.com
```

⚠️ **IMPORTANTE:** Cambiar `DEFAULT_AUTH_PASSWORD` a una contraseña segura para producción.

### Gemini AI API (Requerido para AI Assistant)

```bash
GEMINI_API_KEY=<tu-gemini-api-key>
```

### Application Configuration

```bash
NEXT_PUBLIC_APP_NAME=ORIGEN ERP Web
NEXT_PUBLIC_APP_URL=https://origen-one-kohl.vercel.app
NODE_ENV=production
PORT=3000
```

---

## Pasos para Configurar en Vercel

### 1. Ir a Configuración del Proyecto

1. Navega a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `origen-one-kohl`
3. Ve a **Settings** > **Environment Variables**

### 2. Agregar Variables de Entorno

Agregar las siguientes variables una por una:

#### Firebase Variables

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `origen-erp-guatemala`
- `NEXT_PUBLIC_FIREBASE_API_KEY` = `AIzaSyDJ2pF5j_1jwuKFqYPoglDX9vFUw2g5YHI`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `origen-erp-guatemala.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_APP_ID` = `1:893831571998:web:4e38903eeb0dff05011c0f`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `origen-erp-guatemala.firebasestorage.app`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = `893831571998`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` = `G-EBE081ELJT`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` = `VQM_3H5g7l8s0pEwVd1dZX0euCB6jO18Ekyu8I7WvWc`
- `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` = `(default)`

#### Security Variables

- `PRIMARY_ADMIN_EMAIL` = `salazaroliveros@gmail.com`
- `DEFAULT_AUTH_EMAIL` = `salazaroliveros@gmail.com`
- `DEFAULT_AUTH_PASSWORD` = `<generar-nueva-contraseña-segura>`
- `ALLOWED_ORIGINS` = `https://origen-one-kohl.vercel.app`

#### Gemini AI

- `GEMINI_API_KEY` = `<tu-gemini-api-key>`

#### Application

- `NEXT_PUBLIC_APP_NAME` = `ORIGEN ERP Web`
- `NEXT_PUBLIC_APP_URL` = `https://origen-one-kohl.vercel.app`
- `NODE_ENV` = `production`
- `PORT` = `3000`

### 3. Seleccionar Entorno

Para cada variable:

- Seleccionar **Production**, **Preview**, y **Development**
- Esto asegura que las variables estén disponibles en todos los entornos

### 4. Guardar y Redesplegar

1. Click en **Save**
2. Vercel automáticamente desplegará con las nuevas variables
3. Monitorea el deployment en la pestaña **Deployments**

---

## Seguridad de Contraseñas

### Generar Contraseña Segura

Usa uno de estos métodos para generar una contraseña segura:

```bash
# Usar OpenSSL (si está disponible)
openssl rand -base64 32

# O genera una manualmente con:
# - Mínimo 16 caracteres
# - Mezcla de mayúsculas, minúsculas, números y símbolos
# Ejemplo: Xk9#mP2$vL8@nQ5!rW
```

### Almacenar la Contraseña

⚠️ **IMPORTANTE:**

- No commits la contraseña real en el repositorio
- No compartas la contraseña por email o chat no encriptado
- Usa un gestor de contraseñas (1Password, Bitwarden, etc.)
- Almacena la contraseña solo en Vercel Environment Variables

---

## Verificación Post-Deployment

Después de configurar las variables y desplegar:

### 1. Verificar que la aplicación carga

```bash
# Abre la URL de producción
https://origen-one-kohl.vercel.app
```

### 2. Verificar Firebase Connection

- Abre DevTools > Console
- Busca errores de Firebase
- Verifica que la autenticación funcione

### 3. Verificar Administrador Principal

1. Intenta iniciar sesión con `salazaroliveros@gmail.com`
2. Verifica que tengas acceso completo a todos los módulos
3. Verifica que puedas crear y gestionar invitaciones

### 4. Verificar AI Assistant

1. Navega a la pestaña de AI Assistant
2. Intenta usar la función de IA
3. Verifica que responda correctamente

---

## Troubleshooting

### Error: Firebase Configuration Missing

**Causa:** Variables de Firebase no configuradas en Vercel

**Solución:**

1. Verifica que todas las variables `NEXT_PUBLIC_FIREBASE_*` estén configuradas
2. Redespliega la aplicación

### Error: Authentication Failed

**Causa:** `DEFAULT_AUTH_PASSWORD` incorrecta o no configurada

**Solución:**

1. Verifica que `DEFAULT_AUTH_PASSWORD` esté configurada en Vercel
2. Si cambiaste la contraseña en Firebase, actualízala en Vercel

### Error: AI Assistant Not Working

**Causa:** `GEMINI_API_KEY` no configurada o inválida

**Solución:**

1. Verifica que `GEMINI_API_KEY` esté configurada
2. Verifica que la API key sea válida en Google Cloud Console

### Error: CORS Issues

**Causa:** `ALLOWED_ORIGINS` no incluye el dominio correcto

**Solución:**

1. Agrega el dominio de producción a `ALLOWED_ORIGINS`
2. Separa múltiples dominios con comas

---

## Checklist de Producción

- [ ] Todas las variables `NEXT_PUBLIC_FIREBASE_*` configuradas
- [ ] `PRIMARY_ADMIN_EMAIL` configurado como `salazaroliveros@gmail.com`
- [ ] `DEFAULT_AUTH_PASSWORD` configurado con contraseña segura
- [ ] `DEFAULT_AUTH_EMAIL` configurado como `salazaroliveros@gmail.com`
- [ ] `ALLOWED_ORIGINS` incluye dominio de producción
- [ ] `GEMINI_API_KEY` configurado
- [ ] `NEXT_PUBLIC_APP_URL` configurado con URL de producción
- [ ] `NODE_ENV` configurado como `production`
- [ ] Deployment exitoso sin errores
- [ ] Verificado que Firebase Authentication funciona
- [ ] Verificado que Firestore se conecta
- [ ] Verificado que AI Assistant funciona
- [ ] Verificado que administrador principal tiene acceso completo

---

## Variables Opcionales para Desarrollo

Estas variables solo son necesarias para desarrollo local:

```bash
# Emuladores Firebase (solo desarrollo)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
```

⚠️ **NO** configurar estas variables en producción.
