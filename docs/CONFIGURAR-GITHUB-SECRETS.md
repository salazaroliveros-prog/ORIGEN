# Configurar GitHub Secrets para CI/CD

## 🔑 Variables de Entorno Requeridas

El CI de GitHub Actions necesita las siguientes variables de entorno de Firebase para que el build pase correctamente.

## 📋 Pasos para Configurar

### 1. Ir a GitHub Secrets
1. Navega al repositorio: https://github.com/salazaroliveros-prog/ORIGEN
2. Ve a: **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**

### 2. Agregar cada variable

Para cada variable, agrega:

#### NEXT_PUBLIC_FIREBASE_PROJECT_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value**: `origen-erp-guatemala`

#### NEXT_PUBLIC_FIREBASE_API_KEY
- **Name**: `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value**: `AIzaSyDJ2pF5j_1jwuKFqYPoglDX9vFUw2g5YHI`

#### NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- **Name**: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Value**: `origen-erp-guatemala.firebaseapp.com`

#### NEXT_PUBLIC_FIREBASE_APP_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Value**: `1:893831571998:web:4e38903eeb0dff05011c0f`

#### NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- **Name**: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Value**: `origen-erp-guatemala.firebasestorage.app`

#### NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: `893831571998`

#### NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- **Value**: (dejar vacío)

#### NEXT_PUBLIC_FIRESTORE_DATABASE_ID
- **Name**: `NEXT_PUBLIC_FIRESTORE_DATABASE_ID`
- **Value**: `(default)`

### 3. Verificar

Después de agregar todas las variables:
1. Ve a **Actions** tab
2. Busca el último workflow que falló
3. Haz clic en **Re-run all jobs**

## ⚠️ Nota Importante

Las credenciales de Firebase (`NEXT_PUBLIC_FIREBASE_*`) son **públicas** y están diseñadas para usarse en el cliente. No son secretos sensibles como claves privadas o tokens de servicio.

Sin embargo, GitHub Actions necesita tener acceso a estas variables durante el build para que Next.js pueda incluir la configuración de Firebase en el bundle de producción.

## 🚀 Después de Configurar

Una vez configurados los secrets:
1. Los builds de CI pasarán
2. Vercel también desplegará correctamente (ya tiene las variables configuradas)
3. La aplicación funcionará en producción

## 📝 Referencia

- Archivo `.env` local tiene las mismas credenciales
- Vercel ya tiene estas variables configuradas en su Environment Variables
- Solo falta agregarlas a GitHub Secrets para CI
